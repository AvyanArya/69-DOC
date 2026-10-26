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
                let lock = NSLock()
                var finished = false
                func finish(_ result: Swift.Result<Result, Error>) {
                    lock.lock()
                    defer { lock.unlock() }
                    guard !finished else { return }
                    finished = true
                    continuation.resume(with: result)
                }
                // Drain both pipes while the process runs so large outputs can't block it.
                let reads = DispatchGroup()
                var out = Data()
                var err = Data()
                process.terminationHandler = { process in
                    reads.notify(queue: .global()) {
                        finish(.success(Result(status: process.terminationStatus, output: String(decoding: out, as: UTF8.self), error: String(decoding: err, as: UTF8.self))))
                    }
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
                    finish(.failure(ToolError.failed("Could not start \(executable): \(error.localizedDescription)")))
                    return
                }
                DispatchQueue.global().async {
                    out = stdout.fileHandleForReading.readDataToEndOfFile()
                    reads.leave()
                }
                DispatchQueue.global().async {
                    err = stderr.fileHandleForReading.readDataToEndOfFile()
                    reads.leave()
                }
                DispatchQueue.global().asyncAfter(deadline: .now() + timeout) {
                    if process.isRunning {
                        process.terminate()
                        finish(.failure(ToolError.timeout("\((executable as NSString).lastPathComponent) did not finish in \(Int(timeout)) seconds.")))
                    }
                }
            }
        } onCancel: {
            if process.isRunning { process.terminate() }
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
