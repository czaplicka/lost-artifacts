import {
  ART_BASE,
  ART_FILES,
  FAILED_ART,
  slug
} from './ComputerSearchShared.js';

export class ComputerSearchAssets {
  textureOk(key) {
    return Boolean(key) &&
      this.ui.scene.textures.exists(key);
  }

  siteKey(page) {
    return `search_site_${slug(page.brand || page.id)}`;
  }

  addTexture(key, url) {
    if (
      typeof Image === 'undefined' ||
      !key ||
      !url ||
      this.dead ||
      this.ui.destroyed ||
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
        this.ui.scene.textures.addImage(
          key,
          image
        );
      }

      this.refresh();
    };

    image.onerror = () => {
      image.onload = null;
      image.onerror = null;

      FAILED_ART.add(url);

      console.warn(
        '[ComputerSearchAssets] Image unavailable:',
        key,
        url
      );
    };

    image.src = url;
  }

  loadAssets() {
    if (!this.data) return;

    for (const [key, file] of Object.entries(ART_FILES)) {
      this.addTexture(
        key,
        ART_BASE + file
      );
    }

    for (const definition of this.data.cases || []) {
      for (const page of definition.pages || []) {
        this.addTexture(
          page.imageKey,
          page.imageUrl
        );

        this.addTexture(
          page.logoKey,
          page.logoUrl
        );
      }
    }
  }

  loadImages() {
    this.loadAssets();
  }

  art(key, x, y, maxWidth, maxHeight) {
    if (
      !this.textureOk(key) ||
      maxWidth <= 0 ||
      maxHeight <= 0
    ) {
      return null;
    }

    const frame =
      this.ui.scene.textures.getFrame(key);

    if (
      !frame ||
      frame.width <= 0 ||
      frame.height <= 0
    ) {
      return null;
    }

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
}