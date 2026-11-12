import SwiftUI

/// Discord Plus — a web-based modded Discord client for iOS.
/// The app shows the official Discord web client (always the latest version)
/// inside a WKWebView and layers themes, plugins and custom CSS on top.
/// Login happens inside the webview only; the app never sees credentials.
@main
struct DiscordPlusApp: App {
    @StateObject private var store = SettingsStore.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .preferredColorScheme(.dark)
        }
    }
}
