import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { ChaseTutorialOverlay } from './ChaseTutorialOverlay.js';

import {
  getHud,
  getPanel,
  menuTarget,
  npcTargets,
  hotelTargets,
  boardTargets
} from './ChaseTutorialTargets.js';

export function installChaseTutorial(game) {
  if (game.chaseTutorial) {
    return game.chaseTutorial;
  }

  const tutorial = new ChaseTutorial(game);
  game.chaseTutorial = tutorial;

  return tutorial;
}

class ChaseTutorial {
  constructor(game) {
    this.game = game;
    this.lastTick = 0;
    this.context = null;

    this.overlay = new ChaseTutorialOverlay(
      game,
      () => this.skipCurrentTutorial()
    );

    this.tickBound = time => {
      if (time - this.lastTick < 120) return;

      this.lastTick = time;
      this.tick();
    };

    game.events.on('poststep', this.tickBound);
    game.events.once('destroy', () => this.destroy());
  }

  get state() {
    return gameState.onboarding?.chase;
  }

  save() {
    requestAutosave();
  }

  ensureOnboarding() {
    if (
      !gameState.onboarding ||
      typeof gameState.onboarding !== 'object' ||
      Array.isArray(gameState.onboarding)
    ) {
      gameState.onboarding = {};
    }

    return gameState.onboarding;
  }

  ensureChaseState(scene) {
    const onboarding = this.ensureOnboarding();

    if (!onboarding.chase) {
      onboarding.chase = {
        version: 2,
        cityId: scene.cityId,
        step: 'npc',
        interviewed: [],
        completed: false,
        skipped: false,
        warrantOpened: false,
        warrantChanged: false,
        boardSeen: false,
        theoryIntroduced: false
      };

      this.save();
    }

    const state = onboarding.chase;

    if (state.version !== 2) {
      state.version = 2;
      state.interviewed = Array.isArray(state.interviewed)
        ? state.interviewed
        : [];

      state.warrantOpened ??= false;
      state.warrantChanged ??= false;
      state.boardSeen ??= false;
      state.theoryIntroduced ??= false;

      if (state.step === 'board_close') {
        state.step = 'theory';
      }

      this.save();
    }

    return state;
  }

