const CONFIG = {
  key: 'alex-storage',
  url: 'assets/spritesheet/office/alex-storage.png',
  frames: 4,

  // Crop within EACH full frame, based on the supplied 4-frame artwork.
  // Only lips and a small surrounding patch; no nose, jaw outline or whole face.
  crop: { x: 0.43, y: 0.55, width: 0.38, height: 0.19 },

  // Center and display size relative to the 1920 x 1080 room background.
  x: 1247,
  y: 460,
  width: 28,
  height: 14,
  feather: 0.18,
  depth: 6,
  pattern: [1, 2, 1, 3, 1, 2, 0],
  durations: [110, 90, 100, 130, 90, 110, 160]
};

let nextTextureId = 0;

export function alexMouthSource(scene) {
  const manifest = scene.cache.json.get('assetManifest');
  const asset = manifest?.assetCatalog?.find(
    a => a.type === 'image' && a.url === CONFIG.url
  );
  return asset ?? { key: CONFIG.key, url: CONFIG.url };
}

export class AlexMouthAnimation {
  constructor(scene) {
    this.scene = scene;
    this.disposed = false;
    this.sprite = null;
    this.textureKey = null;
    this.wasTyping = false;
    this.patternIndex = 0;
    this.frameElapsed = 0;
    this.sourceKey = alexMouthSource(scene).key;

    if (!this.prepareFrames()) return;

    this.sprite = scene.add.sprite(0, 0, this.textureKey, 0)
      .setOrigin(0.5)
      .setDepth(CONFIG.depth)
      .setVisible(false);

    this.layout();
    scene.events.on('update', this.update, this);
    scene.scale.on('resize', this.layout, this);
    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);
  }

  prepareFrames() {
    if (!this.scene.textures.exists(this.sourceKey)) {
      console.warn('[AlexMouth] Missing image:', CONFIG.url);
      return false;
    }

    const image = this.scene.textures.get(this.sourceKey).getSourceImage();
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    if (!width || !height || width % CONFIG.frames !== 0) {
      console.warn('[AlexMouth] Expected four equal frames in one horizontal row.', { width, height });
      return false;
    }

    const cellWidth = width / CONFIG.frames;
    const cropX = Math.floor(cellWidth * CONFIG.crop.x);
    const cropY = Math.floor(height * CONFIG.crop.y);
    const cropWidth = Math.min(cellWidth - cropX, Math.round(cellWidth * CONFIG.crop.width));
    const cropHeight = Math.min(height - cropY, Math.round(height * CONFIG.crop.height));
    const key = `alex-mouth-detail-v2-${++nextTextureId}`;

    try {
      const texture = this.scene.textures.createCanvas(
        key, cropWidth * CONFIG.frames, cropHeight
      );
      if (!texture) throw new Error('Could not create mouth texture.');
      this.textureKey = key;
      const context = texture.getContext();
      context.clearRect(0, 0, cropWidth * CONFIG.frames, cropHeight);
      context.imageSmoothingEnabled = false;

      for (let frame = 0; frame < CONFIG.frames; frame++) {
        context.drawImage(
          image,
          frame * cellWidth + cropX, cropY, cropWidth, cropHeight,
          frame * cropWidth, 0, cropWidth, cropHeight
        );
      }

      // A soft elliptical edge hides the rectangular skin-patch boundary.
      const pixels = context.getImageData(
        0, 0, cropWidth * CONFIG.frames, cropHeight
      );
      for (let frame = 0; frame < CONFIG.frames; frame++) {
        for (let y = 0; y < cropHeight; y++) {
          for (let x = 0; x < cropWidth; x++) {
            const nx = (x + 0.5 - cropWidth / 2) / (cropWidth / 2);
            const ny = (y + 0.5 - cropHeight / 2) / (cropHeight / 2);
            const radius = Math.sqrt(nx * nx + ny * ny);
            const alpha = Math.max(0, Math.min(1, (1 - radius) / CONFIG.feather));
            const index = (y * pixels.width + frame * cropWidth + x) * 4 + 3;
            pixels.data[index] = Math.round(pixels.data[index] * alpha);
          }
        }
      }
      context.putImageData(pixels, 0, 0);

      for (let frame = 0; frame < CONFIG.frames; frame++) {
        texture.add(frame, 0, frame * cropWidth, 0, cropWidth, cropHeight);
      }
      texture.refresh();
      console.info('[AlexMouth] Lip-only frames ready.', { cellWidth, cropX, cropY, cropWidth, cropHeight });
      return true;
    } catch (error) {
      console.warn('[AlexMouth] Could not prepare mouth frames:', error);
      if (this.textureKey) this.scene.textures.remove(this.textureKey);
      this.textureKey = null;
      return false;
    }
  }

  layout() {
    const bg = this.scene.background;
    if (this.disposed || !this.sprite?.active || !bg?.active) return;
    const sx = bg.displayWidth / 1920;
    const sy = bg.displayHeight / 1080;
    this.sprite.setPosition(bg.x + CONFIG.x * sx, bg.y + CONFIG.y * sy)
      .setDisplaySize(CONFIG.width * sx, CONFIG.height * sy);
  }

  update(_time, delta) {
    if (this.disposed || !this.sprite?.active) return;
    const scene = this.scene;
    const dialog = scene.storageDialog;
    const speaker = String(dialog?.speakerText?.text ?? '').trim();
    const typing = Boolean(
      !scene._storageDisposed && !scene.isLeaving && scene.sys.isActive() &&
      scene._conversationOpen && scene.background?.visible &&
      scene.background.texture?.key === 'agency_storage_manager' &&
      dialog && !dialog.destroyed && dialog.isOpen && dialog.isTyping &&
      speaker === 'Alex Murphy'
    );

    this.sprite.setVisible(typing);
    if (!typing) {
      this.wasTyping = false;
      this.patternIndex = 0;
      this.frameElapsed = 0;
      this.sprite.setFrame(0);
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
    this.sprite.setFrame(CONFIG.pattern[this.patternIndex]);
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
    if (this.textureKey) scene.textures.remove(this.textureKey);
    this.textureKey = null;
  }
}