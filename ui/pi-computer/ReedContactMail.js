import { EventBus } from '../../EventBus.js';
import { gameState } from '../../GameData.js';

import {
  requestAutosave
} from '../../gameStatePersistence.js';

import {
  getReedContactService,
  getReedContactRecord,
  ownedMobileLine,
  REED_CONTACT_CHANGED
} from '../../managers/ReedContactService.js';

import {
  REED_MAIL_VARIANTS,
  buildReedMailBody
} from '../../managers/ReedMailContent.js';

import { ReedReportUI } from './ReedReportUI.js';

const ID = 'reed_claire_outgoing';
const DRAFT = 'reedMailDraft';

export class ReedContactMail {
  constructor(ui) {
    Object.assign(this, {
      ui,
      dead: false,
      composing: false
    });

    this.service = getReedContactService(
      ui.scene.game
    );

    this.onChange = () => this.refresh();

    EventBus.on(
      REED_CONTACT_CHANGED,
      this.onChange,
      null,
      this
    );

    const docs = ui.documents;
    const originalGetMail = docs.getMail.bind(docs);

    docs.getMail = () => {
      const items = originalGetMail().filter(
        item => item.id !== ID
      );

      const config = this.service.data;
      const sent = getReedContactRecord();

      if (
        !config ||
        !sent ||
        !gameState.piQuests?.quests?.[config.questId]
      ) {
        return items;
      }

      const at = sent.sentAt;

      const date =
        `Day ${Math.floor(at / 1440) + 1}, ` +
        `${String(Math.floor(at % 1440 / 60)).padStart(2, '0')}:` +
        String(at % 60).padStart(2, '0');

      return [
        {
          id: ID,
          from: `You → ${sent.to || config.email}`,
          subject: `Sent: ${config.subject}`,
          date,
          body: sent.body
        },
        ...items
      ];
    };

    const originalRender = docs.render.bind(docs);

    docs.render = () => {
      if (this.dead) {
        return originalRender();
      }

      if (
        ui.app === 'mail' &&
        this.composing
      ) {
        this.renderComposer();
        return;
      }

      originalRender();

      if (ui.app === 'mail') {
        const bounds = ui.window;

        ui.drawing.button(
          bounds.x + bounds.w - 206,
          bounds.y + 6,
          'NEW MAIL',
          () => void this.openComposer()
        );
      }
    };

    const originalSelectKeyword =
      ui.search.selectKeyword.bind(ui.search);

    ui.search.selectKeyword = id => {
      if (
        !this.dead &&
        ui.app === 'mail' &&
        this.composing
      ) {
        this.selectRecipient(id);
        return;
      }

      originalSelectKeyword(id);
    };

    const originalSearchRefresh =
      ui.search.refresh.bind(ui.search);

    ui.search.refresh = () => {
      if (
        !this.dead &&
        ui.app === 'mail' &&
        this.composing
      ) {
        this.refresh();
      } else {
        originalSearchRefresh();
      }
    };

    const originalMonitorRender =
      ui.monitor.render.bind(ui.monitor);

    ui.monitor.render = () => {
      originalMonitorRender();

      if (
        !this.dead &&
        this.composing &&
        ui.app === 'mail' &&
        ui.isOpen &&
        !ui.suspended &&
        !ui.destroyed &&
        !ui.booting &&
        ui.search.data
      ) {
        ui.search.renderNotebook();
        ui.pin?.();
      }
    };

    this.reportUI = new ReedReportUI(ui);

    void this.service.load();
  }

  refresh() {
    const ui = this.ui;

    if (
      !this.dead &&
      !ui.destroyed &&
      ui.isOpen &&
      !ui.suspended &&
      ui.app === 'mail'
    ) {
      ui.render();
    }
  }

  available() {
    const config = this.service.data;

    if (!config?.questId) {
      return false;
    }

    return (
      gameState.piQuests
        ?.quests?.[config.questId]?.status === 'active'
    );
  }

  knownAddress() {
    const config = this.service.data;

    if (!config) {
      return false;
    }

    const known =
      gameState.piKeywordSearch
        ?.cases?.[config.searchCaseId]?.known || [];

    return known.includes(config.requiredKeyword);
  }

