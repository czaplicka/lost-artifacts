import { gameState } from '../../GameData.js';
import { getCaseSuspects } from '../../suspects/CaseSuspects.js';
import { buildCrimeCityLayout } from './CrimeCityLayout.js';

const GENERIC_NPC_KEYS = ['npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'];
const HOVER_MULTIPLIER = 1.1;
const MAP_EDGE_PADDING = 18;
const COLLISION_GAP = 14;
const SEARCH_STEP = 12;
const CELL_WIDTH = 150;
const ICON_SIZE = 112;
const HEADER_HEIGHT = 44;
const BADGE_HEIGHT = 24;
const ROLE_HEIGHT = 58;
const CLUSTER_HEIGHT = Math.ceil(
  HEADER_HEIGHT + BADGE_HEIGHT + 10 +
  ICON_SIZE * HOVER_MULTIPLIER + 8 + ROLE_HEIGHT + 8
);

export class CrimeCityNpcManager {
  constructor(scene) {
    this.scene = scene;
    this.createdObjects = [];
    this.isOpeningEncounter = false;
    this.layoutEnabled = false;
    this.layoutSignature = null;
    this.nextLayoutCheck = 0;
    this.resizePending = false;
    this.resizeAt = 0;
    this.handleResize = () => {
      this.resizePending = true;
      this.resizeAt = (this.scene?.time.now || 0) + 180;
    };
    this.handlePostUpdate = () => this.checkLayoutChanges();
    this.handleShutdown = () => this.destroy();
    scene.scale.on('resize', this.handleResize);
    scene.events.on('postupdate', this.handlePostUpdate);
    scene.events.once('shutdown', this.handleShutdown);
  }

  getCaseSuspects() { return getCaseSuspects(gameState); }

  getSuspectName(suspectId, fallback = 'Suspect') {
    const suspect = this.getCaseSuspects().find(entry => entry?.id === suspectId);
    return suspect?.name || suspect?.publicProfile?.displayName || fallback;
  }

  hasVisitedApartment() { return this.scene?.hasVisitedApartment() === true; }

  getAlibiAccessState() {
    const locked = { unlocked: false, candidateIds: new Set() };
    const scene = this.scene;
    if (!scene || scene._cleanupDone || this.hasVisitedApartment()) return locked;
    const state = gameState.suspectExclusionState?.[scene.getCaseKey()];
    if (state?.finished !== true) return locked;
    const excluded = new Set(Array.isArray(state.manualExclusionIds) ? state.manualExclusionIds : []);
    const candidateIds = new Set(this.getCaseSuspects()
      .filter(s => s?.id && s.deductionState?.eliminated !== true && !excluded.has(s.id))
      .map(s => s.id));
    return candidateIds.size ? { unlocked: true, candidateIds } : locked;
  }

  canAccessAlibiStage(access = null) {
    const scene = this.scene;
    if (!scene || scene._cleanupDone || this.hasVisitedApartment() ||
        !scene.isCrimeLabCompleted() || !scene.isGridCompleted()) return false;
    return (access ?? this.getAlibiAccessState()).unlocked;
  }

  canAccessEncounter(encounter, access = null) {
    if (!encounter || encounter.enabled === false) return false;
    const current = access ?? this.getAlibiAccessState();
    return this.canAccessAlibiStage(current) && current.candidateIds.has(encounter.suspectId);
  }

  groupEncountersBySuspect(encounters) {
    const groups = new Map();
    for (const encounter of encounters) {
      if (!groups.has(encounter.suspectId)) groups.set(encounter.suspectId, []);
      groups.get(encounter.suspectId).push(encounter);
    }
    return [...groups].map(([suspectId, items]) => ({ suspectId, encounters: items }));
  }

  checkLayoutChanges() {
    const scene = this.scene;
    if (!scene || scene._cleanupDone || !scene.sys.isActive() ||
        scene.isTransitioning || this.isOpeningEncounter) return;
    const now = scene.time.now;
    if (this.resizePending) {
      if (now < this.resizeAt) return;
      this.resizePending = false;
      if (scene.cityData?.crimeCity) {
        scene.crimeCityConfig = buildCrimeCityLayout(scene, scene.cityData.crimeCity);
        scene.rebuildMapContent();
      }
      return;
    }
    if (!this.layoutEnabled || now < this.nextLayoutCheck) return;
    if (scene.mapUI?.selectionObjects?.length) return;
    this.nextLayoutCheck = now + 250;
    if (this.getLayoutSignature() !== this.layoutSignature) this.createNpcSpots();
  }

