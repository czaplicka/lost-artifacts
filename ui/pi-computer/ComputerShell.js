import { COLORS } from './ComputerTheme.js';

/*
 * ComputerShell
 * -------------
 * Shared desktop shell for BOTH computers (PI office + Mark Agency office):
 *   - window manager (focus, z-order, minimize, close, drag)
 *   - taskbar with one button per open window
 *   - start menu
 *   - optional pixel-art loader (everything has a procedural fallback)
 *
 * The existing apps are NOT rewritten. Every window is rendered by calling the
 * computer's own `ui.monitor.renderApplication()` with `ui.app` / `ui.content`
 * / `ui.window` pointed at that window, so all the monkey-patched apps
 * (search, photo, office shop, ...) keep working.
 *
 *   - "full" windows: use the app's own full-size geometry (not draggable,
 *     but they can be minimized / closed / switched on the taskbar).
 *   - "compact" windows (see `sizes` in the config): smaller, draggable.
 *
 * Optional art (all PNG, nearest-neighbour, see list in the chat):
 *   assets/ui/computer/wallpaper_pi.png, wallpaper_mark.png
 *   assets/ui/computer/start_pi.png, start_mark.png
 *   assets/ui/computer/icons/<kind>.png
 */

const ART_BASE = 'assets/ui/computer/';
const FAILED_ART = new Set();
const PENDING_ART = new Set();

const TASKBAR_H = 36;
const MINIMIZE_OFFSET = 110;
const TITLE_H = 38;

export const SHELL_THEMES = {
  pi: {
    bar: 0x2b4f7e, barHi: 0x5b86bd, barLo: 0x15293f,
    start: 0xd4af37, startOpen: 0xb8932a, startText: '#2b2a26',
    button: 0x3f6ea8, buttonOpen: 0x1d3a5e,
    buttonText: '#f4efd8', buttonMuted: '#b7c8e4',
    tray: 0x15293f, trayText: '#7dff9b',
    menu: 0xd7d5ca, menuStrip: 0x1d3a5e, menuStripText: COLORS.gold,
    menuHover: 0x294b70, menuText: COLORS.text
  },
  mark: {
    bar: 0x21505c, barHi: 0x4f8896, barLo: 0x0f2a32,
    start: 0xdec98b, startOpen: 0xb9a566, startText: '#15343c',
    button: 0x30616c, buttonOpen: 0x14323b,
    buttonText: '#fff0ba', buttonMuted: '#b5d0d2',
    tray: 0x0f2a32, trayText: '#dec98b',
    menu: 0xd4d8cb, menuStrip: 0x14323b, menuStripText: '#dec98b',
    menuHover: 0x30616c, menuText: '#15343c'
  }
};

const FALLBACK_APP = { title: 'Application', color: 0x98b9ce, kind: null };

export class ComputerShell {
  /*
   * config:
   *   theme        'pi' | 'mark'
   *   apps         { appId: { title, color, kind } }
   *   groups       { appId: groupId }   several views sharing one window
   *   sizes        { groupId: { w, h } } compact (draggable) windows
   *   stateKeys    ui fields that belong to a window (selectedId, listPage...)
   *   defaults     () => fresh values for those fields
   *   defaultRect  () => rectangle of a "full" window
   *   area         () => the desktop layout { x, y, w, h } (taskbar included)
   *   hooks        { beforeSwitch }
   */
  constructor(ui, config = {}) {
    this.ui = ui;
    this.cfg = {
      theme: 'pi',
      apps: {},
      groups: {},
      sizes: {},
      stateKeys: ['selectedId', 'listPage', 'bodyPage', 'notice'],
      defaults: () => ({ selectedId: null, listPage: 0, bodyPage: 0, notice: '' }),
      defaultRect: () => ({ x: 72, y: 58, w: 976, h: 618 }),
      area: () => ui.layout || { x: 60, y: 48, w: 1000, h: 676 },
      hooks: {},
      ...config
    };

    this.theme = SHELL_THEMES[this.cfg.theme] || SHELL_THEMES.pi;

    this.windows = [];          // creation order (taskbar order)
    this.stack = [];            // z-order, back -> front (window ids)
    this.owner = 'desktop';     // who owns the ui.* state fields right now
    this.desktopState = this.cfg.defaults();
    this.mirror = 'desktop';    // last ui.app value written by the shell
    this.rendering = null;
    this.containers = new Map();
    this.drag = null;
    this.hostScale = 1;
    this.refreshQueued = false;
    this.destroyed = false;

    this.onMove = pointer => this.dragMove(pointer);
    this.onUp = () => { this.drag = null; };

    ui.scene.input.on('pointermove', this.onMove);
    ui.scene.input.on('pointerup', this.onUp);
    ui.scene.input.on('pointerupoutside', this.onUp);
  }

