import { gameState } from '../GameData.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { loadJson } from '../config/loadJson.js';
import { SCENE_FILES, mergeMonologues, linesAt, profileFor, piInspectKey, eventChanges } from './SceneMonologueModel.js';

const controllers = new WeakMap();
const overlayKeys = new Set(['UIScene', 'PlayerHudScene', 'NewsHud']);
const openPanels = ['computerUI', 'agencyComputerUI', 'phoneUI', 'piCrimeBoardUI',
  'destinationsUI', 'saveUI', 'agencyLedgerUI', 'archiveDialog', 'storageDialog', 'dialoguePanel', 'dialogUI'];
const sharedSessions = new WeakMap();
const EVENT_TTL = 60000;
const CLOCK_STEP = 250;
const HOVER_COOLDOWN = 14000;
const GLOBAL_GAP = 2500;

function sessionFor(game) {
  if (!sharedSessions.has(game)) sharedSessions.set(game, new Map());
  return sharedSessions.get(game);
}
function sameLines(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
}
export function installSceneMonologues(scene) {
  if (!SCENE_FILES[scene.sys.settings.key]) return null;
  if (controllers.has(scene)) return controllers.get(scene);
  const controller = new SceneMonologues(scene);
  controllers.set(scene, controller);
  return controller;
}
export function uninstallSceneMonologues(scene) {
  controllers.get(scene)?.destroy();
  controllers.delete(scene);
}

export class SceneMonologues {
  constructor(scene) {
    this.scene = scene;
    this.key = scene.sys.settings.key;
    this.dead = false;
    this.ready = false;
    this.pending = [];
    this.wrappers = [];
    this.hoverAt = new Map();
    this.lastSpeech = -Infinity;
    this.nextPoll = 0;
    this.nextIdle = Infinity;
    this.wasBlocked = true;
    this.previous = null;
    this.profile = null;
    this.manager = null;
    this.conversation = null;
    this.storageText = null;
    this.onFrame = () => this.update();
    this.onReady = () => {
      void this.start().catch(error => console.warn('[SceneMonologues] Setup failed; gameplay remains available.', error));
    };
    this.onOver = (_pointer, object) => this.hover(object);
    this.onWake = () => { this.nextPoll = 0; this.postponeIdle(); };
    this.onSleep = () => { this.silence(); this.postponeIdle(); };
    this.onEnd = () => this.destroy();
    this.onRestore = () => {
      sessionFor(scene.game).clear();
      this.previous = null; this.pending = []; this.postponeIdle();
    };
    this.eventApi = (name, options = {}) => this.queueEvent(name, options);
    this.previousEventApi = scene.monologueEvent;
    scene.monologueEvent = this.eventApi;
    scene.events.once('create', this.onReady);
    scene.events.on('postupdate', this.onFrame);
    scene.events.on('wake', this.onWake);
    scene.events.on('resume', this.onWake);
    scene.events.on('sleep', this.onSleep);
    scene.events.on('pause', this.onSleep);
    scene.events.once('shutdown', this.onEnd);
    scene.events.once('destroy', this.onEnd);
    scene.input?.on('gameobjectover', this.onOver);
    scene.onBus?.('gameState:restored', this.onRestore);
  }

