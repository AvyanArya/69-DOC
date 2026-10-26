import NotchPilotCore
import SwiftUI

/// The island: black when collapsed (merging with the camera housing),
/// expanding with a spring into the full panel.
struct NotchRootView: View {
    @Bindable var model: AppModel
    @Environment(\.colorScheme) private var systemScheme

    private var palette: Palette {
        switch model.settings.appearance.theme {
        case .dark: return .dark
        case .system: return systemScheme == .dark ? .dark : .light
        }
    }

    var body: some View {
        let expanded = model.isExpanded
        let size = model.shapeSize
        let shape = NotchShape(
            topRadius: NotchLayout.earRadius(expanded: expanded),
            bottomRadius: NotchLayout.bottomRadius(expanded: expanded, height: size.height)
        )
        VStack(spacing: 0) {
            ZStack(alignment: .top) {
                shape
                    .fill(expanded ? palette.background : Color.black)
                    .shadow(color: .black.opacity(expanded ? 0.5 : 0), radius: 16, y: 6)
                Group {
                    if expanded {
                        ExpandedView(model: model)
                            .transition(.opacity.combined(with: .scale(scale: 0.97, anchor: .top)))
                    } else {
                        CollapsedView(model: model)
                            .transition(.opacity)
                    }
                }
                .padding(.horizontal, NotchLayout.earRadius(expanded: expanded))
                .clipShape(shape)
            }
            .frame(width: size.width, height: size.height)
            .overlay(alignment: .bottom) {
                if expanded, let toast = model.toast {
                    ToastView(text: toast)
                        .padding(.bottom, 14)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .environment(\.palette, palette)
        .environment(\.colorScheme, palette.isDark ? .dark : .light)
        .animation(model.animation, value: model.shapeSize)
        .animation(model.animation, value: model.liveActivity)
    }
}

struct ToastView: View {
    let text: String
    @Environment(\.palette) private var palette

    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(palette.primary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Capsule().fill(palette.isDark ? Color(white: 0.17) : Color.white).shadow(color: .black.opacity(0.2), radius: 8, y: 3))
            .padding(.horizontal, 24)
    }
}

// MARK: - Collapsed

struct CollapsedView: View {
    @Bindable var model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                if model.liveActivity != .none {
                    leading
                        .frame(width: NotchLayout.wing, alignment: .leading)
                        .padding(.leading, 12)
                }
                Spacer(minLength: 0)
                if !model.notch.hasNotch && model.liveActivity == .none {
                    AssistantGlyph(size: 14, reduceMotion: model.reduceMotion)
                }
                Spacer(minLength: 0)
                if model.liveActivity != .none {
                    trailing
                        .frame(width: NotchLayout.wing, alignment: .trailing)
                        .padding(.trailing, 12)
                }
            }
            .frame(height: model.notch.size.height + (model.isPeeking ? NotchLayout.peekGrowth.height : 0))
            if let preview = model.collapsedPreview {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Palette.dark.success)
                    Text(preview).lineLimit(1)
                }
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.85))
                .padding(.horizontal, 18)
                .frame(height: NotchLayout.previewHeight)
            }
        }
        .foregroundStyle(.white)
        .contentShape(Rectangle())
        .onTapGesture {
            model.expand(focusComposer: model.liveActivity != .timer && model.liveActivity != .media, tab: tabForTap)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("NotchPilot")
        .accessibilityHint("Opens the assistant panel")
        .accessibilityAddTraits(.isButton)
    }

    private var tabForTap: PanelTab {
        switch model.liveActivity {
        case .timer, .media: return .today
        case .working, .needsApproval, .done: return .assistant
        case .none: return model.selectedTab
        }
    }

    @ViewBuilder private var leading: some View {
        switch model.liveActivity {
        case .working:
            AssistantGlyph(size: 16, active: true, reduceMotion: model.reduceMotion)
        case .needsApproval:
            Image(systemName: "hand.raised.fill").foregroundStyle(Palette.dark.warning).font(.system(size: 13, weight: .semibold))
        case .done:
            Image(systemName: "checkmark.circle.fill").foregroundStyle(Palette.dark.success).font(.system(size: 14, weight: .semibold))
        case .timer:
            TimerRing(timer: model.services.timer, size: 16, lineWidth: 2.5)
        case .media:
            ArtworkView(image: model.media.artwork, size: 20, corner: 5)
        case .none:
            EmptyView()
        }
    }

    @ViewBuilder private var trailing: some View {
        switch model.liveActivity {
        case .working:
            Text(stepLabel).font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.75))
        case .needsApproval:
            Text("Approve?").font(.system(size: 11, weight: .semibold)).foregroundStyle(Palette.dark.warning)
        case .done:
            Text("Done").font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.75))
        case .timer:
            TimelineView(.periodic(from: .now, by: 1)) { context in
                Text(Formatters.countdown(model.services.timer.remaining(at: context.date)))
                    .font(.system(size: 12, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(model.services.timer.state.phase == .paused ? .white.opacity(0.5) : .white)
            }
        case .media:
            EqualizerBars(active: model.media.nowPlaying?.isPlaying == true && !model.reduceMotion)
        case .none:
            EmptyView()
        }
    }

    private var stepLabel: String {
        guard let run = model.orchestrator.currentRun else { return "Working" }
        if !run.plan.isEmpty {
            let done = run.plan.filter { $0.status == .done }.count
            return "\(done)/\(run.plan.count)"
        }
        return run.toolCalls > 0 ? "Step \(run.toolCalls)" : "Thinking"
    }
}