  hasReedRecipient() {
    const config = this.service.data;

    return Boolean(
      config?.email &&
      this.available() &&
      this.knownAddress() &&
      this.draft.to === config.email
    );
  }

  get draft() {
    return gameState[DRAFT] || {
      version: 1,
      to: '',
      variantId: null,
      route: null
    };
  }

  updateDraft(patch) {
    if (this.dead) return;

    gameState[DRAFT] = {
      ...this.draft,
      ...patch,
      version: 1
    };

    requestAutosave();
  }

  selectRecipient(keywordId) {
    if (
      this.dead ||
      !this.composing
    ) {
      return;
    }

    const config = this.service.data;

    if (
      !config ||
      !this.available() ||
      !this.knownAddress() ||
      keywordId !== config.requiredKeyword
    ) {
      return;
    }

    this.updateDraft({
      to: config.email,
      variantId: null,
      route: null
    });

    this.ui.bodyPage = 0;
    this.ui.notice = '';

    this.refresh();
  }

  officeNumber() {
    const directory =
      this.ui.scene.cache.json.get(
        'piPhoneDirectory'
      ) || {};

    return directory.contacts?.find(
      contact => contact.id === directory.ownContactId
    )?.number || '';
  }

  replyNumber() {
    if (this.draft.route === 'mobile') {
      return ownedMobileLine()?.number || '';
    }

    if (this.draft.route === 'office') {
      return this.officeNumber();
    }

    return '';
  }

  isCurrentComposer(token) {
    const ui = this.ui;

    return Boolean(
      !this.dead &&
      !ui.destroyed &&
      ui.isOpen &&
      !ui.suspended &&
      ui.app === 'mail' &&
      this.composing &&
      ui.viewToken === token
    );
  }

  async openComposer() {
    const ui = this.ui;

    if (
      this.dead ||
      ui.destroyed ||
      !ui.isOpen ||
      ui.suspended ||
      ui.app !== 'mail'
    ) {
      return;
    }

    const token = ++ui.viewToken;

    ui.notice = '';

    this.updateDraft({
      to: '',
      variantId: null,
      route: null
    });

    this.composing = true;

    ui.selectedId = null;
    ui.bodyPage = 0;
    ui.search.notesOpen = true;

    this.refresh();

    try {
      await Promise.all([
        this.service.load(),
        ui.search.load()
      ]);

      if (!this.isCurrentComposer(token)) {
        return;
      }

      this.refresh();
    } catch (error) {
      if (!this.isCurrentComposer(token)) {
        return;
      }

      console.error(
        '[ReedContactMail] Could not load mail contacts:',
        error
      );

      ui.notice =
        'Contacts could not be loaded. Please try again.';

      this.refresh();
    }
  }

  closeComposer() {
    this.composing = false;
    this.ui.bodyPage = 0;
    this.ui.selectedId = null;

    this.refresh();
  }

  chooseVariant(id) {
    if (
      this.dead ||
      !this.composing ||
      !this.hasReedRecipient()
    ) {
      return;
    }

    if (
      !REED_MAIL_VARIANTS.some(
        variant => variant.id === id
      )
    ) {
      return;
    }

    this.updateDraft({
      variantId: id
    });

    this.ui.bodyPage = 0;

    this.refresh();
  }

  chooseReplyRoute(route) {
    if (
      this.dead ||
      !this.composing ||
      !this.hasReedRecipient() ||
      !['office', 'mobile'].includes(route)
    ) {
      return;
    }

    this.updateDraft({
      route
    });

    this.ui.bodyPage = 0;

    this.refresh();
  }

  send() {
    if (
      this.dead ||
      !this.composing ||
      !this.hasReedRecipient()
    ) {
      return;
    }

    const result = this.service.send(
      this.draft.route,
      this.officeNumber(),
      {
        to: this.draft.to,
        variantId: this.draft.variantId
      }
    );

    this.ui.notice = result.message;

    if (result.ok) {
      this.composing = false;
      gameState[DRAFT] = null;

      requestAutosave();

      this.ui.selectedId = ID;
      this.ui.bodyPage = 0;
      this.ui.listPage = 0;
    }

    this.refresh();
  }

