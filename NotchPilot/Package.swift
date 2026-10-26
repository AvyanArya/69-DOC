// swift-tools-version:5.10
import PackageDescription

// NotchPilot is split into a platform-independent core (agent, providers, tools,
// persistence, timers) and a macOS app target (notch window, SwiftUI, EventKit,
// Keychain, media integrations). The core and its tests build on Linux as well,
// which keeps the agent logic verifiable without a Mac.

var products: [Product] = [
    .library(name: "NotchPilotCore", targets: ["NotchPilotCore"]),
    .executable(name: "notchpilot-cli", targets: ["NotchPilotCLI"]),
]

var targets: [Target] = [
    .target(
        name: "NotchPilotCore",
        path: "Sources/NotchPilotCore"
    ),
    .executableTarget(
        name: "NotchPilotCLI",
        dependencies: ["NotchPilotCore"],
        path: "Sources/NotchPilotCLI"
    ),
    .testTarget(
        name: "NotchPilotCoreTests",
        dependencies: ["NotchPilotCore"],
        path: "Tests/NotchPilotCoreTests",
        exclude: ["Fixtures"]
    ),
]

#if os(macOS)
products.append(.executable(name: "NotchPilot", targets: ["NotchPilot"]))
targets.append(
    .executableTarget(
        name: "NotchPilot",
        dependencies: ["NotchPilotCore"],
        path: "Sources/NotchPilot",
        linkerSettings: [
            .linkedFramework("AppKit"),
            .linkedFramework("SwiftUI"),
            .linkedFramework("EventKit"),
            .linkedFramework("IOKit"),
            .linkedFramework("Carbon"),
            .linkedFramework("ServiceManagement"),
            .linkedFramework("UserNotifications"),
            .linkedFramework("PDFKit"),
            .linkedFramework("Security"),
        ]
    )
)
#endif

let package = Package(
    name: "NotchPilot",
    platforms: [.macOS(.v14)],
    products: products,
    targets: targets
)
