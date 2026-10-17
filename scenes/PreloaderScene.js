import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';

import {
  NEWSPAPER_CONFIG
} from '../assets/data/newspaperConfig.js';

import { EventBus } from '../EventBus.js';

import {
  loadSuspectData,
  setSuspectData
} from '../suspects/suspectDataProvider.js';

const IMAGE_GROUPS = [
  'backgrounds',
  'npcPortraits',
  'ui',
  'artifacts',
  'newspapers',
  'suspects',
  'wantedPosters',
  'suspectThumbnails',
  'csi',
  'portraits'
];

export class PreloaderScene extends BaseScene {
  constructor() {
    super({ key: 'PreloaderScene' });

    this._runToken = null;
    this._resetLoadingState();
  }

  _resetLoadingState() {
    this.fillingLevel = 0;
    this.tipIndex = -1;

    this.tipTimer = null;
    this.dotsTimer = null;

    this.loadingReady = false;
    this.audioArmed = false;
    this.startBtn = null;

    this.fullCupImage = null;
    this.uiRefs = null;
    this.loadingStatusText = null;

    this.loadErrors = [];
    this.lastLoadingStatus = '';
    this._lastStatusAt = -Infinity;

    this._dots = '';
    this._phase = 'initial';
    this._providerReady = false;
    this._assetsReady = false;
    this._finishing = false;
    this._manifestMissing = false;

    this.newspaperImagesQueued = false;

    this._queuedAssets = new Map();
    this._unlockHandler = null;
  }

  preload() {
    this._resetLoadingState();
    this._runToken = Symbol('preloader-run');

    this._removeLoaderListeners();

    this.load.on(
      'loaderror',
      this._onLoadError,
      this
    );

    this.load.on(
      'progress',
      this._onProgress,
      this
    );

    this.load.on(
      'filecomplete',
      this._onFileComplete,
      this
    );

    this.load.on(
      'complete',
      this._onLoadComplete,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this._cleanupPreloader,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this._cleanupPreloader,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this._cleanupPreloader,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this._cleanupPreloader,
      this
    );

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height * 0.5;

    this._createPreloadBackground(width, height);
    this.createCoffeeTextures();

    this._setupLoadingUI(
      centerX,
      centerY,
      centerX - 100,
      centerY + 100,
      width,
      height
    );

    const manifest =
      this.cache.json.get('assetManifest');

    if (!manifest) {
      this._manifestMissing = true;

      this._showLoadingError(
        'Case file missing. Please reload the game.'
      );

      console.error(
        '[PreloaderScene] assetManifest is missing.'
      );

      return;
    }

    this._loadAssetsFromManifest(manifest);
    this.preloadNewspapers();
  }

  async create() {
    super.create();

    const token = this._runToken;

    EventBus.emit('hideHUD');
    audioManager.init(this);
    this._setupAudioUnlock();

    if (this._manifestMissing) {
      return;
    }

    if (this.loadErrors.length > 0) {
      console.warn(
        `[PreloaderScene] ${this.loadErrors.length} asset(s) failed to load.`,
        this.loadErrors
      );
    }

    this.onNewspaperJsonsLoaded();

    try {
      const cached =
        this.cache.json.get('suspectData');

      if (cached !== undefined && cached !== null) {
        setSuspectData(cached);
      } else {
        console.warn(
          '[PreloaderScene] suspectData is missing from cache. ' +
          'Trying the provider fallback.'
        );

        await loadSuspectData(
          'assets/data/suspectData.json'
        );
      }

      if (
        this._runToken !== token ||
        this._cleanupDone
      ) {
        return;
      }

      this._providerReady = true;
      this.finishLoading();
    } catch (error) {
      if (
        this._runToken !== token ||
        this._cleanupDone
      ) {
        return;
      }

      console.error(
        '[PreloaderScene] Suspect data initialization failed:',
        error
      );

      this._showLoadingError(
        'Suspect files could not be opened. Please reload.'
      );
    }
  }

  _reserveAsset(type, key, url) {
    if (!key || !url) {
      console.warn(
        `[PreloaderScene] Invalid ${type} entry:`,
        { key, url }
      );

      return false;
    }

    const id = `${type}:${key}`;

    if (this._queuedAssets.has(id)) {
      const previousUrl = this._queuedAssets.get(id);

      if (
        JSON.stringify(previousUrl) !==
        JSON.stringify(url)
      ) {
        console.warn(
          `[PreloaderScene] Conflicting URLs for "${id}". ` +
          'Keeping the first entry.',
          {
            previousUrl,
            ignoredUrl: url
          }
        );
      }

      return false;
    }

    this._queuedAssets.set(id, url);
    return true;
  }

