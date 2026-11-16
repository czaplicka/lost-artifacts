import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { inventoryManager } from '../../managers/InventoryManager.js';
import { getKnownApartmentIdentityClues } from '../../scenes/apartament/ApartmentIdentityEvidence.js';
import { evidenceMatchesCase, getEvidenceCaseKey } from '../../managers/ApartmentEvidenceModel.js';
import { getBoardEvidenceRecord } from '../../crimeBoard/BoardEvidenceModel.js';
import { recordEnvelopeViewed } from '../../crimeBoard/BoardEvidenceRuntime.js';
import { MIN_TRAITS } from '../../ui/warrant/warrantConfig.js';
import { ChaseTutorialOverlay } from './ChaseTutorialOverlay.js';
import { getHud, getPanel, menuTarget, npcTargets, hotelTargets, boardTargets } from './ChaseTutorialTargets.js';

const FILE = 'tutorials/chase/ChaseTutorial.js';
const text = key => __dialogueText(FILE, key);
const TUTORIAL_SCENES = new Set(['CityScene', 'LocationScene', 'HotelScene', 'ArrestSelectionScene']);
const NON_BLOCKING_SCENES = new Set([
  'PlayerHudScene', 'UIScene', 'NewsHud', 'EnergyHudScene',
  '__LostArtifactsAudioHost', '__AssetWorkerScene'
]);
const normalized = value => String(value ?? '').trim().toUpperCase();

export function installChaseTutorial(game) {
  if (game.chaseTutorial) return game.chaseTutorial;
  const tutorial = new ChaseTutorial(game);
  game.chaseTutorial = tutorial;
  return tutorial;
}

class ChaseTutorial {
  constructor(game) {
    this.game = game;
    this.lastTick = 0;
    this.context = null;
    this.destroyed = false;
    this.identityHook = null;
    this.lastIdentityAction = null;
    this.overlay = new ChaseTutorialOverlay(game, () => this.skipCurrentTutorial());
    this.tickBound = time => {
      const now = Number.isFinite(time) ? time : performance.now();
      if (now - this.lastTick < 120) return;
      this.lastTick = now;
      this.tick();
    };
    this.destroyBound = () => this.destroy();
    game.events.on('poststep', this.tickBound);
    game.events.once('destroy', this.destroyBound);
  }

  get state() { return gameState.onboarding?.chase; }
  save() { requestAutosave(); }

  ensureOnboarding() {
    if (!gameState.onboarding || typeof gameState.onboarding !== 'object' || Array.isArray(gameState.onboarding)) {
      gameState.onboarding = {};
    }
    return gameState.onboarding;
  }

  ensureChaseState(scene) {
    const onboarding = this.ensureOnboarding();
    if (!onboarding.chase) {
      onboarding.chase = {
        version: 3, cityId: scene.cityId, step: 'npc', interviewed: [], completed: false, skipped: false,
        warrantOpened: false, warrantChanged: false, boardSeen: false,
        theoryIntroduced: false, identityEnvelopeViewed: false
      };
      this.save();
    }
    const state = onboarding.chase;
    if (state.version !== 3) {
      state.interviewed = Array.isArray(state.interviewed) ? state.interviewed : [];
      state.warrantOpened ??= false;
      state.warrantChanged ??= false;
      state.boardSeen ??= false;
      state.theoryIntroduced ??= false;
      state.identityEnvelopeViewed ??= false;
      if (state.step === 'board_close') state.step = 'theory';
      if (!state.completed && !state.skipped && state.step === 'warrant' && !state.warrantChanged) state.step = 'inventory';
      state.version = 3;
      this.save();
    }
    if (!Array.isArray(state.interviewed)) state.interviewed = [];
    return state;
  }

  ensureArrestState() {
    const onboarding = this.ensureOnboarding();
    if (!onboarding.arrestSelection) {
      onboarding.arrestSelection = { version: 1, step: 'arrest', completed: false, skipped: false };
      this.save();
    }
    return onboarding.arrestSelection;
  }

  step(next) {
    if (!this.state || this.state.step === next) return;
    this.state.step = next;
    this.save();
  }
  finish(skipped = false) {
    if (!this.state) return;
    Object.assign(this.state, { completed: true, skipped, step: 'finished' });
    this.save();
    this.overlay.hide();
  }
  finishArrest(skipped = false) {
    Object.assign(this.ensureArrestState(), { completed: true, skipped, step: 'finished' });
    this.save();
    this.overlay.hide();
  }
  skipCurrentTutorial() {
    if (this.context === 'arrest') this.finishArrest(true);
    else if (this.context === 'chase') this.finish(true);
  }

