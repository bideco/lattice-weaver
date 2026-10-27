# Lattice: Installation and Setup Guide

**Lattice** is local couch co-op on one PC. Multiple players share a single computer, each with their own mouse, keyboard, and game window. **Lattice Weaver** is the companion app that claims each player's devices, binds them to a player slot, and routes them into supported games. A per-game adapter receives that input. This guide covers the **Minecraft** adapter (a Fabric mod). Paralives and the other adapters are covered in the [README](README.md).

---

## Requirements

- **Windows 10 or 11.** Weaver runs on Windows. A macOS build is in alpha.
- **Administrator rights.** Weaver needs them to set up devices, and will prompt for elevation on launch.
- **Two or more USB mice and keyboards** (one set per player; P0 can use the PC's main set).
- **Minecraft Java**, supported versions `1.20` to `26.1.2`, Fabric-based.
- **Fabric Loader 0.15 or newer** and **Fabric API** for your Minecraft version.
- **Java**, whatever your Minecraft version requires; your launcher handles this.
- **A Lattice Weaver license for more than two players.** Weaver is free for up to two players, with no time limit. A one-time lifetime license ($17 USD) unlocks more player seats, additional features, and the licensed adapters. A Supporter tier ($29 USD) sits above it. Available at [bide.cx](https://bide.cx).

---

## 1. Install the Mod

1. Install [Fabric Loader](https://fabricmc.net/use/) for your Minecraft version.
2. Download [Fabric API](https://modrinth.com/mod/fabric-api) and place it in your `mods/` folder. [Mod Menu](https://modrinth.com/mod/modmenu) is optional but gives you the in-game config screen.
3. Copy the matching mod JAR into each player's `mods/` folder:

   | Minecraft version | Jar |
   |---|---|
   | 1.20 | `latticework-2.0.0+1.20.jar` |
   | 1.20.1 to 1.20.6 | `latticework-2.0.0+1.20.1-1.20.6.jar` |
   | 1.21 to 1.21.4 | `latticework-2.0.0+1.21-1.21.4.jar` |
   | 1.21.5 | `latticework-2.0.0+1.21.5.jar` |
   | 1.21.6 to 1.21.8 | `latticework-2.0.0+1.21.6-1.21.8.jar` |
   | 1.21.9 to 1.21.11 | `latticework-2.0.0+1.21.9-1.21.11.jar` |
   | 26.1 to 26.1.2 | `latticework-2.0.0+26.1-26.1.2.jar` |

Jars are on [Modrinth](https://modrinth.com/mod/latticework) and [GitHub Releases](https://github.com/bideco/lattice-weaver/releases).

---

## 2. Configure Game Instances

Each player needs a separate Minecraft instance. Use a launcher that supports multiple instances (MultiMC, Prism Launcher, or the official launcher with separate profiles).

### Player Slot (Required)

Each instance must declare its player slot:

```
-Dlattice.player=0    # First player  (P0)
-Dlattice.player=1    # Second player (P1)
-Dlattice.player=2    # Third player  (P2, etc.)
```

Two ways to set it:

- **Let Weaver do it.** **Games → Assign Minecraft Player Slots** detects MultiMC and Prism instance roots and writes the argument for you. Setup Doctor also flags instances that are missing it.
- **By hand.** Add it to the JVM arguments in your launcher's instance settings.

### In-Game Config

The mod adds a config screen accessible via **Mod Menu** (if installed) or by editing `config/lattice.properties` directly. The screen is **scrollable** (mouse wheel) so it works on small windows.

| Section | Setting | Default | Description |
|---|---|---|---|
| Input Capture | Override Input | PIPED | Master soft-pause toggle. **PIPED** = mod processes routed input. **OS** = mod drains input without dispatching, so OS keystrokes flow to the window normally. Useful for typing in chat or alt-tabbing without breaking capture. |
| Input Capture | Toggle Hotkey | Home | Cycles through Home, End, Insert, Delete, PgUp, PgDn, Pause, ScrLk, F1 to F12. The in-game key that flips Override Input. |
| Input Capture | Capture on Launch | OFF | Automatically enter captured mode the moment the pipe connects |
| Input Capture | Mouse Speed | 100% | Per-slot pointer speed (25 to 200%) |
| Window | Remove Border When Captured | ON | Strips the title bar and window chrome while captured |
| Window | Restore Border on Toggle | ON | Re-adds the border when capture toggles off (borders always restore on companion disconnect regardless) |
| HUD | Player Label | ON | Shows "P0", "P1", and so on in the HUD |
| HUD | Connection Dot | ON | Green or red dot showing pipe connection status |
| HUD | Capture Indicator | ON | Shows the current capture state |
| HUD | P0 Slot Board | ON | P0's overview of every player slot |
| HUD | Current Server / World | OFF | Shows the server or world name |
| HUD | FPS | OFF | Shows frames per second |
| HUD | Coordinates | OFF | Shows player coordinates |
| HUD | Custom Player Label | (empty) | Override the default label with custom text |
| HUD | Toasts | ON | Pop-up notifications for state changes |
| Developer | Debug Overlay | OFF | On-screen input debug overlay |
| Developer | Event Logging | OFF | Logs every dispatched event to the game log |

The config screen includes a **live HUD preview** so changes are visible in real time.

P0 also gets a **master settings screen** to control P1+ instances: audio and video settings, resource packs, and per-slot profiles, where supported.

---

## 3. Set Up Lattice Weaver (Companion)

Lattice Weaver is a single executable: `lattice-weaver.exe`.

### First Run

Lattice Weaver is not code-signed yet. On first run, Windows SmartScreen may warn that the publisher is unknown. Click **More info**, then **Run anyway**. A signed build is planned. The Minecraft mod jars are unaffected.

1. Place `lattice-weaver.exe` somewhere convenient. It creates `%ProgramData%\Lattice\` on first run and keeps its config and logs there.
2. Run it. It will ask for **Administrator** rights and relaunch elevated; device setup needs them.
3. Open **Setup & Repair** (`X`) and run **Setup Doctor**. It checks that Weaver has what it needs, then hands off to **guided setup**.
4. **Guided setup identifies devices by physical input**: it asks you to move the mouse you want for a slot, then press a key on the keyboard you want. Whatever you actuate is assigned to that slot. There is no list of cryptic device IDs to decode.
5. Weaver then claims each P1+ device and verifies the result. This takes seconds, so leave the devices plugged in while it works.

Your assignments are saved, so this is a first-run task, not a per-session one.

### Device Claiming

To give a player a mouse and keyboard that only drive *their* game, Weaver **claims** those devices for exclusive use. While a device is claimed, Windows stops treating it as a regular mouse or keyboard. It no longer moves the desktop cursor or types into other windows, and Weaver routes it to that player's game instance instead.

- **P0 is never claimed.** Your main mouse and keyboard keep working normally across Windows.
- **Claiming needs Administrator rights.** That is the whole reason Weaver asks for elevation.
- **Releasing gives the device back.** **Setup & Repair → Release all devices** (or **Release one player**) reverts a claimed device to a normal Windows mouse or keyboard. Nothing is permanent.
- No separate driver download or install is required, and no reboot. Weaver handles it.

### Launch Order

1. **Start Lattice Weaver first.** It creates the named pipes immediately, even before you finish device setup.
2. **Launch each Minecraft instance.** They connect to their pipes (`\\.\pipe\latticework-N-out` and `-in`) automatically.
3. The HUD shows a green dot when the pipe links.

### Pause / Resume Routing

- **Alt+F8** pauses and resumes routing to P1+. It is read from the native P0 keyboard, so it works while a game window is focused.
- **Alt+F9** toggles the game window border.
- The system tray icon and the Actions menu also expose the pause toggle.
- Pausing **freezes input to the games without releasing devices.** It is not a teardown, and resuming is instant.
- Both hotkeys are configurable in **Settings**.

### Settings

Press `S` for Settings. You can set:

- **Language.** English and **Français**, applied live and remembered. Weaver's interface is fully translatable: a new language is a single translation file, so community translations can be dropped in.
- **Theme.** Several colour palettes (`T` cycles them).
- **Mouse speed.** Per slot, 25 to 200%.
- **Global hotkeys.** Pause and resume routing, and the window border toggle (these apply after restarting Weaver).
- **Keybinds.** Rebind Weaver's own single-letter shortcuts.

### Command-Line Flags

Run `lattice-weaver.exe --help` for the full list. The ones most users need:

| Flag | Description |
|---|---|
| `-h, --help` | Print the flag list and exit |
| `--debug` | Verbose debug logging to `%ProgramData%\Lattice\lattice-debug-YYYY-MM-DD.log` |
| `-p, --player-cap N` | Maximum number of players (default: 4). Pipes are created up front; profile selection clamps to this cap |
| `--unlock <KEY>` | One-time online activation of a license key. Run once per PC. |
| `--release-claimed-devices` | Release all device claims and clear the manifest |
| `--diagnostics-bundle` | Collect config, logs, and device state into a support bundle for `support@bide.cx` |
| `--export-setup <PATH>` / `--import-setup <PATH>` | Export or import your Weaver setup |

`--help` also lists device-setup and diagnostic flags that mirror what Setup & Repair does in the interface; you normally do not need them.

---

## 4. Window Layout Tips

- Position each Minecraft window before starting capture (side-by-side, stacked, and so on).
- With "Remove Border When Captured" on, the game window expands to fill the space previously occupied by the title bar and borders, then snaps back when borders return.
- Windows do **not** need to be focused to receive input. The companion writes directly to pipes regardless of focus.
- The mod automatically disables "Pause on Lost Focus" so all instances keep running.

---

## 5. Troubleshooting

| Issue | Fix |
| --- | --- |
| Weaver says setup needs Administrator | Relaunch Weaver and accept the elevation prompt. Device setup cannot run as a standard user. |
| Mod shows "OS" instead of "P0" | Lattice Weaver isn't running, or the pipe hasn't connected yet. Start the companion first. |
| HUD dot is red | Pipe disconnected. Check that Lattice Weaver is running and the player slot JVM arg matches. |
| Input reaches one window but nothing happens | The mod's "Override Input" toggle is set to **OS**. Flip it back to **PIPED** in the config screen (or press the in-game toggle hotkey). |
| A player's device shows as missing or needs checking | Open **Setup & Repair → Setup Doctor**; it names the device and the fix. |
| A claimed device needs to go back to normal Windows use | **Setup & Repair → Release all devices**, or release just that player's slot. |
| Weaver says a device is waiting on a deferred Windows restart | Unplug and re-plug that device's 2.4GHz dongle to finish. No reboot needed. |
| Companion can't find devices | Plug devices in before starting the companion. Hot-plug is supported but enumeration needs at least one of each at startup. |
| A routed mouse moves the wrong distance | Run **Setup & Repair → Calibrate Devices**. |
| Stuck keys after pausing routing | Pause and resume once, or press and release the stuck key. |
| Window borders won't restore | Borders always restore on companion disconnect. If capture was toggled off and borders didn't restore, enable "Restore Border on Toggle" in config. |
| `--player-cap` rejected the profile | The saved profile has more players than the cap. Either rerun with `-p N` set higher or remove players from the profile. |
| Something else | Run `--diagnostics-bundle` and send the bundle to `support@bide.cx`. |
