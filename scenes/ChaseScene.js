import {
  ChaseScene as ChaseSceneBase
} from './ChaseSceneBase.js';

import {
  OBSTACLES,
  rowTiming
} from '../systems/chaseRunner.js';

const CENTRE = 960;
const HORIZON = 265;
const GROUND = 875;
const LANE_SPACING = 430;

export class ChaseScene extends ChaseSceneBase {
  create() {
    super.create();

    if (!this.theoryBlocked && this.record) {
      this.lastObstacleMessage = null;
    }
  }

  render() {
    super.render();

    if (
      this.record?.phase === 'intro' &&
      this.overlayText
    ) {
      const length = this.record.runner?.length ?? 15;

      this.overlayText.setText(
        `ROUTE: ${length} m\n\n` +
        'LEFT / RIGHT: change position. SPACE / UP: jump.\n' +
        'Avoid people, dogs, parked cars and open doors.\n' +
        'Jump over puddles, holes and low hedges.\n\n' +
        'At the end, get behind the suspect.\n' +
        'Stay within 7 m to make the arrest.\n\n' +
        'Reloading restarts the entire run.'
      );
    }
  }

  update(time, delta) {
    super.update(time, delta);

    const state = this.record?.runner;
    const hit = state?.lastHit;

    if (
      !hit ||
      this.record.phase !== 'choice' ||
      this.theoryBlocked ||
      this.leaving
    ) {
      return;
    }

    const key = `${hit.elapsed}:${hit.kind}`;

    if (key === this.lastObstacleMessage) return;

    this.lastObstacleMessage = key;

    const definition = OBSTACLES[hit.kind];

    if (definition) {
      this.setMessage(
        `${definition.message} ` +
        `Suspect gains ${hit.penalty} m. You slow down.`,
        2400
      );
    }
  }

  projectUnclamped(lane, progress) {
    const p = Math.max(0, progress);

    return {
      x: CENTRE + lane * LANE_SPACING * p,

      y: HORIZON +
        (GROUND - HORIZON) * p * p,

      scale: 0.08 + 0.92 * p
    };
  }

  drawObstacle(g, obstacle, progress) {
    if (
      obstacle.kind !== 'parkedCar' &&
      obstacle.kind !== 'carDoor' &&
      obstacle.kind !== 'hole'
    ) {
      super.drawObstacle(g, obstacle, progress);
      return;
    }

    if (obstacle.kind === 'hole') {
      this.drawHole(g, obstacle, progress);
      return;
    }

    if (obstacle.kind === 'parkedCar') {
      this.drawParkedCar(g, obstacle, progress);
      return;
    }

    this.drawOpenDoor(g, obstacle, progress);
  }

  drawHole(g, obstacle, progress) {
    const position = this.projectUnclamped(
      obstacle.lane,
      progress
    );

    const { x, y, scale: s } = position;

    const outer = [
      [x - 107 * s, y - 10 * s],
      [x - 67 * s, y - 28 * s],
      [x - 17 * s, y - 23 * s],
      [x + 20 * s, y - 34 * s],
      [x + 85 * s, y - 17 * s],
      [x + 110 * s, y + 2 * s],
      [x + 61 * s, y + 22 * s],
      [x + 7 * s, y + 16 * s],
      [x - 45 * s, y + 28 * s],
      [x - 92 * s, y + 12 * s]
    ];

    this.polygon(g, 0xb7a181, outer);

    const inner = outer.map(([px, py]) => [
      x + (px - x) * 0.82,
      y + (py - y) * 0.7
    ]);

    this.polygon(g, 0x171b20, inner);

    g.lineStyle(
      Math.max(1, 4 * s),
      0x625549,
      1
    );

    g.lineBetween(
      x - 70 * s,
      y + 2 * s,
      x - 38 * s,
      y + 13 * s
    );

    g.lineBetween(
      x - 38 * s,
      y + 13 * s,
      x + 14 * s,
      y + 9 * s
    );

    g.fillStyle(0x8d7c65);

    g.fillEllipse(
      x - 117 * s,
      y + 15 * s,
      23 * s,
      12 * s
    );

    g.fillEllipse(
      x + 102 * s,
      y - 25 * s,
      19 * s,
      11 * s
    );
  }

  drawParkedCar(g, obstacle, progress) {
    const approach = rowTiming(
      this.record,
      0
    ).approach;

    const duration = OBSTACLES.parkedCar.duration;

    const rear = this.projectUnclamped(
      obstacle.lane,
      progress
    );

    const front = this.projectUnclamped(
      obstacle.lane,
      Math.max(
        0,
        progress - duration / approach
      )
    );

    this.drawCarBody(
      g,
      rear,
      front,
      obstacle.lane < 0
        ? 0x687d9d
        : 0xa16b55
    );
  }

