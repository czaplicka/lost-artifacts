import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';

import {
  STATE_KEY,
  clone,
  getSearchProgress,
  validateSearchData,
  TAGLINES,
  pick,
  gameState,
  requestAutosave
} from './ComputerSearchShared.js';

import {
  ensurePostalNotebookDefinition
} from '../../managers/PostOfficeNotebook.js';

import {
  GOSSIP_HOME_ID,
  ensureGossipPortal
} from './GossipPortalData.js';

import { ComputerSearchAssets } from './ComputerSearchAssets.js';
import { ComputerSearchState } from './ComputerSearchState.js';
import { ComputerSearchWidgets } from './ComputerSearchWidgets.js';
import { ComputerSearchPages } from './ComputerSearchPages.js';
import { ComputerSearchNotebook } from './ComputerSearchNotebook.js';
import { ComputerSearchHome } from './ComputerSearchHome.js';
import { ComputerSearchResults } from './ComputerSearchResults.js';

import {
  computerUiCanInteract,
  playComputerUiClick
} from './ComputerUiAudio.js';

export {
  getSearchProgress,
  discoverSearchKeywords,
  validateSearchData,
  resolveSearchResults,
  resolveSearch
} from './ComputerSearchShared.js';

export class ComputerSearch {
  constructor(ui) {
    Object.assign(this, {
      ui,
      data: null,
      loading: null,
      error: '',
      terms: [],
      submitted: [],
      results: [],
      view: 'home',
      pageId: null,
      resultPage: 0,
      bodyPage: 0,
      notePage: 0,
      notesOpen: false,
      dead: false,
      controller: null,
      trail: [],
      images: [],
      requested: new Set(),
      tip: '',
      tagline: pick(TAGLINES),
      browserStatusLabel: null
    });

    this.install();
  }

  install() {
    const ui = this.ui;

    if (
      typeof ui.desktop?.render !== 'function' ||
      typeof ui.desktop?.createIcon !== 'function' ||
      typeof ui.monitor?.renderApplication !== 'function'
    ) {
      throw TypeError('[ComputerSearch] Incompatible computer UI');
    }

    const desktop = ui.desktop.render.bind(ui.desktop);

    ui.desktop.render = () => {
      desktop();

      const { x, y } = ui.layout;

      ui.desktop.createIcon(
        x + 152,
        y + 10,
        128,
        __dialogueText(
          'ui/pi-computer/ComputerSearchCore.js',
          't_d04fc7d7e19702f8b611'
        ),
        'globe',
        0x9fc9a9,
        () => ui.openApp('search')
      );
    };

    const application =
      ui.monitor.renderApplication.bind(ui.monitor);

    ui.monitor.renderApplication = (...args) => {
      if (ui.app !== 'search') {
        return application(...args);
      }

      const result = this.render();

      this.renderBrowserClose();

      return result;
    };

    const after = () => {
      if (
        !this.dead &&
        !ui.destroyed &&
        ui.isOpen &&
        !ui.suspended &&
        !ui.booting &&
        ui.app === 'search'
      ) {
        this.renderNotebook();
        ui.pin?.();
      }
    };

    if (typeof ui.monitor.render === 'function') {
      const render = ui.monitor.render.bind(ui.monitor);

      ui.monitor.render = () => {
        render();
        after();
      };
    } else if (typeof ui.render === 'function') {
      const render = ui.render.bind(ui);

      ui.render = () => {
        render();
        after();
      };
    } else {
      throw TypeError('[ComputerSearch] Missing render');
    }
  }

  closeBrowser() {
    const ui = this.ui;

    if (this.dead || ui.destroyed) return false;

    ui.menuOpen = false;
    ui.viewToken = (Number(ui.viewToken) || 0) + 1;

    const shell = ui.shell;

    if (
      shell &&
      typeof shell.groupOf === 'function' &&
      typeof shell.byId === 'function' &&
      typeof shell.close === 'function'
    ) {
      const id = shell.groupOf('search');

      if (shell.byId(id)) {
        shell.close(id);
      } else if (typeof shell.pickNext === 'function') {
        shell.pickNext();
      } else {
        ui.app = 'desktop';
      }
    } else {
      ui.app = 'desktop';
    }

    ui.render();

    return true;
  }

  browserDefaultStatus() {
    if (this.error) return 'Connection failed.';
    if (!this.data) return 'Connecting...';

    return 'Done.';
  }

  setBrowserStatus(message) {
    const label = this.browserStatusLabel;

    if (!label || label.active === false || !label.scene) {
      return;
    }

    label.setText(message || this.browserDefaultStatus());

    this.ui.drawing.fit(
      label,
      label.text,
      this.browserStatusWidth || 1
    );
  }

