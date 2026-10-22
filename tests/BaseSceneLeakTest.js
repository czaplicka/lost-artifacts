import { EventBus } from '../EventBus.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function once(emitter, eventName, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      resolve();
    };

    const timer = setTimeout(() => {
      emitter.off(eventName, done);
      reject(new Error(`Timeout waiting for "${eventName}"`));
    }, timeoutMs);

    emitter.once(eventName, done);
  });
}

function countBusListeners() {
  const emitter = EventBus.emitter;

  if (!emitter || typeof emitter.eventNames !== 'function') {
    return -1;
  }

  let total = 0;

  for (const name of emitter.eventNames()) {
    total += emitter.listenerCount(name);
  }

  return total;
}

function countBusOwnedBy(scene) {
  return EventBus.registry?.get(scene)?.size ?? 0;
}

function snapshot(scene) {
  const E = Phaser.Scenes.Events;
  const events = scene.events;

  return {
    activeTweens: scene.activeTweens?.size ?? -1,
    trackingCallbacks: scene._tweenTrackingCallbacks?.size ?? -1,
    sleepPaused: scene._sleepPausedTweens?.size ?? -1,
    inputEvents: scene.inputEvents?.length ?? -1,
    sceneEventsListeners: scene.sceneEvents
      ? scene.sceneEvents.eventNames().length
      : 0,
    evShutdown: events.listenerCount(E.SHUTDOWN),
    evSleep: events.listenerCount(E.SLEEP),
    evWake: events.listenerCount(E.WAKE),
    evDestroy: events.listenerCount(E.DESTROY),
    evCreate: events.listenerCount(E.CREATE),
    evPause: events.listenerCount(E.PAUSE),
    evResume: events.listenerCount(E.RESUME),
    scaleResize: scene.scale.listenerCount('resize'),
    busTotal: countBusListeners(),
    busOwnedByScene: countBusOwnedBy(scene),
    phaserTweens: scene.tweens?.getTweens?.().length ?? -1,
    children: scene.children?.list?.length ?? -1,
    timers: scene.time?._active?.length ?? -1
  };
}

function diffSnapshots(base, current) {
  const diff = {};

  for (const key of Object.keys(base)) {
    if (base[key] !== current[key]) {
      diff[key] = { baseline: base[key], now: current[key] };
    }
  }

  return diff;
}

