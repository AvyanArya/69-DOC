import XCTest
@testable import NotchPilotCore

final class JSONTests: XCTestCase {
    func testRoundTripPreservesKeyOrderAndNumberLiterals() throws {
        let text = #"{"z":1,"a":{"y":2.50,"b":[true,false,null]},"m":-1.5e3,"s":"x"}"#
        let value = try JSONParser.parse(text)
        XCTAssertEqual(value.serialized(), text)
        XCTAssertEqual(value["a"]?.objectValue?.keys, ["y", "b"])
        XCTAssertEqual(value["m"]?.doubleValue, -1500)
    }

    func testEscapesAndUnicode() throws {
        let value = try JSONParser.parse(#"{"t":"line\nbreak \"quoted\" é 😀 tab\t"}"#)
        XCTAssertEqual(value["t"]?.stringValue, "line\nbreak \"quoted\" é 😀 tab\t")
        let reparsed = try JSONParser.parse(value.serialized())
        XCTAssertEqual(reparsed, value)
    }

    func testRejectsInvalidJSON() {
        for bad in ["", "{", #"{"a":}"#, "[1,]", #"{"a" 1}"#, "01", "1.", "tru", #""unterminated"#, "{} extra", "\"ctl\u{01}\""] {
            XCTAssertThrowsError(try JSONParser.parse(bad), "should reject \(bad)")
        }
    }

    func testDepthLimit() {
        let deep = String(repeating: "[", count: 200) + String(repeating: "]", count: 200)
        XCTAssertThrowsError(try JSONParser.parse(deep))
    }

    func testIntegerAccessors() throws {
        XCTAssertEqual(try JSONParser.parse("25").intValue, 25)
        XCTAssertEqual(try JSONParser.parse("25.0").intValue, 25)
        XCTAssertNil(try JSONParser.parse("25.5").intValue)
    }

    func testCodablePersistsExactText() throws {
        struct Box: Codable, Equatable { var value: JSONValue }
        let original = Box(value: try JSONParser.parse(#"{"b":1,"a":2}"#))
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(Box.self, from: data)
        XCTAssertEqual(decoded.value.serialized(), #"{"b":1,"a":2}"#)
    }

    func testDefaultsMergingFillsNewKeys() throws {
        // An older settings file without the "agent" section and with a partial provider.
        let old = #"{"provider":{"kind":"openAI","models":{"openAI":"gpt-x"}},"launchAtLogin":true}"#
        let merged = try DefaultsMerging.decode(AppSettings.self, from: Data(old.utf8), defaults: AppSettings())
        XCTAssertEqual(merged.provider.kind, .openAI)
        XCTAssertEqual(merged.provider.model(for: .openAI), "gpt-x")
        XCTAssertEqual(merged.provider.effort, .medium)
        XCTAssertTrue(merged.launchAtLogin)
        XCTAssertEqual(merged.agent.mode, .standard)
    }
}

final class SchemaValidationTests: XCTestCase {
    let schema = JSONSchema.object(properties: [
        .init("title", .string(minLength: 1, maxLength: 10)),
        .init("priority", .string(enumValues: ["low", "high"])),
        .init("minutes", .integer(minimum: 1, maximum: 60)),
        .init("due", .string(format: .dateOrDateTime)),
        .init("items", .array(items: .object(properties: [.init("name", .string())], required: ["name"]), maxItems: 2)),
        .init("flag", .boolean()),
    ], required: ["title"])

    func validate(_ json: String) throws {
        try schema.validate(try JSONParser.parse(json))
    }

    func testAcceptsValidInput() throws {
        try validate(#"{"title":"Essay","priority":"high","minutes":25,"due":"2026-10-27T15:00","items":[{"name":"a"}],"flag":true}"#)
        try validate(#"{"title":"Essay","priority":null}"#)  // null optional is treated as absent
    }

    func testRejectsMissingRequired() {
        XCTAssertThrowsError(try validate(#"{"priority":"low"}"#)) { error in
            XCTAssertEqual((error as? SchemaValidationError)?.path, "title")
        }
        XCTAssertThrowsError(try validate(#"{"title":null}"#))
    }

    func testRejectsUnknownProperties() {
        XCTAssertThrowsError(try validate(#"{"title":"x","command":"rm -rf /"}"#)) { error in
            XCTAssertEqual((error as? SchemaValidationError)?.message, "unexpected property")
        }
    }

    func testRejectsWrongTypesAndBounds() {
        XCTAssertThrowsError(try validate(#"{"title":5}"#))
        XCTAssertThrowsError(try validate(#"{"title":""}"#))
        XCTAssertThrowsError(try validate(#"{"title":"much too long title"}"#))
        XCTAssertThrowsError(try validate(#"{"title":"x","priority":"urgent"}"#))
        XCTAssertThrowsError(try validate(#"{"title":"x","minutes":0}"#))
        XCTAssertThrowsError(try validate(#"{"title":"x","minutes":2.5}"#))
        XCTAssertThrowsError(try validate(#"{"title":"x","minutes":"25"}"#))
        XCTAssertThrowsError(try validate(#"{"title":"x","due":"next tuesday"}"#))
        XCTAssertThrowsError(try validate(#"{"title":"x","due":"2026-02-31"}"#))
        XCTAssertThrowsError(try validate(#"{"title":"x","items":[{"name":"a"},{"name":"b"},{"name":"c"}]}"#))
        XCTAssertThrowsError(try validate(#"{"title":"x","items":[{}]}"#)) { error in
            XCTAssertEqual((error as? SchemaValidationError)?.path, "items[0].name")
        }
        XCTAssertThrowsError(try validate(#"{"title":"x","flag":"yes"}"#))
        XCTAssertThrowsError(try validate(#"["not","an","object"]"#))
    }

    func testSchemaJSONIsStrict() {
        let json = schema.toJSON()
        XCTAssertEqual(json["additionalProperties"], .bool(false))
        XCTAssertEqual(json["required"], ["title"])
        XCTAssertEqual(json["properties"]?["items"]?["items"]?["additionalProperties"], .bool(false))
    }

    @MainActor
    func testEveryBuiltinToolHasAStrictObjectSchemaAndUniqueName() async {
        let registry = BuiltinTools.makeRegistry()
        var names = Set<String>()
        for tool in registry.allTools {
            let def = tool.definition
            XCTAssertTrue(names.insert(def.name).inserted, "duplicate \(def.name)")
            XCTAssertNotNil(def.name.range(of: "^[a-z_]{3,64}$", options: .regularExpression), def.name)
            XCTAssertGreaterThan(def.description.count, 20, def.name)
            let json = def.schema.toJSON()
            XCTAssertEqual(json["type"], "object", def.name)
            XCTAssertEqual(json["additionalProperties"], .bool(false), def.name)
            XCTAssertGreaterThan(def.timeout, 0)
            // Destructive and sensitive tools must never be marked low impact.
            if def.risk >= .destructive { XCTAssertFalse(def.lowImpact, def.name) }
        }
        XCTAssertEqual(registry.specs.map(\.name), registry.allTools.map(\.definition.name), "specs keep a stable order")
    }
}

final class PermissionPolicyTests: XCTestCase {
    func definition(_ risk: ToolRisk, feature: FeatureArea = .tasks, lowImpact: Bool = false) -> ToolDefinition {
        ToolDefinition(name: "t", description: "test tool for permissions", schema: .empty, risk: risk, feature: feature, lowImpact: lowImpact)
    }

    func settings(_ mode: AgentMode, _ change: (inout AppSettings) -> Void = { _ in }) -> AppSettings {
        var settings = AppSettings()
        settings.agent.mode = mode
        change(&settings)
        return settings
    }

    func isConfirm(_ decision: PermissionDecision) -> Bool {
        if case .confirm = decision { return true }
        return false
    }

    func isDeny(_ decision: PermissionDecision) -> Bool {
        if case .deny = decision { return true }
        return false
    }

    func testReadsAreAlwaysAllowed() {
        for mode in AgentMode.allCases {
            XCTAssertEqual(PermissionPolicy.evaluate(definition(.read), settings: settings(mode)), .allow)
        }
    }

    func testAppWritesDependOnMode() {
        XCTAssertTrue(isConfirm(PermissionPolicy.evaluate(definition(.appWrite), settings: settings(.cautious))))
        XCTAssertEqual(PermissionPolicy.evaluate(definition(.appWrite), settings: settings(.standard)), .allow)
        XCTAssertEqual(PermissionPolicy.evaluate(definition(.appWrite), settings: settings(.autonomous)), .allow)
    }

    func testDestructiveAndSensitiveAlwaysConfirmEvenInAutonomousMode() {
        for mode in AgentMode.allCases {
            XCTAssertTrue(isConfirm(PermissionPolicy.evaluate(definition(.destructive), settings: settings(mode))))
            XCTAssertTrue(isConfirm(PermissionPolicy.evaluate(definition(.sensitive, feature: .shortcuts), settings: settings(mode) { $0.features.shortcuts = true })))
        }
    }

    func testExternalActions() {
        let calendarWrite = definition(.external, feature: .calendar)
        XCTAssertTrue(isConfirm(PermissionPolicy.evaluate(calendarWrite, settings: settings(.standard))))
        XCTAssertTrue(isConfirm(PermissionPolicy.evaluate(calendarWrite, settings: settings(.autonomous))))
        XCTAssertEqual(PermissionPolicy.evaluate(calendarWrite, settings: settings(.standard) { $0.agent.allowCalendarWritesWithoutAsking = true }), .allow)
        XCTAssertTrue(isConfirm(PermissionPolicy.evaluate(calendarWrite, settings: settings(.cautious) { $0.agent.allowCalendarWritesWithoutAsking = true })))

        let link = definition(.external, feature: .webLinks)
        XCTAssertTrue(isConfirm(PermissionPolicy.evaluate(link, settings: settings(.autonomous))))
        XCTAssertEqual(PermissionPolicy.evaluate(link, settings: settings(.standard) { $0.agent.allowOpeningLinksWithoutAsking = true }), .allow)

        let openApp = definition(.external, feature: .appLaunching, lowImpact: true)
        XCTAssertEqual(PermissionPolicy.evaluate(openApp, settings: settings(.standard)), .allow)
        XCTAssertTrue(isConfirm(PermissionPolicy.evaluate(openApp, settings: settings(.cautious))))
    }

    func testDisabledFeaturesAreDenied() {
        XCTAssertTrue(isDeny(PermissionPolicy.evaluate(definition(.read, feature: .calendar), settings: settings(.standard) { $0.features.calendar = false })))
        // Shortcuts are off by default.
        XCTAssertTrue(isDeny(PermissionPolicy.evaluate(definition(.sensitive, feature: .shortcuts), settings: settings(.autonomous))))
        XCTAssertTrue(isDeny(PermissionPolicy.evaluate(definition(.appWrite, feature: .memory), settings: settings(.standard) { $0.features.memory = false })))
    }

    func testMemorySavingNeedsApprovalByDefault() {
        let save = definition(.appWrite, feature: .memory)
        XCTAssertTrue(isConfirm(PermissionPolicy.evaluate(save, settings: settings(.autonomous))))
        XCTAssertEqual(PermissionPolicy.evaluate(save, settings: settings(.standard) { $0.agent.askBeforeSavingMemory = false }), .allow)
    }

    func testRedactorMasksSecrets() {
        let text = "x-api-key: sk-ant-api03-abcdefghijklmnop and Bearer abcdefghijklmnopqrstuv and sk-proj-ABCDEFGHIJKLMNOPQRST"
        let redacted = Redactor.redact(text)
        XCTAssertFalse(redacted.contains("abcdefghijklmnop"))
        XCTAssertFalse(redacted.contains("ABCDEFGHIJKLMNOPQRST"))
        XCTAssertTrue(redacted.contains("[REDACTED]"))
    }
}
