import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public struct HTTPRequestSpec: Sendable {
    public var url: URL
    public var method: String
    public var headers: [String: String]
    public var body: Data
    /// Maximum silence between received bytes before the request fails.
    public var idleTimeout: TimeInterval

    public init(url: URL, method: String = "POST", headers: [String: String], body: Data, idleTimeout: TimeInterval) {
        self.url = url
        self.method = method
        self.headers = headers
        self.body = body
        self.idleTimeout = idleTimeout
    }
}

public struct HTTPStreamResponse: Sendable {
    public let status: Int
    /// Header names are lower-cased.
    public let headers: [String: String]
    /// The body split into lines (without line terminators). Blank lines are kept,
    /// because Server-Sent Events use them as event boundaries.
    public let lines: AsyncThrowingStream<String, Error>

    public init(status: Int, headers: [String: String], lines: AsyncThrowingStream<String, Error>) {
        self.status = status
        self.headers = headers
        self.lines = lines
    }

    /// Reads the remaining body (used for error responses), capped in size.
    public func collectBody(limit: Int = 64_000) async throws -> String {
        var output = ""
        for try await line in lines {
            output += line + "\n"
            if output.count > limit { break }
        }
        return output
    }
}

public protocol HTTPStreamingTransport: Sendable {
    func open(_ request: HTTPRequestSpec) async throws -> HTTPStreamResponse
}

/// Splits arbitrary byte chunks into lines, handling `\n` and `\r\n`.
struct LineSplitter {
    private var buffer = Data()

    mutating func append(_ data: Data) -> [String] {
        buffer.append(data)
        var lines: [String] = []
        while let newline = buffer.firstIndex(of: 0x0A) {
            var lineData = buffer[buffer.startIndex..<newline]
            if lineData.last == 0x0D { lineData = lineData.dropLast() }
            lines.append(String(decoding: lineData, as: UTF8.self))
            buffer.removeSubrange(buffer.startIndex...newline)
        }
        return lines
    }

    mutating func flush() -> String? {
        guard !buffer.isEmpty else { return nil }
        var data = buffer
        if data.last == 0x0D { data = data.dropLast() }
        buffer.removeAll()
        return String(decoding: data, as: UTF8.self)
    }
}

/// Streaming HTTP over URLSession using a data delegate, which works on both
/// macOS and Linux. Each request gets an ephemeral session (no cookies, no cache).
public final class URLSessionStreamingTransport: HTTPStreamingTransport {
    public init() {}

    public func open(_ spec: HTTPRequestSpec) async throws -> HTTPStreamResponse {
        var request = URLRequest(url: spec.url)
        request.httpMethod = spec.method
        for (name, value) in spec.headers {
            request.setValue(value, forHTTPHeaderField: name)
        }
        request.httpBody = spec.body
        request.timeoutInterval = spec.idleTimeout

        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = spec.idleTimeout
        configuration.timeoutIntervalForResource = 15 * 60
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData

        let delegate = StreamingDelegate()
        let session = URLSession(configuration: configuration, delegate: delegate, delegateQueue: nil)
        let task = session.dataTask(with: request)

        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                delegate.begin(task: task, session: session, continuation: continuation)
            }
        } onCancel: {
            task.cancel()
        }
    }
}

