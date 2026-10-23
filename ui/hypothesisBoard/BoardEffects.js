import { STRING_COLORS } from './BoardConstants.js';

export const BoardEffects = {
  _playIntro() {
    const L = this.layout;
    if (!L || this.isDestroyed) return;

    this.overlay.setAlpha(0);
    this._tween({ targets: this.overlay, alpha: 1, duration: 180 });

    this.panel.setAlpha(0);
    this._tween({ targets: this.panel, alpha: 1, duration: 260 });

    [this.titleText, this.subtitleText, this.attemptsText, this.attemptsIcons]
      .forEach((obj, i) => {
        obj.setAlpha(0);
        this._tween({ targets: obj, alpha: 1, duration: 260, delay: 80 + i * 60 });
      });

    this.slotViews.forEach((view, i) => {
      const y = view.container.y;
      view.container.setAlpha(0).setY(y - 24);
      this._tween({
        targets: view.container,
        alpha: 1,
        y,
        duration: 280,
        delay: 160 + i * 110,
        ease: 'Cubic.easeOut'
      });
    });

    // Karteczki "rozdawane" na tablicę
    this.cardViews.forEach((view, i) => {
      view.container.setAlpha(0).setY(view.baseY + 40);
      this._tween({
        targets: view.container,
        alpha: this.isCardUsed(view.index) ? 0.38 : 1,
        y: view.baseY,
        duration: 300,
        delay: 360 + i * 80,
        ease: 'Back.easeOut'
      });
    });

    [this.legendContainer, this.feedbackText, this.closeButton, this.confirmButton]
      .forEach(obj => {
        obj.setAlpha(0);
        this._tween({ targets: obj, alpha: 1, duration: 260, delay: 700 });
      });
  },

  _settleCard(view, animate = true) {
    if (!view?.container?.scene || this.isDestroyed) return;

    const used = this.isCardUsed(view.index);
    const selected = this.state?.selectedCardIndex === view.index && !used;
    const hover = view.hover && !used && !selected;

    const target = {
      x: view.baseX,
      y: view.baseY - (selected ? 10 : hover ? 5 : 0),
      scale: selected ? 1.05 : hover ? 1.02 : 1,
      rotation: selected ? 0 : view.baseRot,
      alpha: used ? 0.38 : 1
    };

    this._kill(view.container);

    const tween = animate
      ? this._tween({
          targets: view.container,
          ...target,
          duration: 140,
          ease: 'Sine.easeOut'
        })
      : null;

    if (!tween) {
      view.container
        .setPosition(target.x, target.y)
        .setScale(target.scale)
        .setRotation(target.rotation)
        .setAlpha(target.alpha);
    }
  },

  _cardPin(view) {
    const ch = this.layout.cardHeight;
    const d = ch / 2 - 8;
    const r = view.container.rotation;

    return {
      x: view.container.x + d * Math.sin(r),
      y: view.container.y - d * Math.cos(r)
    };
  },

  drawStrings() {
    const g = this.stringGfx;
    const L = this.layout;

    if (!g?.scene || !L || this.isDestroyed) return;

    g.clear();

    this.slotViews.forEach((slotView, slotIndex) => {
      const cardIndex = this.state?.getPlacedCardIndex?.(slotIndex);

      if (
        cardIndex === null ||
        cardIndex === undefined ||
        cardIndex < 0
      ) {
        return;
      }

      const cardView = this.cardViews[cardIndex];

      if (!cardView) return;

      const feedback = this.state?.slotFeedback?.[slotIndex] || 'neutral';
      const color = STRING_COLORS[feedback] ?? STRING_COLORS.neutral;

      const start = {
        x: slotView.container.x,
        y: slotView.container.y + L.slotHeight / 2
      };

      const end = this._cardPin(cardView);

      const progress = this._stringProg[slotIndex] ?? 1;

      const sag = 26 + Math.hypot(end.x - start.x, end.y - start.y) * 0.08;
      const control = {
        x: (start.x + end.x) / 2,
        y: Math.max(start.y, end.y) + sag * 0.35 + 18
      };

      const pointAt = t => ({
        x: (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x,
        y: (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y
      });

      const steps = 28;
      const last = Math.max(1, Math.round(steps * progress));

      // Cień sznurka
      g.lineStyle(4, 0x000000, 0.3);
      g.beginPath();
      for (let i = 0; i <= last; i++) {
        const p = pointAt(i / steps);
        if (i === 0) g.moveTo(p.x + 2, p.y + 3);
        else g.lineTo(p.x + 2, p.y + 3);
      }
      g.strokePath();

      // Sznurek + jasny refleks (efekt skręconej nici)
      g.lineStyle(3, color, 0.95);
      g.beginPath();
      for (let i = 0; i <= last; i++) {
        const p = pointAt(i / steps);
        if (i === 0) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
      }
      g.strokePath();

      g.lineStyle(1, 0xffffff, 0.25);
      g.beginPath();
      for (let i = 0; i <= last; i++) {
        const p = pointAt(i / steps);
        if (i === 0) g.moveTo(p.x, p.y - 1);
        else g.lineTo(p.x, p.y - 1);
      }
      g.strokePath();

      // Węzły na końcach
      g.fillStyle(color, 1);
      g.fillCircle(start.x, start.y, 4);
      if (progress >= 1) g.fillCircle(end.x, end.y, 4);
    });
  },

  _reactToFeedback(newFeedback) {
    const changed = [];

    newFeedback.forEach((feedback, i) => {
      const prev = this._lastFeedback[i] || 'neutral';
      if (feedback !== 'neutral' && feedback !== prev) {
        changed.push(i);
      }
    });

    this._lastFeedback = newFeedback.slice();

    if (!changed.length) return;

    changed.forEach((slotIndex, order) => {
      this._popSlot(slotIndex, order * 120);
    });

    const anyGreen = changed.some(i => newFeedback[i] === 'green');
    this._sfx(anyGreen ? 'correct' : 'wrong', 0.4);
  },

  _reactToPlacement(placed) {
    placed.forEach((cardIndex, slotIndex) => {
      const prev = this._prevPlaced[slotIndex] ?? null;

      if (cardIndex === null) {
        delete this._stringProg[slotIndex];
        this._kill(this._stringHolders[slotIndex]);
        delete this._stringHolders[slotIndex];
        return;
      }

      if (cardIndex !== prev) {
        this._startStringTween(slotIndex);
      }
    });

    this._prevPlaced = placed.slice();
  },

  _startStringTween(slotIndex) {
    this._kill(this._stringHolders[slotIndex]);

    const holder = { v: 0 };
    this._stringHolders[slotIndex] = holder;
    this._stringProg[slotIndex] = 0;

    const done = () => {
      this._stringProg[slotIndex] = 1;
      this.drawStrings();
    };

    const tween = this._tween({
      targets: holder,
      v: 1,
      duration: 260,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this._stringProg[slotIndex] = holder.v;
        this.drawStrings();
      },
      onComplete: done
    });

    if (!tween) {
      done();
      return;
    }

    this._sfx('paper_rustle', 0.3);
  },

  _popSlot(slotIndex, delay = 0) {
    const view = this.slotViews[slotIndex];

    if (!view?.container?.scene) return;

    this._tween({
      targets: view.container,
      scale: 1.06,
      duration: 110,
      delay,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (view.container?.scene) view.container.setScale(1);
      }
    });
  },

  showFeedback(text, color = '#ffd966') {
    if (!this.feedbackText || this.isDestroyed) {
      return;
    }

    this._kill(this.feedbackText);

    this.feedbackText
      .setText(text)
      .setColor(color)
      .setAlpha(0.2);

    const tween = this._tween({
      targets: this.feedbackText,
      alpha: 1,
      duration: 180,
      ease: 'Sine.easeOut'
    });

    if (!tween) this.feedbackText.setAlpha(1);
  },

  showGreenNarrative(slotIndex, text, delay = 0) {
    if (!text || this.isDestroyed) {
      return;
    }

    this.scene.time.delayedCall(delay, () => {
      if (this.isDestroyed) {
        return;
      }

      const view = this.slotViews[slotIndex];

      if (!view) {
        return;
      }

      view.answerText.setText(text);
      view.answerText.setColor('#b9efb9');
      this._popSlot(slotIndex);
    });
  },

  flashSlot(slotIndex) {
    const view = this.slotViews[slotIndex];

    if (!view?.box) {
      return;
    }

    this._kill(view.box);

    this._tween({
      targets: view.box,
      alpha: {
        from: 1,
        to: 0.7
      },
      yoyo: true,
      duration: 90,
      repeat: 1,
      onComplete: () => {
        if (view.box?.active) {
          view.box.setAlpha(1);
        }
      }
    });
  }
};
