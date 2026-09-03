import { audioManager } from '../AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { NEWSPAPER_CONFIG } from '../assets/data/newspaperConfig.js';
import { EventBus } from '../EventBus.js';
import { loadSuspectData } from '../suspects/suspectDataProvider.js';

export class PreloaderScene extends BaseScene {
    constructor() {
        super({ key: 'PreloaderScene' });

        this.fillingLevel = 0;
        this.tipIndex = -1;

        this.tipTimer = null;
        this.dotsTimer = null;

        this.loadingReady = false;
        this.audioArmed = false;
        this.startBtn = null;

        this.coffeeMask = null;
        this.fullCupImage = null;
        this.uiRefs = null;

        this.loadErrors = [];
        this.newspaperImagesQueued = false;
        this.loadingStatusText = null;
this.lastLoadingStatus = '';
this.loadingStatusQueue = [
    'Convincing boss this is definitely not our fault...',
    'Bribing the asset clerk with a biscuit...',
    'Checking every file for a fake moustache...',
    'Interrogating suspicious artefacts...',
    'Locating the missing page from the case file...',
    'Polishing the magnifying glass...',
    'Comparing coffee stains to the evidence...',
    'Asking the intern where the missing sprites went...',
    'Measuring one suspiciously dramatic footprint...',
    'Filing paperwork nobody will ever read...',
    'Teaching the loader basic detective etiquette...'
];
    }

    preload() {
        this.load.on('loaderror', (file) => {
            console.error(
                `[PreloaderScene] Failed to load: ${file.key} → ${file.url}`
            );

            this.loadErrors.push({
                key: file.key,
                url: file.url
            });
        });

        const manifest = this.cache.json.get('assetManifest');

        if (!manifest) {
            console.error(
                '[PreloaderScene] assetManifest is missing. ' +
                'Load assets/data/assetManifest.json in BootScene first.'
            );

            return;
        }

        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height * 0.5;
        const cupX = centerX - 100;
        const cupY = centerY + 100;

        this._createPreloadBackground(width, height);
        this.createCoffeeTextures();

        this._loadAssetsFromManifest(manifest);
        this.preloadNewspapers();

        this._setupLoadingUI(
            centerX,
            centerY,
            cupX,
            cupY,
            width,
            height
        );

        this.load.once('complete', () => {
            this.onNewspaperJsonsLoaded();
        });
    }

    _createPreloadBackground(width, height) {
        if (this.textures.exists('cozyBackground')) {
            this.add.image(width / 2, height / 2, 'cozyBackground')
                .setDisplaySize(width, height)
                .setDepth(-10);

            return;
        }

        this.cameras.main.setBackgroundColor('#101010');
    }

    _loadAssetsFromManifest(manifest) {
        this._loadImageGroup(manifest.backgrounds);
        this._loadImageGroup(manifest.npcPortraits);
        this._loadImageGroup(manifest.ui);
        this._loadImageGroup(manifest.artifacts);
        this._loadImageGroup(manifest.newspapers);
        this._loadImageGroup(manifest.suspects);
        this._loadImageGroup(manifest.wantedPosters);
        this._loadImageGroup(manifest.suspectThumbnails);
        this._loadImageGroup(manifest.csi);
        this._loadImageGroup(manifest.portraits);

        this._loadAudioGroup(manifest.audio);
        this._loadJsonGroup(manifest.json);
        this._loadTilemapGroup(manifest.tilemaps);
        this._loadVideoGroup(manifest.videos);
        this._loadCssGroup(manifest.css);
        this._loadHtmlGroup(manifest.html);
    }

    _loadImageGroup(assets = []) {
        assets.forEach(({ key, url }) => {
            if (!key || !url) {
                console.warn('[PreloaderScene] Invalid image manifest entry:', {
                    key,
                    url
                });
                return;
            }

            if (this.textures.exists(key)) {
                return;
            }

            this.load.image(key, url);
        });
    }

    _loadAudioGroup(assets = []) {
        assets.forEach(({ key, url }) => {
            if (!key || !url) {
                console.warn('[PreloaderScene] Invalid audio manifest entry:', {
                    key,
                    url
                });
                return;
            }

            if (this.cache.audio.exists(key)) {
                return;
            }

            this.load.audio(key, url);
        });
    }

