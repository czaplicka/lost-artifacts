import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';

import {
  inventoryManager
} from '../../managers/InventoryManager.js';

import {
  requestAutosave
} from '../../gameStatePersistence.js';

import {
  getEvidenceCaseKey,
  evidenceMatchesCase,
  readApartmentEvidence
} from '../../managers/ApartmentEvidenceModel.js';

import {
  resolveApartmentOccupant,
  createOccupantProgress,
  confrontApartmentOccupant
} from './ApartmentOccupantData.js';

import {
  ensureArtifactTrail,
  revealArtifactTrail,
  checkArtifactTrail
} from '../../systems/ArtifactTrailService.js';

import {
  trailEvidence,
  trailSummary
} from '../../systems/artifactTrailModel.js';

import {
  renderTrailPanel
} from '../../systems/ArtifactTrailPanel.js';

import {
  launchEmptyApartmentArrest
} from '../EmptyApartmentArrestOverlayScene.js';

export class ApartmentOccupantController {
  constructor(scene) {
    this.scene = scene;

    this.root = null;
    this.button = null;

    this.statementIndex = 0;
    this.itemIndex = 0;
    this.notice = '';

    this.callOpen = false;

    this.selection = {
      contact: 0,
      reference: 0
    };

    this.caseKey = getEvidenceCaseKey(gameState);

    this.occupant = resolveApartmentOccupant(
      {
        caseKey: this.caseKey,
        missionId: scene.missionId,
        suspectId: scene.suspectId,
        effect: scene.apartmentEffect
      },
      {
        progress: scene.getProgress(),
        items: inventoryManager.getAllItems()
      }
    );

    if (
      this.occupant &&
      scene.getProgress().occupantPlan?.caseKey !== this.caseKey
    ) {
      scene.updateProgress({
        occupantPlan: structuredClone(this.occupant)
      });
    }

    this.trail = this.occupant
      ? ensureArtifactTrail()
      : null;
  }

  installEvidence() {
    if (!this.occupant) return;

    const config = this.scene.apartmentConfig;

    const required = [
      this.occupant.evidence,
      ...(this.trail
        ? [trailEvidence(this.trail.plan)]
        : [])
    ];

    for (const evidence of required) {
      const alreadyInstalled = config.objects.some(object =>
        object.unlocks?.some(item => item.id === evidence.id)
      );

      if (alreadyInstalled) continue;

      const host = config.objects.find(object =>
        object.state !== 'locked' &&
        !object.unlocks?.some(item => item.isArtifact)
      );

      if (!host) {
        throw new Error(
          '[ApartmentOccupant] No accessible evidence host.'
        );
      }

      host.unlocks = [
        ...(host.unlocks || []),
        evidence
      ];

      const old = this.scene.getObjectProgress(host.id);

      if (
        old &&
        !this.scene.hasItemAlready(evidence.id)
      ) {
        this.scene.onObjectStateChanged(
          host.id,
          {
            ...old,
            contentsCollected: false,
            collectedIds: (old.collectedIds || []).filter(
              id => id !== evidence.id
            )
          }
        );
      }
    }
  }

  isCurrent() {
    return this.caseKey === getEvidenceCaseKey(gameState);
  }

  readProgress() {
    const saved = this.scene.getProgress().occupantInterview;

    if (
      saved?.caseKey === this.caseKey &&
      saved?.occupantId === this.occupant.id
    ) {
      return saved;
    }

    return createOccupantProgress(this.occupant);
  }

  mount() {
    // Runs even when the apartment has no roommate or partner.
    void launchEmptyApartmentArrest(this.scene);

    if (!this.occupant) return;

    const scene = this.scene;

    this.button = scene.add.text(
      scene.scale.width - 12,
      118,
      `${__dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_ed81c0632a204569bc64")}${this.occupant.role.toUpperCase()}${__dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_fe13f4313ea0880d091d")}`,
      {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#ffe0a0',
        backgroundColor: '#30251e',
        padding: {
          x: 10,
          y: 10
        }
      }
    )
      .setOrigin(1, 0)
      .setDepth(150)
      .setInteractive({
        useHandCursor: true
      });

    this.button.on('pointerdown', () => {
      this.open();
    });

    this.onResize = () => {
      this.button?.setPosition(
        scene.scale.width - 12,
        118
      );

      if (this.root) {
        this.render();
      }
    };

    scene.scale.on('resize', this.onResize);
  }

  items() {
    return inventoryManager
      .getAllItems()
      .filter(item =>
        item.metadata?.apartment &&
        evidenceMatchesCase(
          item,
          gameState,
          {
            allowLegacy: false
          }
        )
      )
      .map(item => readApartmentEvidence(item));
  }