  browserButton(
    x,
    y,
    width,
    height,
    caption,
    callback,
    enabled = true,
    status = ''
  ) {
    const ui = this.ui;
    const drawing = ui.drawing;
    const token = ui.viewToken;

    drawing.bevel(
      x,
      y,
      width,
      height,
      0xc6c7bf
    );

    const label = drawing.pixel(
      x + width / 2,
      y + height / 2,
      caption,
      8,
      enabled ? '#252820' : '#777a73'
    ).setOrigin(0.5);

    drawing.fit(
      label,
      caption,
      Math.max(1, width - 10)
    );

    if (!enabled) return;

    const hit = drawing.rectangle(
      x,
      y,
      width,
      height,
      0xffffff,
      0.001
    ).setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      hit.setFillStyle(0xffffff, 0.14);

      if (ui.viewToken === token && status) {
        this.setBrowserStatus(status);
      }
    });

    hit.on('pointerout', () => {
      hit.setFillStyle(0xffffff, 0.001);

      if (ui.viewToken === token) {
        this.setBrowserStatus();
      }
    });

    hit.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (
          this.dead ||
          !computerUiCanInteract(ui) ||
          ui.booting ||
          ui.app !== 'search' ||
          ui.viewToken !== token ||
          hit.active === false ||
          !hit.scene
        ) {
          return;
        }

        playComputerUiClick(ui);
        callback();
      }
    );

    return hit;
  }

  renderBrowserClose() {
    const ui = this.ui;
    const bounds = ui.window;

    if (
      this.dead ||
      ui.destroyed ||
      ui.app !== 'search' ||
      !bounds
    ) {
      return;
    }

    const hit = this.browserButton(
      bounds.x + bounds.w - 49,
      bounds.y + 3,
      44,
      30,
      'X',
      () => this.closeBrowser(),
      true,
      'Close OWL Navigator'
    );

    hit?.setName?.('browser-close');
  }

  refresh() {
    if (
      !this.dead &&
      !this.ui.destroyed &&
      this.ui.isOpen &&
      !this.ui.suspended &&
      this.ui.app === 'search'
    ) {
      this.ui.render();
    }
  }

  async load() {
    if (this.data || this.loading || this.dead) {
      return this.loading;
    }

    this.error = '';
    this.controller = new AbortController();

    this.loading = (async () => {
      try {
        const response = await fetch(
          this.ui.options.searchDataUrl ||
            'assets/data/piSearch.json',
          { signal: this.controller.signal }
        );

        if (!response.ok) {
          throw Error(`HTTP ${response.status}`);
        }

        const raw = await response.json();

        if (this.dead) return;

        const expanded = ensureGossipPortal(
          ensurePostalNotebookDefinition(raw)
        );

        const data = validateSearchData(expanded);

        this.data = data;

        const state = clone(getSearchProgress());

        for (const definition of data.cases) {
          if (!state.cases[definition.id]) {
            state.cases[definition.id] = {
              known: [...(definition.initialKeywords || [])],
              history: []
            };
          }
        }

        if (
          !data.cases.some(
            definition =>
              definition.id === state.selectedCaseId
          )
        ) {
          state.selectedCaseId = data.cases[0].id;
        }

        gameState[STATE_KEY] = state;

        requestAutosave();
        this.loadAssets();
      } catch (error) {
        if (!this.dead && error.name !== 'AbortError') {
          this.error = __dialogueText(
            'ui/pi-computer/ComputerSearchCore.js',
            't_b05a4e43013b2b920e6c'
          );

          console.error('[ComputerSearch]', error);
        }
      } finally {
        this.loading = null;
        this.refresh();
      }
    })();

    return this.loading;
  }

  renderGossipShortcut(bar) {
    const portal = this.definition?.pages.find(
      page => page.id === GOSSIP_HOME_ID
    );

    if (!portal) return;

    const width = Math.min(180, bar.w - 100);

    if (width < 60) return;

    this.browserButton(
      bar.x + 94,
      bar.y + 2,
      width,
      24,
      'The Daily Spill',
      () => this.openPage(GOSSIP_HOME_ID),
      true,
      portal.address || 'Open The Daily Spill'
    );
  }

  render() {
    const ui = this.ui;
    const drawing = ui.drawing;
    const { x, y, w, h } = ui.layout;

    this.browserStatusLabel = null;

    if (
      !this.data &&
      !this.loading &&
      !this.error &&
      !this.dead
    ) {
      void this.load();
    }

    const box = {
      x: x + 14,
      y: y + 10,
      w: w - 28,
      h: h - 58
    };

    ui.window = box;

    drawing.bevel(
      box.x,
      box.y,
      box.w,
      box.h,
      0xc6c7bf
    );

    drawing.rectangle(
      box.x + 4,
      box.y + 4,
      box.w - 8,
      30,
      0x244452
    );

    const title = drawing.pixel(
      box.x + 14,
      box.y + 14,
      'OWL Navigator',
      10,
      '#fff0cc'
    );

    drawing.fit(
      title,
      title.text,
      Math.max(1, box.w - 76)
    );

    this.browserButton(
      box.x + 8,
      box.y + 39,
      54,
      30,
      '< Back',
      () => this.back(),
      this.view !== 'home',
      'Back to the previous page'
    );

    this.browserButton(
      box.x + 66,
      box.y + 39,
      54,
      30,
      'Home',
      () => this.goHome(),
      this.view !== 'home',
      'owl://search'
    );

    const page = this.definition?.pages.find(
      item => item.id === this.pageId
    );

    const addressX = box.x + 128;
    const addressWidth = Math.max(1, box.w - 139);

    drawing.bevel(
      addressX,
      box.y + 39,
      addressWidth,
      31,
      0xf6f5e9,
      true
    );

    let addressText = 'owl://search';

    if (this.view === 'page') {
      addressText = page?.address || '';
    } else if (this.view === 'results' && this.data) {
      addressText =
        'owl://search?q=' +
        this.termLabels(this.submitted)
          .join('+')
          .replace(/\s+/g, '+');
    }

    if (this.view === 'page' && page) {
      this.favicon(
        addressX + 9,
        box.y + 46,
        17,
        page
      );
    } else {
      this.owlIcon(
        addressX + 8,
        box.y + 45,
        19
      );
    }

    const address = drawing.text(
      addressX + 36,
      box.y + 47,
      addressText,
      13,
      '#424d4c'
    );

    drawing.fit(
      address,
      address.text,
      Math.max(1, addressWidth - 50)
    );

    const bookmarks = {
      x: box.x + 6,
      y: box.y + 74,
      w: box.w - 12,
      h: 28
    };

    drawing.rectangle(
      bookmarks.x,
      bookmarks.y,
      bookmarks.w,
      bookmarks.h,
      0xbabcb4
    );

    drawing.pixel(
      bookmarks.x + 8,
      bookmarks.y + 10,
      'Bookmarks:',
      7,
      '#41483e'
    );

    this.renderGossipShortcut(bookmarks);

    const status = {
      x: box.x + 6,
      y: box.y + box.h - 25,
      w: box.w - 12,
      h: 19
    };

    drawing.bevel(
      status.x,
      status.y,
      status.w,
      status.h,
      0xc6c7bf,
      true
    );

    this.browserStatusWidth = Math.max(1, status.w - 16);

    this.browserStatusLabel = drawing.pixel(
      status.x + 8,
      status.y + 7,
      this.browserDefaultStatus(),
      7,
      '#41483e'
    );

    drawing.fit(
      this.browserStatusLabel,
      this.browserStatusLabel.text,
      this.browserStatusWidth
    );

    const area = {
      x: box.x + 6,
      y: box.y + 106,
      w: box.w - 12,
      h: Math.max(1, box.h - 135)
    };

    drawing.bevel(
      area.x - 1,
      area.y - 1,
      area.w + 2,
      area.h + 2,
      0xfaf9f3,
      true
    );

    drawing.rectangle(
      area.x,
      area.y,
      area.w,
      area.h,
      0xfaf9f3
    );

    if (!this.data) {
      this.owlIcon(
        area.x + 25,
        area.y + 26,
        56
      );

      drawing.text(
        area.x + 96,
        area.y + 40,
        this.error ||
          __dialogueText(
            'ui/pi-computer/ComputerSearchCore.js',
            't_5f04ae9ed6a865bb382c'
          ),
        18,
        '#535b5c'
      );

      if (this.error) {
        drawing.button(
          area.x + 96,
          area.y + 88,
          __dialogueText(
            'ui/pi-computer/ComputerSearchCore.js',
            't_942087cc2d41e01304b7'
          ),
          () => void this.load()
        );
      }

      return;
    }

    if (this.view === 'page' && page) {
      this.drawPage(page, area);
      return;
    }

    this.drawSearch(area);
  }

  destroy() {
    this.dead = true;
    this.browserStatusLabel = null;
    this.controller?.abort();

    for (const image of this.images) {
      image.onload = null;
      image.onerror = null;
    }

    this.images = [];
  }
}

for (const module of [
  ComputerSearchAssets,
  ComputerSearchState,
  ComputerSearchWidgets,
  ComputerSearchPages,
  ComputerSearchNotebook,
  ComputerSearchHome,
  ComputerSearchResults
]) {
  const descriptors = Object.getOwnPropertyDescriptors(
    module.prototype
  );

  delete descriptors.constructor;

  Object.defineProperties(
    ComputerSearch.prototype,
    descriptors
  );
}