    _loadJsonGroup(assets = []) {
        assets.forEach(({ key, url }) => {
            if (!key || !url) {
                console.warn('[PreloaderScene] Invalid JSON manifest entry:', {
                    key,
                    url
                });
                return;
            }

            if (this.cache.json.exists(key)) {
                return;
            }

            this.load.json(key, url);
        });
    }

    _loadTilemapGroup(assets = []) {
        assets.forEach(({ key, url }) => {
            if (!key || !url) {
                console.warn('[PreloaderScene] Invalid tilemap manifest entry:', {
                    key,
                    url
                });
                return;
            }

            if (this.cache.tilemap.exists(key)) {
                return;
            }

            this.load.tilemapTiledJSON(key, url);
        });
    }

    _loadVideoGroup(assets = []) {
        assets.forEach((video) => {
            const {
                key,
                url,
                loadEvent,
                noAudio = false,
                asBlob = false
            } = video;

            if (!key || !url) {
                console.warn(
                    '[PreloaderScene] Invalid video manifest entry:',
                    video
                );
                return;
            }

            if (this.cache.video.exists(key)) {
                return;
            }

            if (loadEvent) {
                this.load.video(key, url, loadEvent, noAudio, asBlob);
                return;
            }

            this.load.video(key, url, asBlob);
        });
    }

    _loadCssGroup(assets = []) {
        assets.forEach(({ key, url }) => {
            if (!key || !url) {
                console.warn('[PreloaderScene] Invalid CSS manifest entry:', {
                    key,
                    url
                });
                return;
            }

            this.load.css(key, url);
        });
    }

