const LOCAL_DEBUG = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const SKIN_FALLBACK = 0xd9a07a;
const LASH_COLOR = 0x3a2418;

/**
 * Współrzędne znormalizowane (0-1) w obrębie obrazka prezentera (1000x1000).
 * Skalibruj na localhoście: G = markery (przeciągaj), O = wypisz do konsoli.
 *
 * neck  - środek obrotu głowy; y jest zarazem linią cięcia głowa/ciało
 * fade  - miękkie przejście głowy w ciało (ułamek wysokości)
 */
const PRESENTER_RIGS = {
  tv_anchor_generic: {
    neck: { x: 0.52, y: 0.405 },
    fade: 0.04,
    eyeL: { x: 0.466, y: 0.262 },
    eyeR: { x: 0.546, y: 0.262 },
    mouth: { x: 0.515, y: 0.347 },
    eyeW: 0.052,
    eyeH: 0.026,
    mouthW: 0.085,
    mouthH: 0.04,
    skinDy: 0.05
  },

  tv_anchor_genericf: {
    neck: { x: 0.52, y: 0.405 },
    fade: 0.04,
    eyeL: { x: 0.462, y: 0.262 },
    eyeR: { x: 0.546, y: 0.262 },
    mouth: { x: 0.512, y: 0.345 },
    eyeW: 0.052,
    eyeH: 0.026,
    mouthW: 0.08,
    mouthH: 0.04,
    skinDy: 0.05
  }
};

/**
 * Anchor i kot na zdjęciu studia (tv_news_studio.jpg, 1000x1000).
 * Współrzędne w pikselach obrazka znormalizowane do 0-1.
 */
const STUDIO_RIGS = {
  tv_news_studio: {
    eyeL: { x: 0.277, y: 0.433 },
    eyeR: { x: 0.322, y: 0.432 },
    mouth: { x: 0.3, y: 0.472 },
    eyeW: 0.02,
    eyeH: 0.012,
    mouthW: 0.03,
    mouthH: 0.022,
    skin: { x: 0.3, y: 0.455 },
    cat: { x: 0.528, y: 0.585, w: 0.135, h: 0.068 }
  }
};

const MOUTH_SHAPES = [
  null,
  { w: 0.62, h: 0.34 },
  { w: 0.8, h: 0.62 },
  { w: 0.58, h: 1.0 }
];

/* ============================================================
   HELPERS
   ============================================================ */

function sampleColor(source, u, v) {
  try {
    const w = source.naturalWidth || source.width;
    const h = source.naturalHeight || source.height;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const x = Math.round(u * w);
    const y = Math.round(v * h);

    // 3x3 uśrednione do jednego piksela
    ctx.drawImage(source, x - 1, y - 1, 3, 3, 0, 0, 1, 1);

    const d = ctx.getImageData(0, 0, 1, 1).data;

    if (d[3] < 128) return SKIN_FALLBACK;

    return (d[0] << 16) | (d[1] << 8) | d[2];
  } catch (error) {
    return SKIN_FALLBACK;
  }
}

function createDebugMarkers(scene, parent, defs) {
  return defs.map((def) => {
    const p = def.get();

    const marker = scene.add
      .circle(p.x, p.y, 7, def.color, 0.9)
      .setStrokeStyle(2, 0x000000, 1)
      .setInteractive({ draggable: true, useHandCursor: true });

    marker.on('drag', (pointer, dragX, dragY) => {
      marker.setPosition(dragX, dragY);
      def.set(dragX, dragY);
    });

    marker.on('dragend', () => def.onEnd?.());

    parent.add(marker);

    return marker;
  });
}

/* ============================================================
   FACE OVERLAY: powieki + usta rysowane na twarzy
   ============================================================ */

class FaceOverlay {
  constructor(scene, parent, layout) {
    this.scene = scene;
    this.level = 0;
    this.mouthW = 10;
    this.mouthH = 6;

    const skin = layout.skin ?? SKIN_FALLBACK;

    this.lidL = scene.add.rectangle(0, 0, 10, 10, skin, 1).setVisible(false);
    this.lashL = scene.add.rectangle(0, 0, 10, 2, LASH_COLOR, 1).setVisible(false);
    this.lidR = scene.add.rectangle(0, 0, 10, 10, skin, 1).setVisible(false);
    this.lashR = scene.add.rectangle(0, 0, 10, 2, LASH_COLOR, 1).setVisible(false);

    this.mouth = scene.add.graphics();

    parent.add([this.lidL, this.lashL, this.lidR, this.lashR, this.mouth]);

    this.setLayout(layout);
  }