  _loadAssetsFromManifest(manifest) {
    for (const group of IMAGE_GROUPS) {
      this._loadImageGroup(manifest[group]);
    }

    this._loadAudioGroup(manifest.audio);
    this._loadJsonGroup(manifest.json);
    this._loadTilemapGroup(manifest.tilemaps);
    this._loadVideoGroup(manifest.videos);
    this._loadCssGroup(manifest.css);
    this._loadHtmlGroup(manifest.html);
  }

  _loadImageGroup(assets = []) {
    for (const { key, url } of assets) {
      if (
        !this._reserveAsset('image', key, url) ||
        this.textures.exists(key)
      ) {
        continue;
      }

      this.load.image(key, url);
    }
  }

  _loadAudioGroup(assets = []) {
    for (const { key, url } of assets) {
      if (
        !this._reserveAsset('audio', key, url) ||
        this.cache.audio.exists(key)
      ) {
        continue;
      }

      this.load.audio(key, url);
    }
  }

  _loadJsonGroup(assets = []) {
    for (const { key, url } of assets) {
      this._queueJson(key, url);
    }
  }

  _queueJson(key, url) {
    if (
      !this._reserveAsset('json', key, url) ||
      this.cache.json.exists(key)
    ) {
      return false;
    }

    this.load.json(key, url);
    return true;
  }

  _loadTilemapGroup(assets = []) {
    for (const { key, url } of assets) {
      if (
        !this._reserveAsset('tilemap', key, url) ||
        this.cache.tilemap.exists(key)
      ) {
        continue;
      }

      this.load.tilemapTiledJSON(key, url);
    }
  }

  _loadVideoGroup(assets = []) {
    for (const video of assets) {
      const {
        key,
        url,
        loadEvent,
        noAudio = false,
        asBlob = false
      } = video;

      if (
        !this._reserveAsset('video', key, url) ||
        this.cache.video.exists(key)
      ) {
        continue;
      }

      if (loadEvent) {
        this.load.video(
          key,
          url,
          loadEvent,
          noAudio,
          asBlob
        );
      } else {
        this.load.video(key, url, asBlob);
      }
    }
  }

  _loadCssGroup(assets = []) {
    for (const { key, url } of assets) {
      if (!this._reserveAsset('css', key, url)) {
        continue;
      }

      const absoluteUrl =
        new URL(url, document.baseURI).href;

      const alreadyLinked = [
        ...document.querySelectorAll(
          'link[rel~="stylesheet"][href]'
        )
      ].some(link => link.href === absoluteUrl);

      if (alreadyLinked) {
        continue;
      }

      this.load.css(key, url);
    }
  }

  _loadHtmlGroup(assets = []) {
    for (const { key, url } of assets) {
      if (
        !this._reserveAsset('html', key, url) ||
        this.cache.html.exists(key)
      ) {
        continue;
      }

      this.load.html(key, url);
    }
  }

  preloadNewspapers() {
    for (const [type, config] of Object.entries(
      NEWSPAPER_CONFIG
    )) {
      for (const cityId of config.cities) {
        this._queueJson(
          `newspaper_${type}_${cityId}`,
          `assets/data/newspapers/${type}/${cityId}.json`
        );
      }
    }
  }

  collectNewspaperItems() {
    const items = [];

    for (const [type, config] of Object.entries(
      NEWSPAPER_CONFIG
    )) {
      for (const cityId of config.cities) {
        const key =
          `newspaper_${type}_${cityId}`;

        const data = this.cache.json.get(key);

        if (!data) {
          console.warn(
            `[PreloaderScene] Missing newspaper JSON: ${key}`
          );

          continue;
        }

        if (Array.isArray(data.missionLead)) {
          items.push(...data.missionLead);
        } else if (data.missionLead) {
          items.push(data.missionLead);
        }

        if (Array.isArray(data.articles)) {
          items.push(...data.articles);
        }
      }
    }

    return items;
  }

