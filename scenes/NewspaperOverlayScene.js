import { NewspaperLayout } from '../ui/NewspaperUI.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';

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
  }

  init(data) {
    this.cityId = data?.cityId || 'warsaw';
    this.type = data?.type || 'daily';
    this.backgroundKey = data?.backgroundKey || null;
    this.jsonKey = `newspaper_${this.type}_${this.cityId}`;
  }

  create() {
        super.create();
        this.scene.sleep('UIScene');
    const { width, height } = this.scale;

    this.layoutRenderer = new NewspaperLayout(this);

    // Główny kontener overlayu
    this.root = this.add.container(0, 0).setDepth(5000);

    // Przyciemnienie tła
    this.dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setInteractive();

    // Kontener gazety od (0,0)
    this.paper = this.add.container(0, 0);

    // Tło gazety
    this.paperBg = this.add.image(0, 0, this.backgroundKey || 'paper_placeholder_1920')
      .setOrigin(0, 0);

    // Warstwa z treścią również od (0,0)
    this.contentLayer = this.add.container(0, 0);

    // Przycisk zamknięcia w prawym górnym rogu ekranu
    this.closeBtn = this.add.text(width - 20, 20, 'X', {
      fontFamily: 'PressStart2P',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#111111',
      padding: { x: 12, y: 10 }
    })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.closeBtn.on('pointerup', () => {
      if (!this.isAnimating) {
        this.closeOverlay();
      }
    });

    // Klik w tło też zamyka
    this.dim.on('pointerup', () => {
      if (!this.isAnimating) {
        this.closeOverlay();
      }
    });

    // ESC zamyka
    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.isAnimating) {
        this.closeOverlay();
      }
    });

    // Składamy całość
    this.paper.add([this.paperBg, this.contentLayer, this.closeBtn]);
    this.root.add([this.dim, this.paper]);

    this.renderCityContent();
    this.openOverlay();
  }
buildTemplateContext() {
  const mission = gameState.currentMission || {};
  const thief = gameState.currentThief || {};

  // "dzień" gazety liczony z czasu gry (timeSpent = godziny)
  const day = Math.floor((gameState.timeSpent || 0) / 24) + 1;

  const context = {
    // --- sprawa ---
    artifact: gameState.currentArtifact || mission.artifact || '',
    city: gameState.crimeCity || mission.city || '',   // miasto KRADIEŻY, nie bieżące!
    crimeCity: gameState.crimeCity || '',
    location: mission.location || mission.museum || '', // sprawdź pola w missions.json!

    // --- gracz / stan gry ---
    currentCity: gameState.currentCity || '',
    rank: gameState.playerRank || 'Junior Agent',
    score: gameState.score || 0,
    day,
    hours: gameState.timeSpent || 0,
    clueCount: (gameState.cluesCollected || []).length,
    visitedCount: (gameState.visitedCities || []).length - 1, // bez HQ
    suspectCount: (gameState.caseSuspects || []).length,

    // --- złodziej (UWAGA: spoilery, patrz niżej) ---
    thiefName: thief.name || '',
    thiefAlias: thief.alias || '',

    // dot-path po całym stanie: {gameState.currentMission.artifact}
    gameState
  };

  // aliasy PL
  context.artefakt = context.artifact;
  context.miasto = context.city;

  return context;
}
renderCityContent() {
  this.contentLayer.removeAll(true);

  const json = this.cache.json.get(this.jsonKey);
  console.log('[NewspaperOverlayScene] rendering:', {
  cityId: this.cityId,
  type: this.type,
  jsonKey: this.jsonKey,
  title: json?.title,
  articleCount: json?.articles?.length || 0,
  hasMissionLead: Array.isArray(json?.missionLead)
  });

  const cityData = this.resolveCityData(json, this.cityId, this.type);
  const resolvedData = this.resolveArticles(cityData);

  this.layoutRenderer.render(this.contentLayer, {
    type: this.type,
    data: resolvedData
  });
}

// Wybiera po 1 wariancie z każdej puli slotów; podstawia missionLead, gdy jest aktywna sprawa
  resolveArticles(cityData) {
    if (this.type === 'time' || !Array.isArray(cityData.articles)) {
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

      /*
       * Przed rozpoczęciem sprawy nie losujemy tekstów,
       * które mają np. {artifact}, {location} lub {city}.
       */
      if (!hasActiveCase) {
        const articlesWithoutPlaceholders = rawPool.filter(article =>
          !this.articleHasPlaceholders(article)
        );

        if (articlesWithoutPlaceholders.length > 0) {
          pool = articlesWithoutPlaceholders;
        }
      }

      let variant;

      /*
       * Przy aktywnej sprawie lead bierze tekst z missionLead.
       * Pozostałe sloty nadal są losowane z articles.
       */
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
      .reduce((sum, character) => sum + character.charCodeAt(0), 0);

    const index = (day * 31 + saltValue * 7) % pool.length;

    return pool[index];
  }

  fillTemplate(text, context) {
    if (typeof text !== 'string') {
      return text;
    }

    return text.replace(/\{([\w.]+)\}/g, (match, path) => {
      const value = path.split('.').reduce((currentValue, key) => {
        if (currentValue === null || currentValue === undefined) {
          return undefined;
        }

        return currentValue[key];
      }, context);

      if (value !== null && value !== undefined && value !== '') {
        return String(value);
      }

      console.warn(
        `[NewspaperOverlayScene] Missing value for ${match}.`,
        {
          cityId: this.cityId,
          mission: gameState.currentMission
        }
      );

      return match;
    });
  }

  interpolateArticle(article, context) {
    return {
      ...article,
      headline: this.fillTemplate(article.headline, context),
      lead: this.fillTemplate(article.lead, context),
      body: this.fillTemplate(article.body, context),
      imageCaption: this.fillTemplate(article.imageCaption, context)
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
    if (!this.sound) return;
    if (!this.cache.audio?.exists || !this.cache.audio.exists('paper_rustle')) return;

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
    this.paper.setAlpha(0);
    this.paper.setPosition(0, 0);
    this.paper.setScale(0.95);

    this.tweens.add({
      targets: [this.dim, this.paper],
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      x: 0,
      y: 0,
      duration: 240,
      ease: 'Back.Out',
      onComplete: () => {
        this.isAnimating = false;
      }
    });
  }

  closeOverlay() {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.playRustle(0.18);
EventBus.emit('showHUD');
    this.tweens.add({
      targets: [this.dim, this.paper],
      alpha: 0,
      duration: 170,
      ease: 'Quad.In',
      onComplete: () => {
        this.dim.disableInteractive();
        this.dim.setVisible(false);
        this.paper.setVisible(false);

        this.isAnimating = false;
        this.scene.stop();
      }
    });
  }
}