  setLayout(layout) {
    const { eyeL, eyeR, mouth, eyeW, eyeH, mouthW, mouthH } = layout;

    if (layout.skin !== undefined) {
      this.lidL.setFillStyle(layout.skin, 1);
      this.lidR.setFillStyle(layout.skin, 1);
    }

    const lashH = Math.max(1, Math.round(eyeH * 0.16));

    [
      [this.lidL, this.lashL, eyeL],
      [this.lidR, this.lashR, eyeR]
    ].forEach(([lid, lash, pos]) => {
      lid.setPosition(pos.x, pos.y).setSize(eyeW, eyeH);

      lash
        .setPosition(pos.x, pos.y + eyeH / 2 - lashH / 2)
        .setSize(eyeW, lashH);
    });

    this.mouth.setPosition(mouth.x, mouth.y);
    this.mouthW = mouthW;
    this.mouthH = mouthH;

    const level = this.level;

    this.level = -1;
    this.setLevel(level);
  }

  setLevel(level) {
    if (level === this.level) return;

    this.level = level;

    const g = this.mouth;

    g.clear();

    if (!level) return;

    const shape = MOUTH_SHAPES[level];
    const w = this.mouthW * shape.w;
    const h = Math.max(2, this.mouthH * shape.h);

    g.fillStyle(0x3a1010, 0.95);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, Math.min(h / 2, 5));

    if (level >= 2) {
      g.fillStyle(0xf4eddc, 1);
      g.fillRect(-w * 0.4, -h / 2 + 1, w * 0.8, Math.max(1, h * 0.28));
    }

    if (level === 3) {
      g.fillStyle(0xb5525a, 1);
      g.fillEllipse(0, h * 0.2, w * 0.5, h * 0.35);
    }
  }

  blink() {
    const parts = [this.lidL, this.lashL, this.lidR, this.lashR];

    parts.forEach((part) => part.active && part.setVisible(true));

    this.scene.time.delayedCall(110, () => {
      parts.forEach((part) => part.active && part.setVisible(false));
    });
  }
}

/* ============================================================
   FACE DRIVER: mowa + mruganie
   ============================================================ */

class FaceDriver {
  constructor(scene, face, onNod) {
    this.scene = scene;
    this.face = face;
    this.onNod = onNod;

    this.talkUntil = 0;
    this.pauseUntil = 0;
    this.charLevel = 0;
    this.paused = false;

    this.tickTimer = null;
    this.blinkCall = null;
  }

  start() {
    this.stop();

    this.tickTimer = this.scene.time.addEvent({
      delay: 70,
      loop: true,
      callback: () => this.tick()
    });

    this.scheduleBlink();
  }

  stop() {
    this.tickTimer?.remove?.(false);
    this.tickTimer = null;

    this.blinkCall?.remove?.(false);
    this.blinkCall = null;
  }

  scheduleBlink() {
    this.blinkCall = this.scene.time.delayedCall(
      Phaser.Math.Between(2200, 5200),
      () => {
        this.face?.blink();

        if (Math.random() < 0.2) {
          this.scene.time.delayedCall(220, () => this.face?.blink());
        }

        this.scheduleBlink();
      }
    );

    this.blinkCall.paused = this.paused;
  }

  speak(char) {
    if (!char) return;

    const now = this.scene.time.now;

    this.talkUntil = now + 170;

    if (/[.!?]/.test(char)) {
      this.pauseUntil = now + 240;
      this.charLevel = 0;
      this.onNod?.(1.4);
    } else if (/[,;:]/.test(char)) {
      this.pauseUntil = now + 130;
      this.charLevel = 0;
      this.onNod?.(0.8);
    } else if (/[ao]/i.test(char)) {
      this.charLevel = 3;
    } else if (/[euiy]/i.test(char)) {
      this.charLevel = 2;
    } else if (/[a-z0-9]/i.test(char)) {
      this.charLevel = 1;
    } else {
      this.charLevel = 0;
    }
  }

