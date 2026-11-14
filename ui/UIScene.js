import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { BaseScene } from '../scenes/BaseScene.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { createHudStanding } from '../ui/HudStanding.js';

import {
  getAchievementList,
  hasAchievement
} from '../managers/AchievementManager.js';

import { moneyManager } from '../managers/MoneyManager.js';
import { getGameTimeManager } from '../managers/GameTimeManager.js';

import {
  progressionManager,
  PROGRESSION_CHANGED,
  LEVEL_UP
} from '../managers/ProgressionManager.js';

import {
  getCaseTimeRemaining,
  getTimeChangedPayload
} from '../CaseTimeHelper.js';

import {
  STAT_IDS,
  STAT_NAMES,
  getProfile,
  getEffectiveStats
} from '../ui/characterCreation/CharacterCreationData.js';

const ENERGY_CIRCUMFERENCE = 251.327;
const MONEY_EVENT = 'lost-artifacts:money-changed';
const PROGRESSION_STYLE_ID = 'ui-progression-styles';

const IS_LOCAL_DEV = [
  'localhost',
  '127.0.0.1',
  '[::1]'
].includes(window.location.hostname);

const HTML_FETCH_OPTIONS = {
  cache: IS_LOCAL_DEV ? 'no-store' : 'default'
};

const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC'
});

const FULL_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC'
});

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

const formatNumber = value =>
  NUMBER_FORMAT.format(
    Math.max(0, Math.floor(Number(value) || 0))
  );

export class UIScene extends BaseScene {
  constructor() {
    super({ key: 'UIScene', active: true });

    this.energyManager = null;
    this.currentGameDay = 1;
    this.missionDays = 4;

    this.startDate = {
      year: 1990,
      monthIndex: 3,
      day: 1
    };

    this.dom = {};
    this.hudStanding = null;

    this._energyLogTimer = null;
    this._warningTimer = null;
    this._zeroTimer = null;
    this._modalRefreshFrame = null;
    this._levelUpTimer = null;
    this._levelUpNotice = null;

    this.domAbortController = null;
    this.moneyChangeHandler = null;

    this._isDestroyed = false;
    this._htmlPromises = new Map();
    this._spendingSkillPoint = false;

    this.caseTimerInitialSeconds = null;

    this._energyHovered = false;
    this._energyFocused = false;
    this._energyTooltipSuppressed = false;
    this._energySnapshot = null;
  }

  async create() {
    super.create();

    this._isDestroyed = false;
    this._spendingSkillPoint = false;
    this.caseTimerInitialSeconds = null;

    this._resetEnergyTooltipState();
    this._energySnapshot = null;
    this._installProgressionStyles();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this._cleanup,
      this
    );

    this.energyManager = getEnergyManager();

    const loaded = await this._loadHudHtml();

    if (this._isDestroyed) return;

    if (!loaded) {
      console.error(
        '[UIScene] Could not load ui/hud.template.'
      );
      return;
    }

    this._cacheDomElements();
    this._removeDomListeners();

    this.hudStanding?.destroy();

    this.hudStanding = createHudStanding(
      this.dom.container,
      {
        showTooltip: content => this._showTooltip(content),
        hideTooltip: () => this._hideTooltip()
      }
    );

    this._bindEvents();
    this._setupButtonListeners();
    this._setupTooltipListeners();
    this._setupSkillPointListener();

    getGameTimeManager(this._readTimeFromGameState());

    this.updateTime(getTimeChangedPayload(gameState));
    this.refreshScoreHud();
    this.refreshMoneyHud();
    this.refreshXpHud();
    this.updateEnergy();
    this.hudStanding?.refresh();

    this.moneyChangeHandler = event =>
      this.refreshMoneyHud(event.detail?.state);

