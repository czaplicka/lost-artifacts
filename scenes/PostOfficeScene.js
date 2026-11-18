import {
  dialogueText as __dialogueText
} from '../dialogues/DialogueText.js';

import { BaseScene } from './BaseScene.js';
import * as Postal from '../managers/PostOfficeManager.js';

import {
  HomeTownDialogue
} from '../ui/HomeTownDialogue.js';

import {
  POST_OFFICE_ART,
  POST_OFFICE_HOTSPOTS
} from '../config/postOfficeConfig.js';

import {
  POSTAL_EVIDENCE_ART,
  POSTAL_DOCUMENTS
} from '../config/postOfficeEvidenceConfig.js';

import {
  replyIsWaiting,
  canViewPostalDocument,
  inspectPostalDetail,
  syncPostalEvidenceImages
} from '../managers/PostOfficeEvidence.js';

import {
  syncPostalNotebook
} from '../managers/PostOfficeNotebook.js';

import {
  PostalHotspotEditor
} from '../ui/PostalHotspotEditor.js';

import {
  hintManager
} from '../managers/HintManager.js';

import {
  installPostalAchievement,
  settlePostalCase,
  finishPostalCase,
  postalHintUsed,
  usePostalHint,
  canDiscussPostalDeadMail,
  discussPostalDeadMail
} from '../managers/PostalCaseSupport.js';

import {
  preloadDocumentSfx,
  playDocumentSfx
} from './archive/DocumentSfx.js';

const SOURCE = 'scenes/PostOfficeScene.js';
const t = id => __dialogueText(SOURCE, id);

const clone = value => JSON.parse(JSON.stringify(value));

const NAV = {
  back: {
    key: 'back',
    url: 'assets/buttons/back.webp'
  },
  exit: {
    key: 'btnExit',
    url: 'assets/buttons/exit.webp'
  }
};

export class PostOfficeScene extends BaseScene {
  constructor() {
    super({ key: 'PostOfficeScene' });
  }

  init() {
    this.view = 'room';
    this.documentId = null;
    this.documentOrigin = 'room';
    this.exiting = false;

    this.config = clone(POST_OFFICE_HOTSPOTS);
    this.documents = clone(POSTAL_DOCUMENTS);

    this.hotspots = [];
    this.modal = null;
    this.dialogue = null;
    this.visuals = null;
    this.tooltip = null;

    this.editor = null;
    this.hintTarget = null;
    this.hintTimer = null;
    this.hintBusy = false;
  }

  preload() {
    const assets = [
      ...Object.values(POST_OFFICE_ART),
      ...Object.values(POSTAL_EVIDENCE_ART),
      ...Object.values(NAV)
    ];

    for (const asset of assets) {
      if (!this.textures.exists(asset.key)) {
        this.load.image(asset.key, asset.url);
      }
    }

    preloadDocumentSfx(this, ['paper', 'page', 'click']);
  }

