import Foundation
import Capacitor
import AVFoundation
import MediaPlayer
import UIKit

/**
 * NowPlayingPlugin
 *
 * Custom Capacitor plugin that:
 *  - Owns a native AVPlayer for audio playback (works reliably in background +
 *    lockscreen, unlike HTML5 <audio> in WKWebView).
 *  - Drives the iOS lockscreen / Control Center "Now Playing" widget.
 *  - Routes MPRemoteCommandCenter (play/pause/next/prev/seek) directly into
 *    the AVPlayer so the lockscreen pause button ALWAYS stops the sound,
 *    even when JS is frozen in background.
 *
 * Background Modes -> Audio, AirPlay, and Picture in Picture must be enabled
 * in the iOS app target's Signing & Capabilities tab.
 */
@objc(NowPlayingPlugin)
public class NowPlayingPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "NowPlayingPlugin"
    public let jsName = "NowPlayingPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "activate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setNowPlaying", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updatePlayback", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        // Native AVPlayer API
        CAPPluginMethod(name: "loadTrack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playNative", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseNative", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seekNative", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolumeNative", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopNative", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentTime", returnType: CAPPluginReturnPromise)
    ]

    private var commandsRegistered = false
    private var cachedArtwork: MPMediaItemArtwork?
    private var commandSequence = 0

    // AVPlayer state
    private var player: AVPlayer?
    private var currentItem: AVPlayerItem?
    private var timeObserver: Any?
    private var endObserver: NSObjectProtocol?
    private var currentTitle: String = ""
    private var currentArtist: String = ""
    private var currentAlbum: String = ""
    private var currentDuration: Double = 0
    private var pendingVolume: Float = 1.0

    // MARK: - Lifecycle

    override public func load() {
        configureAudioSession()
        registerCommands()
        prepareArtwork()
    }

    deinit {
        if let obs = timeObserver { player?.removeTimeObserver(obs) }
        if let endObs = endObserver { NotificationCenter.default.removeObserver(endObs) }
    }

    // MARK: - JS API: Now Playing metadata

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

        currentTitle = title
        currentArtist = artist
        currentAlbum = album
        currentDuration = duration

        updateNowPlayingInfo(elapsed: elapsed, isPlaying: isPlaying)

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

    // MARK: - JS API: Native AVPlayer

    @objc func loadTrack(_ call: CAPPluginCall) {
        guard let uri = call.getString("uri"), !uri.isEmpty else {
            call.reject("Missing uri")
            return
        }
        let title = call.getString("title") ?? ""
        let artist = call.getString("artist") ?? ""
        let album = call.getString("album") ?? ""
        let duration = call.getDouble("duration") ?? 0
        let autoPlay = call.getBool("autoPlay") ?? false

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.configureAudioSession()

            // Build URL from URI (file://...) or remote
            let url: URL?
            if uri.hasPrefix("file://") || uri.hasPrefix("http://") || uri.hasPrefix("https://") {
                url = URL(string: uri)
            } else {
                url = URL(fileURLWithPath: uri)
            }
            guard let trackURL = url else {
                call.reject("Invalid uri")
                return
            }

            // Tear down previous item
            self.teardownPlayerObservers()

            let item = AVPlayerItem(url: trackURL)
            self.currentItem = item

            if let p = self.player {
                p.replaceCurrentItem(with: item)
            } else {
                self.player = AVPlayer(playerItem: item)
            }
            self.player?.volume = self.pendingVolume
            self.player?.automaticallyWaitsToMinimizeStalling = false

            self.installPlayerObservers()

            self.currentTitle = title
            self.currentArtist = artist
            self.currentAlbum = album
            self.currentDuration = duration

            self.updateNowPlayingInfo(elapsed: 0, isPlaying: autoPlay)

            if autoPlay {
                self.player?.play()
                self.emitNativeAudio(event: "play")
            }

            call.resolve()
        }
    }

    @objc func playNative(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            do {
                try AVAudioSession.sharedInstance().setActive(true, options: [])
            } catch { }
            self.player?.play()
            let elapsed = self.currentElapsed()
            self.updateNowPlayingInfo(elapsed: elapsed, isPlaying: true)
            self.emitNativeAudio(event: "play")
            call.resolve()
        }
    }

    @objc func pauseNative(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.hardPause()
            call.resolve()
        }
    }

    /// Belt-and-braces pause: stops AVPlayer AND any HTML5 <audio> still playing
    /// in the WKWebView. Called from JS pauseNative + lockscreen pause/toggle.
    private func hardPause() {
        // 1) Native AVPlayer
        self.player?.pause()
        let elapsed = self.currentElapsed()
        self.updateNowPlayingInfo(elapsed: elapsed, isPlaying: false)
        self.emitNativeAudio(event: "pause")

        // 2) Kill any HTML5 audio/video still playing in the webview
        let js = """
        (function(){
          try {
            var els = document.querySelectorAll('audio, video');
            var n = 0;
            els.forEach(function(e){ try { if (!e.paused) { e.pause(); n++; } } catch(_){} });
            return 'paused_html5=' + n + ' total=' + els.length;
          } catch(e) { return 'err:' + e.message; }
        })();
        """
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.bridge?.webView?.evaluateJavaScript(js) { result, error in
                if let error = error {
                    print("NowPlayingPlugin: hardPause JS error: \(error)")
                } else {
                    print("NowPlayingPlugin: hardPause JS result: \(String(describing: result))")
                }
            }
        }

        // 3) Log AVPlayer state to help debugging
        if let p = self.player {
            print("NowPlayingPlugin: AVPlayer rate=\(p.rate) status=\(p.status.rawValue) item=\(String(describing: p.currentItem))")
        } else {
            print("NowPlayingPlugin: AVPlayer is nil at pause time")
        }
    }

    @objc func seekNative(_ call: CAPPluginCall) {
        let position = call.getDouble("position") ?? 0
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let player = self.player else {
                call.resolve()
                return
            }
            let cmTime = CMTime(seconds: position, preferredTimescale: 1000)
            player.seek(to: cmTime, toleranceBefore: .zero, toleranceAfter: .zero) { _ in
                self.updateNowPlayingInfo(elapsed: position, isPlaying: player.rate != 0)
                call.resolve()
            }
        }
    }

    @objc func setVolumeNative(_ call: CAPPluginCall) {
        let volume = call.getDouble("volume") ?? 1.0
        pendingVolume = Float(max(0.0, min(1.0, volume)))
        DispatchQueue.main.async { [weak self] in
            self?.player?.volume = self?.pendingVolume ?? 1.0
            call.resolve()
        }
    }

    @objc func stopNative(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.player?.pause()
            self.player?.replaceCurrentItem(with: nil)
            self.teardownPlayerObservers()
            call.resolve()
        }
    }

    @objc func getCurrentTime(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            let t = self?.currentElapsed() ?? 0
            call.resolve(["currentTime": t])
        }
    }

    // MARK: - AVPlayer observers

    private func installPlayerObservers() {
        guard let player = player else { return }

        // Periodic time observer (every 0.5s) -> emit timeupdate
        let interval = CMTime(seconds: 0.5, preferredTimescale: 1000)
        timeObserver = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self else { return }
            let secs = CMTimeGetSeconds(time)
            if !secs.isNaN && !secs.isInfinite {
                self.emitNativeAudio(event: "timeupdate", extra: ["currentTime": secs])
                // Keep lockscreen elapsed in sync
                var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
                info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = secs
                info[MPNowPlayingInfoPropertyPlaybackRate] = (self.player?.rate ?? 0) > 0 ? 1.0 : 0.0
                MPNowPlayingInfoCenter.default().nowPlayingInfo = info
            }
        }

        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: currentItem,
            queue: .main
        ) { [weak self] _ in
            self?.emitNativeAudio(event: "ended")
        }
    }

    private func teardownPlayerObservers() {
        if let obs = timeObserver {
            player?.removeTimeObserver(obs)
            timeObserver = nil
        }
        if let endObs = endObserver {
            NotificationCenter.default.removeObserver(endObs)
            endObserver = nil
        }
    }

    private func currentElapsed() -> Double {
        guard let player = player else { return 0 }
        let secs = CMTimeGetSeconds(player.currentTime())
        return (secs.isNaN || secs.isInfinite) ? 0 : secs
    }

    // MARK: - Now Playing info

    private func updateNowPlayingInfo(elapsed: Double, isPlaying: Bool) {
        var info: [String: Any] = [:]
        info[MPMediaItemPropertyTitle] = currentTitle
        info[MPMediaItemPropertyArtist] = currentArtist
        info[MPMediaItemPropertyAlbumTitle] = currentAlbum
        info[MPMediaItemPropertyPlaybackDuration] = currentDuration
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0

        if let art = cachedArtwork ?? buildArtwork() {
            cachedArtwork = art
            info[MPMediaItemPropertyArtwork] = art
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    // MARK: - Audio session + remote commands

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
            guard let self = self else { return .commandFailed }
            self.player?.play()
            self.updateNowPlayingInfo(elapsed: self.currentElapsed(), isPlaying: true)
            self.emitNativeAudio(event: "play")
            self.emitRemoteCommand(action: "play")
            return .success
        }

        center.pauseCommand.isEnabled = true
        center.pauseCommand.addTarget { [weak self] _ in
            guard let self = self else { return .commandFailed }
            print("NowPlayingPlugin: lockscreen PAUSE command received")
            self.hardPause()
            self.emitRemoteCommand(action: "pause")
            return .success
        }

        center.togglePlayPauseCommand.isEnabled = true
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self = self else { return .commandFailed }
            if let p = self.player, p.rate != 0 {
                print("NowPlayingPlugin: lockscreen TOGGLE -> pause")
                self.hardPause()
            } else {
                print("NowPlayingPlugin: lockscreen TOGGLE -> play")
                self.player?.play()
                self.updateNowPlayingInfo(elapsed: self.currentElapsed(), isPlaying: true)
                self.emitNativeAudio(event: "play")
            }
            self.emitRemoteCommand(action: "toggle")
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
            guard let self = self,
                  let event = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            let pos = event.positionTime
            let cmTime = CMTime(seconds: pos, preferredTimescale: 1000)
            self.player?.seek(to: cmTime, toleranceBefore: .zero, toleranceAfter: .zero)
            self.updateNowPlayingInfo(elapsed: pos, isPlaying: (self.player?.rate ?? 0) > 0)
            self.emitRemoteCommand(action: "seek", position: pos)
            return .success
        }

        center.skipForwardCommand.isEnabled = false
        center.skipBackwardCommand.isEnabled = false

        UIApplication.shared.beginReceivingRemoteControlEvents()
    }

    private func prepareArtwork() {
        cachedArtwork = buildArtwork()
    }

    // MARK: - Event emission to JS

    private func emitRemoteCommand(action: String, position: Double? = nil) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.commandSequence += 1
            var payload: [String: Any] = [
                "action": action,
                "eventId": self.commandSequence
            ]
            if let position = position { payload["position"] = position }

            self.notifyListeners("remoteCommand", data: payload)

            if let bridge = self.bridge,
               let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
               let json = String(data: data, encoding: .utf8) {
                bridge.triggerDocumentJSEvent(eventName: "nowPlayingRemoteCommand", data: json)
            }
        }
    }

    private func emitNativeAudio(event: String, extra: [String: Any] = [:]) {
        var payload: [String: Any] = ["event": event]
        for (k, v) in extra { payload[k] = v }
        self.notifyListeners("nativeAudio", data: payload)
    }

    // MARK: - Artwork

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
