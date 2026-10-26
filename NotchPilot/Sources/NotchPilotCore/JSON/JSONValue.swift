import Foundation

/// An order-preserving JSON value.
///
/// Provider transcripts (tool inputs, thinking blocks, reasoning items) must be
/// replayed exactly as they were received, so objects keep their key order and
/// numbers keep their original lexical form instead of being normalised through
/// `Double`.
public enum JSONValue: Hashable, Sendable {
    case null
    case bool(Bool)
    /// The number's literal text, e.g. `25`, `-1.5e3`.
    case number(String)
    case string(String)
    case array([JSONValue])
    case object(JSONObject)

    public static func int(_ value: Int) -> JSONValue { .number(String(value)) }

    public static func double(_ value: Double) -> JSONValue {
        guard value.isFinite else { return .null }
        if value == value.rounded(), abs(value) < 1e15 {
            return .number(String(Int64(value)))
        }
        return .number(String(value))
    }

    public static func date(_ value: Date) -> JSONValue {
        .string(DateCoding.iso8601String(value))
    }

    public static func optional(_ value: String?) -> JSONValue {
        value.map(JSONValue.string) ?? .null
    }

    // MARK: Accessors

    public var stringValue: String? {
        if case .string(let s) = self { return s }
        return nil
    }

    public var boolValue: Bool? {
        if case .bool(let b) = self { return b }
        return nil
    }

    public var doubleValue: Double? {
        if case .number(let n) = self { return Double(n) }
        return nil
    }

    /// Integer value if the number is integral (e.g. `25` or `25.0`).
    public var intValue: Int? {
        guard case .number(let n) = self else { return nil }
        if let i = Int(n) { return i }
        if let d = Double(n), d.isFinite, d == d.rounded(), abs(d) < Double(Int.max) { return Int(d) }
        return nil
    }

    public var arrayValue: [JSONValue]? {
        if case .array(let a) = self { return a }
        return nil
    }

    public var objectValue: JSONObject? {
        if case .object(let o) = self { return o }
        return nil
    }

    public var isNull: Bool {
        if case .null = self { return true }
        return false
    }

    public subscript(key: String) -> JSONValue? {
        objectValue?[key]
    }

    public var typeName: String {
        switch self {
        case .null: return "null"
        case .bool: return "boolean"
        case .number: return "number"
        case .string: return "string"
        case .array: return "array"
        case .object: return "object"
        }
    }
}

/// A JSON object that preserves insertion order.
public struct JSONObject: Hashable, Sendable, Sequence {
    public private(set) var entries: [(key: String, value: JSONValue)]

    public init() { entries = [] }

    public init(_ entries: [(String, JSONValue)]) {
        self.entries = []
        for (k, v) in entries { self[k] = v }
    }

    public var keys: [String] { entries.map(\.key) }
    public var count: Int { entries.count }
    public var isEmpty: Bool { entries.isEmpty }

    public subscript(key: String) -> JSONValue? {
        get { entries.first(where: { $0.key == key })?.value }
        set {
            if let index = entries.firstIndex(where: { $0.key == key }) {
                if let newValue {
                    entries[index].value = newValue
                } else {
                    entries.remove(at: index)
                }
            } else if let newValue {
                entries.append((key, newValue))
            }
        }
    }

    public func makeIterator() -> IndexingIterator<[(key: String, value: JSONValue)]> {
        entries.makeIterator()
    }

    public static func == (lhs: JSONObject, rhs: JSONObject) -> Bool {
        guard lhs.entries.count == rhs.entries.count else { return false }
        for (l, r) in zip(lhs.entries, rhs.entries) where l.key != r.key || l.value != r.value {
            return false
        }
        return true
    }

    public func hash(into hasher: inout Hasher) {
        for entry in entries {
            hasher.combine(entry.key)
            hasher.combine(entry.value)
        }
    }
}

extension JSONValue: ExpressibleByStringLiteral, ExpressibleByIntegerLiteral, ExpressibleByBooleanLiteral,
    ExpressibleByArrayLiteral, ExpressibleByDictionaryLiteral, ExpressibleByNilLiteral, ExpressibleByFloatLiteral
{
    public init(stringLiteral value: String) { self = .string(value) }
    public init(integerLiteral value: Int) { self = .int(value) }
    public init(booleanLiteral value: Bool) { self = .bool(value) }
    public init(arrayLiteral elements: JSONValue...) { self = .array(elements) }
    public init(dictionaryLiteral elements: (String, JSONValue)...) { self = .object(JSONObject(elements)) }
    public init(nilLiteral: ()) { self = .null }
    public init(floatLiteral value: Double) { self = .double(value) }
}

/// Persist JSON values as their serialised text so key order and number
/// literals survive round trips through `Codable` stores.
extension JSONValue: Codable {
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let text = try container.decode(String.self)
        self = try JSONParser.parse(text)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(serialized())
    }
}

extension JSONValue {
    /// Converts an `Encodable` value through `JSONEncoder` into a `JSONValue`.
    public static func encode<T: Encodable>(_ value: T) throws -> JSONValue {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(DateCoding.iso8601String(date))
        }
        encoder.outputFormatting = [.sortedKeys]
        let data = try encoder.encode(value)
        return try JSONParser.parse(data)
    }
}
