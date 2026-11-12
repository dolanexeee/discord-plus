import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: SettingsStore
    @StateObject private var bridge = WebBridge()
    @State private var showingSettings = false

    var body: some View {
        VStack(spacing: 0) {
            topBar
            ZStack {
                DiscordWebView(bridge: bridge)
                if bridge.isLoading {
                    VStack {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .padding(.top, 24)
                        Spacer()
                    }
                }
                if let toast = bridge.toastMessage {
                    VStack {
                        Spacer()
                        Text(toast)
                            .font(.subheadline)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color.black.opacity(0.85))
                            .foregroundColor(.white)
                            .cornerRadius(20)
                            .padding(.bottom, 24)
                    }
                    .transition(.opacity)
                }
            }
        }
        .background(Color(red: 0.07, green: 0.07, blue: 0.08))
        .sheet(isPresented: $showingSettings) {
            SettingsView()
                .environmentObject(store)
        }
        .alert(
            "تعذّر التحميل",
            isPresented: Binding(
                get: { bridge.loadError != nil },
                set: { if !$0 { bridge.loadError = nil } }
            )
        ) {
            Button("إعادة المحاولة") { bridge.webView?.reload() }
            Button("حسنًا", role: .cancel) { bridge.loadError = nil }
        } message: {
            Text(bridge.loadError ?? "")
        }
    }

    private var topBar: some View {
        HStack(spacing: 18) {
            Text("Discord Plus")
                .font(.headline)
                .foregroundColor(.white)
            Text("ديسكورد بلس")
                .font(.subheadline)
                .foregroundColor(.gray)
            Spacer()
            Button(action: { bridge.webView?.reload() }) {
                Image(systemName: "arrow.clockwise").foregroundColor(.white)
            }
            Button(action: {
                bridge.webView?.load(URLRequest(url: DiscordWebView.homeURL))
            }) {
                Image(systemName: "house").foregroundColor(.white)
            }
            Button(action: { showingSettings = true }) {
                Image(systemName: "gearshape").foregroundColor(.white)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color(red: 0.07, green: 0.07, blue: 0.08))
    }
}
