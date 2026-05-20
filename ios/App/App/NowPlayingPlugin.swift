import Foundation
import Capacitor
import AVFoundation
import MediaPlayer
import UIKit
import WebKit

/**
 * NowPlayingPlugin
 *
 * Custom Capacitor plugin to drive the iOS lockscreen / Control Center
 * "Now Playing" widget. Handles ONLY:
 *  - AVAudioSession activation (.playback) so HTML5 <audio> keeps playing in
 *    background and lockscreen controls are routed to this app.
 *  - MPRemoteCommandCenter handlers for play / pause / next / previous / seek.
 *    These ONLY forward the command to JS via emitRemoteCommand — they do NOT
 *    control playback natively.
 *  - MPNowPlayingInfoCenter metadata + artwork (uses AppIcon from the bundle).
 *
 * IMPORTANT: this plugin is auto-registered by Capacitor as long as the .swift
 * file is added to the iOS App target in Xcode. After `npx cap sync` make sure
 * Xcode shows this file in App > App. Also enable Background Modes -> Audio,
 * AirPlay, and Picture in Picture in the Signing & Capabilities tab.
 */
@objc(NowPlayingPlugin)
public class NowPlayingPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "NowPlayingPlugin"
    public let jsName = "NowPlayingPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "activate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setNowPlaying", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updatePlayback", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
    ]

    private var commandsRegistered = false
    private var cachedArtwork: MPMediaItemArtwork?
    private var commandSequence = 0

    // MARK: - Lifecycle

    override public func load() {
        configureAudioSession()
        registerCommands()
        prepareArtwork()
    }

    // MARK: - JS API

    @objc func activate(_ call: CAPPluginCall) {
        configureAudioSession()
        registerCommands()
        call.resolve()
    }

    @objc func setNowPlaying(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? ""
        let artist = call.getString("artist") ?? ""
        let album = call.getString("album") ?? ""
        let duration = call.getDouble("duration") ?? 0
        let elapsed = call.getDouble("elapsed") ?? 0
        let isPlaying = call.getBool("isPlaying") ?? false

        var info: [String: Any] = [:]
        info[MPMediaItemPropertyTitle] = title
        info[MPMediaItemPropertyArtist] = artist
        info[MPMediaItemPropertyAlbumTitle] = album
        info[MPMediaItemPropertyPlaybackDuration] = duration
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0

        if let art = cachedArtwork ?? buildArtwork() {
            cachedArtwork = art
            info[MPMediaItemPropertyArtwork] = art
        }

        MPNowPlayingInfoCenter.default().nowPlayingInfo = info

        do {
            try AVAudioSession.sharedInstance().setActive(true, options: [])
        } catch {
            // ignore
        }

        call.resolve()
    }

    @objc func updatePlayback(_ call: CAPPluginCall) {
        let elapsed = call.getDouble("elapsed") ?? 0
        let isPlaying = call.getBool("isPlaying") ?? false

        var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info

        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        call.resolve()
    }

    // MARK: - Private helpers

    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true, options: [])
        } catch {
            print("NowPlayingPlugin: AVAudioSession error: \(error)")
        }
    }

    private func registerCommands() {
        if commandsRegistered { return }
        commandsRegistered = true

        let center = MPRemoteCommandCenter.shared()

        center.playCommand.isEnabled = true
        center.playCommand.addTarget { [weak self] _ in
            self?.emitRemoteCommand(action: "play")
            return .success
        }

        center.pauseCommand.isEnabled = true
        center.pauseCommand.addTarget { [weak self] _ in
            print("NowPlayingPlugin: pauseCommand received from lock screen")
            self?.pauseWebViewMediaPlayback(source: "pauseCommand")
            self?.emitRemoteCommand(action: "pause")
            return .success
        }

        center.togglePlayPauseCommand.isEnabled = true
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            print("NowPlayingPlugin: togglePlayPauseCommand received from lock screen")
            self?.pauseWebViewMediaPlayback(source: "togglePlayPauseCommand")
            self?.emitRemoteCommand(action: "toggle")
            return .success
        }

        center.nextTrackCommand.isEnabled = true
        center.nextTrackCommand.addTarget { [weak self] _ in
            self?.emitRemoteCommand(action: "next")
            return .success
        }

        center.previousTrackCommand.isEnabled = true
        center.previousTrackCommand.addTarget { [weak self] _ in
            self?.emitRemoteCommand(action: "previous")
            return .success
        }

        center.changePlaybackPositionCommand.isEnabled = true
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            self?.emitRemoteCommand(action: "seek", position: event.positionTime)
            return .success
        }

        center.skipForwardCommand.isEnabled = false
        center.skipBackwardCommand.isEnabled = false

        UIApplication.shared.beginReceivingRemoteControlEvents()
    }

    private func prepareArtwork() {
        cachedArtwork = buildArtwork()
    }

    private func pauseWebViewMediaPlayback(source: String) {
        DispatchQueue.main.async { [weak self] in
            print("NowPlayingPlugin: pauseWebViewMediaPlayback triggered by \(source)")

            guard let self = self else {
                print("NowPlayingPlugin: self is nil while handling \(source)")
                return
            }

            guard let bridge = self.bridge else {
                print("NowPlayingPlugin: bridge is nil while handling \(source)")
                self.deactivateAudioSession(reason: "bridge_missing_\(source)")
                return
            }

            print("NowPlayingPlugin: bridge.webView runtime type = \(String(describing: type(of: bridge.webView)))")

            guard let webView = bridge.webView as? WKWebView else {
                print("NowPlayingPlugin: bridge.webView is not WKWebView, falling back to AVAudioSession deactivation")
                self.deactivateAudioSession(reason: "webview_cast_failed_\(source)")
                return
            }

            if #available(iOS 15.0, *) {
                print("NowPlayingPlugin: calling pauseAllMediaPlayback for \(source)")
                webView.pauseAllMediaPlayback {
                    print("NowPlayingPlugin: pauseAllMediaPlayback completion fired for \(source)")
                    webView.setAllMediaPlaybackSuspended(true)
                    print("NowPlayingPlugin: setAllMediaPlaybackSuspended(true) applied for \(source)")
                    self.deactivateAudioSession(reason: "post_pause_completion_\(source)")
                }
            } else {
                print("NowPlayingPlugin: iOS < 15, cannot use pauseAllMediaPlayback; using AVAudioSession fallback")
                self.deactivateAudioSession(reason: "ios_unsupported_\(source)")
            }
        }
    }

    private func deactivateAudioSession(reason: String) {
        do {
            print("NowPlayingPlugin: attempting AVAudioSession.setActive(false) because \(reason)")
            try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
            print("NowPlayingPlugin: AVAudioSession.setActive(false) succeeded for \(reason)")
        } catch {
            print("NowPlayingPlugin: AVAudioSession.setActive(false) failed for \(reason): \(error)")
        }
    }

    private func emitRemoteCommand(action: String, position: Double? = nil) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.commandSequence += 1

            var payload: [String: Any] = [
                "action": action,
                "eventId": self.commandSequence
            ]

            if let position = position {
                payload["position"] = position
            }

            self.notifyListeners("remoteCommand", data: payload)

            guard let bridge = self.bridge,
                  let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
                  let json = String(data: data, encoding: .utf8) else {
                return
            }

            bridge.triggerDocumentJSEvent(eventName: "nowPlayingRemoteCommand", data: json)
        }
    }

    private func buildArtwork() -> MPMediaItemArtwork? {
        if let image = loadAppIconImage() {
            return MPMediaItemArtwork(boundsSize: image.size) { _ in image }
        }
        return nil
    }

    private func loadAppIconImage() -> UIImage? {
        if let icons = Bundle.main.infoDictionary?["CFBundleIcons"] as? [String: Any],
           let primary = icons["CFBundlePrimaryIcon"] as? [String: Any],
           let files = primary["CFBundleIconFiles"] as? [String],
           let last = files.last,
           let img = UIImage(named: last) {
            return img
        }
        if let img = UIImage(named: "AppIcon") { return img }
        if let img = UIImage(named: "AppIcon60x60") { return img }
        return nil
    }
}