  now() { return this.scene?.time?.now ?? 0; }
  getState() { return this.scene.gameState || gameState; }
  currentProfile() { return profileFor(this.key, this.scene.bigOffice === true); }
  context() {
    const s = this.getState(), scene = this.scene;
    const caseId = s.currentCaseId ?? s.currentMission?.id ?? s.currentMission?.missionId ?? 'no-case';
    const city = this.key === 'CityScene' || this.key === 'CrimeCityScene' ? scene.cityId : '';
    return `${s._createdAt ?? 'session'}:${caseId}:${city}`;
  }
  readSnapshot() {
    const scene = this.scene, state = this.getState();
    const snap = { context:this.context() };
    if (this.key === 'CrimeCityScene') {
      const caseKey = scene.getCaseKey?.();
      snap.searched = scene.isCrimeSceneCompleted?.() === true;
      snap.analysed = scene.isCrimeLabCompleted?.() === true;
      const reconstruction = state.reconstructedHeists?.[caseKey] || state.reconstructedHeist;
      snap.reconstructed = scene.isGridCompleted?.() === true && reconstruction?.playerTheoryResult === 'exact';
      snap.excluded = state.suspectExclusionState?.[caseKey]?.finished === true;
      snap.apartmentAvailable = scene.hasAnyDebunkedAlibi?.() === true;
      const resolution = scene.progressService?.getAlibiResolutionProgress?.();
      snap.alibis = Object.fromEntries((resolution?.conclusions || [])
        .filter(c => c.final && ['confirmed', 'contradicted'].includes(c.status))
        .map(c => [c.suspectId, c.status]));
    }
    if (this.key === 'ArchiveScene') {
      const id = [state.currentCaseId, state.currentMission?.caseId, state.currentMission?.id,
        state.currentMission?.missionId].find(v => v !== null && v !== undefined && String(v).trim());
      const receipts = MainStoryManager.getSideClue('archive_submitted_reports') || {};
      snap.submitted = id != null && Object.hasOwn(receipts, `report:${id}`);
      snap.puzzleOffered = MainStoryManager.hasFlag('archive_index_puzzle_offered');
      snap.duplicate = MainStoryManager.hasFlag('duplicate_record_found');
      snap.discussed = MainStoryManager.hasFlag('archive_duplicate_discussed');
    }
    if (this.key === 'DetectiveOfficeScene') {
      snap.quests = Object.fromEntries(Object.entries(state.piQuests?.quests || {}).map(([id, q]) => [id,q.status]));
      snap.moving = Boolean(scene.moveIn || scene.activeDevice === 'move-in');
      snap.owned = {};
      // Visible purchased layers are authoritative; decorative overlays are not purchases.
      for (const layer of scene.layers || []) {
        if (layer.cfg?.decorative || !layer.cfg?.id) continue;
        snap.owned[layer.cfg.id] = layer.image?.visible === true;
      }
      snap.staff = Object.fromEntries(Object.entries(state.piOfficeShop?.idleOffice?.rooms || {})
        .map(([id, room]) => [id, room.hired === true]));
    }
    return snap;
  }

  async start() {
    if (this.dead) return;
    const files = SCENE_FILES[this.key];
    const loaded = await Promise.all(files.map(async file => {
      try {
        const data = await loadJson(`../assets/data/monologues/${file}`, import.meta.url);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Expected an object.');
        return data;
      } catch (error) {
        console.warn(`[SceneMonologues] Could not load ${file}; existing texts remain available.`, error);
        return null;
      }
    }));
    if (this.dead) return;
    if (!loaded.some(Boolean)) return;
    this.manager = this.scene.monologue;
    if (!this.manager || this.manager.isDestroyed) return;
    let merged = mergeMonologues({}, this.manager.dialogues);
    for (const data of loaded) merged = mergeMonologues(merged, data);
    this.manager.setDialogues(merged);
    this.manager.stopIdle();
    this.wrap(this.manager, 'startIdle', () => false);
    const controller = this;
    this.wrap(this.manager, 'sayRandom', function(original, key, options = {}) {
      if (!controller.canSpeak()) return false;
      if (controller.key === 'OfficeScene' && key === 'inspect.ledger' && Number.isFinite(controller.getState().agencyBudget) && controller.getState().agencyBudget <= 0) {
        key = 'events.office.ledgerLowBudget';
      }
      const isInspect = String(key).startsWith('inspect.') || key === 'events.office.ledgerLowBudget';
      if (isInspect && !controller.hoverAllowed(key)) return false;
      const accepted = original(key, options);
      if (accepted) {
        controller.lastSpeech = controller.now();
        if (isInspect) controller.hoverAt.set(key, controller.now());
        controller.postponeIdle();
      }
      return accepted;
    });
    this.profile = this.currentProfile();
    const current = this.readSnapshot();
    const previous = sessionFor(this.scene.game).get(`snapshot:${this.key}:${current.context}`);
    this.previous = current;
    this.ready = true;
    for (const event of eventChanges(previous, current, this.profile)) this.queueEvent(event);
    this.rememberSnapshot(current);
    this.wrapSceneActions();
    this.postponeIdle();
    this.queueEntry();
    if (this.key === 'AgencyStorageScene') {
      try {
        const text = await loadJson('../assets/data/storageRoomDialogues.json', import.meta.url);
        if (!this.dead) this.storageText = text;
      } catch (error) { console.warn('[SceneMonologues] Alex event texts unavailable.', error); }
    }
  }

