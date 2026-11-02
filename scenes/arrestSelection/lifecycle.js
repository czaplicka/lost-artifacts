

export const lifecycleMethods = {
  registerKeyboard() {
    this.onLeftKeyDown = () => {
      if (this.canNavigate()) this.changeSuspect(-1);
    };

    this.onRightKeyDown = () => {
      if (this.canNavigate()) this.changeSuspect(1);
    };

    this.onEnterKeyDown = () => {
      if (this.confirmOpen) {
        this.confirmArrestFromModal();
        return;
      }

      if (this.resultCommitted && this.resultOverlay?.visible) {
        this.proceedFromResult();
        return;
      }

      if (this.canNavigate()) this.requestArrest();
    };

    this.onEscKeyDown = () => {
      if (this.zoomOverlay?.visible) {
        this.closeZoom();
        return;
      }

      if (this.confirmOpen) this.closeConfirm();
    };

    this.input.keyboard?.on('keydown-LEFT', this.onLeftKeyDown);
    this.input.keyboard?.on('keydown-RIGHT', this.onRightKeyDown);
    this.input.keyboard?.on('keydown-ENTER', this.onEnterKeyDown);
    this.input.keyboard?.on('keydown-ESC', this.onEscKeyDown);
  },

  registerSceneCleanup() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.input?.keyboard) {
        if (this.onLeftKeyDown) {
          this.input.keyboard.off('keydown-LEFT', this.onLeftKeyDown);
        }

        if (this.onRightKeyDown) {
          this.input.keyboard.off('keydown-RIGHT', this.onRightKeyDown);
        }

        if (this.onEnterKeyDown) {
          this.input.keyboard.off('keydown-ENTER', this.onEnterKeyDown);
        }

        if (this.onEscKeyDown) {
          this.input.keyboard.off('keydown-ESC', this.onEscKeyDown);
        }
      }

      this.arrestPulse?.stop?.();
      this.arrestPulse = null;

      this.onLeftKeyDown = null;
      this.onRightKeyDown = null;
      this.onEnterKeyDown = null;
      this.onEscKeyDown = null;
    });
  }
};
