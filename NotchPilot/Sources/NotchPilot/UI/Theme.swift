import AppKit
import NotchPilotCore
import SwiftUI

/// Colours for the island. The island is black like the hardware notch;
/// everything in it uses macOS system colours and the user's accent colour,
/// so it reads as part of the system rather than a themed app.
struct Palette {
    var background: Color
    var surface: Color
    var surfaceHover: Color
    var stroke: Color
    var primary: Color
    var secondary: Color
    var tertiary: Color
    var accent: Color
    var success: Color
    var warning: Color
    var danger: Color
    var userBubble: Color
    var isDark: Bool

    /// Label opacities follow macOS's dark-appearance label colours.
    static let dark = Palette(
        background: .black,
        surface: Color.white.opacity(0.09),
        surfaceHover: Color.white.opacity(0.15),
        stroke: Color.white.opacity(0.1),
        primary: Color.white,
        secondary: Color(red: 0.92, green: 0.92, blue: 0.96).opacity(0.6),
        tertiary: Color(red: 0.92, green: 0.92, blue: 0.96).opacity(0.3),
        accent: .accentColor,
        success: .green,
        warning: .orange,
        danger: .red,
        userBubble: .accentColor,
        isDark: true
    )

    static let light = Palette(
        background: Color(nsColor: .windowBackgroundColor),
        surface: Color.black.opacity(0.05),
        surfaceHover: Color.black.opacity(0.09),
        stroke: Color.black.opacity(0.1),
        primary: Color.black.opacity(0.85),
        secondary: Color.black.opacity(0.5),
        tertiary: Color.black.opacity(0.25),
        accent: .accentColor,
        success: .green,
        warning: .orange,
        danger: .red,
        userBubble: .accentColor,
        isDark: false
    )
}

private struct PaletteKey: EnvironmentKey {
    static let defaultValue = Palette.dark
}

extension EnvironmentValues {
    var palette: Palette {
        get { self[PaletteKey.self] }
        set { self[PaletteKey.self] = newValue }
    }
}

/// The island outline: a rounded rectangle whose top corners curve outward
/// ("ears"), so it reads as part of the hardware notch.
struct NotchShape: Shape {
    var topRadius: CGFloat
    var bottomRadius: CGFloat

    var animatableData: AnimatablePair<CGFloat, CGFloat> {
        get { AnimatablePair(topRadius, bottomRadius) }
        set {
            topRadius = newValue.first
            bottomRadius = newValue.second
        }
    }

    func path(in rect: CGRect) -> Path {
        let ear = min(topRadius, rect.width / 4, rect.height / 2)
        let bottom = min(bottomRadius, (rect.width - ear * 2) / 2, rect.height - ear)
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addQuadCurve(to: CGPoint(x: rect.minX + ear, y: rect.minY + ear), control: CGPoint(x: rect.minX + ear, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.minX + ear, y: rect.maxY - bottom))
        path.addQuadCurve(to: CGPoint(x: rect.minX + ear + bottom, y: rect.maxY), control: CGPoint(x: rect.minX + ear, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX - ear - bottom, y: rect.maxY))
        path.addQuadCurve(to: CGPoint(x: rect.maxX - ear, y: rect.maxY - bottom), control: CGPoint(x: rect.maxX - ear, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX - ear, y: rect.minY + ear))
        path.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY), control: CGPoint(x: rect.maxX - ear, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

// MARK: - Components

/// Borderless toolbar-style icon button with a hover highlight.
struct IconButton: View {
    let symbol: String
    var help: String = ""
    var size: CGFloat = 13
    var isActive = false
    var tint: Color?
    let action: () -> Void
    @Environment(\.palette) private var palette
    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: size, weight: .regular))
                .foregroundStyle(tint ?? (isActive ? palette.primary : palette.secondary))
                .frame(width: size + 15, height: size + 11)
                .background(RoundedRectangle(cornerRadius: 6, style: .continuous).fill(isActive || hovering ? palette.surfaceHover : .clear))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help(help)
        .onHover { hovering = $0 }
        .accessibilityLabel(help.isEmpty ? symbol : help)
    }
}

struct Card<Content: View>: View {
    var padding: CGFloat = 12
    @ViewBuilder let content: () -> Content
    @Environment(\.palette) private var palette

    var body: some View {
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(palette.surface))
    }
}

struct SectionLabel: View {
    let title: String
    var symbol: String?
    @Environment(\.palette) private var palette

    var body: some View {
        HStack(spacing: 5) {
            if let symbol { Image(systemName: symbol).font(.system(size: 11)) }
            Text(title).font(.system(size: 11, weight: .semibold))
        }
        .foregroundStyle(palette.secondary)
    }
}

/// A standard macOS push button: bordered, or filled with the accent colour
/// (red when destructive) for the default action.
struct PanelButton: View {
    let title: String
    var symbol: String?
    var prominent = false
    var destructive = false
    let action: () -> Void

    var body: some View {
        if prominent {
            button.buttonStyle(.borderedProminent).tint(destructive ? Color.red : Color.accentColor)
        } else {
            button.buttonStyle(.bordered)
        }
    }

    private var button: some View {
        Button(role: destructive && !prominent ? .destructive : nil, action: action) {
            if let symbol {
                Label(title, systemImage: symbol).labelStyle(.titleAndIcon)
            } else {
                Text(title)
            }
        }
        .controlSize(.small)
    }
}

