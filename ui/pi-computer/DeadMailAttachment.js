import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  DEAD_MAIL_ART,
  containRect,
  referenceRect
} from '../../config/deadMailArtConfig.js';

import {
  acquireSideQuestAssets
} from '../../managers/SideQuestAssetScope.js';

import {
  getDeadMailProgress
} from '../../managers/DeadMailManager.js';

import {
  DEAD_MAIL_MESSAGE,
  DEAD_MAIL_SEARCH,
  DEAD_MAIL_PHOTO_DETAILS,
  hasDeadMailCorrespondence,
  markDeadMailMessageRead,
  inspectDeadMailPhoto,
  collectDeadMailPhoto,
  ensureDeadMailSearchDefinition
} from '../../managers/DeadMailCorrespondence.js';

import {
  getSearchProgress
} from './ComputerSearch.js';

import {
  drawEvidenceText
} from './EvidenceText.js';

export class DeadMailAttachment {
  constructor(ui) {
    Object.assign(this, {
      ui,
      active: false,
      dead: false,
      loading: false,
      error: '',
      scope: null,
      token: null
    });

    this.originalApplication =
      ui.monitor.renderApplication;

    this.renderApplication = () => {
      if (
        this.active &&
        ui.app === 'photo'
      ) {
        return this.render();
      }

      return this.originalApplication.call(
        ui.monitor
      );
    };

    ui.monitor.renderApplication =
      this.renderApplication;

    this.originalSearchLoad =
      ui.search.load;

    this.searchLoad = async (...args) => {
      const result =
        await this.originalSearchLoad.apply(
          ui.search,
          args
        );

      if (!this.dead) {
        const changed =
          ensureDeadMailSearchDefinition(
            ui.search
          );

        if (
          changed &&
          ui.isOpen &&
          !ui.suspended &&
          !ui.destroyed
        ) {
          ui.render();
        }
      }

      return result;
    };

    ui.search.load = this.searchLoad;
  }

  refresh() {
    if (
      !this.dead &&
      !this.ui.destroyed &&
      this.ui.isOpen &&
      !this.ui.suspended
    ) {
      this.ui.render();
    }
  }

  async open() {
    const ui = this.ui;

    if (
      this.dead ||
      !ui.isOpen ||
      ui.suspended ||
      !hasDeadMailCorrespondence()
    ) {
      return false;
    }

    if (this.active) {
      return true;
    }

    markDeadMailMessageRead(
      DEAD_MAIL_MESSAGE
    );

    this.active = true;
    this.error = '';

    ui.app = 'photo';
    ui.selectedId = DEAD_MAIL_MESSAGE;
    ui.menuOpen = false;
    ui.notice = '';
    ui.viewToken += 1;

    this.refresh();
    await this.load();

    return this.active;
  }

  async load() {
    if (
      this.dead ||
      !this.active ||
      this.loading
    ) {
      return;
    }

    const token = Symbol(
      'dead-mail-attachment'
    );

    this.token = token;
    this.loading = true;
    this.error = '';

    this.scope?.release();

    const scope = acquireSideQuestAssets(
      this.ui.scene.game
    );

    this.scope = scope;

    this.refresh();

    try {
      await Promise.all([
        scope.ready,
        this.ui.search.load()
      ]);

      if (
        this.dead ||
        !this.active ||
        this.token !== token
      ) {
        scope.release();
        return;
      }

      if (
        !this.ui.scene.textures.exists(
          DEAD_MAIL_ART.photo.key
        )
      ) {
        throw new Error(
          'The delivery photograph is missing ' +
          'from the texture cache.'
        );
      }

      ensureDeadMailSearchDefinition(
        this.ui.search
      );

      if (
        this.ui.search.data?.cases.some(
          entry =>
            entry.id === DEAD_MAIL_SEARCH
        )
      ) {
        this.ui.search.selectCase(
          DEAD_MAIL_SEARCH
        );
      }
    } catch (error) {
      scope.release();

      if (
        !this.dead &&
        this.active &&
        this.token === token
      ) {
        this.error =
          error.message || String(error);

        console.error(
          '[DeadMailAttachment]',
          error
        );
      }
    } finally {
      if (
        !this.dead &&
        this.token === token
      ) {
        this.loading = false;
        this.refresh();
      }
    }
  }

  close(returnToMail = true) {
    if (
      !this.active &&
      !this.scope
    ) {
      return;
    }

    this.active = false;
    this.token = null;
    this.loading = false;

    this.scope?.release();
    this.scope = null;

    if (
      returnToMail &&
      !this.dead &&
      !this.ui.destroyed &&
      this.ui.isOpen
    ) {
      Object.assign(this.ui, {
        app: 'mail',
        selectedId: DEAD_MAIL_MESSAGE,
        listPage: 0,
        bodyPage: 0,
        notice: '',
        menuOpen: false
      });

      this.ui.viewToken += 1;
      this.refresh();
    }
  }

  handleKey(event) {
    if (!this.active) {
      return false;
    }

    if (event.code === __dialogueText("ui/pi-computer/DeadMailAttachment.js", "t_037c968467aa3fd7c059")) {
      event.preventDefault();
      this.close();
    }

    return true;
  }

