// scenes/crimeCity/CrimeCityNpcManager.js

import { gameState } from '../../GameData.js';

const GENERIC_NPC_KEYS = [
  'npc',
  'npc1',
  'npc2',
  'npc3',
  'npc4',
  'npc5',
  'npc6'
];

export class CrimeCityNpcManager {
  constructor(scene) {
    this.scene = scene;
    this.createdObjects = [];
    this.isOpeningEncounter = false;
  }

  getCaseSuspects() {
    const candidates = [
      gameState.caseSuspects,
      gameState.suspects,
      gameState.suspectList
    ];

    return candidates.find(
      (list) => Array.isArray(list) && list.length > 0
    ) || [];
  }

  /**
   * Dostęp do świadków wynika z zatwierdzenia ręcznych
   * wykluczeń w SuspectBoardScene.
   *
   * Nie korzystamy z caseForensics.suspectGrid.completed:
   * to zapis innej planszy.
   */
  getAlibiAccessState() {
    const lockedState = {
      unlocked: false,
      candidateIds: new Set()
    };

    const scene = this.scene;

    if (!scene || scene._cleanupDone) {
      return lockedState;
    }

    const caseKey = scene.getCaseKey();

    const exclusionState =
      gameState.suspectExclusionState?.[caseKey];

    if (exclusionState?.finished !== true) {
      return lockedState;
    }

    const manualExclusionIds = new Set(
      Array.isArray(exclusionState.manualExclusionIds)
        ? exclusionState.manualExclusionIds
        : []
    );

    const candidateIds = new Set(
      this.getCaseSuspects()
        .filter(
          (suspect) =>
            suspect?.id &&
            suspect.deductionState?.eliminated !== true &&
            !manualExclusionIds.has(suspect.id)
        )
        .map((suspect) => suspect.id)
    );

    // Zachowujemy wymóg minimum dwóch osób,
    // obecny również w Twoim openEvidenceGrid().
    if (candidateIds.size < 2) {
      return lockedState;
    }

    return {
      unlocked: true,
      candidateIds
    };
  }

  canAccessAlibiStage() {
    const scene = this.scene;

    if (
      !scene ||
      scene._cleanupDone ||
      !scene.isCrimeLabCompleted() ||
      !scene.isGridCompleted()
    ) {
      return false;
    }

    // isGridCompleted() w CrimeCityScene oznacza
    // rekonstrukcję przestępstwa, nie Evidence Grid.
    return this.getAlibiAccessState().unlocked;
  }

  canAccessEncounter(encounter) {
    if (
      !encounter ||
      encounter.enabled === false ||
      !this.canAccessAlibiStage()
    ) {
      return false;
    }

    return this.getAlibiAccessState()
      .candidateIds.has(encounter.suspectId);
  }

  createNpcSpots() {
    this.clearCreatedObjects();

    if (!this.canAccessAlibiStage()) {
      return;
    }

    const slots =
      this.scene.crimeCityConfig?.suspectSlots || [];

    const encounters = this.getCrimeCityEncounters();

    console.debug(
      '[CrimeCityNpcManager] Alibi map refresh:',
      {
        caseKey: this.scene.getCaseKey(),
        candidateIds: [
          ...this.getAlibiAccessState().candidateIds
        ],
        encounterCount: encounters.length,
        slotCount: slots.length
      }
    );

    if (!encounters.length) {
      this.showEmptyLeadHint();
      return;
    }

    encounters.forEach((encounter, index) => {
      const slot = slots[index];

      if (!slot) {
        console.warn(
          '[CrimeCityNpcManager] Missing NPC slot for encounter.',
          {
            encounterId: encounter.id,
            index,
            slotCount: slots.length
          }
        );
        return;
      }

      this.createNpcSpot(encounter, slot);
    });
  }

  createNpcSpot(encounter, slot) {
    if (!this.canAccessEncounter(encounter)) {
      return null;
    }

    const isVisited =
      this.isEncounterVisited(encounter.id);

    const isExcluded =
      this.isSuspectExcluded(encounter.suspectId);

    const textureKey =
      this.getNpcTextureKey(encounter);

    if (!textureKey) {
      console.error(
        '[CrimeCityNpcManager] No loaded generic NPC texture.',
        { encounterId: encounter.id }
      );
      return null;
    }

    const icon = this.scene.add
      .image(slot.x, slot.y, textureKey)
      .setScale(0.45)
      .setDepth(5)
      .setAlpha(isVisited ? 0.62 : 1)
      .setTint(
        isExcluded
          ? 0xff6666
          : isVisited
            ? 0xb8b8b8
            : 0xffffff
      )
      .setInteractive({ useHandCursor: true });

    const label = this.scene.add
      .text(
        slot.x,
        slot.y + 88,
        encounter.label ||
          encounter.npcName ||
          'Unknown contact',
        {
          fontFamily: 'SpecialElite',
          fontSize: '17px',
          color: isVisited ? '#cccccc' : '#ffffff',
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

    this.createdObjects.push(icon, label);

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
      label.setColor(isVisited ? '#cccccc' : '#ffffff');
    });

    icon.on('pointerdown', () => {
      void this.openEncounter(encounter);
    });

    this.scene.interactiveObjects.push(icon);

    return { icon, label, badge };
  }

  createEncounterBadge(slot, isExcluded, isVisited) {
    if (!this.scene?.mapUI) {
      return null;
    }

    const text = isExcluded
      ? 'Excluded'
      : isVisited
        ? 'Questioned'
        : 'Alibi';

    const color = isExcluded
      ? '#ff6666'
      : isVisited
        ? '#f1e6b8'
        : '#8ed1fc';

    return this.scene.mapUI.createStatusBadge(
      slot.x,
      slot.y - 56,
      text,
      color,
      this.createdObjects
    );
  }

