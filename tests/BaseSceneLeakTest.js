import { EventBus } from '../EventBus.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function countListeners(emitter) {
  if (typeof emitter?.eventNames !== 'function') {
    return null;
  }

  return emitter.eventNames().reduce(
    (total, name) => total + emitter.listenerCount(name),
    0
  );
}

function countBusOwnedBy(scene) {
  return EventBus.registry?.get(scene)?.size ?? 0;
}

function snapshot(scene) {
  const E = Phaser.Scenes.Events;
  const events = scene.events;

  return {
    activeTweens: scene.activeTweens?.size ?? null,
    trackingCallbacks: scene._tweenTrackingCallbacks?.size ?? null,
    sleepPaused: scene._sleepPausedTweens?.size ?? null,
    inputEvents: scene.inputEvents?.length ?? null,
    sceneEventsListeners: scene.sceneEvents
      ? countListeners(scene.sceneEvents)
      : 0,
    evShutdown: events?.listenerCount(E.SHUTDOWN) ?? null,
    evSleep: events?.listenerCount(E.SLEEP) ?? null,
    evWake: events?.listenerCount(E.WAKE) ?? null,
    evDestroy: events?.listenerCount(E.DESTROY) ?? null,
    evCreate: events?.listenerCount(E.CREATE) ?? null,
    evPause: events?.listenerCount(E.PAUSE) ?? null,
    evResume: events?.listenerCount(E.RESUME) ?? null,
    scaleResize: scene.scale?.listenerCount('resize') ?? null,
    busTotal: countListeners(EventBus.emitter),
    busOwnedByScene: countBusOwnedBy(scene),
    phaserTweens: scene.tweens?.getTweens?.().length ?? null,
    children: scene.children?.list?.length ?? null,
    timers: scene.time?._active?.length ?? null
  };
}

function diffSnapshots(base, current) {
  const diff = {};

  for (const key of Object.keys(base ?? {})) {
    if (base[key] !== current[key]) {
      diff[key] = {
        baseline: base[key],
        now: current[key]
      };
    }
  }

  return diff;
}

function tweenListenerCounts(tween) {
  return {
    complete: tween?.listenerCount?.('complete') ?? 0,
    stop: tween?.listenerCount?.('stop') ?? 0,
    remove: tween?.listenerCount?.('remove') ?? 0
  };
}

