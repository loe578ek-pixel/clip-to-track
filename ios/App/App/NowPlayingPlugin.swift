import Foundation
import Capacitor
import AVFoundation
import MediaPlayer
import UIKit

/**
 * NowPlayingPlugin
 *
 * Custom Capacitor plugin to drive the iOS lockscreen / Control Center
 * "Now Playing" widget. Handles:
 *  - AVAudioSession activation (.playback) so audio keeps playing in background
 *    and lockscreen controls are routed to this app.
 *  - MPRemoteCommandCenter handlers for play / pause / next / previous / seek.
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

        // Make sure session is active so lockscreen shows our app
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
            self?.nativePlayAudio()
            self?.emitRemoteCommand(action: "play")
            return .success
        }

        center.pauseCommand.isEnabled = true
        center.pauseCommand.addTarget { [weak self] _ in
            self?.nativePauseAudio()
            self?.emitRemoteCommand(action: "pause")
            return .success
        }

        center.togglePlayPauseCommand.isEnabled = true
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            self?.nativeToggleAudio()
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

        // Disable +10/-10 so iOS shows previous/next instead
        center.skipForwardCommand.isEnabled = false
        center.skipBackwardCommand.isEnabled = false

        UIApplication.shared.beginReceivingRemoteControlEvents()
    }

    private func prepareArtwork() {
        cachedArtwork = buildArtwork()
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

    // MARK: - Native audio control (works even when JS event loop is throttled in background)

    /// Pauses the HTML5 <audio> element directly via WKWebView, then deactivates
    /// AVAudioSession. This guarantees the audio actually stops on lockscreen
    /// pause, even if the JS callback is delayed by background throttling.
    private func nativePauseAudio() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            // 1) Try the JS path first (works when app is foreground / WebView is awake)
            let js = """
            (function(){
              try {
                var els = document.querySelectorAll('audio');
                for (var i = 0; i < els.length; i++) { try { els[i].pause(); } catch(e){} }
              } catch(e){}
            })();
            """
            self.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)

            // 2) HARD STOP: deactivate AVAudioSession. iOS treats this like an
            //    audio interruption (e.g. incoming call) and the WKWebView's
            //    HTML5 <audio> element is paused by the system itself, even if
            //    the JS event loop is frozen in background. This is what makes
            //    the lockscreen pause button actually stop the sound.
            do {
                try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
            } catch {
                // ignore
            }

            // Reflect paused state in lockscreen UI immediately
            var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
            info[MPNowPlayingInfoPropertyPlaybackRate] = 0.0
            MPNowPlayingInfoCenter.default().nowPlayingInfo = info
        }
    }

    /// Resumes the HTML5 <audio> element directly via WKWebView, after making
    /// sure AVAudioSession is active so audio is actually routed.
    private func nativePlayAudio() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            do {
                try AVAudioSession.sharedInstance().setActive(true, options: [])
            } catch {
                // ignore
            }
            let js = """
            (function(){
              try {
                var els = document.querySelectorAll('audio');
                for (var i = 0; i < els.length; i++) {
                  try { var p = els[i].play(); if (p && p.catch) p.catch(function(){}); } catch(e){}
                }
              } catch(e){}
            })();
            """
            self.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)

            var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
            info[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
            MPNowPlayingInfoCenter.default().nowPlayingInfo = info
        }
    }

    /// Toggles the first non-paused / paused HTML5 <audio> element.
    private func nativeToggleAudio() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let js = """
            (function(){
              try {
                var els = document.querySelectorAll('audio');
                if (!els.length) return 'none';
                var a = els[0];
                if (a.paused) {
                  var p = a.play(); if (p && p.catch) p.catch(function(){});
                  return 'play';
                } else {
                  a.pause();
                  return 'pause';
                }
              } catch(e){ return 'err'; }
            })();
            """
            self.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    /// Loads the app icon from the asset catalog (AppIcon) and wraps it as
    /// MPMediaItemArtwork. Falls back to nil if the icon can't be loaded.
    private func buildArtwork() -> MPMediaItemArtwork? {
        if let image = loadAppIconImage() {
            return MPMediaItemArtwork(boundsSize: image.size) { _ in image }
        }
        return nil
    }

    private func loadAppIconImage() -> UIImage? {
        // Try Info.plist CFBundleIcons (primary AppIcon set)
        if let icons = Bundle.main.infoDictionary?["CFBundleIcons"] as? [String: Any],
           let primary = icons["CFBundlePrimaryIcon"] as? [String: Any],
           let files = primary["CFBundleIconFiles"] as? [String],
           let last = files.last,
           let img = UIImage(named: last) {
            return img
        }
        // Fallbacks
        if let img = UIImage(named: "AppIcon") { return img }
        if let img = UIImage(named: "AppIcon60x60") { return img }
        return nil
    }
}