  /* ------------------------------------------------------------------ */
  /* Lookups                                                             */
  /* ------------------------------------------------------------------ */

  groupOf(app) { return this.cfg.groups[app] || app; }

  info(app) {
    return this.cfg.apps[app] || this.cfg.apps[this.groupOf(app)] || { ...FALLBACK_APP, title: String(app) };
  }

  byId(id) { return this.windows.find(win => win.id === id) || null; }

  has(app) { return Boolean(this.byId(this.groupOf(app))); }

  topVisible() {
    for (let index = this.stack.length - 1; index >= 0; index--) {
      const win = this.byId(this.stack[index]);
      if (win && !win.minimized) return win;
    }
    return null;
  }

  focusedApp() { return this.topVisible()?.app || 'desktop'; }

  visibleCount() { return this.windows.filter(win => !win.minimized).length; }

  /* ------------------------------------------------------------------ */
  /* State swapping (per-window ui.selectedId / listPage / notice ...)  */
  /* ------------------------------------------------------------------ */

  readState() {
    const state = {};
    for (const key of this.cfg.stateKeys) state[key] = this.ui[key];
    return state;
  }

  assignState(state) {
    const fresh = this.cfg.defaults();
    for (const key of this.cfg.stateKeys) {
      this.ui[key] = key in state ? state[key] : fresh[key];
    }
  }

  captureOwner() {
    if (this.owner === 'desktop') { this.desktopState = this.readState(); return; }
    const win = this.byId(this.owner);
    if (win) win.state = this.readState();
  }

  switchOwner(id) {
    if (this.owner === id) return;
    this.cfg.hooks.beforeSwitch?.();
    this.captureOwner();
    this.owner = id;
    const state = id === 'desktop' ? this.desktopState : this.byId(id)?.state;
    this.assignState(state || {});
  }

  setApp(app) {
    this.ui.app = app;
    this.mirror = app;
  }

  /* ------------------------------------------------------------------ */
  /* Window lifecycle                                                    */
  /* ------------------------------------------------------------------ */

  reset() {
    this.windows = [];
    this.stack = [];
    this.containers.clear();
    this.drag = null;
    this.owner = 'desktop';
    this.desktopState = this.cfg.defaults();
    this.assignState(this.desktopState);
    this.setApp('desktop');
  }

  create(app) {
    const id = this.groupOf(app);
    const size = this.cfg.sizes[id] || null;
    const base = this.cfg.defaultRect();
    let rect = { ...base };
    let compact = false;

    if (size) {
      compact = true;
      const w = Math.min(size.w, base.w);
      const h = Math.min(size.h, base.h);
      const cascade = (this.windows.filter(win => win.compact).length % 5) * 28;
      rect = {
        w,
        h,
        x: Phaser.Math.Clamp(base.x + Math.round((base.w - w) / 2) + cascade - 56, base.x, base.x + base.w - w),
        y: Phaser.Math.Clamp(base.y + Math.round((base.h - h) / 2) + cascade - 56, base.y, base.y + base.h - h)
      };
    }

    const win = {
      id, app, rect, compact,
      ox: 0, oy: 0,
      minimized: false,
      state: this.cfg.defaults()
    };

    this.windows.push(win);
    this.stack.push(id);
    return win;
  }

  raise(id) {
    this.stack = this.stack.filter(item => item !== id);
    this.stack.push(id);
  }

  // Opens a window (or restores / focuses the existing one).
  // Returns true when a NEW window (or a new view of the window) was created.
  open(app) {
    const id = this.groupOf(app);
    let fresh = false;

    this.cfg.hooks.beforeSwitch?.();

    // Save the fields of whoever owns them now BEFORE they are overwritten.
    this.captureOwner();

    let win = this.byId(id);

    if (!win) {
      win = this.create(app);
      fresh = true;
    } else if (win.app !== app) {
      win.app = app;
      win.state = this.cfg.defaults();
      fresh = true;
    }

    win.minimized = false;
    this.raise(id);

    this.owner = id;
    this.assignState(win.state);
    this.setApp(win.app);

    return fresh;
  }