  currentIdentity(warrant) {
    const clue = getKnownApartmentIdentityClues(gameState).find(entry => entry.category === 'eyes');
    const index = Number(warrant?.currentFilters?.eyes);
    const value = warrant?.traitsData?.eyes?.[index];
    const matches = Boolean(clue && index > 0 && normalized(value) === normalized(clue.value));
    return { clue, index, value, matches };
  }

  bindIdentityAction(warrant) {
    if (this.identityHook?.warrant === warrant && warrant?.useApartmentClue === this.identityHook.wrapper) return;
    this.unbindIdentityAction();
    if (!warrant || typeof warrant.useApartmentClue !== 'function') return;
    const original = warrant.useApartmentClue;
    const owner = this;
    function wrapper(...args) {
      const result = original.apply(this, args);
      if (result && typeof result.then === 'function') {
        result.then(() => owner.onIdentityAction(this), error => console.warn('[ChaseTutorial] ID action failed:', error));
      } else owner.onIdentityAction(this);
      return result;
    }
    this.identityHook = { warrant, original, wrapper };
    warrant.useApartmentClue = wrapper;
  }

  unbindIdentityAction() {
    const hook = this.identityHook;
    this.identityHook = null;
    if (hook && hook.warrant.useApartmentClue === hook.wrapper) hook.warrant.useApartmentClue = hook.original;
  }

  markIdentityApplied(warrant) {
    const state = this.state;
    const identity = this.currentIdentity(warrant);
    if (!state || state.completed || state.skipped || !identity.matches) return false;
    const key = String(getEvidenceCaseKey(gameState));
    if (state.identityAppliedCaseKey !== key || state.identityAppliedClueId !== identity.clue.id) {
      state.identityAppliedCaseKey = key;
      state.identityAppliedClueId = identity.clue.id;
      this.save();
    }
    return true;
  }

  onIdentityAction(warrant) {
    if (this.destroyed || !warrant?.isOpen) return;
    const identity = this.currentIdentity(warrant);
    this.lastIdentityAction = {
      warrant, caseKey: String(getEvidenceCaseKey(gameState)), success: identity.matches
    };
    if (identity.matches) {
      this.markIdentityApplied(warrant);
      if (this.state && ['npc', 'inventory', 'warrant'].includes(this.state.step) &&
          !this.state.completed && !this.state.skipped) this.step('warrant');
    }
    if (this.state?.step === 'warrant' && !this.state.completed && !this.state.skipped) {
      this.context = 'chase';
      this.renderWarrantTutorial(warrant, Math.min(3, this.state.interviewed?.length || 0));
    }
  }

  activeScene() {
    const scenes = this.game.scene.getScenes(true);
    const foreign = scenes.some(scene => {
      const key = scene.sys.settings.key;
      if (TUTORIAL_SCENES.has(key) || NON_BLOCKING_SCENES.has(key)) return false;
      if (key === 'LoadingOverlayScene' && scene.sys.settings.visible === false) return false;
      return true;
    });
    if (foreign) return null;
    return [...scenes].reverse().find(scene => TUTORIAL_SCENES.has(scene.sys.settings.key) &&
      scene.sys.settings.visible !== false) || null;
  }

  syncWitnesses(scene) {
    if (scene.sys.settings.key !== 'CityScene' || typeof scene.getEncounters !== 'function') return;
    const ids = new Set(this.state.interviewed);
    for (const entry of scene.getEncounters()) {
      const topics = gameState.encounterMemory?.[entry.id]?.askedTopics;
      if (entry.npcId && Array.isArray(topics) && topics.some(topic => topic !== 'banter')) ids.add(entry.npcId);
    }
    if (ids.size !== this.state.interviewed.length) {
      this.state.interviewed = [...ids];
      this.save();
    }
  }

  identityEnvelope() {
    const known = new Set(getKnownApartmentIdentityClues(gameState)
      .filter(clue => clue.category === 'eyes').map(clue => clue.id));
    return inventoryManager.getAllItems().find(item => {
      const apartment = item?.metadata?.apartment;
      return Number(item?.quantity ?? 1) > 0 && apartment && evidenceMatchesCase(item, gameState) && known.has(apartment.originalId);
    }) || null;
  }

