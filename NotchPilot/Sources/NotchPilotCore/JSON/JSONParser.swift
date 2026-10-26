import Foundation

public struct JSONParseError: Error, CustomStringConvertible, Equatable {
    public let message: String
    public let offset: Int
    public var description: String { "Invalid JSON at byte \(offset): \(message)" }
}

/// A strict RFC 8259 parser producing order-preserving `JSONValue`s.
public enum JSONParser {
    /// Maximum nesting depth accepted, to keep hostile input from exhausting the stack.
    public static let maxDepth = 128

    public static func parse(_ text: String) throws -> JSONValue {
        try parse(Data(text.utf8))
    }

    public static func parse(_ data: Data) throws -> JSONValue {
        var parser = Parser(bytes: [UInt8](data))
        parser.skipWhitespace()
        let value = try parser.parseValue(depth: 0)
        parser.skipWhitespace()
        guard parser.index == parser.bytes.count else {
            throw parser.error("Unexpected trailing characters")
        }
        return value
    }

    private struct Parser {
        let bytes: [UInt8]
        var index = 0

        init(bytes: [UInt8]) {
            // Skip a UTF-8 byte-order mark if present.
            if bytes.starts(with: [0xEF, 0xBB, 0xBF]) {
                self.bytes = Array(bytes.dropFirst(3))
            } else {
                self.bytes = bytes
            }
        }

        func error(_ message: String) -> JSONParseError {
            JSONParseError(message: message, offset: index)
        }

        mutating func skipWhitespace() {
            while index < bytes.count {
                switch bytes[index] {
                case 0x20, 0x09, 0x0A, 0x0D: index += 1
                default: return
                }
            }
        }

        mutating func parseValue(depth: Int) throws -> JSONValue {
            guard depth < JSONParser.maxDepth else { throw error("Nesting too deep") }
            guard index < bytes.count else { throw error("Unexpected end of input") }
            switch bytes[index] {
            case UInt8(ascii: "{"): return try parseObject(depth: depth)
            case UInt8(ascii: "["): return try parseArray(depth: depth)
            case UInt8(ascii: "\""): return .string(try parseString())
            case UInt8(ascii: "t"): try expectLiteral("true"); return .bool(true)
            case UInt8(ascii: "f"): try expectLiteral("false"); return .bool(false)
            case UInt8(ascii: "n"): try expectLiteral("null"); return .null
            case UInt8(ascii: "-"), UInt8(ascii: "0")...UInt8(ascii: "9"): return .number(try parseNumber())
            default: throw error("Unexpected character")
            }
        }

        mutating func expectLiteral(_ literal: String) throws {
            let utf8 = Array(literal.utf8)
            guard index + utf8.count <= bytes.count, Array(bytes[index..<index + utf8.count]) == utf8 else {
                throw error("Expected \(literal)")
            }
            index += utf8.count
        }

        mutating func parseObject(depth: Int) throws -> JSONValue {
            index += 1
            var object = JSONObject()
            skipWhitespace()
            if index < bytes.count, bytes[index] == UInt8(ascii: "}") {
                index += 1
                return .object(object)
            }
            while true {
                skipWhitespace()
                guard index < bytes.count, bytes[index] == UInt8(ascii: "\"") else { throw error("Expected object key") }
                let key = try parseString()
                skipWhitespace()
                guard index < bytes.count, bytes[index] == UInt8(ascii: ":") else { throw error("Expected ':'") }
                index += 1
                skipWhitespace()
                let value = try parseValue(depth: depth + 1)
                // Duplicate keys: last one wins, matching most JSON implementations.
                object[key] = value
                skipWhitespace()
                guard index < bytes.count else { throw error("Unterminated object") }
                if bytes[index] == UInt8(ascii: ",") {
                    index += 1
                    continue
                }
                if bytes[index] == UInt8(ascii: "}") {
                    index += 1
                    return .object(object)
                }
                throw error("Expected ',' or '}'")
            }
        }

