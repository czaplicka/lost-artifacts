import { gameState } from '../../GameData.js';
import {
  generateCaseCityState,
  buildEncounterId
} from '../../city-encounter-generator.js';
import { saveGameState } from '../../gameStatePersistence.js';
import {
  getNpcTextureKey,
  getNpcLabel
} from '../../npcThemeHelper.js';
import {
  addSessionScore
} from '../../managers/InvestigationManager.js';
import {
  getPursuitCityContext
} from '../../managers/PursuitCityContext.js';
import {
  NPC_SCALE,
  NPC_HOVER_SCALE
} from './CityConfig.js';
import {
  getForgerAccess
} from '../../systems/ForgerObservation.js';
import {
  ForgerObservationUI
} from '../../ui/ForgerObservationUI.js';

export class CityEncounters {
  ensureCityEncounterState(locations) {
    const existing = gameState.cityEncounterState;

    if (Array.isArray(existing[this.cityId])) return;

    const caseId =
      gameState.currentMission?.id ||
      gameState.currentMission?.caseId ||
      gameState.currentArtifact ||
      `${this.cityId}-default`;

    const generated = generateCaseCityState(
      locations,
      String(caseId),
      {}
    );

    gameState.cityEncounterState = {
      ...generated,
      ...existing
    };

    if (!Array.isArray(gameState.cityEncounterState[this.cityId])) {
      gameState.cityEncounterState[this.cityId] =
        generated[this.cityId] || [];
    }
  }

  ensureHarborEncounter() {
    if (this.city?.harbor !== true) return;

    const encounters = gameState.cityEncounterState[this.cityId];

    if (!Array.isArray(encounters)) return;

    if (encounters.find(entry =>
      entry?.locationId === 'harbor' &&
      entry.enabled !== false
    )) {
      return;
    }

    const pair = this.city.encounterPool?.find(entry =>
      entry?.npcId === 'sailor' &&
      entry?.locationId === 'harbor'
    ) || {
      id: `${this.cityId}_sailor_harbor`,
      npcId: 'sailor',
      locationId: 'harbor'
    };

    const occupied = new Set(
      encounters
        .filter(entry => entry?.enabled !== false)
        .map(entry => entry.slotId)
    );

    const free = this.city.encounterSlots?.find(slot =>
      slot.enabled &&
      !occupied.has(slot.id)
    );

    const slotId = free?.id || 'harbor_extra';

    const harbor = {
      id: buildEncounterId(this.cityId, pair.id, slotId),
      baseEncounterId: pair.id,
      cityId: this.cityId,
      cityX: free?.cityX ?? 130,
      cityY: free?.cityY ?? Math.max(230, this.scale.height - 260),
      slotId,
      npcId: pair.npcId,
      locationId: 'harbor',
      enabled: true
    };

    gameState.cityEncounterState = {
      ...gameState.cityEncounterState,
      [this.cityId]: [...encounters, harbor]
    };

    saveGameState();
  }

  getEncounters() {
    const list = gameState.cityEncounterState?.[this.cityId];

    return Array.isArray(list)
      ? list.filter(entry =>
          entry &&
          typeof entry === 'object' &&
          entry.enabled !== false
        )
      : [];
  }

  isEncounterVisited(id) {
    return gameState.hasEncounter(id);
  }

  getEncounterMemory(id) {
    if (!id) return null;

    const memory = gameState.encounterMemory;

    return memory &&
      typeof memory === 'object' &&
      !Array.isArray(memory)
      ? memory[id] || null
      : null;
  }

  getEncounterStatus(encounter) {
    const isVisited = this.isEncounterVisited(encounter.id);
    const memory = this.getEncounterMemory(encounter.id);

    return {
      isVisited,
      memory,
      hasMemory: Boolean(memory),
      isRepeat: isVisited || Boolean(memory)
    };
  }

  createEncounters() {
    this.destroyEncounterViews();

    for (const encounter of this.getEncounters()) {
      this.createEncounterView(encounter);
    }

    this.createForgerObservationButton();
  }