  onNewspaperJsonsLoaded() {
    if (this.newspaperImagesQueued) {
      return;
    }

    this.newspaperImagesQueued = true;

    const items = [
      ...new Map(
        this.collectNewspaperItems()
          .filter(item => item?.imageKey)
          .map(item => [item.imageKey, item])
      ).values()
    ];

    let queued = false;

    for (const item of items) {
      const key = item.imageKey;

      const url =
        item.imageUrl ||
        `assets/newspapers/newspapers/${key}.jpg`;

      if (
        !this._reserveAsset('image', key, url) ||
        this.textures.exists(key)
      ) {
        continue;
      }

      this.load.image(key, url);
      queued = true;
    }

    if (!queued) {
      this._assetsReady = true;
      this.finishLoading();
      return;
    }

    this._phase = 'newspaper-images';
    this.load.start();
  }

  _onLoadError(file) {
    const entry = {
      key: file?.key,
      url: file?.url
    };

    this.loadErrors.push(entry);

    console.error(
      '[PreloaderScene] Failed to load:',
      entry
    );
  }

  _onProgress(value) {
    const progress = Phaser.Math.Clamp(
      Number(value) || 0,
      0,
      1
    );

    const combined =
      this._phase === 'newspaper-images'
        ? 0.85 + progress * 0.15
        : progress * 0.85;

    this.fillingLevel = Math.max(
      this.fillingLevel,
      combined
    );

    this.updateCoffeeMask(this.fillingLevel);
    this._refreshLoadingTitle();
  }

  _onFileComplete(key, type) {
    if (
      !this.loadingStatusText?.active ||
      this._finishing
    ) {
      return;
    }

    const now = this.time.now;

    if (now - this._lastStatusAt < 300) {
      return;
    }

    const nextStatus = this.getLoadingStatus({
      key,
      type
    });

    if (nextStatus === this.lastLoadingStatus) {
      return;
    }

    this._lastStatusAt = now;
    this.lastLoadingStatus = nextStatus;

    this.loadingStatusText.setText(nextStatus);
  }

  _onLoadComplete() {
    if (this._phase !== 'newspaper-images') {
      return;
    }

    this._assetsReady = true;
    this.finishLoading();
  }

  _removeLoaderListeners() {
    this.load.off(
      'loaderror',
      this._onLoadError,
      this
    );

    this.load.off(
      'progress',
      this._onProgress,
      this
    );

    this.load.off(
      'filecomplete',
      this._onFileComplete,
      this
    );

    this.load.off(
      'complete',
      this._onLoadComplete,
      this
    );
  }

  getLoadingStatus(file) {
    const key = String(file?.key || '');
    const type = file?.type || '';

    if (key.startsWith('newspaper_')) {
      return 'Reading tomorrow’s questionable headlines...';
    }

    if (type === 'audio') {
      return 'Tuning the office radio to maximum melodrama...';
    }

    if (type === 'json') {
      const statusesJson = this.cache.json.get('statusesData');
      if (statusesJson && statusesJson.statuses) {
        return Phaser.Utils.Array.GetRandom(statusesJson.statuses);
      }
      return 'Cross-examining confidential case files...';
    }

    if (String(type).toLowerCase().includes('tilemap')) {
      return 'Drawing a map no detective will fold correctly...';
    }

    if (type === 'video') {
      return 'Developing surveillance footage in a dark room...';
    }

    if (type === 'image') {
      return 'Developing suspicious photographs...';
    }

    if (type === 'html' || type === 'css') {
      return 'Straightening the office wallpaper...';
    }

    const statusesJson = this.cache.json.get('statusesData');
    if (statusesJson && statusesJson.statuses) {
      return Phaser.Utils.Array.GetRandom(statusesJson.statuses);
    }

    return 'Loading...';
  }

  _createPreloadBackground(width, height) {
    if (this.textures.exists('cozyBackground')) {
      this.add.image(
        width / 2,
        height / 2,
        'cozyBackground'
      )
        .setDisplaySize(width, height)
        .setDepth(-10);

      return;
    }

    this.cameras.main.setBackgroundColor('#101010');
  }

  _createScanlines(width, height) {
    const key =
      `preloader_scanlines_${width}_${height}`;

    if (!this.textures.exists(key)) {
      const graphics = this.make.graphics({
        x: 0,
        y: 0,
        add: false
      });

      graphics.fillStyle(0x000000, 0.05);

      for (let y = 0; y < height; y += 4) {
        graphics.fillRect(0, y, width, 2);
      }

      graphics.generateTexture(
        key,
        width,
        height
      );

      graphics.destroy();
    }

    return this.add.image(0, 0, key)
      .setOrigin(0)
      .setAlpha(0.22);
  }

