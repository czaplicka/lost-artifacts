import { gameState } from '../../GameData.js';
import {
  requestAutosave
} from '../../gameStatePersistence.js';

const KEY = 'piMailboxV1';
const NOTIFICATIONS = 'piComputerMailNotifications';

const FOLDERS = new Set([
  'inbox',
  'archive',
  'trash'
]);

const list = value =>
  Array.isArray(value) ? value : [];

const uniqueIds = value => [
  ...new Set(
    list(value).filter(
      id => typeof id === 'string' && id
    )
  )
];

function normalizeFolder(value) {
  // Compatibility with the previous boolean API.
  if (value === true) return 'trash';
  if (value === false) return 'inbox';

  return FOLDERS.has(value)
    ? value
    : 'inbox';
}

export function isMailboxDraft(message) {
  return Boolean(
    message &&
    (
      message.id === 'alibi_box17_draft' ||
      /^Draft:/i.test(message.subject || '') ||
      /^(?:Draft|Unsent)/i.test(message.date || '')
    )
  );
}

function uniqueMessages(items) {
  const seen = new Set();

  return list(items).filter(message => {
    if (
      !message ||
      typeof message.id !== 'string' ||
      !message.id ||
      seen.has(message.id)
    ) {
      return false;
    }

    seen.add(message.id);
    return true;
  });
}

function snapshot(message) {
  try {
    // Preserve additional case metadata and attachments.
    return JSON.parse(JSON.stringify(message));
  } catch (error) {
    console.warn(
      '[PIMailbox] Full message snapshot failed:',
      error
    );

    const copy = {};

    for (const field of [
      'id',
      'from',
      'to',
      'subject',
      'date',
      'body',
      'threadId',
      'inReplyTo'
    ]) {
      if (typeof message[field] === 'string') {
        copy[field] = message[field];
      }
    }

    if (Array.isArray(message.attachments)) {
      try {
        copy.attachments = JSON.parse(
          JSON.stringify(message.attachments)
        );
      } catch (attachmentError) {
        console.warn(
          '[PIMailbox] Attachment snapshot failed:',
          attachmentError
        );
      }
    }

    return copy;
  }
}

/* ------------------------------------------------------------------ */
/*  Folder tab icons (tiny vector glyphs, 14x14)                       */
/* ------------------------------------------------------------------ */

function drawFolderIcon(g, folder, x, y, color) {
  g.lineStyle(2, color, 1);

  if (folder === 'inbox') {
    // Tray
    g.beginPath();
    g.moveTo(x, y + 6);
    g.lineTo(x + 3, y + 6);
    g.lineTo(x + 4, y + 9);
    g.lineTo(x + 10, y + 9);
    g.lineTo(x + 11, y + 6);
    g.lineTo(x + 14, y + 6);
    g.lineTo(x + 14, y + 13);
    g.lineTo(x, y + 13);
    g.closePath();
    g.strokePath();

    // Arrow dropping in
    g.beginPath();
    g.moveTo(x + 7, y);
    g.lineTo(x + 7, y + 5);
    g.strokePath();
    return;
  }

  if (folder === 'archive') {
    // Lid + box
    g.strokeRect(x, y + 1, 14, 4);
    g.strokeRect(x + 1, y + 5, 12, 8);

    g.beginPath();
    g.moveTo(x + 5, y + 8);
    g.lineTo(x + 9, y + 8);
    g.strokePath();
    return;
  }

  // Trash can
  g.beginPath();
  g.moveTo(x + 1, y + 3);
  g.lineTo(x + 13, y + 3);
  g.moveTo(x + 5, y + 1);
  g.lineTo(x + 9, y + 1);
  g.strokePath();

  g.strokeRect(x + 2, y + 4, 10, 9);

  g.lineStyle(1, color, 1);
  g.beginPath();
  g.moveTo(x + 5, y + 6);
  g.lineTo(x + 5, y + 11);
  g.moveTo(x + 9, y + 6);
  g.lineTo(x + 9, y + 11);
  g.strokePath();
}