    _loadHtmlGroup(assets = []) {
        assets.forEach(({ key, url }) => {
            if (!key || !url) {
                console.warn('[PreloaderScene] Invalid HTML manifest entry:', {
                    key,
                    url
                });
                return;
            }

            if (this.cache.html.exists(key)) {
                return;
            }

            this.load.html(key, url);
        });
    }
getLoadingStatus(file) {
    const key = file?.key || '';
    const type = file?.type || '';

    if (key.startsWith('newspaper_')) {
        return 'Reading tomorrow’s questionable headlines...';
    }

    if (key.includes('themeMusic') || type === 'audio') {
        return 'Tuning the office radio to maximum melodrama...';
    }

    if (type === 'json') {
        return 'Cross-examining confidential case files...';
    }

    if (type === 'tilemapTiledJSON') {
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

    return Phaser.Utils.Array.GetRandom(this.loadingStatusQueue);
}
    preloadNewspapers() {
        for (const [type, config] of Object.entries(NEWSPAPER_CONFIG)) {
            for (const cityId of config.cities) {
                const cacheKey = `newspaper_${type}_${cityId}`;

                if (this.cache.json.exists(cacheKey)) {
                    continue;
                }

                this.load.json(
                    cacheKey,
                    `assets/data/newspapers/${type}/${cityId}.json`
                );
            }
        }
    }

    onNewspaperJsonsLoaded() {
        if (this.newspaperImagesQueued) {
            return;
        }

        this.newspaperImagesQueued = true;

        const allItems = this.collectNewspaperItems();

        const uniqueItems = [
            ...new Map(
                allItems
                    .filter((item) => item?.imageKey)
                    .map((item) => [item.imageKey, item])
            ).values()
        ];

        let queuedAny = false;

        uniqueItems.forEach((item) => {
            const key = item.imageKey;

            if (this.textures.exists(key)) {
                return;
            }

            // Najlepiej dodawać imageUrl bezpośrednio w JSON-ie artykułu.
            // Fallback zachowuje obecny model bazujący na imageKey.
            const url = item.imageUrl ||
                `assets/newspapers/newspapers/${key}.jpg`;

            this.load.image(key, url);
            queuedAny = true;
        });

        if (!queuedAny) {
            this.finishLoading();
            return;
        }

        // Etap 2:
        // Dynamicznie wykryte zdjęcia prasowe zostały dopiero teraz dodane,
        // dlatego Loader musi zostać ręcznie uruchomiony.
        this.load.once('complete', () => {
            this.finishLoading();
        });

        this.load.start();
    }

    collectNewspaperItems() {
        const allItems = [];

        for (const [type, config] of Object.entries(NEWSPAPER_CONFIG)) {
            for (const cityId of config.cities) {
                const cacheKey = `newspaper_${type}_${cityId}`;
                const data = this.cache.json.get(cacheKey);

                if (!data) {
                    console.warn(
                        `[PreloaderScene] Missing newspaper JSON: ${cacheKey}`
                    );
                    continue;
                }

                if (Array.isArray(data.missionLead)) {
                    allItems.push(...data.missionLead);
                } else if (data.missionLead) {
                    allItems.push(data.missionLead);
                }

                if (Array.isArray(data.articles)) {
                    allItems.push(...data.articles);
                }
            }
        }

        return allItems;
    }

    _setupLoadingUI(centerX, centerY, cupX, cupY, width, height) {
        const tips = [
            'A planted clue usually wants to be found too quickly.',
            'Witness confidence is not the same as witness accuracy.',
            'A suspect with an alibi is not necessarily innocent.',
            'The loudest witness is often selling the weakest story.',
            'A good detective checks the timeline twice.',
            'Every red herring believes it is the main character.',
            'Follow the evidence, not the dramatic lighting.',
            'If a clue seems too perfect, it may be wearing a fake moustache.'
        ];

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
        )
            .setOrigin(0.5, 0);

        const vignetteBottom = this.add.rectangle(
            centerX,
            height,
            width,
            150,
            0x000000,
            0.24
        )
            .setOrigin(0.5, 1);

        const scanlineOverlay = this.add.graphics();

        scanlineOverlay.fillStyle(0x000000, 0.05);

        for (let y = 0; y < height; y += 4) {
            scanlineOverlay.fillRect(0, y, width, 2);
        }

        scanlineOverlay.setAlpha(0.22);

        const cupOffsetX = 20;
        const cupOffsetY = 10;

        this.add.image(
            cupX + cupOffsetX,
            cupY + cupOffsetY,
            'cup_outline'
        );

        this.fullCupImage = this.add.image(
            cupX + cupOffsetX,
            cupY + cupOffsetY,
            'cup_coffee'
        );

        this.coffeeMask = this.make.graphics({
            x: cupX,
            y: cupY,
            add: false
        });

        this.updateCoffeeMask(0);

        const mask = this.coffeeMask.createGeometryMask();
        this.fullCupImage.setMask(mask);

        const titleText = this.add.text(
            centerX,
            centerY - 145,
            'MAKING COFFEE 0%',
            {
                fontFamily: '"Press Start 2P", monospace',
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
        fontFamily: '"Press Start 2P", monospace',
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
        fontFamily: '"Special Elite", monospace',
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
            this.getNextTip(tips),
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '24px',
                color: '#f4ebd9',
                align: 'center',
                wordWrap: {
                    width: width * 0.72
                },
                lineSpacing: 8
            }
        ).setOrigin(0.5);

        const tipY = tipText.y;

        this.tipTimer = this.time.addEvent({
            delay: 3200,
            loop: true,
            callback: () => {
                if (!tipText.active) {
                    return;
                }

                const fadeOutTween = this.tweens.add({
                    targets: tipText,
                    alpha: 0,
                    y: tipY - 8,
                    duration: 180,
                    onComplete: () => {
                        if (!tipText.active) {
                            return;
                        }

                        tipText.setText(this.getNextTip(tips));
                        tipText.setY(tipY + 8);

                        const fadeInTween = this.tweens.add({
                            targets: tipText,
                            alpha: 1,
                            y: tipY,
                            duration: 220,
                            ease: 'Quad.out'
                        });

                        this.addTrackedTween(fadeInTween);
                    }
                });

                this.addTrackedTween(fadeOutTween);
            }
        });

        let dots = '';

        this.dotsTimer = this.time.addEvent({
            delay: 350,
            loop: true,
            callback: () => {
                dots = dots.length >= 3 ? '' : `${dots}.`;

                const percent = Math.round(this.fillingLevel * 100);

                titleText.setText(
                    `MAKING COFFEE${dots} ${percent}%`
                );
            }
        });
this.load.on('fileprogress', (file) => {
    if (!this.loadingStatusText?.active) {
        return;
    }

    const nextStatus = this.getLoadingStatus(file);

    if (nextStatus === this.lastLoadingStatus) {
        return;
    }

    this.lastLoadingStatus = nextStatus;

    this.tweens.killTweensOf(this.loadingStatusText);

    this.loadingStatusText
        .setAlpha(0)
        .setText(nextStatus);

    const statusTween = this.tweens.add({
        targets: this.loadingStatusText,
        alpha: 1,
        duration: 140,
        ease: 'Quad.out'
    });

    this.addTrackedTween(statusTween);
});
        this.load.on('progress', (value) => {
            this.fillingLevel = value;
            this.updateCoffeeMask(value);

            const percent = Math.round(value * 100);

            if (titleText.active) {
                titleText.setText(
                    `MAKING COFFEE${dots} ${percent}%`
                );
            }
        });

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
    }

