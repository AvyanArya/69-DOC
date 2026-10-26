import Foundation

public struct SSEEvent: Equatable, Sendable {
    public var event: String?
    public var data: String
}

/// Incremental Server-Sent Events parser (WHATWG event-stream format).
public struct SSEParser {
    private var eventName: String?
    private var dataLines: [String] = []

    public init() {}

    /// Feeds one line; returns an event when a blank line completes one.
    public mutating func feed(_ line: String) -> SSEEvent? {
        if line.isEmpty {
            return dispatch()
        }
        if line.hasPrefix(":") {
            return nil  // comment / keep-alive
        }
        let field: Substring
        var value: Substring
        if let colon = line.firstIndex(of: ":") {
            field = line[line.startIndex..<colon]
            value = line[line.index(after: colon)...]
            if value.hasPrefix(" ") { value = value.dropFirst() }
        } else {
            field = Substring(line)
            value = ""
        }
        switch field {
        case "event":
            // Tolerate servers that omit the blank line between events.
            var pending: SSEEvent?
            if !dataLines.isEmpty { pending = dispatch() }
            eventName = String(value)
            return pending
        case "data":
            dataLines.append(String(value))
        default:
            break  // id, retry and unknown fields are not needed
        }
        return nil
    }

    /// Flushes a trailing event when the stream ends without a blank line.
    public mutating func finish() -> SSEEvent? {
        dispatch()
    }

    private mutating func dispatch() -> SSEEvent? {
        defer {
            eventName = nil
            dataLines.removeAll()
        }
        guard !dataLines.isEmpty else { return nil }
        return SSEEvent(event: eventName, data: dataLines.joined(separator: "\n"))
    }
}

extension HTTPStreamResponse {
    /// Iterates the body as SSE events.
    public func events() -> AsyncThrowingStream<SSEEvent, Error> {
        let lines = self.lines
        return AsyncThrowingStream { continuation in
            let task = Task {
                var parser = SSEParser()
                do {
                    for try await line in lines {
                        if let event = parser.feed(line) { continuation.yield(event) }
                    }
                    if let event = parser.finish() { continuation.yield(event) }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}

/// Shared helpers for provider adapters.
enum ProviderHTTP {
    static func endpoint(_ base: URL, appending path: String) -> URL {
        var text = base.absoluteString
        while text.hasSuffix("/") { text.removeLast() }
        return URL(string: text + path) ?? base
    }

    static func retryAfter(_ headers: [String: String]) -> TimeInterval? {
        guard let value = headers["retry-after"] else { return nil }
        if let seconds = Double(value.trimmingCharacters(in: .whitespaces)) { return seconds }
        return nil
    }

    /// Extracts a readable message from a provider's JSON error body.
    static func errorMessage(from body: String) -> String {
        if let json = try? JSONParser.parse(body) {
            if let message = json["error"]?["message"]?.stringValue { return message }
            if let message = json["message"]?.stringValue { return message }
            if let message = json["error"]?.stringValue { return message }
        }
        return TextUtilities.preview(body, limit: 300)
    }

    /// Maps a non-2xx status to a typed error.
    static func error(status: Int, headers: [String: String], body: String) -> ProviderError {
        let message = Redactor.redact(errorMessage(from: body))
        switch status {
        case 400, 413, 422: return .badRequest(message)
        case 401: return .authentication(message)
        case 402, 403: return .permission(message)
        case 404: return .notFound(message)
        case 408: return .timeout
        case 429: return .rateLimited(retryAfter: retryAfter(headers), message: message)
        case 503, 529: return .overloaded(message)
        case 500...599: return .server(status: status, message: message)
        default: return .server(status: status, message: message)
        }
    }

    static func parseJSON(_ text: String) throws -> JSONValue {
        do {
            return try JSONParser.parse(text)
        } catch {
            throw ProviderError.invalidResponse("Malformed event data (\(error))")
        }
    }
}
