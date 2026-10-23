import { EventBus } from '../EventBus.js';

import {
  getReputation,
  REPUTATION_CHANGED
} from '../managers/ReputationManager.js';

const STYLE_ID = 'hud-standing-styles';

function installStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');

  style.id = STYLE_ID;

  style.textContent = `
    #hud-container .hud-standing-row {
      box-sizing: border-box;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 20px;
      width: 100%;
      padding: 12px 16px 15px;
      border-top: 1px solid rgba(166, 132, 80, 0.35);
      background: linear-gradient(
        180deg,
        #291e16 0%,
        #201810 100%
      );
      color: #e7d4ad;
      font-family: 'SpecialElite', Georgia, serif;
    }

    #hud-container .hud-standing-stat {
      min-width: 0;
      outline: none;
    }

    #hud-container .hud-standing-heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 7px;
      line-height: 1.2;
    }

    #hud-container .hud-standing-label {
      min-width: 0;
      font-size: 11px;
      letter-spacing: 0.6px;
      color: #cebb98;
      white-space: nowrap;
    }

    #hud-container .hud-standing-value {
      flex-shrink: 0;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: #ead6a7;
      white-space: nowrap;
    }

    #hud-container .hud-standing-track {
      position: relative;
      box-sizing: border-box;
      height: 9px;
      overflow: hidden;
      border: 1px solid #715736;
      border-radius: 3px;
      background: #110e0a;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.65);
    }

    #hud-container .hud-standing-fill {
      position: absolute;
      top: 1px;
      bottom: 1px;
      width: 0;
      border-radius: 1px;
    }

    #hud-container .hud-standing-fame-fill {
      left: 1px;
      max-width: calc(100% - 2px);
      background: linear-gradient(
        180deg,
        #e0c58c 0%,
        #b08b4f 100%
      );
    }

    #hud-container .hud-standing-integrity-fill {
      left: 50%;
      background: linear-gradient(
        180deg,
        #b0c6b9 0%,
        #71988a 100%
      );
    }

    #hud-container .hud-standing-integrity-fill.is-negative {
      background: linear-gradient(
        180deg,
        #d2a08d 0%,
        #a36b5d 100%
      );
    }

    #hud-container .hud-standing-marker {
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 1;
      width: 1px;
      pointer-events: none;
      background: rgba(226, 211, 180, 0.35);
    }

    #hud-container .hud-standing-marker.is-center {
      left: 50%;
      background: rgba(245, 231, 204, 0.85);
    }

    #hud-container .hud-standing-marker.is-underworld {
      left: 30%;
    }

    #hud-container .hud-standing-marker.is-police {
      left: 70%;
    }

    #hud-container .hud-standing-status {
      display: block;
      margin-top: 6px;
      font-size: 10px;
      line-height: 1.3;
      color: #b6a88f;
    }

    #hud-container .hud-standing-stat:focus-visible {
      outline: 1px solid #d1ad6c;
      outline-offset: 4px;
    }

    #hud-container.collapsed .hud-standing-row {
      display: none;
    }
  `;

  document.head.appendChild(style);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getFameStatus(fame) {
  if (fame >= 80) return 'Renowned';
  if (fame >= 50) return 'Recognized';
  if (fame >= 20) return 'Local name';

  return 'Unknown';
}

function getIntegrityStatus(integrity) {
  if (integrity >= 40) return 'Police trusted';
  if (integrity <= -40) return 'Underworld trusted';

  return 'Unaffiliated';
}