export class PIMailboxStore {
  constructor(
    state = gameState,
    save = requestAutosave
  ) {
    this.state = state;
    this.save = save;
  }

  read() {
    const raw = this.state[KEY];

    const records = list(raw?.records).filter(
      record =>
        record &&
        typeof record.id === 'string' &&
        Number.isFinite(record.order)
    );

    const sequence = records.reduce(
      (highest, record) =>
        Math.max(highest, record.order),
      Math.max(
        0,
        Number(raw?.sequence) || 0
      )
    );

    const deleted = uniqueIds(raw?.deleted);
    const deletedSet = new Set(deleted);

    const archived = uniqueIds(
      raw?.archived
    ).filter(id => !deletedSet.has(id));

    return {
      version: 1,
      sequence,
      records,
      deleted,
      archived
    };
  }

  write(next) {
    this.state[KEY] = next;
    this.save();
  }

  sync(items) {
    const messages = uniqueMessages(items);
    const state = this.read();

    const records = [...state.records];

    const seen = new Set(
      records.map(record => record.id)
    );

    let sequence = state.sequence;
    let changed = false;

    if (!records.length) {
      const current = new Map(
        messages
          .filter(
            message => !isMailboxDraft(message)
          )
          .map(
            message => [message.id, message]
          )
      );

      const known = list(
        this.state[NOTIFICATIONS]?.known
      );

      for (const id of known) {
        if (
          !current.has(id) ||
          seen.has(id)
        ) {
          continue;
        }

        records.push({
          id,
          order: ++sequence
        });

        seen.add(id);
        changed = true;
      }
    }

    for (const message of [...messages].reverse()) {
      if (
        isMailboxDraft(message) ||
        seen.has(message.id)
      ) {
        continue;
      }

      records.push({
        id: message.id,
        order: ++sequence
      });

      seen.add(message.id);
      changed = true;
    }

    const next = {
      ...state,
      sequence,
      records
    };

    if (changed) {
      this.write(next);
    }

    const byId = new Map(
      records.map(record => [
        record.id,
        record
      ])
    );

    const combined = [...messages];

    const present = new Set(
      messages.map(message => message.id)
    );

    for (const record of records) {
      if (
        !present.has(record.id) &&
        record.copy?.id === record.id
      ) {
        combined.push(record.copy);
        present.add(record.id);
      }
    }

    combined.sort((a, b) => {
      const aa = isMailboxDraft(a)
        ? Infinity
        : byId.get(a.id)?.order || 0;

      const bb = isMailboxDraft(b)
        ? Infinity
        : byId.get(b.id)?.order || 0;

      return aa === bb ? 0 : bb - aa;
    });

    return {
      state: next,
      messages: combined
    };
  }

  filter(messages, state, folder = 'inbox') {
    const target = normalizeFolder(folder);
    const deleted = new Set(state.deleted);
    const archived = new Set(state.archived);

    return messages.filter(message => {
      if (target === 'trash') {
        return deleted.has(message.id);
      }

      if (target === 'archive') {
        return (
          !deleted.has(message.id) &&
          archived.has(message.id)
        );
      }

      return (
        !deleted.has(message.id) &&
        !archived.has(message.id)
      );
    });
  }

  visible(items, folder = 'inbox') {
    const result = this.sync(items);

    return this.filter(
      result.messages,
      result.state,
      folder
    );
  }

  archive(message) {
    if (
      !message?.id ||
      isMailboxDraft(message)
    ) {
      return false;
    }

    const state = this.sync([message]).state;

    if (
      state.archived.includes(message.id) ||
      state.deleted.includes(message.id)
    ) {
      return false;
    }

    this.write({
      ...state,

      archived: [
        ...state.archived,
        message.id
      ],

      records: state.records.map(record =>
        record.id === message.id
          ? {
              ...record,
              copy: snapshot(message)
            }
          : record
      )
    });

    return true;
  }

