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
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
        return;
      }

      if (!this.ui?.contains(event.target)) return;

      if (event.key === 'Tab') {
        const elements = [
          ...this.ui.querySelectorAll(
            'button:not(:disabled), input:not(:disabled)'
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

    this.ui.innerHTML = `
      <style>
        .la-jukebox-overlay,
        .la-jukebox-overlay * {
          box-sizing: border-box;
        }

        .la-jukebox-overlay .jb-stage {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          color: #eedeb9;
          background: #0c111a;
          font-family:
            'SpecialElite',
            'Special Elite',
            monospace;
          container-type: inline-size;
        }

        .la-jukebox-overlay .jb-background {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
          user-select: none;
          z-index: -2;
        }

        .la-jukebox-overlay .jb-shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: -1;
          background: linear-gradient(
            90deg,
            transparent 0%,
            transparent 39%,
            rgba(5, 9, 15, 0.12) 49%,
            rgba(5, 9, 15, 0.28) 100%
          );
        }

        .la-jukebox-overlay button {
          font: inherit;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .la-jukebox-overlay button:focus-visible,
        .la-jukebox-overlay input:focus-visible {
          outline: 2px solid #8bd2c4;
          outline-offset: 4px;
        }

        .la-jukebox-overlay .jb-close {
          position: absolute;
          top: 3%;
          right: 3%;
          z-index: 2;
          width: 42px;
          height: 42px;
          padding: 0;
          border: 1px solid #796344;
          color: #e9cf9f;
          background: rgba(10, 16, 24, 0.88);
          font-family:
            'PressStart2P',
            'Press Start 2P',
            monospace;
          font-size: 14px;
        }

        .la-jukebox-overlay .jb-close:hover {
          color: #fff0cb;
          border-color: #e1b56a;
          background: #26303a;
        }

        .la-jukebox-overlay .jb-panel {
          position: absolute;
          top: 12%;
          bottom: 7%;
          left: 49%;
          right: 5%;
          padding: clamp(16px, 2.2cqw, 30px);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #8a704b #111820;
          background: linear-gradient(
            135deg,
            rgba(12, 19, 28, 0.84),
            rgba(10, 16, 24, 0.66)
          );
          border-top: 1px solid rgba(196, 157, 93, 0.6);
          border-bottom: 1px solid rgba(196, 157, 93, 0.35);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
        }

        .la-jukebox-overlay .jb-eyebrow {
          margin: 0 0 12px;
          color: #83b9ad;
          letter-spacing: 3px;
          font-size: clamp(10px, 1cqw, 14px);
        }

        .la-jukebox-overlay h1 {
          margin: 0;
          color: #f0ce8c;
          font-family:
            'PressStart2P',
            'Press Start 2P',
            monospace;
          font-weight: normal;
          font-size: clamp(15px, 1.65cqw, 23px);
          line-height: 1.7;
          text-shadow: 2px 3px #080b10;
        }

        .la-jukebox-overlay .jb-tagline {
          margin: 8px 0 22px;
          color: #aaa89e;
          font-size: clamp(13px, 1.25cqw, 17px);
          line-height: 1.5;
        }

        .la-jukebox-overlay .jb-tracks {
          display: grid;
          gap: 8px;
        }

        .la-jukebox-overlay .jb-track {
          display: flex;
          align-items: center;
          width: 100%;
          gap: 14px;
          padding: 13px 14px;
          text-align: left;
          color: #c7c2b4;
          background: rgba(19, 29, 39, 0.78);
          border: 1px solid #3d4647;
          border-left: 3px solid #4b514e;
          transition:
            background 120ms ease,
            border-color 120ms ease,
            color 120ms ease;
        }

        .la-jukebox-overlay .jb-track:hover {
          color: #fff0cb;
          background: rgba(40, 49, 51, 0.95);
          border-color: #aa8a56;
        }

        .la-jukebox-overlay .jb-track.selected {
          color: #ffe4ac;
          background: rgba(48, 58, 51, 0.9);
          border-color: #8cae97;
          border-left-color: #dfb36b;
        }

        .la-jukebox-overlay .jb-track-number {
          flex-shrink: 0;
          color: #82bcae;
          font-size: clamp(14px, 1.5cqw, 20px);
        }

        .la-jukebox-overlay .jb-track-title {
          flex: 1;
          min-width: 0;
          font-size: clamp(14px, 1.4cqw, 19px);
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .la-jukebox-overlay .jb-track-marker {
          width: 8px;
          height: 8px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #404948;
        }

        .la-jukebox-overlay
          .jb-track.selected
          .jb-track-marker {
          background: #e1b56a;
          box-shadow: 0 0 9px rgba(225, 181, 106, 0.4);
        }

        .la-jukebox-overlay .jb-display {
          margin-top: 20px;
          padding: 13px 0;
          border-top: 1px solid #35413f;
          border-bottom: 1px solid #35413f;
        }

        .la-jukebox-overlay .jb-status {
          margin-bottom: 7px;
          color: #8bc7b8;
          font-size: 11px;
          letter-spacing: 1px;
          line-height: 1.5;
        }

        .la-jukebox-overlay .jb-now-title {
          color: #e2ddc9;
          font-size: clamp(14px, 1.4cqw, 19px);
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .la-jukebox-overlay .jb-error {
          margin-top: 8px;
          color: #efad98;
          font-size: 13px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .la-jukebox-overlay .jb-error:empty {
          display: none;
        }

        .la-jukebox-overlay .jb-controls {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 17px;
        }

        .la-jukebox-overlay .jb-controls button {
          min-height: 42px;
          padding: 10px 6px;
          color: #e4cfaa;
          background: #202b34;
          border: 1px solid #8a704b;
          box-shadow: 0 3px #070b10;
          font-size: clamp(11px, 1.1cqw, 15px);
        }

        .la-jukebox-overlay .jb-controls button:hover {
          color: #fff0cb;
          background: #35413f;
          border-color: #deb46d;
        }

        .la-jukebox-overlay .jb-controls button:active {
          transform: translateY(2px);
          box-shadow: 0 1px #070b10;
        }

        .la-jukebox-overlay .jb-volume {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
          color: #aaa99e;
          font-size: 12px;
        }

        .la-jukebox-overlay .jb-volume input {
          flex: 1;
          min-width: 30px;
          accent-color: #caa067;
          cursor: pointer;
        }

        .la-jukebox-overlay .jb-volume output {
          min-width: 38px;
          text-align: right;
          color: #d9c39d;
        }

        .la-jukebox-overlay .jb-footer {
          margin: 18px 0 0;
          color: #969b96;
          font-size: 12px;
          line-height: 1.6;
        }

        .la-jukebox-overlay .jb-image-error {
          position: absolute;
          bottom: 10px;
          left: 10px;
          max-width: 45%;
          margin: 0;
          padding: 10px;
          color: #ffd0bb;
          background: #171923;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        @container (max-width: 700px) {
          .la-jukebox-overlay .jb-panel {
            top: auto;
            left: 4%;
            right: 4%;
            bottom: 3%;
            max-height: 70%;
            padding: 18px;
            background: rgba(10, 16, 24, 0.94);
          }

          .la-jukebox-overlay .jb-background {
            object-fit: cover;
            object-position: 22% center;
          }

          .la-jukebox-overlay .jb-eyebrow {
            margin-bottom: 7px;
          }

          .la-jukebox-overlay .jb-tagline {
            margin-bottom: 14px;
          }

          .la-jukebox-overlay .jb-track {
            padding: 10px;
          }

          .la-jukebox-overlay .jb-display {
            margin-top: 14px;
          }

          .la-jukebox-overlay .jb-footer {
            margin-top: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .la-jukebox-overlay .jb-track {
            transition: none;
          }
        }
      </style>

      <section
        class="jb-stage"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jb-heading"
      >
        <img
          class="jb-background"
          alt=""
          draggable="false"
        >

        <div class="jb-shade" aria-hidden="true"></div>

        <button
          type="button"
          class="jb-close"
          data-action="close"
          aria-label="Close jukebox"
        >X</button>

        <div class="jb-panel">
          <header>
            <p class="jb-eyebrow">THE ALIBI 3000</p>
            <h1 id="jb-heading">MARK'S JUKEBOX</h1>
            <p class="jb-tagline">
              Good music. Questionable alibis.
            </p>
          </header>

          <div
            class="jb-tracks"
            role="group"
            aria-label="Choose a track"
          ></div>

          <div class="jb-display" aria-live="polite">
            <div class="jb-status"></div>
            <div class="jb-now-title"></div>
            <div class="jb-error"></div>
          </div>

          <div
            class="jb-controls"
            role="group"
            aria-label="Playback controls"
          >
            <button
              type="button"
              data-action="previous"
              aria-label="Previous track"
            >PREV</button>

            <button
              type="button"
              data-action="play"
            >PLAY</button>

            <button
              type="button"
              data-action="next"
              aria-label="Next track"
            >NEXT</button>

            <button
              type="button"
              data-action="stop"
            >STOP</button>
          </div>

          <label class="jb-volume">
            <span>VOLUME</span>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              aria-label="Music volume"
            >

            <output></output>
          </label>

          <p class="jb-footer">
            No coins required. We already have your salary.<br>
            Close this window to keep investigating.
          </p>
        </div>
      </section>
    `;

    document.body.appendChild(this.ui);

    this.stage = this.ui.querySelector('.jb-stage');
    this.background = this.ui.querySelector('.jb-background');

    this.listen(this.background, 'error', () => {
      if (!this.ui || this.ui.querySelector('.jb-image-error')) {
        return;
      }

      const message = document.createElement('p');

      message.className = 'jb-image-error';
      message.textContent =
        'Background not found: assets/local/jukebox.webp';

      this.stage.appendChild(message);
    });

    this.background.src = BACKGROUND_URL;

    this.buttons = [];

    const list = this.ui.querySelector('.jb-tracks');

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
      loading: 'LOADING...',
      playing: state.playing
        ? 'NOW PLAYING'
        : 'WAITING FOR AUDIO',
      paused: 'PAUSED',
      stopped: 'STOPPED',
      error: 'AUDIO ERROR'
    };

    let status = state.locked
      ? 'CLICK PLAY TO ENABLE AUDIO'
      : labels[state.status] || 'READY';

    if (state.muted) {
      status += ' — MUTED IN SETTINGS';
    }

    this.ui.querySelector('.jb-status').textContent = status;

    this.ui.querySelector('.jb-now-title').textContent =
      track?.title || 'No track selected';

    this.ui.querySelector('.jb-error').textContent =
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