import { seededRandom } from './chaseLogic.js';

export const RUNNER_CONFIG = Object.freeze({
  version: 3,

  fixedStep: 1 / 60,

  firstLength: 15,
  lengthIncrease: 10,
  maximumLength: 120,

  metresPerSecond: 1,

  startDistance: 8,
  escapeDistance: 100,
  catchDistance: 7,

  laneSpeed: 7,
  thiefLaneSpeed: 2.8,

  jumpSeconds: 0.85,
  jumpHeight: 150,
  safeJumpHeight: 38,

  approachSeconds: 3.2,
  firstContact: 4.2,
  rowInterval: 1.9,

  finalZone: 3,
  collisionCooldown: 1,
  catchSpeed: 0.3
});

export const OBSTACLES = Object.freeze({
  puddle: {
    jumpable: true,
    penalty: 2,
    slowSeconds: 0.8,
    duration: 0.08,
    message: 'SPLASH!'
  },

  hole: {
    jumpable: true,
    penalty: 3,
    slowSeconds: 1,
    duration: 0.1,
    message: 'POTHOLE: 1. AGENCY: 0.'
  },

  hedge: {
    jumpable: true,
    penalty: 3,
    slowSeconds: 0.9,
    duration: 0.1,
    message: 'BOTANICAL INCIDENT!'
  },

  crowd: {
    jumpable: false,
    penalty: 4,
    slowSeconds: 1.1,
    duration: 0.14,
    message: 'TOURIST TRAFFIC!'
  },

  stroller: {
    jumpable: false,
    penalty: 4,
    slowSeconds: 1.1,
    duration: 0.18,
    message: 'BRAKE FOR THE STROLLER!'
  },

  dog: {
    jumpable: false,
    penalty: 3,
    slowSeconds: 1,
    duration: 0.16,
    message: 'THE DOG IS NOT A SUSPECT.'
  },

  shopper: {
    jumpable: false,
    penalty: 4,
    slowSeconds: 1.1,
    duration: 0.14,
    message: 'UNEXPECTED SHOPPING STOP!'
  },

  parkedCar: {
    jumpable: false,
    penalty: 5,
    slowSeconds: 1.2,
    duration: 0.55,
    message: 'PARK ANYWHERE. APPARENTLY.'
  },

  carDoor: {
    jumpable: false,
    penalty: 4,
    slowSeconds: 1.1,
    duration: 0.4,
    message: 'MIND THE DOOR!'
  }
});

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const finite = Number.isFinite;

function randomFor(record, index, salt = 0) {
  return seededRandom(
    (
      (record.seed >>> 0) ^
      Math.imul(index + 1, 0x45d9f3b) ^
      salt
    ) >>> 0
  );
}

function settings(record) {
  const variants = {
    rookie: {
      interval: 2.1,
      approach: 3.6,
      gain: 0.34,
      penaltyScale: 0.8
    },

    field: {
      interval: RUNNER_CONFIG.rowInterval,
      approach: RUNNER_CONFIG.approachSeconds,
      gain: RUNNER_CONFIG.catchSpeed,
      penaltyScale: 1
    },

    master: {
      interval: 1.75,
      approach: 2.9,
      gain: 0.26,
      penaltyScale: 1.15
    }
  };

  return variants[record.difficulty] || variants.field;
}

export function routeLength(casesSolved = 0) {
  const number = Number(casesSolved);

  const solved = finite(number)
    ? Math.max(0, Math.floor(number))
    : 0;

  return Math.min(
    RUNNER_CONFIG.maximumLength,
    RUNNER_CONFIG.firstLength +
      solved * RUNNER_CONFIG.lengthIncrease
  );
}

export function makeRunner(
  length = RUNNER_CONFIG.firstLength
) {
  return {
    version: RUNNER_CONFIG.version,

    length,
    elapsed: 0,
    travelled: 0,

    lane: 0,
    targetLane: 0,

    jump: 0,
    cooldown: 0,
    slow: 0,

    hits: 0,
    hitIds: [],

    thiefLane: 0,
    thiefTarget: 0,
    thiefJump: 0,

    lastHit: null
  };
}

