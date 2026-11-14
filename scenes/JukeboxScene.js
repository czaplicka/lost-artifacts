import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { audioManager } from '../managers/AudioManager.js';

const BACKGROUND_URL = new URL(
  '../assets/local/jukebox.webp',
  import.meta.url
).href;

export class JukeboxScene extends Phaser.Scene {
  constructor() {
    super({ key: 'JukeboxScene' });
  }

  init() {
    this.ui = null;
    this.listeners = [];
    this.closing = false;
    this.lastState = '';
    this.lastBounds = '';
    this.tracks = audioManager.getJukeboxTracks();
  }

  create() {
    audioManager.init(this);

    this.blocker = this.add
      .rectangle(
        0,
        0,
        this.scale.width,
        this.scale.height,
        0x000000,
        0.85
      )
      .setOrigin(0)
      .setInteractive();

    this.blocker.on(
      'pointerdown',
      (_pointer, _x, _y, event) => {
        event.stopPropagation();
      }
    );

    this.previousFocus = document.activeElement;

    this.buildInterface();
    this.fitInterface();
    this.refresh();

    this.scale.on('resize', this.fitInterface, this);

    this.onKey = event => {
      if (event.key === __dialogueText("scenes/JukeboxScene.js", "t_037c968467aa3fd7c059")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
        return;
      }

      if (!this.ui?.contains(event.target)) return;

      if (event.key === __dialogueText("scenes/JukeboxScene.js", "t_90ddf1963abb36c9921c")) {
        const elements = [
          ...this.ui.querySelectorAll(
            __dialogueText("scenes/JukeboxScene.js", "t_ccbb472522915164ee87")
          )
        ];

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first?.focus();
        }
      }

      event.stopPropagation();
    };

    window.addEventListener('keydown', this.onKey, true);

    this.events.once('shutdown', this.cleanup, this);

