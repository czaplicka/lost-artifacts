import { FLAVOUR } from '../../config/RoadTripTowns.js';
import { BASE_SPEED, rand, pick, clamp } from './DriveShared.js';

const DRIVE = Object.freeze({
  maxSpeed: BASE_SPEED * 1.4,

  acceleration: BASE_SPEED * 0.36,
  braking: BASE_SPEED * 0.95,
  coasting: BASE_SPEED * 0.10,
  airResistance: BASE_SPEED * 0.055,

  offroadDrag: BASE_SPEED * 0.50,
  offroadMaxSpeed: BASE_SPEED * 0.65,

  steeringResponse: 13,
  steeringReturn: 18,
  steeringRate: 1.65,

  curveForce: 0.42,
  arrivalSpeed: BASE_SPEED * 0.32,
  arrivalResponse: BASE_SPEED * 0.70,

  coffeeMultiplier: 1.18
});

const approach = (value, target, amount) => {
  if (value < target) return Math.min(target, value + amount);
  return Math.max(target, value - amount);
};

export const DriveControls = {
  buildInput() {
    this.keys = this.input.keyboard?.addKeys(
      'LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,ENTER'
    );

    this.speed = 0;
    this.speedMul = 0;
    this.steerVel = 0;

    this._driveDrag = null;
    this._driveInputFocused = true;

    this.introText?.setText(
      'W / UP: GAS   S / DOWN / SPACE: BRAKE\n' +
      'A / D OR LEFT / RIGHT: STEER\n' +
      'MOUSE: HOLD AND DRAG TO STEER'
    );

    const releasePointer = pointer => {
      if (
        !pointer ||
        !this._driveDrag ||
        pointer.id === this._driveDrag.id
      ) {
        this._driveDrag = null;
      }

      this.uiHeld = false;
    };

    const resetInput = () => {
      this._driveDrag = null;
      this.uiHeld = false;

      for (const key of Object.values(this.keys || {})) {
        key?.reset?.();
      }
    };

    const onBlur = () => {
      this._driveInputFocused = false;
      resetInput();
    };

    const onFocus = () => {
      resetInput();
      this._driveInputFocused = true;
    };

    const onVisibility = () => {
      if (document.hidden) onBlur();
      else onFocus();
    };

    const proceed = () => {
      if (
        this.state === 'summary' &&
        this.summaryReady &&
        !this._cleanupDone
      ) {
        this.leaveScene();
      }
    };

    this.trackInputEvent(
      this.input,
      'pointerdown',
      (pointer, currentlyOver = []) => {
        if (this.state === 'summary') {
          if (!this.uiHeld) proceed();
          return;
        }

        if (
          this.state !== 'driving' ||
          this.uiHeld ||
          !this._driveInputFocused ||
          this._driveDrag ||
          currentlyOver.length > 0 ||
          pointer.button > 0
        ) {
          return;
        }

        const point = this.cameras.main.getWorldPoint(
          pointer.x,
          pointer.y
        );

        this._driveDrag = {
          id: pointer.id,
          startX: point.x
        };
      }
    );

    this.trackInputEvent(this.input, 'pointerup', releasePointer);
    this.trackInputEvent(
      this.input,
      'pointerupoutside',
      releasePointer
    );

    if (this.input.keyboard) {
      for (const eventName of ['keydown-SPACE', 'keydown-ENTER']) {
        this.trackInputEvent(
          this.input.keyboard,
          eventName,
          event => {
            if (event?.repeat) return;
            proceed();
          }
        );
      }
    }

    const onPointerCancel = () => resetInput();

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('touchcancel', onPointerCancel);
    document.addEventListener('visibilitychange', onVisibility);

    let released = false;

    this.releaseDriveInput = () => {
      if (released) return;
      released = true;

      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(
        'pointercancel',
        onPointerCancel
      );
      window.removeEventListener(
        'touchcancel',
        onPointerCancel
      );
      document.removeEventListener(
        'visibilitychange',
        onVisibility
      );

      resetInput();
    };

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.releaseDriveInput
    );
  },

  stepDrive(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;

    const driving = this.state === 'driving';
    const arriving = this.state === 'arriving';

    if (!driving && !arriving) return;

    this.driveTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.rumbleCd = Math.max(0, this.rumbleCd - dt);

    const k = this.keys;
    const focused = this._driveInputFocused;

    const throttle = driving && focused && Boolean(
      k?.UP?.isDown || k?.W?.isDown
    );

    const brake = driving && focused && Boolean(
      k?.DOWN?.isDown ||
      k?.S?.isDown ||
      k?.SPACE?.isDown
    );

    let steer = 0;

    if (driving && focused) {
      const left = Boolean(k?.LEFT?.isDown || k?.A?.isDown);
      const right = Boolean(k?.RIGHT?.isDown || k?.D?.isDown);

      steer = Number(right) - Number(left);

      if (!left && !right && this._driveDrag && !this.uiHeld) {
        const pointer = this.input.manager.pointers.find(
          candidate => candidate.id === this._driveDrag.id
        );

        if (pointer?.isDown) {
          const point = this.cameras.main.getWorldPoint(
            pointer.x,
            pointer.y
          );

          const travel = this.W * 0.14;
          const delta = point.x - this._driveDrag.startX;
          const deadzone = this.W * 0.004;
          const distance = Math.max(0, Math.abs(delta) - deadzone);

          steer = Math.sign(delta) * clamp(
            distance / travel,
            0,
            1
          );
        } else {
          this._driveDrag = null;
        }
      }
    }

    const response = steer === 0
      ? DRIVE.steeringReturn
      : DRIVE.steeringResponse;

    const blend = 1 - Math.exp(-response * dt);

    this.steerVel += (steer - this.steerVel) * blend;

    if (Math.abs(this.steerVel) < 0.001) {
      this.steerVel = 0;
    }

    let speed = Math.max(0, this.speed);

    // Existing collision handling reduces speedMul.
    const collisionSpeed = Math.max(0, this.speedMul) * BASE_SPEED;

    if (collisionSpeed < speed - 0.001) {
      speed = collisionSpeed;
    }

    const previousSpeed = speed;
    const speedRatio = speed / BASE_SPEED;

    const offroadAmount = clamp(
      (Math.abs(this.playerX) - 0.98) / 0.25,
      0,
      1
    );

    const coffee = driving && this.clock < this.coffeeUntil;
    const coffeeMultiplier = coffee
      ? DRIVE.coffeeMultiplier
      : 1;

    const roadMaxSpeed = DRIVE.maxSpeed * coffeeMultiplier;

    const maxSpeed = roadMaxSpeed +
      (
        DRIVE.offroadMaxSpeed - roadMaxSpeed
      ) * offroadAmount;

    if (driving) {
      if (brake || !focused) {
        speed -= DRIVE.braking * dt;
      } else if (throttle) {
        const acceleration = DRIVE.acceleration *
          coffeeMultiplier *
          (1 - offroadAmount * 0.35);

        speed += acceleration * dt;
      } else {
        speed -= (
          DRIVE.coasting +
          DRIVE.airResistance * speedRatio * speedRatio
        ) * dt;
      }

      speed -= DRIVE.offroadDrag * offroadAmount * dt;
      speed = Math.max(0, speed);

      if (speed > maxSpeed) {
        speed = approach(
          speed,
          maxSpeed,
          DRIVE.acceleration * dt
        );
      }

      if (speed < 0.5 && !throttle) {
        speed = 0;
      }
    } else {
      const remaining = Math.max(0, this.L - this.pos);

      const target = Math.min(
        DRIVE.arrivalSpeed,
        Math.sqrt(2 * DRIVE.arrivalResponse * remaining)
      );

      speed = approach(
        speed,
        target,
        DRIVE.arrivalResponse * dt
      );
    }

    this.speed = speed;
    this.speedMul = speed / BASE_SPEED;

    const distance = (previousSpeed + speed) * 0.5 * dt;

    this.pos = Math.min(
      this.L,
      this.pos + distance
    );

    const movement = clamp(speed / (BASE_SPEED * 0.3), 0, 1);
    const fastDriving = clamp(speed / DRIVE.maxSpeed, 0, 1);

    const steeringGrip = 1 -
      fastDriving * 0.18 -
      offroadAmount * 0.15;

    const nearCurve = this.curveAt(this.pos + 60);

    this.playerX += (
      this.steerVel *
      DRIVE.steeringRate *
      movement *
      steeringGrip -
      nearCurve *
      DRIVE.curveForce *
      (speed / BASE_SPEED)
    ) * dt;

    this.playerX = clamp(this.playerX, -1.5, 1.5);

    if (
      offroadAmount > 0.1 &&
      speed > 40 &&
      this.rumbleCd <= 0
    ) {
      this.rumbleCd = 0.25;

      this.cameras.main.shake(
        90,
        0.001 + offroadAmount * 0.002
      );
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
        this._driveDrag = null;
        this.say(this.town.arrival, 3600, true);
      }

      return;
    }

    this.arriveTime += dt;

    if (this.pos >= this.L) {
      this.speed = 0;
      this.speedMul = 0;

      if (this.arriveTime > 1.1) {
        this.showSummary();
      }
    }
  },

  autopilot() {
    if (this.state !== 'driving') return;

    this._driveDrag = null;

    this.stats.autopilot = true;
    this.stats.hits += Math.max(
      1,
      Math.round(this.L / 2200)
    );

    this.refreshStats();

    this.pos = this.L;
    this.speed = 0;
    this.speedMul = 0;
    this.steerVel = 0;

    this.cameras.main.flash(300, 0, 0, 0);
    this.showSummary();
  }
};