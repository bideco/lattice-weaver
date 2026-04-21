# Lattice — Installation & Setup Guide

**Lattice** is a local-splitscreen system for Minecraft. Multiple players share one PC, each with their own mouse, keyboard, and game instance. A **Fabric mod** receives per-device input events over named pipes from **Lattice Weaver**, the companion app that captures and routes every mouse and keyboard.

---

## Requirements

- **Windows 10/11** (companion uses Win32 Raw Input, LL hooks, and the Interception driver)
- **Two or more USB mice and keyboards** (one set per player)
- **Java 21+** for the runtime; **JDK 22** recommended for building from source
- **Fabric Loader 0.15+** and **Fabric API** for your MC version
- **Minecraft** — supported versions: 1.20.1, 1.21.1, 1.21.8, 1.21.10, 26.1
- **Interception kernel driver** (recommended — see [Interception Driver](#5-interception-driver) below)
- **Lattice Weaver license** — 45-minute active-playtime trial, then a one-time $14.99 key unlocks unlimited use. Purchased at the Polar storefront (link on Modrinth page).

---

## 1. Install the Mod

1. Install [Fabric Loader](https://fabricmc.net/use/) for your Minecraft version.
2. Download [Fabric API](https://modrinth.com/mod/fabric-api) and place it in your `mods/` folder.
3. Copy the matching mod JAR into each player's `mods/` folder:
   - `latticework-1.0.0+1.20.1.jar` — for MC 1.20.1
   - `latticework-1.0.0+1.21.1.jar` — for MC 1.21.1
   - `latticework-1.0.0+1.21.8.jar` — for MC 1.21.8
   - `latticework-1.0.0+1.21.10.jar` — for MC 1.21.10
   - `latticework-1.0.0+26.1.jar` — for MC 26.1

---

## 2. Configure Game Instances

Each player needs a separate Minecraft instance. Use a launcher that supports multiple instances (MultiMC, Prism Launcher, or the official launcher with separate profiles).

### JVM Argument (Required)

Each instance must declare its player slot:

```
-Dlattice.player=0    # First player  (P0)
-Dlattice.player=1    # Second player (P1)
-Dlattice.player=2    # Third player  (P2, etc.)
```

Add this to the JVM arguments in your launcher's instance settings.

### In-Game Config

The mod adds a config screen accessible via **Mod Menu** (if installed) or by editing `config/lattice.properties` directly. The screen is fully **scrollable** (mouse wheel) so it works on small windows.

| Section | Setting | Default | Description |
|---|---|---|---|
| Input Capture | Unlock Instance | Locked | Master soft-pause toggle. **Locked** = mod processes piped input. **Free** = mod drains input without dispatching, OS keystrokes flow to the window normally. Useful for typing in chat or alt-tabbing without breaking capture. |
| Input Capture | Toggle Key | Home | Cycles through Home, End, Insert, Delete, PgUp, PgDn, Pause, ScrLk, F1–F12 — the in-game key that flips Unlock Instance |
| Input Capture | Capture on Launch | OFF | Automatically enter captured mode the moment the pipe connects |
| Window Behavior | Remove Border When Captured | ON | Strips the title bar / window chrome while captured |
| Window Behavior | Restore Border On Toggle | ON | Re-adds the border when capture toggles off (borders always restore on companion disconnect regardless) |
| HUD | Player Label | ON | Shows "P0"/"P1"/etc. in the HUD |
| HUD | Connection Indicator | ON | Green/red dot showing pipe connection status |
| HUD | Capture Indicator | ON | Shows "LOCKED" or "FREE" capture state |
| HUD | Custom Player Label | (empty) | Override the default label with custom text |
| HUD | Toasts | ON | Pop-up notifications for state changes |
| Developer | Debug Overlay | OFF | On-screen input debug overlay |
| Developer | Event Logging | OFF | Logs every dispatched event to game log |

The config screen includes a **live HUD preview** so changes are visible in real time.

---

## 3. Set Up Lattice Weaver (Companion)

The companion is a single executable: `lattice-weaver.exe` (in `companion/target/release/`).
### First Run

1. Place `lattice-weaver.exe` somewhere convenient (it will create `%ProgramData%\Lattice\` on first run).
2. Open a terminal and run it. The companion enumerates connected mice and keyboards.
3. **Create a profile**: assign one mouse and one keyboard to each player slot (P0, P1, …).
4. The profile is saved to `%ProgramData%\Lattice\lattice.toml`. Named profiles live in `%ProgramData%\Lattice\profiles\`.

### Launch Order

1. **Start Lattice Weaver first** — it creates the named pipes immediately, even before you finish profile selection.
2. **Launch each Minecraft instance** — they connect to their pipe (`\\.\pipe\latticework-N-out` / `-in`) automatically.
3. The HUD shows a green dot when the pipe links.

### Capture Toggle

- **Press End** (on any keyboard) to flip the companion's global capture state.
- The system tray icon also exposes a toggle.
- **Capture ON** — all input is routed exclusively to the assigned game instance.
- **Capture OFF** — P0 devices pass through to the OS as normal input; P1+ devices still route only to their game instance (never leak to the OS).

### Command-Line Flags

Run `lattice-weaver.exe --help` to see all flags.

| Flag | Description |
|---|---|
| `-h, --help` | Print the flag list and exit |
| `--debug` | Verbose debug logging to `%ProgramData%\Lattice\lattice-debug.log` |
| `-f, --force-fallback` | Skip the Interception driver and use Raw Input + LL hooks (default backend is Interception) |
| `-p, --player-cap N` | Maximum number of players (default: 4). Pipes are created up front; profile selection clamps to this cap |
| `--unlock <KEY>` | One-time online activation of a license key. Verifies the key's signature offline, POSTs `{key_id, machine_id}` to `https://lattice.bide.cx/activate`, writes the returned activation token to `%ProgramData%\Lattice\license.dat`, and exits. Run once per PC. |

## 4. Window Layout Tips

- Position each Minecraft window before starting capture (side-by-side, stacked, etc.).
- With "Remove Border When Captured" on, the game window expands to fill the space previously occupied by the title bar / borders, then snaps back when borders return.
- Windows do **not** need to be focused to receive input — the companion writes directly to pipes regardless of focus.
- The mod automatically disables "Pause on Lost Focus" so all instances keep running.

---

## 5. Interception Driver

The Interception kernel driver is the **default backend** as of v1.0.0. It intercepts input below the Windows message pump, giving true per-device keyboard isolation that the Raw Input + LL hook fallback cannot match.

### Why It's the Default

Windows LL keyboard hooks suppress `WM_INPUT` for keyboards, so the fallback backend cannot tell which physical keyboard sent a keystroke. Result: P0 keyboard input always leaks to the OS in fallback mode (P0 mouse is still isolated correctly via SendInput re-injection). With Interception active, every device — keyboard and mouse — is fully isolated when capture is on, and only P0 passes through when capture is off.

### Installing the Driver

Lattice Weaver ships with `interception.dll` embedded inside the exe and will extract it next to `lattice-weaver.exe` on first run if missing. You only need to install the kernel driver itself:

1. Download the installer from [github.com/oblitum/Interception](https://github.com/oblitum/Interception).
2. Run with `/install`:
   ```
   install-interception.exe /install
   ```
3. **Reboot** (required — kernel driver).

On startup, if the driver isn't detected, Lattice Weaver prompts in the TUI to download and run the installer and surfaces the reboot/retry path.

### Using the Backend

- **Default**: just run `lattice-weaver.exe`. The companion loads `interception.dll` at startup. If the driver isn't installed it falls back automatically and prints a warning.
- **Force fallback**: `lattice-weaver.exe --force-fallback` (or `-f`) skips the Interception attempt and uses Raw Input + LL hooks directly. Useful for diagnosing whether a problem is in the Interception backend.

### Composite HID Devices

Many "macro" keyboards expose multiple HID collections (system keys + media keys + macro keys) under different Interception IDs but the same VID/PID. The companion coalesces these by device name so a keystroke from any sub-collection routes to the same player.

### Safety

- **End key** is always passed through, regardless of backend, as a global panic-toggle.
- If the companion crashes, the panic hook releases the Interception filter and restores the cursor before exiting.
- Uninstall the driver with `install-interception.exe /uninstall` + reboot.

---

## 6. Troubleshooting

| Issue                                               | Fix                                                                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mod shows "OS" instead of "P0"                      | Lattice Weaver isn't running, or the pipe hasn't connected yet. Start the companion first.                                                                                           |
| HUD dot is red                                      | Pipe disconnected. Check that Lattice Weaver is running and the player slot JVM arg matches.                                                                                         |
| Input reaches one window but nothing happens        | The mod's "Unlock Instance" toggle is set to **Free** — flip it back to **Locked** in the config screen (or press the in-game toggle key).                                           |
| P0 keyboard leaks to the OS even when capture is on | You're running the fallback backend (Interception didn't load). Install the Interception driver and reboot, or check `%ProgramData%\Lattice\lattice-debug.log` for the load failure. |
| Companion can't find devices                        | Plug devices in before starting the companion. Hot-plug is supported but enumeration needs at least one of each at startup.                                                          |
| Stuck keys after toggling capture                   | Toggle capture off and on, or press and release the stuck key once.                                                                                                                  |
| Window borders won't restore                        | Borders always restore on companion disconnect. If capture was toggled off and borders didn't restore, enable "Restore Border On Toggle" in config.                                  |
| `--player-cap` rejected the profile                 | The saved profile has more players than the cap. Either rerun with `-p N` set higher or remove players from the profile file.                                                        |