    finishLoading() {
        if (this.loadingReady) {
            return;
        }

        this.loadingReady = true;
        this.fillingLevel = 1;
        this.updateCoffeeMask(1);
if (this.loadingStatusText?.active) {
    this.loadingStatusText.setText(
        'Case file complete. Coffee approved for detective use.'
    );
}
        this._clearLoadingTimers();

        if (!this.uiRefs) {
            this.tryShowStartButton();
            return;
        }

const {
    titleText,
    tipText,
    shadow,
    vignetteTop,
    vignetteBottom,
    scanlineOverlay,
    statusPanel,
    statusLabel,
    loadingStatusText
} = this.uiRefs;

const fadeTargets = [
    titleText,
    tipText,
    shadow,
    vignetteTop,
    vignetteBottom,
    scanlineOverlay,
    statusPanel,
    statusLabel,
    loadingStatusText
].filter((target) => target?.active);

        if (fadeTargets.length === 0) {
            this.tryShowStartButton();
            return;
        }

        const fadeTween = this.tweens.add({
            targets: fadeTargets,
            alpha: 0,
            duration: 650,
            ease: 'Quad.out',
            onComplete: () => {
                fadeTargets.forEach((target) => {
                    if (target?.active) {
                        target.destroy();
                    }
                });

                this.tryShowStartButton();
            }
        });

        this.addTrackedTween(fadeTween);
    }

    async create() {
        super.create();

        if (this.loadErrors.length > 0) {
            console.warn(
                `[PreloaderScene] ${this.loadErrors.length} asset(s) failed to load.`
            );

            this.loadErrors.forEach(({ key, url }) => {
                console.warn(`- ${key}: ${url}`);
            });
        }

        // Jeśli provider nie czyta Phaser Cache, ta funkcja może ponownie pobrać JSON.
        // Docelowo warto zmienić provider, aby przyjmował dane z this.cache.json.
        await loadSuspectData('assets/data/suspectData.json');

        audioManager.init(this);

        EventBus.emit('hideHUD');

        this._setupAudioUnlock();
    }

    _setupAudioUnlock() {
        if (this.audioArmed) {
            return;
        }

        const unlockAudio = () => {
            if (this.audioArmed) {
                return;
            }

            this.audioArmed = true;
            this.sound.unlock?.();
        };

        if (!this.sound.locked) {
            unlockAudio();
            return;
        }

        const temporaryHandler = () => {
            unlockAudio();

            this.input.off('pointerdown', temporaryHandler);
            this.input.off('keydown', temporaryHandler);
        };

        this.input.on('pointerdown', temporaryHandler);
        this.input.on('keydown', temporaryHandler);
    }

    tryShowStartButton() {
        if (!this.loadingReady || this.startBtn) {
            return;
        }

        const { width, height } = this.scale;

        if (!this.textures.exists('btnStart')) {
            console.error(
                '[PreloaderScene] btnStart is missing from the manifest or failed to load.'
            );

            return;
        }

        this.startBtn = this.add.image(
            width / 2,
            height * 0.8,
            'btnStart'
        )
            .setInteractive({ useHandCursor: true })
            .setScale(0.8);

        this.addHoverEffect(this.startBtn, 0.8, 0.9);

        this.startBtn.once('pointerdown', async () => {
            this.startBtn.disableInteractive();

            const mobileFS = this.registry.get('mobileFS');

            if (mobileFS) {
                await mobileFS.enterFullscreenLandscape();
            }

            this.startThemeMusic();
            this.goto('EnterScene');
        });
    }