  render() {
    const ui = this.ui;
    const d = ui.drawing;
    const layout = ui.layout;

    const box = {
      x: layout.x + 14,
      y: layout.y + 10,
      w: layout.w - 28,
      h: layout.h - 58
    };

    ui.window = box;

    d.bevel(
      box.x,
      box.y,
      box.w,
      box.h,
      0xc6c7bf
    );

    // Title bar: leave the right-hand area
    // free for the shell window controls.
    d.rectangle(
      box.x + 4,
      box.y + 4,
      box.w - 8,
      30,
      0x244452
    );

    const title = d.pixel(
      box.x + 14,
      box.y + 14,
      '',
      10,
      '#fff0cc'
    );

    d.fit(
      title,
      __dialogueText("ui/pi-computer/DeadMailAttachment.js", "t_8e75da6b7c7f7910467d"),
      Math.max(1, box.w - 170)
    );

    // Navigation has its own row below the title bar.
    const toolbarY = box.y + 42;

    d.rectangle(
      box.x + 8,
      box.y + 38,
      box.w - 16,
      42,
      0xd6d5cb
    );

    d.button(
      box.x + 14,
      toolbarY,
      __dialogueText("ui/pi-computer/DeadMailAttachment.js", "t_709b7c6a930c516e8fdb"),
      () => this.close()
    );

    const photoTop = box.y + 90;

    if (
      this.loading ||
      this.error ||
      !ui.scene.textures.exists(
        DEAD_MAIL_ART.photo.key
      )
    ) {
      d.text(
        box.x + 20,
        photoTop + 12,
        this.error ||
          __dialogueText("ui/pi-computer/DeadMailAttachment.js", "t_7df3fde958ccace1b038"),
        18,
        '#383c38',
        box.w - 40
      );

      if (this.error) {
        d.button(
          box.x + 20,
          photoTop + 92,
          'RETRY',
          () => void this.load()
        );
      }

      return;
    }

    const config = DEAD_MAIL_ART.photo;

    const source = ui.scene.textures
      .get(config.key)
      .getSourceImage();

    const noteHeight = Math.max(
      112,
      Math.min(148, box.h * 0.28)
    );

    const noteY =
      box.y +
      box.h -
      noteHeight -
      10;

    const frame = containRect(
      source.width,
      source.height,
      {
        x: box.x + 16,
        y: photoTop,
        width: box.w - 32,
        height: Math.max(
          32,
          noteY - photoTop - 12
        )
      }
    );

    d.add(
      ui.scene.add.image(
        frame.x,
        frame.y,
        config.key
      )
        .setOrigin(0)
        .setDisplaySize(
          frame.width,
          frame.height
        )
    );

    for (const caption of config.captions) {
      const rect = referenceRect(
        caption.rect,
        config.reference,
        frame
      );

      d.text(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        caption.text,
        caption.size *
          frame.width /
          config.reference.width,
        caption.color,
        rect.width
      )
        .setOrigin(0.5)
        .setAlign('center')
        .setLineSpacing(1);
    }

    const progress =
      getDeadMailProgress();

    for (const hotspot of config.hotspots) {
      const rect = referenceRect(
        hotspot.rect,
        config.reference,
        frame
      );

      const recorded =
        progress.clues.includes(
          hotspot.id
        );

      const hit = d.rectangle(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0xe2b558,
        recorded ? 0.05 : 0
      ).setInteractive({
        useHandCursor: true
      });

      hit.setName(
        `dead-mail-attachment:${hotspot.id}`
      );

      hit.on('pointerdown', () => {
        if (
          !this.active ||
          this.dead ||
          ui.destroyed ||
          !ui.isOpen ||
          ui.suspended
        ) {
          return;
        }

        if (
          inspectDeadMailPhoto(
            hotspot.id
          )
        ) {
          this.refresh();
        }
      });
    }

    d.rectangle(
      box.x + 12,
      noteY,
      box.w - 24,
      noteHeight,
      0xeee3c4
    );

    d.text(
      box.x + 26,
      noteY + 8,
      `${__dialogueText("ui/pi-computer/DeadMailAttachment.js", "t_dc848dc229b13b31db2c")}${progress.clues.length}${__dialogueText("ui/pi-computer/DeadMailAttachment.js", "t_8d2cedfe81c77aaa05d9")}` +
        __dialogueText("ui/pi-computer/DeadMailAttachment.js", "t_d698c05bcbe8f821ebff"),
      14,
      '#5b604f',
      box.w - 52
    );

    const detail =
      DEAD_MAIL_PHOTO_DETAILS[
        progress.selectedPhotoDetail
      ];

    if (!detail) {
      d.text(
        box.x + 26,
        noteY + 40,
        __dialogueText("ui/pi-computer/DeadMailAttachment.js", "t_4c776cdca7aa4202c619") +
          __dialogueText("ui/pi-computer/DeadMailAttachment.js", "t_74dbf4d6e93c0a8a866a"),
        17,
        '#343e35',
        box.w - 52
      );

      return;
    }

    drawEvidenceText(ui, {
      blocks: [detail.fragments],
      x: box.x + 26,
      y: noteY + 40,
      width: box.w - 52,

      isKnown: id =>
        Boolean(
          getSearchProgress()
            .cases[DEAD_MAIL_SEARCH]
            ?.known?.includes(id)
        ),

      onCollect: () => {
        if (
          !this.active ||
          this.dead ||
          ui.destroyed ||
          !ui.isOpen ||
          ui.suspended
        ) {
          return;
        }

        if (
          collectDeadMailPhoto(
            progress.selectedPhotoDetail
          )
        ) {
          this.refresh();
        }
      }
    });
  }

  destroy() {
    if (this.dead) {
      return;
    }

    this.close(false);
    this.dead = true;

    if (
      this.ui.monitor.renderApplication ===
      this.renderApplication
    ) {
      this.ui.monitor.renderApplication =
        this.originalApplication;
    }

    if (
      this.ui.search.load ===
      this.searchLoad
    ) {
      this.ui.search.load =
        this.originalSearchLoad;
    }
  }
}