private final class StreamingDelegate: NSObject, URLSessionDataDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private var responseContinuation: CheckedContinuation<HTTPStreamResponse, Error>?
    private var lineContinuation: AsyncThrowingStream<String, Error>.Continuation?
    private var lines: AsyncThrowingStream<String, Error>?
    private var splitter = LineSplitter()
    private weak var task: URLSessionDataTask?

    override init() {
        super.init()
        var captured: AsyncThrowingStream<String, Error>.Continuation?
        let stream = AsyncThrowingStream<String, Error>(bufferingPolicy: .unbounded) { captured = $0 }
        lines = stream
        lineContinuation = captured
    }

    func begin(task: URLSessionDataTask, session: URLSession, continuation: CheckedContinuation<HTTPStreamResponse, Error>) {
        lock.lock()
        responseContinuation = continuation
        self.task = task
        lineContinuation?.onTermination = { [weak task] termination in
            if case .cancelled = termination { task?.cancel() }
        }
        lock.unlock()
        task.resume()
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        let http = response as? HTTPURLResponse
        var headers: [String: String] = [:]
        for (key, value) in http?.allHeaderFields ?? [:] {
            if let key = key as? String, let value = value as? String {
                headers[key.lowercased()] = value
            }
        }
        lock.lock()
        let continuation = responseContinuation
        responseContinuation = nil
        let stream = lines
        lock.unlock()
        if let continuation, let stream {
            continuation.resume(returning: HTTPStreamResponse(status: http?.statusCode ?? 0, headers: headers, lines: stream))
        }
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        lock.lock()
        let newLines = splitter.append(data)
        let continuation = lineContinuation
        lock.unlock()
        for line in newLines {
            continuation?.yield(line)
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        lock.lock()
        let leftover = splitter.flush()
        let lineContinuation = self.lineContinuation
        let responseContinuation = self.responseContinuation
        self.responseContinuation = nil
        self.lineContinuation = nil
        lock.unlock()

        if let leftover { lineContinuation?.yield(leftover) }
        if let error {
            let mapped = Self.map(error)
            responseContinuation?.resume(throwing: mapped)
            lineContinuation?.finish(throwing: mapped)
        } else {
            responseContinuation?.resume(throwing: ProviderError.invalidResponse("Connection closed without a response."))
            lineContinuation?.finish()
        }
        session.finishTasksAndInvalidate()
    }

    static func map(_ error: Error) -> ProviderError {
        if let urlError = error as? URLError {
            switch urlError.code {
            case .cancelled: return .cancelled
            case .timedOut: return .timeout
            case .notConnectedToInternet: return .network("You appear to be offline.")
            case .cannotFindHost, .dnsLookupFailed: return .network("Could not find the server.")
            case .cannotConnectToHost: return .network("Could not connect to the server.")
            case .networkConnectionLost: return .network("The connection was lost.")
            case .secureConnectionFailed, .serverCertificateUntrusted, .serverCertificateHasBadDate:
                return .network("A secure connection could not be established.")
            default: return .network(urlError.localizedDescription)
            }
        }
        return .network(error.localizedDescription)
    }
}

/// A transport that replays canned responses; used by tests and offline demos.
public final class ScriptedTransport: HTTPStreamingTransport, @unchecked Sendable {
    public struct Reply: Sendable {
        public var status: Int
        public var headers: [String: String]
        public var body: String
        /// Throw this error after streaming the body (simulates a dropped connection).
        public var failure: ProviderError?

        public init(status: Int = 200, headers: [String: String] = ["content-type": "text/event-stream"], body: String, failure: ProviderError? = nil) {
            self.status = status
            self.headers = headers
            self.body = body
            self.failure = failure
        }
    }

    private let lock = NSLock()
    private var replies: [Reply]
    public private(set) var requests: [HTTPRequestSpec] = []

    public init(replies: [Reply]) {
        self.replies = replies
    }

    public var requestBodies: [JSONValue] {
        lock.lock()
        defer { lock.unlock() }
        return requests.compactMap { try? JSONParser.parse($0.body) }
    }

    public func open(_ request: HTTPRequestSpec) async throws -> HTTPStreamResponse {
        let next: Reply? = lock.sync {
            requests.append(request)
            return replies.isEmpty ? nil : replies.removeFirst()
        }
        guard let reply = next else { throw ProviderError.invalidResponse("No scripted reply left") }
        let lines = reply.body.components(separatedBy: "\n")
        let stream = AsyncThrowingStream<String, Error> { continuation in
            for line in lines { continuation.yield(line) }
            if let failure = reply.failure {
                continuation.finish(throwing: failure)
            } else {
                continuation.finish()
            }
        }
        return HTTPStreamResponse(status: reply.status, headers: reply.headers, lines: stream)
    }
}