export function validRunner(state) {
  return Boolean(
    state &&
    state.version === RUNNER_CONFIG.version &&

    finite(state.length) &&
    state.length >= RUNNER_CONFIG.firstLength &&
    state.length <= RUNNER_CONFIG.maximumLength &&

    finite(state.elapsed) &&
    state.elapsed >= 0 &&

    finite(state.travelled) &&
    state.travelled >= 0 &&
    state.travelled <= state.length &&

    finite(state.lane) &&
    Math.abs(state.lane) <= 1 &&

    Number.isInteger(state.targetLane) &&
    Math.abs(state.targetLane) <= 1 &&

    finite(state.jump) &&
    state.jump >= 0 &&
    state.jump <= RUNNER_CONFIG.jumpSeconds &&

    finite(state.cooldown) &&
    state.cooldown >= 0 &&

    finite(state.slow) &&
    state.slow >= 0 &&

    Number.isInteger(state.hits) &&
    state.hits >= 0 &&

    Array.isArray(state.hitIds) &&
    state.hitIds.every(id => typeof id === 'string') &&

    finite(state.thiefLane) &&
    Math.abs(state.thiefLane) <= 1 &&

    Number.isInteger(state.thiefTarget) &&
    Math.abs(state.thiefTarget) <= 1 &&

    finite(state.thiefJump)
  );
}

export function ensureRunner(record, casesSolved = 0) {
  if (!record) {
    throw new Error('Missing pursuit record.');
  }

  if (!record.runnerSetup) {
    record.runnerSetup = {
      version: RUNNER_CONFIG.version,
      length: routeLength(casesSolved)
    };
  }

  const length = record.runnerSetup.length;

  if (
    !finite(length) ||
    length < RUNNER_CONFIG.firstLength ||
    length > RUNNER_CONFIG.maximumLength
  ) {
    throw new Error('Invalid pursuit route length.');
  }

  if (
    !record.runner ||
    record.runner.version !== RUNNER_CONFIG.version
  ) {
    record.runner = makeRunner(length);
  }

  if (!validRunner(record.runner)) {
    throw new Error('The runner state is invalid.');
  }

  return record.runner;
}

export function restartRunner(record, casesSolved = 0) {
  ensureRunner(record, casesSolved);

  record.runner = makeRunner(record.runnerSetup.length);

  record.distance = RUNNER_CONFIG.startDistance;
  record.phase = 'intro';
  record.round = 0;
  record.resultText = '';
  record.terminalScene = null;

  return record.runner;
}