  wrap(object, method, callback) {
    if (typeof object?.[method] !== 'function') return;
    const original = object[method];
    const wrapped = function(...args) { return callback.call(this, original.bind(this), ...args); };
    object[method] = wrapped;
    this.wrappers.push({object,method,original,wrapped});
  }
  wrapSceneActions() {
    const c = this, scene = this.scene;
    if (this.key === 'AgencyStorageScene') {
      this.wrap(scene, 'startConversation', function(original, ...args) {
        const result = original(...args);
        if (result !== true || !c.storageText) return result;
        const lines = scene.storageDialog?.voice?.lines;
        const d = c.storageText;
        const pairs = [
          [d.manual?.intro,'manualReceived'], [d.manual?.replacement,'manualReplacement'],
          [d.thirdMission?.alexLines,'alexRefusal'], [d.fourthMission?.conversation,'alexAccountHeard']
        ];
        const match = pairs.find(([expected]) => sameLines(lines, expected));
        if (match) c.conversation = { event:match[1], context:c.context() };
        return result;
      });
    }
    if (this.key === 'CityScene') {
      this.wrap(scene, 'visitEncounter', function(original, encounter, ...args) {
        const closed = encounter && scene.isLocationOpen?.(encounter.locationId) === false;
        const allowed = scene.canStartInteraction?.() === true;
        const result = original(encounter, ...args);
        if (closed && allowed) c.queueEvent('locationClosed');
        return result;
      });
    }
  }

  canSpeak() {
    const s = this.scene;
    if (this.dead || !s || s._cleanupDone || !s.sys?.isActive?.() ||
        s.sys.settings.visible === false || globalThis.document?.hidden === true) return false;
    if (s.uiLocked || s.isLeaving || s.navigating || s.isTransitioning || s.isVisitingApartment ||
        s.isSettingUpUi || s._conversationOpen || s._puzzleOpen || s._timelineOpen ||
        s._preparing || s._finishing || s.activeDevice || s.computerChild || s.childLoading || s.moveIn ||
        s._crimeCityErrorView || s._uiLoading) return false;
    if (this.key === 'CityScene' && (s.uiReady !== true || s.isFinalShowdown)) return false;
    if (s.mapUI?.selectionObjects?.length || s.activePopup?.active) return false;
    if (this.key === 'ArchiveScene' && s.statusText?.visible) return false;
    for (const key of openPanels) if (s[key]?.isOpen === true) return false;
    const hud = s.getPlayerHudScene?.();
    if (hud?.isAnyPanelOpen?.()) return false;
    for (const owner of [s, hud]) {
      if (!owner) continue;
      for (const value of Object.values(owner)) {
        if (!value || typeof value !== 'object') continue;
        if (value.constructor?.name?.includes('Dialog') && value.isOpen === true) return false;
      }
    }
    for (const tutorial of [s.firstCaseTutorial, s.crimeTutorial, s.tutorialController]) {
      if (typeof tutorial?.isActive === 'function' && tutorial.isActive()) return false;
    }
    const first = this.getState().onboarding?.firstCase;
    if (this.key === 'OfficeScene' && first?.active && !first.completed && !first.skipped) return false;
    if (s.game?.scene?.getScenes) {
      for (const overlay of s.game.scene.getScenes(true)) {
        const key = overlay?.sys?.settings?.key;
        if (overlay !== s && !overlayKeys.has(key) && overlay.sys?.settings?.visible !== false) return false;
      }
    }
    return true;
  }
  silence() {
    const m = this.manager;
    if (!m || m.isDestroyed) return;
    m.clearQueue();
    m.removeTimer(m.currentTimer); m.currentTimer = null;
    m.killTweensForContainer();
    m.isShowing = false;
    m.container?.setVisible(false).setAlpha(0);
  }
  postponeIdle() { this.nextIdle = this.now() + 25000 + Math.floor(Math.random() * 20001); }
  hoverAllowed(key) {
    const now = this.now();
    return now - (this.hoverAt.get(key) ?? -Infinity) >= HOVER_COOLDOWN && now - this.lastSpeech >= GLOBAL_GAP;
  }
  play(key, inspect = false) {
    const m = this.manager;
    if (!m || m.isDestroyed || !this.canSpeak() || m.isShowing || m.queue.length ||
        this.now() - this.lastSpeech < GLOBAL_GAP || !linesAt(m.dialogues, key).length) return false;
    if (inspect && !this.hoverAllowed(key)) return false;
    return m.sayRandom(key, { queue:false, cooldownKey:key, cooldownMs:inspect ? HOVER_COOLDOWN : 1500 });
  }

