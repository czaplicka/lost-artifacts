import { gameState } from '../../GameData.js';
import { getCaseSuspects } from '../../suspects/CaseSuspects.js';

const GENERIC_NPC_KEYS = [
  'npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'
];

const MAX_ICON_HEIGHT = 360;
const MAX_CELL_WIDTH = 260;
const MIN_CELL_WIDTH = 160;
const HOVER_MULTIPLIER = 1.1;
const HEADER_BAR_HEIGHT = 80;
const CLUSTER_WIDTH_RATIO = 0.46;
const ICON_HORIZONTAL_PADDING = 16;
const MAP_EDGE_PADDING = 16;

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

    return suspect?.name ||
      suspect?.publicProfile?.displayName ||
      fallback;
  }

  hasVisitedApartment() {
    const mission = gameState.currentMission || {};

    const missionId = String(
      mission.id ||
      mission.missionId ||
      'unknown_mission'
    );

    const progress = gameState.apartmentProgress?.[missionId];

    return Boolean(
      progress &&
      (
        progress.inventoryVersion === 2 ||
        progress.updatedAt
      )
    );
  }

  createApartmentEvidenceLab() {
    const scene = this.scene;

    if (
      !scene ||
      scene._cleanupDone ||
      !scene.mapUI ||
      !scene.isCrimeSceneCompleted()
    ) {
      return;
    }

    const position = scene.crimeCityConfig?.crimeLab;

    if (!position) {
      console.warn(
        '[CrimeCityNpcManager] Missing Crime Lab map position.'
      );
      return;
    }

    scene.mapUI.createMapIcon({
      ...position,
      textureKey: 'crime_lab',
      fallbackColor: 0x1565c0,
      fallbackStroke: 0x7fc8f8,
      label: 'Crime Lab — Apartment Evidence',
      collection: this.createdObjects,
      onClick: () => scene.openCrimeLab()
    });

    scene.mapUI.createStatusBadge(
      position.x,
      position.y - 84,
      'Examine apartment clues',
      '#8ed1fc',
      this.createdObjects
    );
  }

  getAlibiAccessState() {
    const lockedState = {
      unlocked: false,
      candidateIds: new Set()
    };

    const scene = this.scene;

    if (
      !scene ||
      scene._cleanupDone ||
      this.hasVisitedApartment()
    ) {
      return lockedState;
    }

    const caseKey = scene.getCaseKey();
    const exclusionState =
      gameState.suspectExclusionState?.[caseKey];

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
      this.hasVisitedApartment() ||
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

    if (!this.scene || this.scene._cleanupDone) return;

    if (this.hasVisitedApartment()) {
      this.createApartmentEvidenceLab();
      return;
    }

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

    const availableWidth = Math.max(
      1,
      scene.scale.width - MAP_EDGE_PADDING * 2
    );

    const desiredClusterWidth = Math.max(
      MIN_CELL_WIDTH * columns,
      scene.scale.width * CLUSTER_WIDTH_RATIO
    );

    const desiredCellWidth = Phaser.Math.Clamp(
      desiredClusterWidth / columns,
      MIN_CELL_WIDTH,
      MAX_CELL_WIDTH
    );

    const cellWidth = Math.min(
      desiredCellWidth,
      availableWidth / columns
    );

    return {
      cellWidth,
      totalWidth: cellWidth * columns,
      iconMaxWidth: Math.max(
        1,
        cellWidth - ICON_HORIZONTAL_PADDING
      ),
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

    const halfClusterWidth = metrics.totalWidth / 2;

    const clusterX = Phaser.Math.Clamp(
      slot.x,
      MAP_EDGE_PADDING + halfClusterWidth,
      scene.scale.width - MAP_EDGE_PADDING - halfClusterWidth
    );

    const hoverHalfHeight =
      metrics.iconMaxHeight * HOVER_MULTIPLIER / 2;

    const badgeY = Math.max(
      slot.y - hoverHalfHeight - 16,
      HEADER_BAR_HEIGHT + 50
    );

    const headerY = badgeY - 30;

    const iconY = Math.max(
      slot.y,
      badgeY + 16 + hoverHalfHeight
    );

    const header = scene.add.text(
      clusterX,
      headerY,
      suspectName,
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
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
      }
    ).setOrigin(0.5).setDepth(6);

    this.createdObjects.push(header);

    const startX =
      clusterX - metrics.totalWidth / 2 + metrics.cellWidth / 2;

    group.encounters.forEach((encounter, index) => {
      this.createNpcSpot(
        encounter,
        {
          x: Math.round(startX + index * metrics.cellWidth),
          y: iconY
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

    const icon = this.scene.add
      .image(slot.x, slot.y, textureKey)
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

    const labelY =
      slot.y +
      (icon.displayHeight * HOVER_MULTIPLIER) / 2 +
      10;

    const label = this.scene.add.text(
      slot.x,
      labelY,
      encounter.witnessRole || encounter.npcName || 'Contact',
      {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
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
          width: Math.max(1, metrics.cellWidth - 12),
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

    if (this.hasVisitedApartment()) return;

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
    if (!this.scene || this.hasVisitedApartment()) return [];

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