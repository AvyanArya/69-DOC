import AppKit
import NotchPilotCore

/// Unread message headers (sender, subject, time; never bodies) from Apple
/// Mail for briefings, read with AppleScript and only while Mail is already
/// open. macOS asks once before letting NotchPilot control Mail.
@MainActor
final class MailService: MailSummaryProvider {
    func unreadMessages(limit: Int) async throws -> [MailMessageSummary] {
        guard !NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.mail").isEmpty else {
            throw ToolError.unsupported("Mail isn't open, so unread messages were left out.")
        }
        let count = max(1, min(limit, 30))
        let script = """
        tell application "Mail"
            set out to ""
            set msgs to (messages of inbox whose read status is false)
            set n to count of msgs
            if n > \(count) then set n to \(count)
            repeat with i from 1 to n
                set m to item i of msgs
                set out to out & (sender of m) & (ASCII character 9) & (subject of m) & (ASCII character 9) & ((date received of m) as string) & (ASCII character 10)
            end repeat
            return out
        end tell
        """
        let output = try await AppleScript.run(script, timeout: 20)
        return output.split(separator: "\n").compactMap { line in
            let parts = line.split(separator: "\t", omittingEmptySubsequences: false).map(String.init)
            guard parts.count >= 3 else { return nil }
            return MailMessageSummary(sender: String(parts[0].prefix(80)), subject: String(parts[1].prefix(160)), received: parts[2])
        }
    }
}
