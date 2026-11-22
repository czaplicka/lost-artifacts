import { TvMoviePlayer } from './TvMoviePlayer.js';

export class TvChannelMoviePlayer extends TvMoviePlayer {
  update() {
    super.update();
    if (!this.active || !this.failed || this.failureAdvance || this.destroyed) return;
    this.failureAdvance = this.scene.time.delayedCall(6500,()=>{
      this.failureAdvance = null;
      if (!this.active || !this.failed || this.destroyed || this.scene?.isClosing) return;
      const callback = this.onEnded;
      this.stop();
      callback?.();
    });
    this.failureAdvance.paused = Boolean(this.scene.isBroadcastPaused || this.sceneSuspended);
  }
  setPaused(paused) {
    super.setPaused(paused);
    if (this.failureAdvance) this.failureAdvance.paused = paused;
  }
  stop() {
    this.failureAdvance?.remove?.(false);
    this.failureAdvance = null;
    super.stop();
  }
}