struct TimerRing: View {
    let timer: FocusTimer
    var size: CGFloat = 16
    var lineWidth: CGFloat = 2.5

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            ZStack {
                Circle().stroke(Color.white.opacity(0.18), lineWidth: lineWidth)
                Circle()
                    .trim(from: 0, to: max(0.001, 1 - timer.progress(at: context.date)))
                    .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
        }
        .frame(width: size, height: size)
    }

    private var color: Color {
        switch timer.state.kind {
        case .focus: return .orange
        case .shortBreak: return .green
        case .custom: return .accentColor
        }
    }
}

struct ArtworkView: View {
    let image: NSImage?
    var size: CGFloat = 20
    var corner: CGFloat = 5

    var body: some View {
        Group {
            if let image {
                Image(nsImage: image).resizable().aspectRatio(contentMode: .fill)
            } else {
                ZStack {
                    LinearGradient(colors: [Color(white: 0.25), Color(white: 0.12)], startPoint: .top, endPoint: .bottom)
                    Image(systemName: "music.note").font(.system(size: size * 0.45)).foregroundStyle(.white.opacity(0.7))
                }
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
    }
}

struct EqualizerBars: View {
    let active: Bool
    @State private var phase = false
    private let high: [CGFloat] = [10, 6, 12, 8]
    private let low: [CGFloat] = [5, 11, 6, 10]

    var body: some View {
        HStack(alignment: .bottom, spacing: 2) {
            ForEach(0..<4, id: \.self) { index in
                Capsule()
                    .fill(Color.white.opacity(0.9))
                    .frame(width: 3, height: active ? (phase ? high[index] : low[index]) : 4)
            }
        }
        .frame(height: 12)
        .onAppear { animate() }
        .onChange(of: active) { _, _ in animate() }
    }

    private func animate() {
        guard active else { return }
        withAnimation(.easeInOut(duration: 0.45).repeatForever(autoreverses: true)) { phase.toggle() }
    }
}

// MARK: - Expanded

struct ExpandedView: View {
    @Bindable var model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        VStack(spacing: 0) {
            header
            Group {
                switch model.selectedTab {
                case .assistant: AssistantView(model: model)
                case .today: TodayView(model: model)
                case .tasks: TasksView(model: model)
                case .notes: NotesView(model: model)
                case .activity: ActivityView(model: model)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .padding(.horizontal, 14)
            .padding(.bottom, 14)
            .padding(.top, 4)
        }
    }

    private var header: some View {
        HStack(spacing: 0) {
            HStack(spacing: 2) {
                ForEach(PanelTab.allCases) { tab in
                    IconButton(symbol: tab.symbol, help: tab.title, size: 12, isActive: model.selectedTab == tab) {
                        model.select(tab)
                    }
                }
            }
            .padding(.leading, 8)
            Spacer(minLength: 8)
            if model.notch.hasNotch {
                Color.clear.frame(width: model.notch.size.width)
            } else {
                Text(model.selectedTab.title)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(palette.secondary)
            }
            Spacer(minLength: 8)
            HStack(spacing: 2) {
                if model.selectedTab == .assistant {
                    IconButton(symbol: "clock", help: "Conversation history", isActive: model.showingHistory) {
                        withAnimation(model.animation) { model.showingHistory.toggle() }
                    }
                    IconButton(symbol: "square.and.pencil", help: "New conversation (⌘N)") { model.newConversation() }
                }
                IconButton(symbol: model.isPinned ? "pin.fill" : "pin", help: model.isPinned ? "Unpin (collapse automatically)" : "Keep open", isActive: model.isPinned) {
                    model.isPinned.toggle()
                }
                IconButton(symbol: "gearshape", help: "Settings (⌘,)") { model.openSettings(.general) }
            }
            .padding(.trailing, 8)
        }
        .frame(height: max(30, model.notch.size.height))
    }
}
