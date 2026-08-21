import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { BaseScene } from '../scenes/BaseScene.js';
import { getEnergyManager } from '../EnergyManager.js';
import { getAchievementList, hasAchievement } from '../AchievementManager.js';
import { moneyManager } from '../MoneyManager.js';
import { getGameTimeManager } from '../GameTimeManager.js';
import {
  getCaseTimeRemaining,
  getCaseTimerKey
} from '../CaseTimeHelper.js';

const ENERGY_CIRCUMFERENCE = 251.327;

export class UIScene extends BaseScene {
  constructor() {
    super({ key: 'UIScene', active: true });
    this.energyManager = null;
    this.currentGameDay = 1;
    this.missionDays = 4;
    this.startDate = { year: 1990, month: 3, day: 1 };
    this.dom = {};
    this._energyLogTimer = null;
    this._warningTimer = null;
    this._zeroTimer = null;
    this.domAbortController = null;
    this.moneyChangeHandler = null;
    this.caseTimerInitialSeconds = null;
  }

  async create() {
    super.create();
    this.energyManager = getEnergyManager();

    const loaded = await this._loadHudHtml();
    if (!loaded) {
      console.error('[UIScene] Could not load ui/hud.template.');
      return;
    }

    this._cacheDomElements();
    this._removeDomListeners();
    this._bindEvents();
    this._setupButtonListeners();
    this._setupTooltipListeners();

    this.updateTime({
      day: gameState.currentDay || gameState.day || 1,
      hour: gameState.currentHour ?? gameState.hour ?? 8,
      minute: gameState.currentMinute ?? gameState.minute ?? 0,
      partOfDay: gameState.currentPartOfDay || gameState.partOfDay || 'Morning'
    });
  this.refreshScoreHud();
    this.refreshMoneyHud();
    this.updateEnergy();

    this.moneyChangeHandler = (event) => {
      this.refreshMoneyHud(event.detail?.state);
    };

    window.addEventListener('lost-artifacts:money-changed', this.moneyChangeHandler);
getGameTimeManager({
  day: gameState.currentDay || gameState.day || 1,
  hour: gameState.currentHour ?? gameState.hour ?? 8,
  minute: gameState.currentMinute ?? gameState.minute ?? 0,
  partOfDay:
    gameState.currentPartOfDay ||
    gameState.partOfDay ||
    'Morning'
});
  }

  _removeDomListeners() {
    this.domAbortController?.abort();
    this.domAbortController = new AbortController();
  }

  getDomListenerOptions() {
    return { signal: this.domAbortController.signal };
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
      energyWrapper: container?.querySelector('.energy-wrapper') || null,
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
    EventBus.on('timeChanged', this.updateTime, this);
    EventBus.on(
  'caseTimeChanged',
  this.updateCaseDeadline,
  this
);
    EventBus.on('scoreChanged', this.updateScore, this);
    EventBus.on('cashChanged', this.updateCash, this);
    EventBus.on('agentStatsChanged', this._refreshOpenAgentModal, this);
    EventBus.on('gameOver', this._showGameOver, this);
    EventBus.on('energyInitialized', this._onEnergyChanged, this);
    EventBus.on('energyChanged', this._onEnergyChanged, this);
    EventBus.on('energyWarning', this._onEnergyWarning, this);
    EventBus.on('energyZero', this._onEnergyZero, this);
    EventBus.on('showHUD', this.showHUD, this);
    EventBus.on('hideHUD', this.hideHUD, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this._cleanup, this);
  }

