import { gameState } from '../../GameData.js';

export class CrimeCityNpcManager {
  constructor(scene) {
    this.scene = scene;
    this.createdObjects = [];
  }

  createNpcSpots() {
    if (
      !this.scene.isCrimeLabCompleted() ||
      !this.scene.isGridCompleted()
    ) {
      return;
    }

    const slots =
      this.scene.crimeCityConfig.suspectSlots || [];

    const encounters =
      this.getCrimeCityEncounters();

    if (encounters.length === 0) {
      this.showEmptyLeadHint();
      return;
    }

    encounters.forEach((encounter, index) => {
      const slot = slots[index];

      if (!slot) {
        console.warn(
          '[CrimeCityNpcManager] Missing NPC slot for encounter.',
          {
            encounter,
            index,
            slots
          }
        );

        return;
      }

      this.createNpcSpot(
        encounter,
        slot
      );
    });
  }

  createNpcSpot(encounter, slot) {
    const isVisited =
      this.isEncounterVisited(encounter.id);

    const isExcluded =
      this.isSuspectExcluded(encounter.suspectId);

    const textureKey =
      this.getNpcTextureKey(encounter);

    const icon = this.scene.add
      .image(slot.x, slot.y, textureKey)
      .setScale(0.45)
      .setDepth(5)
      .setAlpha(isVisited ? 0.62 : 1)
      .setTint(
        isVisited
          ? 0xb8b8b8
          : isExcluded
            ? 0xff6666
            : 0xffffff
      )
      .setInteractive({
        useHandCursor: true
      });

    const labelText =
      encounter.label ||
      encounter.npcName ||
      encounter.npcId ||
      'Unknown contact';

    const label = this.scene.add
      .text(
        slot.x,
        slot.y + 88,
        labelText,
        {
          fontFamily: 'Special Elite',
          fontSize: '17px',
          color: isVisited
            ? '#cccccc'
            : '#ffffff',
          backgroundColor: '#000000aa',
          padding: {
            left: 8,
            right: 8,
            top: 4,
            bottom: 4
          }
        }
      )
      .setOrigin(0.5)
      .setDepth(6);

    const badge = this.createEncounterBadge(
      slot,
      isExcluded,
      isVisited
    );

    icon.on('pointerover', () => {
      if (!isExcluded) {
        icon.setScale(0.5);
      }

      label.setColor('#ffe066');
    });

    icon.on('pointerout', () => {
      icon.setScale(0.45);

      label.setColor(
        isVisited
          ? '#cccccc'
          : '#ffffff'
      );
    });

    icon.on('pointerdown', () => {
      this.openEncounter(
        encounter,
        isVisited,
        isExcluded
      );
    });

    this.scene.interactiveObjects.push(icon);

    this.createdObjects.push(
      icon,
      label,
      badge
    );

    return {
      icon,
      label,
      badge
    };
  }

  createEncounterBadge(
    slot,
    isExcluded,
    isVisited
  ) {
    if (!this.scene.mapUI) {
      return null;
    }

    if (isExcluded) {
      return this.scene.mapUI.createStatusBadge(
        slot.x,
        slot.y - 56,
        'Excluded',
        '#ff6666'
      );
    }

    if (isVisited) {
      return this.scene.mapUI.createStatusBadge(
        slot.x,
        slot.y - 56,
        'Questioned',
        '#f1e6b8'
      );
    }

    return this.scene.mapUI.createStatusBadge(
      slot.x,
      slot.y - 56,
      'Alibi',
      '#8ed1fc'
    );
  }

  openEncounter(
    encounter,
    isVisited,
    isExcluded
  ) {
    if (isExcluded) {
      this.scene.showMessage(
        [
          `${encounter.label || 'This person'} is already excluded.`,
          'Interrogating them again would be rude. And inefficient.'
        ].join('\n'),
        2600,
        '#5d2a00'
      );

      return;
    }

    if (
      !this.scene.moveToCrimeCityNode(
        `npc:${encounter.id}`
      )
    ) {
      return;
    }

    this.scene.closeAllUIPanels();

    this.scene.transitionTo('LocationScene', {
      cityId: this.scene.cityId,
      encounterId: encounter.id,
      npcId: encounter.npcId,
      suspectId: encounter.suspectId,
      locationId:
        encounter.locationId ||
        'alibi_contact',
      isRepeat: isVisited,
      isCrimeCity: true,
      returnScene: 'CrimeCityScene',
      returnData: {
        cityId: this.scene.cityId
      }
    });
  }

  getCrimeCityEncounters() {
    const caseKey =
      this.scene.getCaseKey();

    const encounters =
      gameState.crimeCityEncounterState?.[caseKey];

    if (!Array.isArray(encounters)) {
      return [];
    }

    return encounters.filter(
      (encounter) => encounter?.enabled !== false
    );
  }

  getNpcTextureKey(encounter) {
    const candidates = [
      encounter.textureKey,
      `${encounter.npcId}_${this.scene.cityData.npcTheme}`,
      encounter.npcId,
      'fence_w'
    ].filter(Boolean);

    const validTexture = candidates.find(
      (key) => this.scene.textures.exists(key)
    );

    return validTexture || 'fence_w';
  }

  isEncounterVisited(encounterId) {
    return (
      Array.isArray(gameState.visitedEncounters) &&
      gameState.visitedEncounters.includes(
        encounterId
      )
    );
  }

  isSuspectExcluded(suspectId) {
    if (
      !suspectId ||
      !Array.isArray(gameState.excludedSuspects)
    ) {
      return false;
    }

    return gameState.excludedSuspects.some(
      (entry) => {
        if (typeof entry === 'string') {
          return entry === suspectId;
        }

        return entry?.id === suspectId;
      }
    );
  }

  showEmptyLeadHint() {
    const hint = this.scene.add
      .text(
        this.scene.scale.width / 2,
        this.scene.scale.height - 90,
        [
          'The lab has no alibi contacts yet.',
          'Crime Lab must create crimeCityEncounterState for this case.'
        ].join('\n'),
        {
          fontFamily: 'Special Elite',
          fontSize: '16px',
          color: '#f1e6b8',
          align: 'center',
          backgroundColor: '#000000aa',
          padding: {
            left: 14,
            right: 14,
            top: 10,
            bottom: 10
          }
        }
      )
      .setOrigin(0.5)
      .setDepth(30);

    this.createdObjects.push(hint);

    return hint;
  }

  destroy() {
    this.createdObjects.forEach((object) => {
      if (!object || object.destroyed) {
        return;
      }

      object.removeAllListeners?.();
      object.destroy?.();
    });

    this.createdObjects = [];
    this.scene = null;
  }
}