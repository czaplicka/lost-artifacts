import { BAYER_4 } from './WantedDatabaseConfig.js';

export const WantedDatabaseTextures = {
    getTextureSpec(suspect, type) {
        if (type === 'wanted') {
            const file = suspect.wantedKey || suspect.id;

            return {
                sharedKey: `wanted_${suspect.id}`,
                privateKey: `__wanted_db_poster_${suspect.id}`,
                url: `assets/suspects/${file}.jpg`
            };
        }

        const file = suspect.portraitKey || suspect.id;

        return {
            sharedKey: String(file),
            privateKey: `__wanted_db_portrait_${suspect.id}`,
            url: `assets/suspects/${file}.jpg`
        };
    },

    getExistingTextureKey(spec) {
        if (this.textures.exists(spec.sharedKey)) {
            return spec.sharedKey;
        }

        if (this.textures.exists(spec.privateKey)) {
            return spec.privateKey;
        }

        return null;
    },

    ensureSuspectTexture(suspect, type) {
        const spec = this.getTextureSpec(suspect, type);
        const existing = this.getExistingTextureKey(spec);

        if (existing) {
            return Promise.resolve(existing);
        }

        if (!this.session?.active) {
            return Promise.resolve(null);
        }

        const key = spec.privateKey;
        const pending = this.pendingTextures.get(key);

        if (pending) {
            return pending.promise;
        }

        const session = this.session;
        const completeEvent = `filecomplete-image-${key}`;

        let resolvePromise;

        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });

        let settled = false;

        const finish = (result) => {
            if (settled) return;
            settled = true;

            this.load.off(completeEvent, onComplete);
            this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);

            this.pendingTextures.delete(key);
            resolvePromise(result);
        };

        const onComplete = () => {
            if (!session.active) {
                finish(null);
                return;
            }

            this.ownedTextures.add(key);
            finish(key);
        };

        const onError = (file) => {
            if (file?.key !== key) return;

            console.warn('[WantedDatabaseScene] Image failed:', spec.url);

            finish(null);
        };

        this.pendingTextures.set(key, {
            promise,
            cancel: () => finish(null)
        });

        this.load.once(completeEvent, onComplete);
        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);

        this.load.image(key, spec.url);

        if (!this.load.isLoading()) {
            this.load.start();
        }

        return promise;
    },

    fitCover(image, box, textureKey, focusY = 0.5) {
        image.setCrop();
        image.setTexture(textureKey);

        const frame = image.frame;
        const sw = frame.realWidth;
        const sh = frame.realHeight;

        if (!sw || !sh) {
            image.setVisible(false);
            return false;
        }

        const scale = Math.max(box.width / sw, box.height / sh);

        const cw = box.width / scale;
        const ch = box.height / scale;
        const cx = (sw - cw) / 2;
        const cy = (sh - ch) * focusY;

        image
            .setOrigin(0.5)
            .setScale(scale)
            .setPosition(
                box.x + scale * (sw / 2 - cx),
                box.y + scale * (sh / 2 - cy)
            )
            .setCrop(cx, cy, cw, ch);

        return true;
    },

    bakePhoto(srcKey, box, focusY = 0, pixel = 2) {
        const th = this.th;

        const key = `__wdb_bake_${th.key}_${srcKey}_${box.width}x${box.height}_${pixel}`;

        if (this.textures.exists(key)) return key;

        try {
            const src = this.textures.get(srcKey).getSourceImage();

            const sw = src.naturalWidth || src.width;
            const sh = src.naturalHeight || src.height;

            if (!sw || !sh) return null;

            const w = Math.max(8, Math.round(box.width / pixel));
            const h = Math.max(8, Math.round(box.height / pixel));

            const tex = this.textures.createCanvas(key, w, h);
            const ctx = tex.getContext();

            const s = Math.max(w / sw, h / sh);
            const cw = w / s;
            const ch = h / s;
            const cx = (sw - cw) / 2;
            const cy = (sh - ch) * focusY;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(src, cx, cy, cw, ch, 0, 0, w, h);

            const img = ctx.getImageData(0, 0, w, h);
            const data = img.data;

            const stops = [th.bg, th.dim, th.mid, th.main, th.hi].map((c) =>
                Phaser.Display.Color.IntegerToRGB(c)
            );

            const levels = stops.length;

            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const i = (y * w + x) * 4;

                    let l =
                        (0.299 * data[i] +
                            0.587 * data[i + 1] +
                            0.114 * data[i + 2]) /
                        255;

                    l = Phaser.Math.Clamp((l - 0.5) * 1.3 + 0.53, 0, 1);

                    const t = (BAYER_4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5;

                    const idx = Phaser.Math.Clamp(
                        Math.round(l * (levels - 1) + t * 0.95),
                        0,
                        levels - 1
                    );

                    const c = stops[idx];

                    data[i] = c.r;
                    data[i + 1] = c.g;
                    data[i + 2] = c.b;
                    data[i + 3] = 255;
                }
            }

            ctx.putImageData(img, 0, 0);
            tex.refresh();
            tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

            this.ownedTextures.add(key);

            return key;
        } catch (error) {
            // np. tainted canvas przy CDN bez CORS: zostaje oryginał
            if (this.textures.exists(key)) {
                this.textures.remove(key);
            }

            console.warn('[WantedDatabaseScene] Bake failed:', error);

            return null;
        }
    },

    createPhotoEntry(parent, box) {
        const raw = this.add.image(0, 0, '__DEFAULT').setVisible(false);
        const baked = this.add.image(0, 0, '__DEFAULT').setVisible(false);

        parent.add([raw, baked]);

        return {
            raw,
            baked,
            hasBake: false,
            loaded: false,
            box
        };
    },

    setEntryPhoto(entry, textureKey, focusY, pixel = 2) {
        const box = entry.box;

        const ok = this.fitCover(entry.raw, box, textureKey, focusY);

        entry.loaded = ok;
        entry.hasBake = false;

        if (ok) {
            const bakedKey = this.bakePhoto(textureKey, box, focusY, pixel);

            if (bakedKey) {
                entry.baked
                    .setTexture(bakedKey)
                    .setOrigin(0.5)
                    .setScale(1)
                    .setPosition(
                        box.x + box.width / 2,
                        box.y + box.height / 2
                    )
                    .setDisplaySize(box.width, box.height);

                entry.hasBake = true;
            }
        }

        this.applyPhotoMode(entry);
    },

    clearEntry(entry) {
        entry.loaded = false;
        entry.hasBake = false;
        this.applyPhotoMode(entry);
    },

    applyPhotoMode(entry) {
        const useBake = this.photoFilterOn && entry.hasBake;

        entry.raw.setVisible(entry.loaded && !useBake);
        entry.baked.setVisible(entry.loaded && useBake);
    }
};