    startThemeMusic() {
        // W assetManifest.json klucz pliku musi nazywać się "themeMusic".
        if (audioManager.isMusicPlaying('themeMusic')) {
            return;
        }

        audioManager.fadeInMusic(
            'themeMusic',
            { loop: true },
            600
        );
    }

    getNextTip(tips) {
        if (!tips?.length) {
            return '';
        }

        let nextIndex = Phaser.Math.Between(0, tips.length - 1);

        if (tips.length > 1) {
            while (nextIndex === this.tipIndex) {
                nextIndex = Phaser.Math.Between(0, tips.length - 1);
            }
        }

        this.tipIndex = nextIndex;

        return tips[nextIndex];
    }

    updateCoffeeMask(fillLevel) {
        if (!this.coffeeMask) {
            return;
        }

        const safeFillLevel = Phaser.Math.Clamp(fillLevel, 0, 1);

        this.coffeeMask.clear();
        this.coffeeMask.fillStyle(0xffffff, 1);

        const cupWidth = 125;
        const totalHeight = 110;
        const visibleHeight = totalHeight * safeFillLevel;

        this.coffeeMask.fillRect(
            -cupWidth * 0.5,
            (totalHeight * 0.5) - visibleHeight,
            cupWidth,
            visibleHeight
        );
    }

    createCoffeeTextures() {
        if (!this.textures.exists('cup_outline')) {
            const gOutline = this.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            gOutline.fillStyle(0xffffff, 0.08);
            gOutline.fillRoundedRect(
                10,
                10,
                80,
                90,
                { tl: 6, tr: 6, bl: 24, br: 24 }
            );

            gOutline.lineStyle(4, 0xe2f1f8, 0.5);
            gOutline.strokeCircle(95, 55, 17);

            gOutline.lineStyle(2, 0xffffff, 0.8);
            gOutline.strokeCircle(94, 53, 15);

            gOutline.lineStyle(3, 0xd8ecf8, 0.75);
            gOutline.strokeRoundedRect(
                10,
                10,
                80,
                90,
                { tl: 6, tr: 6, bl: 24, br: 24 }
            );

            gOutline.lineStyle(2, 0xffffff, 0.9);
            gOutline.strokeRoundedRect(10, 8, 80, 8, 4);

            gOutline.fillStyle(0xffffff, 0.35);
            gOutline.fillRoundedRect(16, 18, 5, 72, 2);

            gOutline.fillStyle(0xffffff, 0.2);
            gOutline.fillRoundedRect(82, 60, 3, 30, 1);

            gOutline.generateTexture('cup_outline', 125, 110);
            gOutline.destroy();
        }

        if (!this.textures.exists('cup_coffee')) {
            const gCoffee = this.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            gCoffee.fillStyle(0x3d2314, 0.95);
            gCoffee.fillRoundedRect(
                14,
                20,
                72,
                78,
                { tl: 2, tr: 2, bl: 20, br: 20 }
            );

            gCoffee.fillStyle(0x5a351e, 0.9);
            gCoffee.fillRect(14, 20, 72, 35);

            gCoffee.fillStyle(0xd7a15c, 1);
            gCoffee.fillRoundedRect(14, 18, 72, 10, 5);

            gCoffee.fillStyle(0xf7e8d3, 0.9);
            gCoffee.fillRoundedRect(30, 19, 40, 6, 3);

            gCoffee.fillStyle(0xfff7ed, 1);
            gCoffee.fillCircle(45, 21, 5);
            gCoffee.fillCircle(55, 21, 5);
            gCoffee.fillTriangle(39, 22, 61, 22, 50, 29);

            gCoffee.generateTexture('cup_coffee', 125, 110);
            gCoffee.destroy();
        }
    }

    addHoverEffect(button, baseScale = 0.8, hoverScale = 0.9) {
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

    _clearLoadingTimers() {
        if (this.tipTimer) {
            this.tipTimer.remove(false);
            this.tipTimer = null;
        }

        if (this.dotsTimer) {
            this.dotsTimer.remove(false);
            this.dotsTimer = null;
        }
    }

    shutdown() {
        this._clearLoadingTimers();

        if (this.coffeeMask) {
            this.coffeeMask.destroy();
            this.coffeeMask = null;
        }

        this.fullCupImage = null;
        this.uiRefs = null;
        this.startBtn = null;
        this.loadingStatusText = null;

        super.shutdown();
    }
}