  _setupLoadingUI(
    centerX,
    centerY,
    cupX,
    cupY,
    width,
    height
  ) {
    const shadow = this.add.ellipse(
      cupX,
      cupY + 50,
      90,
      20,
      0x000000,
      0.28
    );

    const vignetteTop = this.add.rectangle(
      centerX,
      0,
      width,
      120,
      0x000000,
      0.22
    ).setOrigin(0.5, 0);

    const vignetteBottom = this.add.rectangle(
      centerX,
      height,
      width,
      150,
      0x000000,
      0.24
    ).setOrigin(0.5, 1);

    const scanlineOverlay =
      this._createScanlines(width, height);

    this.fullCupImage = this.add.image(
      cupX + 20,
      cupY + 10,
      'cup_coffee'
    );

    this.updateCoffeeMask(0);

    this.add.image(
      cupX + 20,
      cupY + 10,
      'cup_outline'
    );

    const titleText = this.add.text(
      centerX,
      centerY - 145,
      'MAKING COFFEE 0%',
      {
        fontFamily: '"PressStart2P", monospace',
        fontSize: '28px',
        color: '#f4ebd9',
        align: 'center'
      }
    ).setOrigin(0.5);

    const statusPanel = this.add.rectangle(
      centerX,
      centerY - 82,
      Math.min(width * 0.72, 920),
      66,
      0x101010,
      0.72
    )
      .setStrokeStyle(2, 0xc9aa70, 0.8)
      .setOrigin(0.5);

    const statusLabel = this.add.text(
      centerX,
      centerY - 103,
      'CASE FILE STATUS',
      {
        fontFamily: '"PressStart2P", monospace',
        fontSize: '12px',
        color: '#c9aa70',
        align: 'center'
      }
    ).setOrigin(0.5);

    this.loadingStatusText = this.add.text(
      centerX,
      centerY - 75,
      'Opening the case file...',
      {
        fontFamily: '"SpecialElite", monospace',
        fontSize: '24px',
        color: '#f4ebd9',
        align: 'center',
        wordWrap: {
          width: Math.min(width * 0.64, 820)
        }
      }
    ).setOrigin(0.5);

    const tipText = this.add.text(
      centerX,
      centerY + 450,
      this.getNextTip(),
      {
        fontFamily: '"PressStart2P", monospace',
        fontSize: '24px',
        color: '#f4ebd9',
        align: 'center',
        wordWrap: {
          width: width * 0.72
        },
        lineSpacing: 8
      }
    ).setOrigin(0.5);

    this.uiRefs = {
      titleText,
      tipText,
      shadow,
      vignetteTop,
      vignetteBottom,
      scanlineOverlay,
      statusPanel,
      statusLabel,
      loadingStatusText: this.loadingStatusText
    };

    const tipY = tipText.y;

    this.tipTimer = this.time.addEvent({
      delay: 3200,
      loop: true,

      callback: () => {
        if (
          !tipText.active ||
          this._finishing ||
          this._cleanupDone
        ) {
          return;
        }

        this.createTrackedTween({
          targets: tipText,
          alpha: 0,
          y: tipY - 8,
          duration: 180,

          onComplete: () => {
            if (
              !tipText.active ||
              this._finishing ||
              this._cleanupDone
            ) {
              return;
            }

            tipText
              .setText(this.getNextTip())
              .setY(tipY + 8);

            this.createTrackedTween({
              targets: tipText,
              alpha: 1,
              y: tipY,
              duration: 220,
              ease: 'Quad.out'
            });
          }
        });
      }
    });

    this.dotsTimer = this.time.addEvent({
      delay: 350,
      loop: true,

      callback: () => {
        this._dots =
          this._dots.length >= 3
            ? ''
            : `${this._dots}.`;

        this._refreshLoadingTitle();
      }
    });
  }

  _refreshLoadingTitle() {
    const title = this.uiRefs?.titleText;

    if (!title?.active) {
      return;
    }

    title.setText(
      `MAKING COFFEE${this._dots} ` +
      `${Math.round(this.fillingLevel * 100)}%`
    );
  }