  getMapArea() {
    const { width, height } = this.scene.scale;
    const top = Math.max(138, Math.round(height * 0.13));
    return {
      x: MAP_EDGE_PADDING, y: top,
      w: Math.max(1, width - MAP_EDGE_PADDING * 2),
      h: Math.max(1, height - 92 - top)
    };
  }

  rectanglesOverlap(a, b, gap = COLLISION_GAP) {
    return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x &&
      a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
  }

  getMapObstacles() {
    const ui = this.scene?.mapUI;
    if (!ui) return [];
    const obstacles = [];
    const add = (x, y, w, h) => {
      if ([x, y, w, h].every(Number.isFinite) && w > 0 && h > 0) {
        obstacles.push({ x, y, w, h });
      }
    };
    for (const collection of [ui.locationObjects, ui.shopObjects, ui.apartmentObjects]) {
      for (const object of collection || []) {
        if (!object?.active || !object.visible || object.alpha === 0 || object.depth >= 90) continue;
        if (object.type === 'Image') {
          // Map icons are fitted to 132px; reserve their hover size too.
          const maxSide = Math.max(object.width, object.height, 1);
          const w = object.width / maxSide * 132 * HOVER_MULTIPLIER;
          const h = object.height / maxSide * 132 * HOVER_MULTIPLIER;
          add(object.x - w / 2, object.y - h / 2, w, h);
        } else if (object.type === 'Graphics') {
          // Energy and money graphics have no reliable text/image bounds.
          add(object.x - 12, object.y - 13, 24, 26);
        } else if (typeof object.getBounds === 'function') {
          const b = object.getBounds();
          let pad = 0;
          if (object.type === 'Arc') pad = 8;
          add(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2);
        }
      }
    }
    return obstacles;
  }

  getLayoutSignature() {
    const scene = this.scene;
    const geometry = this.getMapObstacles().map(r =>
      [r.x, r.y, r.w, r.h].map(v => Math.round(v * 2) / 2));
    const access = this.getAlibiAccessState();
    const encounters = this.getCrimeCityEncounters(access).map(e => [
      e.id, e.suspectId, e.witnessRole, e.npcName, e.portraitKey, e.textureKey,
      this.isEncounterVisited(e.id), this.isSuspectExcluded(e.suspectId),
      this.getSuspectName(e.suspectId, e.suspectName)
    ]);
    return JSON.stringify([
      scene.scale.width, scene.scale.height,
      this.canAccessAlibiStage(access), this.hasVisitedApartment(), geometry, encounters
    ]);
  }

  getClusterMetrics(count, scale = 1) {
    return {
      scale,
      cellWidth: CELL_WIDTH * scale,
      totalWidth: CELL_WIDTH * Math.max(count, 1) * scale,
      height: CLUSTER_HEIGHT * scale,
      iconMaxWidth: ICON_SIZE * scale,
      iconMaxHeight: ICON_SIZE * scale
    };
  }

  getSearchCoordinates(min, max, preferred) {
    if (max < min) return [];
    const values = new Set([min, max, Phaser.Math.Clamp(preferred, min, max)]);
    for (let p = min; p <= max; p += SEARCH_STEP) values.add(p);
    return [...values];
  }

  findClusterPosition(metrics, preferred, area, obstacles) {
    const maxX = area.x + area.w - metrics.totalWidth;
    const maxY = area.y + area.h - metrics.height;
    if (maxX < area.x || maxY < area.y) return null;
    const px = preferred.x - metrics.totalWidth / 2;
    const py = preferred.y - metrics.height / 2;
    const xs = this.getSearchCoordinates(area.x, maxX, px);
    const ys = this.getSearchCoordinates(area.y, maxY, py);
    let best = null;
    let score = Infinity;
    for (const y of ys) {
      for (const x of xs) {
        const rect = { x, y, w: metrics.totalWidth, h: metrics.height };
        if (obstacles.some(o => this.rectanglesOverlap(rect, o))) continue;
        const distance = (x - px) ** 2 + (y - py) ** 2;
        if (distance < score) { score = distance; best = rect; }
      }
    }
    return best;
  }

