import {
  getTown
} from '../config/RoadTripTowns.js';

import {
  getCurrentTownId
} from '../managers/RoadTripManager.js';

import {
  getLocalAreaLocations
} from '../managers/LocalAreaLocations.js';

import {
  localAreaText as t
} from '../dialogues/LocalAreaText.js';

export const LOCAL_TOWN_SCENE =
  'PILocalAreaTownScene';

const sessions = new Map();

export function bindLocalAreaSession(id, controller) {
  sessions.set(id, controller);
}

export function unbindLocalAreaSession(id) {
  sessions.delete(id);
}

export class LocalAreaTownScene extends Phaser.Scene {
  constructor() {
    super({
      key: LOCAL_TOWN_SCENE
    });
  }

  init(data = {}) {
    this.sessionId = data.localAreaSession;
    this.page = 0;
    this.message = '';
    this.loading = false;
    this.run = Symbol('town-run');
  }

  create() {
    this.cameras.main.setBackgroundColor('#101923');

    this.controller = sessions.get(this.sessionId);

    this.root = this.add
      .container(0, 0)
      .setDepth(2000);

    const onResize = () => this.draw();

    const onResume = () => {
      this.loading = false;
      this.message = '';
      this.draw();
    };

    this.scale.on('resize', onResize);
    this.events.on('resume', onResume);

    this.events.once('shutdown', () => {
      this.run = null;

      this.scale.off('resize', onResize);
      this.events.off('resume', onResume);

      this.map?.destroy();
      this.map = null;
    });

    this.controller?.arrive(this);

    this.draw();
  }

  text(
    x,
    y,
    value,
    size = 25,
    color = '#eee4cc',
    width = 1600
  ) {
    const object = this.add.text(
      x,
      y,
      value,
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: `${size}px`,
        color,
        wordWrap: {
          width
        },
        lineSpacing: 7
      }
    );

    this.root.add(object);