  focusWindow(win) {
    if (!win) return;
    win.minimized = false;
    this.raise(win.id);
    this.switchOwner(win.id);
    this.setApp(win.app);
  }

  minimize(win) {
    if (!win || win.minimized) return;
    win.minimized = true;
    this.pickNext();
  }

  restoreAll() {
    for (const win of this.windows) win.minimized = false;
  }

  minimizeAll() {
    for (const win of this.windows) win.minimized = true;
    this.pickNext();
  }

  pickNext() {
    const next = this.topVisible();
    this.switchOwner(next ? next.id : 'desktop');
    this.setApp(next ? next.app : 'desktop');
  }

  closeFocused() {
    const win = this.topVisible();
    if (win) this.close(win.id);
  }

  close(id) {
    const win = this.byId(id);
    if (!win) return;

    this.cfg.hooks.beforeSwitch?.();
    this.captureOwner();

    this.windows = this.windows.filter(item => item.id !== id);
    this.stack = this.stack.filter(item => item !== id);
    this.containers.delete(id);

    const next = this.topVisible();

    this.owner = next ? next.id : 'desktop';
    this.assignState(next ? next.state : this.desktopState);
    this.setApp(next ? next.app : 'desktop');
  }

  /* ------------------------------------------------------------------ */
  /* Frame lifecycle (called from the computers' render())              */
  /* ------------------------------------------------------------------ */

  // Reconciles code that still assigns `ui.app = 'photo'` / `Object.assign(ui, { app })`
  // directly (photo viewer, office shop, ...) with the window list.
  beginFrame() {
    const ui = this.ui;

    if (ui.app !== this.mirror) {
      const app = ui.app;

      if (!app || app === 'desktop') {
        ui.app = this.mirror;
      } else {
        const id = this.groupOf(app);
        let win = this.byId(id);

        if (!win) win = this.create(app);
        else win.app = app;

        win.minimized = false;
        this.raise(id);

        // The fields written by that external code belong to THIS window.
        this.owner = id;
        this.captureOwner();
        this.mirror = app;
      }
    }

    this.captureOwner();
  }

  rectFor(home) {
    return this.rendering ? this.rendering.rect : home;
  }

  renderWindows() {
    const ui = this.ui;
    const scene = ui.scene;
    const host = ui.content;

    this.hostScale = host?.scaleX || 1;
    this.containers.clear();

    const visible = this.stack
      .map(id => this.byId(id))
      .filter(win => win && !win.minimized);

    const top = visible[visible.length - 1] || null;

    for (const win of visible) {
      const container = scene.add.container(win.ox, win.oy);
      host.add(container);
      this.containers.set(win.id, container);

      ui.content = container;
      ui.app = win.app;
      this.assignState(win.state);
      this.rendering = win;

      const isTop = win === top;
      if (isTop) this.addBottomHitAreas(win, container);

      try {
        ui.monitor.renderApplication();
      } catch (error) {
        console.error(`[ComputerShell] Window "${win.app}" failed to render:`, error);
      }

      win.state = this.readState();
      this.rendering = null;

      if (isTop) this.addMinimizeButton(win, container);
      else this.addInactiveOverlay(win, container);
    }

    ui.content = host;

    if (top) {
      this.owner = top.id;
      this.setApp(top.app);          // fields already hold the top window's state
    } else {
      this.owner = 'desktop';
      this.assignState(this.desktopState);
      this.setApp('desktop');
    }
  }

  addBottomHitAreas(win, container) {
    const scene = this.ui.scene;
    const r = win.rect;

    // Swallows clicks so nothing underneath (desktop icons) reacts.
    const blocker = scene.add.rectangle(r.x, r.y, r.w, r.h, 0x000000, 0).setOrigin(0).setInteractive();
    container.add(blocker);

    if (!win.compact) return;

    const handle = scene.add.rectangle(r.x + 4, r.y + 4, r.w - 8, TITLE_H - 4, 0x000000, 0)
      .setOrigin(0)
      .setInteractive({ cursor: 'move' });

    handle.on('pointerdown', pointer => this.beginDrag(win, pointer));
    container.add(handle);
  }