  planClusters(groups) {
    const area = this.getMapArea();
    const slots = this.scene.crimeCityConfig?.suspectSlots || [];
    const obstacles = this.getMapObstacles();
    const entries = groups.map((group, index) => ({
      group, index,
      preferred: slots[index] || {
        x: area.x + area.w * (index + 1) / (groups.length + 1),
        y: area.y + area.h * 0.62
      }
    })).sort((a, b) => b.group.encounters.length - a.group.encounters.length);
    for (const scale of [1, .95, .9, .85, .8, .75, .7, .65, .6, .55, .5]) {
      const occupied = [...obstacles];
      const plan = [];
      for (const entry of entries) {
        const metrics = this.getClusterMetrics(entry.group.encounters.length, scale);
        const rect = this.findClusterPosition(metrics, entry.preferred, area, occupied);
        if (!rect) break;
        occupied.push(rect);
        plan.push({ ...entry, metrics, rect });
      }
      if (plan.length === groups.length) return plan.sort((a, b) => a.index - b.index);
    }
    return null;
  }

  createNpcSpots() {
    this.clearCreatedObjects();
    if (!this.scene || this.scene._cleanupDone) return;
    this.layoutEnabled = true;
    const access = this.getAlibiAccessState();
    this.layoutSignature = this.getLayoutSignature();
    if (!this.canAccessAlibiStage(access)) return;
    const encounters = this.getCrimeCityEncounters(access);
    if (!encounters.length) { this.showEmptyLeadHint(); return; }
    const plan = this.planClusters(this.groupEncountersBySuspect(encounters));
    if (!plan) { this.showLayoutHint(); return; }
    for (const { group, rect, metrics } of plan) {
      this.createSuspectCluster(group, rect, metrics, access);
    }
  }

  fitTextInBox(text, width, height) {
    text.setScale(Math.min(1, width / Math.max(1, text.width), height / Math.max(1, text.height)));
    return text;
  }

  createSuspectCluster(group, rect, metrics, access = null) {
    const scale = metrics.scale;
    const current = access ?? this.getAlibiAccessState();
    const header = this.scene.add.text(
      rect.x + rect.w / 2, rect.y + HEADER_HEIGHT * scale / 2,
      this.getSuspectName(group.suspectId, group.encounters[0]?.suspectName), {
        fontFamily: 'SpecialElite', fontSize: `${22 * scale}px`, color: '#ffe066',
        backgroundColor: '#000000cc', align: 'center',
        padding: { left: 8 * scale, right: 8 * scale, top: 3 * scale, bottom: 3 * scale },
        wordWrap: { width: Math.max(1, rect.w - 20 * scale), useAdvancedWrap: true }
      }
    ).setOrigin(.5).setDepth(6);
    this.fitTextInBox(header, rect.w - 12 * scale, (HEADER_HEIGHT - 8) * scale);
    this.createdObjects.push(header);
    const badgeY = rect.y + (HEADER_HEIGHT + BADGE_HEIGHT / 2) * scale;
    const iconY = rect.y + (HEADER_HEIGHT + BADGE_HEIGHT + 10) * scale +
      metrics.iconMaxHeight * HOVER_MULTIPLIER / 2;
    const roleY = iconY + metrics.iconMaxHeight * HOVER_MULTIPLIER / 2 + 8 * scale;
    group.encounters.forEach((encounter, index) => {
      this.createNpcSpot(encounter, {
        x: rect.x + metrics.cellWidth * (index + .5), y: iconY
      }, metrics, badgeY, current, roleY);
    });
  }