  remove(message) {
    if (
      !message?.id ||
      isMailboxDraft(message)
    ) {
      return false;
    }

    const state = this.sync([message]).state;

    if (state.deleted.includes(message.id)) {
      return false;
    }

    this.write({
      ...state,

      deleted: [
        ...state.deleted,
        message.id
      ],

      archived: state.archived.filter(
        id => id !== message.id
      ),

      records: state.records.map(record =>
        record.id === message.id
          ? {
              ...record,
              copy: snapshot(message)
            }
          : record
      )
    });

    return true;
  }

  restore(id) {
    const state = this.read();

    if (
      !state.deleted.includes(id) &&
      !state.archived.includes(id)
    ) {
      return false;
    }

    this.write({
      ...state,

      deleted: state.deleted.filter(
        value => value !== id
      ),

      archived: state.archived.filter(
        value => value !== id
      )
    });

    return true;
  }
}

export class PIMailbox {
  constructor(ui, documents) {
    this.ui = ui;
    this.documents = documents;

    this.store = new PIMailboxStore();
    this.folder = 'inbox';

    this.dead = false;
    this.installed = false;
    this.restorers = [];
    this.raw = null;

    this.renderingMail = false;
    this.renderResult = null;

    this.onShutdown = () => this.destroy();

    ui.scene.events.once(
      'shutdown',
      this.onShutdown
    );

    queueMicrotask(() => this.install());
  }

  get trash() {
    return this.folder === 'trash';
  }

  set trash(value) {
    this.folder = value ? 'trash' : 'inbox';
  }

  install() {
    if (
      this.dead ||
      this.ui.destroyed ||
      this.installed
    ) {
      return;
    }

    this.installed = true;

    const docs = this.documents;
    const ui = this.ui;

    const originalMail = docs.getMail;

    this.raw = originalMail.bind(docs);

    const wrappedMail = (...args) => {
      if (
        this.renderingMail &&
        this.renderResult
      ) {
        return this.store.filter(
          this.renderResult.messages,
          this.renderResult.state,
          this.folder
        );
      }

      return this.store.visible(
        this.raw(...args),
        'inbox'
      );
    };

    docs.getMail = wrappedMail;

    this.restorers.push(() => {
      if (docs.getMail === wrappedMail) {
        docs.getMail = originalMail;
      }
    });

    const originalRender = docs.render;

    const wrappedRender = (...args) => {
      if (
        this.dead ||
        ui.app !== 'mail' ||
        !ui.window
      ) {
        return originalRender.apply(
          docs,
          args
        );
      }

      const box = ui.window;

      const previousRendering =
        this.renderingMail;

      const previousResult =
        this.renderResult;

      const result = this.store.sync(
        this.raw()
      );

      this.renderingMail = true;
      this.renderResult = result;

      // Reserve space for folder tabs and mail actions.
      const contentBox = {
        ...box,
        y: box.y + 44,
        h: box.h - 96
      };

      const oldButton = ui.drawing.button;

      const movedButton = function (
        x,
        y,
        label,
        ...rest
      ) {
        if (
          label === 'HINT' &&
          Math.abs(
            x - (contentBox.x + 180)
          ) < 2 &&
          Math.abs(
            y -
            (
              contentBox.y +
              contentBox.h -
              77
            )
          ) < 2
        ) {
          return oldButton.call(
            this,
            box.x + 180,
            box.y + 6,
            label,
            ...rest
          );
        }

        return oldButton.call(
          this,
          x,
          y,
          label,
          ...rest
        );
      };

      ui.window = contentBox;
      ui.drawing.button = movedButton;

      let returned;

      try {
        returned = originalRender.apply(
          docs,
          args
        );
      } finally {
        ui.window = box;

        if (
          ui.drawing.button === movedButton
        ) {
          ui.drawing.button = oldButton;
        }

        this.renderingMail =
          previousRendering;

        this.renderResult =
          previousResult;
      }

      this.renderControls(box, result);

      return returned;
    };

    docs.render = wrappedRender;

    this.restorers.push(() => {
      if (docs.render === wrappedRender) {
        docs.render = originalRender;
      }
    });

    for (const method of [
      'open',
      'openApp'
    ]) {
      if (
        typeof ui[method] !== 'function'
      ) {
        continue;
      }

      const original = ui[method];
      const owner = this;

      const wrapped = function (...args) {
        if (
          method === 'open' ||
          args[0] === 'mail'
        ) {
          owner.folder = 'inbox';
        }

        return original.apply(
          this,
          args
        );
      };

      ui[method] = wrapped;

      this.restorers.push(() => {
        if (ui[method] === wrapped) {
          ui[method] = original;
        }
      });
    }

    if (
      ui.isOpen &&
      !ui.suspended &&
      ui.app === 'mail'
    ) {
      ui.render();
    }
  }