  renderComposer() {
    if (
      this.dead ||
      !this.composing
    ) {
      return;
    }

    const ui = this.ui;
    const drawing = ui.drawing;
    const bounds = ui.window;

    const x = bounds.x + 14;
    const y = bounds.y + 47;
    const width = bounds.w - 28;
    const bottom = bounds.y + bounds.h - 43;

    drawing.rectangle(
      x,
      y,
      width,
      bottom - y,
      0xf2ecd6
    );

    drawing.pixel(
      x + 14,
      y + 10,
      'NEW MESSAGE',
      11,
      '#303b32'
    );

    drawing.button(
      x + width - 102,
      y + 1,
      'BACK',
      () => this.closeComposer()
    );

    drawing.text(
      x + 14,
      y + 45,
      'TO:',
      15,
      '#303b32'
    );

    drawing.bevel(
      x + 60,
      y + 36,
      width - 76,
      31,
      0xffffff,
      true
    );

    const hasRecipient = this.hasReedRecipient();

    drawing.text(
      x + 70,
      y + 44,
      hasRecipient ? this.draft.to : '',
      15,
      '#303b32'
    );

    if (!hasRecipient) {
      drawing.text(
        x + 14,
        y + 76,
        'Select an email address from FIELD NOTES.',
        13,
        '#6f6a53',
        width - 28
      );

      drawing.button(
        x + width - 102,
        bottom - 56,
        'SEND',
        () => this.send(),
        false
      );

      return;
    }

    this.renderReedMessage({
      x,
      y,
      width,
      bottom
    });
  }

  renderReedMessage({
    x,
    y,
    width,
    bottom
  }) {
    if (!this.hasReedRecipient()) {
      return;
    }

    const ui = this.ui;
    const drawing = ui.drawing;

    REED_MAIL_VARIANTS.forEach(
      (variant, index) => {
        const selected =
          this.draft.variantId === variant.id;

        drawing.button(
          x + 14 + index * 155,
          y + 103,
          (selected ? '• ' : '') + variant.label,
          () => this.chooseVariant(variant.id)
        );
      }
    );

    const number = this.replyNumber();

    const body = buildReedMailBody(
      this.draft.variantId,
      number || '[reply number]',
      String(gameState.playerName || 'Detective')
    );

    const bodyY = y + 151;
    const controlsY = bottom - 65;

    const bodyHeight = Math.max(
      46,
      controlsY - bodyY - 24
    );

    if (body) {
      ui.documents.renderPagedText(
        body,
        x + 14,
        bodyY,
        width - 28,
        bodyHeight
      );
    } else {
      drawing.text(
        x + 14,
        bodyY,
        'Select a message.',
        16,
        '#77715c'
      );
    }

    drawing.text(
      x + 14,
      controlsY - 13,
      'Reply telephone:',
      13,
      '#303b32'
    );

    const office = this.officeNumber();
    const mobile = ownedMobileLine();

    drawing.button(
      x + 14,
      controlsY + 9,
      (this.draft.route === 'office' ? '• ' : '') +
        'OFFICE',
      () => this.chooseReplyRoute('office'),
      Boolean(office)
    );

    drawing.button(
      x + 155,
      controlsY + 9,
      (this.draft.route === 'mobile' ? '• ' : '') +
        'MOBILE',
      () => this.chooseReplyRoute('mobile'),
      Boolean(mobile)
    );

    drawing.text(
      x + 305,
      controlsY + 18,
      number,
      14,
      '#575c4c'
    );

    const ready = Boolean(
      this.hasReedRecipient() &&
      this.service.canSend() &&
      number &&
      REED_MAIL_VARIANTS.some(
        variant => variant.id === this.draft.variantId
      )
    );

    drawing.button(
      x + width - 102,
      controlsY + 9,
      'SEND',
      () => this.send(),
      ready
    );
  }

  destroy() {
    this.dead = true;
    this.composing = false;

    this.reportUI.destroy();
    EventBus.clearScope(this);
  }
}