    return object;
  }

  button(
    x,
    y,
    label,
    action,
    enabled = true,
    width = 690
  ) {
    const bg = this.add
      .rectangle(
        x,
        y,
        width,
        66,
        enabled ? 0x304858 : 0x202d38
      )
      .setOrigin(0)
      .setStrokeStyle(2, 0x9b865f);

    this.root.add(bg);

    this.text(
      x + 18,
      y + 20,
      label,
      22,
      enabled ? '#fff0cc' : '#87919a',
      width - 36
    );

    if (enabled && !this.loading) {
      bg
        .setInteractive({
          useHandCursor: true
        })
        .on('pointerdown', action);
    }
  }

  draw() {
    if (!this.root?.scene) return;

    this.root.removeAll(true);

    const {
      width,
      height
    } = this.scale.gameSize || this.scale;

    const zoom = Math.min(
      width / 1920,
      height / 1080
    );

    this.root
      .setPosition(
        (width - 1920 * zoom) / 2,
        (height - 1080 * zoom) / 2
      )
      .setScale(zoom);

    if (!this.controller) {
      this.text(
        100,
        150,
        t('missingSession')
      );

      return;
    }

    const town = getTown(getCurrentTownId());

    this.text(
      110,
      70,
      t('townHeading'),
      20,
      '#b8a173'
    );

    this.text(
      110,
      125,
      town.name,
      43
    );

    this.text(
      110,
      195,
      town.tagline || '',
      25,
      '#c3bba7'
    );

    this.text(
      110,
      280,
      t('places'),
      27,
      '#d8bd83'
    );

    const entries = getLocalAreaLocations(town.id);

    const pages = Math.max(
      1,
      Math.ceil(entries.length / 4)
    );

    this.page = Math.min(
      this.page,
      pages - 1
    );

    if (!entries.length) {
      this.text(
        110,
        365,
        t('bored'),
        30
      );

      this.text(
        110,
        420,
        t('empty'),
        25,
        '#c3bba7',
        1500
      );
    }

    entries
      .slice(
        this.page * 4,
        this.page * 4 + 4
      )
      .forEach((entry, i) => {
        let access;

        try {
          access = entry.getAccess();
        } catch (error) {
          console.error(
            '[LocalArea] Location access failed:',
            error
          );

          access = {
            ok: false,
            message: t('locationError')
          };
        }

        const y = 345 + i * 112;

        this.button(
          110,
          y,
          entry.label,
          () => void this.visit(entry),
          access.ok
        );

        if (!access.ok) {
          this.text(
            835,
            y + 19,
            access.message || t('locked'),
            22,
            '#d5ac86',
            960
          );
        }
      });

    if (pages > 1) {
      this.button(
        110,
        810,
        t('previous'),
        () => {
          this.page--;
          this.draw();
        },
        this.page > 0,
        280
      );

      this.button(
        420,
        810,
        t('next'),
        () => {
          this.page++;
          this.draw();
        },
        this.page < pages - 1,
        280
      );

      this.text(
        740,
        830,
        t('page', {
          page: this.page + 1,
          pages
        }),
        20
      );
    }

    this.text(
      110,
      900,
      this.message,
      23,
      '#e4c999',
      1690
    );

    this.button(
      110,
      975,
      t('localMap'),
      () => this.controller.openTownMap(this),
      true,
      690
    );

    this.button(
      850,
      975,
      this.controller.isHome()
        ? t('office')
        : t('home'),
      () => void this.controller.goHome(this),
      true,
      690
    );
  }

  async visit(entry) {
    if (this.loading) return;

    const access = entry.getAccess();

    if (!access.ok) {
      this.message = access.message;
      this.draw();
      return;
    }

    const run = this.run;
    const townId = getCurrentTownId();

    this.loading = true;
    this.message = t('loading');
    this.draw();

    try {
      const destination = await entry.load();

      if (
        !this.run ||
        run !== this.run ||
        !this.sys.isActive()
      ) {
        return;
      }

      if (
        townId !== getCurrentTownId() ||
        entry.townId !== townId
      ) {
        throw new Error(t('locationChanged'));
      }

      const latest = entry.getAccess();

      if (!latest.ok) {
        this.message = latest.message;
        return;
      }

      if (
        this.game.scene.isActive(destination.key) ||
        this.game.scene.isPaused(destination.key)
      ) {
        throw new Error(t('locationError'));
      }

      if (!this.game.scene.keys[destination.key]) {
        this.game.scene.add(
          destination.key,
          destination.Scene,
          false
        );
      }

      const locationScene =
        this.game.scene.keys[destination.key];

      const controller = this.controller;

      controller.activeLocation = destination.key;

      const returnToTown = () => {
        if (
          controller.activeLocation === destination.key
        ) {
          controller.activeLocation = null;
        }

        if (
          controller.disposed ||
          controller.session?.id !== this.sessionId
        ) {
          return;
        }

        if (
          this.game.scene.isPaused(LOCAL_TOWN_SCENE)
        ) {
          this.game.scene.resume(LOCAL_TOWN_SCENE);
        }

        this.game.scene.bringToTop(
          LOCAL_TOWN_SCENE
        );
      };

      locationScene.events.once(
        'shutdown',
        returnToTown
      );

      this.events.once('shutdown', () => {
        locationScene.events.off(
          'shutdown',
          returnToTown
        );
      });

      this.scene.launch(
        destination.key,
        {
          ...destination.data,
          returnScenes: [LOCAL_TOWN_SCENE]
        }
      );

      this.scene.pause();

      this.game.scene.bringToTop(
        destination.key
      );
    } catch (error) {
      console.error(
        '[LocalArea] Location failed:',
        error
      );

      if (this.run === run) {
        this.message = t('locationError');
      }
    } finally {
      if (this.run === run) {
        this.loading = false;
        this.draw();
      }
    }
  }
}