/// The assistant's glyph: SF Symbols' sparkles in the accent colour,
/// pulsing while it works.
struct AssistantGlyph: View {
    var size: CGFloat = 16
    var active = false
    var reduceMotion = false

    var body: some View {
        Image(systemName: "sparkles")
            .font(.system(size: size * 0.82, weight: .medium))
            .symbolRenderingMode(.hierarchical)
            .foregroundStyle(Color.accentColor)
            .symbolEffect(.pulse, isActive: active && !reduceMotion)
            .frame(width: size, height: size)
    }
}

// MARK: - Markdown

/// Renders the Markdown subset assistants use (paragraphs, lists, headings,
/// code blocks, inline emphasis/links) without a web view.
struct MarkdownText: View {
    let text: String
    var fontSize: CGFloat = 13
    @Environment(\.palette) private var palette

    private enum Block: Hashable {
        case paragraph(String)
        case bullet(String, level: Int)
        case numbered(String, String)
        case heading(String)
        case code(String)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(Self.parse(text).enumerated()), id: \.offset) { _, block in
                switch block {
                case .paragraph(let content):
                    Text(Self.inline(content)).font(.system(size: fontSize))
                case let .bullet(content, level):
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(level == 0 ? "•" : "◦").foregroundStyle(palette.secondary)
                        Text(Self.inline(content)).font(.system(size: fontSize))
                    }
                    .padding(.leading, CGFloat(level) * 12)
                case let .numbered(number, content):
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(number).monospacedDigit().foregroundStyle(palette.secondary)
                        Text(Self.inline(content)).font(.system(size: fontSize))
                    }
                case .heading(let content):
                    Text(Self.inline(content)).font(.system(size: fontSize + 1, weight: .semibold))
                case .code(let content):
                    Text(content)
                        .font(.system(size: fontSize - 1.5, design: .monospaced))
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 8).fill(palette.surface))
                }
            }
        }
        .foregroundStyle(palette.primary)
        .textSelection(.enabled)
        .fixedSize(horizontal: false, vertical: true)
    }

    private static func inline(_ text: String) -> AttributedString {
        (try? AttributedString(markdown: text, options: AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace))) ?? AttributedString(text)
    }

    private static func parse(_ text: String) -> [Block] {
        var blocks: [Block] = []
        var paragraph: [String] = []
        var code: [String]?

        func flush() {
            if !paragraph.isEmpty {
                blocks.append(.paragraph(paragraph.joined(separator: "\n")))
                paragraph.removeAll()
            }
        }

        for rawLine in text.components(separatedBy: "\n") {
            let line = rawLine.trimmingCharacters(in: .whitespaces)
            if line.hasPrefix("```") {
                if let current = code {
                    blocks.append(.code(current.joined(separator: "\n")))
                    code = nil
                } else {
                    flush()
                    code = []
                }
                continue
            }
            if code != nil {
                code?.append(rawLine)
                continue
            }
            if line.isEmpty {
                flush()
                continue
            }
            let indent = rawLine.prefix { $0 == " " }.count / 2
            if let marker = ["- ", "* ", "• "].first(where: { line.hasPrefix($0) }) {
                flush()
                blocks.append(.bullet(String(line.dropFirst(marker.count)), level: min(indent, 2)))
            } else if let match = line.range(of: #"^\d{1,2}[.)] "#, options: .regularExpression) {
                flush()
                blocks.append(.numbered(String(line[match]).trimmingCharacters(in: .whitespaces), String(line[match.upperBound...])))
            } else if line.hasPrefix("#") {
                flush()
                blocks.append(.heading(line.drop { $0 == "#" }.trimmingCharacters(in: .whitespaces)))
            } else {
                paragraph.append(line)
            }
        }
        if let code { blocks.append(.code(code.joined(separator: "\n"))) }
        flush()
        return blocks
    }
}

// MARK: - Formatting helpers

enum Formatters {
    static func countdown(_ seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds.rounded(.up)))
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let secs = total % 60
        return hours > 0 ? String(format: "%d:%02d:%02d", hours, minutes, secs) : String(format: "%d:%02d", minutes, secs)
    }

    static func time(_ date: Date) -> String {
        date.formatted(date: .omitted, time: .shortened)
    }

    static func due(_ task: TaskItem, now: Date = Date()) -> String? {
        guard let due = task.dueDate else { return nil }
        let calendar = Calendar.current
        let day: String
        if calendar.isDateInToday(due) { day = "Today" }
        else if calendar.isDateInTomorrow(due) { day = "Tomorrow" }
        else if calendar.isDateInYesterday(due) { day = "Yesterday" }
        else { day = due.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated)) }
        return task.dueHasTime ? "\(day) \(time(due))" : day
    }
}

extension TaskPriority {
    func color(_ palette: Palette) -> Color {
        switch self {
        case .high: return palette.danger
        case .medium: return palette.warning
        case .low: return palette.tertiary
        }
    }
}

extension ActionRecord.Status {
    var symbol: String {
        switch self {
        case .running: return "circle.dotted"
        case .succeeded: return "checkmark.circle.fill"
        case .failed: return "exclamationmark.triangle.fill"
        case .denied: return "nosign"
        case .declined: return "hand.raised.fill"
        case .cancelled: return "stop.circle"
        case .skipped: return "forward.circle"
        }
    }

    func color(_ palette: Palette) -> Color {
        switch self {
        case .running: return palette.accent
        case .succeeded: return palette.success
        case .failed, .denied: return palette.danger
        case .declined, .cancelled, .skipped: return palette.secondary
        }
    }
}
