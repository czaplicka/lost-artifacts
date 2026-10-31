import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';
import { generateCaseCityState, buildEncounterId } from '../../city-encounter-generator.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { getNpcTextureKey, getNpcLabel } from '../../npcThemeHelper.js';
import { addSessionScore } from '../../managers/InvestigationManager.js';
import { getPursuitCityContext } from '../../managers/PursuitCityContext.js';
import { NPC_QUESTION_PENALTY, NPC_SCALE, NPC_HOVER_SCALE } from './CityConfig.js';

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

    const existing = encounters.find(encounter => (
      encounter?.locationId === 'harbor' &&
      encounter.enabled !== false
    ));

    if (existing) return;

    const pair = this.city.encounterPool?.find(entry => (
      entry?.npcId === 'sailor' &&
      entry?.locationId === 'harbor'
    )) || {
      id: `${this.cityId}_sailor_harbor`,
      npcId: 'sailor',
      locationId: 'harbor'
    };

    const occupiedSlots = new Set(
      encounters
        .filter(entry => entry?.enabled !== false)
        .map(entry => entry.slotId)
    );

    const freeSlot = this.city.encounterSlots?.find(slot => (
      slot.enabled &&
      !occupiedSlots.has(slot.id)
    ));

    const slotId = freeSlot?.id || 'harbor_extra';

    const harbor = {
      id: buildEncounterId(this.cityId, pair.id, slotId),
      baseEncounterId: pair.id,
      cityId: this.cityId,
      cityX: freeSlot?.cityX ?? 130,
      cityY: freeSlot?.cityY ?? Math.max(230, this.scale.height - 260),
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

    if (!Array.isArray(list)) return [];

    return list.filter(encounter => (
      encounter &&
      typeof encounter === 'object' &&
      encounter.enabled !== false
    ));
  }

  isEncounterVisited(encounterId) {
    return gameState.hasEncounter(encounterId);
  }

  getEncounterMemory(encounterId) {
    if (!encounterId) return null;

    const memory = gameState.encounterMemory;

    if (
      !memory ||
      typeof memory !== 'object' ||
      Array.isArray(memory)
    ) {
      return null;
    }

    return memory[encounterId] || null;
  }

  getEncounterStatus(encounter) {
    const isVisited = this.isEncounterVisited(encounter.id);
    const memory = this.getEncounterMemory(encounter.id);
    const hasMemory = Boolean(memory);

    return {
      isVisited,
      memory,
      hasMemory,
      isRepeat: isVisited || hasMemory
    };
  }

  createEncounters() {
    this.destroyEncounterViews();

    for (const encounter of this.getEncounters()) {
      this.createEncounterView(encounter);
    }
  }

  createEncounterView(encounter) {
    const textureKey = getNpcTextureKey(
      encounter.npcId,
      this.npcTheme
    );

    const iconKey = this.textures.exists(textureKey)
      ? textureKey
      : 'fence_w';

    const icon = this.add.image(
      encounter.cityX,
      encounter.cityY,
      iconKey
    )
      .setScale(NPC_SCALE)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });

    const name = getNpcLabel(encounter.npcId);

    const label = encounter.locationId === 'harbor'
      ? `${name} · Harbor`
      : name;

    const nameLabel = this.add.text(0, 0, label, {
      fontFamily: 'SpecialElite',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000bb',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
      align: 'center',
      wordWrap: { width: 220 }
    })
      .setOrigin(0.5, 0)
      .setDepth(4);

    const statusLabel = this.add.text(0, 0, '', {
      fontFamily: 'SpecialElite',
      fontSize: '15px',
      color: '#f1e6b8',
      backgroundColor: '#000000cc',
      padding: { left: 6, right: 6, top: 3, bottom: 3 }
    })
      .setOrigin(0.5, 1)
      .setDepth(4)
      .setVisible(false);

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

    const { isVisited, memory, hasMemory } =
      this.getEncounterStatus(view.encounter);

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
  }

  destroyEncounterViews() {
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

    const started = this.transitionTo('LocationScene', {
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

    if (started && !status.isRepeat) {
      this.changeScore(-NPC_QUESTION_PENALTY);
    }

    return started;
  }

  getDialogueTargetCityId() {
    return getPursuitCityContext(gameState, this.cityId).targetCityId;
  }

  getCityProgressFlags() {
    return getPursuitCityContext(gameState, this.cityId);
  }

  changeScore(points, label = 'City investigation') {
    const delta = Number.isFinite(points)
      ? Math.floor(points)
      : 0;

    if (!delta) return gameState.score || 0;

    addSessionScore(delta, label);

    const hud = this.getPlayerHudScene();
    hud?.refreshNotebook?.();
    hud?.refreshUI?.();

    EventBus.emit('scoreChanged', {
      delta,
      total: gameState.score
    });

    return gameState.score;
  }
}
