/* ==========================================================================
   Lattice Weaver. Interactive static replica. ALL behaviour is faked locally;
   nothing reads a device, performs activation, or talks to a backend.
   Strings, layout, colors and components are ported from companion/src/gui/*.
   ========================================================================== */
(function () {
  "use strict";

  // When embedded in an iframe (the bide.cx landing page), render transparent
  // so the page's lattice background shows through instead of an opaque block.
  try { if (window.self !== window.top) document.documentElement.classList.add("embedded"); }
  catch (e) { document.documentElement.classList.add("embedded"); }

  // ---- SVG icon set (custom vector icons, mirrors widgets.rs Icon enum) ------
  const ICON = {
    minimize: '<path d="M4 12h16"/>',
    maximize: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M4 12l5 6L20 5"/>',
    back: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
    chevdown: '<path d="M5 9l7 7 7-7"/>',
    chevright: '<path d="M9 5l7 7-7 7"/>',
    arrowright: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    copy: '<rect x="4" y="4" width="12" height="14" rx="2"/><rect x="8" y="8" width="12" height="14" rx="2"/>',
    extlink: '<path d="M6 18L18 6M9 6h9v9"/>',
    upload: '<path d="M12 16V5M7 10l5-5 5 5M5 19h14"/>',
    repair: '<path d="M20 11a8 8 0 1 0-2.3 6"/><path d="M20 5v6h-6"/>',
    reassign: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    mouse: '<rect x="8" y="3" width="8" height="18" rx="4"/><path d="M12 3v6"/>',
    keyboard: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 14h8"/>',
    warning: '<path d="M12 3l9 16H3z"/><path d="M12 9v5M12 17h.01"/>',
    close_x: '<path d="M6 6l12 12M18 6L6 18"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16h.01"/>',
  };

  function svg(name, cls) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" class="${cls || ""}">${ICON[name] || ""}</svg>`;
  }

  // The lattice jewel: outer stroked 45° square + inner filled 45° square.
  function jewelSVG() {
    return `<svg viewBox="0 0 24 24" width="100%" height="100%">
      <polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" stroke-width="2"/>
      <polygon points="12,7 17,12 12,17 7,12" fill="currentColor"/>
    </svg>`;
  }
  // Chunky-pixel jewel variant (Icon style: Chunky Pixel).
  function pixelJewelSVG() {
    const N = 9, cells = [];
    const half = N / 2, outer = half - 0.5;
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const dx = Math.abs(gx + 0.5 - half), dy = Math.abs(gy + 0.5 - half);
      const man = dx + dy;
      if (man <= outer && (man >= outer - 1.35 || man <= outer * 0.42))
        cells.push(`<rect x="${(gx / N * 24).toFixed(2)}" y="${(gy / N * 24).toFixed(2)}" width="${(24 / N * 0.86).toFixed(2)}" height="${(24 / N * 0.86).toFixed(2)}" fill="currentColor"/>`);
    }
    return `<svg viewBox="0 0 24 24" width="100%" height="100%">${cells.join("")}</svg>`;
  }

  // ---- hydrate static [data-icon] / [data-jewel] placeholders ----------------
  function hydrateIcons(root) {
    root.querySelectorAll("[data-icon]").forEach(el => {
      if (el.dataset.done) return;
      el.innerHTML = svg(el.dataset.icon);
      el.dataset.done = "1";
    });
    root.querySelectorAll("[data-jewel]").forEach(el => {
      el.innerHTML = (state.iconPack === "pixel" ? pixelJewelSVG() : jewelSVG());
    });
  }

  // ========================================================================
  // State
  // ========================================================================
  const state = {
    routing: "paused",          // 'paused' | 'active'
    theme: "lattice",
    font: "Sora",
    iconPack: "precision",
    trayBehavior: "Both",
    screen: "dashboard",
    settingsTab: "app",
    logOpen: true,
    players: [
      { role: "Native · you", km: "MOU", kk: "KEY", mouse: "Preview Mouse (P0)", kb: "Preview Keyboard (P0)", instance: "1.21.8 · active", profile: null },
      { role: "Claimed", km: "CMOU", kk: "CKEY", mouse: "Preview Mouse (P1)", kb: "Preview Keyboard (P1)", instance: null, profile: "LIVE" },
    ],
    toggles: { resume: false, verbose: false, forceLog: false, debug: false, launch: false },
  };

  const FONT_FAMILY = {
    "Sora": "'Sora', system-ui, sans-serif",
    "Chakra Petch": "'Chakra Petch', system-ui, sans-serif",
    "Space Grotesk": "'Space Grotesk', system-ui, sans-serif",
    "Saira": "'Saira', system-ui, sans-serif",
    "OpenDyslexic (dyslexia-friendly)": "'OpenDyslexic', 'Comic Sans MS', sans-serif",
  };
  const FONTS = Object.keys(FONT_FAMILY);
  const ICON_PACKS = [["precision", "Precision"], ["rounded", "Rounded"], ["pixel", "Chunky Pixel"]];
  const TRAY_OPTS = ["Neither", "Minimize to Tray", "Close to Tray", "Both"];

  const win = document.getElementById("window");

  // ========================================================================
  // Theme application. Recolors everything live via CSS custom properties.
  // ========================================================================
  function themeById(id) { return WEAVER_THEMES.find(t => t.id === id) || WEAVER_THEMES[0]; }

  function hexA(hex, a) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function applyTheme(id, withFade) {
    const t = themeById(id);
    const prevBg = getComputedStyle(win).getPropertyValue("--bg");
    const tk = t.tokens;
    const map = {
      "--bg": tk.bg, "--titlebar": tk.titlebar, "--panel": tk.panel, "--window-border": tk.window_border,
      "--card": tk.card, "--elevated": tk.elevated, "--row-bg": tk.row_bg, "--stroke": tk.stroke,
      "--stroke-hover": tk.stroke_hover, "--text": tk.text, "--muted": tk.muted, "--faint": tk.faint,
      "--text-disabled": tk.text_disabled, "--accent": tk.accent, "--accent-hover": tk.accent_hover,
      "--accent-active": tk.accent_active, "--ok": tk.ok, "--warn": tk.warn, "--bad": tk.bad,
    };
    for (const k in map) win.style.setProperty(k, map[k]);
    // Modal scrim: translucent overlay (theme.rs normalises to alpha 158/255).
    win.style.setProperty("--scrim", hexA(tk.scrim, 0.62));
    // P0 always tracks the accent; P1/P2/P3 are fixed (theme.rs slot_color).
    win.style.setProperty("--p0", tk.accent);
    state.theme = id;

    if (withFade) {
      const wash = document.createElement("div");
      wash.style.cssText = `position:absolute;inset:0;z-index:45;pointer-events:none;background:${prevBg};transition:opacity .18s ease;opacity:1`;
      win.appendChild(wash);
      requestAnimationFrame(() => { wash.style.opacity = "0"; });
      setTimeout(() => wash.remove(), 220);
    }
  }

  function applyFont(label) {
    state.font = label;
    win.style.setProperty("--ui-font", FONT_FAMILY[label]);
  }
  function applyIconPack(id) {
    state.iconPack = id;
    win.classList.remove("pack-precision", "pack-rounded", "pack-pixel");
    win.classList.add("pack-" + id);
    hydrateIcons(win); // re-draw jewels in the right variant
  }

  // ========================================================================
  // Header jewel / banner / capture reflect routing state.
  // ========================================================================
  function routingColorVar() { return state.routing === "active" ? "var(--ok)" : "var(--warn)"; }

  function renderRouting() {
    const banner = document.getElementById("banner");
    const cap = document.getElementById("captureBtn");
    const jewel = document.getElementById("headJewel");
    if (state.routing === "active") {
      banner.style.display = "none";
      cap.classList.add("active");
      jewel.style.color = "var(--ok)";
    } else {
      banner.style.display = "flex";
      cap.classList.remove("active");
      jewel.style.color = "var(--warn)";
    }
  }
  function toggleCapture() {
    state.routing = state.routing === "active" ? "paused" : "active";
    renderRouting();
    log(state.routing === "active" ? "Routing resumed." : "Routing paused.");
  }

  // ========================================================================
  // Event log
  // ========================================================================
  function log(msg) {
    const box = document.getElementById("logBox");
    const empty = box.querySelector(".empty");
    if (empty) empty.remove();
    const line = document.createElement("div");
    line.className = "line";
    line.textContent = msg;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  // ========================================================================
  // Dashboard
  // ========================================================================
  function slotColorVar(p) { return `var(--p${p % 4})`; }

  function renderSlots() {
    const grid = document.getElementById("slotsGrid");
    grid.innerHTML = "";
    const n = state.players.length;
    state.players.forEach((pl, p) => grid.appendChild(slotCard(pl, p)));
    if (n <= 1) grid.appendChild(emptyCard());
  }

  function devRow(kind, name) {
    return `<div class="dev-row">
      <span class="kind">${kind}</span>
      <span class="name">${name}</span>
      <span class="status">OK<span class="sdot"></span></span>
    </div>`;
  }

  function slotCard(pl, p) {
    const el = document.createElement("div");
    el.className = "slot-card";
    el.style.setProperty("--slotc", slotColorVar(p));
    const badgeStyle = `color:${slotColorVar(p)};background:color-mix(in srgb, ${slotColorVar(p)} 18%, transparent);border:1px solid color-mix(in srgb, ${slotColorVar(p)} 55%, transparent)`;
    const icons = p > 0
      ? `<div class="right">
           <span class="iconbtn" title="Repair this slot's device locks" data-icon="repair"></span>
           <span class="iconbtn" title="Manage players & devices" data-icon="reassign"></span>
         </div>` : "";
    let foot = "";
    if (pl.instance) foot = `<div class="chips"><span class="inst-chip">${pl.instance}</span></div>`;
    else if (p > 0) foot = `<span class="profile">Profile:<b>${pl.profile || "LIVE"}</b></span>`;
    el.innerHTML = `
      <div class="slot-head">
        <span class="slot-badge" style="${badgeStyle}">P${p}</span>
        <span class="slot-role">${pl.role}</span>
        ${icons}
      </div>
      ${devRow(pl.km, pl.mouse)}
      ${devRow(pl.kk, pl.kb)}
      <div class="slot-foot">${foot}</div>`;
    hydrateIcons(el);
    el.querySelectorAll(".iconbtn").forEach(b => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const which = b.title.indexOf("Repair") === 0 ? "repair" : "reassign";
      if (which === "repair") { toast("Repaired P" + p + "'s device locks (demo)."); log(`Repaired P${p} device locks.`); }
      else { toast("Reassign is visual-only in this demo."); }
    }));
    el.addEventListener("click", () => {
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 220);
    });
    return el;
  }

  function emptyCard() {
    const el = document.createElement("div");
    el.className = "slot-card slot-empty";
    el.style.setProperty("--slotc", "var(--p1)");
    el.innerHTML = `
      <span class="wv-jewel" style="width:40px;height:40px;color:var(--accent)" data-jewel></span>
      <div class="t1">No players yet</div>
      <div class="t2">Plug in a mouse and keyboard for each extra player, then run setup.</div>
      <button class="btn primary" id="emptyRunSetup" style="margin-top:10px">Run setup</button>
      <div class="t3">Your own mouse and keyboard stay yours.</div>`;
    hydrateIcons(el);
    el.querySelector("#emptyRunSetup").addEventListener("click", (e) => { e.stopPropagation(); openWizard(); });
    return el;
  }

  // ========================================================================
  // Settings
  // ========================================================================
  function toggleEl(key) {
    const t = document.createElement("div");
    t.className = "toggle" + (state.toggles[key] ? " on" : "");
    t.innerHTML = '<div class="knob"></div>';
    t.addEventListener("click", () => {
      state.toggles[key] = !state.toggles[key];
      t.classList.toggle("on", state.toggles[key]);
    });
    return t;
  }

  function settingCard(title, body, controlEl) {
    const c = document.createElement("div");
    c.className = "setting";
    c.innerHTML = `<div class="meta"><div class="st">${title}</div><div class="sb">${body}</div></div>`;
    const ctrl = document.createElement("div");
    ctrl.className = "control";
    if (Array.isArray(controlEl)) controlEl.forEach(e => ctrl.appendChild(e));
    else ctrl.appendChild(controlEl);
    c.appendChild(ctrl);
    return c;
  }

  // generic dropdown
  function dropdown(opts, current, onPick, renderOpt) {
    const d = document.createElement("div");
    d.className = "wv-select";
    const labelOf = (o) => (typeof o === "string" ? o : o.label);
    d.innerHTML = `<div class="cur"><span class="curlabel">${labelOf(current)}</span>${svg("chevdown")}</div><div class="menu"></div>`;
    const menu = d.querySelector(".menu");
    opts.forEach(o => {
      const opt = document.createElement("div");
      opt.className = "opt" + (labelOf(o) === labelOf(current) ? " sel" : "");
      opt.innerHTML = renderOpt ? renderOpt(o) : labelOf(o);
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        d.querySelector(".curlabel").textContent = labelOf(o);
        d.classList.remove("open");
        menu.querySelectorAll(".opt").forEach(x => x.classList.remove("sel"));
        opt.classList.add("sel");
        onPick(o);
      });
      menu.appendChild(opt);
    });
    d.querySelector(".cur").addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".wv-select.open").forEach(x => { if (x !== d) x.classList.remove("open"); });
      d.classList.toggle("open");
    });
    return d;
  }

  function renderSettings() {
    const app = document.getElementById("settingsApp");
    app.innerHTML = "";
    app.appendChild(settingCard("Always Resume", "Resume routing automatically when the weaver reconnects. Off by default.", toggleEl("resume")));
    app.appendChild(settingCard("Verbose event log", "Show debug rows in the log and write a debug file.", toggleEl("verbose")));
    app.appendChild(settingCard("Force event log everywhere", "Debug | show the log and tips on every screen, not just the Dashboard.", toggleEl("forceLog")));
    app.appendChild(settingCard("Debug component overlay", "Debug | highlight the interface component under the pointer and show its internal code name, position, and size.", toggleEl("debug")));
    app.appendChild(settingCard("Minimize &amp; close buttons", "Choose whether the minimize and close buttons hide Lattice to the tray. Quit, from the tray menu, always quits.",
      dropdown(TRAY_OPTS, state.trayBehavior, (o) => { state.trayBehavior = o; })));
    app.appendChild(settingCard("Launch on startup", "Start Lattice when you sign in to Windows.", toggleEl("launch")));
    const exp = document.createElement("button"); exp.className = "btn secondary"; exp.textContent = "Export…";
    const imp = document.createElement("button"); imp.className = "btn secondary"; imp.textContent = "Import…";
    exp.addEventListener("click", () => toast("Export is visual-only in this demo."));
    imp.addEventListener("click", () => toast("Import is visual-only in this demo."));
    app.appendChild(settingCard("Setup file", "Save or restore your binding setup.", [exp, imp]));

    const th = document.getElementById("settingsTheme");
    th.innerHTML = "";
    const themeCur = { label: themeById(state.theme).name };
    const themeDd = dropdown(
      WEAVER_THEMES.map(t => ({ label: t.name, id: t.id, t })),
      themeCur,
      (o) => applyTheme(o.id, true),
      (o) => {
        const sw = [o.t.tokens.accent, o.t.tokens.ok, o.t.tokens.warn, o.t.tokens.bad]
          .map(c => `<i style="background:${c}"></i>`).join("");
        return `<span>${o.label}</span><span class="sw">${sw}</span>`;
      }
    );
    th.appendChild(settingCard("Theme", "Color palette for the whole app. Press T to cycle.", themeDd));
    th.appendChild(settingCard("UI font", "Typeface for the interface.",
      dropdown(FONTS, state.font, (o) => applyFont(o))));
    th.appendChild(settingCard("Icon style", "Shape language for the app's icons.",
      dropdown(ICON_PACKS.map(p => ({ label: p[1], id: p[0] })), { label: "Precision" }, (o) => applyIconPack(o.id))));
    // keep theme dropdown label synced with hotkey-cycling
    window._syncThemeLabel = () => { const l = themeDd.querySelector(".curlabel"); if (l) l.textContent = themeById(state.theme).name; };
  }

  // ========================================================================
  // Games
  // ========================================================================
  function renderGames() {
    const list = document.getElementById("gamesList");
    const col = (p) => `var(--p${p})`;
    const games = [
      { ic: "M(", p: 0, name: "Minecraft (Java)", meta: "fabric_mod · versions 1.20.x, 1.21.x, 26.1.x", act: `<button class="btn secondary">MultiMC setup…</button>` },
      { ic: "P", p: 1, name: "Paralives", meta: "bepinex_plugin · versions early-access", act: "" },
      { ic: "TS", p: 2, name: "The Sims 2 (beta)", meta: "generic_window · versions Ultimate Collection, Legacy Collection, Retail disc / EP / SP", act: "" },
      { ic: "TS", p: 3, name: "The Sims 3 (beta)", meta: "native_proxy · versions 1.67, 1.69", note: "Native adapter update available", act: `<button class="btn primary">Update</button><button class="btn danger">Uninstall</button>` },
    ];
    list.innerHTML = games.map(g => `
      <div class="game-card">
        <div class="game-ic" style="color:${col(g.p)};background:color-mix(in srgb, ${col(g.p)} 18%, transparent)">${g.ic}</div>
        <div class="meta">
          <div class="gn">${g.name}</div>
          <div class="gd">${g.meta}</div>
          ${g.note ? `<div class="gnote">${g.note}</div>` : ""}
        </div>
        <div class="acts">${g.act}</div>
      </div>`).join("");
  }

  // ========================================================================
  // Setup Doctor
  // ========================================================================
  const DOCTOR_CHECKS = [
    { name: "Access", state: "pass", detail: "Administrator access is available for setup operations." },
    { name: "Device helper", state: "pass", detail: "Device isolation helper is ready at C:\\Users\\Nicholas\\AppData\\Local\\Lattice\\claim-driver\\wdi-simple.exe." },
    { name: "Device selection", state: "next", detail: "Guided setup will identify P0, then each P1+ mouse and keyboard by physical input.", action: "Continue to guided setup." },
    { name: "Isolation", state: "next", detail: "Weaver will apply and verify device isolation after device selection.", action: "Do not unplug devices while isolation is being updated." },
    { name: "Minecraft slots", state: "next", detail: "No known MultiMC/Prism root was detected automatically.", action: "Use Games -> Assign Minecraft Player Slots if you use Minecraft." },
  ];
  function glyphChip(st) {
    if (st === "pass") return `<div class="glyph-chip pass"><div class="circle"></div>${svg("check")}</div>`;
    // Next/Warn → diamond + (arrow or exclamation). Next uses arrow-right.
    const inner = st === "next" ? svg("arrowright") : svg("warning");
    return `<div class="glyph-chip warn"><div class="diamond"></div>${inner}</div>`;
  }
  function renderDoctor() {
    const host = document.getElementById("doctorChecks");
    host.innerHTML = DOCTOR_CHECKS.map(c => `
      <div class="check ${c.state === "blocked" ? "blocked" : ""}">
        ${glyphChip(c.state)}
        <div class="meta">
          <div class="cn">${c.name}</div>
          <div class="cd">${c.detail}</div>
          ${c.action ? `<div class="ca">Next: ${c.action}</div>` : ""}
        </div>
        <div class="tag ${c.state === "pass" ? "pass" : "warn"}">${c.state === "pass" ? "PASS" : "WARN"}</div>
      </div>`).join("");
    host.querySelectorAll(".glyph-chip, .check svg").forEach(() => {});
  }

  // ========================================================================
  // Navigation
  // ========================================================================
  function go(screen) {
    state.screen = screen;
    document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.dataset.screen === screen));
    document.querySelectorAll(".navbtn[data-nav]").forEach(b => b.classList.toggle("active", b.dataset.nav === screen));
    // tips + log show only on the dashboard (mod.rs footer_dash)
    const dash = screen === "dashboard";
    document.getElementById("tips").style.display = dash ? "flex" : "none";
    document.querySelector(".wv-log").style.display = dash ? "block" : "none";
    fit(); // window height changes per screen; keep the scaler box in sync
  }

  // Responsive scaler. Fit the fixed 760px window without x-scroll. Module scope
  // so navigation / renders can re-sync the scaled layout box height.
  function fit() {
    const scaler = document.getElementById("scaler");
    if (!scaler) return;
    const avail = Math.min(window.innerWidth - 32, 760);
    const scale = Math.min(1, avail / 760);
    scaler.style.width = "760px";
    scaler.style.transform = `scale(${scale})`;
    scaler.style.height = (win.offsetHeight * scale) + "px";
  }

  // ========================================================================
  // Modals
  // ========================================================================
  const scrim = document.getElementById("scrim");
  function openModal(html, onClose) {
    scrim.innerHTML = html;
    scrim.classList.add("show");
    hydrateIcons(scrim);
    scrim._onClose = onClose || null;
    return scrim.firstElementChild;
  }
  function closeModal() {
    scrim.classList.remove("show");
    scrim.innerHTML = "";
    if (scrim._onClose) { const f = scrim._onClose; scrim._onClose = null; f(); }
  }
  scrim.addEventListener("click", (e) => { if (e.target === scrim) closeModal(); });

  // ---- Guided setup wizard ----
  let wizardCount = 2;
  function openWizard() {
    wizardCount = Math.max(2, state.players.length);
    const choices = [[2, "you + P1"], [3, "you + P1 + P2"], [4, "you + 3 more"]];
    openModal(`
      <div class="modal">
        <div class="mhead">
          <span class="jewel" style="color:var(--accent)" data-jewel></span>
          <div>
            <div class="mt">Guided setup</div>
            <div class="ms">Bind a mouse and keyboard to each extra player.</div>
          </div>
          <span class="x iconbtn" data-icon="close" data-close></span>
        </div>
        <div style="margin-top:12px;font-size:var(--sz-body)">How many people are playing?</div>
        <div class="count-grid">
          ${choices.map(c => `<div class="count-card ${c[0] === wizardCount ? "sel" : ""}" data-n="${c[0]}">
            <div class="n">${c[0]}</div><div class="sub">${c[1]}</div></div>`).join("")}
        </div>
        <div class="modal-actions"><div class="right"><button class="btn primary" data-start>Start binding ${/*arrow*/""}<span data-icon="arrowright"></span></button></div></div>
      </div>`);
    scrim.querySelectorAll(".count-card").forEach(c => c.addEventListener("click", () => {
      wizardCount = parseInt(c.dataset.n, 10);
      scrim.querySelectorAll(".count-card").forEach(x => x.classList.toggle("sel", x === c));
    }));
    scrim.querySelector("[data-close]").addEventListener("click", closeModal);
    scrim.querySelector("[data-start]").addEventListener("click", () => startGuided(wizardCount));
  }

  // ---- Guided hero (scripted move-to-select walkthrough) ----
  let guidedTimer = null;
  function startGuided(count) {
    // build the queue of (slot, kind) capture steps for new routed players
    const steps = [];
    for (let p = 1; p < count; p++) { steps.push([p, "mouse"]); steps.push([p, "keyboard"]); }
    // reset players to just host; guided rebuilds routed slots
    state.players = [state.players[0]];
    runGuidedStep(steps, 0, count);
  }

  function stepperHTML(slot) {
    return `<div class="stepper">
      <div class="step"><div class="node done">${svg("check")}</div><div class="lbl done">Players</div></div>
      <div class="connector done"></div>
      <div class="step"><div class="node active">2</div><div class="lbl active">P${slot} devices</div></div>
      <div class="connector pending"></div>
      <div class="step"><div class="node pending">3</div><div class="lbl pending">Confirm</div></div>
    </div>`;
  }

  function runGuidedStep(steps, i, count) {
    if (i >= steps.length) return guidedSuccess();
    const [slot, kind] = steps[i];
    const badgeStyle = `color:var(--p${slot % 4});background:color-mix(in srgb, var(--p${slot % 4}) 18%, transparent);border:1px solid color-mix(in srgb, var(--p${slot % 4}) 55%, transparent)`;
    const title = kind === "mouse" ? `Move P${slot}'s mouse now` : `Press any key on P${slot}'s keyboard now`;
    const ask = kind === "mouse" ? "Give it a wiggle." : "Tap any key.";
    const m = openModal(`
      <div class="modal" style="--slotc:var(--p${slot % 4})">
        <div class="mhead">
          <div class="mt">Guided setup</div>
          <span class="slot-badge" style="${badgeStyle};margin-left:8px">P${slot}</span>
          <span class="x iconbtn" data-icon="close" data-cancel></span>
        </div>
        ${stepperHTML(slot)}
        <div class="guided-center">
          <div class="pulse-ring">
            <span class="r"></span><span class="r"></span><span class="r"></span>
            <span class="icon" data-icon="${kind === "mouse" ? "mouse" : "keyboard"}"></span>
          </div>
          <div class="gtitle">${title}</div>
          <div class="glisten">Listening for input…</div>
          <div class="gask">${ask}</div>
          <button class="btn secondary" data-skip style="margin-top:12px">Skip ${kind}</button>
          <div class="gskip-note">No spare for this slot? Bind just one device.</div>
        </div>
      </div>`, () => { if (guidedTimer) clearTimeout(guidedTimer); });
    hydrateIcons(scrim);
    const advance = () => {
      if (guidedTimer) clearTimeout(guidedTimer);
      // when completing a player's keyboard step, materialise the slot
      if (kind === "keyboard") {
        state.players.push({ role: "Claimed", km: "CMOU", kk: "CKEY", mouse: `Preview Mouse (P${slot})`, kb: `Preview Keyboard (P${slot})`, instance: null, profile: "LIVE" });
        renderSlots();
      }
      runGuidedStep(steps, i + 1, count);
    };
    scrim.querySelector("[data-cancel]").addEventListener("click", () => { closeModal(); renderSlots(); });
    scrim.querySelector("[data-skip]").addEventListener("click", advance);
    // auto-advance like the real listening screen resolving on physical input
    guidedTimer = setTimeout(advance, 1900);
  }

  function guidedSuccess() {
    if (guidedTimer) clearTimeout(guidedTimer);
    openModal(`
      <div class="modal">
        <div class="guided-success">
          <div class="ring">${svg("check")}</div>
          <div>
            <div class="st">You're set up</div>
            <div class="sb">Locks applied · routing is paused until you start it.</div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn secondary" data-close>Close</button>
          <div class="right"><button class="btn primary" data-start-cap>Start capture</button></div>
        </div>
      </div>`);
    renderSlots();
    scrim.querySelector("[data-close]").addEventListener("click", closeModal);
    scrim.querySelector("[data-start-cap]").addEventListener("click", () => {
      closeModal();
      if (state.routing !== "active") toggleCapture();
    });
  }

  // ---- Mouse calibration (scripted, 6 phases) ----
  const CALIB = [
    { h: "Press the left button", i: "Please keep the mouse still and click the left button several times, pressing and releasing fully each time. Avoid moving the mouse while you click.", hl: "left" },
    { h: "Press the right button", i: "Please keep the mouse still and click the right button several times, pressing and releasing fully each time.", hl: "right" },
    { h: "Press the middle button", i: "Please press and release the middle (wheel) button several times. Press the wheel straight down as a button. Do not scroll it yet.", hl: "wheel" },
    { h: "Move left and right", i: "Please move the mouse steadily left and right across the mat, keeping the motion roughly horizontal. Do not press any buttons during this step.", hl: "body" },
    { h: "Move up and down", i: "Please move the mouse steadily up and down, keeping the motion roughly vertical. Do not press any buttons during this step.", hl: "body" },
    { h: "Scroll the wheel", i: "Please scroll the wheel up and then down a few notches, keeping the mouse still otherwise.", hl: "wheel" },
  ];
  let calibTimer = null;
  function calibMouseSVG(hl) {
    const A = "var(--accent)", HI = (on) => on ? `fill="var(--accent)" fill-opacity="0.85"` : `fill="var(--card)"`;
    return `<svg class="calib-mouse" viewBox="0 0 118 168">
      <rect x="1" y="1" width="116" height="166" rx="56" ry="56" fill="var(--card)" stroke="var(--stroke-hover)" stroke-width="1.6"/>
      <path d="M1 57 V57 A56 56 0 0 1 56 1 H56 V67 H1 Z" ${hl === "left" || hl === "body" ? HI(true) : HI(false)} opacity="${hl === "left" ? 1 : hl === "body" ? 0.5 : 0}"/>
      <path d="M117 57 A56 56 0 0 0 62 1 H62 V67 H117 Z" ${hl === "right" || hl === "body" ? HI(true) : HI(false)} opacity="${hl === "right" ? 1 : hl === "body" ? 0.5 : 0}"/>
      <rect x="53" y="18" width="12" height="30" rx="6" fill="${hl === "wheel" ? A : "var(--stroke-hover)"}"/>
      <line x1="59" y1="1" x2="59" y2="67" stroke="var(--stroke)" stroke-width="1.4"/>
    </svg>`;
  }
  function openCalibration(step) {
    step = step || 0;
    const c = CALIB[step];
    const dots = CALIB.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("");
    openModal(`
      <div class="modal">
        <div class="calib">
          <div class="ctitle">Mouse Calibration</div>
          <div class="cstep">Step ${step + 1} of 6</div>
          <div class="mouse-canvas">${calibMouseSVG(c.hl)}</div>
          <div class="dots">${dots}</div>
          <div class="cheading">${c.h}</div>
          <div class="cinstr">${c.i}</div>
          <div class="crule"></div>
          <div class="cfoot">Each step advances automatically once enough input is captured. Please keep the routed mouse on its surface until calibration completes.</div>
          <div class="cfoot" style="margin-top:4px">Press Esc to cancel.</div>
          <div class="calib-nav">
            <button class="btn secondary" data-prev ${step === 0 ? "disabled style=opacity:.5" : ""}>Previous</button>
            <button class="btn primary" data-next>${step === 5 ? "Finish" : "Next step"}</button>
            <button class="btn secondary" data-cancel>Cancel</button>
          </div>
        </div>
      </div>`, () => { if (calibTimer) clearTimeout(calibTimer); });
    const next = () => { if (step >= 5) { closeModal(); toast("Calibration complete (demo)."); log("Mouse calibration complete."); } else openCalibration(step + 1); };
    scrim.querySelector("[data-next]").addEventListener("click", next);
    scrim.querySelector("[data-cancel]").addEventListener("click", closeModal);
    const prev = scrim.querySelector("[data-prev]");
    if (step > 0) prev.addEventListener("click", () => openCalibration(step - 1));
    if (calibTimer) clearTimeout(calibTimer);
    calibTimer = setTimeout(next, 2600);
  }

  // ---- Quit confirm ----
  function openQuit() {
    openModal(`
      <div class="modal sm">
        <div class="mt" style="font-size:var(--sz-display);font-weight:600;color:var(--text)">Quit Lattice Weaver?</div>
        <div class="mbody">This is an interactive demo, so nothing actually closes. In the real app, Quit releases every claimed device and exits; closing to the tray keeps your bindings in place.</div>
        <div class="modal-actions">
          <button class="btn secondary" data-close>Minimize to tray instead</button>
          <div class="right"><button class="btn danger" data-close>Quit</button></div>
        </div>
      </div>`);
    scrim.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
  }

  // ========================================================================
  // Toast
  // ========================================================================
  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  // ========================================================================
  // Theme cycling hotkey (T / Shift+T). Mirrors mod.rs cycle_theme.
  // ========================================================================
  function cycleTheme(back) {
    const idx = WEAVER_THEMES.findIndex(t => t.id === state.theme);
    const n = WEAVER_THEMES.length;
    const next = WEAVER_THEMES[((idx + (back ? -1 : 1)) % n + n) % n];
    applyTheme(next.id, true);
    if (window._syncThemeLabel) window._syncThemeLabel();
    if (back && next.id === "lattice") toast("Back to house style.");
  }

  // ========================================================================
  // Wire-up
  // ========================================================================
  function init() {
    hydrateIcons(document);
    applyTheme("lattice", false);
    applyFont("Sora");
    applyIconPack("precision");
    renderSlots();
    renderSettings();
    renderGames();
    renderDoctor();
    renderRouting();
    go("dashboard");

    document.querySelectorAll(".navbtn[data-nav]").forEach(b =>
      b.addEventListener("click", () => go(state.screen === b.dataset.nav ? "dashboard" : b.dataset.nav)));
    document.querySelectorAll("[data-home]").forEach(b => b.addEventListener("click", () => go("dashboard")));
    document.querySelectorAll("[data-stab]").forEach(b => b.addEventListener("click", () => {
      state.settingsTab = b.dataset.stab;
      document.querySelectorAll("[data-stab]").forEach(x => x.classList.toggle("active", x === b));
      document.getElementById("settingsApp").style.display = b.dataset.stab === "app" ? "block" : "none";
      document.getElementById("settingsTheme").style.display = b.dataset.stab === "theme" ? "block" : "none";
    }));

    document.getElementById("captureBtn").addEventListener("click", toggleCapture);
    document.getElementById("resumeBtn").addEventListener("click", toggleCapture);
    document.getElementById("setupBtn").addEventListener("click", openWizard);
    document.getElementById("quitBtn").addEventListener("click", openQuit);
    document.getElementById("calibrateBtn").addEventListener("click", () => openCalibration(0));
    document.getElementById("repairAll").addEventListener("click", () => { toast("All device locks repaired (demo)."); log("Setup Doctor: repaired device locks."); });
    document.getElementById("sendDiag").addEventListener("click", () => toast("Diagnostics are visual-only in this demo."));
    document.getElementById("licenseChip").addEventListener("click", () => toast("License activation is visual-only in this demo."));
    document.querySelectorAll('.wv-capbtn:not(.disabled)').forEach(b => b.addEventListener("click", () => toast("Window controls are visual-only in this demo.")));

    // event log collapse
    const logBox = document.getElementById("logBox");
    const logCaret = document.getElementById("logCaret");
    document.getElementById("logHead").addEventListener("click", (e) => {
      if (e.target.closest(".copy")) { toast("Log copied (demo)."); return; }
      state.logOpen = !state.logOpen;
      logBox.classList.toggle("collapsed", !state.logOpen);
      logCaret.innerHTML = svg(state.logOpen ? "chevdown" : "chevright");
    });

    // close dropdowns on outside click
    document.addEventListener("click", () => document.querySelectorAll(".wv-select.open").forEach(x => x.classList.remove("open")));

    // theme cycle + esc
    document.addEventListener("keydown", (e) => {
      const typing = /input|textarea/i.test(document.activeElement.tagName || "");
      if (!typing && (e.key === "t" || e.key === "T")) cycleTheme(e.shiftKey);
      if (e.key === "Escape" && scrim.classList.contains("show")) closeModal();
    });

    // demo navigator (page chrome)
    document.querySelectorAll("#demoNav [data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
    document.querySelectorAll("#demoNav [data-flow]").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.flow === "guided") openWizard();
      else openCalibration(0);
    }));

    fit();
    window.addEventListener("resize", fit);
    // re-fit after fonts load (metrics change window height)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    setTimeout(fit, 400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
