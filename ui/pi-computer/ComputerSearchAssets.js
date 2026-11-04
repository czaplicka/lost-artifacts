import {
    STATE_KEY,
    clone,
    safeId,
    signature,
    getSearchProgress,
    discoverSearchKeywords,
    validateSearchData,
    resolveSearchResults,
    resolveSearch,
    ART_BASE,
    ART_FILES,
    FAILED_ART,
    VISITED,
    THEMES,
    DEFAULT_THEME,
    CLOUD_COLORS,
    BRAND,
    ITEM_HEIGHT,
    TAGLINES,
    HOOTY_LINES,
    ADS,
    AD_CLICKS,
    NO_RESULT_JOKES,
    ABOUT_TIP,
    PRIVACY_TIP,
    slug,
    hash,
    pick,
    titleCase,
    gameState,
    requestAutosave,
    FONTS,
    lerpColor,
    seeded
} from './ComputerSearchShared.js';

export class ComputerSearchAssets {
    textureOk(key) {
        return Boolean(key) && this.ui.scene.textures.exists(key);
    }

    siteKey(page) {
        return `search_site_${slug(page.brand || page.id)}`;
    }

    addTexture(key, url) {
        if (
            typeof Image === 'undefined' ||
            !key ||
            !url ||
            this.requested.has(key) ||
            FAILED_ART.has(url) ||
            this.ui.scene.textures.exists(key)
        ) {
            return;
        }

        this.requested.add(key);

        const image = new Image();
        this.images.push(image);

        image.onload = () => {
            image.onload = null;
            image.onerror = null;

            if (this.dead || this.ui.destroyed) return;

            if (!this.ui.scene.textures.exists(key)) {
                this.ui.scene.textures.addImage(key, image);
            }

            this.refresh();
        };

        image.onerror = () => {
            image.onload = null;
            image.onerror = null;
            FAILED_ART.add(url);
        };

        image.src = url;
    }

    loadAssets() {
        if (!this.data) return;

        for (const [key, file] of Object.entries(ART_FILES)) {
            this.addTexture(key, ART_BASE + file);
        }

        for (const page of this.data.cases.flatMap(
            definition => definition.pages
        )) {
            this.addTexture(page.imageKey, page.imageUrl);


        }
    }

    // Kept for backwards compatibility with older callers.

    loadImages() {
        this.loadAssets();
    }

    // Draws a texture contained in a box (aspect ratio preserved). Returns null if missing.

    art(key, x, y, maxWidth, maxHeight) {
        if (!this.textureOk(key)) return null;

        const frame = this.ui.scene.textures.getFrame(key);
        const scale = Math.min(
            maxWidth / frame.width,
            maxHeight / frame.height
        );

        const width = frame.width * scale;
        const height = frame.height * scale;

        return this.ui.drawing.add(
            this.ui.scene.add.image(
                x + (maxWidth - width) / 2,
                y + (maxHeight - height) / 2,
                key
            )
                .setOrigin(0)
                .setDisplaySize(width, height)
        );
    }

    /* --------------------------- state --------------------------- */
}