  open() {
    const scene = this.scene;

    if (
      !this.isCurrent() ||
      scene.isTransitioning ||
      scene.leaveDialog ||
      !this.occupant
    ) {
      return;
    }

    inventoryManager.close();

    const hud = scene.getPlayerHudScene();

    hud?.closeAllUIPanels();

    this.host = hud?.sys?.isActive()
      ? hud
      : scene;

    if (this.host === hud) {
      hud.scene.setVisible(true);
      hud.scene.bringToTop();
    }

    this.notice = '';
    this.callOpen = false;

    this.render();
  }

  render() {
    this.closeRoot();

    if (!this.isCurrent()) return;

    const progress = this.readProgress();

    if (progress.solved && this.trail) {
      this.trail = revealArtifactTrail('occupant');

      if (this.callOpen) {
        this.root = renderTrailPanel(
          this.host,
          this.trail,
          {
            notice: this.notice,
            selection: this.selection,

            onClose: () => {
              this.callOpen = false;
              this.notice = '';
              this.render();
            },

            onSelection: selection => {
              this.selection = selection;
              this.notice = '';
              this.render();
            },

            onVerify: (contact, reference) => {
              const result = checkArtifactTrail(
                contact,
                reference
              );

              this.notice = result.ok
                ? __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_5299ae41078f943a47ca")
                : result.message;

              this.render();
            },

            footer:
              __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_7e47da8bb29b9ff2f1de") +
              __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_b8c8838b6361be802a78")
          }
        );

        this.scene.leaveDialog = this.root;
        return;
      }
    }

    const scene = this.host;

    const {
      width,
      height
    } = scene.scale;

    const panelWidth = Math.max(
      160,
      Math.min(720, width - 20)
    );

    const panelHeight = Math.max(
      180,
      Math.min(650, height - 20)
    );

    const root = scene.add
      .container(width / 2, height / 2)
      .setDepth(65000)
      .setScrollFactor(0);

    this.root = root;
    this.scene.leaveDialog = root;

    root.add(
      scene.add.rectangle(
        0,
        0,
        width,
        height,
        0x000000,
        0.86
      ).setInteractive()
    );

    root.add(
      scene.add.rectangle(
        0,
        0,
        panelWidth,
        panelHeight,
        0x241b16
      )
        .setStrokeStyle(2, 0xcba564)
        .setInteractive()
    );

    const text = (
      value,
      x,
      y,
      textWidth,
      textHeight,
      size = 19,
      color = '#f3e4cc'
    ) => {
      const object = scene.add.text(
        x,
        y,
        value,
        {
          fontFamily: 'SpecialElite',
          fontSize: `${size}px`,
          color,
          wordWrap: {
            width: textWidth
          },
          align: 'left'
        }
      );

      while (
        object.height > textHeight &&
        parseInt(object.style.fontSize, 10) > 10
      ) {
        object.setFontSize(
          parseInt(object.style.fontSize, 10) - 1
        );
      }

      root.add(object);

      return object;
    };

    const button = (label, x, y, callback) => {
      const object = text(
        label,
        x,
        y,
        panelWidth - 32,
        32,
        17,
        '#ffe0a0'
      );

      object.setInteractive({
        useHandCursor: true
      });

      object.on('pointerdown', callback);

      return object;
    };

    const left = -panelWidth / 2 + 16;
    const top = -panelHeight / 2;

    text(
      `${this.occupant.role.toUpperCase()}${__dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_ca2405ea78a40a6068d8")}`,
      left,
      top + 12,
      panelWidth - 32,
      30,
      22,
      '#ffd17d'
    );

    button(
      __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_94a691d45075b1eaa763"),
      panelWidth / 2 - 90,
      top + 42,
      () => this.close()
    );

    text(
      this.occupant.introduction,
      left,
      top + 72,
      panelWidth - 32,
      panelHeight * 0.12
    );

    if (progress.solved) {
      text(
        this.occupant.confrontation.confession,
        left,
        top + panelHeight * 0.30,
        panelWidth - 32,
        panelHeight * 0.24
      );

      const details = this.trail
        ? trailSummary(this.trail.plan)
        : (
            progress.lead?.text ||
            this.occupant.lead.text
          );

      text(
        `${__dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_6f404106a437e51137b9")}${details}`,
        left,
        top + panelHeight * 0.57,
        panelWidth - 32,
        panelHeight * 0.22,
        18,
        '#d9edb2'
      );

      if (this.trail) {
        button(
          this.trail.status === 'verified'
            ? __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_66c9c1dda0cf47bda3fd")
            : __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_f1c2a6b4972363a4b19e"),
          left,
          top + panelHeight * 0.84,
          () => {
            this.callOpen = true;
            this.notice = '';
            this.render();
          }
        );
      }

      return;
    }

    const statements = this.occupant.statements;

    this.statementIndex = (
      this.statementIndex + statements.length
    ) % statements.length;

    text(
      `${__dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_659376509384842fcbe6")}${this.statementIndex + 1}${__dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_8a5edab282632443219e")}${statements.length}`,
      left,
      top + panelHeight * 0.25,
      panelWidth - 32,
      22,
      15,
      '#ffd17d'
    );

    text(
      statements[this.statementIndex].text,
      left,
      top + panelHeight * 0.30,
      panelWidth - 32,
      panelHeight * 0.15
    );

    button(
      __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_ccb199547dcf4d998d21"),
      left,
      top + panelHeight * 0.46,
      () => {
        this.statementIndex--;
        this.notice = '';
        this.render();
      }
    );

    button(
      __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_77e1a5c904d373ecb1fa"),
      20,
      top + panelHeight * 0.46,
      () => {
        this.statementIndex++;
        this.notice = '';
        this.render();
      }
    );

    const items = this.items();

    this.itemIndex = items.length
      ? (this.itemIndex + items.length) % items.length
      : 0;

    const item = items[this.itemIndex];

    text(
      item
        ? (
            `${__dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_658299c41fdccee2bdf8")}${this.itemIndex + 1}${__dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_8a5edab282632443219e")}${items.length}${__dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_45822f54a0d0e030f756")}` +
            `${item.label || item.name}`
          )
        : (
            __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_aa6ce3704208b978be35") +
            __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_8d5ebad822547f935e20")
          ),
      left,
      top + panelHeight * 0.54,
      panelWidth - 32,
      panelHeight * 0.07,
      17,
      '#ffd17d'
    );

    text(
      item?.description || '',
      left,
      top + panelHeight * 0.62,
      panelWidth - 32,
      panelHeight * 0.12,
      16
    );

    button(
      __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_c049979a8694e8900817"),
      left,
      top + panelHeight * 0.75,
      () => {
        this.itemIndex--;
        this.render();
      }
    );

    button(
      __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_cbe76a435682605bc33f"),
      20,
      top + panelHeight * 0.75,
      () => {
        this.itemIndex++;
        this.render();
      }
    );

    button(
      __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_131a6e32c45be471969e"),
      left,
      top + panelHeight * 0.82,
      () => {
        this.present(
          statements[this.statementIndex].id,
          item?.id
        );
      }
    );

    text(
      this.notice,
      left,
      top + panelHeight * 0.90,
      panelWidth - 32,
      panelHeight * 0.08,
      15
    );
  }