  addInactiveOverlay(win, container) {
    const ui = this.ui;
    const scene = ui.scene;
    const r = win.rect;

    const overlay = scene.add.rectangle(r.x, r.y, r.w, r.h, 0x0a1018, 0.14)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    // Gray title bar = inactive window.
    const title = scene.add.rectangle(r.x + 4, r.y + 4, r.w - 8, TITLE_H - 4, 0x5b616a, 0.45).setOrigin(0);

    overlay.on('pointerdown', (pointer, localX, localY) => {
      ui.options.onSfx?.('click');
      if (win.compact && localY <= TITLE_H) this.beginDrag(win, pointer);
      this.focusWindow(win);
      ui.render();
    });

    container.add([title, overlay]);
  }

  addMinimizeButton(win, container) {
    const ui = this.ui;
    const scene = ui.scene;
    const r = win.rect;
    const x = r.x + r.w - MINIMIZE_OFFSET;
    const y = r.y + 6;

    const art = scene.add.graphics();
    ui.drawing.paintBevel(art, x, y, 34, 26, 0xd0cec6);
    art.fillStyle(0x1b2530, 1);
    art.fillRect(x + 10, y + 17, 14, 3);

    const hit = scene.add.rectangle(x, y, 34, 26, 0x000000, 0).setOrigin(0).setInteractive({ useHandCursor: true });

    hit.on('pointerdown', () => {
      ui.options.onSfx?.('click');
      this.minimize(win);
      ui.render();
    });

    container.add([art, hit]);
  }

  /* ------------------------------------------------------------------ */
  /* Dragging                                                            */
  /* ------------------------------------------------------------------ */

  beginDrag(win, pointer) {
    if (!win?.compact) return;
    this.drag = { id: win.id, px: pointer.x, py: pointer.y, ox: win.ox, oy: win.oy };
  }

  clampOffsets(win) {
    const area = this.cfg.area();
    const r = win.rect;

    win.ox = Phaser.Math.Clamp(win.ox, area.x - r.x, area.x + area.w - r.w - r.x);
    win.oy = Phaser.Math.Clamp(win.oy, area.y - r.y, area.y + area.h - TASKBAR_H - r.h - r.y);
  }

  dragMove(pointer) {
    const drag = this.drag;
    if (!drag) return;

    if (!pointer.isDown) { this.drag = null; return; }

    const win = this.byId(drag.id);
    if (!win) { this.drag = null; return; }

    const scale = this.hostScale || 1;

    win.ox = drag.ox + (pointer.x - drag.px) / scale;
    win.oy = drag.oy + (pointer.y - drag.py) / scale;
    this.clampOffsets(win);

    const container = this.containers.get(win.id);
    if (container?.scene) container.setPosition(win.ox, win.oy);
  }

  /* ------------------------------------------------------------------ */
  /* Optional pixel art                                                  */
  /* ------------------------------------------------------------------ */