  endSpeech() {
    this.talkUntil = 0;
    this.face?.setLevel(0);
  }

  tick() {
    if (this.paused || !this.face) return;

    const now = this.scene.time.now;

    let level = 0;

    if (now < this.talkUntil && now >= this.pauseUntil) {
      level = Math.max(1, this.charLevel);

      // "klapanie": co jakiś czas usta się zamykają
      if (Math.random() < 0.28) level = 0;
    }

    this.face.setLevel(level);
  }

  setPaused(paused) {
    this.paused = paused;

    if (this.tickTimer) this.tickTimer.paused = paused;
    if (this.blinkCall) this.blinkCall.paused = paused;
  }
}

/* ============================================================
   PREZENTER (filler): ciało + głowa jako osobne warstwy
   ============================================================ */

export class TvPresenterAnimator {
  constructor(scene) {
    this.scene = scene;

    this.container = scene.add.container(0, 0).setVisible(false);
    this.rig = scene.add.container(0, 0);

    this.container.add(this.rig);

    this.tweens = [];
    this.head = null;
    this.face = null;
    this.driver = null;
    this.config = null;
    this.options = null;
    this.skin = SKIN_FALLBACK;

    this.dispW = 0;
    this.dispH = 0;

    this.nodTween = null;
    this.paused = false;
    this.debugOn = false;
    this.markers = [];
    this.destroyed = false;

    if (LOCAL_DEBUG) {
      this.boundKey = (event) => this.onDebugKey(event);
      scene.input.keyboard?.on('keydown', this.boundKey);
    }
  }

  /* ---------- lifecycle ---------- */

  clear() {
    this.tweens.forEach((tween) => {
      try {
        tween?.stop?.();
      } catch (error) {
        /* ignore */
      }
    });

    this.tweens = [];

    this.nodTween = null;

    this.driver?.stop();
    this.driver = null;
    this.face = null;
    this.head = null;
    this.markers = [];

    this.rig.removeAll(true);
    this.rig.setScale(1).setAngle(0);
  }

  hide() {
    this.clear();
    this.container.setVisible(false);
  }

  show(options) {
    if (this.destroyed) return false;

    this.clear();

    const { sourceKey, keyedKey, x, y, size } = options;
    const scene = this.scene;

    if (!keyedKey || !scene.textures.exists(keyedKey)) {
      this.container.setVisible(false);
      return false;
    }

    this.options = options;

    const source = scene.textures.get(keyedKey).getSourceImage();
    const tw = source.naturalWidth || source.width;
    const th = source.naturalHeight || source.height;

    this.f = size / tw;
    this.dispW = size;
    this.dispH = th * this.f;

    this.container.setPosition(x, y + 24).setVisible(true).setAlpha(0);

    this.config = PRESENTER_RIGS[sourceKey] || null;

    const built = this.config ? this.buildLayers(keyedKey, source, tw, th) : false;

    if (!built) {
      this.buildSimple(keyedKey);
    }

    this.startIdle();

    this.tweens.push(
      scene.tweens.add({
        targets: this.container,
        alpha: 1,
        y,
        duration: 320,
        ease: 'Quad.easeOut'
      })
    );

    if (this.debugOn && this.config) this.createMarkers();

    this.setPaused(this.paused);

    return true;
  }

  rebuild() {
    if (this.options) this.show(this.options);
  }

  buildSimple(keyedKey) {
    const body = this.scene.add
      .image(0, 0, keyedKey)
      .setOrigin(0.5, 1)
      .setScale(this.f);

    this.rig.add(body);
  }