  create() {
    super.create();

    this.registry.set('currentSceneKey', 'PostOfficeScene');

    installPostalAchievement();
    Postal.visitPostOffice();
    settlePostalCase();
    syncPostalEvidenceImages();
    syncPostalNotebook();

    this.cameras.main.setBackgroundColor('#181b18');

    this.dialogue = new HomeTownDialogue(this, () => {
      this.modal = null;
      this.clearHover();
      syncPostalNotebook();
    });

    this.editor = new PostalHotspotEditor(this);

    this.trackInputEvent(
      this.scale,
      'resize',
      this.resizeView
    );

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown',
        this.onKey
      );
    }

    this.renderView();

    this.events.once('shutdown', () => {
      this.hintTimer?.remove(false);

      this.editor?.destroy();
      this.editor = null;

      this.dialogue?.destroy();
      this.dialogue = null;

      this.modal = null;
      this.hotspots = [];
      this.visuals = null;
      this.tooltip = null;
    });
  }

  postalDocumentSfx(name) {
    if (this.exiting || this.editor?.enabled) return;

    try {
      playDocumentSfx(
        this,
        name,
        name === 'click' ? 0.15 : 0.25
      );
    } catch (error) {
      console.debug(
        '[PostOfficeScene] Document audio unavailable:',
        error
      );
    }
  }

  style(size = 21) {
    return {
      fontFamily: 'SpecialElite, monospace',
      fontSize: size,
      color: '#fff1ce',
      backgroundColor: '#22251f',
      padding: {
        x: 9,
        y: 7
      },
      wordWrap: {
        width: Math.max(100, this.scale.width - 64)
      }
    };
  }

  spots() {
    return this.view === 'document'
      ? this.documents[this.documentId]?.spots || []
      : this.config[this.view] || [];
  }

  artwork() {
    if (this.view === 'document') {
      return POSTAL_EVIDENCE_ART[this.documentId];
    }

    if (this.view === 'restante') {
      return replyIsWaiting()
        ? POST_OFFICE_ART.restante
        : POSTAL_EVIDENCE_ART.restanteEmpty;
    }

    return POST_OFFICE_ART.room;
  }

  renderView() {
    this.visuals?.destroy(true);

    this.visuals = this.add.container(0, 0);
    this.hotspots = [];

    const {
      width: w,
      height: h
    } = this.scale;

    const documentView = this.view === 'document';

    const navHeight = Math.min(
      64,
      Math.max(36, h * 0.075)
    );

    const footerHeight = 72;
    const top = documentView ? navHeight + 12 : 0;
    const bottom = footerHeight;

    this.fit = {
      s: Math.min(
        w / 1920,
        Math.max(1, h - top - bottom) / 1080
      ),
      x: 0,
      y: 0
    };

    this.fit.x = (w - 1920 * this.fit.s) / 2;

    this.fit.y =
      top +
      (h - top - bottom - 1080 * this.fit.s) / 2;

    const art = this.artwork();
    let key = art?.key;

    if (
      !this.textures.exists(key) &&
      this.view === 'room' &&
      this.textures.exists(POST_OFFICE_ART.empty.key)
    ) {
      key = POST_OFFICE_ART.empty.key;
    }

    const missing = !key || !this.textures.exists(key);

    if (!missing) {
      this.visuals.add(
        this.add.image(
          this.fit.x,
          this.fit.y,
          key
        )
          .setOrigin(0)
          .setDisplaySize(
            1920 * this.fit.s,
            1080 * this.fit.s
          )
      );
    } else {
      this.visuals.add(
        this.add.text(
          20,
          top + 20,
          t('t_c54ad1bbc1e09689f9e7') +
            (art?.url || t('t_77d8435a38c1f74d60f0')),
          this.style(18)
        )
      );
    }

    this.tooltip = this.add.text(
      15,
      Math.max(0, h - footerHeight - 46),
      '',
      this.style(17)
    ).setVisible(false);

    this.visuals.add(this.tooltip);

    this.spots().forEach((config, index) => {
      this.makeHotspot(config, index);
    });

    if (documentView) {
      const titleX = 28 + w * 0.20;

      const title = this.add.text(
        titleX,
        12,
        this.documents[this.documentId].title,
        {
          ...this.style(17),
          wordWrap: {
            width: Math.max(
              20,
              w * 0.55 - titleX - 18
            )
          }
        }
      );

      while (
        title.height > navHeight &&
        parseInt(title.style.fontSize, 10) > 8
      ) {
        title.setFontSize(
          parseInt(title.style.fontSize, 10) - 1
        );
      }

      this.visuals.add(title);

      const overlay =
        this.documents[this.documentId].overlay;

      if (overlay && !missing) {
        const { s, x, y } = this.fit;

        const text = this.add.text(
          x + overlay.x * s,
          y + overlay.y * s,
          overlay.text,
          {
            fontFamily: 'SpecialElite, monospace',
            fontSize: Math.max(8, 27 * s),
            color: '#302923',
            lineSpacing: 3 * s,
            wordWrap: {
              width: overlay.w * s
            }
          }
        );

        while (
          text.height > overlay.h * s &&
          parseInt(text.style.fontSize, 10) > 7
        ) {
          text.setFontSize(
            parseInt(text.style.fontSize, 10) - 1
          );
        }

        this.visuals.add(text);
      }
    }

    this.drawFooter(documentView);

    if (this.view !== 'room') {
      this.addNavigationButton(
        w - 28 - w * 0.22,
        12,
        NAV.back,
        () => this.goBack(),
        navHeight
      );
    }

    this.addNavigationButton(
      14,
      12,
      NAV.exit,
      () => void this.leave(),
      navHeight,
      0
    );

    this.drawHintMarker();
    this.editor?.build();
  }

  drawFooter(documentView) {
    const {
      width: w,
      height: h
    } = this.scale;

    const footerY = h - 72;

    this.visuals.add(
      this.add.rectangle(
        0,
        footerY,
        w,
        72,
        0x171e1a,
        0.97
      ).setOrigin(0)
    );

    this.visuals.add(
      this.add.rectangle(
        0,
        footerY,
        w,
        2,
        0x9a8556
      ).setOrigin(0)
    );

    const hintWidth = Math.min(
      184,
      Math.max(104, w * 0.24),
      Math.max(1, w - 24)
    );

    const hintX = w - hintWidth - 12;

    this.addPanelButton(
      hintX,
      footerY + 12,
      hintWidth,
      48,
      'HINT',
      () => this.openHints(),
      'hint'
    );

    if (documentView) {
      const available = hintX - 24;

      if (available >= 72) {
        this.addPanelButton(
          12,
          footerY + 12,
          Math.min(224, available),
          48,
          t('t_5846a5f11aa1614da230')
            .replace(/^\s*\[|\]\s*$/g, ''),
          () => this.readTranscript(),
          'transcript'
        );
      }
    }
  }

  addPanelButton(
    x,
    y,
    width,
    height,
    label,
    action,
    name
  ) {
    const root = this.add.container(x, y);

    const shadow = this.add.rectangle(
      3,
      4,
      width,
      height,
      0x000000,
      0.35
    ).setOrigin(0);

    const face = this.add.rectangle(
      0,
      0,
      width,
      height,
      0xd5c49b
    )
      .setOrigin(0)
      .setStrokeStyle(2, 0xf4e6c5);

    const lowerEdge = this.add.rectangle(
      2,
      height - 4,
      Math.max(1, width - 4),
      2,
      0x756345
    ).setOrigin(0);

    const caption = this.add.text(
      width / 2,
      height / 2,
      label,
      {
        fontFamily: 'PressStart2P, monospace',
        fontSize: 12,
        color: '#242b23'
      }
    ).setOrigin(0.5);

    if (caption.width > width - 20) {
      caption.setScale(
        Math.max(0.1, (width - 20) / caption.width)
      );
    }

    const hit = this.add.zone(
      0,
      0,
      width,
      height
    )
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .setName(`post-office-button:${name}`);

    const allowed = () => (
      !this.modal &&
      !this.exiting &&
      !this.editor?.enabled
    );

    hit.on('pointerover', () => {
      if (!allowed()) return;
      face.setFillStyle(0xeee0bd);
    });

    hit.on('pointerout', () => {
      face.setFillStyle(0xd5c49b);
    });

    hit.on('pointerdown', () => {
      if (!allowed()) return;

      this.clearHover();
      this.postalDocumentSfx('click');
      action();
    });

    root.add([
      shadow,
      face,
      lowerEdge,
      caption,
      hit
    ]);

    this.visuals.add(root);

    return root;
  }

  addNavigationButton(
    x,
    y,
    asset,
    action,
    height,
    origin = 1
  ) {
    if (!this.textures.exists(asset.key)) {
      return this.addButton(
        x,
        y,
        asset === NAV.back ? 'BACK' : 'EXIT',
        action,
        18,
        origin
      );
    }

    const image = this.add.image(
      x,
      y,
      asset.key
    )
      .setOrigin(origin, 0)
      .setScale(
        Math.min(
          height / this.textures.get(asset.key).getSourceImage().height,
          (this.scale.width * 0.20) /
            this.textures.get(asset.key).getSourceImage().width
        )
      )
      .setInteractive({ useHandCursor: true });

    image.on('pointerdown', () => {
      if (
        !this.modal &&
        !this.exiting &&
        !this.editor?.enabled
      ) {
        action();
      }
    });

    this.visuals.add(image);

    return image;
  }

  addButton(
    x,
    y,
    label,
    action,
    size = 18,
    origin = 0
  ) {
    const text = this.add.text(
      x,
      y,
      label,
      this.style(size)
    )
      .setOrigin(origin, 0)
      .setInteractive({ useHandCursor: true });

    text.on('pointerdown', () => {
      if (
        !this.modal &&
        !this.exiting &&
        !this.editor?.enabled
      ) {
        action();
      }
    });

    this.visuals.add(text);

    return text;
  }

  resizeView() {
    if (this.editor) this.editor.drag = null;

    this.renderView();
    this.modal = this.dialogue?.root || null;
  }

  goBack() {
    if (this.view === 'document') {
      this.closeDocument();
    } else if (this.view === 'restante') {
      this.changeView('room');
    }
  }

  changeView(view) {
    const changed =
      this.view !== view ||
      this.documentId !== null;

    this.closeModal();

    this.view = view;
    this.documentId = null;

    this.renderView();

    if (changed) this.postalDocumentSfx('click');
  }

  clearHover() {
    this.tooltip?.setVisible(false);
  }

  openDocument(id) {
    if (!canViewPostalDocument(id)) {
      return this.info(
        t('t_ce246efc0e53c6412f7a'),
        t('t_64629d348541da73cdeb')
      );
    }

    const previousView = this.view;
    const previousId = this.documentId;

    this.closeModal();

    if (this.view !== 'document') {
      this.documentOrigin = this.view;
    }

    this.view = 'document';
    this.documentId = id;

    this.renderView();

    if (
      previousView !== 'document' ||
      previousId !== id
    ) {
      this.postalDocumentSfx(
        previousView === 'document' ? 'page' : 'paper'
      );
    }
  }

  closeDocument() {
    const changed = this.view === 'document';

    this.closeModal();

    this.view = this.documentOrigin === 'restante'
      ? 'restante'
      : 'room';

    this.documentId = null;

    this.renderView();

    if (changed) this.postalDocumentSfx('click');
  }

  readTranscript() {
    const document = this.documents[this.documentId];
    const before = this.modal;

    this.panel(
      document.title,
      document.overlay?.text ||
        t('t_9e237f22c4b775f0bd45'),
      document.spots.map(spot => [
        spot.label,
        () => this.inspectDocumentSpot(spot.id)
      ])
    );

    if (this.modal && this.modal !== before) {
      this.postalDocumentSfx('paper');
    }
  }

  inspectDocumentSpot(spotId) {
    const result = inspectPostalDetail(
      this.documentId,
      spotId
    );

    syncPostalNotebook();

    const document = this.documents[this.documentId];

    this.panel(
      document.title,
      result.text +
        (
          result.complete && document.clue
            ? t('t_d92fdbb55497c176918c')
            : ''
        ),
      document.spots
        .filter(spot => spot.id !== spotId)
        .map(spot => [
          spot.label,
          () => this.inspectDocumentSpot(spot.id)
        ])
    );
  }

  makeHotspot(config, index) {
    const { s, x, y } = this.fit;

    const zone = this.add.zone(
      x + config.x * s,
      y + config.y * s,
      config.w * s,
      config.h * s
    ).setInteractive({ useHandCursor: true });

    this.hotspots.push({
      cfg: config,
      index,
      zone
    });

    this.visuals.add(zone);

    zone.on('pointerover', () => {
      if (
        !this.modal &&
        !this.exiting &&
        !this.editor?.enabled
      ) {
        this.tooltip
          ?.setText(config.label)
          .setVisible(true);
      }
    });

    zone.on('pointerout', () => this.clearHover());

    zone.on('pointerdown', () => {
      if (
        this.modal ||
        this.exiting ||
        this.editor?.enabled
      ) {
        return;
      }

      if (this.view === 'document') {
        this.inspectDocumentSpot(config.id);
      } else {
        this.dispatch(config.action);
      }
    });
  }

  onKey(event) {
    if (
      event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT']
        .includes(event.target?.tagName) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat
    ) {
      return;
    }

    if (this.editor?.key(event)) {
      if (
        event.code === t('t_037c968467aa3fd7c059') &&
        this.editor.enabled
      ) {
        this.editor.toggle();
      }

      return;
    }

    if (event.code === t('t_037c968467aa3fd7c059')) {
      event.preventDefault();

      if (this.modal) {
        this.closeModal();
      } else if (this.view === 'room') {
        void this.leave();
      } else {
        this.goBack();
      }
    }
  }

  closeModal() {
    this.dialogue?.close(false);
    this.modal = null;
    this.clearHover();
  }

  panel(title, text, choices = [], portrait = false) {
    if (this.exiting) return;

    syncPostalNotebook();
    this.clearHover();

    this.modal = this.dialogue.show({
      title,
      text,
      choices,
      portrait: portrait
        ? POST_OFFICE_ART.portrait.key
        : null
    });
  }

  info(title, text) {
    this.panel(title, text);
  }

  dispatch(action) {
    if (this.modal || this.exiting) return;

    if (action === 'talk') return this.talk();

    if (action === 'return' || action === 'service') {
      return this.talk(t('t_b89122a79e83317ac2aa'));
    }

    if (action === 'restante') {
      return this.changeView('restante');
    }

    if (action === 'notice') {
      return this.openDocument('notice');
    }

    if (action === 'collect') return this.collectReply();

    if (['write', 'deposit'].includes(action)) {
      return this.correspondence();
    }

    const messages = {
      route: [
        't_c4044fad6c65500b9378',
        't_6a693eeda8cec77ae9e7'
      ],
      parcels: [
        't_e48a8adb8d97406658af',
        't_1f50add92d063e046037'
      ],
      policy: [
        't_a93f84f82992ddbdc19c',
        't_b74da47eeaa7ab2c48b3'
      ]
    };

    const entry = messages[action];

    if (entry) {
      return this.info(t(entry[0]), t(entry[1]));
    }
  }

  collectReply() {
    if (canViewPostalDocument('reply')) {
      return this.openDocument('reply');
    }

    const message = Postal.collectPostalReply();

    syncPostalNotebook();

    if (canViewPostalDocument('reply')) {
      syncPostalEvidenceImages();
      return this.openDocument('reply');
    }

    this.info(
      t('t_9a1d4939c221991f52c6'),
      message
    );
  }

  talk(message = t('t_db76acbe114fdff17f40')) {
    const choices = [
      [
        t('t_be792a0cb80d0c412e1c'),
        () => this.caseMenu()
      ],
      [
        t('t_88aac9b0c74879698739'),
        () => this.changeView('restante')
      ]
    ];

    if (canDiscussPostalDeadMail()) {
      choices.push([
        t('t_9faf1fd5294f364aa146'),
        () => this.deadMail()
      ]);
    }

    this.panel('POSTMAN', message, choices, true);
  }

  deadMail(message = t('t_e136c088138b947cf0b4')) {
    const labels = [
      t('t_0293a4db8164d160e2ac'),
      t('t_fdd85b70187dc8f62c41'),
      t('t_6d140c2d564f9d1ffc76')
    ];

    const choices = ['photo', 'route', 'gate'].map(
      (id, index) => [
        labels[index],
        () => this.deadMail(
          discussPostalDeadMail(id)
        )
      ]
    );

    choices.push([
      t('t_64646486e814dc4b26d0'),
      () => this.talk()
    ]);

    this.panel('POSTMAN', message, choices, true);
  }

  caseMenu(message = '') {
    syncPostalNotebook();

    const record = Postal.postalState().returnCase;
    const choices = [];

    let text = message;

    if (record.stage === 'new') {
      text ||= t('t_c2238db299edbd397c5a');

      choices.push([
        t('t_a178b6a78bdc3d07591a'),
        () => {
          Postal.startReturnCase();
          syncPostalNotebook();
          this.openDocument('envelope');
        }
      ]);
    } else {
      text ||= t('t_823b0147968cc2638c4e');

      choices.push([
        t('t_c4f6cd042b4b6134593d'),
        () => this.openDocument('envelope')
      ]);

      if (record.clues.includes('envelope')) {
        choices.push([
          t('t_a54b5da880bf890aec79'),
          () => this.openDocument('card')
        ]);
      }

      if (record.clues.includes('notice')) {
        choices.push([
          t('t_b103ce6128ade2838e13'),
          () => this.openDocument('notice')
        ]);
      }

      if (
        record.stage === 'investigating' &&
        record.clues.length === 3
      ) {
        choices.push([
          t('t_76fa4b064aed8af78ad6'),
          () => this.deduction()
        ]);
      }

      if (
        ['identified', 'waiting'].includes(record.stage)
      ) {
        choices.push([
          t('t_88aac9b0c74879698739'),
          () => this.changeView('restante')
        ]);
      }

      if (record.stage === 'waiting') {
        choices.push([
          t('t_8fec81657ba8ebc8cf65'),
          () => this.collectReply()
        ]);
      }

      if (record.stage === 'reply') {
        text = message || t('t_857b1a3ae0869e513e16');

        choices.push(
          [
            t('t_2f867370392b000ec90d'),
            () => this.openDocument('reply')
          ],
          [
            t('t_0590ec81ed567e85b375'),
            () => this.finishCase('private')
          ],
          [
            t('t_03e78342efe8e7f3d6fa'),
            () => this.finishCase('disclose')
          ]
        );
      }

      if (record.stage === 'completed') {
        text = message || t('t_c7d8bcba8ba671730645');

        choices.push(
          [
            t('t_fd2dbead2126d9634247'),
            () => this.openDocument('reply')
          ],
          [
            t('t_982e6df090ccce717f2b'),
            () => this.openDocument('reward')
          ]
        );
      }
    }

    choices.push([
      t('t_64646486e814dc4b26d0'),
      () => this.talk()
    ]);

    this.panel('POSTMAN', text, choices, true);
  }

  finishCase(choice) {
    const message = finishPostalCase(choice);

    syncPostalNotebook();

    if (
      Postal.postalState().returnCase.stage === 'completed'
    ) {
      syncPostalEvidenceImages();
      this.openDocument('reward');

      this.panel(
        t('t_3825cb7a28815e93b278'),
        choice === 'private'
          ? t('t_1c83f8bd40ca0ea6b75c')
          : t('t_0ef31a7034b573d28ff5')
      );
    } else {
      this.caseMenu(message);
    }
  }

  deduction(message = t('t_b25bb0bf239399c0d85b')) {
    this.panel(
      t('t_ce246efc0e53c6412f7a'),
      message,
      [
        [
          t('t_c24a897eb2aeb610497f'),
          () => this.caseMenu(
            Postal.identifyRecipient('ellis')
          )
        ],
        [
          t('t_4cae2e618eac4b894dc7'),
          () => this.deduction(
            Postal.identifyRecipient('office')
          )
        ],
        [
          t('t_9b4044ed4336171eb6e0'),
          () => this.deduction(
            Postal.identifyRecipient('address')
          )
        ],
        [
          t('t_5e068aeb73ef51893182'),
          () => this.caseMenu()
        ]
      ]
    );
  }

  correspondence(message = '') {
    const record = Postal.postalState().returnCase;

    if (
      !['identified', 'waiting', 'reply', 'completed']
        .includes(record.stage)
    ) {
      return this.info(
        t('t_9a1d4939c221991f52c6'),
        t('t_107e1811a00e9dc1de58')
      );
    }

    const choices = [];

    if (record.stage === 'identified') {
      const passwords = [
        t('t_9e3ce8d3f0616285504a'),
        t('t_6278571567bd45616c6f'),
        t('t_91f18fe806b2ef031916')
      ];

      for (const password of passwords) {
        choices.push([
          password,
          () => this.correspondence(
            Postal.leavePostalMessage(
              'CLOCKWORK',
              password,
              t('t_0ff04e715864d063e90d')
            )
          )
        ]);
      }
    } else {
      choices.push(
        [
          t('t_8fec81657ba8ebc8cf65'),
          () => this.collectReply()
        ],
        [
          t('t_1bf27bd9b754f9fc3a0d'),
          () => this.caseMenu()
        ]
      );
    }

    this.panel(
      'CLOCKWORK',
      message || t('t_40bb39ed39768ef9da42'),
      choices
    );
  }

  openHints() {
    const count = hintManager.getAvailableCount();
    const choices = [];

    if (count > 0) {
      choices.push([
        t('t_9aa56441d1dbebae2beb') +
          count +
          t('t_ba5ec51d07a4ac0e9516'),
        () => this.applyHint('free_hint')
      ]);
    }

    if (!postalHintUsed('squad_help')) {
      choices.push([
        t('t_f785c58379cdf7bbac98'),
        () => this.applyHint('squad_help')
      ]);
    }

    if (!postalHintUsed('cut_corners')) {
      choices.push([
        t('t_e5e9328332c5f8fa4907'),
        () => this.applyHint('cut_corners')
      ]);
    }

    this.panel(
      t('t_a5662670f19aa35c92d6'),
      t('t_10e799b95ced0c089ce0') +
        count +
        t('t_e6e749fdc44ba05e893a'),
      choices
    );
  }

  applyHint(method) {
    if (this.hintBusy) return;

    this.hintBusy = true;

    try {
      const result = usePostalHint(method);

      if (result.success) {
        this.hintTarget = result.target;

        this.hintTimer?.remove(false);

        this.hintTimer = this.time.delayedCall(
          20000,
          () => {
            this.hintTarget = null;

            if (!this._cleanupDone) {
              this.renderView();
            }
          }
        );

        this.renderView();
      }

      this.panel('HINT', result.text);
    } finally {
      this.hintBusy = false;
    }
  }

  drawHintMarker() {
    const target = this.hintTarget;

    if (
      !target ||
      target.view !== this.view ||
      (
        target.view === 'document' &&
        target.documentId !== this.documentId
      )
    ) {
      return;
    }

    const config = this.spots().find(
      spot => spot.id === target.id
    );

    if (!config) return;

    const { s, x, y } = this.fit;

    this.visuals.add(
      this.add.rectangle(
        x + config.x * s,
        y + config.y * s,
        config.w * s,
        config.h * s,
        0x89b94e,
        0.1
      ).setStrokeStyle(3, 0xb9ec70)
    );
  }

  async leave() {
    if (this.modal || this.exiting) return;

    this.exiting = true;

    syncPostalNotebook();

    try {
      const opened = await this.goto(
        'HomeCityScene',
        { entryPoint: 'post-office' }
      );

      if (opened === false && !this._cleanupDone) {
        this.exiting = false;

        this.info(
          'EXIT',
          t('t_e02a1ccf9b3526681918')
        );
      }
    } catch (error) {
      console.error(
        '[PostOfficeScene] Exit failed:',
        error
      );

      if (!this._cleanupDone) {
        this.exiting = false;

        this.info(
          'EXIT',
          t('t_e02a1ccf9b3526681918')
        );
      }
    }
  }
}