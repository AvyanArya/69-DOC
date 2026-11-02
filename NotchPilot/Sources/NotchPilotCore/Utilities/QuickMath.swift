import Foundation

/// Evaluates simple arithmetic typed into the message box ("18% of 2,450",
/// "(12 + 8) * 3", "2^10") so the answer can be shown instantly, without
/// asking the AI provider. A small recursive-descent parser; nothing is
/// executed as code.
public enum QuickMath {
    /// The result, or nil when the text isn't a sum (plain numbers, words,
    /// malformed or non-finite expressions).
    public static func evaluate(_ text: String) -> Double? {
        var source = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if source.hasPrefix("=") { source.removeFirst() }
        source = source.replacingOccurrences(of: ",", with: "")
            .replacingOccurrences(of: "×", with: "*")
            .replacingOccurrences(of: "x", with: "*")
            .replacingOccurrences(of: "÷", with: "/")
            .replacingOccurrences(of: #"\s+of\s+"#, with: "*", options: [.regularExpression, .caseInsensitive])
        let allowed = Set("0123456789. +-*/^%()")
        guard !source.isEmpty, source.allSatisfy(allowed.contains), source.contains(where: \.isNumber) else { return nil }
        var withoutSign = source.trimmingCharacters(in: .whitespaces)
        if withoutSign.hasPrefix("-") { withoutSign.removeFirst() }
        guard withoutSign.contains(where: { "+-*/^%".contains($0) }) else { return nil }
        var parser = Parser(Array(source))
        guard let value = parser.parse(), value.isFinite else { return nil }
        return value
    }

    /// Up to eight decimal places, grouped for the user's locale.
    public static func format(_ value: Double, locale: Locale = .current) -> String {
        let formatter = NumberFormatter()
        formatter.locale = locale
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 8
        return formatter.string(from: NSNumber(value: value)) ?? String(value)
    }

    private struct Parser {
        let chars: [Character]
        var index = 0
        init(_ chars: [Character]) { self.chars = chars }

        mutating func parse() -> Double? {
            guard let value = expression() else { return nil }
            skipSpaces()
            return index == chars.count ? value : nil
        }

        private var current: Character? { index < chars.count ? chars[index] : nil }
        private mutating func skipSpaces() { while current == " " { index += 1 } }

        private mutating func expression() -> Double? {
            guard var value = term() else { return nil }
            while true {
                skipSpaces()
                if current == "+" { index += 1; guard let rhs = term() else { return nil }; value += rhs }
                else if current == "-" { index += 1; guard let rhs = term() else { return nil }; value -= rhs }
                else { return value }
            }
        }

        private mutating func term() -> Double? {
            guard var value = power() else { return nil }
            while true {
                skipSpaces()
                if current == "*" { index += 1; guard let rhs = power() else { return nil }; value *= rhs }
                else if current == "/" { index += 1; guard let rhs = power() else { return nil }; value /= rhs }
                else { return value }
            }
        }

        private mutating func power() -> Double? {
            guard let base = atom() else { return nil }
            skipSpaces()
            if current == "^" { index += 1; guard let exponent = power() else { return nil }; return Foundation.pow(base, exponent) }
            return base
        }

        private mutating func atom() -> Double? {
            skipSpaces()
            if current == "-" { index += 1; return atom().map { -$0 } }
            var value: Double
            if current == "(" {
                index += 1
                guard let inner = expression() else { return nil }
                skipSpaces()
                guard current == ")" else { return nil }
                index += 1
                value = inner
            } else {
                let start = index
                while let c = current, c.isNumber || c == "." { index += 1 }
                guard index > start, let number = Double(String(chars[start..<index])) else { return nil }
                value = number
            }
            skipSpaces()
            if current == "%" { index += 1; value /= 100 }
            return value
        }
    }
}
