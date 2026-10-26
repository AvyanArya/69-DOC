import Foundation

/// Date parsing and formatting helpers shared by tools, stores and providers.
public enum DateCoding {
    /// Formats a date as ISO 8601 with the local time-zone offset, e.g. `2026-10-27T15:30:00+01:00`.
    public static func iso8601String(_ date: Date, timeZone: TimeZone = .current) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = timeZone
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.string(from: date)
    }

    /// `2026-10-27`
    public static func dayString(_ date: Date, calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// Human-friendly local description, e.g. `Tue 27 Oct, 15:30`.
    public static func friendly(_ date: Date, includeTime: Bool = true, timeZone: TimeZone = .current) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.timeZone = timeZone
        formatter.dateFormat = includeTime ? "EEE d MMM yyyy, HH:mm" : "EEE d MMM yyyy"
        return formatter.string(from: date)
    }

    public struct ParsedDate: Equatable {
        public let date: Date
        /// False when only a calendar day was given (`2026-10-27`).
        public let hasTime: Bool

        public init(date: Date, hasTime: Bool) {
            self.date = date
            self.hasTime = hasTime
        }
    }

    /// Parses the date formats tools accept:
    /// `2026-10-27`, `2026-10-27T15:30`, `2026-10-27 15:30`, `2026-10-27T15:30:00`,
    /// optionally followed by `Z` or a `±HH:MM` offset. Values without an offset
    /// are interpreted in `timeZone` (the user's local zone by default).
    public static func parseFlexible(_ raw: String, timeZone: TimeZone = .current) -> ParsedDate? {
        let text = raw.trimmingCharacters(in: .whitespaces)
        guard text.count >= 10 else { return nil }
        let scalars = Array(text)

        func number(_ range: Range<Int>) -> Int? {
            guard range.upperBound <= scalars.count else { return nil }
            let slice = String(scalars[range])
            guard slice.allSatisfy(\.isNumber) else { return nil }
            return Int(slice)
        }

        guard let year = number(0..<4), scalars[4] == "-", let month = number(5..<7), scalars[7] == "-",
              let day = number(8..<10), (1...12).contains(month), (1...31).contains(day)
        else { return nil }

        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        var zone = timeZone
        var hasTime = false
        var index = 10

        if index < scalars.count {
            guard scalars[index] == "T" || scalars[index] == " " else { return nil }
            index += 1
            guard let hour = number(index..<index + 2), index + 2 < scalars.count, scalars[index + 2] == ":",
                  let minute = number(index + 3..<index + 5), (0...23).contains(hour), (0...59).contains(minute)
            else { return nil }
            components.hour = hour
            components.minute = minute
            hasTime = true
            index += 5
            if index < scalars.count, scalars[index] == ":" {
                guard let second = number(index + 1..<index + 3), (0...60).contains(second) else { return nil }
                components.second = second
                index += 3
                // Fractional seconds are accepted and ignored.
                if index < scalars.count, scalars[index] == "." {
                    index += 1
                    while index < scalars.count, scalars[index].isNumber { index += 1 }
                }
            }
            if index < scalars.count {
                let rest = String(scalars[index...])
                if rest == "Z" || rest == "z" {
                    zone = TimeZone(identifier: "UTC")!
                } else if rest.count == 6, let sign = rest.first, sign == "+" || sign == "-",
                          let hh = Int(rest.dropFirst().prefix(2)), rest[rest.index(rest.startIndex, offsetBy: 3)] == ":",
                          let mm = Int(rest.suffix(2)) {
                    let seconds = (hh * 3600 + mm * 60) * (sign == "-" ? -1 : 1)
                    guard let offsetZone = TimeZone(secondsFromGMT: seconds) else { return nil }
                    zone = offsetZone
                } else {
                    return nil
                }
            }
        } else {
            components.hour = 0
            components.minute = 0
        }

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        guard let date = calendar.date(from: components) else { return nil }
        // Reject impossible days such as 2026-02-31, which Calendar would roll over.
        let check = calendar.dateComponents([.year, .month, .day], from: date)
        guard check.year == year, check.month == month, check.day == day else { return nil }
        return ParsedDate(date: date, hasTime: hasTime)
    }

    /// Parses `HH:mm` into (hour, minute).
    public static func parseClockTime(_ text: String) -> (hour: Int, minute: Int)? {
        let parts = text.split(separator: ":")
        guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]), (0...23).contains(h), (0...59).contains(m) else {
            return nil
        }
        return (h, m)
    }
}

/// Injectable time source so timers and schedulers can be tested deterministically.
public protocol AppClock: Sendable {
    func now() -> Date
}

public struct SystemClock: AppClock {
    public init() {}
    public func now() -> Date { Date() }
}

/// A manually advanced clock for tests and simulations.
public final class ManualClock: AppClock, @unchecked Sendable {
    private let lock = NSLock()
    private var current: Date

    public init(_ start: Date = Date(timeIntervalSince1970: 1_800_000_000)) {
        current = start
    }

    public func now() -> Date {
        lock.lock()
        defer { lock.unlock() }
        return current
    }

    public func advance(by interval: TimeInterval) {
        lock.lock()
        current = current.addingTimeInterval(interval)
        lock.unlock()
    }

    public func set(_ date: Date) {
        lock.lock()
        current = date
        lock.unlock()
    }
}