export function createHudStanding(
  hudContainer,
  {
    showTooltip = null,
    hideTooltip = null
  } = {}
) {
  const content =
    hudContainer?.querySelector('.hud-content');

  if (!(content instanceof HTMLElement)) {
    console.error(
      '[HudStanding] Missing .hud-content inside #hud-container.'
    );

    return null;
  }

  installStyles();

  // Usuwamy pozostałość po wcześniejszej instancji sceny.
  content.querySelector('#hud-standing-row')?.remove();

  const root = document.createElement('div');

  root.id = 'hud-standing-row';
  root.className = 'hud-standing-row';

  root.innerHTML = `
    <div
      class="hud-standing-stat"
      data-standing="fame"
      tabindex="0"
    >
      <div class="hud-standing-heading">
        <span class="hud-standing-label">REPUTATION</span>
        <span
          class="hud-standing-value"
          data-standing-value="fame"
        >0/100</span>
      </div>

      <div
        class="hud-standing-track"
        role="meter"
        aria-label="Reputation"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="0"
      >
        <div
          class="hud-standing-fill hud-standing-fame-fill"
        ></div>
      </div>

      <span
        class="hud-standing-status"
        data-standing-status="fame"
      >Unknown</span>
    </div>

    <div
      class="hud-standing-stat"
      data-standing="integrity"
      tabindex="0"
    >
      <div class="hud-standing-heading">
        <span class="hud-standing-label">INTEGRITY</span>
        <span
          class="hud-standing-value"
          data-standing-value="integrity"
        >0</span>
      </div>

      <div
        class="hud-standing-track"
        role="meter"
        aria-label="Integrity"
        aria-valuemin="-100"
        aria-valuemax="100"
        aria-valuenow="0"
      >
        <div
          class="hud-standing-fill hud-standing-integrity-fill"
        ></div>

        <span
          class="hud-standing-marker is-underworld"
          aria-hidden="true"
        ></span>

        <span
          class="hud-standing-marker is-center"
          aria-hidden="true"
        ></span>

        <span
          class="hud-standing-marker is-police"
          aria-hidden="true"
        ></span>
      </div>

      <span
        class="hud-standing-status"
        data-standing-status="integrity"
      >Unaffiliated</span>
    </div>
  `;

  // Wewnątrz istniejącego panelu, pod SCORE / CASH.
  content.appendChild(root);

  const fameStat =
    root.querySelector('[data-standing="fame"]');

  const integrityStat =
    root.querySelector('[data-standing="integrity"]');

  const fameValue =
    root.querySelector('[data-standing-value="fame"]');

  const integrityValue =
    root.querySelector('[data-standing-value="integrity"]');

  const fameStatus =
    root.querySelector('[data-standing-status="fame"]');

  const integrityStatus =
    root.querySelector('[data-standing-status="integrity"]');

  const fameFill =
    root.querySelector('.hud-standing-fame-fill');

  const integrityFill =
    root.querySelector('.hud-standing-integrity-fill');

  const fameMeter =
    fameStat.querySelector('[role="meter"]');

  const integrityMeter =
    integrityStat.querySelector('[role="meter"]');

  const abortController = new AbortController();

  let disposed = false;

  function refresh() {
    if (disposed) return;

    const state = getReputation();

    const fame = clamp(
      Number.isFinite(state.fame) ? state.fame : 0,
      0,
      100
    );

    const integrity = clamp(
      Number.isFinite(state.integrity)
        ? state.integrity
        : 0,
      -100,
      100
    );

    const signedIntegrity =
      integrity > 0 ? `+${integrity}` : String(integrity);

    const fameDescription = getFameStatus(fame);
    const integrityDescription = getIntegrityStatus(integrity);

    fameValue.textContent = `${fame}/100`;
    integrityValue.textContent = signedIntegrity;

    fameStatus.textContent = fameDescription;
    integrityStatus.textContent = integrityDescription;

    fameFill.style.width = `${fame}%`;

    // Jedna oś: od środka w lewo albo w prawo.
    integrityFill.style.left =
      integrity < 0
        ? `${50 + integrity / 2}%`
        : '50%';

    integrityFill.style.width =
      `${Math.abs(integrity) / 2}%`;

    integrityFill.classList.toggle(
      'is-negative',
      integrity < 0
    );

    integrityValue.style.color =
      integrity > 0
        ? '#b0c6b9'
        : integrity < 0
          ? '#d2a08d'
          : '#d3c4a9';

    fameMeter.setAttribute(
      'aria-valuenow',
      String(fame)
    );

    fameMeter.setAttribute(
      'aria-valuetext',
      `${fame} out of 100. ${fameDescription}.`
    );

    integrityMeter.setAttribute(
      'aria-valuenow',
      String(integrity)
    );

    integrityMeter.setAttribute(
      'aria-valuetext',
      `${signedIntegrity}. ${integrityDescription}.`
    );
  }

  function bindTooltip(element, getContent) {
    const options = {
      signal: abortController.signal
    };

    const show = () => {
      if (
        disposed ||
        hudContainer.classList.contains('collapsed')
      ) {
        return;
      }

      const text = getContent();

      if (typeof showTooltip === 'function') {
        showTooltip(text);
      } else {
        element.title = text;
      }
    };

    const hide = () => {
      hideTooltip?.();
    };

    element.addEventListener('mouseenter', show, options);
    element.addEventListener('mouseleave', hide, options);
    element.addEventListener('focus', show, options);
    element.addEventListener('blur', hide, options);
  }

  bindTooltip(fameStat, () => {
    const { fame } = getReputation();

    return [
      `REPUTATION: ${fame}/100`,
      'How well known you are.',
      'Solved cases and media coverage increase your reputation.',
      'Your reputation affects which cases come your way.'
    ].join('\n');
  });

  bindTooltip(integrityStat, () => {
    const { integrity } = getReputation();

    return [
      `INTEGRITY: ${integrity > 0 ? '+' : ''}${integrity}`,
      'Your methods shape who trusts you.',
      'Police contacts require +40 or more.',
      'Underworld contacts require -40 or less.',
      'These contact restrictions do not apply to crime-city witnesses.'
    ].join('\n');
  });

  function destroy() {
    if (disposed) return;

    disposed = true;

    abortController.abort();

    EventBus.off(
      REPUTATION_CHANGED,
      refresh
    );

    root.remove();
  }

  EventBus.on(
    REPUTATION_CHANGED,
    refresh
  );

  refresh();

  return {
    root,
    refresh,
    destroy
  };
}