  displayed() {
    if (
      !this.installed ||
      !this.raw
    ) {
      return this.documents.getMail();
    }

    return this.store.visible(
      this.raw(),
      this.folder
    );
  }

  available() {
    const ui = this.ui;

    return Boolean(
      !this.dead &&
      !ui.destroyed &&
      ui.isOpen &&
      !ui.suspended &&
      ui.app === 'mail'
    );
  }

  resetView() {
    const ui = this.ui;

    ui.selectedId = null;
    ui.listPage = 0;
    ui.bodyPage = 0;
    ui.notice = '';
    ui.viewToken += 1;

    if (this.documents.artworkUI) {
      this.documents.artworkUI.zoom = null;
    }
  }

  switchFolder(folder) {
    if (!this.available()) return;

    const next = normalizeFolder(folder);

    if (next === this.folder) return;

    this.folder = next;
    this.resetView();
    this.ui.render();
  }

  renderControls(box, result) {
    const ui = this.ui;
    const d = ui.drawing;

    const folders = [
      ['inbox', 'INBOX'],
      ['archive', 'ARCHIVE'],
      ['trash', 'TRASH']
    ];

    const gap = 8;
    const totalWidth = Math.max(
      1,
      box.w - 28
    );

    const tabWidth =
      (totalWidth - gap * 2) / 3;

    const tabY = box.y + 48;
    const tabHeight = 32;

    folders.forEach(
      ([folder, label], index) => {
        const count = this.store.filter(
          result.messages,
          result.state,
          folder
        ).length;

        const active =
          this.folder === folder;

        const x =
          box.x +
          14 +
          index * (tabWidth + gap);

        d.bevel(
          x,
          tabY,
          tabWidth,
          tabHeight,
          active
            ? 0x304b69
            : 0xd0cec6,
          active
        );

        // Active tab gets a gold top edge
        if (active) {
          d.rectangle(
            x + 3,
            tabY + 3,
            tabWidth - 6,
            3,
            0xd4af37
          );
        }

        const hit = d.rectangle(
          x,
          tabY,
          tabWidth,
          tabHeight,
          0xffffff,
          0
        );

        // Folder icon
        const icon = d.add(
          ui.scene.add.graphics()
        );

        drawFolderIcon(
          icon,
          folder,
          x + 12,
          tabY + 10,
          active
            ? 0xf4efd8
            : 0x3a392f
        );

        // Count badge
        const countStr = String(count);
        const badgeW = Math.max(
          24,
          countStr.length * 9 + 14
        );
        const badgeH = 18;
        const badgeX =
          x + tabWidth - badgeW - 10;
        const badgeY =
          tabY + (tabHeight - badgeH) / 2 + 1;

        const badge = d.add(
          ui.scene.add.graphics()
        );

        badge.fillStyle(
          count === 0
            ? 0x9b998c
            : active
              ? 0xd4af37
              : 0x294b70,
          1
        );

        badge.fillRoundedRect(
          badgeX,
          badgeY,
          badgeW,
          badgeH,
          6
        );

        badge.lineStyle(1, 0x1c1e1a, 0.6);

        badge.strokeRoundedRect(
          badgeX,
          badgeY,
          badgeW,
          badgeH,
          6
        );

        d.pixel(
          badgeX + badgeW / 2,
          badgeY + badgeH / 2 + 1,
          countStr,
          8,
          count === 0
            ? '#e9e7dc'
            : active
              ? '#2b2a26'
              : '#f4efd8'
        ).setOrigin(0.5);

        // Label
        const text = d.pixel(
          x + 34,
          tabY + 11,
          '',
          10,
          active
            ? '#ffffff'
            : '#252820'
        );

        d.fit(
          text,
          label,
          Math.max(
            1,
            tabWidth - 34 - badgeW - 18
          )
        );

        if (!active) {
          hit.setInteractive({
            useHandCursor: true
          });

          hit.on('pointerdown', () => {
            if (!this.available()) return;

            ui.options.onSfx?.('click');
            this.switchFolder(folder);
          });
        }
      }
    );

    const messages = this.store.filter(
      result.messages,
      result.state,
      this.folder
    );

    if (!messages.length) {
      const emptyText =
        this.folder === 'archive'
          ? 'Archive empty. The paperwork refuses to file itself.'
          : this.folder === 'trash'
            ? 'Trash empty. Even your bad decisions are well organized.'
            : 'Inbox empty. Not even spam. Suspicious.';

      d.text(
        box.x + 24,
        box.y + box.h - 91,
        emptyText,
        14,
        '#655f50',
        box.w - 48
      );

      return;
    }

    const selected = messages.find(
      message =>
        message.id === ui.selectedId
    );

    if (!selected) return;

    const actionY =
      box.y + box.h - 89;

    const canMove =
      !isMailboxDraft(selected);

    if (this.folder === 'inbox') {
      d.button(
        box.x + 14,
        actionY,
        'ARCHIVE',
        () => this.act(
          selected,
          'archive'
        ),
        canMove
      );
    } else {
      d.button(
        box.x + 14,
        actionY,
        'MOVE TO INBOX',
        () => this.act(
          selected,
          'restore'
        ),
        canMove
      );
    }

    if (this.folder !== 'trash') {
      d.button(
        box.x + box.w - 105,
        actionY,
        'TRASH',
        () => this.act(
          selected,
          'trash'
        ),
        canMove
      );
    }
  }

