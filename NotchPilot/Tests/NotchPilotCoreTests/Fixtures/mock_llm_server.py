#!/usr/bin/env python3
"""Deterministic mock of the Anthropic Messages and OpenAI Responses streaming APIs.

Used by the end-to-end tests to exercise NotchPilot's real HTTP transport, SSE
parsing, tool loop and history replay without network access or credentials.
It is NOT a model: it follows a fixed script based on the conversation state.

Usage: mock_llm_server.py <request-log-path>
Prints the bound port on the first line of stdout.
"""
import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOG_PATH = sys.argv[1] if len(sys.argv) > 1 else None
SIGNATURE_ROUND_1 = "c2lnLXJvdW5kLTE="
SIGNATURE_ROUND_2 = "c2lnLXJvdW5kLTI="


def log(entry):
    if LOG_PATH:
        with open(LOG_PATH, "a") as handle:
            handle.write(json.dumps(entry) + "\n")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"  # close the connection after each response

    def log_message(self, *args):
        pass

    def read_json(self):
        length = int(self.headers.get("content-length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def send_error_json(self, status, message):
        body = json.dumps({"type": "error", "error": {"type": "invalid_request_error", "message": message}}).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def start_stream(self):
        self.send_response(200)
        self.send_header("content-type", "text/event-stream")
        self.end_headers()

    def sse(self, event, payload):
        data = f"event: {event}\ndata: {json.dumps(payload)}\n\n" if event else f"data: {json.dumps(payload)}\n\n"
        self.wfile.write(data.encode())
        self.wfile.flush()
        time.sleep(0.002)

    def do_POST(self):
        body = self.read_json()
        headers = {k.lower(): v for k, v in self.headers.items()}
        log({"path": self.path, "headers": {k: v for k, v in headers.items() if k != "x-api-key" and k != "authorization"},
             "has_key": bool(headers.get("x-api-key") or headers.get("authorization")), "body": body})
        if self.path.endswith("/v1/messages"):
            self.anthropic(body, headers)
        elif self.path.endswith("/responses"):
            self.openai(body, headers)
        else:
            self.send_error_json(404, "unknown path")

    # ------------------------------------------------------------------ Anthropic

    def anthropic(self, body, headers):
        if headers.get("x-api-key") != "sk-ant-mock-key-123456":
            return self.send_error_json(401, "invalid x-api-key")
        if headers.get("anthropic-version") != "2026-10-21":
            return self.send_error_json(400, "unsupported anthropic-version")
        for forbidden in ("temperature", "top_p", "top_k"):
            if forbidden in body:
                return self.send_error_json(400, f"{forbidden}: Extra inputs are not permitted")
        messages = body.get("messages", [])
        assistant_turns = [m for m in messages if m["role"] == "assistant"]

        # Preserved thinking: earlier thinking blocks must come back byte-for-byte.
        expected = [SIGNATURE_ROUND_1, SIGNATURE_ROUND_2]
        for index, turn in enumerate(assistant_turns):
            thinking = [b for b in turn["content"] if b.get("type") == "thinking"]
            if not thinking or thinking[0].get("signature") != expected[index]:
                return self.send_error_json(400, f"messages: thinking block {index} was not replayed verbatim")

        round_number = len(assistant_turns) + 1
        self.start_stream()
        self.sse("message_start", {"type": "message_start", "message": {"id": f"msg_{round_number}", "type": "message", "role": "assistant",
                 "model": body.get("model"), "content": [], "usage": {"input_tokens": 100 * round_number, "output_tokens": 1}}})
        if round_number == 1:
            self.anthropic_thinking(0, "Setting up a focus session and a task.", SIGNATURE_ROUND_1)
            self.anthropic_tool(1, "toolu_m1", "start_timer", ['{"minutes": 25, "label": "Econ', 'omics essay", "kind": "focus", "break_minutes_after": 5}'])
            self.anthropic_tool(2, "toolu_m2", "create_task", ['{"title": "Finish economics essay", "priority": "high"}'])
            self.anthropic_stop("tool_use")
        elif round_number == 2:
            results = [b for b in messages[-1]["content"] if b.get("type") == "tool_result"]
            if sorted(r["tool_use_id"] for r in results) != ["toolu_m1", "toolu_m2"]:
                return  # stream ends without message_stop -> client reports an error
            self.anthropic_thinking(0, "Verifying the timer.", SIGNATURE_ROUND_2)
            self.anthropic_tool(1, "toolu_m3", "get_timer_status", ["{}"])
            self.anthropic_stop("tool_use")
        else:
            status = json.loads([b for b in messages[-1]["content"] if b.get("type") == "tool_result"][0]["content"])
            text = f"Done: the timer is {status.get('state')} with {status.get('remaining')} left, and the essay task is saved."
            self.sse("content_block_start", {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}})
            for i in range(0, len(text), 12):
                self.sse("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": text[i:i + 12]}})
            self.sse("content_block_stop", {"type": "content_block_stop", "index": 0})
            self.anthropic_stop("end_turn")

    def anthropic_thinking(self, index, text, signature):
        self.sse("content_block_start", {"type": "content_block_start", "index": index, "content_block": {"type": "thinking", "thinking": "", "signature": ""}})
        self.sse("content_block_delta", {"type": "content_block_delta", "index": index, "delta": {"type": "thinking_delta", "thinking": text}})
        self.sse("content_block_delta", {"type": "content_block_delta", "index": index, "delta": {"type": "signature_delta", "signature": signature}})
        self.sse("content_block_stop", {"type": "content_block_stop", "index": index})

    def anthropic_tool(self, index, tool_id, name, chunks):
        self.sse("content_block_start", {"type": "content_block_start", "index": index, "content_block": {"type": "tool_use", "id": tool_id, "name": name, "input": {}}})
        for chunk in chunks:
            self.sse("content_block_delta", {"type": "content_block_delta", "index": index, "delta": {"type": "input_json_delta", "partial_json": chunk}})
        self.sse("content_block_stop", {"type": "content_block_stop", "index": index})

    def anthropic_stop(self, reason):
        self.sse("message_delta", {"type": "message_delta", "delta": {"stop_reason": reason, "stop_sequence": None}, "usage": {"output_tokens": 30}})
        self.sse("message_stop", {"type": "message_stop"})

    # ------------------------------------------------------------------ OpenAI Responses

    def openai(self, body, headers):
        if headers.get("authorization") != "Bearer sk-proj-mock-key-123456":
            return self.send_error_json(401, "Incorrect API key provided")
        items = body.get("input", [])
        outputs = [i for i in items if i.get("type") == "function_call_output"]
        reasoning = [i for i in items if i.get("type") == "reasoning"]
        self.start_stream()
        self.sse("response.created", {"type": "response.created", "response": {"id": "resp_1", "model": body.get("model")}})
        if not outputs:
            output = [
                {"type": "reasoning", "id": "rs_1", "summary": [], "encrypted_content": "ENCRYPTED"},
                {"type": "function_call", "id": "fc_1", "call_id": "call_1", "name": "create_note",
                 "arguments": json.dumps({"title": "Key points", "body": "- Demand curves slope down\n- Elasticity matters"}), "status": "completed"},
            ]
            self.sse("response.output_item.added", {"type": "response.output_item.added", "output_index": 1, "item": dict(output[1], arguments="")})
            self.sse("response.function_call_arguments.delta", {"type": "response.function_call_arguments.delta", "output_index": 1, "delta": output[1]["arguments"]})
        else:
            if not reasoning or reasoning[0].get("encrypted_content") != "ENCRYPTED":
                self.sse("error", {"type": "error", "code": "invalid_request", "message": "reasoning item missing"})
                return
            note = json.loads(outputs[0]["output"])
            text = f"Saved your note \"{note['created']['title']}\"."
            output = [{"type": "message", "id": "msg_1", "role": "assistant", "status": "completed", "content": [{"type": "output_text", "text": text, "annotations": []}]}]
            self.sse("response.output_text.delta", {"type": "response.output_text.delta", "output_index": 0, "content_index": 0, "delta": text})
        self.sse("response.completed", {"type": "response.completed", "response": {"id": "resp_1", "model": body.get("model"), "status": "completed",
                 "output": output, "usage": {"input_tokens": 50, "output_tokens": 20}}})


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    print(server.server_address[1], flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