  ensureLayerTextures(keyedKey, source, tw, th) {
    const scene = this.scene;
    const cfg = this.config;

    const tag = `${Math.round(cfg.neck.y * 1000)}_${Math.round(cfg.fade * 1000)}`;
    const bodyKey = `__tv_pr_body_${keyedKey}_${tag}`;
    const headKey = `__tv_pr_head_${keyedKey}_${tag}`;

    const splitPx = Math.round(cfg.neck.y * th);
    const headH = Math.min(th, Math.round((cfg.neck.y + cfg.fade) * th));

    try {
      if (!scene.textures.exists(bodyKey)) {
        const tex = scene.textures.createCanvas(bodyKey, tw, th);
        const ctx = tex.getContext();

        ctx.drawImage(source, 0, 0);
        ctx.clearRect(0, 0, tw, splitPx);

        tex.refresh();
      }

      if (!scene.textures.exists(headKey)) {
        const tex = scene.textures.createCanvas(headKey, tw, headH);
        const ctx = tex.getContext();

        ctx.drawImage(source, 0, 0, tw, headH, 0, 0, tw, headH);

        ctx.globalCompositeOperation = 'destination-in';

        const grad = ctx.createLinearGradient(0, 0, 0, headH);

        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(Math.min(1, splitPx / headH), 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, tw, headH);

        tex.refresh();
      }

      return { bodyKey, headKey, headH };
    } catch (error) {
      console.warn('[TV] Presenter layers failed:', error);

      return null;
    }
  }

  faceLayout() {
    const c = this.config;
    const W = this.dispW;
    const H = this.dispH;

    const rel = (p) => ({
      x: (p.x - c.neck.x) * W,
      y: (p.y - c.neck.y) * H
    });

    return {
      eyeL: rel(c.eyeL),
      eyeR: rel(c.eyeR),
      mouth: rel(c.mouth),
      eyeW: c.eyeW * W,
      eyeH: c.eyeH * H,
      mouthW: c.mouthW * W,
      mouthH: c.mouthH * H,
      skin: this.skin
    };
  }

  applyFaceLayout() {
    this.face?.setLayout(this.faceLayout());
  }

  buildLayers(keyedKey, source, tw, th) {
    const scene = this.scene;
    const cfg = this.config;

    const layers = this.ensureLayerTextures(keyedKey, source, tw, th);

    if (!layers) return false;

    const body = scene.add
      .image(0, 0, layers.bodyKey)
      .setOrigin(0.5, 1)
      .setScale(this.f);

    const pivotX = (cfg.neck.x - 0.5) * this.dispW;
    const pivotY = (cfg.neck.y - 1) * this.dispH;

    this.headBaseY = pivotY;

    this.head = scene.add.container(pivotX, pivotY);

    const headImage = scene.add
      .image(0, 0, layers.headKey)
      .setOrigin(cfg.neck.x, (cfg.neck.y * th) / layers.headH)
      .setScale(this.f);

    this.head.add(headImage);

    this.skin = sampleColor(
      source,
      cfg.eyeL.x,
      cfg.eyeL.y + cfg.skinDy
    );

    this.face = new FaceOverlay(scene, this.head, this.faceLayout());

    this.driver = new FaceDriver(scene, this.face, (strength) => this.nod(strength));
    this.driver.start();

    this.rig.add([body, this.head]);

    return true;
  }