  createForgerObservationButton() {
    this.forgerObservationButton?.destroy(true);
    this.forgerObservationButton = null;

    const access = getForgerAccess(this.cityId);

    if (!access.available) return;

    const x = this.scale.width - 220;
    const y = 155;

    const root = this.add.container(x, y).setDepth(8);

    const background = this.add.rectangle(
      0,
      0,
      380,
      64,
      0x34251a
    ).setStrokeStyle(2, 0xd4af37)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(
      0,
      0,
      access.completed
        ? 'Document workshop · Notes'
        : 'Observe document forger',
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#ffe0a3',
        align: 'center',
        wordWrap: { width: 350 }
      }
    ).setOrigin(0.5);

    root.add([background, label]);

    background.on('pointerover', () => {
      background.setFillStyle(0x5c4229);
    });

    background.on('pointerout', () => {
      background.setFillStyle(0x34251a);
    });

    background.on('pointerdown', () => {
      if (!this.canStartInteraction()) return;

      const currentAccess = getForgerAccess(this.cityId);

      if (!currentAccess.available) return;

      const observation = new ForgerObservationUI(this);

      if (currentAccess.completed) {
        observation.page = 'notes';
      }

      observation.open();
    });

    this.forgerObservationButton = root;
    this.forgerObservationButtonLabel = label;
  }

  createEncounterView(encounter) {
    const texture = getNpcTextureKey(
      encounter.npcId,
      this.npcTheme
    );

    const icon = this.add.image(
      encounter.cityX,
      encounter.cityY,
      this.textures.exists(texture) ? texture : 'fence_w'
    )
      .setScale(NPC_SCALE)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });

    const name = getNpcLabel(encounter.npcId);

    const label = encounter.locationId === 'harbor'
      ? `${name} · Harbor`
      : name;

    const nameLabel = this.add.text(
      0,
      0,
      label,
      {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#000000bb',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
        align: 'center',
        wordWrap: { width: 220 }
      }
    ).setOrigin(0.5, 0).setDepth(4);

    const statusLabel = this.add.text(
      0,
      0,
      '',
      {
        fontFamily: 'SpecialElite',
        fontSize: '15px',
        color: '#f1e6b8',
        backgroundColor: '#000000cc',
        padding: { left: 6, right: 6, top: 3, bottom: 3 }
      }
    ).setOrigin(0.5, 1).setDepth(4).setVisible(false);

    const view = {
      encounter,
      icon,
      nameLabel,
      statusLabel,
      hovered: false
    };

    icon.on('pointerover', () => {
      if (!this.canStartInteraction()) return;

      view.hovered = true;
      this.updateEncounterView(view);
    });

    icon.on('pointerout', () => {
      view.hovered = false;
      this.updateEncounterView(view);
    });

    icon.on('pointerdown', pointer => {
      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      this.visitEncounter(encounter);
    });

    this.encounterViews.push(view);
    this.interactiveObjects.push(icon);
    this.updateEncounterView(view);
  }

  updateEncounterView(view) {
    if (!view.icon?.active) return;

    const {
      isVisited,
      memory,
      hasMemory
    } = this.getEncounterStatus(view.encounter);

    view.icon
      .setScale(view.hovered ? NPC_HOVER_SCALE : NPC_SCALE)
      .setAlpha(isVisited ? (view.hovered ? 0.88 : 0.72) : 1)
      .setTint(isVisited ? 0xc8c8c8 : 0xffffff);

    const halfWidth = view.icon.displayWidth / 2;
    const halfHeight = view.icon.displayHeight / 2;

    const minX = halfWidth + 12;
    const maxX = this.scale.width - halfWidth - 12;
    const minY = halfHeight + 115;
    const maxY = this.scale.height - halfHeight - 125;

    view.icon.setPosition(
      Phaser.Math.Clamp(
        Number(view.encounter.cityX) || this.scale.width / 2,
        Math.min(minX, maxX),
        Math.max(minX, maxX)
      ),
      Phaser.Math.Clamp(
        Number(view.encounter.cityY) || this.scale.height / 2,
        Math.min(minY, maxY),
        Math.max(minY, maxY)
      )
    );

    view.nameLabel
      .setPosition(
        view.icon.x,
        view.icon.y + halfHeight + 10
      )
      .setColor(
        view.hovered
          ? (isVisited ? '#f1e6b8' : '#ffe066')
          : (isVisited ? '#d0d0d0' : '#ffffff')
      );

    view.statusLabel
      .setPosition(
        view.icon.x,
        view.icon.y - halfHeight - 8
      )
      .setVisible(isVisited);

    if (isVisited) {
      view.statusLabel.setText(
        hasMemory && memory.reminderShown === false
          ? 'Can remind you'
          : 'Already questioned'
      );
    }
  }

  refreshEncounterViews() {
    for (const view of this.encounterViews) {
      view.hovered = false;
      this.updateEncounterView(view);
    }

    const access = getForgerAccess(this.cityId);

    this.forgerObservationButton?.setVisible(access.available);

    this.forgerObservationButtonLabel?.setText(
      access.completed
        ? 'Document workshop · Notes'
        : 'Observe document forger'
    );
  }

  destroyEncounterViews() {
    this.forgerObservationButton?.destroy(true);
    this.forgerObservationButton = null;
    this.forgerObservationButtonLabel = null;

    const views = this.encounterViews.splice(0);
    const icons = new Set(views.map(view => view.icon));

    this.interactiveObjects = this.interactiveObjects.filter(
      object => !icons.has(object)
    );

    for (const { icon, nameLabel, statusLabel } of views) {
      for (const object of [icon, nameLabel, statusLabel]) {
        object?.removeAllListeners?.();
        object?.destroy?.();
      }
    }
  }

  visitEncounter(encounter) {
    if (!this.canStartInteraction()) return false;

    this.closeAllUIPanels();

    const flags = this.getCityProgressFlags();
    const target = this.getDialogueTargetCityId(flags);

    if (!this.isLocationOpen(encounter.locationId)) {
      this.showLocationClosedPopup(
        encounter.locationId,
        encounter,
        target
      );

      return false;
    }

    return this.openEncounter(encounter, target);
  }

  openEncounter(encounter, dialogueTargetCityId) {
    if (!this.canStartInteraction()) return false;

    if (!this.isLocationOpen(encounter.locationId)) {
      this.showLocationClosedPopup(
        encounter.locationId,
        encounter,
        dialogueTargetCityId
      );

      return false;
    }

    const status = this.getEncounterStatus(encounter);
    const flags = this.getCityProgressFlags();

    return this.transitionTo('LocationScene', {
      cityId: this.cityId,
      encounterId: encounter.id,
      npcId: encounter.npcId,
      locationId: encounter.locationId,
      isRepeat: status.isRepeat,
      isCrimeCity: flags.isCrimeCity,
      isNextTargetCity: flags.isNextTargetCity,
      isCorrectCity: flags.isCorrectCity,
      dialogueTargetCityId:
        dialogueTargetCityId === undefined
          ? this.getDialogueTargetCityId(flags)
          : dialogueTargetCityId
    });
  }

  getDialogueTargetCityId() {
    return getPursuitCityContext(
      gameState,
      this.cityId
    ).targetCityId;
  }

  getCityProgressFlags() {
    return getPursuitCityContext(gameState, this.cityId);
  }

  changeScore(points, label = 'City investigation') {
    const delta = Number.isFinite(points)
      ? Math.trunc(points)
      : 0;

    if (!delta) return gameState.score || 0;

    const total = addSessionScore(delta, label);
    const hud = this.getPlayerHudScene();

    hud?.refreshNotebook?.();
    hud?.refreshUI?.();

    return total;
  }
}