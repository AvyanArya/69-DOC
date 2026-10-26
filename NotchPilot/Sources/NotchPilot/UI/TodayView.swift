import NotchPilotCore
import SwiftUI

struct TodayView: View {
    @Bindable var model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline) {
                    Text(Date().formatted(.dateTime.weekday(.wide).day().month(.wide)))
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(palette.primary)
                    Spacer()
                    if model.isProviderConfigured {
                        PanelButton(title: "Brief me", symbol: "sparkles", prominent: true) {
                            model.ask("Summarise my day and tell me what I need to prioritise.")
                        }
                    }
                }
                HStack(alignment: .top, spacing: 10) {
                    TimerCard(model: model)
                    MediaCard(model: model)
                }
                EventsCard(model: model)
                DueTasksCard(model: model)
                SystemStrip(model: model)
            }
            .padding(.vertical, 6)
        }
    }
}

struct TimerCard: View {
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        let timer = model.services.timer
        let prefs = model.services.settings.preferences
        Card {
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel(title: timer.isActive ? timer.state.kind.displayName : "Timer", symbol: "timer")
                if timer.isActive {
                    HStack(spacing: 12) {
                        TimerRing(timer: timer, size: 44, lineWidth: 5)
                        VStack(alignment: .leading, spacing: 2) {
                            TimelineView(.periodic(from: .now, by: 1)) { context in
                                Text(Formatters.countdown(timer.remaining(at: context.date)))
                                    .font(.system(size: 24, weight: .semibold, design: .rounded))
                                    .monospacedDigit()
                                    .foregroundStyle(palette.primary)
                            }
                            Text(timer.state.label).font(.system(size: 12)).foregroundStyle(palette.secondary).lineLimit(1)
                        }
                    }
                    HStack(spacing: 6) {
                        if timer.state.phase == .running {
                            PanelButton(title: "Pause", symbol: "pause.fill") { _ = try? timer.pause() }
                        } else {
                            PanelButton(title: "Resume", symbol: "play.fill", prominent: true) { _ = try? timer.resume() }
                        }
                        PanelButton(title: "+5", symbol: nil) { _ = try? timer.extend(by: 300) }
                        PanelButton(title: "Reset", symbol: nil) { _ = timer.reset() }
                    }
                } else {
                    if timer.state.phase == .finished {
                        Text("\(timer.state.label) finished").font(.system(size: 12)).foregroundStyle(palette.secondary)
                    } else {
                        Text("\(timer.focusSessionsCompleted(on: Date())) focus sessions today")
                            .font(.system(size: 12))
                            .foregroundStyle(palette.secondary)
                    }
                    HStack(spacing: 6) {
                        PanelButton(title: "Focus \(prefs.defaultFocusMinutes)", symbol: "brain.head.profile", prominent: true) {
                            model.startTimer(minutes: prefs.defaultFocusMinutes, kind: .focus, label: "Focus")
                        }
                        PanelButton(title: "Break \(prefs.defaultBreakMinutes)", symbol: "cup.and.saucer") {
                            model.startTimer(minutes: prefs.defaultBreakMinutes, kind: .shortBreak, label: "Break")
                        }
                    }
                    Menu("Custom") {
                        ForEach([10, 15, 30, 45, 60, 90], id: \.self) { minutes in
                            Button("\(minutes) minutes") { model.startTimer(minutes: minutes, kind: .custom, label: "\(minutes)-minute timer") }
                        }
                    }
                    .menuStyle(.button)
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(palette.secondary)
                    .fixedSize()
                }
            }
        }
    }
}

struct MediaCard: View {
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel(title: model.media.nowPlaying?.player ?? "Now playing", symbol: "music.note")
                if !model.settings.features.media {
                    Text("Media integration is off.").font(.system(size: 12)).foregroundStyle(palette.secondary)
                } else if let playing = model.media.nowPlaying {
                    HStack(spacing: 10) {
                        ArtworkView(image: model.media.artwork, size: 44, corner: 8)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(playing.title).font(.system(size: 13, weight: .semibold)).foregroundStyle(palette.primary).lineLimit(1)
                            Text(playing.artist).font(.system(size: 12)).foregroundStyle(palette.secondary).lineLimit(1)
                        }
                    }
                    HStack(spacing: 4) {
                        IconButton(symbol: "backward.fill", help: "Previous") { control(.previous) }
                        IconButton(symbol: playing.isPlaying ? "pause.fill" : "play.fill", help: playing.isPlaying ? "Pause" : "Play", size: 14) { control(.toggle) }
                        IconButton(symbol: "forward.fill", help: "Next") { control(.next) }
                    }
                } else {
                    Text("Nothing playing in Music or Spotify.").font(.system(size: 12)).foregroundStyle(palette.secondary)
                    PanelButton(title: "Play Music", symbol: "play.fill") { control(.play) }
                }
            }
        }
        .task { _ = await model.media.refresh() }
    }

    private func control(_ action: MediaAction) {
        Task {
            do {
                _ = try await model.media.perform(action, player: nil)
            } catch {
                model.showToast(error.localizedDescription)
            }
        }
    }
}

