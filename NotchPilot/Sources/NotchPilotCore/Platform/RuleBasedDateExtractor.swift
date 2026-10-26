import Foundation

/// Deterministic extraction of dates and deadlines from English text.
///
/// Handles ISO dates, month names ("Oct 30", "30th of October"), relative
/// words ("today", "tomorrow", "in 3 days", "next week"), weekdays
/// ("by Friday", "next Monday") and clock times ("at 3pm", "15:30").
/// The macOS app combines this with `NSDataDetector`.
public struct RuleBasedDateExtractor: DateExtracting {
    public var calendar: Calendar

    public init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    private struct Match {
        var range: Range<String.Index>
        var day: Date
        var time: (hour: Int, minute: Int)?
    }

    private static let monthPattern = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
    private static let weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    private static let numberWords = ["a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "twelve": 12]

    public func extractDates(from text: String, reference: Date) -> [ExtractedDate] {
        var matches: [Match] = []
        let today = calendar.startOfDay(for: reference)

        func add(_ range: Range<String.Index>, _ day: Date?, time: (Int, Int)? = nil) {
            guard let day else { return }
            if matches.contains(where: { $0.range.overlaps(range) }) { return }
            matches.append(Match(range: range, day: calendar.startOfDay(for: day), time: time.map { (hour: $0.0, minute: $0.1) }))
        }

        // ISO 8601 dates, optionally with a time.
        for m in Self.regex(#"\b(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?\b"#).matches(in: text) {
            guard let y = m.int(1, text), let mo = m.int(2, text), let d = m.int(3, text) else { continue }
            var time: (Int, Int)?
            if let h = m.int(4, text), let mi = m.int(5, text), h < 24, mi < 60 { time = (h, mi) }
            add(m.range(text), makeDate(year: y, month: mo, day: d), time: time)
        }

        // "October 30th, 2026" / "Oct 30"
        for m in Self.regex(#"\b"# + Self.monthPattern + #"\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b"#).matches(in: text) {
            guard let month = Self.month(m.string(1, text)), let d = m.int(2, text) else { continue }
            add(m.range(text), resolveMonthDay(month: month, day: d, year: m.int(3, text), today: today))
        }

        // "30 October" / "30th of Oct 2026"
        for m in Self.regex(#"\b(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+"# + Self.monthPattern + #"\.?(?:,?\s+(\d{4}))?\b"#).matches(in: text) {
            guard let d = m.int(1, text), let month = Self.month(m.string(2, text)) else { continue }
            add(m.range(text), resolveMonthDay(month: month, day: d, year: m.int(3, text), today: today))
        }

        // Relative words.
        for m in Self.regex(#"\b(the day after tomorrow|day after tomorrow|today|tonight|tomorrow|yesterday)\b"#).matches(in: text) {
            let word = m.string(1, text).lowercased()
            let offset: Int
            switch word {
            case "yesterday": offset = -1
            case "tomorrow": offset = 1
            case "day after tomorrow", "the day after tomorrow": offset = 2
            default: offset = 0
            }
            let time: (Int, Int)? = word == "tonight" ? (20, 0) : nil
            add(m.range(text), calendar.date(byAdding: .day, value: offset, to: today), time: time)
        }

        // "in 3 days", "in two weeks", "in an hour"
        for m in Self.regex(#"\bin\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(minutes?|hours?|days?|weeks?|months?)\b"#).matches(in: text) {
            let rawCount = m.string(1, text).lowercased()
            guard let count = Int(rawCount) ?? Self.numberWords[rawCount] else { continue }
            let unit = m.string(2, text).lowercased()
            if unit.hasPrefix("minute") || unit.hasPrefix("hour") {
                let seconds = Double(count) * (unit.hasPrefix("hour") ? 3600 : 60)
                let target = reference.addingTimeInterval(seconds)
                let c = calendar.dateComponents([.hour, .minute], from: target)
                add(m.range(text), target, time: (c.hour ?? 0, c.minute ?? 0))
            } else {
                let component: Calendar.Component = unit.hasPrefix("day") ? .day : unit.hasPrefix("week") ? .weekOfYear : .month
                add(m.range(text), calendar.date(byAdding: component, value: count, to: today))
            }
        }

        // "next week" (Monday of next week), "next month" (1st of next month)
        for m in Self.regex(#"\bnext\s+(week|month)\b"#).matches(in: text) {
            if m.string(1, text).lowercased() == "week" {
                let weekday = calendar.component(.weekday, from: today)  // 1 = Sunday … 7 = Saturday
                let untilMonday = (2 - weekday + 7) % 7
                let daysToMonday = untilMonday == 0 ? 7 : untilMonday
                add(m.range(text), calendar.date(byAdding: .day, value: daysToMonday, to: today))
            } else if let nextMonth = calendar.date(byAdding: .month, value: 1, to: today) {
                let c = calendar.dateComponents([.year, .month], from: nextMonth)
                add(m.range(text), makeDate(year: c.year ?? 0, month: c.month ?? 1, day: 1))
            }
        }

        // Weekdays, optionally qualified.
        for m in Self.regex(#"\b(?:(next|this|on|by|until|before)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b"#).matches(in: text) {
            let qualifier = m.optionalString(1, text)?.lowercased()
            guard let target = Self.weekdays.firstIndex(of: m.string(2, text).lowercased()) else { continue }
            let current = calendar.component(.weekday, from: today) - 1  // 0 = Sunday
            let delta: Int
            if qualifier == "next" {
                // "next Friday" = that weekday in the following Monday-based week.
                let untilMonday = (1 - current + 7) % 7
                let nextMonday = untilMonday == 0 ? 7 : untilMonday
                delta = nextMonday + (target - 1 + 7) % 7
            } else {
                let ahead = (target - current + 7) % 7
                delta = ahead == 0 && qualifier != "this" ? 7 : ahead
            }
            add(m.range(text), calendar.date(byAdding: .day, value: delta, to: today))
        }

        // Clock times, attached to the nearest date in the same sentence.
        var times: [(range: Range<String.Index>, hour: Int, minute: Int)] = []
        for m in Self.regex(#"\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=\W|$)"#).matches(in: text) {
            guard var hour = m.int(1, text), hour >= 1, hour <= 12 else { continue }
            let minute = m.int(2, text) ?? 0
            let suffix = m.string(3, text).lowercased()
            if suffix.hasPrefix("p"), hour < 12 { hour += 12 }
            if suffix.hasPrefix("a"), hour == 12 { hour = 0 }
            times.append((m.range(text), hour, minute))
        }
        for m in Self.regex(#"\b([01]?\d|2[0-3]):([0-5]\d)\b"#).matches(in: text) {
            let range = m.range(text)
            if times.contains(where: { $0.range.overlaps(range) }) { continue }
            if matches.contains(where: { $0.range.overlaps(range) }) { continue }
            times.append((range, m.int(1, text) ?? 0, m.int(2, text) ?? 0))
        }
        for m in Self.regex(#"\b(noon|midday|midnight)\b"#).matches(in: text) {
            times.append((m.range(text), m.string(1, text).lowercased() == "midnight" ? 0 : 12, 0))
        }

        var orphanTimes: [(range: Range<String.Index>, hour: Int, minute: Int)] = []
        for time in times {
            let candidates = matches.indices.filter { matches[$0].time == nil && sameSentence(matches[$0].range, time.range, in: text) }
            if let nearest = candidates.min(by: { distance(matches[$0].range, time.range, in: text) < distance(matches[$1].range, time.range, in: text) }) {
                matches[nearest].time = (time.hour, time.minute)
            } else {
                orphanTimes.append(time)
            }
        }
        for time in orphanTimes {
            matches.append(Match(range: time.range, day: today, time: (time.hour, time.minute)))
        }

        return matches
            .sorted { $0.range.lowerBound < $1.range.lowerBound }
            .compactMap { match in
                var date = match.day
                if let time = match.time {
                    date = calendar.date(bySettingHour: time.hour, minute: time.minute, second: 0, of: match.day) ?? match.day
                }
                return ExtractedDate(matchedText: String(text[match.range]), date: date, hasTime: match.time != nil)
            }
    }

    private func makeDate(year: Int, month: Int, day: Int) -> Date? {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        guard let date = calendar.date(from: components) else { return nil }
        let check = calendar.dateComponents([.year, .month, .day], from: date)
        return check.year == year && check.month == month && check.day == day ? date : nil
    }

    private func resolveMonthDay(month: Int, day: Int, year: Int?, today: Date) -> Date? {
        if let year { return makeDate(year: year, month: month, day: day) }
        let currentYear = calendar.component(.year, from: today)
        guard let candidate = makeDate(year: currentYear, month: month, day: day) else { return nil }
        // A date more than a week in the past most likely refers to next year.
        if candidate < today.addingTimeInterval(-7 * 86_400) {
            return makeDate(year: currentYear + 1, month: month, day: day)
        }
        return candidate
    }

    private func sameSentence(_ a: Range<String.Index>, _ b: Range<String.Index>, in text: String) -> Bool {
        let lower = min(a.lowerBound, b.lowerBound)
        let upper = max(a.upperBound, b.upperBound)
        let between = text[lower..<upper]
        return !between.contains(where: { ".!?\n;".contains($0) }) && between.count < 60
    }

    private func distance(_ a: Range<String.Index>, _ b: Range<String.Index>, in text: String) -> Int {
        if a.upperBound <= b.lowerBound { return text.distance(from: a.upperBound, to: b.lowerBound) }
        if b.upperBound <= a.lowerBound { return text.distance(from: b.upperBound, to: a.lowerBound) }
        return 0
    }

    private static func month(_ raw: String) -> Int? {
        let prefix = raw.lowercased().prefix(3)
        let names = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
        return names.firstIndex(of: String(prefix)).map { $0 + 1 }
    }

    nonisolated(unsafe) private static var cache: [String: NSRegularExpression] = [:]
    private static let cacheLock = NSLock()

    private static func regex(_ pattern: String) -> NSRegularExpression {
        cacheLock.lock()
        defer { cacheLock.unlock() }
        if let cached = cache[pattern] { return cached }
        // Patterns are static literals; a failure here is a programming error.
        let compiled = try! NSRegularExpression(pattern: pattern, options: [.caseInsensitive])
        cache[pattern] = compiled
        return compiled
    }
}

private extension NSRegularExpression {
    func matches(in text: String) -> [NSTextCheckingResult] {
        matches(in: text, range: NSRange(text.startIndex..., in: text))
    }
}

private extension NSTextCheckingResult {
    func range(_ text: String) -> Range<String.Index> {
        Range(range, in: text)!
    }

    func optionalString(_ group: Int, _ text: String) -> String? {
        guard group < numberOfRanges, let r = Range(range(at: group), in: text) else { return nil }
        return String(text[r])
    }

    func string(_ group: Int, _ text: String) -> String {
        optionalString(group, text) ?? ""
    }

    func int(_ group: Int, _ text: String) -> Int? {
        optionalString(group, text).flatMap { Int($0) }
    }
}
