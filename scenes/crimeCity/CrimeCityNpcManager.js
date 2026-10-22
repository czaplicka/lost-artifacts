// scenes/crimeCity/CrimeCityNpcManager.js
import { gameState } from '../../GameData.js';
import { getCaseSuspects } from '../../suspects/CaseSuspects.js';

const GENERIC_NPC_KEYS = [
  'npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'
];

const MAX_ICON_HEIGHT = 96;
const MAX_CELL_WIDTH = 150;
const MIN_CELL_WIDTH = 70;
const HOVER_MULTIPLIER = 1.1;
const HEADER_BAR_HEIGHT = 80;

export class CrimeCityNpcManager {
  constructor(scene) {
    this.scene = scene;
    this.createdObjects = [];
    this.isOpeningEncounter = false;
  }

  getCaseSuspects() {
    return getCaseSuspects(gameState);
  }

  getSuspectName(suspectId, fallback = 'Suspect') {
    const suspect = this.getCaseSuspects().find(
      (entry) => entry?.id === suspectId
    );

    return suspect?.name || suspect?.publicProfile?.displayName || fallback;
  }

  getAlibiAccessState() {
    const lockedState = {
      unlocked: false,
      candidateIds: new Set()
    };

    const scene = this.scene;

    if (!scene || scene._cleanupDone) return lockedState;

    const caseKey = scene.getCaseKey();
    const exclusionState = gameState.suspectExclusionState?.[caseKey];

    if (exclusionState?.finished !== true) return lockedState;

    const manualExclusionIds = new Set(
      Array.isArray(exclusionState.manualExclusionIds)
        ? exclusionState.manualExclusionIds
        : []
    );

    const candidateIds = new Set(
      this.getCaseSuspects()
        .filter((suspect) =>
          suspect?.id &&
          suspect.deductionState?.eliminated !== true &&
          !manualExclusionIds.has(suspect.id)
        )
        .map((suspect) => suspect.id)
    );

    if (candidateIds.size < 1) return lockedState;

    return { unlocked: true, candidateIds };
  }

  canAccessAlibiStage(access = null) {
    const scene = this.scene;

    if (
      !scene ||
      scene._cleanupDone ||
      !scene.isCrimeLabCompleted() ||
      !scene.isGridCompleted()
    ) {
      return false;
    }

    return (access ?? this.getAlibiAccessState()).unlocked;
  }

  canAccessEncounter(encounter, access = null) {
    if (!encounter || encounter.enabled === false) return false;

    const currentAccess = access ?? this.getAlibiAccessState();

    if (!this.canAccessAlibiStage(currentAccess)) return false;

    return currentAccess.candidateIds.has(encounter.suspectId);
  }

  groupEncountersBySuspect(encounters) {
    const groups = new Map();

    encounters.forEach((encounter) => {
      if (!groups.has(encounter.suspectId)) {
        groups.set(encounter.suspectId, []);
      }

      groups.get(encounter.suspectId).push(encounter);
    });

    return [...groups.entries()].map(([suspectId, items]) => ({
      suspectId,
      encounters: items
    }));
  }

  createNpcSpots() {
    this.clearCreatedObjects();

    const access = this.getAlibiAccessState();

    if (!this.canAccessAlibiStage(access)) return;

    const slots = this.scene.crimeCityConfig?.suspectSlots || [];
    const encounters = this.getCrimeCityEncounters(access);

    if (!encounters.length) {
      this.showEmptyLeadHint();
      return;
    }

    const groups = this.groupEncountersBySuspect(encounters);

    groups.forEach((group, groupIndex) => {
      const slot = slots[groupIndex];

      if (!slot) {
        console.warn(
          '[CrimeCityNpcManager] Missing map slot for suspect.',
          {
            suspectId: group.suspectId,
            groupIndex,
            slotCount: slots.length
          }
        );
        return;
      }

      this.createSuspectCluster(group, slot, access);
    });
  }

