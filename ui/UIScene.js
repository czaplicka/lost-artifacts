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
        'Morning'
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
        container?.querySelector('.energy-wrapper') || null,

      energyFill:
        document.getElementById('energy-fill'),

      energyBolt:
        document.getElementById('energy-bolt'),

      score: document.getElementById('hud-score'),
      cash: document.getElementById('hud-cash'),

      tooltipBg:
        document.getElementById('hud-tooltip'),

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
          '#profile-modal button[data-progression-stat]'
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
            `${STAT_NAMES[result.statId]} increased to ${
              result.effectiveStats[result.statId]
            }.`,
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
            'Could not update this personnel file.',
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
      no_skill_points: 'No skill points available.',
      unknown_stat: 'Unknown field assessment.',
      character_stats_missing:
        'Character assessment unavailable.',
      stat_limit: 'This skill cannot be increased further.'
    };

    return messages[reason] || 'Could not increase this skill.';
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

    style.textContent = `
      #profile-modal .ui-progression {
        box-sizing: border-box;
        margin: 12px 0 16px;
        padding: 12px;
        border: 2px solid #6c5135;
        background: rgba(92, 65, 35, .07);
        color: #35281d;
        font-family: 'SpecialElite', 'Special Elite', monospace;
        text-transform: none;
        letter-spacing: normal;
      }

      #profile-modal .ui-progression-heading {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 9px;
      }

      #profile-modal .ui-progression-level {
        font-family: 'PressStart2P', 'Press Start 2P', monospace;
        font-size: 10px;
        line-height: 1.7;
      }

      #profile-modal .ui-progression-total {
        font-size: 13px;
      }

      #profile-modal .ui-progression-bar {
        display: block;
        box-sizing: border-box;
        width: 100%;
        height: 15px;
        border: 2px solid #6c5135;
        background: #d9c9a9;
        overflow: hidden;
      }

      #profile-modal .ui-progression-fill {
        display: block;
        height: 100%;
        background: #66734a;
        transition: width 180ms ease;
      }

      #profile-modal .ui-progression-caption,
      #profile-modal .ui-progression-points,
      #profile-modal .ui-progression-message {
        margin: 8px 0 0;
        font-size: 13px;
        line-height: 1.45;
      }

      #profile-modal .ui-progression-points.has-points {
        color: #365327;
        font-weight: bold;
      }

      #profile-modal .ui-progression-message {
        min-height: 1.45em;
      }

      #profile-modal .ui-progression-message.is-error {
        color: #8c241e;
      }

      #profile-modal .profile-stat-value.ui-stat-value {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }

      #profile-modal .ui-stat-increase {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 34px;
        box-sizing: border-box;
        width: 34px;
        height: 34px;
        min-width: 34px;
        margin: 0;
        padding: 0;
        border: 2px solid #5d452e;
        border-radius: 0;
        background: #e7dabd;
        color: #35281d;
        box-shadow: 2px 2px 0 #5d452e;
        font-family: 'SpecialElite', 'Special Elite', monospace;
        font-size: 23px;
        line-height: 1;
        cursor: pointer;
      }

      #profile-modal .ui-stat-increase:hover:not(:disabled) {
        background: #f5e9ce;
      }

      #profile-modal .ui-stat-increase:active:not(:disabled) {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 #5d452e;
      }

      #profile-modal .ui-stat-increase:disabled {
        opacity: .35;
        box-shadow: none;
        cursor: default;
      }

      #profile-modal .ui-stat-increase:focus-visible,
      #profile-modal .ui-progression:focus-visible {
        outline: 3px solid #47668b;
        outline-offset: 3px;
      }

      .ui-level-up-notice {
        position: fixed;
        z-index: 100000;
        left: 50%;
        top: max(20px, env(safe-area-inset-top));
        transform: translateX(-50%);
        box-sizing: border-box;
        width: min(440px, calc(100vw - 32px));
        padding: 18px 20px;
        border: 3px solid #59412b;
        background: #eddfbf;
        color: #35281d;
        box-shadow: 5px 5px 0 rgba(0, 0, 0, .4);
        pointer-events: none;
        font-family: 'SpecialElite', 'Special Elite', monospace;
        text-align: center;
      }

      .ui-level-up-notice-title {
        margin: 0 0 10px;
        font-family: 'PressStart2P', 'Press Start 2P', monospace;
        font-size: 12px;
        line-height: 1.7;
      }

      .ui-level-up-notice-text {
        margin: 6px 0 0;
        font-size: 16px;
        line-height: 1.4;
      }

      @media (prefers-reduced-motion: reduce) {
        #profile-modal .ui-progression-fill {
          transition: none;
        }
      }
    `;

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
    section.setAttribute('aria-label', 'Character progression');

    section.innerHTML = `
      <div class="ui-progression-heading">
        <span
          class="ui-progression-level"
          data-progression-level
        ></span>
        <span
          class="ui-progression-total"
          data-progression-total
        ></span>
      </div>

      <div
        class="ui-progression-bar"
        data-progression-bar
        role="progressbar"
        aria-label="Experience toward next level"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span
          class="ui-progression-fill"
          data-progression-fill
        ></span>
      </div>

      <p
        class="ui-progression-caption"
        data-progression-caption
      ></p>

      <p
        class="ui-progression-points"
        data-progression-points
      ></p>

      <p
        class="ui-progression-message"
        data-progression-message
        role="status"
        aria-live="polite"
        aria-atomic="true"
      ></p>
    `;

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
        'PROGRESSION UNAVAILABLE'
      );

      this._setHtmlText(
        section,
        '[data-progression-total], [data-progression-caption]',
        ''
      );

      this._setHtmlText(
        section,
        '[data-progression-points]',
        'Personnel file could not be read.'
      );

      const bar = section.querySelector('[data-progression-bar]');
      if (bar) bar.hidden = true;

      return;
    }

    this._setHtmlText(
      section,
      '[data-progression-level]',
      `LEVEL ${summary.level}`
    );

    this._setHtmlText(
      section,
      '[data-progression-total]',
      `${formatNumber(summary.totalXP)} total XP`
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
          ? 'Maximum level reached'
          : `${summary.currentLevelXP} of ${summary.requiredXP} XP`
      );
    }

    if (fill instanceof HTMLElement) {
      fill.style.width = `${percent}%`;
    }

    this._setHtmlText(
      section,
      '[data-progression-caption]',
      summary.isMaxLevel
        ? 'Maximum level reached. HR is investigating.'
        : `${formatNumber(summary.currentLevelXP)} / ${
            formatNumber(summary.requiredXP)
          } XP — ${formatNumber(summary.xpToNextLevel)} to next level`
    );

    const points = section.querySelector(
      '[data-progression-points]'
    );

    if (points) {
      points.textContent =
        summary.availablePoints > 0
          ? `${summary.availablePoints} skill ${
              summary.availablePoints === 1 ? 'point' : 'points'
            } available. Use + to improve a skill.`
          : 'No unspent skill points. Next level grants 1 point.';

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
    title.textContent = `LEVEL ${summary.level}`;

    const message = document.createElement('p');
    message.className = 'ui-level-up-notice-text';
    message.textContent =
      'Your paperwork now suggests professional growth.';

    const points = document.createElement('p');
    points.className = 'ui-level-up-notice-text';

    const gainedPoints = Math.max(
      1,
      Math.floor(Number(data.gainedPoints) || 1)
    );

    points.textContent =
      `${gainedPoints} skill ${
        gainedPoints === 1 ? 'point' : 'points'
      } earned. Open your Personnel File to spend.`;

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

    const bindings = [
      {
        element: this.dom.time,
        getContent: () => this._getClockTooltip()
      },
      {
        element: this.dom.month,
        getContent: () => this._getDateTooltip()
      },
      {
        element: this.dom.day,
        getContent: () => this._getDateTooltip()
      },
      {
        element: this.dom.deadlineValue,
        getContent: () => this._getDeadlineTooltip()
      },
      {
        element: this.dom.score,
        getContent: () => [
          'SCORE',
          `${formatNumber(gameState.score)} points.`,
          'Solve cases, collect clues and make smart arrests.'
        ].join('\n')
      },
      {
        element: this.dom.cash,
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
    target.setAttribute('aria-label', 'Energy remaining');
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
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          this._toggleEnergyLog();
        } else if (event.key === 'Escape') {
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
      `CASH: $${cash}`,
      `Agency budget: $${agencyBudget}`,
      agencyDebt > 0
        ? `Agency debt: $${agencyDebt}`
        : 'No agency debt.',
      'Cash pays for comfort, shortcuts and private detective work.'
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
      return `${days}D ${String(hours).padStart(2, '0')}H`;
    }

    if (hours > 0) {
      return `${hours}H ${String(minutes).padStart(2, '0')}M`;
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
      `${percent}% energy remaining`
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

    if (this.dom.tooltipText) {
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
      .map(entry => entry.label || 'Energy changed.');

    this.dom.energyLogText.textContent = entries.length
      ? entries.join('\n')
      : 'No energy changes recorded.';
  }

  _getClockTooltip() {
    return [
      'TIME',
      `${this.dom.time?.textContent || '--:--'} — ${
        this.dom.partOfDay?.textContent || ''
      }`,
      'Conversations, travel and tasks move time forward.'
    ].join('\n');
  }

  _getDateTooltip() {
    const label = FULL_DATE_FORMAT.format(
      this._calculateDate(this.currentGameDay)
    );

    return [
      'CASE DATE',
      label,
      `Day ${this.currentGameDay} of the investigation.`
    ].join('\n');
  }

  _getDeadlineTooltip() {
    const remainingSeconds = this._getCaseDeadlineSeconds();

    if (remainingSeconds !== null) {
      return [
        'CASE DEADLINE',
        `${this._formatCaseDeadline(remainingSeconds)} remaining.`,
        'Travel, lab work, crime scenes and sleep consume case time.',
        'When time runs out, the thief disappears.'
      ].join('\n');
    }

    const daysLeft = Math.max(
      0,
      this.missionDays - this.currentGameDay + 1
    );

    return [
      'CASE DEADLINE',
      `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining.`,
      'When time runs out, the case is over.'
    ].join('\n');
  }

  _getEnergyTooltip() {
    const manager = this.energyManager;

    if (!manager) {
      return 'ENERGY\nEnergy monitor unavailable.';
    }

    const { percent } =
      this._energySnapshot || this._readEnergySnapshot();

    const last = manager.lastEnergyChange?.label;

    return [
      `ENERGY: ${percent}%`,
      `STATUS: ${String(manager.getEnergyStatus()).toUpperCase()}`,
      manager.getEnergyTooltip(),
      last
        ? `Last: ${last}`
        : 'Click the bolt for the full energy log.'
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
      'profile.html',
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
      'agent.html',
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
      'ui/hud.template',
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
        'ROOKIE DETECTIVE',
        'Extra guidance. More retries. Less paperwork.'
      ],
      field: [
        'FIELD AGENT',
        'Standard Mark Agency field procedure.'
      ],
      master: [
        'MASTER SLEUTH',
        'Fewer second chances. Better coffee not guaranteed.'
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
      gameState.playerName || gameState.agentName || 'Detective'
    );

    this._setHtmlText(
      modal,
      '#profile-codename',
      gameState.playerAlias || 'UNLISTED'
    );

    this._setHtmlText(
      modal,
      '#profile-rank',
      gameState.playerRank || 'Junior Agent'
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
        'ASSESSMENT UNAVAILABLE'
      );

      this._setHtmlText(
        modal,
        '#profile-bonus',
        'No character assessment was found in this personnel file.'
      );

      const note = modal.querySelector('.profile-stats-note');
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
      `PROFILE BONUS: ${profile.bonus}`
    );

    const note = modal.querySelector('.profile-stats-note');
    if (note) note.hidden = false;

    for (const statId of STAT_IDS) {
      const baseValue = baseStats[statId];
      const finalValue = effectiveStats[statId];
      const bonus = finalValue - baseValue;

      const row = document.createElement('div');

      row.className =
        bonus > 0
          ? 'profile-stat has-profile-bonus'
          : 'profile-stat';

      const name = document.createElement('dt');
      name.className = 'profile-stat-name';
      name.textContent = STAT_NAMES[statId];

      const value = document.createElement('dd');
      value.className = 'profile-stat-value ui-stat-value';

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
        `Increase ${STAT_NAMES[statId]} by 1. Costs 1 skill point.`
      );

      increase.title = !hasValidStats
        ? 'Character assessment unavailable'
        : increase.disabled
          ? 'No skill points available or skill limit reached'
          : `Spend 1 skill point on ${STAT_NAMES[statId]}`;

      value.append(number, increase);

      const breakdown = document.createElement('dd');
      breakdown.className = 'profile-stat-breakdown';

      breakdown.textContent =
        bonus > 0
          ? `Base ${baseValue} + ${bonus} profile bonus`
          : `Base ${baseValue}`;

      row.append(name, value, breakdown);
      grid.appendChild(row);
    }
  }

  _populateAgentModalData(modal) {
    const playerName =
      gameState.playerName ||
      gameState.agentName ||
      'Detective';

    this._setHtmlText(
      modal,
      '#agent-name, #agent-alias, #pub-alias',
      playerName
    );

    this._renderAgentTagline(modal);

    this._setHtmlText(
      modal,
      '#agent-score, #agent-points, #pub-points',
      formatNumber(gameState.score)
    );

    this._setHtmlText(
      modal,
      '#pub-rank',
      gameState.playerRank || 'Junior Agent'
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
        `${playerName}'s agent portrait`
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
      margin: '4px 0 10px',
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
        : 'achievement-item locked';

      item.title = unlocked
        ? achievement.description
        : 'Achievement locked';

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