struct EventsCard: View {
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(title: "Up next", symbol: "calendar")
                if !model.settings.features.calendar {
                    Text("Calendar integration is off in Settings.").font(.system(size: 12)).foregroundStyle(palette.secondary)
                } else {
                    switch model.calendarAuthorization {
                    case .authorized:
                        if model.upcomingEvents.isEmpty {
                            Text("Nothing else on your calendar today.").font(.system(size: 12)).foregroundStyle(palette.secondary)
                        }
                        ForEach(model.upcomingEvents.prefix(4), id: \.id) { event in
                            HStack(spacing: 10) {
                                RoundedRectangle(cornerRadius: 2).fill(palette.accent).frame(width: 3, height: 26)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(event.title).font(.system(size: 13, weight: .medium)).foregroundStyle(palette.primary).lineLimit(1)
                                    Text(event.isAllDay ? "All day" : "\(Formatters.time(event.start)) – \(Formatters.time(event.end))\(event.location.map { " · \($0)" } ?? "")")
                                        .font(.system(size: 11))
                                        .foregroundStyle(palette.secondary)
                                        .lineLimit(1)
                                }
                            }
                        }
                    case .notDetermined:
                        HStack {
                            Text("Show your events here and let the assistant plan around them.")
                                .font(.system(size: 12))
                                .foregroundStyle(palette.secondary)
                            Spacer()
                            PanelButton(title: "Connect Calendar", symbol: "calendar.badge.plus") {
                                Task { await model.requestCalendarAccess() }
                            }
                        }
                    default:
                        HStack {
                            Text("Calendar access is \(model.calendarAuthorization.displayName.lowercased()).")
                                .font(.system(size: 12))
                                .foregroundStyle(palette.secondary)
                            Spacer()
                            PanelButton(title: "Open Privacy Settings", symbol: nil) {
                                SystemSettingsLink.open(.calendars)
                            }
                        }
                    }
                }
            }
        }
    }
}

struct DueTasksCard: View {
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        let now = Date()
        let tasks = model.services.tasks.openTasks.filter { task in
            task.isOverdue(at: now) || task.isDue(on: now) || task.priority == .high
        }
        Card {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    SectionLabel(title: "Focus list", symbol: "checklist")
                    Spacer()
                    Button("All tasks") { model.select(.tasks) }
                        .buttonStyle(.plain)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.accent)
                }
                if tasks.isEmpty {
                    Text("Nothing due today. Add tasks in the Tasks tab or ask the assistant.")
                        .font(.system(size: 12))
                        .foregroundStyle(palette.secondary)
                }
                ForEach(tasks.prefix(5)) { task in
                    TaskRow(task: task, model: model, compact: true)
                }
            }
        }
    }
}

struct SystemStrip: View {
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        TimelineView(.periodic(from: .now, by: 30)) { _ in
            let system = model.services.system
            let snapshot = system.snapshot()
            HStack(spacing: 14) {
                if let battery = system.battery() {
                    Label("\(battery.percentage)%\(battery.isCharging ? " · charging" : "")", systemImage: battery.isCharging ? "battery.100.bolt" : batterySymbol(battery.percentage))
                }
                if let used = snapshot.memoryUsedBytes {
                    Label(String(format: "%.1f / %.0f GB", Double(used) / 1_073_741_824, Double(snapshot.physicalMemoryBytes) / 1_073_741_824), systemImage: "memorychip")
                }
                if let free = snapshot.diskFreeBytes {
                    Label(String(format: "%.0f GB free", Double(free) / 1_000_000_000), systemImage: "internaldrive")
                }
                Spacer()
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(palette.tertiary)
            .padding(.horizontal, 4)
        }
    }

    private func batterySymbol(_ percentage: Int) -> String {
        switch percentage {
        case ..<13: return "battery.0"
        case ..<38: return "battery.25"
        case ..<63: return "battery.50"
        case ..<88: return "battery.75"
        default: return "battery.100"
        }
    }
}

enum SystemSettingsLink {
    enum Pane: String {
        case calendars = "Privacy_Calendars"
        case reminders = "Privacy_Reminders"
        case automation = "Privacy_Automation"
        case notifications = "notifications"
    }

    static func open(_ pane: Pane) {
        let url: URL?
        if pane == .notifications {
            url = URL(string: "x-apple.systempreferences:com.apple.preference.notifications")
        } else {
            url = URL(string: "x-apple.systempreferences:com.apple.preference.security?\(pane.rawValue)")
        }
        if let url { NSWorkspace.shared.open(url) }
    }
}
