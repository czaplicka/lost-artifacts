const CONFIG = {
  key: 'alex-storage',
  url: 'assets/spritesheet/office/alex-storage.png',
  frames: 4,
  // Center and size of the lower-face patch, relative to the 1920 x 1080 background.
  x: 1247, y: 454, width: 48, height: 34,
  depth: 6,
  pattern: [1, 2, 1, 3, 1, 2, 0],
  durations: [110, 90, 100, 130, 90, 110, 160]
};

export function alexMouthSource(scene) {
  const manifest = scene.cache.json.get('assetManifest');
  const asset = manifest?.assetCatalog?.find(a => a.type === 'image' && a.url === CONFIG.url);
  return asset ?? { key: CONFIG.key, url: CONFIG.url };
}

export class AlexMouthAnimation {
  constructor(scene) {
    this.scene = scene;
    this.disposed = false;
    this.sprite = null;
    this.wasTyping = false;
    this.patternIndex = 0;
    this.frameElapsed = 0;
    this.sourceKey = alexMouthSource(scene).key;
    if (!this.prepareFrames()) return;
    this.sprite = scene.add.sprite(0, 0, this.sourceKey, 'alex-mouth-v1-0')
      .setOrigin(0.5).setDepth(CONFIG.depth).setVisible(false);
    this.layout();
    scene.events.on('update', this.update, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  prepareFrames() {
    if (!this.scene.textures.exists(this.sourceKey)) {
      console.warn('[AlexMouth] Missing source image:', CONFIG.url);
      return false;
    }
    const texture = this.scene.textures.get(this.sourceKey);
    if (Array.from({ length: CONFIG.frames }, (_, i) => texture.has(`alex-mouth-v1-${i}`)).every(Boolean)) return true;
    const image = texture.getSourceImage();
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height || width % CONFIG.frames !== 0) {
      console.warn('[AlexMouth] Expected four equal frames in one horizontal row.', { width, height });
      return false;
    }
    const frameWidth = width / CONFIG.frames;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas 2D is unavailable.');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, width, height).data;
      let minX = frameWidth, minY = height, maxX = -1, maxY = -1, transparent = false;
      // Use one shared crop for every frame, so the face never jumps while talking.
      for (let frame = 0; frame < CONFIG.frames; frame++) {
        let found = false;
        for (let y = 0; y < height; y++) for (let x = 0; x < frameWidth; x++) {
          const alpha = pixels[(y * width + frame * frameWidth + x) * 4 + 3];
          if (alpha <= 8) { transparent = true; continue; }
          found = true;
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
        if (!found) throw new Error(`Frame ${frame} is empty.`);
      }
      if (!transparent) throw new Error('The PNG has no transparent background. Mouth overlay disabled to avoid covering the scene with a rectangle.');
      const cropWidth = maxX - minX + 1, cropHeight = maxY - minY + 1;
      for (let frame = 0; frame < CONFIG.frames; frame++) {
        texture.add(`alex-mouth-v1-${frame}`, 0,
          frame * frameWidth + minX, minY, cropWidth, cropHeight);
      }
      console.info('[AlexMouth] Four frames prepared.', { width, height, frameWidth, cropWidth, cropHeight });
      return true;
    } catch (error) {
      console.warn('[AlexMouth] Could not prepare spritesheet:', error.message);
      return false;
    }
  }

  layout() {
    const bg = this.scene.background;
    if (this.disposed || !this.sprite?.active || !bg?.active) return;
    const sx = bg.displayWidth / 1920, sy = bg.displayHeight / 1080;
    this.sprite.setPosition(bg.x + CONFIG.x * sx, bg.y + CONFIG.y * sy)
      .setDisplaySize(CONFIG.width * sx, CONFIG.height * sy);
  }

  update(_time, delta) {
    if (this.disposed || !this.sprite?.active) return;
    const scene = this.scene;
    const dialog = scene.storageDialog;
    const speaker = String(dialog?.speakerText?.text ?? '').trim();
    const typing = Boolean(!scene._storageDisposed && !scene.isLeaving &&
      scene.sys.isActive() && scene._conversationOpen &&
      scene.background?.visible && scene.background.texture?.key === 'agency_storage_manager' &&
      dialog && !dialog.destroyed && dialog.isOpen && dialog.isTyping && speaker === 'Alex Murphy');
    this.sprite.setVisible(typing);
    if (!typing) {
      this.wasTyping = false;
      this.patternIndex = 0;
      this.frameElapsed = 0;
      this.sprite.setFrame('alex-mouth-v1-0');
      return;
    }
    this.layout();
    if (!this.wasTyping) {
      this.wasTyping = true;
      this.patternIndex = 0;
      this.frameElapsed = 0;
    } else {
      this.frameElapsed += Math.min(Math.max(Number(delta) || 0, 0), 100);
      while (this.frameElapsed >= CONFIG.durations[this.patternIndex]) {
        this.frameElapsed -= CONFIG.durations[this.patternIndex];
        this.patternIndex = (this.patternIndex + 1) % CONFIG.pattern.length;
      }
    }
    this.sprite.setFrame(`alex-mouth-v1-${CONFIG.pattern[this.patternIndex]}`);
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    const scene = this.scene;
    scene.events.off('update', this.update, this);
    scene.scale.off('resize', this.layout, this);
    scene.events.off('shutdown', this.destroy, this);
    scene.events.off('destroy', this.destroy, this);
    this.sprite?.destroy();
    this.sprite = null;
  }
}