  // Returns the texture key when the PNG is available, otherwise null
  // (and starts a one-off background load; the screen refreshes when it arrives).
  art(key, file) {
    const scene = this.ui.scene;

    try {
      if (scene.textures.exists(key)) return key;
    } catch (_) {
      return null;
    }

    if (FAILED_ART.has(key) || PENDING_ART.has(key)) return null;

    PENDING_ART.add(key);

    const image = new Image();

    image.onload = () => {
      PENDING_ART.delete(key);

      try {
        if (!scene.textures.exists(key)) {
          scene.textures.addImage(key, image);
          scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      } catch (_) {
        FAILED_ART.add(key);
        return;
      }

      this.queueRefresh();
    };

    image.onerror = () => {
      PENDING_ART.delete(key);
      FAILED_ART.add(key);
    };

    image.src = `${ART_BASE}${file}`;
    return null;
  }

  iconKey(kind) {
    return kind ? this.art(`computer_icon_${kind}`, `icons/${kind}.webp`) : null;
  }

  queueRefresh() {
    if (this.refreshQueued || this.destroyed) return;
    this.refreshQueued = true;

    this.ui.scene.time?.delayedCall(60, () => {
      this.refreshQueued = false;
      const ui = this.ui;
      if (this.destroyed || ui.destroyed || !ui.isOpen || ui.suspended || ui.booting) return;
      ui.render();
    });
  }

  // Small icon (taskbar / start menu): texture when available, colored tile otherwise.
  drawSmallIcon(info, x, y, size = 16) {
    const d = this.ui.drawing;
    const key = this.iconKey(info.kind);

    if (key) {
      const image = this.ui.scene.add.image(x, y, key).setOrigin(0).setDisplaySize(size, size);
      d.add(image);
      return;
    }

    d.rectangle(x, y, size, size, info.color ?? 0x98b9ce);
    d.frame(x, y, size, size, COLORS.ink, 1, 2);
  }

  /* ------------------------------------------------------------------ */
  /* Taskbar                                                             */
  /* ------------------------------------------------------------------ */

  /*
   * options: { startLabel, startIcon: 'owl' | 'mark', startWidth, trayWidth, drawTray(trayX, taskbarY, trayWidth) }
   */
  drawTaskbar(layout, options = {}) {
    const ui = this.ui;
    const d = ui.drawing;
    const t = this.theme;
    const { x, y, w, h } = layout;
    const ty = y + h - TASKBAR_H;
    const startW = options.startWidth || 116;
    const trayW = options.trayWidth || 262;

    // Bar
    d.rectangle(x, ty, w, TASKBAR_H, t.bar);
    d.rectangle(x, ty, w, 2, t.barHi);
    d.rectangle(x, ty + TASKBAR_H - 2, w, 2, t.barLo);

    // Start button
    const open = Boolean(ui.menuOpen);
    d.bevel(x + 4, ty + 4, startW, 28, open ? t.startOpen : t.start, open);
    this.drawStartIcon(options.startIcon || 'owl', x + 24, ty + 18);
    d.pixel(x + 44, ty + 13, options.startLabel || 'START', 10, t.startText);

    d.rectangle(x + 4, ty + 4, startW, 28, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        ui.options.onSfx?.('click');
        ui.menuOpen = !ui.menuOpen;
        ui.render();
      });

    d.rectangle(x + startW + 10, ty + 6, 2, 24, t.barLo);

    // Window buttons
    const areaX = x + startW + 18;
    const trayX = x + w - trayW - 18;
    const areaW = Math.max(0, trayX - 10 - areaX);
    const count = this.windows.length;
    const gap = 4;

    if (count && areaW > 30) {
      const bw = Math.max(30, Math.min(190, Math.floor((areaW - (count - 1) * gap) / count)));
      const focused = this.topVisible();

      this.windows.forEach((win, index) => {
        const bx = areaX + index * (bw + gap);
        const active = win === focused;
        const info = this.info(win.app);

        d.bevel(bx, ty + 4, bw, 28, active ? t.buttonOpen : t.button, active);
        this.drawSmallIcon(info, bx + 7, ty + 10, 16);

        if (bw >= 78) {
          const label = d.pixel(bx + 30, ty + 14, '', 8, win.minimized ? t.buttonMuted : t.buttonText);
          d.fit(label, info.title, bw - 38);
        }

        d.rectangle(bx, ty + 4, bw, 28, 0xffffff, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            ui.options.onSfx?.('click');
            ui.menuOpen = false;

            if (active) this.minimize(win);
            else this.focusWindow(win);

            ui.render();
          });
      });
    }

    // Tray
    d.bevel(trayX, ty + 4, trayW, 28, t.tray, true);
    options.drawTray?.(trayX, ty, trayW);

    // "Show desktop" strip
    const stripX = x + w - 14;
    d.rectangle(stripX, ty + 6, 10, 24, t.barLo);
    d.rectangle(stripX + 1, ty + 7, 8, 22, t.button);