  getClusterMetrics(count) {
    const scene = this.scene;
    const columns = Math.max(count, 1);

    const clusterWidth = Math.max(
      MIN_CELL_WIDTH * columns,
      scene.scale.width * 0.24
    );

    const cellWidth = Phaser.Math.Clamp(
      clusterWidth / columns,
      MIN_CELL_WIDTH,
      MAX_CELL_WIDTH
    );

    return {
      cellWidth,
      totalWidth: cellWidth * columns,
      iconMaxWidth: cellWidth - 12,
      iconMaxHeight: MAX_ICON_HEIGHT
    };
  }

  createSuspectCluster(group, slot, access = null) {
    const currentAccess = access ?? this.getAlibiAccessState();
    const scene = this.scene;
    const count = group.encounters.length;
    const metrics = this.getClusterMetrics(count);

    const suspectName = this.getSuspectName(
      group.suspectId,
      group.encounters[0]?.suspectName
    );

    const iconHalf = metrics.iconMaxHeight / 2;
    const badgeY = slot.y - iconHalf - 14;
    const headerY = Math.max(
      badgeY - 24,
      HEADER_BAR_HEIGHT + 12
    );

    const header = scene.add.text(slot.x, headerY, suspectName, {
      fontFamily: 'SpecialElite',
      fontSize: '16px',
      color: '#ffe066',
      backgroundColor: '#000000aa',
      align: 'center',
      padding: {
        left: 8,
        right: 8,
        top: 3,
        bottom: 3
      },
      wordWrap: {
        width: Math.max(metrics.totalWidth, 140),
        useAdvancedWrap: true
      }
    }).setOrigin(0.5).setDepth(6);

    this.createdObjects.push(header);

    const startX =
      slot.x - metrics.totalWidth / 2 + metrics.cellWidth / 2;

    group.encounters.forEach((encounter, index) => {
      this.createNpcSpot(
        encounter,
        {
          x: Math.round(startX + index * metrics.cellWidth),
          y: slot.y
        },
        metrics,
        badgeY,
        currentAccess
      );
    });
  }

  createNpcSpot(encounter, slot, metrics, badgeY, access = null) {
    if (!this.canAccessEncounter(encounter, access)) return null;

    const isVisited = this.isEncounterVisited(encounter.id);
    const isExcluded = this.isSuspectExcluded(encounter.suspectId);
    const textureKey = this.getNpcTextureKey(encounter);

    if (!textureKey) {
      console.error(
        '[CrimeCityNpcManager] No loaded generic NPC texture.',
        { encounterId: encounter.id }
      );
      return null;
    }

    const icon = this.scene.add.image(slot.x, slot.y, textureKey)
      .setDepth(5)
      .setAlpha(isVisited ? 0.62 : 1)
      .setTint(
        isExcluded
          ? 0xff6666
          : isVisited
            ? 0xb8b8b8
            : 0xffffff
      );

    const baseScale = Math.min(
      metrics.iconMaxWidth / Math.max(icon.width, 1),
      metrics.iconMaxHeight / Math.max(icon.height, 1)
    );

    icon.setScale(baseScale);
    icon.setInteractive({ useHandCursor: true });

    const labelY = slot.y + (icon.height * baseScale) / 2 + 6;

    const label = this.scene.add.text(
      slot.x,
      labelY,
      encounter.witnessRole || encounter.npcName || 'Contact',
      {
        fontFamily: 'SpecialElite',
        fontSize: '12px',
        color: isVisited ? '#cccccc' : '#ffffff',
        backgroundColor: '#000000aa',
        align: 'center',
        padding: {
          left: 4,
          right: 4,
          top: 3,
          bottom: 3
        },
        wordWrap: {
          width: metrics.cellWidth - 8,
          useAdvancedWrap: true
        }
      }
    ).setOrigin(0.5, 0).setDepth(6);

    this.createdObjects.push(icon, label);

    const badge = this.createEncounterBadge(
      { x: slot.x, y: badgeY },
      isExcluded,
      isVisited
    );

    icon.on('pointerover', () => {
      if (!isExcluded) {
        icon.setScale(baseScale * HOVER_MULTIPLIER);
      }

      label.setColor('#ffe066');
    });

    icon.on('pointerout', () => {
      icon.setScale(baseScale);
      label.setColor(isVisited ? '#cccccc' : '#ffffff');
    });

    icon.on('pointerdown', () => {
      void this.openEncounter(encounter);
    });

    this.scene.interactiveObjects.push(icon);

    return { icon, label, badge };
  }

