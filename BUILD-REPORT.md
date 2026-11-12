# Discord Plus — Build Report (v1.1.0)

**Status: ✅ BUILD SUCCEEDED — real `.ipa` produced and verified.**

- **Repo:** https://github.com/dolanexeee/discord-plus (public)
- **Head commit:** `TBD` (branch `main`)
- **Build:** GitHub Actions, run
  TBD
  — macOS runner, Xcode, Release, unsigned
- **Artifact:** `DiscordPlus-ipa` (TBD bytes) — download from the run's
  Artifacts section (needs a GitHub login; artifacts expire after 90 days)
- **Release:** https://github.com/dolanexeee/discord-plus/releases/tag/v1.1.0
  — direct `.ipa` download:
  https://github.com/dolanexeee/discord-plus/releases/download/v1.1.0/DiscordPlus.ipa

## What changed in v1.1.0

- **REMOVED:** Hide Blocked Messages (deleted `hideBlocked.js`, removed
  from the registry, the project, README and this report).
- **ADDED:** Message Logger, Timeout Countdown, Member Details, Translate
  Messages, Export Tools, Message Bookmarks, Server Info, Silent Typing
  (8 new plugins, 13 bundled in total).
- **Loader:** new shared helpers in `loader.js` — `DP.webpack`
  (webpack chunk finder + store lookups: GuildMemberStore, UserStore,
  GuildStore, RoleStore), `DP.util.snowflakeDate`,
  `DP.util.extractMessage`. The Copy IDs long-press menu now also hosts
  the Translate and Bookmark actions (one menu per long-press).
- **Version:** 1.1.0 (build 2).

## What the .ipa contains (verified by download + inspection)

- `Payload/DiscordPlus.app/DiscordPlus` — Mach-O 64-bit **arm64** executable
- Bundle id `com.mustafa.discordplus`, display name "Discord Plus",
  version 1.1.0 (build 2), minimum iOS 16.0, iPhone only
- All 15 JS files, byte-identical to the sources: `loader.js` +
  `copyIDs.js`, `localTimestamps.js`, `mediaTools.js`, `customCSS.js`,
  `hideNitro.js`, `messageLogger.js`, `timeoutCountdown.js`,
  `memberDetails.js`, `translateMessages.js`, `exportTools.js`,
  `messageBookmarks.js`, `serverInfo.js`, `silentTyping.js`
- `Assets.car` (compiled app icon), `Info.plist`, `PkgInfo`
- **No embedded provisioning profile — the .ipa is unsigned by design.**
  Sign it with your own certificate and sideload it.

## User-agent choice

**macOS desktop Safari UA**
`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15
(KHTML, like Gecko) Version/18.4 Safari/605.1.15` — set on the `WKWebView`
itself (`customUserAgent` is a `WKWebView` property, not a configuration
property). Discord then serves the **full desktop web client**: the most
feature-complete web client and the most stable DOM for the plugin system.
Trade-off: the desktop layout is wide, so on a phone you pinch-zoom and
scroll. A mobile UA would fit better but has fewer features and a
different DOM.

## Features as built

- **Discord web client, always latest** — `https://discord.com/app` in a
  `WKWebView`. No bundled Discord code, no decryption, no IPA patching.
  Login happens inside the web view only; **no credentials or tokens are
  stored, logged, or transmitted anywhere in the code**.
- **Theme engine** — 3 built-in themes (Midnight, AMOLED pure black,
  Aurora) as Discord CSS-variable overrides; custom accent colour
  (6 presets + colour picker); 4 font choices; custom-CSS editor.
  Persisted in `UserDefaults`; theme/CSS changes apply live without reload.
- **Plugin system** — `window.DP` loader + plugin API (registerPlugin,
  start/stop, storage, toast, openExternal), modeled on the Vencord/Kettu
  pattern but all original code. Bundled registry + user-added plugin URLs
  (fetched on-device via URLSession). Per-plugin enable/disable + settings;
  toggling a plugin reloads the web view.
- **13 built-in plugins:**
  - Copy IDs (long-press message/user/server/channel; also hosts the
    Translate and Bookmark actions)
  - Local Timestamps (full local date/time, tooltip or replace)
  - Media Tools (tap-to-zoom lightbox + download)
  - Custom CSS Loader
  - Hide Nitro Upsell
  - **Message Logger** — keeps messages seen while running: deleted
    messages stay visible (marked deleted, with original content and
    time) and edits keep history; 📜 log panel lists them. **Limit: it
    cannot recover messages deleted before it was enabled, before the
    app was installed, or while the app was closed.** Messages deleted
    by a ban purge are kept only if they were seen first. Deleted rows
    shown in place may be removed again by Discord's own re-render; the
    log panel always keeps them. Reads Discord's Flux dispatcher
    (MESSAGE_CREATE / UPDATE / DELETE) via the webpack stores, with a
    DOM-observation fallback.
  - **Timeout Countdown** — live countdown (remaining time + exact end
    time) for timed-out members in profiles and as badges in the member
    list. **Route used: Discord's own client store** —
    `GuildMemberStore.getMember(guildId, userId).communicationDisabledUntil`
    (the same field Discord itself uses); the profile popout's
    "Timed out until …" text is the fallback. If neither yields a time,
    nothing is shown.
  - **Member Details** — account creation date (from the ID snowflake),
    server join date, roles and account age in user profiles, from
    UserStore / GuildMemberStore / RoleStore.
  - **Translate Messages** — long-press → Translate; automatic direction
    (Arabic → English, otherwise → Arabic); free no-key endpoints
    (Google gtx primary, MyMemory fallback); translation shown in a box
    under the message. Only the message text is sent to the service.
  - **Export Tools** — export loaded channel messages (text or JSON)
    and the server member list (CSV) via the ⬇️ button. **Limit: only
    what is loaded on screen is exported** (scroll up to load more
    history; member list is paginated by Discord).
  - **Message Bookmarks** — long-press → Bookmark; 🔖 button opens the
    saved list (jump to message, delete, clear all). Stored on-device
    only (localStorage).
  - **Server Info** — server creation date, member count, boost level
    and channel count (ℹ️ button; GuildStore + GuildMemberStore +
    sidebar count).
  - **Silent Typing** — stops the client sending your typing indicator
    (drops the `.../channels/<id>/typing` REST requests in fetch/XHR)
    and/or hides others' typing indicators (CSS). Two toggles.
