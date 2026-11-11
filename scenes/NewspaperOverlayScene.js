import { NewspaperLayout } from '../ui/NewspaperUI.js';
import { NewspaperLayoutConfig } from '../NewspaperLayoutConfig.js';
import { prepareNewspaperBackground, hasReadableCoverLines } from '../ui/NewspaperAssets.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { getDailyNewspaperEdition, getNewspaperDay } from '../systems/newsstand/NewspaperEditionManager.js';

function readableText(value, seen = new Set()) {
  if (typeof value === 'string') {
    const text = value.trim();
    return !text || text.toLowerCase().includes('[object object]') ? '' : text;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value) || seen.has(value)) return '';
  seen.add(value);
  for (const key of ['label', 'name', 'title', 'artifactName']) {
    const text = readableText(value[key], seen);
    if (text) return text;
  }
  return '';
}
function firstReadable(...values) {
  for (const value of values) {
    const text = readableText(value);
    if (text) return text;
  }
  return '';
}
export class NewspaperOverlayScene extends BaseScene {
  constructor() {
    super({ key: 'NewspaperOverlayScene' });
    this.cityId = 'warsaw';
    this.type = 'daily';
    this.backgroundKey = null;
    this.jsonKey = null;
    this.root = null;
    this.dim = null;
    this.paper = null;
    this.paperBg = null;
    this.closeBtn = null;
    this.contentLayer = null;
    this.layoutRenderer = null;
    this.isAnimating = false;
    this.editionData = null;
    this.boundEscape = () => { if (!this.isAnimating) this.closeOverlay(); };
    this.boundResize = () => this.resizeOverlay();
    this.boundCleanup = () => this.cleanupOverlay();
  }
  init(data = {}) {
    this.cityId = data.cityId || 'warsaw';
    this.type = data.type || 'daily';
    this.backgroundKey = data.backgroundKey || null;
    this.jsonKey = data.jsonKey || `newspaper_${this.type}_${this.cityId}`;
    this.isAnimating = false;
    this.editionData = null;
  }
  preload() {
    const json = this.cache.json.get(this.jsonKey);
    if (!json || this.type === 'time') return;
    this.editionData = this.resolveArticles(this.resolveCityData(json, this.cityId, this.type));
    const queued = new Set();
    for (const article of this.editionData.articles || []) {
      if (!article?.imageKey || !article?.imageUrl || queued.has(article.imageKey) ||
          this.textures.exists(article.imageKey)) continue;
      queued.add(article.imageKey);
      this.load.image(article.imageKey, article.imageUrl);
    }
  }
  create() {
    super.create();
    this.backgroundKey = prepareNewspaperBackground(this, this.type, this.backgroundKey);
    const { width, height } = this.scale;
    this.layoutRenderer = new NewspaperLayout(this);
    this.root = this.add.container(0, 0).setDepth(5000).setScrollFactor(0);
    this.dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0, 0).setInteractive();
    this.paper = this.add.container(0, 0);
    this.paperBg = this.add.image(0, 0, this.backgroundKey).setOrigin(0, 0);
    this.contentLayer = this.add.container(0, 0);
    this.closeBtn = this.add.text(width - 20, 20, 'X', {
      fontFamily: 'PressStart2P', fontSize: '18px', color: '#ffffff',
      backgroundColor: '#111111', padding: { x: 12, y: 10 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerup', (pointer, x, y, event) => {
      event?.stopPropagation();
      if (!this.isAnimating) this.closeOverlay();
    });
    this.dim.on('pointerup', () => { if (!this.isAnimating) this.closeOverlay(); });
    this.input.keyboard?.on('keydown-ESC', this.boundEscape);
    this.scale.on('resize', this.boundResize);
    this.events.once('shutdown', this.boundCleanup);
    this.events.once('destroy', this.boundCleanup);
    this.paper.add([this.paperBg, this.contentLayer]);
    this.root.add([this.dim, this.paper, this.closeBtn]);
    this.renderCityContent();
    this.resizeOverlay();
    this.openOverlay();
    if (this.type === 'daily') {
      import('../gameStatePersistence.js').then(module => module.requestAutosave())
        .catch(error => console.warn('[NewspaperOverlayScene] Autosave request failed:', error));
    }
  }
  resizeOverlay() {
    if (!this.paperBg?.scene) return;
    const { width, height } = this.scale;
    const layout = NewspaperLayoutConfig[this.type];
    const pageWidth = layout?.pageWidth || 1920;
    const pageHeight = layout?.pageHeight || 1080;
    this.paperBg.setPosition(0, 0).setDisplaySize(width, height);
    this.contentLayer.setPosition(0, 0).setScale(width / pageWidth, height / pageHeight);
    this.dim.setPosition(0, 0).setSize(width, height);
    this.dim.input?.hitArea?.setTo(0, 0, width, height);
    this.closeBtn.setPosition(width - 20, 20);
  }
  buildTemplateContext() {
    const mission = gameState.currentMission || {};
    const artifact = firstReadable(mission.artifact, mission.artifactName, gameState.currentArtifact);
    const city = firstReadable(mission.city, gameState.crimeCity);
    const location = firstReadable(mission.location, mission.museum);
    const context = {
      artifact, city, crimeCity: city, location,
      currentCity: firstReadable(gameState.currentCity),
      rank: firstReadable(gameState.playerRank) || 'Junior Agent', day: getNewspaperDay(gameState),
      clueCount: Array.isArray(gameState.cluesCollected) ? gameState.cluesCollected.length : 0,
      suspectCount: Array.isArray(gameState.caseSuspects) ? gameState.caseSuspects.length : 0,
      gameState
    };
    context.artefakt = context.artifact;
    context.miasto = context.city;
    return context;
  }
  renderCityContent() {
    this.contentLayer.removeAll(true);
    const cityData = this.resolveCityData(this.cache.json.get(this.jsonKey), this.cityId, this.type);
    const data = this.editionData || this.resolveArticles(cityData);
    this.editionData = data;
    this.layoutRenderer.render(this.contentLayer, { type: this.type, data });
  }
  missionArticleMatches(article, context) {
    const normalize = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const mission = gameState.currentMission || {};
    const city = firstReadable(mission.city, context.crimeCity);
    return article && (!article.missionCity || normalize(article.missionCity) === normalize(city)) &&
      (!article.missionArtifact || normalize(article.missionArtifact) === normalize(context.artifact));
  }
  resolveArticles(cityData) {
    if (this.type === 'time' || !Array.isArray(cityData.articles)) return cityData;
    const context = this.buildTemplateContext();
    if (this.type === 'daily') {
      return getDailyNewspaperEdition(gameState, cityData, { cityId: this.cityId, context });
    }
    const hasActiveCase = Boolean(gameState.isGameActive && context.artifact);
    const pools = {};
    for (const article of cityData.articles) {
      if (!article?.slotId) continue;
      (pools[article.slotId] ||= []).push(article);
    }
    const missionPool = hasActiveCase && Array.isArray(cityData.missionLead)
      ? cityData.missionLead.filter(article => this.missionArticleMatches(article, context)) : [];
    const picked = [];
    for (const [slotId, rawPool] of Object.entries(pools)) {
      let pool = rawPool;
      if (!hasActiveCase) {
        const filtered = rawPool.filter(article => !this.articleHasPlaceholders(article));
        if (filtered.length) pool = filtered;
      }
      const variant = slotId === 'lead' && missionPool.length
        ? this.pickVariant(missionPool, context.day, `${this.cityId}_mission_lead`)
        : this.pickVariant(pool, context.day, `${this.cityId}_${slotId}`);
      if (variant) picked.push(this.interpolateArticle(variant, context));
    }
    return { ...cityData, missionLead: missionPool, articles: picked };
  }
  articleHasPlaceholders(article) {
    return /\{[\w.]+\}/.test([
      article?.headline || '', article?.lead || '', article?.body || '', article?.imageCaption || ''
    ].join(' '));
  }
  pickVariant(pool, day, salt = '') {
    if (!Array.isArray(pool) || !pool.length) return null;
    const saltValue = String(salt).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return pool[(day * 31 + saltValue * 7) % pool.length];
  }
  fillTemplate(text, context) {
    if (typeof text !== 'string') return text;
    return text.replace(/\{([\w.]+)\}/g, (match, path) => {
      const value = path.split('.').reduce((v, key) => v == null ? undefined : v[key], context);
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      if (typeof value === 'boolean') return String(value);
      return readableText(value) || match;
    });
  }
  interpolateArticle(article, context) {
    return { ...article,
      headline: this.fillTemplate(article.headline, context),
      lead: this.fillTemplate(article.lead, context),
      body: this.fillTemplate(article.body, context),
      imageCaption: this.fillTemplate(article.imageCaption, context) };
  }
  resolveCityData(json, cityId, type) {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      throw new Error(`[NewspaperOverlayScene] Missing newspaper JSON for "${cityId}". Cache key: "${this.jsonKey}".`);
    }
    if (type === 'time') {
      const covers = Array.isArray(json.covers)
        ? json.covers.filter(cover => hasReadableCoverLines(cover?.coverLines)) : [];
      const cover = this.pickVariant(covers, this.buildTemplateContext().day, `${cityId}_time_cover`);
      const coverLines = cover?.coverLines || json.coverLines;
      if (!hasReadableCoverLines(coverLines)) {
        throw new Error(`[NewspaperOverlayScene] Newspaper "${this.jsonKey}" has no readable cover lines.`);
      }
      return { ...json, ...cover, title: cover?.title || json.title || 'TIME', coverLines: [...coverLines] };
    }
    if (!Array.isArray(json.articles)) {
      throw new Error(`[NewspaperOverlayScene] Newspaper "${this.jsonKey}" has no articles array.`);
    }
    return json;
  }
  playRustle(volume = 0.22) {
    if (!this.sound || !this.cache.audio?.exists || !this.cache.audio.exists('paper_rustle')) return;
    this.sound.play('paper_rustle', {
      volume, rate: Phaser.Math.FloatBetween(0.97, 1.03), detune: Phaser.Math.Between(-25, 25)
    });
  }
  openOverlay() {
    this.isAnimating = true;
    this.playRustle(0.24);
    EventBus.emit('hideHUD');
    this.dim.setAlpha(0);
    this.paper.setPosition(0, 0).setScale(1).setAlpha(0);
    this.closeBtn.setAlpha(0);
    this.tweens.add({ targets: [this.dim, this.paper, this.closeBtn], alpha: 1, duration: 240,
      ease: 'Quad.Out', onComplete: () => { this.isAnimating = false; } });
  }
  closeOverlay() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.playRustle(0.18);
    this.tweens.add({ targets: [this.dim, this.paper, this.closeBtn], alpha: 0, duration: 170,
      ease: 'Quad.In', onComplete: () => {
        this.dim.disableInteractive().setVisible(false);
        this.paper.setVisible(false);
        this.closeBtn.setVisible(false);
        this.isAnimating = false;
        this.scene.stop();
      } });
  }
  cleanupOverlay() {
    this.input.keyboard?.off('keydown-ESC', this.boundEscape);
    this.scale.off('resize', this.boundResize);
    this.events.off('shutdown', this.boundCleanup);
    this.events.off('destroy', this.boundCleanup);
    this.tweens.killTweensOf([this.dim, this.paper, this.closeBtn].filter(Boolean));
    this.root?.destroy(true);
    this.root = this.dim = this.paper = this.paperBg = this.closeBtn = this.contentLayer = this.layoutRenderer = null;
    this.editionData = null;
    this.isAnimating = false;
    EventBus.emit('showHUD');
  }
}
