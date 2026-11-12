import { seededRandom } from './chaseLogic.js';

export const RUNNER_CONFIG = Object.freeze({
  version: 1,

  fixedStep: 1 / 60,

  startDelay: 1.2,
  rowInterval: 1.85,
  approachSeconds: 3.2,

  laneSpeed: 7,

  jumpSeconds: 0.85,
  jumpHeight: 150,
  safeJumpHeight: 38,

  catchSpeed: 0.85,
  collisionPenalty: 12,
  collisionCooldown: 1.1,

  escapeDistance: 100,

  maxDistance: 100
});

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

function finite(value) {
  return Number.isFinite(value);
}

export function validRunner(state) {
  return Boolean(
    state &&
    state.version === RUNNER_CONFIG.version &&
    finite(state.elapsed) &&
    state.elapsed >= 0 &&
    finite(state.lane) &&
    state.lane >= -1 &&
    state.lane <= 1 &&
    Number.isInteger(state.targetLane) &&
    state.targetLane >= -1 &&
    state.targetLane <= 1 &&
    finite(state.jump) &&
    state.jump >= 0 &&
    state.jump <= RUNNER_CONFIG.jumpSeconds &&
    finite(state.cooldown) &&
    state.cooldown >= 0 &&
    Number.isInteger(state.hits) &&
    state.hits >= 0 &&
    finite(state.travelled) &&
    state.travelled >= 0
  );
}

export function makeRunner() {
  return {
    version: RUNNER_CONFIG.version,
    elapsed: 0,

    lane: 0,
    targetLane: 0,

    jump: 0,
    cooldown: 0,

    hits: 0,
    travelled: 0
  };
}

export function ensureRunner(record) {
  if (!record) {
    throw new Error('Missing pursuit record.');
  }

  if (record.runner == null) {
    record.runner = makeRunner();
  } else if (!validRunner(record.runner)) {
    throw new Error(
      'The runner checkpoint is invalid. Load an earlier save.'
    );
  }

  return record.runner;
}

export function changeLane(record, direction) {
  if (
    record?.phase !== 'choice' ||
    !validRunner(record.runner)
  ) {
    return false;
  }

  const next = clamp(
    record.runner.targetLane + Math.sign(direction),
    -1,
    1
  );

  if (next === record.runner.targetLane) {
    return false;
  }

  record.runner.targetLane = next;

  return true;
}

export function startJump(record) {
  if (
    record?.phase !== 'choice' ||
    !validRunner(record.runner) ||
    record.runner.jump > 0
  ) {
    return false;
  }

  record.runner.jump = RUNNER_CONFIG.jumpSeconds;

  return true;
}

export function jumpHeight(state) {
  if (!state || state.jump <= 0) return 0;

  const progress =
    1 - state.jump / RUNNER_CONFIG.jumpSeconds;

  return Math.sin(progress * Math.PI) *
    RUNNER_CONFIG.jumpHeight;
}

function difficulty(record) {
  return {
    rookie: {
      interval: 2.1,
      approach: 3.6,
      gain: 1,
      penalty: 10
    },

    field: {
      interval: RUNNER_CONFIG.rowInterval,
      approach: RUNNER_CONFIG.approachSeconds,
      gain: RUNNER_CONFIG.catchSpeed,
      penalty: RUNNER_CONFIG.collisionPenalty
    },

    master: {
      interval: 1.65,
      approach: 2.8,
      gain: 0.75,
      penalty: 14
    }
  }[record.difficulty] || {
    interval: RUNNER_CONFIG.rowInterval,
    approach: RUNNER_CONFIG.approachSeconds,
    gain: RUNNER_CONFIG.catchSpeed,
    penalty: RUNNER_CONFIG.collisionPenalty
  };
}

export function rowTiming(record, index) {
  const settings = difficulty(record);

  return {
    spawn:
      RUNNER_CONFIG.startDelay +
      index * settings.interval,

    approach: settings.approach
  };
}

