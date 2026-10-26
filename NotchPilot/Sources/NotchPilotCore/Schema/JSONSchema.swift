import Foundation

/// The subset of JSON Schema used by NotchPilot tools.
///
/// Every tool declares its input with this type. The same definition is sent to
/// the model provider and used locally to validate arguments before any tool
/// runs, so a malformed or unexpected argument can never reach a handler.
public indirect enum JSONSchema: Sendable, Equatable {
    case object(properties: [Property], required: [String], description: String? = nil)
    case string(description: String? = nil, enumValues: [String]? = nil, minLength: Int? = nil, maxLength: Int? = nil, format: StringFormat? = nil)
    case integer(description: String? = nil, minimum: Int? = nil, maximum: Int? = nil)
    case number(description: String? = nil, minimum: Double? = nil, maximum: Double? = nil)
    case boolean(description: String? = nil)
    case array(items: JSONSchema, description: String? = nil, minItems: Int? = nil, maxItems: Int? = nil)

    public struct Property: Sendable, Equatable {
        public let name: String
        public let schema: JSONSchema
        public init(_ name: String, _ schema: JSONSchema) {
            self.name = name
            self.schema = schema
        }
    }

    public enum StringFormat: String, Sendable {
        /// ISO 8601 date (`2026-10-27`) or date-time (`2026-10-27T15:00`, with optional seconds/zone).
        case dateOrDateTime = "date-time"
        case uri
    }

    /// Convenience for tools with no arguments.
    public static let empty = JSONSchema.object(properties: [], required: [])

    /// JSON representation sent to model providers.
    public func toJSON() -> JSONValue {
        switch self {
        case let .object(properties, required, description):
            var object = JSONObject()
            object["type"] = "object"
            if let description { object["description"] = .string(description) }
            var props = JSONObject()
            for property in properties {
                props[property.name] = property.schema.toJSON()
            }
            object["properties"] = .object(props)
            object["required"] = .array(required.map(JSONValue.string))
            object["additionalProperties"] = false
            return .object(object)
        case let .string(description, enumValues, minLength, maxLength, format):
            var object = JSONObject()
            object["type"] = "string"
            if let description {
                var text = description
                if format == .dateOrDateTime {
                    text += " (ISO 8601 local time, e.g. 2026-10-27 or 2026-10-27T15:30)"
                }
                object["description"] = .string(text)
            }
            if let enumValues { object["enum"] = .array(enumValues.map(JSONValue.string)) }
            if let minLength { object["minLength"] = .int(minLength) }
            if let maxLength { object["maxLength"] = .int(maxLength) }
            return .object(object)
        case let .integer(description, minimum, maximum):
            var object = JSONObject()
            object["type"] = "integer"
            if let description { object["description"] = .string(description) }
            if let minimum { object["minimum"] = .int(minimum) }
            if let maximum { object["maximum"] = .int(maximum) }
            return .object(object)
        case let .number(description, minimum, maximum):
            var object = JSONObject()
            object["type"] = "number"
            if let description { object["description"] = .string(description) }
            if let minimum { object["minimum"] = .double(minimum) }
            if let maximum { object["maximum"] = .double(maximum) }
            return .object(object)
        case let .boolean(description):
            var object = JSONObject()
            object["type"] = "boolean"
            if let description { object["description"] = .string(description) }
            return .object(object)
        case let .array(items, description, minItems, maxItems):
            var object = JSONObject()
            object["type"] = "array"
            if let description { object["description"] = .string(description) }
            object["items"] = items.toJSON()
            if let minItems { object["minItems"] = .int(minItems) }
            if let maxItems { object["maxItems"] = .int(maxItems) }
            return .object(object)
        }
    }
}

public struct SchemaValidationError: Error, Equatable, CustomStringConvertible {
    public let path: String
    public let message: String
    public var description: String { path.isEmpty ? message : "\(path): \(message)" }
}

extension JSONSchema {
    /// Validates `value` strictly against the schema.
    ///
    /// - Unknown object properties are rejected.
    /// - Required properties must be present and non-null.
    /// - Optional properties may be omitted or `null` (treated as omitted).
    /// - Integers must be integral; strings respect enum/length/format constraints.
    public func validate(_ value: JSONValue, path: String = "") throws {
        switch self {
        case let .object(properties, required, _):
            guard case .object(let object) = value else {
                throw SchemaValidationError(path: path, message: "expected an object, got \(value.typeName)")
            }
            let known = Set(properties.map(\.name))
            for key in object.keys where !known.contains(key) {
                throw SchemaValidationError(path: join(path, key), message: "unexpected property")
            }
            for name in required {
                guard let field = object[name], !field.isNull else {
                    throw SchemaValidationError(path: join(path, name), message: "required property is missing")
                }
            }
            for property in properties {
                guard let field = object[property.name], !field.isNull else { continue }
                try property.schema.validate(field, path: join(path, property.name))
            }
        case let .string(_, enumValues, minLength, maxLength, format):
            guard case .string(let string) = value else {
                throw SchemaValidationError(path: path, message: "expected a string, got \(value.typeName)")
            }
            if let enumValues, !enumValues.contains(string) {
                throw SchemaValidationError(path: path, message: "must be one of: \(enumValues.joined(separator: ", "))")
            }
            if let minLength, string.count < minLength {
                throw SchemaValidationError(path: path, message: "must be at least \(minLength) characters")
            }
            if let maxLength, string.count > maxLength {
                throw SchemaValidationError(path: path, message: "must be at most \(maxLength) characters")
            }
            switch format {
            case .dateOrDateTime:
                guard DateCoding.parseFlexible(string) != nil else {
                    throw SchemaValidationError(path: path, message: "must be an ISO 8601 date or date-time")
                }
            case .uri:
                guard let url = URL(string: string), url.scheme != nil else {
                    throw SchemaValidationError(path: path, message: "must be an absolute URL")
                }
            case nil:
                break
            }
        case let .integer(_, minimum, maximum):
            guard let int = value.intValue else {
                throw SchemaValidationError(path: path, message: "expected an integer, got \(value.typeName)")
            }
            if let minimum, int < minimum {
                throw SchemaValidationError(path: path, message: "must be ≥ \(minimum)")
            }
            if let maximum, int > maximum {
                throw SchemaValidationError(path: path, message: "must be ≤ \(maximum)")
            }
        case let .number(_, minimum, maximum):
            guard let number = value.doubleValue, number.isFinite else {
                throw SchemaValidationError(path: path, message: "expected a number, got \(value.typeName)")
            }
            if let minimum, number < minimum {
                throw SchemaValidationError(path: path, message: "must be ≥ \(minimum)")
            }
            if let maximum, number > maximum {
                throw SchemaValidationError(path: path, message: "must be ≤ \(maximum)")
            }
        case .boolean:
            guard value.boolValue != nil else {
                throw SchemaValidationError(path: path, message: "expected a boolean, got \(value.typeName)")
            }
        case let .array(items, _, minItems, maxItems):
            guard case .array(let array) = value else {
                throw SchemaValidationError(path: path, message: "expected an array, got \(value.typeName)")
            }
            if let minItems, array.count < minItems {
                throw SchemaValidationError(path: path, message: "must contain at least \(minItems) items")
            }
            if let maxItems, array.count > maxItems {
                throw SchemaValidationError(path: path, message: "must contain at most \(maxItems) items")
            }
            for (index, item) in array.enumerated() {
                try items.validate(item, path: "\(path)[\(index)]")
            }
        }
    }

    private func join(_ path: String, _ key: String) -> String {
        path.isEmpty ? key : "\(path).\(key)"
    }
}