  hover(object) {
    if (!this.ready || !this.canSpeak()) return;
    const s = this.scene, p = this.currentProfile();
    let key = null;
    if (this.key === 'OfficeScene') return; // Existing handlers use guarded sayRandom().
    if (this.key === 'ArchiveScene' && object === s.frankHotspot && s.frankPresent) key = 'inspect.archiveArchivist';
    if (this.key === 'DetectiveOfficeScene') {
      const hotspot = s.hotspots?.find(item => item.rect === object);
      const layer = s.layers?.find(item => item.image === object && item.image.visible && !item.cfg.decorative);
      const config = hotspot?.cfg || layer?.cfg;
      if (config) key = piInspectKey(p, config.id);
    }
    if (this.key === 'CrimeCityScene') {
      const id = object?.texture?.key;
      const location = {search:'crimeScene',crime_lab:'crimeLab',policja:'suspectFiles',
        apt_icon:'apartment',hotel_icon:'hotel',shop_icon:'shop'}[id];
      if (location) key = `inspect.crimeCity.${location}`;
      else if (s.npcManager?.createdObjects?.includes(object) && object.type === 'Image') key = 'inspect.crimeCity.alibiWitness';
    }
    if (this.key === 'CityScene') {
      const encounter = s.encounterViews?.find(view => view.icon === object);
      if (encounter) {
        const visited = s.getEncounterStatus?.(encounter.encounter)?.isRepeat;
        const type = visited && encounter.encounter.npcId ? 'revisitedContact'
          : encounter.encounter.npcId ? 'contact' : 'place';
        key = `inspect.pursuitCity.${type}`;
      } else if (s.hotelObjects?.includes(object)) key = 'inspect.pursuitCity.hotel';
      else if (s.shopObjects?.includes(object)) key = 'inspect.pursuitCity.shop';
    }
    if (key) this.play(key, true);
  }

