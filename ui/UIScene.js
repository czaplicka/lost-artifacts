import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { BaseScene } from '../scenes/BaseScene.js';
import { getEnergyManager } from '../managers/EnergyManager.js';

import {
  getAchievementList,
  hasAchievement
} from '../managers/AchievementManager.js';

import { moneyManager } from '../managers/MoneyManager.js';
import { getGameTimeManager } from '../managers/GameTimeManager.js';

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
    super({
      key: 'UIScene',
      active: true
    });

    this.energyManager = null;
    this.currentGameDay = 1;
    this.missionDays = 4;

    this.startDate = {
      year: 1990,
      monthIndex: 3,
      day: 1
    };

    this.dom = {};

    this._energyLogTimer = null;
    this._warningTimer = null;
    this._zeroTimer = null;
    this._modalRefreshFrame = null;

    this.domAbortController = null;
    this.moneyChangeHandler = null;

    this._isDestroyed = false;
    this._htmlPromises = new Map();

    this.caseTimerInitialSeconds = null;
  }

  async create() {
    super.create();

    this._isDestroyed = false;
    this.caseTimerInitialSeconds = null;

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this._cleanup,
      this
    );

    this.energyManager = getEnergyManager();

    const loaded = await this._loadHudHtml();

    if (this._isDestroyed) {
      return;
    }

    if (!loaded) {
      console.error(
        '[UIScene] Could not load ui/hud.template.'
      );
      return;
    }

    this._cacheDomElements();
    this._removeDomListeners();
    this._bindEvents();
    this._setupButtonListeners();
    this._setupTooltipListeners();

    getGameTimeManager(this._readTimeFromGameState());

    this.updateTime(getTimeChangedPayload(gameState));
    this.refreshScoreHud();
    this.refreshMoneyHud();
    this.updateEnergy();

    this.moneyChangeHandler = event => {
      this.refreshMoneyHud(event.detail?.state);
    };

    window.addEventListener(
      MONEY_EVENT,
      this.moneyChangeHandler
    );
  }

  _readTimeFromGameState() {
    return {
      day: gameState.currentDay || gameState.day || 1,
      hour: gameState.currentHour ?? gameState.hour ?? 8,
      minute: gameState.currentMinute ?? gameState.minute ?? 0,
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
    const container = document.getElementById('hud-container');

    this.dom = {
      container,
      time: document.getElementById('clock-time'),
      partOfDay: document.getElementById('clock-part'),
      month: document.getElementById('date-month'),
      day: document.getElementById('date-day'),
      deadlineValue: document.getElementById('deadline-value'),
      deadlineProgress: document.getElementById('deadline-progress'),
      energyTarget: document.getElementById('energy-target'),
      energyWrapper:
        container?.querySelector('.energy-wrapper') || null,
      energyFill: document.getElementById('energy-fill'),
      energyBolt: document.getElementById('energy-bolt'),
      score: document.getElementById('hud-score'),
      cash: document.getElementById('hud-cash'),
      tooltipBg: document.getElementById('hud-tooltip'),
      tooltipText: document.getElementById('hud-tooltip-text'),
      energyLogBg: document.getElementById('hud-energy-log'),
      energyLogText: document.getElementById('hud-energy-log-text')
    };
  }

  _bindEvents() {
    this.onBus('timeChanged', this.updateTime);
    this.onBus('scoreChanged', this.updateScore);
    this.onBus('cashChanged', this.updateCash);

    this.onBus('agentStatsChanged', this._queueModalRefresh);
    this.onBus('character-created', this._queueModalRefresh);

    this.onBus('gameOver', this._showGameOver);
    this.onBus('energyInitialized', this._onEnergyChanged);
    this.onBus('energyChanged', this._onEnergyChanged);
    this.onBus('energyWarning', this._onEnergyWarning);
    this.onBus('energyZero', this._onEnergyZero);
    this.onBus('showHUD', this.showHUD);
    this.onBus('hideHUD', this.hideHUD);
  }

  _cleanup() {
    this._isDestroyed = true;

    clearTimeout(this._energyLogTimer);
    clearTimeout(this._warningTimer);
    clearTimeout(this._zeroTimer);

    this._energyLogTimer = null;
    this._warningTimer = null;
    this._zeroTimer = null;

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
    if (!element) {
      return;
    }

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
  }

  hideHUD() {
    this._hideTooltip();
    this._setEnergyLogVisible(false);

    if (this.dom.container) {
      this.dom.container.style.display = 'none';
    }
  }

  _setupButtonListeners() {
    const options = this.getDomListenerOptions();

    const bindButton = (button, handler) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }

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
      }
    );

    bindButton(
      document.getElementById('btn-hud-collapse'),
      () => {
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
        element: this.dom.energyTarget,
        getContent: () => this._getEnergyTooltip()
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
      if (!(element instanceof HTMLElement)) {
        return;
      }

      const show = () => {
        const isCollapsed =
          this.dom.container?.classList.contains('collapsed');

        if (!isCollapsed) {
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
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    );

    this._setDomText(
      this.dom.partOfDay,
      String(
        data.partOfDay ?? snapshot.partOfDay
      ).toUpperCase()
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

    const color = remainingSeconds <= 60 * 60
      ? '#ae2012'
      : remainingSeconds <= 12 * 60 * 60
        ? '#ee9b00'
        : '#4caf50';

    this._setDomText(
      this.dom.deadlineValue,
      this._formatCaseDeadline(remainingSeconds)
    );

    this._setDomStyle(
      this.dom.deadlineValue,
      'color',
      color
    );

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

    const color = daysLeft <= 1
      ? '#ae2012'
      : daysLeft <= 2
        ? '#ee9b00'
        : '#4caf50';

    this._setDomText(
      this.dom.deadlineValue,
      `${daysLeft}D`
    );

    this._setDomStyle(
      this.dom.deadlineValue,
      'color',
      color
    );

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

  updateEnergy(data = {}) {
    const current = Number(
      data.current ?? this.energyManager?.getCurrentEnergy()
    ) || 0;

    const maximum = Number(
      data.max ?? this.energyManager?.maxEnergy
    ) || 100;

    const fraction = Phaser.Math.Clamp(
      current / maximum,
      0,
      1
    );

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
  }

  _onEnergyWarning() {
    const wrapper = this.dom.energyWrapper;

    if (!wrapper) {
      return;
    }

    wrapper.classList.remove('flash-warning');
    void wrapper.offsetWidth;
    wrapper.classList.add('flash-warning');

    clearTimeout(this._warningTimer);

    this._warningTimer = setTimeout(() => {
      wrapper.classList.remove('flash-warning');
    }, 1000);
  }

  _onEnergyZero() {
    const wrapper = this.dom.energyWrapper;

    if (!wrapper) {
      return;
    }

    wrapper.classList.remove('shake-zero');
    void wrapper.offsetWidth;
    wrapper.classList.add('shake-zero');

    clearTimeout(this._zeroTimer);

    this._zeroTimer = setTimeout(() => {
      wrapper.classList.remove('shake-zero');
    }, 550);
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
    if (!this.dom.energyLogBg) {
      return;
    }

    this._hideTooltip();
    this.dom.energyLogBg.classList.toggle('visible', visible);

    if (visible) {
      this._updateEnergyLogText();
    }
  }

  _toggleEnergyLog() {
    const isVisible =
      this.dom.energyLogBg?.classList.contains('visible');

    this._setEnergyLogVisible(!isVisible);
  }

  _showEnergyLogTemporarily() {
    clearTimeout(this._energyLogTimer);
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
      `${this.dom.time?.textContent || '--:--'} — ${this.dom.partOfDay?.textContent || ''}`,
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

    const last = manager.lastEnergyChange?.label;

    return [
      `ENERGY: ${manager.getCurrentEnergy()}%`,
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
    const rawScore = typeof data === 'object'
      ? data?.total
      : data;

    this._renderScore(rawScore ?? gameState.score);
    this._queueModalRefresh();
  }

  _renderScore(value) {
    if (this.dom.score) {
      this.dom.score.textContent = formatNumber(value);
    }
  }

  updateCash(data) {
    const rawCash = typeof data === 'object'
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

    if (!modal || this._isDestroyed) {
      return;
    }

    this._populateProfileModalData(modal);
    modal.style.display = 'flex';
  }

  async openAgentModal() {
    const modal = await this._loadHtmlModal(
      'agent.html',
      'agent-modal',
      'btn-close-agent'
    );

    if (!modal || this._isDestroyed) {
      return;
    }

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
        const response = await fetch(
          url,
          HTML_FETCH_OPTIONS
        );

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
          throw new Error(
            `Missing ${selector} inside ${url}`
          );
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

      if (this._isDestroyed) {
        return null;
      }

      modal = document.getElementById(modalId);

      if (!(modal instanceof HTMLElement)) {
        if (!fetched) {
          return null;
        }

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

    if (this._isDestroyed) {
      return false;
    }

    if (document.getElementById('hud-container')) {
      return true;
    }

    if (!container) {
      return false;
    }

    document.body.appendChild(container);

    return true;
  }

  _setupModalEvents(modal, closeButtonId) {
    if (modal.dataset.eventsBound === 'true') {
      return;
    }

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
      this._refreshOpenAgentModal();
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
      this._populateProfileModalData(profileModal);
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
      difficultyData[currentDifficulty] ||
      difficultyData.field;

    this._setHtmlText(
      modal,
      '#profile-alias',
      gameState.playerName ||
        gameState.agentName ||
        'Detective'
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

    this._renderProfileStats(modal);
  }

  _renderProfileStats(modal) {
    const grid = modal.querySelector('#profile-stats');

    if (!(grid instanceof HTMLElement)) {
      return;
    }

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

      if (note) {
        note.hidden = true;
      }

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

    if (note) {
      note.hidden = false;
    }

    for (const statId of STAT_IDS) {
      const baseValue = baseStats[statId];
      const finalValue = effectiveStats[statId];
      const bonus = finalValue - baseValue;

      const row = document.createElement('div');

      row.className = bonus > 0
        ? 'profile-stat has-profile-bonus'
        : 'profile-stat';

      const name = document.createElement('dt');
      name.className = 'profile-stat-name';
      name.textContent = STAT_NAMES[statId];

      const value = document.createElement('dd');
      value.className = 'profile-stat-value';
      value.textContent = String(finalValue);

      const breakdown = document.createElement('dd');
      breakdown.className = 'profile-stat-breakdown';
      breakdown.textContent = bonus > 0
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

  _renderAchievementsGrid(modal) {
    const grid = modal.querySelector('#achievement-grid');

    if (!(grid instanceof HTMLElement)) {
      return;
    }

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