  act(message, action = null) {
    if (
      !this.available() ||
      !message?.id
    ) {
      return;
    }

    const before = this.displayed();

    const index = before.findIndex(
      item => item.id === message.id
    );

    if (index < 0) return;

    // Use the current stored message, not an old UI reference.
    const current = before[index];

    const operation =
      action ||
      (
        this.folder === 'inbox'
          ? 'archive'
          : 'restore'
      );

    let changed = false;
    let notice = '';

    if (
      operation === 'archive' &&
      this.folder === 'inbox'
    ) {
      changed = this.store.archive(
        current
      );

      notice =
        'Message archived. Case progress has not been changed.';
    } else if (
      operation === 'trash' &&
      this.folder !== 'trash'
    ) {
      changed = this.store.remove(
        current
      );

      notice =
        'Message moved to Trash. Case progress has not been changed.';
    } else if (
      operation === 'restore' &&
      this.folder !== 'inbox'
    ) {
      changed = this.store.restore(
        current.id
      );

      notice =
        'Message moved to Inbox.';
    }

    if (!changed) return;

    const after = this.displayed();

    const nextIndex = Math.min(
      index,
      Math.max(0, after.length - 1)
    );

    const ui = this.ui;

    ui.selectedId =
      after[nextIndex]?.id || null;

    ui.bodyPage = 0;
    ui.viewToken += 1;
    ui.notice = notice;

    if (!after.length) {
      ui.listPage = 0;
    }

    if (this.documents.artworkUI) {
      this.documents.artworkUI.zoom = null;
    }

    ui.render();
  }

  destroy() {
    if (this.dead) return;

    this.dead = true;

    this.ui.scene.events.off(
      'shutdown',
      this.onShutdown
    );

    for (
      const restore of
      [...this.restorers].reverse()
    ) {
      restore();
    }

    this.restorers = [];
    this.raw = null;
    this.renderResult = null;
    this.renderingMail = false;
  }
}