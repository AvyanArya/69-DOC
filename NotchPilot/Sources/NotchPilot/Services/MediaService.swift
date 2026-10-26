import AppKit
import Foundation
import NotchPilotCore
import Observation

/// Now-playing information and playback control for Apple Music and Spotify.
///
/// Track changes arrive through the players' public distributed notifications
/// (no polling, no permissions). Controls and artwork use AppleScript, which
/// macOS gates behind a one-time Automation prompt per player. A player that is
/// not running is never launched just to read its state.
@MainActor
@Observable
final class MediaService: MediaController {
    struct Player {
        let name: String
        let bundleID: String
        let notification: String
        let key: String
    }

    static let music = Player(name: "Music", bundleID: "com.apple.Music", notification: "com.apple.Music.playerInfo", key: "music")
    static let spotify = Player(name: "Spotify", bundleID: "com.spotify.client", notification: "com.spotify.client.PlaybackStateChanged", key: "spotify")
    static let players = [music, spotify]

    private(set) var nowPlaying: NowPlayingInfo?
    private(set) var artwork: NSImage?
    var supportedPlayers: [String] { Self.players.map(\.name) }
    /// Mirrors the Media feature toggle; when off nothing is observed or queried.
    var isEnabled = true {
        didSet {
            if !isEnabled {
                nowPlaying = nil
                artwork = nil
            }
        }
    }

    @ObservationIgnored private var observers: [NSObjectProtocol] = []
    @ObservationIgnored private var artworkKey = ""

    init() {
        let center = DistributedNotificationCenter.default()
        for player in Self.players {
            let token = center.addObserver(forName: Notification.Name(player.notification), object: nil, queue: .main) { [weak self] note in
                let info = note.userInfo ?? [:]
                let state = info["Player State"] as? String ?? ""
                let name = info["Name"] as? String ?? ""
                let artist = info["Artist"] as? String ?? ""
                let album = info["Album"] as? String ?? ""
                let durationMS = (info["Total Time"] as? Double) ?? (info["Duration"] as? Double)
                MainActor.assumeIsolated {
                    self?.handle(player: player, state: state, title: name, artist: artist, album: album, durationMS: durationMS)
                }
            }
            observers.append(token)
        }
    }

    private func handle(player: Player, state: String, title: String, artist: String, album: String, durationMS: Double?) {
        guard isEnabled else { return }
        if state == "Stopped" || title.isEmpty {
            if nowPlaying?.player == player.name {
                nowPlaying = nil
                artwork = nil
            }
            return
        }
        let duration = durationMS.map { $0 > 10_000 ? $0 / 1000 : $0 }
        nowPlaying = NowPlayingInfo(player: player.name, title: title, artist: artist, album: album, isPlaying: state == "Playing", duration: duration)
        loadArtwork(for: player, key: "\(player.name)|\(title)|\(artist)")
    }

    private func isRunning(_ player: Player) -> Bool {
        !NSRunningApplication.runningApplications(withBundleIdentifier: player.bundleID).isEmpty
    }

    /// Reads the current state from running players (never launches one).
    func refresh() async -> NowPlayingInfo? {
        guard isEnabled else { return nil }
        for player in Self.players where isRunning(player) {
            let script = """
            tell application "\(player.name)"
                if player state is stopped then return "STOPPED"
                set t to current track
                return (player state as text) & "\\n" & (name of t) & "\\n" & (artist of t) & "\\n" & (album of t) & "\\n" & (duration of t)
            end tell
            """
            guard let output = try? await AppleScript.run(script), output != "STOPPED" else { continue }
            let lines = output.components(separatedBy: "\n")
            guard lines.count >= 5 else { continue }
            let rawDuration = Double(lines[4].replacingOccurrences(of: ",", with: ".")) ?? 0
            let duration = rawDuration > 10_000 ? rawDuration / 1000 : rawDuration
            nowPlaying = NowPlayingInfo(player: player.name, title: lines[1], artist: lines[2], album: lines[3], isPlaying: lines[0] == "playing", duration: duration)
            loadArtwork(for: player, key: "\(player.name)|\(lines[1])|\(lines[2])")
            if lines[0] == "playing" { break }
        }
        return nowPlaying
    }

    func perform(_ action: MediaAction, player requested: String?) async throws -> NowPlayingInfo? {
        guard isEnabled else { throw ToolError.unsupported("Media control is turned off in Settings.") }
        let player: Player
        if let requested, let match = Self.players.first(where: { $0.key == requested.lowercased() || $0.name.lowercased() == requested.lowercased() }) {
            player = match
        } else if let current = nowPlaying, let match = Self.players.first(where: { $0.name == current.player }) {
            player = match
        } else {
            player = Self.players.first(where: isRunning) ?? Self.music
        }
        let command: String
        switch action {
        case .play: command = "play"
        case .pause: command = "pause"
        case .toggle: command = "playpause"
        case .next: command = "next track"
        case .previous: command = "previous track"
        }
        _ = try await AppleScript.run("tell application \"\(player.name)\" to \(command)", timeout: 15)
        try? await Task.sleep(nanoseconds: 400_000_000)
        return await refresh()
    }

    private func loadArtwork(for player: Player, key: String) {
        guard key != artworkKey else { return }
        artworkKey = key
        artwork = nil
        Task { [weak self] in
            let image: NSImage?
            if player.name == "Spotify" {
                image = await Self.spotifyArtwork()
            } else {
                image = await Self.musicArtwork()
            }
            guard let self, self.artworkKey == key else { return }
            self.artwork = image
            if var info = self.nowPlaying, let image, let tiff = image.tiffRepresentation {
                info.artwork = tiff
                self.nowPlaying = info
            }
        }
    }

    private static func musicArtwork() async -> NSImage? {
        let script = """
        tell application "Music"
            if (count of artworks of current track) is 0 then return ""
            return data of artwork 1 of current track
        end tell
        """
        guard let output = try? await AppleScript.run(script, timeout: 8), let data = AppleScript.decodeRawData(output) else { return nil }
        return NSImage(data: data)
    }

    private static func spotifyArtwork() async -> NSImage? {
        guard let raw = try? await AppleScript.run("tell application \"Spotify\" to return artwork url of current track"),
              let url = URL(string: raw), url.scheme == "https" else { return nil }
        guard let (data, _) = try? await URLSession.shared.data(from: url) else { return nil }
        return NSImage(data: data)
    }
}
