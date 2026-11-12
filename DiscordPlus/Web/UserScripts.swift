import WebKit

/// Helpers for the JS that runs inside the Discord web client.
enum UserScripts {
    /// Runs at document start: paints a dark background immediately so the
    /// user never sees a white flash while Discord loads.
    static func earlyScript() -> WKUserScript {
        let source = """
        (function () {
          try {
            var el = document.documentElement;
            if (el) { el.style.backgroundColor = '#111214'; }
          } catch (e) {}
        })();
        """
        return WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }

    /// Loads a bundled JS file (loader.js / plugin files) from the app bundle.
    /// Files are copied flat into the bundle root by the Resources build phase.
    static func loadBundledJS(named name: String) -> String? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "js") else { return nil }
        return try? String(contentsOf: url, encoding: .utf8)
    }
}
