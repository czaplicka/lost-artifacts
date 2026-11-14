import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { EventBus } from '../EventBus.js';

import {
  getReputation,
  REPUTATION_CHANGED
} from '../managers/ReputationManager.js';

const STYLE_ID = 'hud-standing-styles';

const STANDING_CSS = `${__dialogueText("ui/HudStanding.js", "t_9ea4369b15886c2a758e")}`;

function installStyles() {
  let style = document.getElementById(STYLE_ID);

  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }

  // Aktualizujemy zawartość także dla istniejącego <style>,
  // żeby zmiany były widoczne po hot-reloadzie.
  if (style.textContent !== STANDING_CSS) {
    style.textContent = STANDING_CSS;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getFameStatus(fame) {
  if (fame >= 80) return __dialogueText("ui/HudStanding.js", "t_0e8e2975c83c0572eebe");
  if (fame >= 50) return __dialogueText("ui/HudStanding.js", "t_1c3862efbf2eb38a5a85");
  if (fame >= 20) return __dialogueText("ui/HudStanding.js", "t_8c3be4d4f8fd41f63aea");

  return __dialogueText("ui/HudStanding.js", "t_b764cdc0eab713746721");
}

function getIntegrityStatus(integrity) {
  if (integrity >= 40) return __dialogueText("ui/HudStanding.js", "t_93fdf0728bba43844708");
  if (integrity <= -40) return __dialogueText("ui/HudStanding.js", "t_1d03bf9433366f476896");

  return __dialogueText("ui/HudStanding.js", "t_489fc73883fae4e14759");
}

export function createHudStanding(
  hudContainer,
  {
    showTooltip = null,
    hideTooltip = null
  } = {}
) {
  const content =
    hudContainer?.querySelector(__dialogueText("ui/HudStanding.js", "t_000fe423fa15b05430f2"));

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

  root.innerHTML = `${__dialogueText("ui/HudStanding.js", "t_eff35b35769b9b997bcb")}`;

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
    root.querySelector(__dialogueText("ui/HudStanding.js", "t_c2c8a95b37594971e3c7"));

  const integrityFill =
    root.querySelector(__dialogueText("ui/HudStanding.js", "t_1a7c1e43bd6822177a16"));

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
        ? '#b9d9c9'
        : integrity < 0
          ? '#e0a58f'
          : '#d3c4a9';

    fameMeter.setAttribute(
      'aria-valuenow',
      String(fame)
    );

    fameMeter.setAttribute(
      'aria-valuetext',
      `${fame}${__dialogueText("ui/HudStanding.js", "t_4b761ad96f2ccf9d8db1")}${fameDescription}${__dialogueText("ui/HudStanding.js", "t_cdb4ee2aea69cc6a8333")}`
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
      `${__dialogueText("ui/HudStanding.js", "t_3bec14be04a6104288a8")}${fame}${__dialogueText("ui/HudStanding.js", "t_2f07766fd476de0ab959")}`,
      __dialogueText("ui/HudStanding.js", "t_4049fde1085ef3238a75"),
      __dialogueText("ui/HudStanding.js", "t_59a7a8ec6699230bfbda"),
      __dialogueText("ui/HudStanding.js", "t_df973403d4339b6cdd9d")
    ].join('\n');
  });

  bindTooltip(integrityStat, () => {
    const { integrity } = getReputation();

    return [
      `${__dialogueText("ui/HudStanding.js", "t_dfea1ac9e9df167ccc0a")}${integrity > 0 ? '+' : ''}${integrity}`,
      __dialogueText("ui/HudStanding.js", "t_b82be0c04eaf7c2dfdce"),
      __dialogueText("ui/HudStanding.js", "t_ba412817d472735843fa"),
      __dialogueText("ui/HudStanding.js", "t_0bf20fdcd8b0fd6a3a24"),
      __dialogueText("ui/HudStanding.js", "t_cb0d1b95dfa971d3c87c")
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