  ensureArrestState() {
    const onboarding = this.ensureOnboarding();

    if (!onboarding.arrestSelection) {
      onboarding.arrestSelection = {
        version: 1,
        step: 'arrest',
        completed: false,
        skipped: false
      };

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

    Object.assign(this.state, {
      completed: true,
      skipped,
      step: 'finished'
    });

    this.save();
    this.overlay.hide();
  }

  finishArrest(skipped = false) {
    const state = this.ensureArrestState();

    Object.assign(state, {
      completed: true,
      skipped,
      step: 'finished'
    });

    this.save();
    this.overlay.hide();
  }

  skipCurrentTutorial() {
    if (this.context === 'arrest') {
      this.finishArrest(true);
      return;
    }

    if (this.context === 'chase') {
      this.finish(true);
    }
  }

  activeScene() {
    const scenes = this.game.scene.getScenes(true);

    const allowed = new Set([
      'CityScene',
      'LocationScene',
      'HotelScene',
      'ArrestSelectionScene'
    ]);

    const hudScenes = new Set([
      'PlayerHudScene',
      'UIScene',
      'NewsHud'
    ]);

    const foreignScene = scenes.some(scene => {
      const key = scene.sys.settings.key;

      return !allowed.has(key) && !hudScenes.has(key);
    });

    if (foreignScene) return null;

    return [...scenes]
      .reverse()
      .find(scene => allowed.has(scene.sys.settings.key)) || null;
  }

  syncWitnesses(scene) {
    if (
      scene.sys.settings.key !== 'CityScene' ||
      typeof scene.getEncounters !== 'function'
    ) {
      return;
    }

    const ids = new Set(this.state.interviewed);

    for (const entry of scene.getEncounters()) {
      const memory = gameState.encounterMemory?.[entry.id];

      if (entry.npcId && memory?.askedTopics?.length) {
        ids.add(entry.npcId);
      }
    }

    if (ids.size !== this.state.interviewed.length) {
      this.state.interviewed = [...ids];
      this.save();
    }
  }

  getTheoryElements(board) {
    const root = board?.boardApi?.board?.root;
    const boardApp = root?.closest?.('.crime-board-app');
    const host = boardApp?.parentElement;

    if (!host) {
      return {
        tab: null,
        panel: null,
        visible: false
      };
    }

    const tab = [...host.querySelectorAll('.ct-tabs button')]
      .find(button => button.textContent.trim() === 'Case Theory');

    const panel = host.querySelector('.ct-panel');

    return {
      tab,
      panel,
      visible: Boolean(
        panel &&
        !panel.hidden &&
        panel.getClientRects().length
      )
    };
  }

  renderBoardTutorial(board, count) {
    if (!board?.boardApi) {
      this.overlay.hide();
      return;
    }

    if (!this.state.boardSeen) {
      this.state.boardSeen = true;
      this.save();
    }

    const theory = this.getTheoryElements(board);

    if (this.state.theoryIntroduced) {
      this.overlay.render('return', count);
      return;
    }

    if (theory.visible) {
      this.step('theory');

      this.overlay.render('theory_edit', count, [], {
        nextLabel: 'Understood',
        onNext: () => {
          if (!this.state || this.state.completed) return;

          this.state.theoryIntroduced = true;
          this.step('return');
        }
      });

      return;
    }

    if (this.state.step === 'theory') {
      this.overlay.render(
        'theory_open',
        count,
        [theory.tab]
      );

      return;
    }

    this.overlay.render(
      'board_edit',
      count,
      [theory.tab],
      {
        nextLabel: 'Next',
        onNext: () => this.step('theory')
      }
    );
  }

  tickArrest(scene) {
    this.context = 'arrest';

    const state = this.ensureArrestState();

    if (
      state.completed ||
      scene.isLeaving ||
      scene.resultCommitted ||
      scene.selectionLocked ||
      scene.confirmOpen ||
      scene.zoomOverlay?.visible ||
      !scene.arrestButton ||
      !scene.displaySuspects?.length
    ) {
      this.overlay.hide();
      return;
    }

    if (state.step === 'arrest_theory') {
      this.overlay.render(
        'arrest_theory',
        null,
        [],
        {
          nextLabel: 'Review dossiers',
          onNext: () => this.finishArrest(false)
        }
      );

      return;
    }

    const targets = [
      scene.leftArrow,
      scene.rightArrow
    ].filter(target => (
      target &&
      typeof target.getBounds === 'function'
    ));

    this.overlay.render('arrest', null, targets, {
      nextLabel: 'Next',
      onNext: () => {
        state.step = 'arrest_theory';
        this.save();
      }
    });
  }

  tick() {
    const scene = this.activeScene();

    if (!scene || scene._cleanupDone) {
      this.context = null;
      this.overlay.hide();
      return;
    }

    const key = scene.sys.settings.key;

    if (key === 'ArrestSelectionScene') {
      this.tickArrest(scene);
      return;
    }

    this.context = 'chase';

    if (!this.state) {
      if (
        key !== 'CityScene' ||
        !scene.uiReady ||
        scene.isFinalShowdown ||
        scene.cityId === gameState.crimeCityId
      ) {
        this.overlay.hide();
        return;
      }

      this.ensureChaseState(scene);
    } else {
      this.ensureChaseState(scene);
    }

    const state = this.state;

    if (state.completed || state.skipped) {
      this.overlay.hide();
      return;
    }

    if (
      key === 'CityScene' &&
      scene.cityId !== state.cityId
    ) {
      this.finish(false);
      return;
    }

    if (
      scene.cityId !== state.cityId ||
      scene.isFinalShowdown ||
      scene.cityDebug?.enabled
    ) {
      this.overlay.hide();
      return;
    }

    const hud = getHud(this.game);

    if (
      !hud ||
      (
        key === 'CityScene' &&
        (
          !scene.uiReady ||
          scene.activePopup ||
          scene.isTransitioning
        )
      )
    ) {
      this.overlay.hide();
      return;
    }

    this.syncWitnesses(scene);

    const count = Math.min(3, state.interviewed.length);

    const warrant = getPanel(hud, 'warrantUI');
    const board = getPanel(hud, 'crimeBoardUI');
    const destinations = getPanel(hud, 'destinationsUI');

    const openPanels = hud.getOpenPanels()
      .filter(name => name !== 'playerMenu');

    if (
      openPanels.some(name => ![
        'warrantUI',
        'crimeBoardUI',
        'destinationsUI'
      ].includes(name))
    ) {
      this.overlay.hide();
      return;
    }

    if (
      state.step === 'npc' &&
      count > 0 &&
      !state.warrantChanged
    ) {
      this.step('warrant');
    }

    if (warrant?.isOpen) {
      if (state.step !== 'warrant') {
        this.overlay.hide();
        return;
      }

      if (!state.warrantOpened) {
        state.warrantOpened = true;
        this.save();
      }

      this.overlay.render(
        'warrant_edit',
        count,
        (warrant.traitValueTexts || [])
          .map(entry => entry.textObj)
          .filter(Boolean)
      );

      return;
    }

    if (
      state.step === 'warrant' &&
      state.warrantOpened &&
      gameState.arrestWarrantIssued
    ) {
      state.warrantChanged = true;
      this.step('hotel');
    }

    if (board?.isOpen) {
      if ([
        'hotel',
        'board',
        'theory',
        'return',
        'board_close'
      ].includes(state.step)) {
        this.renderBoardTutorial(board, count);
      } else {
        this.overlay.hide();
      }

      return;
    }

    if (
      state.step === 'return' &&
      key === 'CityScene'
    ) {
      this.step('npc');
    }

    if (key === 'LocationScene') {
      if (
        scene.entryBlocked ||
        scene.isFalseLead ||
        !scene.reputationAccess?.allowed ||
        !scene.npcController
      ) {
        this.overlay.hide();
        return;
      }

      const remaining = (scene.topicButtons || [])
        .filter(button => !scene.askedTopics?.has(button.topicId));

      this.overlay.render(
        remaining.length ? 'dialogue' : 'leave',
        count,
        remaining.length
          ? remaining.map(button => button.text)
          : [scene.leaveButton]
      );

      return;
    }

    if (key === 'HotelScene') {
      if (scene.isChoosingHotel) {
        this.overlay.render('booking', count);
        return;
      }

      if (scene.isHotelInteractionBlocked()) {
        this.overlay.hide();
        return;
      }

      if ([
        'hotel',
        'board',
        'theory',
        'board_close'
      ].includes(state.step)) {
        if (state.step === 'hotel') {
          this.step('board');
        }

        this.overlay.render(
          'board',
          count,
          boardTargets(scene)
        );

        return;
      }

      const exitTargets = (scene.hotspotUI?.zones || [])
        .filter(entry => (
          entry.cfg.id === 'hotel-window-exit'
        ))
        .map(entry => entry.zone);

      this.overlay.render('return', count, exitTargets);
      return;
    }

    if (key !== 'CityScene') {
      this.overlay.hide();
      return;
    }

    if (state.step === 'warrant') {
      this.overlay.render(
        'warrant',
        count,
        menuTarget(hud, 'warrant')
      );

      return;
    }

    if ([
      'hotel',
      'board',
      'theory',
      'board_close'
    ].includes(state.step)) {
      this.overlay.render(
        'hotel',
        count,
        hotelTargets(scene)
      );

      return;
    }

    if (count >= 3) {
      this.step('travel');

      this.overlay.render(
        destinations?.isOpen ? 'travel_choose' : 'travel',
        count,
        destinations?.isOpen
          ? []
          : menuTarget(hud, 'plane')
      );

      return;
    }

    if (destinations?.isOpen) {
      this.overlay.hide();
      return;
    }

    this.overlay.render(
      'npc',
      count,
      npcTargets(scene, state.interviewed)
    );
  }

  destroy() {
    this.game.events.off('poststep', this.tickBound);
    this.overlay.destroy();

    if (this.game.chaseTutorial === this) {
      this.game.chaseTutorial = null;
    }
  }
}