  present(statementId, inventoryId) {
    if (!this.isCurrent()) {
      this.close();
      return;
    }

    const realItem = inventoryId
      ? inventoryManager.getItem(inventoryId)
      : null;

    if (
      !realItem ||
      !realItem.metadata?.apartment ||
      !evidenceMatchesCase(
        realItem,
        gameState,
        {
          allowLegacy: false
        }
      )
    ) {
      this.notice = __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_0495ae6f5626ddb5b123");
      this.render();
      return;
    }

    const result = confrontApartmentOccupant(
      this.occupant,
      this.readProgress(),
      statementId,
      readApartmentEvidence(realItem)
    );

    if (result.progress) {
      this.scene.updateProgress({
        occupantInterview: result.progress
      });
    }

    if (result.ok && !result.repeated) {
      const lead = this.occupant.lead;

      gameState.addClue({
        id: lead.id,
        type: 'apartment',
        category: 'apartment',
        key: lead.id,
        value: __dialogueText("scenes/apartament/ApartmentOccupantController.js", "t_5fd08d29be69208a1f11"),
        text: lead.text,
        missionId: this.scene.missionId,
        cityId: this.scene.cityId,
        source: 'apartment_occupant',
        status: 'unverified',
        isEscapeClue: false
      });

      if (this.trail) {
        this.trail = revealArtifactTrail('occupant');
      }

      requestAutosave();
    }

    this.notice = result.message;
    this.render();
  }

  closeRoot() {
    if (
      this.root &&
      this.scene.leaveDialog === this.root
    ) {
      this.scene.leaveDialog = null;
    }

    this.root?.destroy(true);
    this.root = null;
  }

  close() {
    this.closeRoot();
    this.callOpen = false;
  }

  destroy() {
    this.close();

    this.button?.destroy();
    this.button = null;

    if (this.onResize) {
      this.scene.scale.off(
        'resize',
        this.onResize
      );
    }
  }
}

export default ApartmentOccupantController;