  _cleanup() {
    EventBus.off('timeChanged', this.updateTime, this);
    EventBus.off(
  'caseTimeChanged',
  this.updateCaseDeadline,
  this
);
    EventBus.off('scoreChanged', this.updateScore, this);
    EventBus.off('cashChanged', this.updateCash, this);
    EventBus.off('agentStatsChanged', this._refreshOpenAgentModal, this);
    EventBus.off('gameOver', this._showGameOver, this);
    EventBus.off('energyInitialized', this._onEnergyChanged, this);
    EventBus.off('energyChanged', this._onEnergyChanged, this);
    EventBus.off('energyWarning', this._onEnergyWarning, this);
    EventBus.off('energyZero', this._onEnergyZero, this);
    EventBus.off('showHUD', this.showHUD, this);
    EventBus.off('hideHUD', this.hideHUD, this);

    clearTimeout(this._energyLogTimer);
    clearTimeout(this._warningTimer);
    clearTimeout(this._zeroTimer);
    this._energyLogTimer = null;
    this._warningTimer = null;
    this._zeroTimer = null;

    if (this.moneyChangeHandler) {
      window.removeEventListener('lost-artifacts:money-changed', this.moneyChangeHandler);
      this.moneyChangeHandler = null;
    }

    this.domAbortController?.abort();
    this.domAbortController = null;
    this.dom = {};
  }

showHUD() {
  if (this.dom.container) {
    this.dom.container.style.display = 'block';
  }

  this.refreshScoreHud();
}

  hideHUD() {
    this._hideTooltip();
    this._setEnergyLogVisible(false);
    if (this.dom.container) this.dom.container.style.display = 'none';
  }

  _setupButtonListeners() {
    const options = this.getDomListenerOptions();
    const bindButton = (button, handler) => {
      if (!(button instanceof HTMLElement)) return;
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          await handler();
        } catch (error) {
          console.error('[UIScene] HUD button failed:', error);
        }
      }, options);
    };

    bindButton(document.getElementById('btn-hud-expand'), () => {
      this.dom.container?.classList.remove('collapsed');
    });
    bindButton(document.getElementById('btn-hud-collapse'), () => {
      this._hideTooltip();
      this._setEnergyLogVisible(false);
      this.dom.container?.classList.add('collapsed');
    });
    bindButton(document.getElementById('btn-profile'), () => this.openAgentModal());
    bindButton(document.getElementById('btn-player'), () => this.openProfileModal());
    bindButton(document.getElementById('btn-settings'), () => this.openSettings());

    this.dom.energyTarget?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._toggleEnergyLog();
    }, options);
  }

  _setupTooltipListeners() {
    const options = this.getDomListenerOptions();
    const bindings = [
      { element: this.dom.time, getContent: () => this._getClockTooltip() },
      { element: this.dom.month, getContent: () => this._getDateTooltip() },
      { element: this.dom.day, getContent: () => this._getDateTooltip() },
      { element: this.dom.deadlineValue, getContent: () => this._getDeadlineTooltip() },
      { element: this.dom.energyTarget, getContent: () => this._getEnergyTooltip() },
      { element: this.dom.score, getContent: () => `SCORE\n${Number(gameState.score || 0).toLocaleString('en-US')} points.\nSolve cases, collect clues and make smart arrests.` },
      { element: this.dom.cash, getContent: () => this._getCashTooltip() }
    ];

    bindings.forEach(({ element, getContent }) => {
      if (!(element instanceof HTMLElement)) return;
      const show = () => {
        if (!this.dom.container?.classList.contains('collapsed')) this._showTooltip(getContent());
      };
      element.addEventListener('mouseenter', show, options);
      element.addEventListener('mouseleave', () => this._hideTooltip(), options);
      element.addEventListener('focus', show, options);
      element.addEventListener('blur', () => this._hideTooltip(), options);
    });
  }

  _getCashTooltip() {
    const { cash, agencyBudget, agencyDebt } = moneyManager.getState();
    return [
      `CASH: $${cash}`,
      `Agency budget: $${agencyBudget}`,
      agencyDebt > 0 ? `Agency debt: $${agencyDebt}` : 'No agency debt.',
      'Cash pays for comfort, shortcuts and private detective work.'
    ].join('\n');
  }

  updateTime(data = {}) {
    this.currentGameDay = Math.max(1, Number(data.day) || 1);
    const hour = Phaser.Math.Clamp(Number(data.hour) || 0, 0, 23);
    const minute = Phaser.Math.Clamp(Number(data.minute) || 0, 0, 59);
    if (this.dom.time) this.dom.time.textContent = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (this.dom.partOfDay) this.dom.partOfDay.textContent = String(data.partOfDay || 'Morning').toUpperCase();
    this._updateDateDisplay(this.currentGameDay);
this.updateCaseDeadline();
  }
