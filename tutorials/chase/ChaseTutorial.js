import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { ChaseTutorialOverlay } from './ChaseTutorialOverlay.js';
import { getHud, getPanel, menuTarget, npcTargets, hotelTargets, boardTargets } from './ChaseTutorialTargets.js';

export function installChaseTutorial(game) {
  if (game.chaseTutorial) return game.chaseTutorial;
  const tutorial = new ChaseTutorial(game);
  game.chaseTutorial = tutorial;
  return tutorial;
}

class ChaseTutorial {
  constructor(game) {
    this.game = game;
    this.overlay = new ChaseTutorialOverlay(game, () => this.finish(true));
    this.overlay.hide();
    this.lastTick = 0;
    this.tickBound = time => {
      if (time - this.lastTick < 120) return;
      this.lastTick = time;
      this.tick();
    };
    game.events.on('poststep', this.tickBound);
    game.events.once('destroy', () => this.destroy());
  }
  get state() { return gameState.onboarding?.chase; }
  save() { requestAutosave(); }
  finish(skipped = false) {
    if (!this.state) return;
    this.state.completed = true;
    this.state.skipped = skipped;
    this.state.step = 'finished';
    this.save(); this.overlay.hide();
  }
  step(next) {
    if (this.state.step === next) return;
    this.state.step = next; this.save();
  }
  activeScene() {
    const scenes = this.game.scene.getScenes(true);
    const allowed = new Set(['CityScene', 'LocationScene', 'HotelScene']);
    const foreign = scenes.some(scene => !allowed.has(scene.sys.settings.key) &&
      !['PlayerHudScene','UIScene','NewsHud'].includes(scene.sys.settings.key));
    if (foreign) return null;
    return [...scenes].reverse().find(scene => allowed.has(scene.sys.settings.key)) || null;
  }
  syncWitnesses(scene) {
    if (scene.sys.settings.key !== 'CityScene') return;
    const ids = new Set(this.state.interviewed);
    for (const entry of scene.getEncounters()) {
      const memory = gameState.encounterMemory?.[entry.id];
      if (memory?.askedTopics?.length) ids.add(entry.npcId);
    }
    if (ids.size !== this.state.interviewed.length) {
      this.state.interviewed = [...ids]; this.save();
    }
  }
  tick() {
    const scene = this.activeScene();
    const key = scene?.sys.settings.key;
    if (!scene || scene._cleanupDone) { this.overlay.hide(); return; }
    if (!this.state) {
      if (key !== 'CityScene' || !scene.uiReady || scene.isFinalShowdown ||
        scene.cityId === gameState.crimeCityId ||
        !gameState.onboarding?.crimeCity?.completed) {
        this.overlay.hide(); return;
      }
      gameState.onboarding.chase = {
        version:1, cityId:scene.cityId, step:'npc', interviewed:[],
        completed:false, skipped:false, warrantChanged:false, boardSeen:false
      };
      this.save();
    }
    const state = this.state;
    if (state.completed) { this.overlay.hide(); return; }
    if (key === 'CityScene' && scene.cityId !== state.cityId) {
      this.finish(state.step !== 'travel'); return;
    }
    if (scene.cityId !== state.cityId || scene.isFinalShowdown) {
      this.overlay.hide(); return;
    }
    const hud = getHud(this.game);
    if (!hud || (key === 'CityScene' && (!scene.uiReady || scene.activePopup || scene.isTransitioning))) {
      this.overlay.hide(); return;
    }
    this.syncWitnesses(scene);
    const count = Math.min(3, state.interviewed.length);
    const warrant = getPanel(hud, 'warrantUI');
    const board = getPanel(hud, 'crimeBoardUI');
    const destinations = getPanel(hud, 'destinationsUI');
    const open = hud.getOpenPanels().filter(name => name !== 'playerMenu');
    if (open.some(name => !['warrantUI','crimeBoardUI','destinationsUI'].includes(name))) {
      this.overlay.hide(); return;
    }
    if (warrant?.isOpen && state.step === 'warrant') {
      if (Object.values(warrant.currentFilters || {}).some(value => value > 0)) {
        if (!state.warrantChanged) { state.warrantChanged = true; this.save(); }
      }
      this.overlay.render('warrant_edit', count,
        (warrant.traitValueTexts || []).map(entry => entry.textObj));
      return;
    }
    if (board?.isOpen && ['hotel','board','board_close'].includes(state.step)) {
      if (!board.boardApi) { this.overlay.hide(); return; }
      state.boardSeen = true; this.step('board_close');
      this.overlay.render('board_edit', count); return;
    }
    if (warrant?.isOpen || board?.isOpen) { this.overlay.hide(); return; }
    if (state.step === 'warrant' && state.warrantChanged) this.step('hotel');
    if (state.step === 'board_close' && state.boardSeen) this.step('npc');
    if (key === 'LocationScene') {
      if (scene.entryBlocked || scene.isFalseLead || !scene.reputationAccess?.allowed || !scene.npcController) {
        this.overlay.hide(); return;
      }
      const remaining = (scene.topicButtons || []).filter(button => !scene.askedTopics.has(button.topicId));
      this.overlay.render(remaining.length ? 'dialogue' : 'leave', count,
        remaining.length ? remaining.map(button => button.text) : [scene.leaveButton]);
      return;
    }
    if (state.step === 'npc' && count > 0 && !state.warrantChanged) this.step('warrant');
    if (key === 'HotelScene') {
      if (scene.isChoosingHotel) { this.overlay.render('booking', count); return; }
      if (scene.isHotelInteractionBlocked()) { this.overlay.hide(); return; }
      if (['hotel','board'].includes(state.step)) {
        this.step('board'); this.overlay.render('board', count, boardTargets(scene));
      } else {
        this.overlay.render('return', count,
          (scene.hotspotUI?.zones || []).filter(entry => entry.cfg.id === 'hotel-window-exit').map(entry => entry.zone));
      }
      return;
    }
    if (key !== 'CityScene') { this.overlay.hide(); return; }
    if (state.step === 'warrant') {
      this.overlay.render('warrant', count, menuTarget(hud, 'warrant')); return;
    }
    if (['hotel','board'].includes(state.step)) {
      this.overlay.render('hotel', count, hotelTargets(scene)); return;
    }
    if (count >= 3) {
      this.step('travel');
      this.overlay.render(destinations?.isOpen ? 'travel_choose' : 'travel', count,
        destinations?.isOpen ? [] : menuTarget(hud, 'plane'));
      return;
    }
    if (destinations?.isOpen) { this.overlay.hide(); return; }
    this.overlay.render('npc', count, npcTargets(scene, state.interviewed));
  }
  destroy() {
    this.game.events.off('poststep', this.tickBound);
    this.overlay.destroy();
    if (this.game.chaseTutorial === this) this.game.chaseTutorial = null;
  }
}