    d.rectangle(stripX, ty + 6, 10, 24, 0xffffff, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        ui.options.onSfx?.('click');
        ui.menuOpen = false;

        if (this.visibleCount()) this.minimizeAll();
        else { this.restoreAll(); this.pickNext(); }

        ui.render();
      });
  }

  drawStartIcon(kind, cx, cy) {
    const ui = this.ui;
    const key = this.art(`start_${this.cfg.theme}`, `start_${this.cfg.theme}.webp`);

    if (key) {
      ui.drawing.add(ui.scene.add.image(cx, cy, key).setDisplaySize(22, 22));
      return;
    }

    const g = ui.scene.add.graphics();
    ui.drawing.add(g);

    if (kind === 'owl') {
      g.fillStyle(0x294b70, 1);
      g.fillCircle(cx - 6, cy, 7);
      g.fillCircle(cx + 6, cy, 7);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx - 6, cy, 4);
      g.fillCircle(cx + 6, cy, 4);
      g.fillStyle(0x111111, 1);
      g.fillCircle(cx - 6, cy, 2);
      g.fillCircle(cx + 6, cy, 2);
      g.fillStyle(0x7a5c14, 1);
      g.fillTriangle(cx - 3, cy + 5, cx + 3, cy + 5, cx, cy + 11);
      return;
    }

    // Mark Agency: gold-on-teal diamond.
    g.fillStyle(0x14323b, 1);
    g.fillPoints([{ x: cx, y: cy - 9 }, { x: cx + 9, y: cy }, { x: cx, y: cy + 9 }, { x: cx - 9, y: cy }], true);
    g.fillStyle(0xdec98b, 1);
    g.fillPoints([{ x: cx, y: cy - 5 }, { x: cx + 5, y: cy }, { x: cx, y: cy + 5 }, { x: cx - 5, y: cy }], true);
  }

  /* ------------------------------------------------------------------ */
  /* Start menu                                                          */
  /* ------------------------------------------------------------------ */

  /*
   * items: [{ app, label, color, kind } | { sep: true } | { action, label, color, kind }]
   * onSelect(item) is called after the menu has been closed.
   */
  drawStartMenu(layout, items, onSelect, brand = 'NIGHT OWL OS') {
    const ui = this.ui;
    const d = ui.drawing;
    const t = this.theme;
    const { x, y, w, h } = layout;
    const taskbarY = y + h - TASKBAR_H;

    // Click-away layer
    d.rectangle(x, y, w, h - TASKBAR_H, 0x000000, 0)
      .setInteractive()
      .on('pointerdown', () => { ui.menuOpen = false; ui.render(); });

    const itemH = 40;
    const sepH = 14;
    const stripW = 36;
    const menuW = 300;

    const menuH = 10 + items.reduce((sum, item) => sum + (item.sep ? sepH : itemH), 0);
    const menuX = x + 4;
    const menuY = taskbarY - menuH - 2;

    d.rectangle(menuX + 6, menuY + 6, menuW, menuH, 0x050a10, 0.45);
    d.bevel(menuX, menuY, menuW, menuH, t.menu);
    d.rectangle(menuX + 5, menuY + 5, stripW, menuH - 10, t.menuStrip);

    const label = d.pixel(0, 0, brand, 10, t.menuStripText);
    label
      .setAngle(-90)
      .setPosition(menuX + 5 + Math.round((stripW - label.height) / 2), menuY + menuH - 14);

    const itemX = menuX + 5 + stripW;
    const itemW = menuW - 10 - stripW;
    let itemY = menuY + 5;

    for (const item of items) {
      if (item.sep) {
        d.rectangle(itemX + 6, itemY + 6, itemW - 12, 1, 0x8d8b80);
        d.rectangle(itemX + 6, itemY + 7, itemW - 12, 1, 0xfbf8ec);
        itemY += sepH;
        continue;
      }

      const row = d.rectangle(itemX, itemY, itemW, itemH, t.menuHover, 0).setInteractive({ useHandCursor: true });

      this.drawSmallIcon(item, itemX + 12, itemY + 8, 24);

      const text = d.text(itemX + 48, itemY + 10, item.label, 17, t.menuText);

      row
        .on('pointerover', () => { row.setFillStyle(t.menuHover, 1); text.setColor('#ffffff'); })
        .on('pointerout', () => { row.setFillStyle(t.menuHover, 0); text.setColor(t.menuText); })
        .on('pointerdown', () => {
          ui.options.onSfx?.('click');
          ui.menuOpen = false;
          onSelect(item);
        });

      itemY += itemH;
    }
  }

  /* ------------------------------------------------------------------ */

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    const input = this.ui.scene?.input;
    input?.off('pointermove', this.onMove);
    input?.off('pointerup', this.onUp);
    input?.off('pointerupoutside', this.onUp);

    this.windows = [];
    this.stack = [];
    this.containers.clear();
    this.drag = null;
  }
}