  syncEnvelopeViewed() {
    if (this.state.identityEnvelopeViewed) return;
    const viewed = getBoardEvidenceRecord(gameState).envelopeViewed;
    const known = getKnownApartmentIdentityClues(gameState);
    if (viewed?.clue?.category === 'eyes' && known.some(clue => clue.id === viewed.clue.id && clue.category === 'eyes')) {
      this.state.identityEnvelopeViewed = true;
      this.save();
    }
  }

  renderEnvelopeTutorial(hud, count) {
    this.syncEnvelopeViewed();
    if (this.state.identityEnvelopeViewed) { this.overlay.render('envelope_done', count); return; }
    if (!inventoryManager.isOpen) { this.overlay.render('inventory', count, menuTarget(hud, 'inventory')); return; }
    const envelope = this.identityEnvelope();
    if (!envelope) { this.overlay.render('envelope_missing', count); return; }
    const selected = inventoryManager.getSelectedItem();
    if (selected?.id === envelope.id) {
      recordEnvelopeViewed(selected, gameState);
      this.syncEnvelopeViewed();
    }
    this.overlay.render(this.state.identityEnvelopeViewed ? 'envelope_done' : 'envelope', count);
  }

  issueTargets(warrant) {
    const targets = [];
    const walk = object => {
      if (object?.type === text('t_71988c4d8e0803ba4519') && object.input?.enabled &&
          /^\[\s*ISSUE\s*\]$/.test(object.text || '')) targets.push(object);
      if (Array.isArray(object?.list)) object.list.forEach(walk);
    };
    (warrant.results?.objects || []).forEach(walk);
    return targets;
  }

  renderWarrantMessage(id, count, targets, content) {
    this.overlay.render(id, count, targets.filter(Boolean), { objective: content.objective });
    if (this.overlay.root.hidden) return;
    this.overlay.title.textContent = content.title;
    this.overlay.text.textContent = content.text;
    this.overlay.updateLayout();
  }

  getSelectedTraitCount(warrant) {
    return Object.entries(warrant.currentFilters || {}).filter(([key, raw]) => {
      const index = Number(raw), value = warrant.traitsData?.[key]?.[index];
      return Number.isInteger(index) && index > 0 && value !== undefined &&
        normalized(value) !== '' && normalized(value) !== 'NONE';
    }).length;
  }

  renderWarrantTutorial(warrant, count) {
    this.bindIdentityAction(warrant);
    if (!this.state.warrantOpened) { this.state.warrantOpened = true; this.save(); }
    if (warrant._issued) {
      if (!this.state.warrantChanged) { this.state.warrantChanged = true; this.save(); }
      this.overlay.render('warrant_issued', count);
      return;
    }
    const { clue, value, matches } = this.currentIdentity(warrant);
    const traits = warrant.traitValueTexts || [];
    const remaining = Math.max(0, MIN_TRAITS - this.getSelectedTraitCount(warrant));
    if (!clue) {
      this.renderWarrantMessage('warrant_edit', count, [], {
        title: 'IDENTITY CLUE NOT AVAILABLE',
        objective: 'The current case has no available eye-colour clue.',
        text: 'ID cannot apply a missing clue. Check the apartment evidence from this case; clicking ID alone does not create evidence.'
      });
      return;
    }
    if (!matches) {
      const failed = this.lastIdentityAction?.warrant === warrant &&
        this.lastIdentityAction.caseKey === String(getEvidenceCaseKey(gameState)) && !this.lastIdentityAction.success;
      this.renderWarrantMessage('warrant_edit', count,
        [warrant.identityBtn, ...traits.filter(entry => entry.key === 'eyes').map(entry => entry.textObj)], {
          title: failed ? 'ID DID NOT APPLY THE CLUE' : 'ADD THE APARTMENT ID CLUE',
          objective: failed ? `Set Eyes to ${clue.value}, or retry ID.` : 'Click ID to apply the recovered eye colour.',
          text: failed
            ? `The clue says ${clue.value}, but the selected eye colour is ${value || 'NONE'}. The application did not succeed; the tutorial has not marked it as complete.`
            : `The apartment clue records ${clue.value} eyes. ID copies this clue into the warrant; other traits must come from your collected evidence.`
        });
      return;
    }
    this.markIdentityApplied(warrant);
    if (remaining > 0) {
      this.renderWarrantMessage('warrant_edit', count,
        traits.filter(entry => entry.key !== 'eyes').map(entry => entry.textObj), {
          title: 'ID APPLIED',
          objective: `Eye colour accepted. Add ${remaining} more ${remaining === 1 ? 'trait' : 'traits'}.`,
          text: `Eyes: ${value}. The ID step is complete. The warrant needs at least ${MIN_TRAITS} traits. Use your collected clues to fill in the remaining description, then click SEARCH.`
        });
      return;
    }
    if (warrant._searching) { this.overlay.render('warrant_searching', count); return; }
    const issue = this.issueTargets(warrant);
    if (issue.length) { this.overlay.render('warrant_issue', count, issue); return; }
    const hasResults = Boolean(warrant.results?.objects?.length);
    this.overlay.render(hasResults ? 'warrant_no_match' : 'warrant_search', count, [warrant.searchBtn]);
  }