  updateCoffeeMask(fillLevel) {
    if (!this.fullCupImage?.active) {
      return;
    }

    const fill = Phaser.Math.Clamp(
      Number(fillLevel) || 0,
      0,
      1
    );

    const width = this.fullCupImage.width;
    const height = this.fullCupImage.height;
    const visibleHeight = height * fill;

    this.fullCupImage.setCrop(
      0,
      height - visibleHeight,
      width,
      visibleHeight
    );
  }

  finishLoading() {
    if (
      this._cleanupDone ||
      this._finishing ||
      !this._assetsReady ||
      !this._providerReady
    ) {
      return;
    }

    this._finishing = true;
    this.loadingReady = true;
    this.fillingLevel = 1;

    this.updateCoffeeMask(1);
    this._refreshLoadingTitle();
    this._clearLoadingTimers();
    this._removeLoaderListeners();

    if (this.loadingStatusText?.active) {
      this.loadingStatusText.setText(
        'Case file complete. Coffee approved for detective use.'
      );
    }

    const targets = Object.values(
      this.uiRefs ?? {}
    ).filter(target => target?.active);

    for (const target of targets) {
      this.killTrackedTweensOf(target);
    }

    if (!targets.length) {
      this.tryShowStartButton();
      return;
    }

    this.createTrackedTween({
      targets,
      alpha: 0,
      duration: 650,
      ease: 'Quad.out',

      onComplete: () => {
        if (this._cleanupDone) {
          return;
        }

        for (const target of targets) {
          if (target.active) {
            target.destroy();
          }
        }

        this.uiRefs = null;
        this.loadingStatusText = null;

        this.tryShowStartButton();
      }
    });
  }

  _showLoadingError(message) {
    this._clearLoadingTimers();

    if (this.loadingStatusText?.active) {
      this.loadingStatusText
        .setText(message)
        .setColor('#ffb4a2');
    }
  }