        mutating func parseArray(depth: Int) throws -> JSONValue {
            index += 1
            var items: [JSONValue] = []
            skipWhitespace()
            if index < bytes.count, bytes[index] == UInt8(ascii: "]") {
                index += 1
                return .array(items)
            }
            while true {
                skipWhitespace()
                items.append(try parseValue(depth: depth + 1))
                skipWhitespace()
                guard index < bytes.count else { throw error("Unterminated array") }
                if bytes[index] == UInt8(ascii: ",") {
                    index += 1
                    continue
                }
                if bytes[index] == UInt8(ascii: "]") {
                    index += 1
                    return .array(items)
                }
                throw error("Expected ',' or ']'")
            }
        }

        mutating func parseNumber() throws -> String {
            let start = index
            if bytes[index] == UInt8(ascii: "-") { index += 1 }
            guard index < bytes.count else { throw error("Invalid number") }
            if bytes[index] == UInt8(ascii: "0") {
                index += 1
            } else if isDigit(bytes[index]) {
                while index < bytes.count, isDigit(bytes[index]) { index += 1 }
            } else {
                throw error("Invalid number")
            }
            if index < bytes.count, bytes[index] == UInt8(ascii: ".") {
                index += 1
                guard index < bytes.count, isDigit(bytes[index]) else { throw error("Invalid fraction") }
                while index < bytes.count, isDigit(bytes[index]) { index += 1 }
            }
            if index < bytes.count, bytes[index] == UInt8(ascii: "e") || bytes[index] == UInt8(ascii: "E") {
                index += 1
                if index < bytes.count, bytes[index] == UInt8(ascii: "+") || bytes[index] == UInt8(ascii: "-") {
                    index += 1
                }
                guard index < bytes.count, isDigit(bytes[index]) else { throw error("Invalid exponent") }
                while index < bytes.count, isDigit(bytes[index]) { index += 1 }
            }
            return String(decoding: bytes[start..<index], as: UTF8.self)
        }

        func isDigit(_ byte: UInt8) -> Bool {
            byte >= UInt8(ascii: "0") && byte <= UInt8(ascii: "9")
        }

        mutating func parseString() throws -> String {
            index += 1  // opening quote
            var scalars = String.UnicodeScalarView()
            var runStart = index
            func flushRun(_ parser: Parser, upTo end: Int, into scalars: inout String.UnicodeScalarView) {
                if end > runStart {
                    scalars.append(contentsOf: String(decoding: parser.bytes[runStart..<end], as: UTF8.self).unicodeScalars)
                }
            }
            while true {
                guard index < bytes.count else { throw error("Unterminated string") }
                let byte = bytes[index]
                if byte == UInt8(ascii: "\"") {
                    flushRun(self, upTo: index, into: &scalars)
                    index += 1
                    return String(scalars)
                }
                if byte < 0x20 {
                    throw error("Unescaped control character in string")
                }
                if byte == UInt8(ascii: "\\") {
                    flushRun(self, upTo: index, into: &scalars)
                    index += 1
                    guard index < bytes.count else { throw error("Unterminated escape") }
                    let escape = bytes[index]
                    index += 1
                    switch escape {
                    case UInt8(ascii: "\""): scalars.append("\"")
                    case UInt8(ascii: "\\"): scalars.append("\\")
                    case UInt8(ascii: "/"): scalars.append("/")
                    case UInt8(ascii: "b"): scalars.append("\u{08}")
                    case UInt8(ascii: "f"): scalars.append("\u{0C}")
                    case UInt8(ascii: "n"): scalars.append("\n")
                    case UInt8(ascii: "r"): scalars.append("\r")
                    case UInt8(ascii: "t"): scalars.append("\t")
                    case UInt8(ascii: "u"):
                        let unit = try parseHex4()
                        if (0xD800...0xDBFF).contains(unit) {
                            // Expect a low surrogate.
                            if index + 1 < bytes.count, bytes[index] == UInt8(ascii: "\\"), bytes[index + 1] == UInt8(ascii: "u") {
                                index += 2
                                let low = try parseHex4()
                                guard (0xDC00...0xDFFF).contains(low) else { throw error("Invalid low surrogate") }
                                let combined = 0x10000 + ((UInt32(unit) - 0xD800) << 10) + (UInt32(low) - 0xDC00)
                                scalars.append(Unicode.Scalar(combined) ?? "\u{FFFD}")
                            } else {
                                scalars.append("\u{FFFD}")
                            }
                        } else if (0xDC00...0xDFFF).contains(unit) {
                            scalars.append("\u{FFFD}")
                        } else {
                            scalars.append(Unicode.Scalar(UInt32(unit)) ?? "\u{FFFD}")
                        }
                    default:
                        throw error("Invalid escape sequence")
                    }
                    runStart = index
                    continue
                }
                index += 1
            }
        }