    window.addEventListener(
      MONEY_EVENT,
      this.moneyChangeHandler
    );
  }

  _readTimeFromGameState() {
    return {
      day: gameState.currentDay || gameState.day || 1,
      hour: gameState.currentHour ?? gameState.hour ?? 8,
      minute:
        gameState.currentMinute ?? gameState.minute ?? 0,
      partOfDay:
        gameState.currentPartOfDay ||
        gameState.partOfDay ||
        __dialogueText("ui/UIScene.js", "t_e9376a281aac57bb78e2")
    };
  }

  _removeDomListeners() {
    this.domAbortController?.abort();
    this.domAbortController = new AbortController();
  }

  getDomListenerOptions() {
    return {
      signal: this.domAbortController.signal
    };
  }

  _cacheDomElements() {
    const container =
      document.getElementById('hud-container');

    this.dom = {
      container,

      clockTarget: document.getElementById('clock-target'),
      dateTarget: document.getElementById('date-target'),
      deadlineTarget: document.getElementById('deadline-target'),
      scoreTarget: document.getElementById('score-target'),
      xpTarget: document.getElementById('xp-target'),
      cashTarget: document.getElementById('cash-target'),

      time: document.getElementById('clock-time'),
      partOfDay: document.getElementById('clock-part'),
      month: document.getElementById('date-month'),
      day: document.getElementById('date-day'),

      deadlineValue:
        document.getElementById('deadline-value'),

      deadlineProgress:
        document.getElementById('deadline-progress'),

      energyTarget:
        document.getElementById('energy-target'),

      energyWrapper:
        container?.querySelector(__dialogueText("ui/UIScene.js", "t_2ca2d1c09cbe57e3bf6e")) || null,

      energyFill:
        document.getElementById('energy-fill'),

      energyBolt:
        document.getElementById('energy-bolt'),

      score: document.getElementById('hud-score'),
      xp: document.getElementById('hud-xp'),
      cash: document.getElementById('hud-cash'),

      tooltipBg:
        document.getElementById('hud-tooltip'),

      tooltipTitle:
        document.getElementById('hud-tooltip-title'),

      tooltipText:
        document.getElementById('hud-tooltip-text'),

      energyLogBg:
        document.getElementById('hud-energy-log'),

      energyLogText:
        document.getElementById('hud-energy-log-text')
    };
  }

  _bindEvents() {
    this.onBus('timeChanged', this.updateTime);
    this.onBus('scoreChanged', this.updateScore);
    this.onBus('cashChanged', this.updateCash);

    this.onBus(
      'agentStatsChanged',
      this._queueModalRefresh
    );

    this.onBus(
      'character-created',
      this._onCharacterCreated
    );

    this.onBus(
      PROGRESSION_CHANGED,
      this._queueModalRefresh
    );

    this.onBus(PROGRESSION_CHANGED, this.refreshXpHud);

    this.onBus(LEVEL_UP, this._showLevelUpNotice);
    this.onBus('gameOver', this._showGameOver);

    this.onBus(
      'energyInitialized',
      this._onEnergyChanged
    );

    this.onBus('energyChanged', this._onEnergyChanged);
    this.onBus('energyWarning', this._onEnergyWarning);
    this.onBus('energyZero', this._onEnergyZero);

    this.onBus('showHUD', this.showHUD);
    this.onBus('hideHUD', this.hideHUD);
  }

  _onCharacterCreated() {
    this._clearLevelUpNotice();
    this._queueModalRefresh();
    this.refreshXpHud();
  }

  _cleanup() {
    this._isDestroyed = true;

    this._resetEnergyTooltipState();
    this._hideTooltip();
    this._setEnergyLogVisible(false);

    this._energySnapshot = null;

    this.hudStanding?.destroy();
    this.hudStanding = null;

    clearTimeout(this._energyLogTimer);
    clearTimeout(this._warningTimer);
    clearTimeout(this._zeroTimer);

    this._energyLogTimer = null;
    this._warningTimer = null;
    this._zeroTimer = null;

    this._clearLevelUpNotice();

    if (this._modalRefreshFrame !== null) {
      cancelAnimationFrame(this._modalRefreshFrame);
      this._modalRefreshFrame = null;
    }

    if (this.moneyChangeHandler) {
      window.removeEventListener(
        MONEY_EVENT,
        this.moneyChangeHandler
      );

      this.moneyChangeHandler = null;
    }

    this.domAbortController?.abort();
    this.domAbortController = null;

    this._htmlPromises.clear();
    this.dom = {};
    this.caseTimerInitialSeconds = null;
  }

  _setDomText(element, value) {
    if (!element) return;

    const text = String(value);

    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  _setDomStyle(element, property, value) {
    if (element && element.style[property] !== value) {
      element.style[property] = value;
    }
  }

  showHUD() {
    if (this.dom.container) {
      this.dom.container.style.display = 'block';
    }

    this.updateTime(getTimeChangedPayload(gameState));
    this.refreshScoreHud();
    this.refreshMoneyHud();
    this.refreshXpHud();
    this.updateEnergy();
    this.hudStanding?.refresh();
    this._queueModalRefresh();
  }

  hideHUD() {
    this._resetEnergyTooltipState();
    this._hideTooltip();
    this._setEnergyLogVisible(false);
    this._clearLevelUpNotice();

    if (this.dom.container) {
      this.dom.container.style.display = 'none';
    }
  }

  _setupButtonListeners() {
    const options = this.getDomListenerOptions();

    const bindButton = (button, handler) => {
      if (!(button instanceof HTMLElement)) return;

      button.addEventListener(
        'click',
        async event => {
          event.preventDefault();
          event.stopPropagation();

          try {
            await handler();
          } catch (error) {
            console.error(
              '[UIScene] HUD button failed:',
              error
            );
          }
        },
        options
      );
    };

    bindButton(
      document.getElementById('btn-hud-expand'),
      () => {
        this.dom.container?.classList.remove('collapsed');
        this.hudStanding?.refresh();
      }
    );

    bindButton(
      document.getElementById('btn-hud-collapse'),
      () => {
        this._resetEnergyTooltipState();
        this._hideTooltip();
        this._setEnergyLogVisible(false);

        this.dom.container?.classList.add('collapsed');
      }
    );

    bindButton(
      document.getElementById('btn-profile'),
      () => this.openAgentModal()
    );

    bindButton(
      document.getElementById('btn-player'),
      () => this.openProfileModal()
    );

    bindButton(
      document.getElementById('btn-settings'),
      () => this.openSettings()
    );

    this.dom.energyTarget?.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();
        this._toggleEnergyLog();
      },
      options
    );
  }

  _setupSkillPointListener() {
    document.addEventListener(
      'click',
      event => {
        const target = event.target;

        if (!(target instanceof Element)) return;

        const button = target.closest(
          __dialogueText("ui/UIScene.js", "t_1cdd68cb0d766cbce2f4")
        );

        if (!(button instanceof HTMLButtonElement)) return;

        event.preventDefault();
        event.stopPropagation();

        if (
          this._isDestroyed ||
          this._spendingSkillPoint ||
          button.disabled
        ) {
          return;
        }

        const modal = button.closest('#profile-modal');

        if (!this._isModalOpen(modal)) return;

        this._spendingSkillPoint = true;
        button.disabled = true;

        try {
          const result = progressionManager.spendPoint(
            button.dataset.progressionStat
          );

          if (!result.success) {
            this._setProgressionMessage(
              modal,
              this._getSkillPointError(result.reason),
              true
            );

            this._renderProfileStats(modal);
            return;
          }

          this._populateProfileModalData(modal);

          this._setProgressionMessage(
            modal,
            `${STAT_NAMES[result.statId]}${__dialogueText("ui/UIScene.js", "t_4d50f073d001891cd6a6")}${
              result.effectiveStats[result.statId]
            }${__dialogueText("ui/UIScene.js", "t_cdb4ee2aea69cc6a8333")}`,
            false
          );

          const nextButton = modal.querySelector(
            `button[data-progression-stat="${result.statId}"]`
          );

          if (
            nextButton instanceof HTMLButtonElement &&
            !nextButton.disabled
          ) {
            nextButton.focus({ preventScroll: true });
          } else {
            modal.querySelector(
              '[data-progression-summary]'
            )?.focus({ preventScroll: true });
          }
        } catch (error) {
          console.error(
            '[UIScene] Could not spend skill point:',
            error
          );

          this._setProgressionMessage(
            modal,
            __dialogueText("ui/UIScene.js", "t_0944cbbd10db0e7be236"),
            true
          );

          this._renderProfileStats(modal);
        } finally {
          this._spendingSkillPoint = false;
        }
      },
      this.getDomListenerOptions()
    );
  }

  _getSkillPointError(reason) {
    const messages = {
      no_skill_points: __dialogueText("ui/UIScene.js", "t_448f9f20d622ab37e1ca"),
      unknown_stat: __dialogueText("ui/UIScene.js", "t_9b76fb8f5a6769c15682"),
      character_stats_missing:
        __dialogueText("ui/UIScene.js", "t_4de6ed55b8d62da32cf7"),
      stat_limit: __dialogueText("ui/UIScene.js", "t_e1bd3c8af40b079bb805")
    };

    return messages[reason] || __dialogueText("ui/UIScene.js", "t_9c9cf9e0df3d6cb7d87a");
  }

  _readProgressionSummary() {
    try {
      return progressionManager.getSummary();
    } catch (error) {
      console.error(
        '[UIScene] Could not read progression:',
        error
      );

      return null;
    }
  }

  _installProgressionStyles() {
    if (document.getElementById(PROGRESSION_STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = PROGRESSION_STYLE_ID;

    style.textContent = `${__dialogueText("ui/UIScene.js", "t_a3705d0c70746913c715")}`;

    document.head.appendChild(style);
  }

  _ensureProgressionSection(modal) {
    let section = modal.querySelector(
      '[data-progression-summary]'
    );

    if (section instanceof HTMLElement) return section;

    const statsGrid = modal.querySelector('#profile-stats');

    if (!(statsGrid instanceof HTMLElement)) return null;

    section = document.createElement('section');
    section.className = 'ui-progression';
    section.dataset.progressionSummary = 'true';
    section.tabIndex = -1;
    section.setAttribute('aria-label', __dialogueText("ui/UIScene.js", "t_e83f54d473c2ba805213"));

    section.innerHTML = `${__dialogueText("ui/UIScene.js", "t_55556983602d8863a846")}`;

    statsGrid.insertAdjacentElement('beforebegin', section);

    return section;
  }

  _renderProgression(modal) {
    const section = this._ensureProgressionSection(modal);

    if (!section) return;

    const summary = this._readProgressionSummary();

    section.hidden = false;

    if (!summary) {
      this._setHtmlText(
        section,
        '[data-progression-level]',
        __dialogueText("ui/UIScene.js", "t_f237510157f5a488487c")
      );

      this._setHtmlText(
        section,
        __dialogueText("ui/UIScene.js", "t_aca16f0360cc1f3efdeb"),
        ''
      );

      this._setHtmlText(
        section,
        '[data-progression-points]',
        __dialogueText("ui/UIScene.js", "t_5a8af88edf434fc0ab87")
      );

      const bar = section.querySelector('[data-progression-bar]');
      if (bar) bar.hidden = true;

      return;
    }

    this._setHtmlText(
      section,
      '[data-progression-level]',
      `${__dialogueText("ui/UIScene.js", "t_6466f20e2210f3cc107d")}${summary.level}`
    );

    this._setHtmlText(
      section,
      '[data-progression-total]',
      `${formatNumber(summary.totalXP)}${__dialogueText("ui/UIScene.js", "t_a320e95964ab10d8b38b")}`
    );

    const bar = section.querySelector('[data-progression-bar]');
    const fill = section.querySelector('[data-progression-fill]');

    const percent = Math.max(
      0,
      Math.min(100, Math.round(summary.progress * 100))
    );

    if (bar) {
      bar.hidden = false;
      bar.setAttribute('aria-valuenow', String(percent));

      bar.setAttribute(
        'aria-valuetext',
        summary.isMaxLevel
          ? __dialogueText("ui/UIScene.js", "t_ab738e7625797d81498c")
          : `${summary.currentLevelXP}${__dialogueText("ui/UIScene.js", "t_a4282e4b2298b90b56f7")}${summary.requiredXP}${__dialogueText("ui/UIScene.js", "t_42e2aa5470e71f56e5a5")}`
      );
    }

    if (fill instanceof HTMLElement) {
      fill.style.width = `${percent}%`;
    }

    this._setHtmlText(
      section,
      '[data-progression-caption]',
      summary.isMaxLevel
        ? __dialogueText("ui/UIScene.js", "t_e10e18271bf5a8bd2e3b")
        : `${formatNumber(summary.currentLevelXP)}${__dialogueText("ui/UIScene.js", "t_005e1574a2b5c8163046")}${
            formatNumber(summary.requiredXP)
          }${__dialogueText("ui/UIScene.js", "t_329c75838b2aa07a7636")}${formatNumber(summary.xpToNextLevel)}${__dialogueText("ui/UIScene.js", "t_429fbc3cecdc256c9a0c")}`
    );

    const points = section.querySelector(
      '[data-progression-points]'
    );

    if (points) {
      points.textContent =
        summary.availablePoints > 0
          ? `${summary.availablePoints}${__dialogueText("ui/UIScene.js", "t_7d5c39c2d6cacb815d7c")}${
              summary.availablePoints === 1 ? 'point' : 'points'
            }${__dialogueText("ui/UIScene.js", "t_c1bc7f984634c5d32f06")}`
          : __dialogueText("ui/UIScene.js", "t_6d0e91f4cbf23e57d920");

      points.classList.toggle(
        'has-points',
        summary.availablePoints > 0
      );
    }
  }

  _setProgressionMessage(modal, text, isError = false) {
    const message = modal?.querySelector(
      '[data-progression-message]'
    );

    if (!(message instanceof HTMLElement)) return;

    message.textContent = text;
    message.classList.toggle('is-error', isError);
  }

  _showLevelUpNotice(data = {}) {
    if (this._isDestroyed) return;

    const summary = data.after || this._readProgressionSummary();

    if (!summary) return;

    this._clearLevelUpNotice();

    const notice = document.createElement('div');
    notice.className = 'ui-level-up-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');

    const title = document.createElement('p');
    title.className = 'ui-level-up-notice-title';
    title.textContent = `${__dialogueText("ui/UIScene.js", "t_6466f20e2210f3cc107d")}${summary.level}`;

    const message = document.createElement('p');
    message.className = 'ui-level-up-notice-text';
    message.textContent =
      __dialogueText("ui/UIScene.js", "t_403a5c2f1f2be4cef9ba");

    const points = document.createElement('p');
    points.className = 'ui-level-up-notice-text';

    const gainedPoints = Math.max(
      1,
      Math.floor(Number(data.gainedPoints) || 1)
    );

    points.textContent =
      `${gainedPoints}${__dialogueText("ui/UIScene.js", "t_7d5c39c2d6cacb815d7c")}${
        gainedPoints === 1 ? 'point' : 'points'
      }${__dialogueText("ui/UIScene.js", "t_cc6c16a434cd36239eb4")}`;

    notice.append(title, message, points);
    document.body.appendChild(notice);

    this._levelUpNotice = notice;

    this._levelUpTimer = setTimeout(() => {
      this._clearLevelUpNotice();
    }, 6500);

    this._queueModalRefresh();
  }

  _clearLevelUpNotice() {
    clearTimeout(this._levelUpTimer);
    this._levelUpTimer = null;

    this._levelUpNotice?.remove();
    this._levelUpNotice = null;
  }

  _setupTooltipListeners() {
    const options = this.getDomListenerOptions();

    // Tooltipy podpięte pod całe bloki (#score-target itd.),
    // a nie tylko pod małe <span> z wartością.
    const bindings = [
      {
        element: this.dom.clockTarget || this.dom.time,
        getContent: () => this._getClockTooltip()
      },
      {
        element:
          this.dom.dateTarget || this.dom.month,
        getContent: () => this._getDateTooltip()
      },
      {
        element:
          this.dom.deadlineTarget || this.dom.deadlineValue,
        getContent: () => this._getDeadlineTooltip()
      },
      {
        element: this.dom.scoreTarget || this.dom.score,
        getContent: () => [
          'SCORE',
          `${formatNumber(gameState.score)}${__dialogueText("ui/UIScene.js", "t_d317b64a5b36e260196b")}`,
          __dialogueText("ui/UIScene.js", "t_f0b31d2f8e1c73209e50")
        ].join('\n')
      },
      {
        element: this.dom.xpTarget || this.dom.xp,
        getContent: () => this._getXpTooltip()
      },
      {
        element: this.dom.cashTarget || this.dom.cash,
        getContent: () => this._getCashTooltip()
      }
    ];

    bindings.forEach(({ element, getContent }) => {
      if (!(element instanceof HTMLElement)) return;

      const show = () => {
        if (!this.dom.container?.classList.contains('collapsed')) {
          this._showTooltip(getContent());
        }
      };

      element.addEventListener('mouseenter', show, options);

      element.addEventListener(
        'mouseleave',
        () => this._hideTooltip(),
        options
      );

      element.addEventListener('focus', show, options);

      element.addEventListener(
        'blur',
        () => this._hideTooltip(),
        options
      );
    });

    this._setupEnergyTooltipListeners(options);
  }

  _setupEnergyTooltipListeners(options) {
    const target = this.dom.energyTarget;

    if (!(target instanceof HTMLElement)) return;

    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '0');
    }

    target.setAttribute('role', 'meter');
    target.setAttribute('aria-label', __dialogueText("ui/UIScene.js", "t_a0b354577d6472224061"));
    target.setAttribute('aria-valuemin', '0');
    target.setAttribute('aria-valuemax', '100');

    target.addEventListener(
      'mouseenter',
      () => {
        this._energyHovered = true;
        this._energyTooltipSuppressed = false;
        this._showEnergyTooltip();
      },
      options
    );

    target.addEventListener(
      'mouseleave',
      () => {
        this._energyHovered = false;

        if (!this._energyFocused) {
          this._energyTooltipSuppressed = false;
          this._hideTooltip();
        }
      },
      options
    );

    target.addEventListener(
      'focus',
      () => {
        this._energyFocused = true;
        this._energyTooltipSuppressed = false;
        this._showEnergyTooltip();
      },
      options
    );

    target.addEventListener(
      'blur',
      () => {
        this._energyFocused = false;

        if (!this._energyHovered) {
          this._energyTooltipSuppressed = false;
          this._hideTooltip();
        }
      },
      options
    );

    target.addEventListener(
      'keydown',
      event => {
        if (event.key === __dialogueText("ui/UIScene.js", "t_dc8659db6d416dc32fca") || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          this._toggleEnergyLog();
        } else if (event.key === __dialogueText("ui/UIScene.js", "t_037c968467aa3fd7c059")) {
          event.preventDefault();
          event.stopPropagation();

          this._energyTooltipSuppressed = true;
          this._setEnergyLogVisible(false);
          this._hideTooltip();
        }
      },
      options
    );
  }

  _resetEnergyTooltipState() {
    this._energyHovered = false;
    this._energyFocused = false;
    this._energyTooltipSuppressed = false;
  }

  _isEnergyTooltipActive() {
    return (
      (this._energyHovered || this._energyFocused) &&
      !this._energyTooltipSuppressed
    );
  }

  _showEnergyTooltip() {
    if (
      this._isDestroyed ||
      !this._isEnergyTooltipActive() ||
      !this.dom.container ||
      this.dom.container.style.display === 'none' ||
      this.dom.container.classList.contains('collapsed')
    ) {
      return;
    }

    clearTimeout(this._energyLogTimer);
    this._energyLogTimer = null;

    this._setEnergyLogVisible(false);
    this._showTooltip(this._getEnergyTooltip());
  }

  _getCashTooltip() {
    const {
      cash,
      agencyBudget,
      agencyDebt
    } = moneyManager.getState();

    return [
      `${__dialogueText("ui/UIScene.js", "t_cb0fd9c4330cd050bc89")}${cash}`,
      `${__dialogueText("ui/UIScene.js", "t_eb4223a04f74d59bdd86")}${agencyBudget}`,
      agencyDebt > 0
        ? `${__dialogueText("ui/UIScene.js", "t_43565ea0e4608f0bd9fe")}${agencyDebt}`
        : __dialogueText("ui/UIScene.js", "t_7e055b0e317876dfce45"),
      __dialogueText("ui/UIScene.js", "t_32e638aac98bb8494637")
    ].join('\n');
  }

  _getXpTooltip() {
    const summary = this._readProgressionSummary();

    if (!summary) {
      return [
        'EXPERIENCE',
        __dialogueText("ui/UIScene.js", "t_5a8af88edf434fc0ab87")
      ].join('\n');
    }

    const points = summary.availablePoints;

    return [
      `${__dialogueText("ui/UIScene.js", "t_6531d947ed509d92c037")}${summary.level}`,
      `${formatNumber(summary.totalXP)}${__dialogueText("ui/UIScene.js", "t_6088ccbb048740fc41bc")}`,
      summary.isMaxLevel
        ? __dialogueText("ui/UIScene.js", "t_e10e18271bf5a8bd2e3b")
        : `${formatNumber(summary.xpToNextLevel)}${__dialogueText("ui/UIScene.js", "t_202a591342c2ad5a2316")}`,
      points > 0
        ? `${points}${__dialogueText("ui/UIScene.js", "t_b8577c0ec279ab0fdc52")}${
            points === 1 ? 'point' : 'points'
          }${__dialogueText("ui/UIScene.js", "t_a4d26645b682c23f57d6")}`
        : __dialogueText("ui/UIScene.js", "t_5b5ca951128001a96d9e")
    ].join('\n');
  }

  updateTime(data = {}) {
    const snapshot = this._readTimeFromGameState();

    this.currentGameDay = Math.max(
      1,
      Math.floor(Number(data.day ?? snapshot.day) || 1)
    );

    const hour = Phaser.Math.Clamp(
      Math.floor(Number(data.hour ?? snapshot.hour) || 0),
      0,
      23
    );

    const minute = Phaser.Math.Clamp(
      Math.floor(Number(data.minute ?? snapshot.minute) || 0),
      0,
      59
    );

    this._setDomText(
      this.dom.time,
      `${String(hour).padStart(2, '0')}:${
        String(minute).padStart(2, '0')
      }`
    );

    this._setDomText(
      this.dom.partOfDay,
      String(data.partOfDay ?? snapshot.partOfDay).toUpperCase()
    );

    this._updateDateDisplay(this.currentGameDay);
    this.updateCaseDeadline(data);
  }

  updateCaseDeadline(data = {}) {
    const hasRemaining = Object.prototype.hasOwnProperty.call(
      data,
      'caseTimeRemaining'
    );

    const rawSeconds = hasRemaining
      ? data.caseTimeRemaining
      : getCaseTimeRemaining(gameState);

    const parsedSeconds = Number(rawSeconds);

    const remainingSeconds =
      rawSeconds != null && Number.isFinite(parsedSeconds)
        ? Math.max(0, Math.floor(parsedSeconds))
        : null;

    if (remainingSeconds === null) {
      this.caseTimerInitialSeconds = null;
      this._updateDeadlineDisplay(this.currentGameDay);
      return;
    }

    if (
      !Number.isFinite(this.caseTimerInitialSeconds) ||
      remainingSeconds > this.caseTimerInitialSeconds
    ) {
      this.caseTimerInitialSeconds = remainingSeconds;
    }

    const initialSeconds = Math.max(
      1,
      this.caseTimerInitialSeconds
    );

    const progress = Phaser.Math.Clamp(
      (remainingSeconds / initialSeconds) * 100,
      0,
      100
    );

    const color =
      remainingSeconds <= 3600
        ? '#ae2012'
        : remainingSeconds <= 43200
          ? '#ee9b00'
          : '#4caf50';

    this._setDomText(
      this.dom.deadlineValue,
      this._formatCaseDeadline(remainingSeconds)
    );

    this._setDomStyle(this.dom.deadlineValue, 'color', color);

    this._setDomStyle(
      this.dom.deadlineProgress,
      'width',
      `${progress}%`
    );

    this._setDomStyle(
      this.dom.deadlineProgress,
      'backgroundColor',
      color
    );

    this._setDeadlineUrgency(
      remainingSeconds <= 3600
        ? 'critical'
        : remainingSeconds <= 43200
          ? 'warn'
          : __dialogueText("ui/UIScene.js", "t_2689367b205c16ce32ed")
    );
  }

  _setDeadlineUrgency(level) {
    const target = this.dom.deadlineTarget;

    if (target && target.dataset.urgency !== level) {
      target.dataset.urgency = level;
    }
  }

  _formatCaseDeadline(seconds) {
    const safeSeconds = Math.max(
      0,
      Math.floor(Number(seconds) || 0)
    );

    const days = Math.floor(safeSeconds / 86400);
    const hours = Math.floor((safeSeconds % 86400) / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);

    if (days > 0) {
      return `${days}${__dialogueText("ui/UIScene.js", "t_f0a768c6fe5fff5a5d19")}${String(hours).padStart(2, '0')}${__dialogueText("ui/UIScene.js", "t_44bd7ae60f478fae1061")}`;
    }

    if (hours > 0) {
      return `${hours}${__dialogueText("ui/UIScene.js", "t_ef666e3d289af8ddae6f")}${String(minutes).padStart(2, '0')}${__dialogueText("ui/UIScene.js", "t_08f271887ce94707da82")}`;
    }

    return `${minutes}M`;
  }

  _getCaseDeadlineSeconds() {
    return getCaseTimeRemaining(gameState);
  }

  _calculateDate(gameDay) {
    const { year, monthIndex, day } = this.startDate;

    const safeDay = Math.max(
      1,
      Math.floor(Number(gameDay) || 1)
    );

    return new Date(
      Date.UTC(year, monthIndex, day + safeDay - 1)
    );
  }

  _updateDateDisplay(gameDay) {
    const date = this._calculateDate(gameDay);

    this._setDomText(
      this.dom.month,
      MONTH_FORMAT.format(date).toUpperCase()
    );

    this._setDomText(
      this.dom.day,
      String(date.getUTCDate()).padStart(2, '0')
    );
  }

  _updateDeadlineDisplay(gameDay) {
    const daysLeft = Math.max(
      0,
      this.missionDays - gameDay + 1
    );

    const progress = Phaser.Math.Clamp(
      (daysLeft / this.missionDays) * 100,
      0,
      100
    );

    const color =
      daysLeft <= 1
        ? '#ae2012'
        : daysLeft <= 2
          ? '#ee9b00'
          : '#4caf50';

    this._setDomText(this.dom.deadlineValue, `${daysLeft}D`);
    this._setDomStyle(this.dom.deadlineValue, 'color', color);

    this._setDomStyle(
      this.dom.deadlineProgress,
      'width',
      `${progress}%`
    );

    this._setDomStyle(
      this.dom.deadlineProgress,
      'backgroundColor',
      color
    );

    this._setDeadlineUrgency(
      daysLeft <= 1
        ? 'critical'
        : daysLeft <= 2
          ? 'warn'
          : __dialogueText("ui/UIScene.js", "t_2689367b205c16ce32ed")
    );
  }

  _onEnergyChanged(data = {}) {
    this.updateEnergy(data);

    if (data.lastChange) {
      this._showEnergyLogTemporarily();
    }
  }

  _readEnergySnapshot(data = {}) {
    const rawCurrent = Number(
      data.current ??
      data.energy ??
      this.energyManager?.getCurrentEnergy()
    );

    const rawMaximum = Number(
      data.max ??
      this.energyManager?.getMaxEnergy?.() ??
      this.energyManager?.maxEnergy
    );

    const current = Number.isFinite(rawCurrent)
      ? Math.max(0, rawCurrent)
      : 0;

    const maximum =
      Number.isFinite(rawMaximum) && rawMaximum > 0
        ? rawMaximum
        : 100;

    const fraction = Phaser.Math.Clamp(
      current / maximum,
      0,
      1
    );

    return {
      current,
      maximum,
      fraction,
      percent: Math.round(fraction * 100)
    };
  }

  updateEnergy(data = {}) {
    const snapshot = this._readEnergySnapshot(data);
    this._energySnapshot = snapshot;

    const { fraction, percent } = snapshot;

    const color = this._colorToHex(
      data.color ?? this.energyManager?.getEnergyColor()
    );

    const offset = ENERGY_CIRCUMFERENCE * (1 - fraction);

    if (this.dom.energyFill) {
      this.dom.energyFill.style.strokeDasharray =
        String(ENERGY_CIRCUMFERENCE);

      this.dom.energyFill.style.strokeDashoffset =
        String(offset);

      this.dom.energyFill.style.stroke = color;
    }

    if (this.dom.energyBolt) {
      this.dom.energyBolt.style.fill = color;
    }

    // Zwinięty HUD (przycisk #btn-hud-expand) korzysta z tych zmiennych.
    // Zastępuje to 101 reguł :has() z dawnego hud.template.
    const container = this.dom.container;

    if (container) {
      container.style.setProperty(
        '--hud-energy-level',
        `${percent}%`
      );

      container.style.setProperty('--hud-energy-color', color);

      container.style.setProperty(
        '--hud-energy-label',
        `"${percent}%"`
      );
    }

    this.dom.energyWrapper?.classList.toggle(
      'low-energy',
      fraction <= 0.2
    );

    this.dom.energyTarget?.setAttribute(
      'aria-valuenow',
      String(percent)
    );

    this.dom.energyTarget?.setAttribute(
      'aria-valuetext',
      `${percent}${__dialogueText("ui/UIScene.js", "t_8e5d75479f65b7333e86")}`
    );

    if (this._isEnergyTooltipActive()) {
      this._showEnergyTooltip();
    }
  }

  _onEnergyWarning() {
    const wrapper = this.dom.energyWrapper;
    if (!wrapper) return;

    wrapper.classList.remove('flash-warning');
    void wrapper.offsetWidth;
    wrapper.classList.add('flash-warning');

    clearTimeout(this._warningTimer);

    this._warningTimer = setTimeout(
      () => wrapper.classList.remove('flash-warning'),
      1000
    );
  }

  _onEnergyZero() {
    const wrapper = this.dom.energyWrapper;
    if (!wrapper) return;

    wrapper.classList.remove('shake-zero');
    void wrapper.offsetWidth;
    wrapper.classList.add('shake-zero');

    clearTimeout(this._zeroTimer);

    this._zeroTimer = setTimeout(
      () => wrapper.classList.remove('shake-zero'),
      550
    );
  }

  _showTooltip(content) {
    const isEnergyLogOpen =
      this.dom.energyLogBg?.classList.contains('visible');

    if (!content || !this.dom.tooltipBg || isEnergyLogOpen) {
      return;
    }

    // Pierwsza linia = tytuł (osobny styl), reszta = treść.
    const lines = String(content).split('\n');
    const title = lines.shift() || '';
    const body = lines.join('\n');

    if (this.dom.tooltipTitle) {
      this.dom.tooltipTitle.textContent = body ? title : '';

      if (this.dom.tooltipText) {
        this.dom.tooltipText.textContent = body || title;
      }
    } else if (this.dom.tooltipText) {
      this.dom.tooltipText.textContent = content;
    }

    this.dom.tooltipBg.classList.add('visible');
  }

  _hideTooltip() {
    this.dom.tooltipBg?.classList.remove('visible');
  }

  _setEnergyLogVisible(visible) {
    if (!this.dom.energyLogBg) return;

    this._hideTooltip();

    this.dom.energyLogBg.classList.toggle(
      'visible',
      visible
    );

    if (visible) {
      this._updateEnergyLogText();
    }
  }

  _toggleEnergyLog() {
    clearTimeout(this._energyLogTimer);
    this._energyLogTimer = null;

    const isVisible =
      this.dom.energyLogBg?.classList.contains('visible');

    this._energyTooltipSuppressed = !isVisible;
    this._setEnergyLogVisible(!isVisible);

    if (isVisible && this._isEnergyTooltipActive()) {
      this._showEnergyTooltip();
    }
  }

  _showEnergyLogTemporarily() {
    clearTimeout(this._energyLogTimer);
    this._energyLogTimer = null;

    if (this._isEnergyTooltipActive()) {
      this._showEnergyTooltip();
      return;
    }

    this._setEnergyLogVisible(true);

    this._energyLogTimer = setTimeout(() => {
      this._setEnergyLogVisible(false);
      this._energyLogTimer = null;
    }, 4000);
  }

  _updateEnergyLogText() {
    if (!this.dom.energyLogText || !this.energyManager) {
      return;
    }

    const entries = this.energyManager
      .getEnergyLog()
      .slice(-5)
      .reverse()
      .map(entry => entry.label || __dialogueText("ui/UIScene.js", "t_be987d3c4a19256ef8b1"));

    this.dom.energyLogText.textContent = entries.length
      ? entries.join('\n')
      : __dialogueText("ui/UIScene.js", "t_1278d222cc725c16a94b");
  }

  _getClockTooltip() {
    return [
      'TIME',
      `${this.dom.time?.textContent || '--:--'} — ${
        this.dom.partOfDay?.textContent || ''
      }`,
      __dialogueText("ui/UIScene.js", "t_528c2861128f1754bb61")
    ].join('\n');
  }

  _getDateTooltip() {
    const label = FULL_DATE_FORMAT.format(
      this._calculateDate(this.currentGameDay)
    );

    return [
      __dialogueText("ui/UIScene.js", "t_783c7c3e305711f6c0d5"),
      label,
      `${__dialogueText("ui/UIScene.js", "t_df2441a485d20426bd94")}${this.currentGameDay}${__dialogueText("ui/UIScene.js", "t_6ae72d6cc40433b6523e")}`
    ].join('\n');
  }

  _getDeadlineTooltip() {
    const remainingSeconds = this._getCaseDeadlineSeconds();

    if (remainingSeconds !== null) {
      return [
        __dialogueText("ui/UIScene.js", "t_f58a763ebfea870c7263"),
        `${this._formatCaseDeadline(remainingSeconds)}${__dialogueText("ui/UIScene.js", "t_e0b952f35ba855cc33ab")}`,
        __dialogueText("ui/UIScene.js", "t_33534a24d6fcd44f1466"),
        __dialogueText("ui/UIScene.js", "t_db598d033c38a3bc467d")
      ].join('\n');
    }

    const daysLeft = Math.max(
      0,
      this.missionDays - this.currentGameDay + 1
    );

    return [
      __dialogueText("ui/UIScene.js", "t_f58a763ebfea870c7263"),
      `${daysLeft}${__dialogueText("ui/UIScene.js", "t_4b6a5d3d63b22f032e31")}${daysLeft === 1 ? '' : 's'}${__dialogueText("ui/UIScene.js", "t_e0b952f35ba855cc33ab")}`,
      __dialogueText("ui/UIScene.js", "t_fe045f3dc1eddac6910f")
    ].join('\n');
  }

  _getEnergyTooltip() {
    const manager = this.energyManager;

    if (!manager) {
      return __dialogueText("ui/UIScene.js", "t_b44d76d3ed187cb35669");
    }

    const { percent } =
      this._energySnapshot || this._readEnergySnapshot();

    const last = manager.lastEnergyChange?.label;

    return [
      `${__dialogueText("ui/UIScene.js", "t_be89bf96a7d4a637280e")}${percent}${__dialogueText("ui/UIScene.js", "t_bbf3f11cb5b43e700273")}`,
      `${__dialogueText("ui/UIScene.js", "t_b38c2113d660280ef051")}${String(manager.getEnergyStatus()).toUpperCase()}`,
      manager.getEnergyTooltip(),
      last
        ? `${__dialogueText("ui/UIScene.js", "t_d7e6ea5d1c3ed78de73a")}${last}`
        : __dialogueText("ui/UIScene.js", "t_6b7649dbc0268fcab724")
    ].join('\n');
  }

  refreshScoreHud() {
    this._renderScore(gameState.score);
  }

  updateScore(data) {
    const rawScore =
      typeof data === 'object' ? data?.total : data;

    this._renderScore(rawScore ?? gameState.score);
    this._queueModalRefresh();
  }

  _renderScore(value) {
    if (this.dom.score) {
      this.dom.score.textContent = formatNumber(value);
    }
  }

  refreshXpHud() {
    if (this._isDestroyed || !this.dom.xp) return;

    const summary = this._readProgressionSummary();

    this._setDomText(
      this.dom.xp,
      formatNumber(summary?.totalXP ?? 0)
    );
  }

  updateCash(data) {
    const rawCash =
      typeof data === 'object'
        ? data?.total ?? data?.cash
        : data;

    const cash = rawCash ?? moneyManager.getState().cash;

    if (this.dom.cash) {
      this.dom.cash.textContent = `$${formatNumber(cash)}`;
    }
  }

  refreshMoneyHud(state = moneyManager.getState()) {
    this.updateCash(state?.cash);
  }

  async openSettings() {
    if (this.isSceneActive('SettingsScene')) {
      this.scene.bringToTop('SettingsScene');
      return;
    }

    const opened = await this.launchOverlay('SettingsScene');

    if (opened && !this._isDestroyed) {
      this.bringSceneToTopIfActive('SettingsScene');
    }
  }

  async openProfileModal() {
    const modal = await this._loadHtmlModal(
      __dialogueText("ui/UIScene.js", "t_f32cee85e87bd5c9da57"),
      'profile-modal',
      'btn-close-profile'
    );

    if (!modal || this._isDestroyed) return;

    this._populateProfileModalData(modal);
    this._setProgressionMessage(modal, '');
    modal.style.display = 'flex';
  }

  async openAgentModal() {
    const modal = await this._loadHtmlModal(
      __dialogueText("ui/UIScene.js", "t_d366d1c0b4e883df86ca"),
      'agent-modal',
      'btn-close-agent'
    );

    if (!modal || this._isDestroyed) return;

    this._populateAgentModalData(modal);
    modal.style.display = 'flex';
  }

  async _fetchHtmlElement(url, selector) {
    const cacheKey = `${url}|${selector}`;

    if (this._htmlPromises.has(cacheKey)) {
      return this._htmlPromises.get(cacheKey);
    }

    const promise = (async () => {
      try {
        const response = await fetch(url, HTML_FETCH_OPTIONS);

        if (!response.ok) {
          throw new Error(
            `Could not load ${url}: HTTP ${response.status}`
          );
        }

        const template = document.createElement('template');

        template.innerHTML = (await response.text()).trim();

        const element =
          template.content.querySelector(selector);

        if (!(element instanceof HTMLElement)) {
          throw new Error(`Missing ${selector} inside ${url}`);
        }

        return element;
      } catch (error) {
        console.error(
          '[UIScene] HTML load error:',
          { url, selector, error }
        );

        return null;
      } finally {
        this._htmlPromises.delete(cacheKey);
      }
    })();

    this._htmlPromises.set(cacheKey, promise);

    return promise;
  }

  async _loadHtmlModal(fileName, modalId, closeButtonId) {
    let modal = document.getElementById(modalId);

    if (!(modal instanceof HTMLElement)) {
      const fetched = await this._fetchHtmlElement(
        fileName,
        `#${modalId}`
      );

      if (this._isDestroyed) return null;

      modal = document.getElementById(modalId);

      if (!(modal instanceof HTMLElement)) {
        if (!fetched) return null;

        document.body.appendChild(fetched);
        modal = fetched;
      }
    }

    this._forceModalAboveGame(modal);
    this._setupModalEvents(modal, closeButtonId);

    return modal;
  }

  _forceModalAboveGame(modal) {
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '99999';
    modal.style.pointerEvents = 'auto';
  }

  async _loadHudHtml() {
    if (document.getElementById('hud-container')) {
      return true;
    }

    const container = await this._fetchHtmlElement(
      __dialogueText("ui/UIScene.js", "t_11fc71f89d5aadc4815a"),
      '#hud-container'
    );

    if (this._isDestroyed) return false;

    if (document.getElementById('hud-container')) {
      return true;
    }

    if (!container) return false;

    document.body.appendChild(container);

    return true;
  }

  _setupModalEvents(modal, closeButtonId) {
    if (modal.dataset.eventsBound === 'true') return;

    modal
      .querySelector(`#${closeButtonId}`)
      ?.addEventListener('click', () => {
        modal.style.display = 'none';
      });

    modal.addEventListener('click', event => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });

    modal.dataset.eventsBound = 'true';
  }

  _isModalOpen(modal) {
    return (
      modal instanceof HTMLElement &&
      window.getComputedStyle(modal).display !== 'none'
    );
  }

  _queueModalRefresh() {
    if (
      this._isDestroyed ||
      this._modalRefreshFrame !== null
    ) {
      return;
    }

    this._modalRefreshFrame = requestAnimationFrame(() => {
      this._modalRefreshFrame = null;

      if (!this._isDestroyed) {
        this._refreshOpenAgentModal();
      }
    });
  }

  _refreshOpenAgentModal() {
    const agentModal = document.getElementById('agent-modal');

    if (this._isModalOpen(agentModal)) {
      this._populateAgentModalData(agentModal);
    }

    const profileModal =
      document.getElementById('profile-modal');

    if (this._isModalOpen(profileModal)) {
      const focused = document.activeElement;

      const focusedStat =
        focused instanceof HTMLButtonElement &&
        profileModal.contains(focused)
          ? focused.dataset.progressionStat
          : null;

      this._populateProfileModalData(profileModal);

      if (focusedStat) {
        const replacement = profileModal.querySelector(
          `button[data-progression-stat="${focusedStat}"]`
        );

        if (
          replacement instanceof HTMLButtonElement &&
          !replacement.disabled
        ) {
          replacement.focus({ preventScroll: true });
        } else {
          profileModal.querySelector(
            '[data-progression-summary]'
          )?.focus({ preventScroll: true });
        }
      }
    }
  }

  _populateProfileModalData(modal) {
    const difficultyData = {
      rookie: [
        __dialogueText("ui/UIScene.js", "t_3e6b212e38b2bb8a83aa"),
        __dialogueText("ui/UIScene.js", "t_600b7737cd8fb54defaf")
      ],
      field: [
        __dialogueText("ui/UIScene.js", "t_898b1ad9707eac7ca046"),
        __dialogueText("ui/UIScene.js", "t_66d12def874fa622b577")
      ],
      master: [
        __dialogueText("ui/UIScene.js", "t_15970d29cd6269fe928c"),
        __dialogueText("ui/UIScene.js", "t_7121496487a129750ed1")
      ]
    };

    const currentDifficulty =
      this.registry.get('difficulty') ||
      gameState.difficulty ||
      'field';

    const selected =
      difficultyData[currentDifficulty] || difficultyData.field;

    this._setHtmlText(
      modal,
      '#profile-alias',
      gameState.playerName || gameState.agentName || __dialogueText("ui/UIScene.js", "t_2653ceeec1fd951707a3")
    );

    this._setHtmlText(
      modal,
      '#profile-codename',
      gameState.playerAlias || 'UNLISTED'
    );

    this._setHtmlText(
      modal,
      '#profile-rank',
      gameState.playerRank || __dialogueText("ui/UIScene.js", "t_bf32e97cd768b3cc39be")
    );

    this._setHtmlText(
      modal,
      '#profile-points',
      formatNumber(gameState.score)
    );

    this._setHtmlText(
      modal,
      '#profile-difficulty',
      selected[0]
    );

    this._setHtmlText(
      modal,
      '#profile-difficulty-description',
      selected[1]
    );

    this._renderProgression(modal);
    this._renderProfileStats(modal);
  }

  _renderProfileStats(modal) {
    const grid = modal.querySelector('#profile-stats');

    if (!(grid instanceof HTMLElement)) return;

    grid.replaceChildren();

    const savedStats = gameState.detectiveStats;

    if (
      !savedStats ||
      typeof savedStats !== 'object' ||
      Array.isArray(savedStats) ||
      !gameState.detectiveProfile
    ) {
      this._setHtmlText(
        modal,
        '#profile-archetype',
        __dialogueText("ui/UIScene.js", "t_f67b5b42d75cb056d508")
      );

      this._setHtmlText(
        modal,
        '#profile-bonus',
        __dialogueText("ui/UIScene.js", "t_74b088014c98defd0577")
      );

      const note = modal.querySelector(__dialogueText("ui/UIScene.js", "t_23af6d074816c52bca8e"));
      if (note) note.hidden = true;

      return;
    }

    const profile = getProfile(gameState.detectiveProfile);
    const baseStats = {};

    for (const statId of STAT_IDS) {
      const rawValue = savedStats[statId];

      const value =
        typeof rawValue === 'number' ||
        typeof rawValue === 'string'
          ? Number(rawValue)
          : NaN;

      baseStats[statId] = Number.isFinite(value)
        ? Math.max(1, Math.floor(value))
        : 1;
    }

    const effectiveStats = getEffectiveStats({
      profile: profile.id,
      stats: baseStats
    });

    const progression = this._readProgressionSummary();

    const hasValidStats = STAT_IDS.every(
      statId =>
        Number.isSafeInteger(savedStats[statId]) &&
        savedStats[statId] >= 1
    );

    const canSpend =
      hasValidStats &&
      progression !== null &&
      progression.availablePoints > 0;

    this._setHtmlText(
      modal,
      '#profile-archetype',
      profile.name
    );

    this._setHtmlText(
      modal,
      '#profile-bonus',
      `${__dialogueText("ui/UIScene.js", "t_6201521d9540f2602b05")}${profile.bonus}`
    );

    const note = modal.querySelector(__dialogueText("ui/UIScene.js", "t_23af6d074816c52bca8e"));
    if (note) note.hidden = false;

    for (const statId of STAT_IDS) {
      const baseValue = baseStats[statId];
      const finalValue = effectiveStats[statId];
      const bonus = finalValue - baseValue;

      const row = document.createElement('div');

      row.className =
        bonus > 0
          ? __dialogueText("ui/UIScene.js", "t_82f29ce3c2e55545ce94")
          : 'profile-stat';

      const name = document.createElement('dt');
      name.className = 'profile-stat-name';
      name.textContent = STAT_NAMES[statId];

      const value = document.createElement('dd');
      value.className = __dialogueText("ui/UIScene.js", "t_29e0974837a312b7b652");

      const number = document.createElement('span');
      number.textContent = String(finalValue);

      const increase = document.createElement('button');
      increase.type = 'button';
      increase.className = 'ui-stat-increase';
      increase.dataset.progressionStat = statId;
      increase.textContent = '+';

      increase.disabled =
        !canSpend ||
        savedStats[statId] >= Number.MAX_SAFE_INTEGER;

      increase.setAttribute(
        'aria-label',
        `${__dialogueText("ui/UIScene.js", "t_348fc02ccdb0cfde0800")}${STAT_NAMES[statId]}${__dialogueText("ui/UIScene.js", "t_225ae107308a57c787a2")}`
      );

      increase.title = !hasValidStats
        ? __dialogueText("ui/UIScene.js", "t_15b6a1ec9474af7b5f2c")
        : increase.disabled
          ? __dialogueText("ui/UIScene.js", "t_0aa9513fa485fd62b062")
          : `${__dialogueText("ui/UIScene.js", "t_e57e2e10ea6a8dbbe09d")}${STAT_NAMES[statId]}`;

      value.append(number, increase);

      const breakdown = document.createElement('dd');
      breakdown.className = 'profile-stat-breakdown';

      breakdown.textContent =
        bonus > 0
          ? `${__dialogueText("ui/UIScene.js", "t_4f1271d836894d23e60e")}${baseValue}${__dialogueText("ui/UIScene.js", "t_46209f696e32b54882cb")}${bonus}${__dialogueText("ui/UIScene.js", "t_bff921275c9f9418ec49")}`
          : `${__dialogueText("ui/UIScene.js", "t_4f1271d836894d23e60e")}${baseValue}`;

      row.append(name, value, breakdown);
      grid.appendChild(row);
    }
  }

  _populateAgentModalData(modal) {
    const playerName =
      gameState.playerName ||
      gameState.agentName ||
      __dialogueText("ui/UIScene.js", "t_2653ceeec1fd951707a3");

    this._setHtmlText(
      modal,
      __dialogueText("ui/UIScene.js", "t_aa7985870d10fb12c63d"),
      playerName
    );

    this._renderAgentTagline(modal);

    this._setHtmlText(
      modal,
      __dialogueText("ui/UIScene.js", "t_1743df1e297aa9e31d8a"),
      formatNumber(gameState.score)
    );

    this._setHtmlText(
      modal,
      '#pub-rank',
      gameState.playerRank || __dialogueText("ui/UIScene.js", "t_bf32e97cd768b3cc39be")
    );

    const avatar = modal.querySelector('#pub-avatar');

    const appearance = {
      skinTone: 'light',
      hairStyle: 'neat',
      hairColor: 'brown',
      coat: 'trench',
      facialHair: 'none',
      makeup: 'none',
      accessory: 'none',
      ...(gameState.appearance || {})
    };

    if (avatar instanceof HTMLElement) {
      avatar.dataset.skinTone = appearance.skinTone;
      avatar.dataset.hairStyle = appearance.hairStyle;
      avatar.dataset.hairColor = appearance.hairColor;
      avatar.dataset.coat = appearance.coat;
      avatar.dataset.facialHair = appearance.facialHair;
      avatar.dataset.makeup = appearance.makeup;
      avatar.dataset.accessory = appearance.accessory;

      avatar.setAttribute(
        'aria-label',
        `${playerName}${__dialogueText("ui/UIScene.js", "t_f7824571098797937aae")}`
      );
    }

    this._renderAchievementsGrid(modal);
  }

  _renderAgentTagline(modal) {
    let tagline = modal.querySelector('#pub-tagline');

    if (!(tagline instanceof HTMLElement)) {
      const title = modal.querySelector('#agent-dossier-title');

      if (!(title instanceof HTMLElement)) return;

      tagline = document.createElement('p');
      tagline.id = 'pub-tagline';
      tagline.className = 'agent-tagline';

      title.insertAdjacentElement('afterend', tagline);
    }

    const alias =
      typeof gameState.playerAlias === 'string'
        ? gameState.playerAlias.trim()
        : '';

    tagline.textContent = alias ? `“${alias}”` : '';
    tagline.hidden = !alias;

    Object.assign(tagline.style, {
      display: alias ? 'block' : 'none',
      margin: __dialogueText("ui/UIScene.js", "t_70b9fca79ae1440a5e60"),
      padding: '0',
      fontFamily: "'SpecialElite', 'Special Elite', monospace",
      fontSize: 'clamp(10px, 1.2vw, 16px)',
      fontWeight: 'normal',
      fontStyle: 'italic',
      lineHeight: '1.35',
      letterSpacing: 'normal',
      textTransform: 'none',
      whiteSpace: 'normal',
      overflowWrap: 'anywhere'
    });
  }

  _renderAchievementsGrid(modal) {
    const grid = modal.querySelector('#achievement-grid');

    if (!(grid instanceof HTMLElement)) return;

    const all = getAchievementList();

    const achievements = [
      ...all.filter(item => hasAchievement(item.id)),
      ...all.filter(item => !hasAchievement(item.id))
    ].slice(0, 4);

    grid.replaceChildren();

    achievements.forEach(achievement => {
      const unlocked = hasAchievement(achievement.id);

      const item = document.createElement('div');

      item.className = unlocked
        ? 'achievement-item'
        : __dialogueText("ui/UIScene.js", "t_ae698bf60e2d38102696");

      item.title = unlocked
        ? achievement.description
        : __dialogueText("ui/UIScene.js", "t_5ba5299030a87a3104a0");

      const icon = document.createElement('span');
      icon.className = 'achievement-icon';
      icon.textContent = unlocked ? achievement.icon : '🔒';

      const title = document.createElement('span');
      title.className = 'achievement-title';
      title.textContent = unlocked
        ? achievement.title
        : 'CLASSIFIED';

      item.append(icon, title);
      grid.appendChild(item);
    });
  }

  _setHtmlText(container, selector, text) {
    container.querySelectorAll(selector).forEach(element => {
      element.textContent = text;
    });
  }

  _colorToHex(color) {
    if (typeof color === 'string') {
      return color.startsWith('#') ? color : `#${color}`;
    }

    const numericColor = Number(color);

    return Number.isFinite(numericColor)
      ? `#${numericColor.toString(16).padStart(6, '0')}`
      : '#4caf50';
  }

  async _showGameOver(reason) {
    this._clearLevelUpNotice();

    const started = await this.goto(
      'GameOverScene',
      { reason }
    );

    if (!started) {
      console.error(
        '[UIScene] Could not open GameOverScene.',
        reason
      );
    }
  }
}

export default UIScene;