  _setupAudioUnlock() {
    if (this.audioArmed || this._unlockHandler) {
      return;
    }

    if (!this.sound.locked) {
      this.audioArmed = true;
      return;
    }

    this._unlockHandler = () => {
      this.sound.unlock?.();
      this.audioArmed = !this.sound.locked;

      this._removeAudioUnlockListeners();
    };

    this.trackInputEvent(
      this.input,
      'pointerdown',
      this._unlockHandler
    );

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown',
        this._unlockHandler
      );
    }
  }

  _removeAudioUnlockListeners() {
    if (!this._unlockHandler) {
      return;
    }

    this.offTrackedInputEvent(
      this.input,
      'pointerdown',
      this._unlockHandler
    );

    if (this.input.keyboard) {
      this.offTrackedInputEvent(
        this.input.keyboard,
        'keydown',
        this._unlockHandler
      );
    }

    this._unlockHandler = null;
  }

  tryShowStartButton() {
    if (
      this._cleanupDone ||
      !this.loadingReady ||
      this.startBtn
    ) {
      return;
    }

    if (!this.textures.exists('btnStart')) {
      console.error(
        '[PreloaderScene] btnStart is missing.'
      );

      this.add.text(
        this.scale.width / 2,
        this.scale.height * 0.8,
        'Start button could not be loaded. Please reload.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '24px',
          color: '#ffb4a2',
          align: 'center'
        }
      ).setOrigin(0.5);

      return;
    }

    this.startBtn = this.add.image(
      this.scale.width / 2,
      this.scale.height * 0.8,
      'btnStart'
    )
      .setInteractive({ useHandCursor: true })
      .setScale(0.8);

    this.addHoverEffect(
      this.startBtn,
      0.8,
      0.9
    );

    this.startBtn.on(
      'pointerdown',
      this._handleStart,
      this
    );
  }

  async _handleStart() {
    const button = this.startBtn;

    if (
      this._cleanupDone ||
      !button?.active ||
      !button.input?.enabled
    ) {
      return;
    }

    const token = this._runToken;

    button.disableInteractive();

    this.sound.unlock?.();

    const mobileFS = this.registry.get('mobileFS');

    if (mobileFS) {
      try {
        await mobileFS.enterFullscreenLandscape();
      } catch (error) {
        console.warn(
          '[PreloaderScene] Fullscreen unavailable. Continuing.',
          error
        );
      }
    }

    if (
      this._runToken !== token ||
      this._cleanupDone
    ) {
      return;
    }

    this.startThemeMusic();

    const started = await this.goto('EnterScene');

    if (
      !started &&
      this._runToken === token &&
      !this._cleanupDone &&
      button.active
    ) {
      button.setInteractive({
        useHandCursor: true
      });
    }
  }

  startThemeMusic() {
    if (audioManager.isMusicPlaying('themeMusic')) {
      return;
    }

    audioManager.fadeInMusic(
      'themeMusic',
      { loop: true },
      600
    );
  }

  getNextTip() {
    const tipsData = this.cache.json.get('tipsData');
    const tips = tipsData?.tips;

    if (!tips?.length) {
      return 'Following the evidence...';
    }

    let index = Phaser.Math.Between(
      0,
      tips.length - 1
    );

    while (
      tips.length > 1 &&
      index === this.tipIndex
    ) {
      index = Phaser.Math.Between(
        0,
        tips.length - 1
      );
    }

    this.tipIndex = index;
    return tips[index];
  }

  addHoverEffect(
    button,
    baseScale = 0.8,
    hoverScale = 0.9
  ) {
    button.on('pointerover', () => {
      if (button.active) {
        button.setScale(hoverScale);
      }
    });

    button.on('pointerout', () => {
      if (button.active) {
        button.setScale(baseScale);
      }
    });
  }

  createCoffeeTextures() {
    if (!this.textures.exists('cup_outline')) {
      const graphics = this.make.graphics({
        x: 0,
        y: 0,
        add: false
      });

      graphics.fillStyle(0xffffff, 0.08);
      graphics.fillRoundedRect(
        10, 10, 80, 90,
        { tl: 6, tr: 6, bl: 24, br: 24 }
      );

      graphics.lineStyle(4, 0xe2f1f8, 0.5);
      graphics.strokeCircle(95, 55, 17);

      graphics.lineStyle(2, 0xffffff, 0.8);
      graphics.strokeCircle(94, 53, 15);

      graphics.lineStyle(3, 0xd8ecf8, 0.75);
      graphics.strokeRoundedRect(
        10, 10, 80, 90,
        { tl: 6, tr: 6, bl: 24, br: 24 }
      );

      graphics.lineStyle(2, 0xffffff, 0.9);
      graphics.strokeRoundedRect(
        10, 8, 80, 8, 4
      );

      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillRoundedRect(
        16, 18, 5, 72, 2
      );

      graphics.fillStyle(0xffffff, 0.2);
      graphics.fillRoundedRect(
        82, 60, 3, 30, 1
      );

      graphics.generateTexture(
        'cup_outline',
        125,
        110
      );

      graphics.destroy();
    }

    if (!this.textures.exists('cup_coffee')) {
      const graphics = this.make.graphics({
        x: 0,
        y: 0,
        add: false
      });

      graphics.fillStyle(0x3d2314, 0.95);
      graphics.fillRoundedRect(
        14, 20, 72, 78,
        { tl: 2, tr: 2, bl: 20, br: 20 }
      );

      graphics.fillStyle(0x5a351e, 0.9);
      graphics.fillRect(14, 20, 72, 35);

      graphics.fillStyle(0xd7a15c, 1);
      graphics.fillRoundedRect(
        14, 18, 72, 10, 5
      );

      graphics.fillStyle(0xf7e8d3, 0.9);
      graphics.fillRoundedRect(
        30, 19, 40, 6, 3
      );

      graphics.fillStyle(0xfff7ed, 1);
      graphics.fillCircle(45, 21, 5);
      graphics.fillCircle(55, 21, 5);
      graphics.fillTriangle(
        39, 22, 61, 22, 50, 29
      );

      graphics.generateTexture(
        'cup_coffee',
        125,
        110
      );

      graphics.destroy();
    }
  }

  _clearLoadingTimers() {
    this.tipTimer?.remove(false);
    this.dotsTimer?.remove(false);

    this.tipTimer = null;
    this.dotsTimer = null;
  }

  _cleanupPreloader() {
    this._runToken = null;

    this._clearLoadingTimers();
    this._removeLoaderListeners();
    this._removeAudioUnlockListeners();

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this._cleanupPreloader,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this._cleanupPreloader,
      this
    );

    this.fullCupImage = null;
    this.uiRefs = null;
    this.startBtn = null;
    this.loadingStatusText = null;

    this._queuedAssets.clear();
  }

  shutdown() {
    this._cleanupPreloader();
    super.shutdown();
  }
}