import { NewspaperLayout } from '../ui/NewspaperUI.js';
import { NewspaperLayoutConfig } from '../NewspaperLayoutConfig.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';

function readableText(value, seen = new Set()) {
  if (typeof value === 'string') {
    const text = value.trim();

    if (
      !text ||
      text.toLowerCase().includes('[object object]')
    ) {
      return '';
    }

    return text;
  }

  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    seen.has(value)
  ) {
    return '';
  }

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

    this.boundEscape = () => {
      if (!this.isAnimating) {
        this.closeOverlay();
      }
    };

    this.boundResize = () => {
      this.resizeOverlay();
    };

    this.boundCleanup = () => {
      this.cleanupOverlay();
    };
  }

  init(data = {}) {
    this.cityId = data.cityId || 'warsaw';
    this.type = data.type || 'daily';
    this.backgroundKey = data.backgroundKey || null;
    this.jsonKey = `newspaper_${this.type}_${this.cityId}`;
    this.isAnimating = false;
  }

  create() {
    super.create();

    const { width, height } = this.scale;

    this.layoutRenderer = new NewspaperLayout(this);

    this.root = this.add
      .container(0, 0)
      .setDepth(5000)
      .setScrollFactor(0);

    this.dim = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setInteractive();

    this.paper = this.add.container(0, 0);

    this.paperBg = this.add
      .image(
        0,
        0,
        this.backgroundKey || 'paper_placeholder_1920'
      )
      .setOrigin(0, 0);

    this.contentLayer = this.add.container(0, 0);

    this.closeBtn = this.add
      .text(width - 20, 20, 'X', {
        fontFamily: 'PressStart2P',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#111111',
        padding: { x: 12, y: 10 }
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.closeBtn.on('pointerup', (pointer, x, y, event) => {
      event?.stopPropagation();

      if (!this.isAnimating) {
        this.closeOverlay();
      }
    });

    this.dim.on('pointerup', () => {
      if (!this.isAnimating) {
        this.closeOverlay();
      }
    });

    this.input.keyboard?.on(
      'keydown-ESC',
      this.boundEscape
    );

    this.scale.on('resize', this.boundResize);

    this.events.once('shutdown', this.boundCleanup);
    this.events.once('destroy', this.boundCleanup);

    this.paper.add([
      this.paperBg,
      this.contentLayer
    ]);

    this.root.add([
      this.dim,
      this.paper,
      this.closeBtn
    ]);

    this.renderCityContent();
    this.resizeOverlay();
    this.openOverlay();
  }

  resizeOverlay() {
    if (!this.paperBg?.scene) return;

    const { width, height } = this.scale;
    const layout = NewspaperLayoutConfig[this.type];

    const pageWidth = layout?.pageWidth || 1920;
    const pageHeight = layout?.pageHeight || 1080;

    this.paperBg
      .setPosition(0, 0)
      .setDisplaySize(width, height);

    this.contentLayer
      .setPosition(0, 0)
      .setScale(
        width / pageWidth,
        height / pageHeight
      );

    this.dim
      .setPosition(0, 0)
      .setSize(width, height);

    this.dim.input?.hitArea?.setTo(
      0,
      0,
      width,
      height
    );

    this.closeBtn.setPosition(width - 20, 20);
  }

  buildTemplateContext() {
    const mission = gameState.currentMission || {};

    const artifact = firstReadable(
      mission.artifact,
      mission.artifactName,
      gameState.currentArtifact
    );

    const city = firstReadable(
      gameState.crimeCity,
      mission.city
    );

    const location = firstReadable(
      mission.location,
      mission.museum
    );

    const day =
      Math.floor((gameState.timeSpent || 0) / 24) + 1;

    const context = {
      artifact,
      city,

      crimeCity: firstReadable(
        gameState.crimeCity,
        mission.city
      ),

      location,

      currentCity: firstReadable(
        gameState.currentCity
      ),

      rank: firstReadable(
        gameState.playerRank
      ) || 'Junior Agent',

      day,

      clueCount: Array.isArray(gameState.cluesCollected)
        ? gameState.cluesCollected.length
        : 0,

      suspectCount: Array.isArray(gameState.caseSuspects)
        ? gameState.caseSuspects.length
        : 0,

      gameState
    };

    context.artefakt = context.artifact;
    context.miasto = context.city;

    if (gameState.isGameActive && !artifact) {
      console.warn(
        '[NewspaperOverlayScene] Missing readable artifact name.',
        {
          missionArtifact: mission.artifact,
          missionArtifactName: mission.artifactName,
          currentArtifact: gameState.currentArtifact
        }
      );
    }

    return context;
  }

  renderCityContent() {
    this.contentLayer.removeAll(true);

    const json = this.cache.json.get(this.jsonKey);

    const cityData = this.resolveCityData(
      json,
      this.cityId,
      this.type
    );

    this.layoutRenderer.render(this.contentLayer, {
      type: this.type,
      data: this.resolveArticles(cityData)
    });
  }

  resolveArticles(cityData) {
    if (
      this.type === 'time' ||
      !Array.isArray(cityData.articles)
    ) {
      return cityData;
    }

    const context = this.buildTemplateContext();
    const day = context.day;

    const hasActiveCase = Boolean(
      gameState.isGameActive &&
      context.artifact
    );

    const pools = {};

    for (const article of cityData.articles) {
      if (!article?.slotId) continue;

      if (!pools[article.slotId]) {
        pools[article.slotId] = [];
      }

      pools[article.slotId].push(article);
    }

    const picked = [];

    for (const [slotId, rawPool] of Object.entries(pools)) {
      let pool = rawPool;

      if (!hasActiveCase) {
        const withoutPlaceholders = rawPool.filter(
          article => !this.articleHasPlaceholders(article)
        );

        if (withoutPlaceholders.length > 0) {
          pool = withoutPlaceholders;
        }
      }

      let variant;

      if (
        slotId === 'lead' &&
        hasActiveCase &&
        Array.isArray(cityData.missionLead) &&
        cityData.missionLead.length > 0
      ) {
        variant = this.pickVariant(
          cityData.missionLead,
          day,
          `${this.cityId}_mission_lead`
        );
      } else {
        variant = this.pickVariant(
          pool,
          day,
          `${this.cityId}_${slotId}`
        );
      }

      if (variant) {
        picked.push(
          this.interpolateArticle(variant, context)
        );
      }
    }

    return {
      ...cityData,
      articles: picked
    };
  }

  articleHasPlaceholders(article) {
    const text = [
      article?.headline || '',
      article?.lead || '',
      article?.body || '',
      article?.imageCaption || ''
    ].join(' ');

    return /\{[\w.]+\}/.test(text);
  }

  pickVariant(pool, day, salt = '') {
    if (!Array.isArray(pool) || pool.length === 0) {
      return null;
    }

    const saltValue = String(salt)
      .split('')
      .reduce(
        (sum, character) => sum + character.charCodeAt(0),
        0
      );

    return pool[
      (day * 31 + saltValue * 7) % pool.length
    ];
  }

  fillTemplate(text, context) {
    if (typeof text !== 'string') return text;

    return text.replace(
      /\{([\w.]+)\}/g,
      (match, path) => {
        const value = path
          .split('.')
          .reduce((currentValue, key) => {
            if (
              currentValue === null ||
              currentValue === undefined
            ) {
              return undefined;
            }

            return currentValue[key];
          }, context);

        if (
          typeof value === 'number' &&
          Number.isFinite(value)
        ) {
          return String(value);
        }

        if (typeof value === 'boolean') {
          return String(value);
        }

        const resolved = readableText(value);

        if (resolved) {
          return resolved;
        }

        console.warn(
          `[NewspaperOverlayScene] Missing readable value for ${match}.`,
          {
            cityId: this.cityId,
            value,
            mission: gameState.currentMission
          }
        );

        return match;
      }
    );
  }

  interpolateArticle(article, context) {
    return {
      ...article,

      headline: this.fillTemplate(
        article.headline,
        context
      ),

      lead: this.fillTemplate(
        article.lead,
        context
      ),

      body: this.fillTemplate(
        article.body,
        context
      ),

      imageCaption: this.fillTemplate(
        article.imageCaption,
        context
      )
    };
  }

  resolveCityData(json, cityId, type) {
    if (!json || typeof json !== 'object') {
      throw new Error(
        `[NewspaperOverlayScene] Missing newspaper JSON for "${cityId}". ` +
        `Cache key: "${this.jsonKey}".`
      );
    }

    if (type === 'time') {
      return {
        title: json.title || 'Time',

        coverLines: Array.isArray(json.coverLines)
          ? json.coverLines
          : []
      };
    }

    if (!Array.isArray(json.articles)) {
      throw new Error(
        `[NewspaperOverlayScene] Newspaper "${this.jsonKey}" has no articles array.`
      );
    }

    return json;
  }

  playRustle(volume = 0.22) {
    if (
      !this.sound ||
      !this.cache.audio?.exists ||
      !this.cache.audio.exists('paper_rustle')
    ) {
      return;
    }

    this.sound.play('paper_rustle', {
      volume,
      rate: Phaser.Math.FloatBetween(0.97, 1.03),
      detune: Phaser.Math.Between(-25, 25)
    });
  }

  openOverlay() {
    this.isAnimating = true;

    this.playRustle(0.24);
    EventBus.emit('hideHUD');

    this.dim.setAlpha(0);

    this.paper
      .setPosition(0, 0)
      .setScale(1)
      .setAlpha(0);

    this.closeBtn.setAlpha(0);

    this.tweens.add({
      targets: [
        this.dim,
        this.paper,
        this.closeBtn
      ],

      alpha: 1,
      duration: 240,
      ease: 'Quad.Out',

      onComplete: () => {
        this.isAnimating = false;
      }
    });
  }

  closeOverlay() {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.playRustle(0.18);

    this.tweens.add({
      targets: [
        this.dim,
        this.paper,
        this.closeBtn
      ],

      alpha: 0,
      duration: 170,
      ease: 'Quad.In',

      onComplete: () => {
        this.dim
          .disableInteractive()
          .setVisible(false);

        this.paper.setVisible(false);
        this.closeBtn.setVisible(false);

        this.isAnimating = false;
        this.scene.stop();
      }
    });
  }

  cleanupOverlay() {
    this.input.keyboard?.off(
      'keydown-ESC',
      this.boundEscape
    );

    this.scale.off(
      'resize',
      this.boundResize
    );

    this.events.off(
      'shutdown',
      this.boundCleanup
    );

    this.events.off(
      'destroy',
      this.boundCleanup
    );

    this.tweens.killTweensOf(
      [
        this.dim,
        this.paper,
        this.closeBtn
      ].filter(Boolean)
    );

    this.root?.destroy(true);

    this.root = null;
    this.dim = null;
    this.paper = null;
    this.paperBg = null;
    this.closeBtn = null;
    this.contentLayer = null;
    this.layoutRenderer = null;

    this.isAnimating = false;

    EventBus.emit('showHUD');
  }
}