  createEncounterBadge(position, isExcluded, isVisited) {
    if (!this.scene?.mapUI) return null;

    const text = isExcluded ? 'Out' : isVisited ? 'Done' : 'Alibi';

    const color = isExcluded
      ? '#ff6666'
      : isVisited
        ? '#f1e6b8'
        : '#8ed1fc';

    return this.scene.mapUI.createStatusBadge(
      position.x,
      position.y,
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
      scene.showMessage([
        'Complete and confirm the preliminary suspect review first.',
        'Only the remaining files can move to alibi interviews.'
      ].join('\n'), 2800, '#5d2a00');
      return;
    }

    if (this.isSuspectExcluded(encounter.suspectId)) {
      scene.showMessage([
        `${encounter.label || 'This person'} is already excluded.`,
        'Interrogating them again would be rude. And inefficient.'
      ].join('\n'), 2600, '#5d2a00');
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

      if (!scene.moveToCrimeCityNode(`npc:${encounter.id}`)) return;

      scene.closeAllUIPanels();

      scene.transitionTo('AlibiScene', {
        caseKey,
        cityId: scene.cityId,
        encounterId: encounter.id,
        npcId: encounter.npcId,
        suspectId: encounter.suspectId,
        isRepeat: this.isEncounterVisited(encounter.id),
        returnScene: 'CrimeCityScene',
        returnData: { cityId: scene.cityId }
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
        scene.showMessage([
          'The interview room could not be opened.',
          'Check the AlibiScene loading error in the console.'
        ].join('\n'), 3500, '#8b0000');
      }
    } finally {
      this.isOpeningEncounter = false;
    }
  }

  getCrimeCityEncounters(access = null) {
    if (!this.scene) return [];

    const currentAccess = access ?? this.getAlibiAccessState();

    if (!currentAccess.unlocked) return [];

    const caseKey = this.scene.getCaseKey();
    const encounters = gameState.crimeCityEncounterState?.[caseKey];

    if (!Array.isArray(encounters)) return [];

    return encounters.filter((encounter) =>
      encounter &&
      encounter.enabled !== false &&
      currentAccess.candidateIds.has(encounter.suspectId)
    );
  }

  getNpcTextureKey(encounter) {
    const candidates = [
      encounter.portraitKey,
      encounter.textureKey,
      ...GENERIC_NPC_KEYS
    ];

    return candidates.find((key) =>
      GENERIC_NPC_KEYS.includes(key) &&
      this.scene.textures.exists(key)
    ) || null;
  }

  isEncounterVisited(encounterId) {
    if (!this.scene) return false;

    const caseKey = this.scene.getCaseKey();
    const encounters = gameState.crimeCityEncounterState?.[caseKey];

    if (!Array.isArray(encounters)) return false;

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

    return gameState.excludedSuspects.some((entry) =>
      typeof entry === 'string'
        ? entry === suspectId
        : entry?.id === suspectId
    );
  }

  showEmptyLeadHint() {
    const hint = this.scene.add.text(
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
    ).setOrigin(0.5).setDepth(30);

    this.createdObjects.push(hint);

    return hint;
  }

  clearCreatedObjects() {
    const objects = new Set(this.createdObjects.filter(Boolean));

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