  getTheoryElements(board) {
    const root = board?.boardApi?.board?.root;
    const host = root?.closest?.(text('t_5f4a8917bd85d04d9691'))?.parentElement;
    if (!host) return { tab: null, panel: null, visible: false };
    const tab = [...host.querySelectorAll(text('t_1aa45dc7f5ac81c3a830'))]
      .find(button => button.textContent.trim() === text('t_43071101a92f96747165'));
    const panel = host.querySelector(text('t_1376a2cbb0911e97b614'));
    return { tab, panel, visible: Boolean(panel && !panel.hidden && panel.getClientRects().length) };
  }

  renderBoardTutorial(board, count) {
    if (!board?.boardApi) { this.overlay.hide(); return; }
    if (!this.state.boardSeen) { this.state.boardSeen = true; this.save(); }
    const theory = this.getTheoryElements(board);
    if (this.state.theoryIntroduced) { this.overlay.render('return', count); return; }
    if (theory.visible) {
      this.step('theory');
      this.overlay.render('theory_edit', count, [], {
        nextLabel: text('t_501721f0699ef8abe8d4'), onNext: () => {
          if (!this.state || this.state.completed) return;
          this.state.theoryIntroduced = true;
          this.step('return');
        }
      });
      return;
    }
    if (this.state.step === 'theory') { this.overlay.render('theory_open', count, [theory.tab]); return; }
    this.overlay.render('board_edit', count, [theory.tab], {
      nextLabel: text('t_1ff57a29d7c9d11bdf61'), onNext: () => this.step('theory')
    });
  }

  tickArrest(scene) {
    this.context = 'arrest';
    const state = this.ensureArrestState();
    if (state.completed || scene.isLeaving || scene.resultCommitted || scene.selectionLocked || scene.confirmOpen ||
        scene.zoomOverlay?.visible || !scene.arrestButton || !scene.displaySuspects?.length) {
      this.overlay.hide();
      return;
    }
    if (state.step === 'arrest_theory') {
      this.overlay.render('arrest_theory', null, [], {
        nextLabel: text('t_c3424f902d041d5fc16d'), onNext: () => this.finishArrest(false)
      });
      return;
    }
    const targets = [scene.leftArrow, scene.rightArrow].filter(target => target && typeof target.getBounds === 'function');
    this.overlay.render('arrest', null, targets, {
      nextLabel: text('t_1ff57a29d7c9d11bdf61'), onNext: () => { state.step = 'arrest_theory'; this.save(); }
    });
  }

  tickOpenWarrant(hud, warrant) {
    const state = this.state;
    if (!hud || !warrant?.isOpen || !state || state.completed || state.skipped) return false;
    if (!['npc', 'inventory', 'warrant'].includes(state.step)) return false;
    const others = hud.getOpenPanels().filter(name => !['playerMenu', 'warrantUI'].includes(name));
    if (others.length || inventoryManager.isOpen) return false;
    if (state.step !== 'warrant') {
      if (!this.currentIdentity(warrant).matches) return false;
      this.step('warrant');
    }
    this.context = 'chase';
    this.renderWarrantTutorial(warrant, Math.min(3, state.interviewed?.length || 0));
    return true;
  }