function stringify(value) {
  if (value instanceof Error) {
    return value.stack || value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isRunning(game, sceneKey) {
  return (
    game.scene.isActive(sceneKey) ||
    game.scene.isSleeping(sceneKey) ||
    game.scene.isPaused(sceneKey)
  );
}

function withTimeout(promise, label, timeoutMs) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout: ${label}`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout])
    .finally(() => clearTimeout(timer));
}

export async function runBaseSceneLeakTest(
  game,
  sceneKey,
  {
    cycles = 10,
    sleepCycles = 3,
    data = {},
    idleKey = null,
    timeoutMs = 15000,
    settleMs = 120,
    stopSettleMs = 250,
    failOnWarnings = true,
    compareSnapshots = true,
    destroyScene = false
  } = {}
) {
  if (!game?.scene) {
    throw new Error('A valid Phaser game instance is required.');
  }

  if (typeof sceneKey !== 'string' || !sceneKey.trim()) {
    throw new Error('A valid scene key is required.');
  }

  if (!Number.isInteger(cycles) || cycles < 1) {
    throw new Error('cycles must be a positive integer.');
  }

  if (!Number.isInteger(sleepCycles) || sleepCycles < 1) {
    throw new Error('sleepCycles must be a positive integer.');
  }

  if (game.__baseSceneLeakTestRunning) {
    throw new Error('Another BaseScene leak test is already running.');
  }

  const scene = game.scene.keys?.[sceneKey];

  if (!scene) {
    throw new Error(`Scene "${sceneKey}" is not registered.`);
  }

  const requiredMethods = [
    'createTrackedTween',
    'addTrackedTween',
    'removeTrackedTween',
    'isTweenPlaying',
    'handleSleep',
    'handleWake',
    'cleanup',
    'destroyBaseScene',
    'trackInputEvent',
    'onBus'
  ];

  for (const method of requiredMethods) {
    if (typeof scene[method] !== 'function') {
      throw new Error(
        `Scene "${sceneKey}" does not implement ${method}().`
      );
    }
  }

  game.__baseSceneLeakTestRunning = true;

  const E = Phaser.Scenes.Events;
  const failures = [];
  const warnings = [];
  const errors = [];
  const observations = [];
  const snapshots = [];
  const pendingWaiters = new Set();
  const externalTargets = new Set();

  let baseline = null;
  let last = null;
  let completedCycles = 0;
  let assertions = 0;
  let sceneRemoved = false;
  let currentMonologue = null;

  const check = (name, condition, details = null) => {
    assertions += 1;

    if (!condition) {
      failures.push({
        name,
        details
      });
    }

    return Boolean(condition);
  };

  const checkSame = (name, before, after) => {
    const diff = diffSnapshots(before, after);

    check(
      name,
      Object.keys(diff).length === 0,
      diff
    );
  };

  const relevantConsoleMessage = args => (
    /^\[(BaseScene|MonologueManager|EventBus)\]/.test(
      String(args[0] ?? '')
    )
  );

  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args) => {
    if (relevantConsoleMessage(args)) {
      warnings.push(args.map(stringify).join(' '));
    }

    originalWarn.apply(console, args);
  };

  console.error = (...args) => {
    if (relevantConsoleMessage(args)) {
      errors.push(args.map(stringify).join(' '));
    }

    originalError.apply(console, args);
  };

  const onError = event => {
    errors.push(
      stringify(event.error || event.message || event)
    );
  };

  const onRejection = event => {
    errors.push(stringify(event.reason));
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  const expectEvent = (
    emitter,
    eventName,
    action,
    label = eventName
  ) => {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;

      const dispose = () => {
        clearTimeout(timer);
        emitter.off(eventName, onEvent);
        pendingWaiters.delete(cancel);
      };

      const finish = (error, args) => {
        if (settled) return;

        settled = true;
        dispose();

        if (error) reject(error);
        else resolve(args);
      };

      const onEvent = (...args) => finish(null, args);

      const cancel = () => {
        finish(new Error(`Cancelled: ${label}`));
      };

      pendingWaiters.add(cancel);
      emitter.once(eventName, onEvent);

      timer = setTimeout(() => {
        finish(new Error(`Timeout waiting for ${label}`));
      }, timeoutMs);

      try {
        action();
      } catch (error) {
        finish(error);
      }
    });
  };

  const waitUntil = async (predicate, label) => {
    const deadline = Date.now() + timeoutMs;

    while (!predicate()) {
      if (Date.now() >= deadline) {
        throw new Error(`Timeout: ${label}`);
      }

      await wait(20);
    }
  };

  const startScene = async () => {
    await expectEvent(
      scene.events,
      E.CREATE,
      () => game.scene.start(sceneKey, data),
      `${sceneKey}: CREATE`
    );

    await wait(settleMs);
  };

  const stopScene = async () => {
    if (!isRunning(game, sceneKey)) {
      return;
    }

    await expectEvent(
      scene.events,
      E.SHUTDOWN,
      () => game.scene.stop(sceneKey),
      `${sceneKey}: SHUTDOWN`
    );

    await wait(stopSettleMs);
  };

  const sleepScene = async () => {
    await expectEvent(
      scene.events,
      E.SLEEP,
      () => game.scene.sleep(sceneKey),
      `${sceneKey}: SLEEP`
    );

    await wait(settleMs);
  };

  const wakeScene = async () => {
    await expectEvent(
      scene.events,
      E.WAKE,
      () => game.scene.wake(sceneKey),
      `${sceneKey}: WAKE`
    );

    await wait(settleMs);
  };

  const checkEmptyTracking = label => {
    check(
      `${label}: tween registries empty`,
      scene.activeTweens?.size === 0 &&
        scene._tweenTrackingCallbacks?.size === 0 &&
        scene._sleepPausedTweens?.size === 0,
      {
        activeTweens: scene.activeTweens?.size,
        callbacks: scene._tweenTrackingCallbacks?.size,
        paused: scene._sleepPausedTweens?.size
      }
    );
  };

  const checkDestroyedMonologue = (manager, label) => {
    check(
      `${label}: manager destroyed`,
      manager?.isDestroyed === true
    );

    check(
      `${label}: manager unusable`,
      manager?.isSceneUsable() === false
    );

    check(
      `${label}: late say refused`,
      manager?.say('Too late. Even for my paperwork.', {
        force: true
      }) === false
    );

    check(
      `${label}: references cleared`,
      manager?.scene === null &&
        manager?.container === null &&
        manager?.currentTween === null &&
        manager?.currentTimer === null &&
        manager?.idleTimer === null
    );

    check(
      `${label}: queues and maps cleared`,
      manager?.queue?.length === 0 &&
        manager?.lastLineByKey?.size === 0 &&
        manager?.lastPlayedAtByKey?.size === 0
    );
  };

  try {
    await stopScene();

    for (let cycle = 0; cycle < cycles; cycle += 1) {
      const label = `cycle ${cycle + 1}/${cycles}`;

      await startScene();

      check(
        `${label}: activeTweens is Set`,
        scene.activeTweens instanceof Set
      );

      check(
        `${label}: cleanup flags reset`,
        scene._cleanupDone === false &&
          scene._destroyCleanupDone === false &&
          scene._sleepCleanupDone === false
      );

      // Duplicate registration must not add tracking listeners.
      const duplicateTween = scene.createTrackedTween({
        targets: { value: 0 },
        value: 1,
        duration: 60000
      });

      if (!duplicateTween) {
        throw new Error(`${label}: duplicate tween creation failed`);
      }

      const beforeDuplicate = {
        activeTweens: scene.activeTweens.size,
        callbacks: scene._tweenTrackingCallbacks.size,
        ...tweenListenerCounts(duplicateTween)
      };

      scene.addTrackedTween(duplicateTween);
      scene.addTrackedTween(duplicateTween);

      checkSame(
        `${label}: duplicate tween registration is harmless`,
        beforeDuplicate,
        {
          activeTweens: scene.activeTweens.size,
          callbacks: scene._tweenTrackingCallbacks.size,
          ...tweenListenerCounts(duplicateTween)
        }
      );

      scene.removeTrackedTween(duplicateTween);

      check(
        `${label}: explicit removal untracks tween`,
        !scene.activeTweens.has(duplicateTween) &&
          !scene._tweenTrackingCallbacks.has(duplicateTween)
      );

      const afterFirstRemoval = snapshot(scene);
      scene.removeTrackedTween(duplicateTween);

      checkSame(
        `${label}: repeated tween removal is harmless`,
        afterFirstRemoval,
        snapshot(scene)
      );

      // Natural completion must remove tracking without cleanup().
      let completeCalls = 0;
      const callbackScope = { label };

      let resolveCompleted;
      const completed = new Promise(resolve => {
        resolveCompleted = resolve;
      });

      const completedTween = scene.createTrackedTween({
        targets: { value: 0 },
        value: 1,
        duration: 60,
        callbackScope,
        onComplete: function () {
          completeCalls += 1;

          check(
            `${label}: callbackScope preserved`,
            this === callbackScope
          );

          resolveCompleted();
        }
      });

      if (!completedTween) {
        throw new Error(`${label}: completion tween creation failed`);
      }

      await withTimeout(
        completed,
        `${label}: natural tween completion`,
        timeoutMs
      );

      await wait(0);

      check(
        `${label}: onComplete called once`,
        completeCalls === 1
      );

      check(
        `${label}: completed tween untracked`,
        !scene.activeTweens.has(completedTween) &&
          !scene._tweenTrackingCallbacks.has(completedTween) &&
          !scene._sleepPausedTweens.has(completedTween)
      );

      // stop() must also remove tracking.
      const stoppedTween = scene.createTrackedTween({
        targets: { value: 0 },
        value: 1,
        duration: 60000
      });

      if (!stoppedTween) {
        throw new Error(`${label}: stop tween creation failed`);
      }

      await waitUntil(
        () => scene.isTweenPlaying(stoppedTween),
        `${label}: tween starts before stop`
      );

      stoppedTween.stop();

      check(
        `${label}: stopped tween untracked`,
        !scene.activeTweens.has(stoppedTween) &&
          !scene._tweenTrackingCallbacks.has(stoppedTween)
      );

      scene.removeTrackedTween(stoppedTween);

      const longTween = scene.createTrackedTween({
        targets: { value: 0 },
        value: 1,
        duration: 60000
      });

      const loopTween = scene.createTrackedTween({
        targets: { value: 0 },
        value: 1,
        duration: 60000,
        repeat: -1,
        yoyo: true
      });

      const manualTween = scene.createTrackedTween({
        targets: { value: 0 },
        value: 1,
        duration: 60000
      });

      if (!longTween || !loopTween || !manualTween) {
        throw new Error(`${label}: lifecycle tween creation failed`);
      }

      await waitUntil(
        () => (
          scene.isTweenPlaying(longTween) &&
          scene.isTweenPlaying(loopTween) &&
          scene.isTweenPlaying(manualTween)
        ),
        `${label}: lifecycle tweens start`
      );

      manualTween.pause();

      const fakeTarget = new Phaser.Events.EventEmitter();
      externalTargets.add(fakeTarget);

      let inputCalls = 0;
      let busCalls = 0;
      let localCalls = 0;

      const onPing = () => {
        inputCalls += 1;
      };

      const busEvent = `base-scene-leak-test:${sceneKey}:${cycle}`;
      const localEvent = `base-scene-local-test:${cycle}`;

      scene.trackInputEvent(fakeTarget, 'ping', onPing);
      scene.trackInputEvent(fakeTarget, 'ping', onPing);

      fakeTarget.emit('ping');

      check(
        `${label}: duplicate input registration prevented`,
        inputCalls === 1 &&
          fakeTarget.listenerCount('ping') === 1
      );

      scene.onBus(busEvent, () => {
        busCalls += 1;
      });

      scene.onSceneEvent(localEvent, () => {
        localCalls += 1;
      });

      scene.onSceneEvent(localEvent, () => {
        localCalls += 1;
      });

      EventBus.emit(busEvent);
      scene.emitSceneEvent(localEvent);

      check(
        `${label}: test listeners installed`,
        busCalls === 1 && localCalls === 2
      );

      const monologue = scene.monologue;
      currentMonologue = monologue;

      if (!monologue) {
        throw new Error(`${label}: monologue creation failed`);
      }

      check(
        `${label}: lazy getter returns same manager`,
        scene.monologue === monologue
      );

      check(
        `${label}: active manager usable`,
        monologue.isSceneUsable() === true &&
          monologue.isSceneActive() === true
      );

      const firstSay = monologue.say(
        'Another test. Another suspiciously cooperative tween.',
        { force: true }
      );

      check(`${label}: active say accepted`, firstSay === true);

      monologue.say('I should have become a florist.', {
        force: true
      });

      const ui = monologue.container;
      const uiCount = scene.children.list.filter(
        child => child === ui
      ).length;

      check(
        `${label}: one attached monologue container`,
        uiCount === 1
      );

      if (idleKey) {
        check(
          `${label}: idle request accepted`,
          monologue.startIdle(idleKey, {
            minDelay: 60000,
            maxDelay: 60000
          }) === true
        );

        check(
          `${label}: idle timer created`,
          Boolean(monologue.idleTimer)
        );
      }

      for (let sleep = 0; sleep < sleepCycles; sleep += 1) {
        const sleepLabel = `${label}, sleep ${sleep + 1}`;

        await sleepScene();

        check(
          `${sleepLabel}: scene sleeping`,
          game.scene.isSleeping(sceneKey)
        );

        check(
          `${sleepLabel}: running tweens paused`,
          !scene.isTweenPlaying(longTween) &&
            !scene.isTweenPlaying(loopTween)
        );

        check(
          `${sleepLabel}: manual tween excluded from resume set`,
          !scene._sleepPausedTweens.has(manualTween)
        );

        check(
          `${sleepLabel}: manager usable but inactive`,
          monologue.isSceneUsable() === true &&
            monologue.isSceneActive() === false
        );

        check(
          `${sleepLabel}: idle timer cancelled`,
          monologue.idleTimer === null
        );

        const pausedBefore = new Set(scene._sleepPausedTweens);
        const beforeRepeatedSleep = snapshot(scene);

        scene.handleSleep();
        scene.handleSleep();

        checkSame(
          `${sleepLabel}: repeated handleSleep changes nothing`,
          beforeRepeatedSleep,
          snapshot(scene)
        );

        check(
          `${sleepLabel}: resume set preserved`,
          pausedBefore.size === scene._sleepPausedTweens.size &&
            [...pausedBefore].every(
              tween => scene._sleepPausedTweens.has(tween)
            )
        );

        await wakeScene();

        check(
          `${sleepLabel}: running tweens resumed`,
          scene.isTweenPlaying(longTween) &&
            scene.isTweenPlaying(loopTween)
        );

        check(
          `${sleepLabel}: manual tween remains paused`,
          !scene.isTweenPlaying(manualTween)
        );

        check(
          `${sleepLabel}: resume set cleared`,
          scene._sleepPausedTweens.size === 0
        );

        const beforeRepeatedWake = snapshot(scene);

        scene.handleWake();
        scene.handleWake();

        checkSame(
          `${sleepLabel}: repeated handleWake changes nothing`,
          beforeRepeatedWake,
          snapshot(scene)
        );

        if (idleKey) {
          check(
            `${sleepLabel}: idle restored`,
            Boolean(monologue.idleTimer)
          );
        }
      }

      // Clear the active line so say() during sleep tests show(),
      // not merely appending to an already occupied queue.
      monologue.clearQueue();
      monologue.removeTimer(monologue.currentTimer);
      monologue.currentTimer = null;
      monologue.killTweensForContainer();
      monologue.finishHide();

      await sleepScene();

      const beforeSleepingSay = {
        tracked: scene.activeTweens.size,
        children: scene.children.list.length
      };

      const sleepingSayAccepted = monologue.say(
        'I am asleep. Please leave your suspicious activity after the beep.',
        { force: true }
      );

      const sleepingSayCreatedTween = Boolean(monologue.currentTween);
      const sleepingSayCreatedTimer = Boolean(monologue.currentTimer);

      observations.push({
        cycle: cycle + 1,
        name: 'say() during sleep',
        accepted: sleepingSayAccepted,
        createdTween: sleepingSayCreatedTween,
        createdTimer: sleepingSayCreatedTimer,
        queued: monologue.queue.length
      });

      // Either refusing the request or queueing it is acceptable.
      // Starting a new presentation while asleep is not.
      check(
        `${label}: sleeping say does not start presentation`,
        !monologue.isShowing &&
          !sleepingSayCreatedTween &&
          !sleepingSayCreatedTimer &&
          scene.activeTweens.size === beforeSleepingSay.tracked,
        {
          accepted: sleepingSayAccepted,
          isShowing: monologue.isShowing,
          createdTween: sleepingSayCreatedTween,
          createdTimer: sleepingSayCreatedTimer,
          trackedBefore: beforeSleepingSay.tracked,
          trackedAfter: scene.activeTweens.size
        }
      );

      check(
        `${label}: sleeping say creates no extra UI`,
        scene.children.list.length === beforeSleepingSay.children
      );

      // Alternate stopping a sleeping scene and stopping after wake.
      if (cycle % 2 === 0) {
        await wakeScene();
      }

      await stopScene();

      checkDestroyedMonologue(monologue, label);

      check(
        `${label}: scene manager reference cleared`,
        scene._monologue === null &&
          scene.monologue === null
      );

      checkEmptyTracking(label);

      check(
        `${label}: input listeners removed`,
        scene.inputEvents.length === 0 &&
          fakeTarget.listenerCount('ping') === 0
      );

      check(
        `${label}: scene-local listeners removed`,
        countListeners(scene.sceneEvents) === 0
      );

      check(
        `${label}: EventBus scope cleared`,
        countBusOwnedBy(scene) === 0
      );

      fakeTarget.emit('ping');
      EventBus.emit(busEvent);
      scene.emitSceneEvent(localEvent);

      check(
        `${label}: removed callbacks do not execute`,
        inputCalls === 1 &&
          busCalls === 1 &&
          localCalls === 2
      );

      check(
        `${label}: lifecycle tweens no longer playing`,
        !scene.isTweenPlaying(longTween) &&
          !scene.isTweenPlaying(loopTween) &&
          !scene.isTweenPlaying(manualTween)
      );

      const afterShutdown = snapshot(scene);

      // Repeat cleanup after a real SHUTDOWN.
      scene.cleanup();
      scene.cleanup();

      monologue.destroy();
      monologue.destroy();

      scene.handleSleep();
      scene.handleWake();

      checkSame(
        `${label}: repeated cleanup/destroy/sleep/wake is harmless`,
        afterShutdown,
        snapshot(scene)
      );

      checkDestroyedMonologue(
        monologue,
        `${label}: repeated destroy`
      );

      check(
        `${label}: cleanup flag remains set`,
        scene._cleanupDone === true
      );

      last = snapshot(scene);
      snapshots.push({
        cycle: cycle + 1,
        ...last
      });

      if (baseline === null) {
        baseline = last;
      } else if (compareSnapshots) {
        checkSame(
          `${label}: shutdown snapshot matches first cycle`,
          baseline,
          last
        );
      }

      fakeTarget.destroy();
      externalTargets.delete(fakeTarget);
      currentMonologue = null;
      completedCycles += 1;
    }

    if (destroyScene) {
      await expectEvent(
        scene.events,
        E.DESTROY,
        () => game.scene.remove(sceneKey),
        `${sceneKey}: DESTROY`
      );

      await wait(stopSettleMs);

      sceneRemoved = !game.scene.keys?.[sceneKey];

      check(
        'DESTROY: scene removed from registry',
        sceneRemoved
      );

      check(
        'DESTROY: final cleanup flags set',
        scene._cleanupDone === true &&
          scene._destroyCleanupDone === true
      );

      check(
        'DESTROY: scene-local emitter released',
        scene.sceneEvents === null
      );

      checkEmptyTracking('DESTROY');

      check(
        'DESTROY: EventBus scope empty',
        countBusOwnedBy(scene) === 0
      );

      const afterDestroy = {
        activeTweens: scene.activeTweens.size,
        callbacks: scene._tweenTrackingCallbacks.size,
        paused: scene._sleepPausedTweens.size,
        busOwned: countBusOwnedBy(scene),
        sceneEventsNull: scene.sceneEvents === null
      };

      scene.destroyBaseScene();
      scene.destroyBaseScene();
      scene.cleanup();

      checkSame(
        'DESTROY: repeated final cleanup is harmless',
        afterDestroy,
        {
          activeTweens: scene.activeTweens.size,
          callbacks: scene._tweenTrackingCallbacks.size,
          paused: scene._sleepPausedTweens.size,
          busOwned: countBusOwnedBy(scene),
          sceneEventsNull: scene.sceneEvents === null
        }
      );
    }
  } catch (error) {
    failures.push({
      name: 'Test crashed',
      details: stringify(error)
    });
  } finally {
    // Keep failure cleanup inside console capture.
    try {
      if (game.scene.keys?.[sceneKey] && isRunning(game, sceneKey)) {
        await stopScene();
      }

      currentMonologue?.destroy();
      scene.cleanup();
    } catch (error) {
      failures.push({
        name: 'Final cleanup failed',
        details: stringify(error)
      });
    }

    for (const target of externalTargets) {
      target.destroy();
    }

    externalTargets.clear();

    for (const cancel of [...pendingWaiters]) {
      cancel();
    }

    console.warn = originalWarn;
    console.error = originalError;

    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);

    delete game.__baseSceneLeakTestRunning;
  }

  const result = {
    passed: (
      failures.length === 0 &&
      errors.length === 0 &&
      (!failOnWarnings || warnings.length === 0) &&
      completedCycles === cycles
    ),
    sceneKey,
    requestedCycles: cycles,
    completedCycles,
    assertions,
    sceneRemoved,
    failures,
    errors,
    warnings,
    observations,
    baseline,
    last,
    snapshots
  };

  console.group(
    result.passed
      ? `✅ BaseScene leak test PASSED: ${sceneKey}`
      : `❌ BaseScene leak test FAILED: ${sceneKey}`
  );

  console.info({
    completedCycles,
    requestedCycles: cycles,
    assertions,
    sceneRemoved,
    failures: failures.length,
    errors: errors.length,
    warnings: warnings.length
  });

  if (baseline && last) {
    console.table({ baseline, last });
  }

  if (observations.length) {
    console.table(observations);
  }

  for (const failure of failures) {
    console.error(failure.name, failure.details ?? '');
  }

  for (const error of errors) {
    console.error('Captured runtime error:', error);
  }

  for (const warning of warnings) {
    console.warn('Captured warning:', warning);
  }

  console.groupEnd();

  return result;
}

export function installLeakTest(game) {
  window.leakTest = async (sceneKey, options = {}) => {
    if (game.__baseSceneLeakTestRunning) {
      throw new Error('Another BaseScene leak test is already running.');
    }

    if (game.sceneLoader && !game.scene.keys?.[sceneKey]) {
      await game.sceneLoader.ensure(sceneKey);
    }

    return runBaseSceneLeakTest(game, sceneKey, options);
  };
}