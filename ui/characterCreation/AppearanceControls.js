// ui/characterCreation/AppearanceControls.js

import {
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  getAppearanceSummary,
  getWitnessLine
} from '../../config/AvatarParts.js';
import { avatarManager } from '../../managers/AvatarManager.js';

export {
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  getAppearanceSummary,
  getWitnessLine
};

const OPTIONAL_CATEGORIES = new Set([
  'accessory', 'jewelry', 'marks', 'tattoos', 'facialHair'
]);

const STYLES = `
.av-studio{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:36px;align-items:start;color:#2b2218;font-family:'Special Elite','Courier New',monospace;text-align:left}
.av-studio *{box-sizing:border-box}
.av-ident{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;margin-bottom:24px}
.av-field{display:flex;flex-direction:column;gap:8px;flex:1 1 240px}
.av-field span{font:400 10px 'Press Start 2P',monospace;letter-spacing:1px}
.av-field input{font:400 22px 'Special Elite','Courier New',monospace;background:#0f0c08;color:#f3e9d2;border:2px solid #5a4630;padding:10px 12px;outline:none;width:100%}
.av-field input:focus{border-color:#8b3828}
.av-dice{font:400 11px 'Press Start 2P',monospace;background:#D4AF37;color:#17120e;border:0;padding:15px 16px;cursor:pointer}
.av-dice:hover{filter:brightness(1.12)}
.av-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 30px}
.av-group-title{font:400 10px 'Press Start 2P',monospace;margin-bottom:10px;letter-spacing:1px}
.av-options{display:flex;flex-wrap:wrap;gap:8px}

#character-creation-root .av-studio .av-field span,
#character-creation-root .av-studio .av-group-title{color:#58301f}

#character-creation-root .av-studio .av-field input{
  background-color:#0f0c08;
  color:#fff4db;
  caret-color:#fff4db
}
#character-creation-root .av-studio .av-field input::placeholder{
  color:#c7b9a2;
  opacity:1
}

#character-creation-root .av-studio button.av-chip{
  font:400 17px 'Special Elite','Courier New',monospace;
  color:#2b2218;
  background:#f5e8c8;
  border:2px solid #8a6b48;
  padding:6px 12px;
  cursor:pointer
}
#character-creation-root .av-studio button.av-chip:hover{
  border-color:#723325
}
#character-creation-root .av-studio button.av-chip.is-selected{
  background:#dec184;
  color:#24170f;
  border-color:#723325
}

#character-creation-root .av-studio button.av-swatch{
  display:inline-grid;
  place-items:center;
  position:relative;
  flex:0 0 34px;
  width:34px;
  height:34px;
  min-width:34px;
  min-height:34px;
  border-radius:50%;
  border:2px solid #604631;
  background:transparent;
  padding:3px;
  cursor:pointer
}
#character-creation-root .av-studio button.av-swatch:hover{
  border-color:#842f24
}
#character-creation-root .av-studio button.av-swatch.is-selected{
  border-color:#842f24;
  box-shadow:0 0 0 1px #842f24
}
#character-creation-root .av-studio .av-swatch-fill{
  display:block;
  width:100%;
  height:100%;
  border:1px solid #604631;
  border-radius:50%;
  pointer-events:none
}
#character-creation-root .av-studio button.av-chip:focus-visible,
#character-creation-root .av-studio button.av-swatch:focus-visible{
  outline:2px solid #52261c;
  outline-offset:3px
}

.av-quip{font:400 15px/1.3 'Special Elite','Courier New',monospace;margin-top:8px;min-height:20px}
#character-creation-root .av-studio .av-quip{color:#59422e}

.av-card{position:sticky;top:0;background:#efe4c8;color:#2b2218;padding:18px 18px 16px;border:3px solid #2b2218;box-shadow:6px 6px 0 rgba(0,0,0,.55);transform:rotate(-1.2deg)}
.av-card-head{font:400 9px/1.7 'Press Start 2P',monospace;text-align:center;border-bottom:2px dashed rgba(43,34,24,.6);padding-bottom:10px;margin-bottom:12px}
.av-photo{position:relative;background:#e2d5b3;border:2px solid #2b2218;min-height:240px}
.av-photo canvas{display:block;width:100%;height:auto;animation:av-develop .3s ease-out}
.av-dev{display:none;position:absolute;inset:0;align-items:center;justify-content:center;font:400 10px 'Press Start 2P',monospace;color:#5a4630;text-align:center;line-height:1.8}
.av-card.is-developing .av-dev{display:flex}
.av-stamp{position:absolute;right:-8px;bottom:14px;transform:rotate(-14deg);border:3px solid #a92a2a;color:#a92a2a;font:400 10px/1.5 'Press Start 2P',monospace;padding:6px 8px;background:rgba(239,228,200,.85);text-align:center}
.av-name{font:400 14px/1.5 'Press Start 2P',monospace;margin-top:14px;word-break:break-word}
.av-alias{font:400 20px 'Special Elite','Courier New',monospace;color:#5a4630;margin-top:6px}
.av-witness{font:400 16px/1.35 'Special Elite','Courier New',monospace;margin-top:12px;border-top:2px dashed rgba(43,34,24,.6);padding-top:10px}
.av-witness b{display:block;font:400 9px 'Press Start 2P',monospace;color:#a92a2a;margin-bottom:8px}
@keyframes av-develop{from{opacity:.35;filter:sepia(1) brightness(1.4)}to{opacity:1;filter:none}}
`;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const cssHex = (n) =>
  `#${(n >>> 0).toString(16).padStart(6, '0').slice(-6)}`;

