#!/usr/bin/env python3
"""Generate DiscordPlus.xcodeproj (project.pbxproj + shared scheme + workspace).

We have no Mac/Xcode on this machine, so the Xcode project is generated
deterministically from the file list below. IDs are md5-based (stable across
runs). After writing, the script self-checks: balanced braces and every
referenced object ID must be defined.

Usage: python3 tools/gen_project.py
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_DIR = "DiscordPlus"

SWIFT_SOURCES = [
    "DiscordPlusApp.swift",
    "App/SettingsStore.swift",
    "App/ThemeEngine.swift",
    "App/PluginRegistry.swift",
    "Web/DiscordWebView.swift",
    "Web/WebBridge.swift",
    "Web/UserScripts.swift",
    "Views/ContentView.swift",
    "Views/SettingsView.swift",
    "Views/ThemeSettingsView.swift",
    "Views/PluginSettingsView.swift",
    "Views/CustomCSSView.swift",
    "Views/AboutView.swift",
]

JS_RESOURCES = [
    "Resources/JS/loader.js",
    "Resources/JS/plugins/copyIDs.js",
    "Resources/JS/plugins/localTimestamps.js",
    "Resources/JS/plugins/hideBlocked.js",
    "Resources/JS/plugins/mediaTools.js",
    "Resources/JS/plugins/customCSS.js",
    "Resources/JS/plugins/hideNitro.js",
]

BUNDLE_ID = "com.mustafa.discordplus"
PRODUCT_NAME = "DiscordPlus"
DEPLOYMENT_TARGET = "16.0"


def obj_id(seed: str) -> str:
    return hashlib.md5(seed.encode("utf-8")).hexdigest()[:24].upper()


# Old-style (OpenStep) plist bare-string charset: alphanumerics plus _ . / $ -
# NOTE: '+' is NOT allowed bare — "gnu++20" must be quoted, or xcodebuild
# fails with "missing semicolon in dictionary". YES/NO are fine bare
# (in the old-style format they are just strings).
BARE_RE = re.compile(r"^[A-Za-z0-9_./$\-]+$")


def q(value):
    """Quote a string value the way Xcode does (bare when safe)."""
    if isinstance(value, bool):
        return "YES" if value else "NO"
    if isinstance(value, int):
        return str(value)
    s = str(value)
    if BARE_RE.match(s):
        return s
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def plist(obj, indent=0):
    pad = "\t" * indent
    if isinstance(obj, dict):
        if not obj:
            return "{}"
        lines = ["{"]
        for key in sorted(obj.keys()):
            lines.append("\t" * (indent + 1) + q(key) + " = " + plist(obj[key], indent + 1) + ";")
        lines.append(pad + "}")
        return "\n".join(lines)
    if isinstance(obj, list):
        if not obj:
            return "()"
        lines = ["("]
        for item in obj:
            lines.append("\t" * (indent + 1) + plist(item, indent + 1) + ",")
        lines.append(pad + ")")
        return "\n".join(lines)
    return q(obj)


# ---------------------------------------------------------------------------
# Build the object graph
# ---------------------------------------------------------------------------
objects = {}


def add(obj_id, fields):
    objects[obj_id] = fields
    return obj_id


# --- IDs -------------------------------------------------------------------
project_id = obj_id("project")
target_id = obj_id("target:DiscordPlus")
main_group_id = obj_id("group:main")
app_group_id = obj_id("group:DiscordPlus")
sub_groups = {}
for name in ["App", "Web", "Views", "Resources", "JS", "plugins"]:
    sub_groups[name] = obj_id("group:" + name)
products_group_id = obj_id("group:Products")
product_ref_id = obj_id("fileref:DiscordPlus.app")
framework_ref_id = obj_id("fileref:WebKit.framework")
sources_phase_id = obj_id("phase:sources")
frameworks_phase_id = obj_id("phase:frameworks")
resources_phase_id = obj_id("phase:resources")
project_config_list_id = obj_id("configlist:project")
target_config_list_id = obj_id("configlist:target")
project_debug_id = obj_id("config:project:Debug")
project_release_id = obj_id("config:project:Release")
target_debug_id = obj_id("config:target:Debug")
target_release_id = obj_id("config:target:Release")

# --- File references --------------------------------------------------------
# path -> (ref id, lastKnownFileType)
file_refs = {}


def file_ref(rel_path, file_type):
    fid = obj_id("fileref:" + rel_path)
    file_refs[rel_path] = (fid, file_type)
    return fid


swift_refs = [file_ref(APP_DIR + "/" + p, "sourcecode.swift") for p in SWIFT_SOURCES]
js_refs = [file_ref(APP_DIR + "/" + p, "sourcecode.javascript") for p in JS_RESOURCES]
plist_ref = file_ref(APP_DIR + "/Info.plist", "text.plist.xml")
xcassets_ref = file_ref(APP_DIR + "/Assets.xcassets", "folder.assetcatalog")

add(product_ref_id, {
    "isa": "PBXFileReference",
    "explicitFileType": "wrapper.application",
    "includeInIndex": 0,
    "path": "DiscordPlus.app",
    "sourceTree": "BUILT_PRODUCTS_DIR",
})
add(framework_ref_id, {
    "isa": "PBXFileReference",
    "lastKnownFileType": "wrapper.framework",
    "name": "WebKit.framework",
    "path": "System/Library/Frameworks/WebKit.framework",
    "sourceTree": "SDKROOT",
})
for rel_path, (fid, ftype) in sorted(file_refs.items()):
    add(fid, {
        "isa": "PBXFileReference",
        "lastKnownFileType": ftype,
        "path": os.path.basename(rel_path),
        "sourceTree": "<group>",
    })

# --- Build files ------------------------------------------------------------
def build_file(rel_path):
    bid = obj_id("buildfile:" + rel_path)
    fid = file_refs[rel_path][0]
    add(bid, {"isa": "PBXBuildFile", "fileRef": fid})
    return bid


swift_build_files = [build_file(APP_DIR + "/" + p) for p in SWIFT_SOURCES]
js_build_files = [build_file(APP_DIR + "/" + p) for p in JS_RESOURCES]
xcassets_build_file = build_file(APP_DIR + "/Assets.xcassets")
framework_build_file = obj_id("buildfile:WebKit.framework")
add(framework_build_file, {"isa": "PBXBuildFile", "fileRef": framework_ref_id})

# --- Groups -----------------------------------------------------------------
def group(gid, children, name=None, path=None):
    fields = {"isa": "PBXGroup", "children": children, "sourceTree": "<group>"}
    if name is not None:
        fields["name"] = name
    if path is not None:
        fields["path"] = path
    add(gid, fields)
    return gid


def children_of(prefix):
    """File refs directly under a virtual group path (no deeper slash)."""
    out = []
    for rel_path in sorted(file_refs.keys()):
        if rel_path.startswith(prefix) and "/" not in rel_path[len(prefix):]:
            out.append(file_refs[rel_path][0])
    return out


group(sub_groups["plugins"], children_of(APP_DIR + "/Resources/JS/plugins/"), name="plugins", path="plugins")
group(sub_groups["JS"], [sub_groups["plugins"]] + children_of(APP_DIR + "/Resources/JS/"), name="JS", path="JS")
group(sub_groups["Resources"], [sub_groups["JS"]], name="Resources", path="Resources")
group(sub_groups["App"], children_of(APP_DIR + "/App/"), name="App", path="App")
group(sub_groups["Web"], children_of(APP_DIR + "/Web/"), name="Web", path="Web")
group(sub_groups["Views"], children_of(APP_DIR + "/Views/"), name="Views", path="Views")
group(app_group_id, children_of(APP_DIR + "/") + [
    sub_groups["App"], sub_groups["Web"], sub_groups["Views"], sub_groups["Resources"],
], name="DiscordPlus", path="DiscordPlus")
group(products_group_id, [product_ref_id], name="Products")
group(main_group_id, [app_group_id, products_group_id])

# --- Build phases -----------------------------------------------------------
add(sources_phase_id, {
    "isa": "PBXSourcesBuildPhase",
    "buildActionMask": 2147483647,
    "files": swift_build_files,
    "runOnlyForDeploymentPostprocessing": 0,
})
add(frameworks_phase_id, {
    "isa": "PBXFrameworksBuildPhase",
    "buildActionMask": 2147483647,
    "files": [framework_build_file],
    "runOnlyForDeploymentPostprocessing": 0,
})
add(resources_phase_id, {
    "isa": "PBXResourcesBuildPhase",
    "buildActionMask": 2147483647,
    "files": js_build_files + [xcassets_build_file],
    "runOnlyForDeploymentPostprocessing": 0,
})

# --- Build configurations ---------------------------------------------------
project_common = {
    "ALWAYS_SEARCH_USER_PATHS": "NO",
    "CLANG_ANALYZER_NONNULL": "YES",
    "CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION": "YES_AGGRESSIVE",
    "CLANG_CXX_LANGUAGE_STANDARD": "gnu++20",
    "CLANG_ENABLE_MODULES": "YES",
    "CLANG_ENABLE_OBJC_ARC": "YES",
    "CLANG_ENABLE_OBJC_WEAK": "YES",
    "CLANG_WARN_DOCUMENTATION_COMMENTS": "YES",
    "CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER": "YES",
    "CLANG_WARN_UNGUARDED_AVAILABILITY": "YES_AGGRESSIVE",
    "CODE_SIGN_STYLE": "Automatic",
    "COPY_PHASE_STRIP": "NO",
    "ENABLE_STRICT_OBJC_MSGSEND": "YES",
    "GCC_C_LANGUAGE_STANDARD": "gnu17",
    "GCC_WARN_ABOUT_RETURN_TYPE": "YES_ERROR",
    "GCC_WARN_UNINITIALIZED_AUTOS": "YES_AGGRESSIVE",
    "GCC_WARN_UNUSED_FUNCTION": "YES",
    "GCC_WARN_UNUSED_VARIABLE": "YES",
    "IPHONEOS_DEPLOYMENT_TARGET": DEPLOYMENT_TARGET,
    "LOCALIZATION_PREFS": "",
    "MTL_FAST_MATH": "YES",
    "SDKROOT": "iphoneos",
    "SWIFT_VERSION": "5.0",
    "TARGETED_DEVICE_FAMILY": "1",
}
project_debug = dict(project_common)
project_debug.update({
    "DEBUG_INFORMATION_FORMAT": "dwarf",
    "ENABLE_TESTABILITY": "YES",
    "MTL_ENABLE_DEBUG_INFO": "INCLUDE_SOURCE",
    "ONLY_ACTIVE_ARCH": "YES",
    "SWIFT_ACTIVE_COMPILATION_CONDITIONS": "DEBUG",
    "SWIFT_OPTIMIZATION_LEVEL": "-Onone",
})
project_release = dict(project_common)
project_release.update({
    "DEBUG_INFORMATION_FORMAT": "dwarf-with-dsym",
    "MTL_ENABLE_DEBUG_INFO": "NO",
    "SWIFT_OPTIMIZATION_LEVEL": "-O",
})

target_common = {
    "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon",
    "ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME": "AccentColor",
    "CODE_SIGN_STYLE": "Automatic",
    "CURRENT_PROJECT_VERSION": 1,
    "ENABLE_PREVIEWS": "YES",
    "GENERATE_INFOPLIST_FILE": "NO",
    "INFOPLIST_FILE": "DiscordPlus/Info.plist",
    "INFOPLIST_KEY_UIApplicationSceneManifest_Generation": "YES",
    "INFOPLIST_KEY_UILaunchStoryboardName": "",
    "IPHONEOS_DEPLOYMENT_TARGET": DEPLOYMENT_TARGET,
    "LD_RUNPATH_SEARCH_PATHS": ["$(inherited)", "@executable_path/Frameworks"],
    "MARKETING_VERSION": "1.0.0",
    "PRODUCT_BUNDLE_IDENTIFIER": BUNDLE_ID,
    "PRODUCT_NAME": "$(TARGET_NAME)",
    "SDKROOT": "iphoneos",
    "SWIFT_EMBED_LIBRARIES_WITH_INSTALL": "YES",
    "SWIFT_VERSION": "5.0",
    "TARGETED_DEVICE_FAMILY": "1",
}
target_debug = dict(target_common)
target_debug.update({
    "DEBUG_INFORMATION_FORMAT": "dwarf",
    "ENABLE_TESTABILITY": "YES",
    "SWIFT_ACTIVE_COMPILATION_CONDITIONS": "DEBUG",
    "SWIFT_OPTIMIZATION_LEVEL": "-Onone",
})
target_release = dict(target_common)
target_release.update({
    "DEBUG_INFORMATION_FORMAT": "dwarf-with-dsym",
    "SWIFT_OPTIMIZATION_LEVEL": "-O",
})


def config(cid, name, settings):
    add(cid, {
        "isa": "XCBuildConfiguration",
        "buildSettings": settings,
        "name": name,
    })
    return cid


config(project_debug_id, "Debug", project_debug)
config(project_release_id, "Release", project_release)
config(target_debug_id, "Debug", target_debug)
config(target_release_id, "Release", target_release)

add(project_config_list_id, {
    "isa": "XCConfigurationList",
    "buildConfigurations": [project_debug_id, project_release_id],
    "defaultConfigurationIsVisible": 0,
    "defaultConfigurationName": "Release",
})
add(target_config_list_id, {
    "isa": "XCConfigurationList",
    "buildConfigurations": [target_debug_id, target_release_id],
    "defaultConfigurationIsVisible": 0,
    "defaultConfigurationName": "Release",
})

# --- Target & project -------------------------------------------------------
add(target_id, {
    "isa": "PBXNativeTarget",
    "buildConfigurationList": target_config_list_id,
    "buildPhases": [sources_phase_id, frameworks_phase_id, resources_phase_id],
    "buildRules": [],
    "dependencies": [],
    "name": PRODUCT_NAME,
    "productName": PRODUCT_NAME,
    "productReference": product_ref_id,
    "productType": "com.apple.product-type.application",
})
add(project_id, {
    "isa": "PBXProject",
    "attributes": {
        "LastUpgradeCheck": 1600,
        "TargetAttributes": {
            target_id: {
                "CreatedOnToolsVersion": "16.0",
                "LastSwiftMigration": 1600,
                "ProvisioningStyle": "Automatic",
            }
        },
    },
    "buildConfigurationList": project_config_list_id,
    "compatibilityVersion": "Xcode 14.0",
    "developmentRegion": "en",
    "hasScannedForEncodings": 0,
    "knownRegions": ["en", "Base"],
    "mainGroup": main_group_id,
    "productRefGroup": products_group_id,
    "projectDirPath": "",
    "projectRoot": "",
    "targets": [target_id],
})

# ---------------------------------------------------------------------------
# Serialise
# ---------------------------------------------------------------------------
def emit():
    lines = ["// !$*UTF8*$!", "{"]
    lines.append("\tarchiveVersion = 1;")
    lines.append("\tclasses = {")
    lines.append("\t};")
    lines.append("\tobjectVersion = 56;")
    lines.append("\tobjects = {")
    for oid in sorted(objects.keys()):
        body = plist(objects[oid], 2)
        lines.append("\t\t" + oid + " = " + body + ";")
    lines.append("\t};")
    lines.append("\trootObject = " + project_id + ";")
    lines.append("}")
    return "\n".join(lines) + "\n"


def self_check(text):
    defined = set(objects.keys())
    tokens = set(re.findall(r"\b[0-9A-F]{24}\b", text))
    missing = tokens - defined
    if missing:
        print("SELF-CHECK FAILED: undefined IDs:", sorted(missing), file=sys.stderr)
        return False
    depth = 0
    for ch in text:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        if depth < 0:
            print("SELF-CHECK FAILED: unbalanced braces", file=sys.stderr)
            return False
    if depth != 0:
        print("SELF-CHECK FAILED: unbalanced braces, depth =", depth, file=sys.stderr)
        return False
    # Old-style plist bare-value check: every unquoted scalar must match the
    # safe bare charset (24-hex IDs and plain numbers included). This is the
    # check that would have caught the "gnu++20" failure.
    bad = []
    for m in re.finditer(r"=\s*([^;\(\{]+);", text):
        v = m.group(1).strip()
        if v.startswith('"'):
            continue
        if re.fullmatch(r"[0-9A-F]{24}", v) or re.fullmatch(r"\d+", v) or BARE_RE.match(v):
            continue
        bad.append(v)
    if bad:
        print("SELF-CHECK FAILED: unquotable bare values:", sorted(set(bad)), file=sys.stderr)
        return False
    print("self-check OK: %d objects, %d ID references, braces balanced, bare values valid" % (len(objects), len(tokens)))
    return True


def main():
    proj_dir = os.path.join(ROOT, "DiscordPlus.xcodeproj")
    os.makedirs(os.path.join(proj_dir, "xcshareddata", "xcschemes"), exist_ok=True)
    os.makedirs(os.path.join(proj_dir, "project.xcworkspace"), exist_ok=True)

    text = emit()
    if not self_check(text):
        sys.exit(1)
    with open(os.path.join(proj_dir, "project.pbxproj"), "w", encoding="utf-8") as f:
        f.write(text)
    print("wrote", os.path.join(proj_dir, "project.pbxproj"))

    scheme = """<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1600"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES"
      buildArchitectures = "Automatic">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "%s"
               BuildableName = "DiscordPlus.app"
               BlueprintName = "DiscordPlus"
               ReferencedContainer = "container:DiscordPlus.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables>
      </Testables>
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "%s"
            BuildableName = "DiscordPlus.app"
            BlueprintName = "DiscordPlus"
            ReferencedContainer = "container:DiscordPlus.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "%s"
            BuildableName = "DiscordPlus.app"
            BlueprintName = "DiscordPlus"
            ReferencedContainer = "container:DiscordPlus.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
""" % (target_id, target_id, target_id)
    with open(os.path.join(proj_dir, "xcshareddata", "xcschemes", "DiscordPlus.xcscheme"), "w", encoding="utf-8") as f:
        f.write(scheme)
    print("wrote scheme")

    workspace = """<?xml version="1.0" encoding="UTF-8"?>
<Workspace
   version = "1.0">
   <FileRef
      location = "self:">
   </FileRef>
</Workspace>
"""
    with open(os.path.join(proj_dir, "project.xcworkspace", "contents.xcworkspacedata"), "w", encoding="utf-8") as f:
        f.write(workspace)
    print("wrote workspace")


if __name__ == "__main__":
    main()