  async openEncounter(encounter) {
    const scene = this.scene;

    if (
      !scene ||
      scene._cleanupDone ||
      !scene.sys.isActive() ||
      scene.isTransitioning ||
      this.isOpeningEncounter
    ) {
      return;
    }

    if (!this.canAccessEncounter(encounter)) {
      scene.showMessage(
        [
          'Complete and confirm the preliminary suspect review first.',
          'Only the remaining files can move to alibi interviews.'
        ].join('\n'),
        2800,
        '#5d2a00'
      );
      return;
    }

    if (this.isSuspectExcluded(encounter.suspectId)) {
      scene.showMessage(
        [
          `${encounter.label || 'This person'} is already excluded.`,
          'Interrogating them again would be rude. And inefficient.'
        ].join('\n'),
        2600,
        '#5d2a00'
      );
      return;
    }

    const caseKey = scene.getCaseKey();

    if (
      !caseKey ||
      !encounter.id ||
      !encounter.suspectId ||
      !encounter.npcId
    ) {
      console.error(
        '[CrimeCityNpcManager] Incomplete witness navigation data.',
        { caseKey, encounter }
      );

      scene.showMessage(
        'This witness file is incomplete.',
        2600,
        '#8b0000'
      );
      return;
    }

    this.isOpeningEncounter = true;

    try {
      const loader = scene.game.sceneLoader;

      if (loader) {
        await loader.ensure('AlibiScene');
      } else if (!scene.hasScene('AlibiScene')) {
        throw new Error(
          'AlibiScene is not registered and SceneLoader is unavailable.'
        );
      }

      if (
        this.scene !== scene ||
        scene._cleanupDone ||
        !scene.sys.isActive() ||
        scene.isTransitioning
      ) {
        return;
      }

      if (
        scene.getCaseKey() !== caseKey ||
        !this.canAccessEncounter(encounter) ||
        this.isSuspectExcluded(encounter.suspectId)
      ) {
        return;
      }

      if (
        !scene.moveToCrimeCityNode(`npc:${encounter.id}`)
      ) {
        return;
      }

      scene.closeAllUIPanels();

      scene.transitionTo('AlibiScene', {
        caseKey,
        cityId: scene.cityId,
        encounterId: encounter.id,
        npcId: encounter.npcId,
        suspectId: encounter.suspectId,
        isRepeat: this.isEncounterVisited(encounter.id),
        returnScene: 'CrimeCityScene',
        returnData: {
          cityId: scene.cityId
        }
      });
    } catch (error) {
      console.error(
        '[CrimeCityNpcManager] Failed to load AlibiScene.',
        error
      );

      if (
        this.scene === scene &&
        !scene._cleanupDone &&
        scene.sys.isActive()
      ) {
        scene.showMessage(
          [
            'The interview room could not be opened.',
            'Check the AlibiScene loading error in the console.'
          ].join('\n'),
          3500,
          '#8b0000'
        );
      }
    } finally {
      this.isOpeningEncounter = false;
    }
  }

  getCrimeCityEncounters() {
    if (!this.scene) {
      return [];
    }

    const access = this.getAlibiAccessState();

    if (!access.unlocked) {
      return [];
    }

    const caseKey = this.scene.getCaseKey();

    const encounters =
      gameState.crimeCityEncounterState?.[caseKey];

    if (!Array.isArray(encounters)) {
      return [];
    }

    return encounters.filter(
      (encounter) =>
        encounter &&
        encounter.enabled !== false &&
        access.candidateIds.has(encounter.suspectId)
    );
  }

  getNpcTextureKey(encounter) {
    const candidates = [
      encounter.portraitKey,
      encounter.textureKey,
      ...GENERIC_NPC_KEYS
    ];

    return candidates.find(
      (key) =>
        GENERIC_NPC_KEYS.includes(key) &&
        this.scene.textures.exists(key)
    ) || null;
  }

  isEncounterVisited(encounterId) {
    if (!this.scene) {
      return false;
    }

    const caseKey = this.scene.getCaseKey();

    const encounters =
      gameState.crimeCityEncounterState?.[caseKey];

    if (!Array.isArray(encounters)) {
      return false;
    }

    const encounter = encounters.find(
      (entry) => entry?.id === encounterId
    );

    return (
      encounter?.interviewed === true &&
      encounter?.dialogueCompleted === true
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
      (entry) =>
        typeof entry === 'string'
          ? entry === suspectId
          : entry?.id === suspectId
    );
  }

  showEmptyLeadHint() {
    const hint = this.scene.add
      .text(
        this.scene.scale.width / 2,
        this.scene.scale.height - 90,
        [
          'No alibi contacts are available for the remaining suspects.',
          'The witness list appears to have taken a personal day.'
        ].join('\n'),
        {
          fontFamily: 'SpecialElite',
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

  clearCreatedObjects() {
    const objects = new Set(
      this.createdObjects.filter(Boolean)
    );

    if (Array.isArray(this.scene?.interactiveObjects)) {
      this.scene.interactiveObjects =
        this.scene.interactiveObjects.filter(
          (object) => !objects.has(object)
        );
    }

    objects.forEach((object) => {
      object.removeAllListeners?.();
      object.destroy?.();
    });

    this.createdObjects = [];
  }

  destroy() {
    this.clearCreatedObjects();
    this.scene = null;
  }
}