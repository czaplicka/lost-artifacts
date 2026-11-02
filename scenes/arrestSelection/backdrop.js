import { DESK_TEXTURE_KEY, VIGNETTE_TEXTURE_KEY } from './config.js';

export const backdropMethods = {
  ensureDecorTextures() {
    const { width, height } = this.scale;

    if (!this.textures.exists(DESK_TEXTURE_KEY)) {
      const tex = this.textures.createCanvas(
        DESK_TEXTURE_KEY,
        width,
        height
      );

      const ctx = tex?.getContext();

      if (ctx) {
        const plankH = 120;

        for (let y = 0; y < height; y += plankH) {
          const r = 70 + Math.floor(Math.random() * 18);
          const g = 46 + Math.floor(Math.random() * 12);
          const b = 28 + Math.floor(Math.random() * 8);

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(0, y, width, plankH);

          for (let i = 0; i < 70; i += 1) {
            const gx = Math.random() * width;
            const gy = y + 6 + Math.random() * (plankH - 12);
            const len = 140 + Math.random() * 520;

            ctx.strokeStyle = `rgba(0, 0, 0, ${
              0.05 + Math.random() * 0.09
            })`;
            ctx.lineWidth = 1 + Math.random() * 1.6;

            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.bezierCurveTo(
              gx + len * 0.3,
              gy + (Math.random() - 0.5) * 6,
              gx + len * 0.6,
              gy + (Math.random() - 0.5) * 6,
              gx + len,
              gy + (Math.random() - 0.5) * 4
            );
            ctx.stroke();
          }

          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(0, y, width, 3);

          ctx.fillStyle = 'rgba(255, 220, 160, 0.06)';
          ctx.fillRect(0, y + 3, width, 2);

          const jointX = Math.random() * width;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
          ctx.fillRect(jointX, y, 3, plankH);
        }

        tex.refresh();
      }
    }

    if (!this.textures.exists(VIGNETTE_TEXTURE_KEY)) {
      const tex = this.textures.createCanvas(
        VIGNETTE_TEXTURE_KEY,
        width,
        height
      );

      const ctx = tex?.getContext();

      if (ctx) {
        const warm = ctx.createRadialGradient(
          width * 0.5,
          height * 0.42,
          40,
          width * 0.5,
          height * 0.42,
          height * 0.9
        );

        warm.addColorStop(0, 'rgba(255, 205, 120, 0.16)');
        warm.addColorStop(1, 'rgba(255, 205, 120, 0)');

        ctx.fillStyle = warm;
        ctx.fillRect(0, 0, width, height);

        const dark = ctx.createRadialGradient(
          width / 2,
          height / 2,
          height * 0.38,
          width / 2,
          height / 2,
          height * 1.0
        );

        dark.addColorStop(0, 'rgba(0, 0, 0, 0)');
        dark.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

        ctx.fillStyle = dark;
        ctx.fillRect(0, 0, width, height);

        tex.refresh();
      }
    }
  },

  createBackdrop() {
    const { width, height } = this.scale;

    this.ensureDecorTextures();

    this.backdropRoot = this.add
      .container(0, 0)
      .setDepth(300);

    const desk = this.add.image(width / 2, height / 2, DESK_TEXTURE_KEY);

    const props = this.add.graphics();

    // coffee ring peeking out from under the folder
    props.fillStyle(0x2a1709, 0.1);
    props.fillCircle(1850, 880, 60);
    props.lineStyle(7, 0x2a1709, 0.38);
    props.strokeCircle(1850, 880, 64);
    props.lineStyle(3, 0x2a1709, 0.25);
    props.strokeCircle(1853, 884, 57);

    // pencil lying on the desk (bottom-left)
    const pencil = this.add
      .graphics({ x: 215, y: 1002 })
      .setRotation(-0.22);

    pencil.fillStyle(0x000000, 0.25);
    pencil.fillRect(-146, 6, 300, 20);
    pencil.fillStyle(0xe2b53a, 1);
    pencil.fillRect(-150, -10, 300, 20);
    pencil.fillStyle(0xb8861b, 1);
    pencil.fillRect(-150, -2, 300, 4);
    pencil.fillStyle(0xc9c2b0, 1);
    pencil.fillRect(-168, -10, 18, 20);
    pencil.fillStyle(0xd9667a, 1);
    pencil.fillRect(-186, -10, 18, 20);
    pencil.fillStyle(0xe8cfa0, 1);
    pencil.fillTriangle(150, -10, 150, 10, 190, 0);
    pencil.fillStyle(0x2b2b2b, 1);
    pencil.fillTriangle(176, -3, 176, 3, 190, 0);

    const vignette = this.add.image(
      width / 2,
      height / 2,
      VIGNETTE_TEXTURE_KEY
    );

    this.backdropRoot.add([desk, props, pencil, vignette]);
  }
};