export function makeRow(record, index) {
  const seed = (
    (record.seed >>> 0) ^
    Math.imul(index + 1, 0x45d9f3b)
  ) >>> 0;

  const random = seededRandom(seed);

  const pick = values =>
    values[Math.floor(random() * values.length)];

  const safeLane = pick([-1, 0, 1]);

  let obstacles;

  // Pierwsze trzy układy uczą sterowania.
  if (index === 0) {
    obstacles = [
      { lane: 0, kind: 'crowd' }
    ];
  } else if (index === 1) {
    obstacles = [
      { lane: -1, kind: 'stroller' },
      { lane: 1, kind: 'crowd' }
    ];
  } else if (index === 2) {
    obstacles = [
      { lane: -1, kind: 'puddle' },
      { lane: 0, kind: 'puddle' },
      { lane: 1, kind: 'puddle' }
    ];
  } else {
    const pattern = Math.floor(random() * 5);

    if (pattern === 0) {
      obstacles = [{
        lane: pick([-1, 0, 1]),
        kind: pick(['crowd', 'stroller'])
      }];
    } else if (pattern === 1) {
      obstacles = [-1, 0, 1]
        .filter(lane => lane !== safeLane)
        .map(lane => ({
          lane,
          kind: pick(['crowd', 'stroller'])
        }));
    } else if (pattern === 2) {
      obstacles = [-1, 0, 1].map(lane => ({
        lane,
        kind: 'puddle'
      }));
    } else if (pattern === 3) {
      const blockedLane = pick([-1, 0, 1]);

      obstacles = [
        {
          lane: blockedLane,
          kind: 'crowd'
        },
        {
          lane: [-1, 0, 1].find(
            lane =>
              lane !== blockedLane &&
              lane !== safeLane
          ) ?? safeLane,
          kind: 'puddle'
        }
      ];
    } else {
      obstacles = [{
        lane: pick([-1, 0, 1]),
        kind: 'stroller'
      }];
    }
  }

  return {
    index,
    ...rowTiming(record, index),
    obstacles
  };
}

export function visibleRows(record) {
  if (!validRunner(record?.runner)) return [];

  const elapsed = record.runner.elapsed;
  const settings = difficulty(record);

  const last = Math.floor(
    (elapsed - RUNNER_CONFIG.startDelay) /
    settings.interval
  );

  if (last < 0) return [];

  const first = Math.max(
    0,
    last -
    Math.ceil(settings.approach / settings.interval) -
    2
  );

  const rows = [];

  for (let index = first; index <= last; index++) {
    const row = makeRow(record, index);

    const progress =
      (elapsed - row.spawn) / row.approach;

    if (progress >= 0 && progress <= 1.16) {
      rows.push({
        ...row,
        progress
      });
    }
  }

  return rows;
}

export function tickRunner(record, dt) {
  if (
    record?.phase !== 'choice' ||
    !validRunner(record.runner)
  ) {
    return null;
  }

  const state = record.runner;
  const settings = difficulty(record);

  const before = state.elapsed;

  state.elapsed += dt;
  state.travelled += dt * 6;
  state.cooldown = Math.max(0, state.cooldown - dt);

  const laneDelta = state.targetLane - state.lane;
  const laneStep = RUNNER_CONFIG.laneSpeed * dt;

  state.lane += clamp(
    laneDelta,
    -laneStep,
    laneStep
  );

  if (Math.abs(state.targetLane - state.lane) < 0.001) {
    state.lane = state.targetLane;
  }

  state.jump = Math.max(0, state.jump - dt);

  record.distance = Math.max(
    0,
    record.distance - settings.gain * dt
  );

  let hit = null;

  const first = Math.max(
    0,
    Math.floor(
      (
        before -
        RUNNER_CONFIG.startDelay -
        settings.approach
      ) / settings.interval
    ) - 1
  );

  const last = Math.max(
    0,
    Math.ceil(
      (
        state.elapsed -
        RUNNER_CONFIG.startDelay
      ) / settings.interval
    )
  );

  for (let index = first; index <= last; index++) {
    const row = makeRow(record, index);
    const contactAt = row.spawn + row.approach;

    if (
      contactAt <= before ||
      contactAt > state.elapsed
    ) {
      continue;
    }

    for (const obstacle of row.obstacles) {
      if (
        Math.abs(state.lane - obstacle.lane) > 0.58
      ) {
        continue;
      }

      const cleared =
        obstacle.kind === 'puddle' &&
        jumpHeight(state) >=
          RUNNER_CONFIG.safeJumpHeight;

      if (cleared || state.cooldown > 0) continue;

      state.hits++;

      state.cooldown =
        RUNNER_CONFIG.collisionCooldown;

      record.distance = Math.min(
        RUNNER_CONFIG.escapeDistance,
        record.distance + settings.penalty
      );

      hit = obstacle.kind;

      break;
    }
  }

  if (record.distance >= RUNNER_CONFIG.escapeDistance) {
    record.distance = RUNNER_CONFIG.escapeDistance;
    record.phase = 'escaped';
  } else if (record.distance <= 0) {
    record.distance = 0;
    record.phase = 'caught';
  }

  return hit;
}