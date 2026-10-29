import AppKit
import ApplicationServices

func output(_ value: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: value), let text = String(data: data, encoding: .utf8) { print(text); fflush(stdout) }
}
func focusToken(_ pid: pid_t) -> String {
    guard AXIsProcessTrusted() else { return "0" }
    var element: CFTypeRef?
    guard AXUIElementCopyAttributeValue(AXUIElementCreateApplication(pid), kAXFocusedUIElementAttribute as CFString, &element) == .success, let element else { return "0" }
    return String(CFHash(element))
}
let args = Array(CommandLine.arguments.dropFirst())
if args.first == "watch", args.count == 2, let owner = Int32(args[1]) {
    while kill(owner, 0) == 0 {
        if let app = NSWorkspace.shared.frontmostApplication {
            let pid = app.processIdentifier
            if pid == owner { output(["own": true]) }
            else if app.activationPolicy == .regular {
                let point = CGEvent(source: nil)?.location ?? .zero
                output(["available": true, "hwnd": String(pid), "pid": Int(pid), "focus": focusToken(pid), "name": app.localizedName ?? "Ứng dụng", "title": "", "x": point.x, "y": point.y])
            } else { output(["available": false]) }
        }
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.45))
    }
} else if args.first == "files", (2...4).contains(args.count) {
    let paths = Array(args.dropFirst())
    if paths.allSatisfy({ $0.hasPrefix("/") && $0.hasSuffix(".png") && FileManager.default.fileExists(atPath: $0) }) {
        NSPasteboard.general.clearContents()
        output(["success": NSPasteboard.general.writeObjects(paths.map { NSURL(fileURLWithPath: $0) })])
    } else { output(["success": false, "error": "InvalidFiles"]) }
} else if args.first == "paste", args.count == 5, let pid = Int32(args[2]), let owner = Int32(args[4]), args[1] == String(pid) {
    // Permission is requested only after the user presses the photo button.
    let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
    if !AXIsProcessTrustedWithOptions(options) { output(["success": false, "error": "AccessibilityDenied"]) }
    else if let target = NSRunningApplication(processIdentifier: pid), !target.isTerminated {
        let current = NSWorkspace.shared.frontmostApplication?.processIdentifier
        if current != owner && current != pid { output(["success": false, "error": "TargetChanged"]) }
        else if !CGEventSource.flagsState(.combinedSessionState).intersection([.maskCommand, .maskControl, .maskAlternate, .maskShift]).isEmpty { output(["success": false, "error": "ReleaseModifierKeys"]) }
        else {
            target.activate(options: [.activateIgnoringOtherApps])
            RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.18))
            if NSWorkspace.shared.frontmostApplication?.processIdentifier != pid { output(["success": false, "error": "CannotActivateTarget"]) }
            else if args[3] != "0" && focusToken(pid) != args[3] { output(["success": false, "error": "InputChanged"]) }
            else if let down = CGEvent(keyboardEventSource: nil, virtualKey: 9, keyDown: true), let up = CGEvent(keyboardEventSource: nil, virtualKey: 9, keyDown: false) {
                down.flags = .maskCommand; up.flags = .maskCommand
                down.post(tap: .cghidEventTap); up.post(tap: .cghidEventTap)
                output(["success": true])
            } else { output(["success": false, "error": "PasteBlocked"]) }
        }
    } else { output(["success": false, "error": "TargetClosed"]) }
} else { output(["success": false, "error": "InvalidCommand"]) }