export function renderAppearanceOption(category, option, selectedValue) {
  const selected = option.id === selectedValue;
  const tip = escapeHtml(
    option.quip ? `${option.label} - ${option.quip}` : option.label
  );
  const attrs =
    `type="button" data-appearance-category="${escapeHtml(category)}" ` +
    `data-appearance-value="${escapeHtml(option.id)}" ` +
    `aria-pressed="${selected}" title="${tip}"`;
  const selectedClass = selected ? ' is-selected' : '';

  if (typeof option.color === 'number') {
    return `
      <button ${attrs} class="av-swatch${selectedClass}"
              aria-label="${escapeHtml(option.label)}">
        <span class="av-swatch-fill" aria-hidden="true"
              style="background-color:${cssHex(option.color)}"></span>
      </button>`;
  }

  return `
    <button ${attrs} class="av-chip${selectedClass}">
      ${escapeHtml(option.label)}
    </button>`;
}

export function renderAppearanceGroup(category, group, appearance) {
  const options = group.options.filter((option) =>
    avatarManager.isOptionAvailable(category, option.id)
  );
  if (options.length < 2) return '';

  const current = options.find((option) => option.id === appearance[category]);

  return `
    <div class="av-group">
      <div class="av-group-title">${escapeHtml(group.label.toUpperCase())}</div>
      <div class="av-options">
        ${options.map((option) =>
          renderAppearanceOption(category, option, appearance[category])
        ).join('')}
      </div>
      <div class="av-quip">${escapeHtml(current?.quip ?? '')}</div>
    </div>`;
}

export function renderAvatarPreview({ appearance, name, alias } = {}) {
  const value = normalizeAppearance(appearance);
  const aspect = avatarManager.getAspect() ?? 0.7;
  const canvasWidth = Math.round(512 * aspect);

  return `
    <div class="av-card is-developing" data-avatar-preview>
      <div class="av-card-head">STATE OF CONFUSION<br>PRIVATE INVESTIGATOR LICENCE</div>
      <div class="av-photo">
        <canvas data-avatar-canvas width="${canvasWidth}" height="512"></canvas>
        <div class="av-dev">DEVELOPING<br>FILM...</div>
        <div class="av-stamp">NOT A COP<br>(PROBABLY)</div>
      </div>
      <div class="av-name" data-avatar-name>${escapeHtml((name || 'UNNAMED DETECTIVE').toUpperCase())}</div>
      <div class="av-alias" data-avatar-alias>a.k.a. ${escapeHtml(alias || 'Unlisted')}</div>
      <div class="av-witness"><b>WITNESS DESCRIPTION</b>${escapeHtml(getWitnessLine(value))}</div>
    </div>`;
}

export function renderIdentityStep(playerData = {}) {
  const data = playerData || {};
  const appearance = normalizeAppearance(data.appearance);

  const groups = Object.entries(APPEARANCE_OPTIONS)
    .map(([category, group]) => renderAppearanceGroup(category, group, appearance))
    .join('');

  return `
    <div class="av-studio" data-avatar-studio>
      <style>${STYLES}</style>
      <div class="av-left">
        <div class="av-ident">
          <label class="av-field"><span>NAME</span>
            <input type="text" data-character-name maxlength="28" autocomplete="off" spellcheck="false"
                   placeholder="e.g. Sam Spade-Adjacent" value="${escapeHtml(data.name || '')}">
          </label>
          <label class="av-field"><span>ALIAS</span>
            <input type="text" data-character-alias maxlength="28" autocomplete="off" spellcheck="false"
                   placeholder="e.g. The Mildly Concerned" value="${escapeHtml(data.alias || '')}">
          </label>
          <button type="button" class="av-dice" data-action="randomize">SURPRISE ME</button>
        </div>
        <div class="av-groups">${groups}</div>
      </div>
      ${renderAvatarPreview({ appearance, name: data.name, alias: data.alias })}
    </div>`;
}

export function randomAppearance(random = Math.random) {
  const result = { ...DEFAULT_APPEARANCE };

  for (const category of Object.keys(APPEARANCE_OPTIONS)) {
    const available = avatarManager.availableOptions(category);
    if (!available.length) continue;

    if (OPTIONAL_CATEGORIES.has(category) && random() < 0.5) {
      const none = available.find((option) => option.id === 'none');
      if (none) {
        result[category] = none.id;
        continue;
      }
    }

    result[category] = available[Math.floor(random() * available.length)].id;
  }

  return normalizeAppearance(result);
}