updateCaseDeadline(data = {}) {
  const remainingSeconds = Number.isFinite(
    Number(data.remainingSeconds)
  )
    ? Math.max(0, Math.floor(Number(data.remainingSeconds)))
    : getCaseTimeRemaining(gameState);

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

  if (this.dom.deadlineValue) {
    this.dom.deadlineValue.textContent =
      this._formatCaseDeadline(remainingSeconds);

    this.dom.deadlineValue.style.color = color;
  }

  if (this.dom.deadlineProgress) {
    this.dom.deadlineProgress.style.width = `${progress}%`;
    this.dom.deadlineProgress.style.backgroundColor = color;
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
    return `${days}D ${String(hours).padStart(2, '0')}H`;
  }

  if (hours > 0) {
    return `${hours}H ${String(minutes).padStart(2, '0')}M`;
  }

  return `${minutes}M`;
}

_getCaseDeadlineSeconds() {
  const key = getCaseTimerKey(gameState);

  if (!key) {
    return null;
  }

  return getCaseTimeRemaining(gameState);
}
  _calculateDate(gameDay) {
    return new Date(this.startDate.year, this.startDate.month, this.startDate.day + gameDay - 1);
  }

  _updateDateDisplay(gameDay) {
    const date = this._calculateDate(gameDay);
    if (this.dom.month) this.dom.month.textContent = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    if (this.dom.day) this.dom.day.textContent = String(date.getDate()).padStart(2, '0');
  }

  _updateDeadlineDisplay(gameDay) {
    const daysLeft = Math.max(0, this.missionDays - gameDay + 1);
    const progress = Phaser.Math.Clamp((daysLeft / this.missionDays) * 100, 0, 100);
    const color = daysLeft <= 1 ? '#ae2012' : daysLeft <= 2 ? '#ee9b00' : '#4caf50';
    if (this.dom.deadlineValue) {
      this.dom.deadlineValue.textContent = `${daysLeft}D`;
      this.dom.deadlineValue.style.color = color;
    }
    if (this.dom.deadlineProgress) {
      this.dom.deadlineProgress.style.width = `${progress}%`;
      this.dom.deadlineProgress.style.backgroundColor = color;
    }
  }

  _onEnergyChanged(data = {}) {
    this.updateEnergy(data);
    if (data.lastChange) this._showEnergyLogTemporarily();
  }

  updateEnergy(data = {}) {
    const current = Number(data.current ?? this.energyManager?.getCurrentEnergy()) || 0;
    const maximum = Number(data.max ?? this.energyManager?.maxEnergy) || 100;
    const fraction = Phaser.Math.Clamp(current / maximum, 0, 1);
    const color = this._colorToHex(data.color ?? this.energyManager?.getEnergyColor());
    const offset = ENERGY_CIRCUMFERENCE * (1 - fraction);
    if (this.dom.energyFill) {
      this.dom.energyFill.style.strokeDasharray = String(ENERGY_CIRCUMFERENCE);
      this.dom.energyFill.style.strokeDashoffset = String(offset);
      this.dom.energyFill.style.stroke = color;
    }
    if (this.dom.energyBolt) this.dom.energyBolt.style.fill = color;
    this.dom.energyWrapper?.classList.toggle('low-energy', fraction <= 0.2);
  }

  _onEnergyWarning() {
    const wrapper = this.dom.energyWrapper;
    if (!wrapper) return;
    wrapper.classList.remove('flash-warning');
    void wrapper.offsetWidth;
    wrapper.classList.add('flash-warning');
    clearTimeout(this._warningTimer);
    this._warningTimer = setTimeout(() => wrapper.classList.remove('flash-warning'), 1000);
  }

  _onEnergyZero() {
    const wrapper = this.dom.energyWrapper;
    if (!wrapper) return;
    wrapper.classList.remove('shake-zero');
    void wrapper.offsetWidth;
    wrapper.classList.add('shake-zero');
    clearTimeout(this._zeroTimer);
    this._zeroTimer = setTimeout(() => wrapper.classList.remove('shake-zero'), 550);
  }

  _showTooltip(content) {
    if (!content || !this.dom.tooltipBg || this.dom.energyLogBg?.classList.contains('visible')) return;
    if (this.dom.tooltipText) this.dom.tooltipText.textContent = content;
    this.dom.tooltipBg.classList.add('visible');
  }

  _hideTooltip() {
    this.dom.tooltipBg?.classList.remove('visible');
  }

  _setEnergyLogVisible(visible) {
    if (!this.dom.energyLogBg) return;
    this._hideTooltip();
    this.dom.energyLogBg.classList.toggle('visible', visible);
    if (visible) this._updateEnergyLogText();
  }

  _toggleEnergyLog() {
    this._setEnergyLogVisible(!this.dom.energyLogBg?.classList.contains('visible'));
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
    if (!this.dom.energyLogText || !this.energyManager) return;
    const entries = this.energyManager.getEnergyLog().slice(-5).reverse().map((entry) => entry.label || 'Energy changed.');
    this.dom.energyLogText.textContent = entries.length ? entries.join('\n') : 'No energy changes recorded.';
  }

  _getClockTooltip() {
    return `TIME\n${this.dom.time?.textContent || '--:--'} — ${this.dom.partOfDay?.textContent || ''}\nConversations, travel and tasks move time forward.`;
  }

  _getDateTooltip() {
    const label = this._calculateDate(this.currentGameDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return `CASE DATE\n${label}\nDay ${this.currentGameDay} of the investigation.`;
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
    if (!manager) return 'ENERGY\nEnergy monitor unavailable.';
    const last = manager.lastEnergyChange?.label;
    return [
      `ENERGY: ${manager.getCurrentEnergy()}%`,
      `STATUS: ${String(manager.getEnergyStatus()).toUpperCase()}`,
      manager.getEnergyTooltip(),
      last ? `Last: ${last}` : 'Click the bolt for the full energy log.'
    ].join('\n');
  }
refreshScoreHud() {
  const score = Math.max(
    0,
    Math.floor(Number(gameState.score) || 0)
  );

  this.updateScore({
    total: score
  });
}

updateScore(data) {
  const rawScore =
    typeof data === 'object'
      ? data?.total
      : data;

  const score = Math.max(
    0,
    Math.floor(
      Number(rawScore ?? gameState.score) || 0
    )
  );

  gameState.score = score;

  if (this.dom.score) {
    this.dom.score.textContent =
      score.toLocaleString('en-US');
  }

  this._refreshOpenAgentModal();
}

  updateCash(data) {
    const rawCash = typeof data === 'object' ? data?.total ?? data?.cash : data;
    const cash = Math.max(0, Math.floor(Number(rawCash ?? 250) || 0));
    if (this.dom.cash) this.dom.cash.textContent = `$${cash.toLocaleString('en-US')}`;
  }

  refreshMoneyHud(state = moneyManager.getState()) {
    this.updateCash(state.cash);
  }

  openSettings() {
    if (!this.scene.isActive('SettingsScene')) this.scene.launch('SettingsScene');
    this.scene.bringToTop('SettingsScene');
  }

  async openProfileModal() {
    const modal = await this._loadHtmlModal('profile.html', 'profile-modal', 'btn-close-profile');
    if (!modal) return;
    this._populateProfileModalData(modal);
    modal.style.display = 'flex';
  }

  async openAgentModal() {
    const modal = await this._loadHtmlModal('agent.html', 'agent-modal', 'btn-close-agent');
    if (!modal) return;
    this._populateAgentModalData(modal);
    modal.style.display = 'flex';
  }

  async _loadHtmlModal(fileName, modalId, closeButtonId) {
    let modal = document.getElementById(modalId);
    if (modal instanceof HTMLElement) {
      this._forceModalAboveGame(modal);
      return modal;
    }
    try {
      const response = await fetch(fileName, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Could not load ${fileName}: HTTP ${response.status}`);
      const template = document.createElement('template');
      template.innerHTML = (await response.text()).trim();
      modal = template.content.querySelector(`#${modalId}`);
      if (!(modal instanceof HTMLElement)) throw new Error(`Missing #${modalId} inside ${fileName}`);
      document.body.appendChild(modal);
      this._forceModalAboveGame(modal);
      this._setupModalEvents(modal, closeButtonId);
      return modal;
    } catch (error) {
      console.error('[UIScene] Modal load error:', { fileName, modalId, error });
      return null;
    }
  }

  _forceModalAboveGame(modal) {
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '99999';
    modal.style.pointerEvents = 'auto';
  }

  async _loadHudHtml() {
    if (document.getElementById('hud-container')) return true;
    try {
      const response = await fetch('ui/hud.template', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const template = document.createElement('template');
      template.innerHTML = (await response.text()).trim();
      const container = template.content.querySelector('#hud-container');
      if (!(container instanceof HTMLElement)) throw new Error('Missing #hud-container in ui/hud.template.');
      document.body.appendChild(container);
      return true;
    } catch (error) {
      console.error('[UIScene] HUD loading failed:', error);
      return false;
    }
  }

  _setupModalEvents(modal, closeButtonId) {
    if (modal.dataset.eventsBound === 'true') return;
    modal.querySelector(`#${closeButtonId}`)?.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.style.display = 'none';
    });
    modal.dataset.eventsBound = 'true';
  }

  _populateProfileModalData(modal) {
    const difficultyData = {
      rookie: ['ROOKIE DETECTIVE', 'Extra guidance. More retries. Less paperwork.'],
      field: ['FIELD AGENT', 'Standard Mark Agency field procedure.'],
      master: ['MASTER SLEUTH', 'Fewer second chances. Better coffee not guaranteed.']
    };
    const currentDifficulty = this.registry.get('difficulty') || gameState.difficulty || 'field';
    const selected = difficultyData[currentDifficulty] || difficultyData.field;
    this._setHtmlText(modal, '#profile-alias', gameState.playerName || 'Detective');
    this._setHtmlText(modal, '#profile-rank', gameState.playerRank || 'Junior Agent');
    this._setHtmlText(modal, '#profile-points', Number(gameState.score || 0).toLocaleString('en-US'));
    this._setHtmlText(modal, '#profile-difficulty', selected[0]);
    this._setHtmlText(modal, '#profile-difficulty-description', selected[1]);
  }

_populateAgentModalData(modal) {
  const playerName =
    gameState.playerName
    || gameState.agentName
    || 'Detective';

  this._setHtmlText(
    modal,
    '#agent-name, #agent-alias, #pub-alias',
    playerName,
  );

  this._setHtmlText(
    modal,
    '#agent-score, #agent-points, #pub-points',
    Number(gameState.score || 0).toLocaleString('en-US'),
  );

  this._setHtmlText(
    modal,
    '#pub-rank',
    gameState.playerRank || 'Junior Agent',
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
    ...(gameState.appearance || {}),
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
      `${playerName}'s agent portrait`,
    );
  }

  this._renderAchievementsGrid(modal);
}

  _refreshOpenAgentModal() {
    const modal = document.getElementById('agent-modal');
    if (modal instanceof HTMLElement && modal.style.display !== 'none') this._populateAgentModalData(modal);
  }

  _renderAchievementsGrid(modal) {
    const grid = modal.querySelector('#achievement-grid');
    if (!(grid instanceof HTMLElement)) return;
    const achievements = [
      ...getAchievementList().filter((item) => hasAchievement(item.id)),
      ...getAchievementList().filter((item) => !hasAchievement(item.id))
    ].slice(0, 4);
    grid.replaceChildren();
    achievements.forEach((achievement) => {
      const unlocked = hasAchievement(achievement.id);
      const item = document.createElement('div');
      item.className = unlocked ? 'achievement-item' : 'achievement-item locked';
      item.title = unlocked ? achievement.description : 'Achievement locked';
      const icon = document.createElement('span');
      icon.className = 'achievement-icon';
      icon.textContent = unlocked ? achievement.icon : '🔒';
      const title = document.createElement('span');
      title.className = 'achievement-title';
      title.textContent = unlocked ? achievement.title : 'CLASSIFIED';
      item.append(icon, title);
      grid.appendChild(item);
    });
  }

  _setHtmlText(container, selector, text) {
    container.querySelectorAll(selector).forEach((element) => {
      element.textContent = text;
    });
  }

  _colorToHex(color) {
    if (typeof color === 'string') return color.startsWith('#') ? color : `#${color}`;
    const numericColor = Number(color);
    return Number.isFinite(numericColor) ? `#${numericColor.toString(16).padStart(6, '0')}` : '#4caf50';
  }

  _showGameOver(reason) {
    this.scene.stop();
    this.scene.start('GameOverScene', { reason });
  }
}

export default UIScene;