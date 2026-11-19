import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { BASE_SPEED, rand, pick, clamp } from './DriveShared.js';

export const DriveControls = {
  buildInput() {
    this.keys = this.input.keyboard?.addKeys(
      'LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,ENTER'
    );

    const release = () => { this.uiHeld = false; };
    this.trackInputEvent(this.input, 'pointerup', release);
    this.trackInputEvent(this.input, 'pointerupoutside', release);
    const events = ['pointerup', 'pointercancel', 'touchcancel', 'blur'];
    for (const event of events) window.addEventListener(event, release);
    this.releaseDriveInput = () => {
      for (const event of events) window.removeEventListener(event, release);
    };

    const proceed = () => {
      if (this.state === 'summary') {
        this.leaveScene();
      }
    };

    this.trackInputEvent(this.input, 'pointerdown', () => {
      if (this.state === 'summary' && this.summaryReady && !this.uiHeld) {
        proceed();
      }
    });

    this.trackInputEvent(this.input.keyboard, 'keydown-SPACE', () => {
      if (this.summaryReady) proceed();
    });

    this.trackInputEvent(this.input.keyboard, 'keydown-ENTER', () => {
      if (this.summaryReady) proceed();
    });
  },

  stepDrive(dt) {
    const k = this.keys;
    const driving = this.state === 'driving';

    this.driveTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);

    let steer = 0;

    if (driving) {
      if (k?.LEFT?.isDown || k?.A?.isDown) steer -= 1;
      if (k?.RIGHT?.isDown || k?.D?.isDown) steer += 1;

      const p = this.input.activePointer;

      if (p.isDown && !this.uiHeld) {
        steer = clamp((this.cameras.main.getWorldPoint(p.x, p.y).x - this.W / 2) / (this.W * 0.22), -1, 1);
      }
    }

    this.steerVel += (steer - this.steerVel) * Math.min(1, dt * 7);

    let target = 1;

    if (driving) {
      if (k?.UP?.isDown || k?.W?.isDown) target = 1.4;
      else if (k?.DOWN?.isDown || k?.S?.isDown) target = 0.55;
    }

    const offroad = Math.abs(this.playerX) > 1.1;

    if (offroad) target *= 0.6;
    if (driving && this.clock < this.coffeeUntil && !(k?.DOWN?.isDown || k?.S?.isDown)) {
      target *= 1.18;
    }
    if (!driving) target = this.pos < this.L ? 0.36 : 0;

    this.speedMul += (target - this.speedMul) * Math.min(1, dt * (driving ? 2.5 : 2.2));

    const ramp = Math.min(1, this.driveTime / 1.6);
    this.speed = BASE_SPEED * this.speedMul * ramp;
    this.pos += this.speed * dt;

    const nearCurve = this.curveAt(this.pos + 60);

    this.playerX +=
      this.steerVel * dt * 1.9 -
      nearCurve * dt * 0.5 * (this.speed / BASE_SPEED);

    this.playerX = clamp(this.playerX, -1.5, 1.5);

    this.rumbleCd -= dt;

    if (offroad && this.speed > 40 && this.rumbleCd <= 0) {
      this.rumbleCd = 0.25;
      this.cameras.main.shake(90, 0.003);
    }

    if (driving) {
      this.idleTimer -= dt;

      if (this.idleTimer <= 0) {
        this.idleTimer = rand(7, 11);
        this.say(pick(FLAVOUR.dinoIdle), 3000);
      }

      if (this.pos >= this.L - 80) {
        this.state = 'arriving';
        this.arriveTime = 0;
        this.say(this.town.arrival, 3600, true);
      }
    } else {
      this.arriveTime += dt;

      if (this.arriveTime > 1.1 && this.speed < 4) {
        this.showSummary();
      }
    }
  },

  autopilot() {
    if (this.state !== 'driving') {
      return;
    }

    this.stats.autopilot = true;
    this.stats.hits += Math.max(1, Math.round(this.L / 2200));
    this.refreshStats();

    this.pos = this.L;
    this.speed = 0;
    this.speedMul = 0;

    this.cameras.main.flash(300, 0, 0, 0);
    this.showSummary();
  }
};