        mutating func parseHex4() throws -> UInt16 {
            guard index + 4 <= bytes.count else { throw error("Invalid unicode escape") }
            var value: UInt16 = 0
            for _ in 0..<4 {
                let b = bytes[index]
                let digit: UInt16
                switch b {
                case UInt8(ascii: "0")...UInt8(ascii: "9"): digit = UInt16(b - UInt8(ascii: "0"))
                case UInt8(ascii: "a")...UInt8(ascii: "f"): digit = UInt16(b - UInt8(ascii: "a") + 10)
                case UInt8(ascii: "A")...UInt8(ascii: "F"): digit = UInt16(b - UInt8(ascii: "A") + 10)
                default: throw error("Invalid hex digit")
                }
                value = value * 16 + digit
                index += 1
            }
            return value
        }
    }
}

// MARK: - Serialisation

extension JSONValue {
    /// Compact serialisation preserving key order and number literals.
    public func serialized() -> String {
        var output = ""
        output.reserveCapacity(64)
        JSONValue.write(self, into: &output, pretty: false, indent: 0)
        return output
    }

    /// Indented serialisation for display and debugging.
    public func prettyPrinted() -> String {
        var output = ""
        JSONValue.write(self, into: &output, pretty: true, indent: 0)
        return output
    }

    public func serializedData() -> Data {
        Data(serialized().utf8)
    }

    private static func write(_ value: JSONValue, into output: inout String, pretty: Bool, indent: Int) {
        switch value {
        case .null: output += "null"
        case .bool(let b): output += b ? "true" : "false"
        case .number(let n): output += n
        case .string(let s): writeString(s, into: &output)
        case .array(let items):
            if items.isEmpty {
                output += "[]"
                return
            }
            output += "["
            for (i, item) in items.enumerated() {
                if i > 0 { output += "," }
                if pretty { output += "\n" + String(repeating: "  ", count: indent + 1) }
                write(item, into: &output, pretty: pretty, indent: indent + 1)
            }
            if pretty { output += "\n" + String(repeating: "  ", count: indent) }
            output += "]"
        case .object(let object):
            if object.isEmpty {
                output += "{}"
                return
            }
            output += "{"
            for (i, entry) in object.entries.enumerated() {
                if i > 0 { output += "," }
                if pretty { output += "\n" + String(repeating: "  ", count: indent + 1) }
                writeString(entry.key, into: &output)
                output += pretty ? ": " : ":"
                write(entry.value, into: &output, pretty: pretty, indent: indent + 1)
            }
            if pretty { output += "\n" + String(repeating: "  ", count: indent) }
            output += "}"
        }
    }

    private static func writeString(_ string: String, into output: inout String) {
        output += "\""
        for scalar in string.unicodeScalars {
            switch scalar {
            case "\"": output += "\\\""
            case "\\": output += "\\\\"
            case "\n": output += "\\n"
            case "\r": output += "\\r"
            case "\t": output += "\\t"
            case "\u{08}": output += "\\b"
            case "\u{0C}": output += "\\f"
            default:
                if scalar.value < 0x20 {
                    output += String(format: "\\u%04x", scalar.value)
                } else {
                    output.unicodeScalars.append(scalar)
                }
            }
        }
        output += "\""
    }
}
