# Changelog

All notable changes to Lattice Weaver and the latticework Minecraft mod are recorded here.

## 2.0.0

Lattice v2.0.0 is a full generational step for the companion app and the Minecraft adapter. Setup is faster and simpler, device handling is more reliable, the companion has an all-new interface, and the first macOS build arrives in alpha.

### Device claiming and setup

- **Claim a device in place.** Claiming a mouse or keyboard no longer asks you to unplug, replug, or restart the PC. Weaver activates what it needs and the device is ready in the same sitting. Setup now runs in a straight line, from plugging in to playing.
- **Much faster claims.** The claim step is dramatically quicker than before. A step that used to stall for the better part of a minute now completes promptly.
- **All-in-one devices route completely.** When one device presents several inputs on a single connection, every input from that device is claimed and routed to the same player. An all-in-one unit now works as a single seat instead of splitting into pieces.
- **Reliable with identical devices.** Two or more identical mice or keyboards are now told apart by their physical connection, so each is claimed to the correct player and stays there across reconnections and port changes.
- **Cleaner release.** Releasing a device returns it to normal use reliably, including when a device was left in a pending state, and no longer blocks on a stalled device.
- **Built-in diagnostics.** A no-admin diagnostics collector and an in-app submit-for-review flow make it easy to send a report when something needs a closer look.

### Mouse and keyboard input

- **Smarter mouse calibration.** Calibration works immediately and learns a mouse's button, axis, and scroll layout from normal use. A guided manual calibration is always the final authority, so any mouse can be mapped exactly. Clicks and scrolling land where you expect.
- **No stuck keys.** Held keys are cleared correctly when input hands off or a device drops, so a key is never left pressed after routing changes.
- **No doubled input.** Duplicate key and character reports from devices that expose several input collections are filtered out, so typing and key presses register once.

### Routing state and safety

- **Clear routing state.** In supported games, each instance shows a plain **PAUSED** or **DISCONNECTED** state when its input is not live, so you can see at a glance which players are active.
- **No surprise resume.** When a device reconnects, routing does not switch back on by itself. Turning input back on is always a deliberate choice, so input never reaches a player who is not ready for it.

### Weaver companion app: all-new interface

- **A new graphical companion app.** The companion has been rebuilt with a full graphical interface that replaces the previous text-based one. It covers the dashboard, guided setup, per-player slot cards, settings, the Setup Doctor, games, diagnostics, and help.
- **Guided setup and Setup Doctor.** A step-by-step wizard walks you through claiming each player's devices, and the Setup Doctor checks your system and points at anything that needs attention.
- **Themes and icon packs.** A runtime theme system with a wide palette of looks, plus swappable icon packs, so the app can match your taste.
- **System tray behaviour.** Minimize to tray, restore to front, configurable close behaviour, and an optional launch on startup.
- **Guided-calibration hotkey and overlay.** A system-wide hotkey starts guided mouse calibration from anywhere, and the calibration view can stay on top while you work.
- **Headless and command-line modes retained.** For automation and advanced use, the app still runs without its window from a terminal.

### Minecraft (Java) adapter

- **In-game HUD.** Each instance shows its player slot and routing state in game.
- **Per-player virtual cursor.** Menu and inventory input stays with the right person.
- **Player 1 master controls.** The host can drive settings, resource packs, and per-slot profiles for the other instances.
- **Routed input stability.** Routed instances recover held keys on their own, and routed menu and cursor input was corrected across supported versions, including legacy 1.8.9.

### More supported games

- **Paralives.** Independent per-player cursor, scroll, click, keyboard, and UI input. Paralives itself is in early access.
- **The Sims 2 and The Sims 3.** Beta adapters that bring routed per-player input to both titles.

### Platforms

- **Windows: stable.**
- **macOS: alpha.** The first macOS build of the Weaver backend arrives in this release. It is early and we welcome player-testers.
- **Linux: planned.**

### Licensing

- **Free for up to two players, with no time limit.** The host plus one more seat is free forever.
- **One-time lifetime license.** Unlocks more player seats, additional features, and the licensed adapters.
- **Supporter tier.** An optional higher tier for people who want to back the project further.
- The earlier trial behaviour has been retired. There is no trial period and no per-title purchase.

### Localization

- **French.** The companion app is now available in French alongside English.

### Install note (unsigned builds)

Lattice Weaver is not code-signed on either platform yet. A signed build is planned for a future update. The Minecraft mod jars are unaffected.

- **Windows.** On first run, Windows SmartScreen may warn that the publisher is unknown. To continue, click **More info**, then **Run anyway**.
- **macOS (alpha).** The macOS build is unsigned and not notarized, so Gatekeeper will block the first launch with a message that the app is from an unidentified developer. To open it, Control-click (or right-click) the app and choose **Open**, then confirm in the dialog. If macOS still refuses, remove the quarantine flag in Terminal with `xattr -dr com.apple.quarantine /path/to/Lattice\ Weaver.app`.