  createNpcSpot(encounter, slot, metrics, badgeY, access = null, roleY = null) {
    if (!this.canAccessEncounter(encounter, access)) return null;
    const visited = this.isEncounterVisited(encounter.id);
    const excluded = this.isSuspectExcluded(encounter.suspectId);
    const texture = this.getNpcTextureKey(encounter);
    if (!texture) {
      console.error('[CrimeCityNpcManager] No loaded NPC texture.', encounter.id);
      return null;
    }
    const scale = metrics.scale;
    const icon = this.scene.add.image(slot.x, slot.y, texture).setDepth(5)
      .setAlpha(visited ? .62 : 1)
      .setTint(excluded ? 0xff6666 : visited ? 0xb8b8b8 : 0xffffff);
    const baseScale = Math.min(
      metrics.iconMaxWidth / Math.max(icon.width, 1),
      metrics.iconMaxHeight / Math.max(icon.height, 1)
    );
    icon.setScale(baseScale).setInteractive({ useHandCursor: true });
    const labelY = roleY ?? slot.y + metrics.iconMaxHeight * HOVER_MULTIPLIER / 2 + 8 * scale;
    const label = this.scene.add.text(slot.x, labelY,
      encounter.witnessRole || encounter.npcName || 'Contact', {
        fontFamily: 'SpecialElite', fontSize: `${18 * scale}px`,
        color: visited ? '#cccccc' : '#ffffff', backgroundColor: '#000000bb', align: 'center',
        padding: { left: 4 * scale, right: 4 * scale, top: 3 * scale, bottom: 3 * scale },
        wordWrap: { width: Math.max(1, metrics.cellWidth - 20 * scale), useAdvancedWrap: true }
      }).setOrigin(.5, 0).setDepth(6);
    this.fitTextInBox(label, metrics.cellWidth - 12 * scale, ROLE_HEIGHT * scale);
    this.createdObjects.push(icon, label);
    const badge = this.createEncounterBadge({ x: slot.x, y: badgeY }, excluded, visited, scale);
    icon.on('pointerover', () => {
      if (!excluded) icon.setScale(baseScale * HOVER_MULTIPLIER);
      label.setColor('#ffe066');
    });
    icon.on('pointerout', () => {
      icon.setScale(baseScale);
      label.setColor(visited ? '#cccccc' : '#ffffff');
    });
    icon.on('pointerdown', pointer => {
      if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
      if (this.scene?.mapUI?.selectionObjects?.length) return;
      void this.openEncounter(encounter);
    });
    this.scene.interactiveObjects ??= [];
    this.scene.interactiveObjects.push(icon);
    return { icon, label, badge };
  }

  createEncounterBadge(position, excluded, visited, scale = 1) {
    const badge = this.scene.add.text(position.x, position.y,
      excluded ? 'Out' : visited ? 'Done' : 'Alibi', {
        fontFamily: 'SpecialElite', fontSize: `${13 * scale}px`,
        color: excluded ? '#ff6666' : visited ? '#f1e6b8' : '#8ed1fc',
        backgroundColor: '#000000cc',
        padding: { left: 6 * scale, right: 6 * scale, top: 3 * scale, bottom: 3 * scale }
      }).setOrigin(.5).setDepth(7);
    this.fitTextInBox(badge, (CELL_WIDTH - 12) * scale, (BADGE_HEIGHT - 2) * scale);
    this.createdObjects.push(badge);
    return badge;
  }

  async openEncounter(encounter) {
    const scene = this.scene;
    if (!scene || scene._cleanupDone || !scene.sys.isActive() ||
        scene.isTransitioning || this.isOpeningEncounter || this.hasVisitedApartment()) return;
    if (!this.canAccessEncounter(encounter)) {
      scene.showMessage('Complete and confirm the preliminary suspect review first.\nOnly the remaining files can move to alibi interviews.', 2800, '#5d2a00');
      return;
    }
    if (this.isSuspectExcluded(encounter.suspectId)) {
      scene.showMessage(`${encounter.label || 'This person'} is already excluded.\nInterrogating them again would be rude. And inefficient.`, 2600, '#5d2a00');
      return;
    }
    const caseKey = scene.getCaseKey();
    if (!caseKey || !encounter.id || !encounter.suspectId || !encounter.npcId) {
      console.error('[CrimeCityNpcManager] Incomplete witness navigation data.', { caseKey, encounter });
      scene.showMessage('This witness file is incomplete.', 2600, '#8b0000');
      return;
    }
    this.isOpeningEncounter = true;
    try {
      const loader = scene.game.sceneLoader;
      if (loader) await loader.ensure('AlibiScene');
      else if (!scene.hasScene('AlibiScene')) {
        throw new Error('AlibiScene is not registered and SceneLoader is unavailable.');
      }
      if (this.scene !== scene || scene._cleanupDone || !scene.sys.isActive() || scene.isTransitioning) return;
      if (scene.getCaseKey() !== caseKey || !this.canAccessEncounter(encounter) ||
          this.isSuspectExcluded(encounter.suspectId)) return;
      if (!scene.moveToCrimeCityNode(`npc:${encounter.id}`)) return;
      scene.closeAllUIPanels();
      scene.transitionTo('AlibiScene', {
        caseKey, cityId: scene.cityId, encounterId: encounter.id,
        npcId: encounter.npcId, suspectId: encounter.suspectId,
        isRepeat: this.isEncounterVisited(encounter.id),
        returnScene: 'CrimeCityScene', returnData: { cityId: scene.cityId }
      });
    } catch (error) {
      console.error('[CrimeCityNpcManager] Failed to load AlibiScene.', error);
      if (this.scene === scene && !scene._cleanupDone && scene.sys.isActive()) {
        scene.showMessage('The interview room could not be opened.\nCheck the AlibiScene loading error in the console.', 3500, '#8b0000');
      }
    } finally {
      this.isOpeningEncounter = false;
    }
  }