  queueEvent(name, { onceKey = null } = {}) {
    if (!this.ready || this.dead) return false;
    const prefix = `events.${this.currentProfile()}.`;
    const key = String(name).startsWith('events.') ? name : prefix + name;
    if (!key.startsWith(prefix) || !linesAt(this.manager?.dialogues, key).length) return false;
    const context = this.context();
    const seen = sessionFor(this.scene.game);
    const id = onceKey ? `${context}:${onceKey}` : null;
    if ((id && seen.has(id)) || this.pending.some(p => p.key === key && p.context === context)) return false;
    this.pending.push({ key, context, expires:this.now() + EVENT_TTL, onceKey:id });
    if (this.pending.length > 4) this.pending.shift();
    return true;
  }
  rememberSnapshot(snapshot) {
    sessionFor(this.scene.game).set(`snapshot:${this.key}:${snapshot.context}`, snapshot);
  }
  queueEntry() {
    const s = this.scene, state = this.getState();
    if (this.key === 'ArchiveScene') {
      if (!s.frankPresent) this.queueEvent('archivistAbsent', {onceKey:'archive:absent'});
      else if (!this.previous?.submitted) this.queueEvent('reportPending', {onceKey:'archive:reportPending'});
    }
    if (this.key === 'OfficeScene') {
      if (state.caseFailed === true) this.queueEvent('missionFailure', {onceKey:'office:result'});
      else if (state.caseResolved === true && state.finalArrestResult === 'SUCCESS') {
        this.queueEvent('missionSuccess', {onceKey:'office:result'});
      }
    }
    if (this.key === 'CrimeCityScene' || this.key === 'CityScene') {
      this.queueEvent('arrived', {onceKey:`${this.key}:arrived`});
    }
  }
  observe() {
    const profile = this.currentProfile();
    const snapshot = this.readSnapshot();
    if (profile !== this.profile) {
      const moved = this.key === 'DetectiveOfficeScene' && this.profile === 'piOfficeOld' && profile === 'piOfficeNew';
      this.profile = profile; this.previous = snapshot; this.rememberSnapshot(snapshot); this.pending = []; this.postponeIdle();
      if (moved && !snapshot.moving) this.queueEvent('moveInCompleted');
      return;
    }
    for (const key of eventChanges(this.previous, snapshot, profile)) this.queueEvent(key);
    this.previous = snapshot;
    this.rememberSnapshot(snapshot);
    if (this.conversation && !this.scene._conversationOpen) {
      const event = this.conversation; this.conversation = null;
      const manual = event.event.startsWith('manual');
      const received = this.scene.manualTemplate?.id && this.scene.hasInventoryItem?.(this.scene.manualTemplate.id);
      if (event.context === this.context() && (!manual || received)) this.queueEvent(event.event);
    }
  }
  update() {
    if (this.dead || !this.ready) return;
    const now = this.now();
    try {
      const blocked = !this.canSpeak();
      if (blocked) { this.silence(); this.postponeIdle(); }
      if (now < this.nextPoll) return;
      this.nextPoll = now + CLOCK_STEP;
      this.observe();
      this.pending = this.pending.filter(p => p.context === this.context() && p.expires >= now &&
        p.key.startsWith(`events.${this.currentProfile()}.`));
      if (blocked) { this.wasBlocked = true; return; }
      if (this.wasBlocked) { this.wasBlocked = false; this.postponeIdle(); this.lastSpeech = now; }
      const item = this.pending[0];
      if (item && this.play(item.key)) {
        this.pending.shift();
        if (item.onceKey) sessionFor(this.scene.game).set(item.onceKey, true);
        return;
      }
      if (!this.pending.length && now >= this.nextIdle) {
        let idle = `idle.${this.currentProfile()}`;
        const state = this.getState();
        if (this.key === 'OfficeScene' && !state.currentMission) idle = 'events.office.noMission';
        if (this.key === 'DetectiveOfficeScene') {
          const quests = Object.values(state.piQuests?.quests || {});
          if (!quests.some(q => q.status === 'active')) idle = `events.${this.currentProfile()}.noCase`;
        }
        this.play(idle);
        this.postponeIdle();
      }
    } catch (error) {
      if (!this.reportedError) console.warn('[SceneMonologues] Presentation suspended safely.', error);
      this.reportedError = true; this.silence(); this.nextPoll = now + 2000;
    }
  }
  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.silence();
    const s = this.scene;
    for (const [event, callback] of [['create',this.onReady],['postupdate',this.onFrame],
      ['wake',this.onWake],['resume',this.onWake],['sleep',this.onSleep],['pause',this.onSleep],
      ['shutdown',this.onEnd],['destroy',this.onEnd]]) s.events.off(event, callback);
    s.input?.off('gameobjectover', this.onOver);
    s.offBus?.('gameState:restored', this.onRestore);
    for (const {object,method,original,wrapped} of this.wrappers.reverse()) {
      if (object[method] === wrapped) object[method] = original;
    }
    if (s.monologueEvent === this.eventApi) {
      if (this.previousEventApi === undefined) delete s.monologueEvent;
      else s.monologueEvent = this.previousEventApi;
    }
    this.pending = []; this.wrappers = [];
    controllers.delete(s);
  }
}