export async function runBaseSceneLeakTest(
  game,
  sceneKey,
  { cycles = 10, data = {}, idleKey = null } = {}
) {
  const failures = [];
  const warnings = [];
  const errors = [];

  const check = (name, condition, extra = '') => {
    if (!condition) {
      failures.push(`${name} ${extra}`.trim());
    }
  };

  const onError = event => errors.push(event.message || String(event));
  const onRejection = event => errors.push(String(event.reason));
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  const originalWarn = console.warn;
  console.warn = (...args) => {
    const first = String(args[0] ?? '');

    if (
      first.startsWith('[BaseScene]') ||
      first.startsWith('[MonologueManager]') ||
      first.startsWith('[EventBus]')
    ) {
      warnings.push(args.map(String).join(' '));
    }

    originalWarn.apply(console, args);
  };

  const restoreGlobals = () => {
    console.warn = originalWarn;
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };

  const scene = game.scene.getScene(sceneKey);

  if (!scene) {
    restoreGlobals();
    throw new Error(`Scene "${sceneKey}" is not registered.`);
  }

  const startScene = async () => {
    const created = once(scene.events, Phaser.Scenes.Events.CREATE);
    game.scene.start(sceneKey, data);
    await created;
    await wait(80);
  };

  const stopScene = async () => {
    game.scene.stop(sceneKey);
    await wait(250);
  };

  let baseline = null;
  let last = null;

  try {
    if (
      game.scene.isActive(sceneKey) ||
      game.scene.isSleeping(sceneKey) ||
      game.scene.isPaused(sceneKey)
    ) {
      await stopScene();
    }

    for (let cycle = 0; cycle < cycles; cycle += 1) {
      await startScene();

      const label = `cycle ${cycle}`;

      const longTween = scene.createTrackedTween({
        targets: { v: 0 },
        v: 1,
        duration: 60000
      });

      const loopTween = scene.createTrackedTween({
        targets: { v: 0 },
        v: 1,
        duration: 60000,
        repeat: -1,
        yoyo: true
      });

      const manualTween = scene.createTrackedTween({
        targets: { v: 0 },
        v: 1,
        duration: 60000
      });

      manualTween?.pause();

      const fakeTarget = new Phaser.Events.EventEmitter();
      scene.trackInputEvent(fakeTarget, 'ping', () => {});

      scene.onBus('leak-test-event', () => {});

      const monologue = scene.monologue;
      check(`${label}: monologue created`, Boolean(monologue));

      monologue?.say('Leak test line.', { force: true });

      if (idleKey) {
        monologue?.startIdle(idleKey, { minDelay: 500, maxDelay: 800 });
      }

      const containers = scene.children.list.filter(
        o => o.type === 'Container' && o.depth === 100000
      );
      check(
        `${label}: single monologue container`,
        containers.length === 1,
        `(found ${containers.length})`
      );

      const stopRightAfterSay = cycle % 3 === 0;

      if (!stopRightAfterSay) {
        for (let i = 0; i < 3; i += 1) {
          game.scene.sleep(sceneKey);
          await wait(120);

          check(
            `${label} sleep ${i}: tweens paused`,
            !scene.isTweenPlaying(longTween) &&
              !scene.isTweenPlaying(loopTween)
          );

          check(
            `${label} sleep ${i}: idle timer cancelled`,
            !monologue?.idleTimer
          );

          game.scene.wake(sceneKey);
          await wait(120);

          check(
            `${label} wake ${i}: tweens resumed`,
            scene.isTweenPlaying(longTween) &&
              scene.isTweenPlaying(loopTween)
          );

          check(
            `${label} wake ${i}: manual tween stays paused`,
            !scene.isTweenPlaying(manualTween)
          );

          check(
            `${label} wake ${i}: sleepPaused cleared`,
            scene._sleepPausedTweens.size === 0
          );

          if (idleKey) {
            check(
              `${label} wake ${i}: idle timer restored`,
              Boolean(monologue?.idleTimer)
            );
          }
        }
      }

      if (cycle % 2 === 1) {
        game.scene.sleep(sceneKey);
        await wait(120);
      }

      await stopScene();

      check(
        `${label}: old monologue destroyed`,
        monologue?.isDestroyed === true
      );
      check(
        `${label}: old monologue not usable`,
        monologue?.isSceneUsable() === false
      );
      check(
        `${label}: old monologue refuses say()`,
        monologue?.say('late line', { force: true }) === false
      );
      check(`${label}: scene._monologue null`, scene._monologue === null);
      check(`${label}: scene.monologue getter null`, scene.monologue === null);
      check(
        `${label}: tracked tweens gone`,
        scene.activeTweens.size === 0 &&
          scene._tweenTrackingCallbacks.size === 0 &&
          scene._sleepPausedTweens.size === 0
      );
      check(`${label}: input events gone`, scene.inputEvents.length === 0);
      check(
        `${label}: EventBus scope cleared`,
        countBusOwnedBy(scene) === 0,
        `(${countBusOwnedBy(scene)} left)`
      );
      check(
        `${label}: tweens not playing`,
        !scene.isTweenPlaying(longTween) &&
          !scene.isTweenPlaying(loopTween)
      );

      last = snapshot(scene);

      if (cycle === 0) {
        baseline = last;
      } else {
        const diff = diffSnapshots(baseline, last);

        if (Object.keys(diff).length) {
          failures.push(
            `${label}: leak vs baseline ${JSON.stringify(diff)}`
          );
        }
      }
    }
  } catch (error) {
    failures.push(`Test crashed: ${error.message}`);
  } finally {
    restoreGlobals();
  }

  const result = {
    passed: failures.length === 0 && errors.length === 0,
    failures,
    errors,
    warnings,
    baseline,
    last
  };

  console.group(
    result.passed
      ? '✅ BaseScene leak test PASSED'
      : '❌ BaseScene leak test FAILED'
  );
  if (baseline) console.table({ baseline, last });
  failures.forEach(f => console.error(f));
  errors.forEach(e => console.error('Runtime error:', e));
  warnings.forEach(w => console.warn('Captured:', w));
  console.groupEnd();

  return result;
}

export function installLeakTest(game) {
  window.leakTest = async (sceneKey, options) => {
    if (game.sceneLoader && !game.scene.keys[sceneKey]) {
      await game.sceneLoader.ensure(sceneKey);
    }

    return runBaseSceneLeakTest(game, sceneKey, options);
  };
}