- **Native settings UI** — SwiftUI, Arabic-first with English (RTL):
  Themes, Plugins, Custom CSS, About. The About screen and the Settings
  screen both carry the honest warning: modified clients can get a Discord
  account banned — test with a secondary account first.
- **JS bridge** — `WKScriptMessageHandler` (`discordPlus`): toasts, logs,
  plugin storage (UserDefaults), open-external. External (non-Discord)
  links open in Safari; in-page popups are routed back into the web view.

## File list (47 files)

```
DiscordPlus/
  DiscordPlusApp.swift          App entry point (@main)
  App/SettingsStore.swift       UserDefaults-backed settings hub
  App/ThemeEngine.swift         3 themes, accent presets, fonts, CSS builder
  App/PluginRegistry.swift      13 bundled plugin metadata + defaults
  Web/DiscordWebView.swift      WKWebView wrapper + coordinator + UA
  Web/WebBridge.swift           Injection + JS bridge (toast/log/storage)
  Web/UserScripts.swift         Document-start anti-flash script, JS loader
  Views/ContentView.swift       Top bar, loading spinner, toast, error alert
  Views/SettingsView.swift      Settings home (Themes / Plugins / CSS / About)
  Views/ThemeSettingsView.swift Theme picker, accent, font, live preview
  Views/PluginSettingsView.swift Plugin toggles, options, add-by-URL
  Views/CustomCSSView.swift     CSS editor + snippets
  Views/AboutView.swift         Ban-risk + privacy notes
  Resources/JS/loader.js        window.DP plugin API + webpack helpers
  Resources/JS/plugins/*.js     13 plugins (see above)
  Assets.xcassets/              App icon (blurple "D+") + accent colour
  Info.plist
DiscordPlus.xcodeproj/          Generated by tools/gen_project.py
.github/workflows/build.yml    macOS runner: unsigned Release .ipa -> artifact
tools/gen_project.py            Xcode project generator (+ self-check)
README.md · LICENSE (MIT) · .gitignore
```

## Build history

### v1.0.0
1. **Run 43220041813 — FAILED (exit 74, 16s):** `project.pbxproj` parse
   error, "missing semicolon in dictionary on line 211". Cause: the
   generator emitted `CLANG_CXX_LANGUAGE_STANDARD = gnu++20;` bare — `+`
   is not allowed in unquoted old-style plist strings. Fixed in
   `tools/gen_project.py` (bare charset now `A-Za-z0-9_./$-`, `gnu++20`
   quoted) and the self-check now rejects any invalid bare value.
2. **Run 43220227601 — FAILED (exit 65, 33s):** one Swift error:
   `WKWebViewConfiguration has no member 'customUserAgent'`. Fixed by
   setting the UA on the `WKWebView` after creation, before loading.
3. **Run 43220384643 — ✅ SUCCESS (41s).** Artifact `DiscordPlus-ipa`
   (203,852 bytes); release v1.0.0 published.

### v1.1.0
TBD — filled in after the CI run.

Two code fixes made before the first push, from a read-through:
- `WebBridge.injectUserPlugins` had a race: plugin code was appended on
  the main queue while `DispatchGroup.leave()` ran immediately, so
  `group.notify` could fire before the append and drop user plugins.
  Now appends directly in the data-task closure.
- `ThemeSettingsView.themeSwatch` picked the first 3 variables
  alphabetically, which include `rgba()` values that `Color(hex:)` renders
  black. Now uses explicit background keys.

## Install

1. Download the `DiscordPlus.ipa` from the v1.1.0 release (direct link
   above) or the `DiscordPlus-ipa` artifact from the successful run.
2. Sign the `.ipa` with your own certificate and sideload it onto the
   iPhone (annual cert — never shared with this build; the CI build is
   unsigned).
3. Open Discord Plus, log in inside the app, open Settings (gear icon) to
   pick a theme and enable plugins.

## Known limits / open issues

- **No push notifications** — a web view cannot register for Discord push
  notifications like the native app.
- **Voice/video** runs through the web client in `WKWebView`; audio
  routing, background audio and echo cancellation may behave differently
  from the native app. **Not tested on a real device** — no iPhone is
  available to this build machine; on-device behaviour is the next check.
- **Desktop layout on a phone** — pinch-zoom needed (see UA choice above).
- **DOM/store-dependent plugins** read Discord's web DOM and client
  stores, which Discord changes between releases; they are best-effort and
  may need updates after a Discord web update.
- **Message Logger** — see the honest limit above (no retroactive
  recovery; in-place deleted rows may be removed by Discord's re-render,
  the log panel keeps them).
- **Downloaded media** goes through the web view's download handling, not
  directly into the Photos library.
- **User-added plugin URLs** execute arbitrary JS inside Discord — only
  add URLs from sources you trust (warned in the UI).
- The `actions/checkout@v4` Node.js 20 deprecation warning on the runner is
  cosmetic (forced to Node 24) and does not affect the build.