  tick() {
    if (this.destroyed) return;
    const hud = getHud(this.game);
    const warrant = getPanel(hud, 'warrantUI');
    this.bindIdentityAction(warrant);
    // Nakaz jest panelem HUD: jego aktualizacja nie zależy od aktywności sceny miasta.
    if (this.tickOpenWarrant(hud, warrant)) return;
    const scene = this.activeScene();
    if (!scene || scene._cleanupDone) { this.context = null; this.overlay.hide(); return; }
    const key = scene.sys.settings.key;
    if (key === 'ArrestSelectionScene') { this.tickArrest(scene); return; }
    this.context = 'chase';
    if (!this.state && (key !== 'CityScene' || !scene.uiReady || scene.isFinalShowdown || scene.cityId === gameState.crimeCityId)) {
      this.overlay.hide(); return;
    }
    const state = this.ensureChaseState(scene);
    if (state.completed || state.skipped) { this.overlay.hide(); return; }
    if (key === 'CityScene' && scene.cityId !== state.cityId) { this.finish(false); return; }
    if (scene.cityId !== state.cityId || scene.isFinalShowdown || scene.cityDebug?.enabled) { this.overlay.hide(); return; }
    if (!hud || (key === 'CityScene' && (!scene.uiReady || scene.activePopup || scene.isTransitioning))) { this.overlay.hide(); return; }
    this.syncWitnesses(scene);
    const count = Math.min(3, state.interviewed.length);
    if (state.step === 'npc' && count > 0 && !state.warrantChanged) this.step('inventory');
    if (state.step === 'inventory') this.syncEnvelopeViewed();
    const board = getPanel(hud, 'crimeBoardUI');
    const destinations = getPanel(hud, 'destinationsUI');
    const openPanels = hud.getOpenPanels().filter(name => name !== 'playerMenu');
    const inventoryStep = state.step === 'inventory';
    if (openPanels.some(name => !['warrantUI', 'crimeBoardUI', 'destinationsUI'].includes(name) &&
        !(inventoryStep && inventoryManager.isOpen && /inventory/i.test(name)))) { this.overlay.hide(); return; }
    if (state.step === 'inventory') {
      if (state.identityEnvelopeViewed && !inventoryManager.isOpen) this.step('warrant');
      else {
        if (warrant?.isOpen || board?.isOpen || destinations?.isOpen) { this.overlay.hide(); return; }
        if (key === 'CityScene') { this.renderEnvelopeTutorial(hud, count); return; }
      }
    }
    if (warrant?.isOpen) {
      if (state.step === 'warrant') this.renderWarrantTutorial(warrant, count);
      else this.overlay.hide();
      return;
    }
    if (state.step === 'warrant' && state.warrantOpened && gameState.arrestWarrantIssued) {
      state.warrantChanged = true;
      this.step('hotel');
    }
    if (board?.isOpen) {
      if (['hotel', 'board', 'theory', 'return', 'board_close'].includes(state.step)) this.renderBoardTutorial(board, count);
      else this.overlay.hide();
      return;
    }
    if (state.step === 'return' && key === 'CityScene') this.step('npc');
    if (key === 'LocationScene') {
      if (scene.entryBlocked || scene.isFalseLead || !scene.reputationAccess?.allowed || !scene.npcController) { this.overlay.hide(); return; }
      const remaining = (scene.topicButtons || []).filter(button => button.topicId !== 'banter' && !scene.askedTopics?.has(button.topicId));
      this.overlay.render(remaining.length ? 'dialogue' : 'leave', count,
        remaining.length ? remaining.map(button => button.text) : [scene.leaveButton]);
      return;
    }
    if (key === 'HotelScene') {
      if (scene.isChoosingHotel) { this.overlay.render('booking', count); return; }
      if (scene.isHotelInteractionBlocked()) { this.overlay.hide(); return; }
      if (['hotel', 'board', 'theory', 'board_close'].includes(state.step)) {
        if (state.step === 'hotel') this.step('board');
        this.overlay.render('board', count, boardTargets(scene));
        return;
      }
      const targets = (scene.hotspotUI?.zones || []).filter(entry => entry.cfg.id === 'hotel-window-exit').map(entry => entry.zone);
      this.overlay.render('return', count, targets);
      return;
    }
    if (key !== 'CityScene') { this.overlay.hide(); return; }
    if (state.step === 'warrant') { this.overlay.render('warrant', count, menuTarget(hud, 'warrant')); return; }
    if (['hotel', 'board', 'theory', 'board_close'].includes(state.step)) { this.overlay.render('hotel', count, hotelTargets(scene)); return; }
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
    if (this.destroyed) return;
    this.destroyed = true;
    this.unbindIdentityAction();
    this.game.events.off('poststep', this.tickBound);
    this.game.events.off('destroy', this.destroyBound);
    this.overlay.destroy();
    if (this.game.chaseTutorial === this) this.game.chaseTutorial = null;
  }
}