  startIdle() {
    const scene = this.scene;

    this.tweens.push(
      scene.tweens.add({
        targets: this.rig,
        scaleY: { from: 1, to: 1.009 },
        duration: 1700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      }),
      scene.tweens.add({
        targets: this.rig,
        angle: { from: -0.4, to: 0.4 },
        duration: 4200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    );

    if (this.head) {
      this.tweens.push(
        scene.tweens.add({
          targets: this.head,
          angle: { from: -1.1, to: 1.1 },
          duration: 3100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
      );
    }
  }

  /* ---------- animation API ---------- */

  nod(strength = 1) {
    if (!this.head?.active || this.paused) return;

    if (this.nodTween) this.nodTween.stop();

    this.head.y = this.headBaseY;

    this.nodTween = this.scene.tweens.add({
      targets: this.head,
      y: this.headBaseY + 3.2 * strength,
      duration: 110,
      yoyo: true,
      ease: 'Sine.easeOut'
    });
  }

  speak(char) {
    this.driver?.speak(char);
  }

  endSpeech() {
    this.driver?.endSpeech();
  }

  setPaused(paused) {
    this.paused = paused;

    this.tweens.forEach((tween) => {
      if (!tween?.isPlaying && !tween?.isPaused?.()) return;

      if (paused) tween.pause();
      else tween.resume();
    });

    this.driver?.setPaused(paused);
  }

  /* ---------- debug (tylko localhost) ---------- */

  createMarkers() {
    const c = this.config;
    const W = this.dispW;
    const H = this.dispH;

    const def = (name, color, redraw) => ({
      name,
      color,
      get: () => ({ x: (c[name].x - 0.5) * W, y: (c[name].y - 1) * H }),
      set: (dx, dy) => {
        c[name].x = dx / W + 0.5;
        c[name].y = dy / H + 1;

        if (!redraw) return;

        this.applyFaceLayout();
      },
      onEnd: redraw ? undefined : () => this.rebuild()
    });

    this.markers = createDebugMarkers(this.scene, this.rig, [
      def('neck', 0xff44ff, false),
      def('eyeL', 0x00ff88, true),
      def('eyeR', 0x00ff88, true),
      def('mouth', 0xffe14d, true)
    ]);
  }

  onDebugKey(event) {
    if (this.destroyed || !this.container.visible || !this.config) return;

    if (event.code === 'KeyG' && !event.repeat) {
      this.debugOn = !this.debugOn;

      this.markers.forEach((marker) => marker.destroy());
      this.markers = [];

      if (this.debugOn) this.createMarkers();

      return;
    }

    if (event.code === 'KeyO' && this.debugOn && !event.repeat) {
      console.log(
        `COPY INTO TvPresenterAnimator.js, PRESENTER_RIGS["${this.options?.sourceKey}"] =`
      );

      console.log(JSON.stringify(this.config, null, 2));
    }
  }

  destroy() {
    this.destroyed = true;

    if (this.boundKey) {
      this.scene?.input?.keyboard?.off('keydown', this.boundKey);
    }

    this.clear();

    this.container.destroy(true);

    this.scene = null;
  }
}

/* ============================================================
   STUDIO (news): anchor na zdjęciu + oddychający kot
   ============================================================ */

export class TvStudioAnimator {
  constructor(scene) {
    this.scene = scene;

    this.container = scene.add.container(0, 0).setVisible(false);

    this.tweens = [];
    this.face = null;
    this.driver = null;
    this.config = null;
    this.options = null;
    this.mapping = null;
    this.source = null;

    this.paused = false;
    this.debugOn = false;
    this.markers = [];
    this.destroyed = false;

    if (LOCAL_DEBUG) {
      this.boundKey = (event) => this.onDebugKey(event);
      scene.input.keyboard?.on('keydown', this.boundKey);
    }
  }

  clear() {
    this.tweens.forEach((tween) => {
      try {
        tween?.stop?.();
      } catch (error) {
        /* ignore */
      }
    });

    this.tweens = [];

    this.driver?.stop();
    this.driver = null;
    this.face = null;
    this.markers = [];

    this.container.removeAll(true);
  }

  hide() {
    this.clear();
    this.container.setVisible(false);
  }

  // mapping: { s, cx, cy, tw, th, boxW, boxH } z TvBroadcastView.placeCover
  show(options) {
    if (this.destroyed) return false;

    this.clear();

    const { textureKey, mapping } = options;
    const scene = this.scene;

    this.config = STUDIO_RIGS[textureKey] || null;

    if (!this.config || !mapping || !scene.textures.exists(textureKey)) {
      this.container.setVisible(false);
      return false;
    }

    this.options = options;
    this.mapping = mapping;
    this.source = scene.textures.get(textureKey).getSourceImage();

    this.container.setVisible(true);

    this.buildFace();
    this.buildCat(textureKey);

    this.setPaused(this.paused);

    if (this.debugOn) this.createMarkers();

    return true;
  }

  rebuild() {
    if (this.options) this.show(this.options);
  }

  toX(u) {
    const m = this.mapping;

    return -m.boxW / 2 + m.s * (u * m.tw - m.cx);
  }

  toY(v) {
    const m = this.mapping;

    return -m.boxH / 2 + m.s * (v * m.th - m.cy);
  }

  faceLayout() {
    const c = this.config;
    const m = this.mapping;

    const px = (p) => ({ x: this.toX(p.x), y: this.toY(p.y) });

    return {
      eyeL: px(c.eyeL),
      eyeR: px(c.eyeR),
      mouth: px(c.mouth),
      eyeW: c.eyeW * m.tw * m.s,
      eyeH: c.eyeH * m.th * m.s,
      mouthW: c.mouthW * m.tw * m.s,
      mouthH: c.mouthH * m.th * m.s,
      skin: this.skin
    };
  }

  buildFace() {
    const c = this.config;

    this.skin = sampleColor(this.source, c.skin.x, c.skin.y);

    this.face = new FaceOverlay(this.scene, this.container, this.faceLayout());

    this.driver = new FaceDriver(this.scene, this.face, null);
    this.driver.start();
  }

  buildCat(textureKey) {
    const scene = this.scene;
    const c = this.config.cat;
    const m = this.mapping;

    if (!c) return;

    const key = `__tv_studio_cat_${textureKey}`;

    if (!scene.textures.exists(key)) {
      try {
        const sx = Math.round(c.x * m.tw);
        const sy = Math.round(c.y * m.th);
        const w = Math.round(c.w * m.tw);
        const h = Math.round(c.h * m.th);

        const tex = scene.textures.createCanvas(key, w, h);
        const ctx = tex.getContext();

        ctx.drawImage(this.source, sx, sy, w, h, 0, 0, w, h);

        // miękka eliptyczna maska, żeby nie było widać krawędzi wycinka
        ctx.globalCompositeOperation = 'destination-in';
        ctx.translate(w / 2, h / 2);
        ctx.scale(w / h, 1);

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, h / 2);

        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.6, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(-h, -h / 2, h * 2, h);

        tex.refresh();
      } catch (error) {
        console.warn('[TV] Cat layer failed:', error);

        if (scene.textures.exists(key)) scene.textures.remove(key);

        return;
      }
    }

    const cat = scene.add
      .image(this.toX(c.x + c.w / 2), this.toY(c.y + c.h), key)
      .setOrigin(0.5, 1)
      .setScale(m.s);

    this.container.addAt(cat, 0);

    this.tweens.push(
      scene.tweens.add({
        targets: cat,
        scaleY: { from: m.s, to: m.s * 1.04 },
        scaleX: { from: m.s, to: m.s * 1.012 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    );
  }

  speak(char) {
    this.driver?.speak(char);
  }

  endSpeech() {
    this.driver?.endSpeech();
  }

  setPaused(paused) {
    this.paused = paused;

    this.tweens.forEach((tween) => {
      if (paused) tween.pause();
      else tween.resume();
    });

    this.driver?.setPaused(paused);
  }

  /* ---------- debug ---------- */

  createMarkers() {
    const c = this.config;
    const m = this.mapping;

    const def = (name, color) => ({
      name,
      color,
      get: () => ({ x: this.toX(c[name].x), y: this.toY(c[name].y) }),
      set: (dx, dy) => {
        c[name].x = ((dx + m.boxW / 2) / m.s + m.cx) / m.tw;
        c[name].y = ((dy + m.boxH / 2) / m.s + m.cy) / m.th;

        this.face?.setLayout(this.faceLayout());
      }
    });

    this.markers = createDebugMarkers(this.scene, this.container, [
      def('eyeL', 0x00ff88),
      def('eyeR', 0x00ff88),
      def('mouth', 0xffe14d)
    ]);
  }

  onDebugKey(event) {
    if (this.destroyed || !this.container.visible || !this.config) return;

    if (event.code === 'KeyG' && !event.repeat) {
      this.debugOn = !this.debugOn;

      this.markers.forEach((marker) => marker.destroy());
      this.markers = [];

      if (this.debugOn) this.createMarkers();

      return;
    }

    if (event.code === 'KeyO' && this.debugOn && !event.repeat) {
      console.log(
        `COPY INTO TvPresenterAnimator.js, STUDIO_RIGS["${this.options?.textureKey}"] =`
      );

      console.log(JSON.stringify(this.config, null, 2));
    }
  }

  destroy() {
    this.destroyed = true;

    if (this.boundKey) {
      this.scene?.input?.keyboard?.off('keydown', this.boundKey);
    }

    this.clear();

    this.container.destroy(true);

    this.scene = null;
  }
}