export function changeLane(record, direction) {
  if (
    record?.phase !== 'choice' ||
    !validRunner(record.runner) ||
    !finite(direction)
  ) {
    return false;
  }

  const state = record.runner;

  const target = clamp(
    state.targetLane + Math.sign(direction),
    -1,
    1
  );

  if (target === state.targetLane) return false;

  state.targetLane = target;

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

export function inFinalZone(record) {
  const state = record?.runner;

  return Boolean(
    state &&
    state.length - state.travelled <=
      RUNNER_CONFIG.finalZone
  );
}

export function thiefProgress(record) {
  return clamp(
    0.88 - record.distance * 0.018,
    0.28,
    0.86
  );
}

export function rowTiming(record, index) {
  const config = settings(record);

  const contact =
    RUNNER_CONFIG.firstContact +
    index * config.interval;

  return {
    contact,
    spawn: contact - config.approach,
    approach: config.approach
  };
}

function rowEnd(row) {
  return row.contact + Math.max(
    ...row.obstacles.map(
      obstacle => OBSTACLES[obstacle.kind].duration
    )
  );
}

function rowAllowed(record, row) {
  return rowEnd(row) <=
    record.runner.length - RUNNER_CONFIG.finalZone;
}

export function makeRow(record, index) {
  const random = randomFor(record, index);

  const pick = values =>
    values[Math.floor(random() * values.length)];

  const lanes = [-1, 0, 1];

  const pedestrian = () =>
    pick(['crowd', 'stroller', 'dog', 'shopper']);

  let obstacles;

  if (index === 0) {
    obstacles = [{
      lane: 1,
      kind: 'parkedCar'
    }];
  } else if (index === 1) {
    obstacles = [{
      lane: 0,
      kind: 'hole'
    }];
  } else if (index === 2) {
    obstacles = [{
      lane: -1,
      kind: 'dog'
    }];
  } else if (index === 3) {
    obstacles = [{
      lane: 1,
      kind: 'carDoor'
    }];
  } else {
    const pattern = Math.floor(random() * 8);

    if (pattern === 0) {
      obstacles = [{
        lane: pick([-1, 1]),
        kind: 'parkedCar'
      }];
    } else if (pattern === 1) {
      obstacles = [{
        lane: pick([-1, 1]),
        kind: 'carDoor'
      }];
    } else if (pattern === 2) {
      obstacles = [{
        lane: pick(lanes),
        kind: 'hole'
      }];
    } else if (pattern === 3) {
      const safe = pick(lanes);

      obstacles = lanes
        .filter(lane => lane !== safe)
        .map(lane => ({
          lane,
          kind: pedestrian()
        }));
    } else if (pattern === 4) {
      const kind = pick(['puddle', 'hedge']);

      obstacles = lanes.map(lane => ({
        lane,
        kind
      }));
    } else if (pattern === 5) {
      const side = pick([-1, 1]);

      obstacles = [
        { lane: side, kind: 'parkedCar' },
        { lane: 0, kind: 'hole' }
      ];
    } else if (pattern === 6) {
      const safe = pick(lanes);
      const blocked = lanes.filter(lane => lane !== safe);

      obstacles = [
        {
          lane: blocked[0],
          kind: pedestrian()
        },
        {
          lane: blocked[1],
          kind: pick(['hole', 'puddle', 'hedge'])
        }
      ];
    } else {
      obstacles = [{
        lane: pick(lanes),
        kind: pedestrian()
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

  const state = record.runner;
  const config = settings(record);

  const last = Math.floor(
    (
      state.elapsed +
      config.approach -
      RUNNER_CONFIG.firstContact
    ) / config.interval
  );

  const first = Math.max(
    0,
    last -
      Math.ceil(
        (config.approach + 0.6) / config.interval
      ) -
      1
  );

  const rows = [];

  for (let index = first; index <= last; index++) {
    const row = makeRow(record, index);

    if (!rowAllowed(record, row)) continue;

    const progress =
      (state.elapsed - row.spawn) / row.approach;

    const endProgress =
      1 +
      (rowEnd(row) - row.contact) / row.approach +
      0.12;

    if (progress >= 0 && progress <= endProgress) {
      rows.push({ ...row, progress });
    }
  }

  return rows;
}

function moveTowards(value, target, speed, dt) {
  return value + clamp(
    target - value,
    -speed * dt,
    speed * dt
  );
}

function updateThief(record, dt) {
  const state = record.runner;

  state.thiefJump = 0;

  if (!inFinalZone(record)) {
    const position = thiefProgress(record);

    const relevant = visibleRows(record)
      .filter(row =>
        row.progress <= position + 0.2 &&
        row.progress >= position - 0.45
      )
      .sort((a, b) => b.progress - a.progress)[0];

    if (relevant) {
      const safe = [-1, 0, 1].filter(lane =>
        !relevant.obstacles.some(
          obstacle => obstacle.lane === lane
        )
      );

      if (safe.length) {
        safe.sort((a, b) =>
          Math.abs(a - state.thiefLane) -
          Math.abs(b - state.thiefLane)
        );

        state.thiefTarget = safe[0];
      } else {
        const jumpLanes = relevant.obstacles
          .filter(obstacle =>
            OBSTACLES[obstacle.kind].jumpable
          )
          .map(obstacle => obstacle.lane);

        if (jumpLanes.length) {
          jumpLanes.sort((a, b) =>
            Math.abs(a - state.thiefLane) -
            Math.abs(b - state.thiefLane)
          );

          state.thiefTarget = jumpLanes[0];

          const difference = relevant.progress - position;

          const amount = clamp(
            1 - Math.abs(difference) / 0.19,
            0,
            1
          );

          state.thiefJump =
            Math.sin(amount * Math.PI / 2) * 100;
        }
      }
    } else {
      const section = Math.floor(state.elapsed / 2.8);

      const random = randomFor(
        record,
        section,
        0xabc123
      );

      state.thiefTarget =
        [-1, 0, 1][Math.floor(random() * 3)];
    }
  }

  state.thiefLane = moveTowards(
    state.thiefLane,
    state.thiefTarget,
    RUNNER_CONFIG.thiefLaneSpeed,
    dt
  );
}

export function tickRunner(record, dt) {
  if (
    record?.phase !== 'choice' ||
    !validRunner(record.runner) ||
    !finite(dt) ||
    dt <= 0
  ) {
    return null;
  }

  const state = record.runner;
  const config = settings(record);

  state.elapsed += dt;

  state.travelled = Math.min(
    state.length,
    state.travelled +
      RUNNER_CONFIG.metresPerSecond * dt
  );

  state.cooldown = Math.max(0, state.cooldown - dt);
  state.slow = Math.max(0, state.slow - dt);

  state.lane = moveTowards(
    state.lane,
    state.targetLane,
    RUNNER_CONFIG.laneSpeed,
    dt
  );

  state.jump = Math.max(0, state.jump - dt);

  if (state.slow <= 0) {
    record.distance = Math.max(
      1,
      record.distance - config.gain * dt
    );
  }

  updateThief(record, dt);

  let hit = null;

  const last = Math.floor(
    (
      state.elapsed -
      RUNNER_CONFIG.firstContact
    ) / config.interval
  );

  const first = Math.max(0, last - 2);

  for (let index = first; index <= last; index++) {
    const row = makeRow(record, index);

    if (!rowAllowed(record, row)) continue;

    for (let i = 0; i < row.obstacles.length; i++) {
      const obstacle = row.obstacles[i];
      const definition = OBSTACLES[obstacle.kind];

      const id = `${index}:${i}`;

      const contactActive =
        state.elapsed >= row.contact &&
        state.elapsed <=
          row.contact + definition.duration;

      if (
        !contactActive ||
        state.hitIds.includes(id) ||
        state.cooldown > 0 ||
        Math.abs(state.lane - obstacle.lane) > 0.58
      ) {
        continue;
      }

      const cleared =
        definition.jumpable &&
        jumpHeight(state) >=
          RUNNER_CONFIG.safeJumpHeight;

      if (cleared) continue;

      const penalty = Math.round(
        definition.penalty *
        config.penaltyScale *
        10
      ) / 10;

      state.hitIds.push(id);
      state.hits++;

      state.cooldown =
        RUNNER_CONFIG.collisionCooldown;

      state.slow = definition.slowSeconds;

      record.distance = Math.min(
        RUNNER_CONFIG.escapeDistance,
        record.distance + penalty
      );

      state.lastHit = {
        kind: obstacle.kind,
        penalty,
        elapsed: state.elapsed
      };

      hit = obstacle.kind;

      break;
    }

    if (hit) break;
  }

  if (record.distance >= RUNNER_CONFIG.escapeDistance) {
    record.distance = RUNNER_CONFIG.escapeDistance;
    record.phase = 'escaped';

    return hit;
  }

  if (state.travelled >= state.length) {
    const sameLane =
      Math.abs(state.lane - state.thiefLane) <= 0.45;

    const closeEnough =
      record.distance <= RUNNER_CONFIG.catchDistance;

    if (sameLane && closeEnough) {
      record.distance = 0;
      record.phase = 'caught';
    } else {
      record.phase = 'escaped';

      record.resultText = !sameLane
        ? 'You reached the interception point on the wrong side.'
        : 'The suspect reached the exit with too much of a lead.';
    }
  }

  return hit;
}