  drawCarBody(g, rear, front, colour) {
    const s = rear.scale;

    const rearWidth = 125 * s;
    const frontWidth = 110 * front.scale;

    g.fillStyle(0x000000, 0.28);

    g.fillEllipse(
      rear.x,
      rear.y,
      285 * s,
      55 * s
    );

    // Bryła pomiędzy bliższym i dalszym końcem auta.
    this.polygon(g, colour, [
      [
        front.x - frontWidth,
        front.y - 82 * front.scale
      ],
      [
        front.x + frontWidth,
        front.y - 82 * front.scale
      ],
      [
        rear.x + rearWidth,
        rear.y - 35 * s
      ],
      [
        rear.x - rearWidth,
        rear.y - 35 * s
      ]
    ]);

    // Tylna ściana.
    g.fillStyle(colour);

    g.fillRoundedRect(
      rear.x - rearWidth,
      rear.y - 100 * s,
      rearWidth * 2,
      90 * s,
      12 * s
    );

    // Dach.
    this.polygon(g, colour, [
      [
        front.x - 76 * front.scale,
        front.y - 139 * front.scale
      ],
      [
        front.x + 76 * front.scale,
        front.y - 139 * front.scale
      ],
      [
        rear.x + 82 * s,
        rear.y - 117 * s
      ],
      [
        rear.x - 82 * s,
        rear.y - 117 * s
      ]
    ]);

    // Tylna szyba.
    this.polygon(g, 0x344b59, [
      [rear.x - 79 * s, rear.y - 115 * s],
      [rear.x + 79 * s, rear.y - 115 * s],
      [rear.x + 102 * s, rear.y - 77 * s],
      [rear.x - 102 * s, rear.y - 77 * s]
    ]);

    g.fillStyle(0x252a2d);

    g.fillRoundedRect(
      rear.x - 130 * s,
      rear.y - 43 * s,
      27 * s,
      49 * s,
      7 * s
    );

    g.fillRoundedRect(
      rear.x + 103 * s,
      rear.y - 43 * s,
      27 * s,
      49 * s,
      7 * s
    );

    g.fillStyle(0xc94f43);

    g.fillRect(
      rear.x - 110 * s,
      rear.y - 53 * s,
      37 * s,
      18 * s
    );

    g.fillRect(
      rear.x + 73 * s,
      rear.y - 53 * s,
      37 * s,
      18 * s
    );

    g.fillStyle(0xd9cdaa);

    g.fillRect(
      rear.x - 37 * s,
      rear.y - 42 * s,
      74 * s,
      24 * s
    );

    g.lineStyle(
      Math.max(1, 5 * s),
      0x3c3b3a
    );

    g.lineBetween(
      rear.x - 115 * s,
      rear.y - 12 * s,
      rear.x + 115 * s,
      rear.y - 12 * s
    );
  }

  drawOpenDoor(g, obstacle, progress) {
    const side = obstacle.lane < 0 ? -1 : 1;

    const approach = rowTiming(
      this.record,
      0
    ).approach;

    // Samochód stoi poza torem, drzwi wchodzą na tor.
    const bodyLane = side * 1.78;

    const rear = this.projectUnclamped(
      bodyLane,
      progress
    );

    const front = this.projectUnclamped(
      bodyLane,
      Math.max(
        0,
        progress -
          OBSTACLES.carDoor.duration / approach
      )
    );

    this.drawCarBody(
      g,
      rear,
      front,
      0x7c8d71
    );

    const door = this.projectUnclamped(
      obstacle.lane,
      progress
    );

    const { x, y, scale: s } = door;

    const hingeX = x + side * 165 * s;
    const outerX = x - side * 110 * s;

    g.fillStyle(0x000000, 0.22);

    g.fillEllipse(
      x,
      y,
      245 * s,
      35 * s
    );

    const points = [
      [hingeX, y - 120 * s],
      [outerX, y - 137 * s],
      [outerX, y - 12 * s],
      [hingeX, y - 4 * s]
    ];

    this.polygon(g, 0x85997b, points);

    this.polygon(g, 0x344b59, [
      [hingeX - side * 10 * s, y - 115 * s],
      [outerX + side * 12 * s, y - 127 * s],
      [outerX + side * 12 * s, y - 72 * s],
      [hingeX - side * 10 * s, y - 65 * s]
    ]);

    g.lineStyle(
      Math.max(1, 4 * s),
      0x344035
    );

    g.beginPath();
    g.moveTo(points[0][0], points[0][1]);

    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i][0], points[i][1]);
    }

    g.closePath();
    g.strokePath();

    g.fillStyle(0xd9d5bd);

    g.fillRect(
      outerX + side * 18 * s -
        (side < 0 ? 27 * s : 0),
      y - 58 * s,
      27 * s,
      8 * s
    );
  }
}