    this.ui.querySelector('[data-action="close"]').focus();
  }

  listen(element, type, handler) {
    element.addEventListener(type, handler);

    this.listeners.push({
      element,
      type,
      handler
    });
  }

  buildInterface() {
    this.ui = document.createElement('div');
    this.ui.className = 'la-jukebox-overlay';

    Object.assign(this.ui.style, {
      position: 'fixed',
      zIndex: '10000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: '#06090e',
      pointerEvents: 'auto'
    });

    this.ui.innerHTML = `${__dialogueText("scenes/JukeboxScene.js", "t_87b7a15bc206f67e4c7c")}`;

    document.body.appendChild(this.ui);

    this.stage = this.ui.querySelector(__dialogueText("scenes/JukeboxScene.js", "t_ca9734581511489e0ce1"));
    this.background = this.ui.querySelector(__dialogueText("scenes/JukeboxScene.js", "t_d94ee0801ab0f7e66782"));

    this.listen(this.background, 'error', () => {
      if (!this.ui || this.ui.querySelector(__dialogueText("scenes/JukeboxScene.js", "t_17a8804686554e1ae42e"))) {
        return;
      }

      const message = document.createElement('p');

      message.className = 'jb-image-error';
      message.textContent =
        __dialogueText("scenes/JukeboxScene.js", "t_e9f9b1699e60a7bd5113");

      this.stage.appendChild(message);
    });

    this.background.src = BACKGROUND_URL;

    this.buttons = [];

    const list = this.ui.querySelector(__dialogueText("scenes/JukeboxScene.js", "t_25a870d323b07aa83ec2"));

    this.tracks.forEach((track, index) => {
      const button = document.createElement('button');

      button.type = 'button';
      button.className = 'jb-track';

      const number = document.createElement('span');

      number.className = 'jb-track-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const title = document.createElement('span');

      title.className = 'jb-track-title';
      title.textContent = track.title;

      const marker = document.createElement('span');

      marker.className = 'jb-track-marker';
      marker.setAttribute('aria-hidden', 'true');

      button.append(number, title, marker);
      list.appendChild(button);

      this.buttons.push(button);

      this.listen(button, 'click', () => {
        this.play(track.id);
      });
    });

    const action = name =>
      this.ui.querySelector(`[data-action="${name}"]`);

    this.listen(action('close'), 'click', () => {
      this.close();
    });

    this.listen(action('previous'), 'click', () => {
      this.step(-1);
    });

    this.listen(action('next'), 'click', () => {
      this.step(1);
    });

    this.listen(action('stop'), 'click', () => {
      audioManager.stopJukebox();
      this.refresh();
    });

    this.listen(action('play'), 'click', () => {
      const state = audioManager.getJukeboxState();

      const canPause =
        state.mode === 'playing' &&
        ['playing', 'loading'].includes(state.status) &&
        !state.locked;

      if (canPause) {
        audioManager.pauseJukebox();
        this.refresh();
      } else {
        this.play(state.selectedId);
      }
    });

    this.listen(
      this.ui.querySelector('input[type="range"]'),
      'input',
      event => {
        audioManager.setMusicVolume(
          Number(event.target.value) / 100
        );

        this.refresh();
      }
    );
  }

  play(id) {
    audioManager.game?.sound?.unlock?.();

    audioManager.playJukebox(id).catch(error => {
      console.warn('[Jukebox]', error);
    });

    this.refresh();
  }

  step(direction) {
    if (!this.tracks.length) return;

    const state = audioManager.getJukeboxState();

    const current = this.tracks.findIndex(
      track => track.id === state.selectedId
    );

    const index =
      (Math.max(0, current) + direction + this.tracks.length) %
      this.tracks.length;

    this.play(this.tracks[index].id);
  }

  refresh() {
    if (!this.ui) return;

    const state = audioManager.getJukeboxState();
    const signature = JSON.stringify(state);

    if (signature === this.lastState) return;

    this.lastState = signature;

    const track = this.tracks.find(
      item => item.id === state.selectedId
    );

    this.buttons.forEach((button, index) => {
      const selected =
        this.tracks[index].id === state.selectedId;

      button.classList.toggle('selected', selected);

      button.setAttribute(
        'aria-pressed',
        String(selected)
      );
    });

    const labels = {
      loading: __dialogueText("scenes/JukeboxScene.js", "t_b6dcb96448c66497eb4c"),
      playing: state.playing
        ? __dialogueText("scenes/JukeboxScene.js", "t_e6a95e23db97d828ed8f")
        : __dialogueText("scenes/JukeboxScene.js", "t_775526223bf228d96d47"),
      paused: 'PAUSED',
      stopped: 'STOPPED',
      error: __dialogueText("scenes/JukeboxScene.js", "t_b2eccbfb3606b102f0a8")
    };

    let status = state.locked
      ? __dialogueText("scenes/JukeboxScene.js", "t_45e99ddeb61454037e81")
      : labels[state.status] || 'READY';

    if (state.muted) {
      status += __dialogueText("scenes/JukeboxScene.js", "t_62758ea4a323131c2b85");
    }

    this.ui.querySelector(__dialogueText("scenes/JukeboxScene.js", "t_70f6340462d1544bde11")).textContent = status;

    this.ui.querySelector(__dialogueText("scenes/JukeboxScene.js", "t_fdf8a33381e5ac805e94")).textContent =
      track?.title || __dialogueText("scenes/JukeboxScene.js", "t_788b67bfb1734323847d");

    this.ui.querySelector(__dialogueText("scenes/JukeboxScene.js", "t_6c86df041cf20796d9db")).textContent =
      state.error || '';

    const canPause =
      state.mode === 'playing' &&
      ['playing', 'loading'].includes(state.status) &&
      !state.locked;

    this.ui.querySelector(
      '[data-action="play"]'
    ).textContent = canPause ? 'PAUSE' : 'PLAY';

    const volume = Math.round(state.volume * 100);

    this.ui.querySelector(
      'input[type="range"]'
    ).value = String(volume);

    this.ui.querySelector(
      'output'
    ).textContent = `${volume}%`;
  }

  fitInterface() {
    if (!this.ui) return;

    const bounds = this.game.canvas.getBoundingClientRect();

    const signature = [
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height
    ].join('|');

    if (signature === this.lastBounds) return;

    this.lastBounds = signature;

    Object.assign(this.ui.style, {
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`
    });

    let width;
    let height;

    if (bounds.width <= 700) {
      width = bounds.width;
      height = bounds.height;
    } else {
      const imageRatio = 1376 / 768;

      width = bounds.width;
      height = width / imageRatio;

      if (height > bounds.height) {
        height = bounds.height;
        width = height * imageRatio;
      }
    }

    Object.assign(this.stage.style, {
      width: `${width}px`,
      height: `${height}px`
    });

    this.blocker.setSize(
      this.scale.width,
      this.scale.height
    );
  }

  update() {
    this.fitInterface();
    this.refresh();
  }

  close() {
    if (this.closing) return;

    this.closing = true;
    this.scene.stop();
  }

  cleanup() {
    this.scale.off('resize', this.fitInterface, this);

    window.removeEventListener(
      'keydown',
      this.onKey,
      true
    );

    for (const { element, type, handler } of this.listeners) {
      element.removeEventListener(type, handler);
    }

    this.listeners = [];

    this.ui?.remove();
    this.ui = null;

    if (this.previousFocus?.isConnected) {
      this.previousFocus.focus();
    }
  }
}