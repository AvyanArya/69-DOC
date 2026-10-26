import Foundation
import NotchPilotCore

/// Runs a fixed system executable asynchronously. Used only for specific,
/// allow-listed binaries (osascript with app-generated scripts, shortcuts) —
/// never with model-provided command lines.
enum ProcessRunner {
    struct Result {
        let status: Int32
        let output: String
        let error: String
    }

    static func run(_ executable: String, _ arguments: [String], timeout: TimeInterval = 20) async throws -> Result {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = arguments
        let stdout = Pipe()
        let stderr = Pipe()
        process.standardOutput = stdout
        process.standardError = stderr
        process.standardInput = FileHandle.nullDevice

        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Result, Error>) in
                let state = RunState(continuation)
                // Drain both pipes while the process runs so large outputs can't block it.
                let reads = DispatchGroup()
                process.terminationHandler = { process in
                    reads.notify(queue: .global()) { state.succeed(status: process.terminationStatus) }
                }
                // Enter before launching so a process that exits instantly can't
                // report completion before its output has been read.
                reads.enter()
                reads.enter()
                do {
                    try process.run()
                } catch {
                    reads.leave()
                    reads.leave()
                    state.finish(.failure(ToolError.failed("Could not start \(executable): \(error.localizedDescription)")))
                    return
                }
                DispatchQueue.global().async {
                    state.setOutput(stdout.fileHandleForReading.readDataToEndOfFile())
                    reads.leave()
                }
                DispatchQueue.global().async {
                    state.setError(stderr.fileHandleForReading.readDataToEndOfFile())
                    reads.leave()
                }
                DispatchQueue.global().asyncAfter(deadline: .now() + timeout) {
                    if process.isRunning {
                        process.terminate()
                        state.finish(.failure(ToolError.timeout("\((executable as NSString).lastPathComponent) did not finish in \(Int(timeout)) seconds.")))
                    }
                }
            }
        } onCancel: {
            if process.isRunning { process.terminate() }
        }
    }

    /// Output and completion shared by the process's handlers, which run on
    /// different queues; every access goes through `lock`.
    private final class RunState: @unchecked Sendable {
        private let lock = NSLock()
        private var continuation: CheckedContinuation<Result, Error>?
        private var output = Data()
        private var error = Data()

        init(_ continuation: CheckedContinuation<Result, Error>) {
            self.continuation = continuation
        }

        func setOutput(_ data: Data) {
            lock.lock()
            output = data
            lock.unlock()
        }

        func setError(_ data: Data) {
            lock.lock()
            error = data
            lock.unlock()
        }

        func succeed(status: Int32) {
            lock.lock()
            let output = self.output, error = self.error
            lock.unlock()
            finish(.success(Result(status: status, output: String(decoding: output, as: UTF8.self), error: String(decoding: error, as: UTF8.self))))
        }

        /// Resumes the continuation once; later calls are ignored.
        func finish(_ result: Swift.Result<Result, Error>) {
            lock.lock()
            let continuation = self.continuation
            self.continuation = nil
            lock.unlock()
            continuation?.resume(with: result)
        }
    }
}

/// Runs AppleScript through `/usr/bin/osascript` (off the main thread).
/// macOS asks the user once per target app before allowing control (Automation).
enum AppleScript {
    static func run(_ source: String, timeout: TimeInterval = 10) async throws -> String {
        let result = try await ProcessRunner.run("/usr/bin/osascript", ["-e", source], timeout: timeout)
        if result.status != 0 {
            if result.error.contains("-1743") || result.error.localizedCaseInsensitiveContains("not allowed") {
                throw ToolError.notAuthorized("NotchPilot is not allowed to control that app. Allow it in System Settings › Privacy & Security › Automation.")
            }
            if result.error.contains("-600") || result.error.localizedCaseInsensitiveContains("isn’t running") {
                throw ToolError.failed("The app is not running.")
            }
            throw ToolError.failed(result.error.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty ?? "AppleScript failed.")
        }
        return result.output.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Parses osascript's raw-data notation, e.g. «data PNGf89504E47…».
    static func decodeRawData(_ text: String) -> Data? {
        guard let start = text.range(of: "«data ") else { return nil }
        let afterType = text.index(start.upperBound, offsetBy: 4, limitedBy: text.endIndex) ?? text.endIndex
        guard let end = text[afterType...].firstIndex(of: "»") else { return nil }
        let hex = text[afterType..<end]
        var data = Data(capacity: hex.count / 2)
        var index = hex.startIndex
        while index < hex.endIndex {
            let next = hex.index(index, offsetBy: 2, limitedBy: hex.endIndex) ?? hex.endIndex
            guard let byte = UInt8(hex[index..<next], radix: 16) else { return nil }
            data.append(byte)
            index = next
        }
        return data.isEmpty ? nil : data
    }
}

extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