  getCrimeCityEncounters(access = null) {
    if (!this.scene || this.hasVisitedApartment()) return [];
    const current = access ?? this.getAlibiAccessState();
    if (!current.unlocked) return [];
    const encounters = gameState.crimeCityEncounterState?.[this.scene.getCaseKey()];
    if (!Array.isArray(encounters)) return [];
    return encounters.filter(e => e && e.enabled !== false && current.candidateIds.has(e.suspectId));
  }

  getNpcTextureKey(encounter) {
    return [encounter.portraitKey, encounter.textureKey, ...GENERIC_NPC_KEYS]
      .find(key => GENERIC_NPC_KEYS.includes(key) && this.scene.textures.exists(key)) || null;
  }

  isEncounterVisited(encounterId) {
    if (!this.scene) return false;
    const encounters = gameState.crimeCityEncounterState?.[this.scene.getCaseKey()];
    if (!Array.isArray(encounters)) return false;
    const encounter = encounters.find(e => e?.id === encounterId);
    return encounter?.interviewed === true && encounter?.dialogueCompleted === true;
  }

  isSuspectExcluded(suspectId) {
    if (!suspectId || !Array.isArray(gameState.excludedSuspects)) return false;
    return gameState.excludedSuspects.some(e => typeof e === 'string' ? e === suspectId : e?.id === suspectId);
  }

  showLayoutHint() {
    return this.createMapHint([
      'Not enough room to display the alibi contacts.',
      'Enlarge the game window to see the witness groups.'
    ]);
  }

  showEmptyLeadHint() {
    return this.createMapHint([
      'No alibi contacts are available for the remaining suspects.',
      'The witness list appears to have taken a personal day.'
    ]);
  }

  createMapHint(lines) {
    const { width, height } = this.scene.scale;
    const hint = this.scene.add.text(width / 2, height - 86, lines.join('\n'), {
      fontFamily: 'SpecialElite', fontSize: '16px', color: '#f1e6b8',
      align: 'center', backgroundColor: '#000000dd',
      padding: { left: 14, right: 14, top: 8, bottom: 8 },
      wordWrap: { width: Math.max(1, width - 64), useAdvancedWrap: true }
    }).setOrigin(.5, 1).setDepth(30);
    this.createdObjects.push(hint);
    return hint;
  }

  clearCreatedObjects() {
    this.layoutEnabled = false;
    this.layoutSignature = null;
    const objects = new Set(this.createdObjects.filter(Boolean));
    if (Array.isArray(this.scene?.interactiveObjects)) {
      this.scene.interactiveObjects = this.scene.interactiveObjects.filter(o => !objects.has(o));
    }
    for (const object of objects) {
      object.removeAllListeners?.();
      object.destroy?.();
    }
    this.createdObjects = [];
  }

  destroy() {
    const scene = this.scene;
    if (!scene) return;
    scene.scale.off('resize', this.handleResize);
    scene.events.off('postupdate', this.handlePostUpdate);
    scene.events.off('shutdown', this.handleShutdown);
    this.clearCreatedObjects();
    this.scene = null;
  }
}