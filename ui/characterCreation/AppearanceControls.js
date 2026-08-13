export const APPEARANCE_OPTIONS = {
  skinTone: {
    label: 'Skin Tone',
    options: [
      { id: 'light', label: 'Light' },
      { id: 'warm', label: 'Warm' },
      { id: 'golden', label: 'Golden' },
      { id: 'deep', label: 'Deep' },
      { id: 'rich', label: 'Rich' },
    ],
  },
  hairStyle: {
    label: 'Hair Style',
    options: [
      { id: 'neat', label: 'Neat' },
      { id: 'messy', label: 'Messy' },
      { id: 'bob', label: 'Bob' },
      { id: 'long', label: 'Long' },
      { id: 'curly', label: 'Curly' },
      { id: 'braids', label: 'Braids' },
      { id: 'pixie', label: 'Pixie' },
      { id: 'shaved', label: 'Shaved' },
      { id: 'hat', label: 'Hat' },
    ],
  },
  hairColor: {
    label: 'Hair Colour',
    options: [
      { id: 'black', label: 'Black' },
      { id: 'brown', label: 'Brown' },
      { id: 'blonde', label: 'Blonde' },
      { id: 'red', label: 'Red' },
      { id: 'grey', label: 'Grey' },
    ],
  },
  coat: {
    label: 'Coat',
    options: [
      { id: 'trench', label: 'Trench' },
      { id: 'leather', label: 'Leather' },
      { id: 'blazer', label: 'Blazer' },
      { id: 'sweater', label: 'Sweater' },
    ],
  },
  facialHair: {
    label: 'Facial Hair',
    options: [
      { id: 'none', label: 'None' },
      { id: 'moustache', label: 'Moustache' },
      { id: 'shortBeard', label: 'Short Beard' },
      { id: 'fullBeard', label: 'Full Beard' },
    ],
  },
  makeup: {
    label: 'Makeup',
    options: [
      { id: 'none', label: 'None' },
      { id: 'natural', label: 'Natural' },
      { id: 'red', label: 'Red Lip' },
      { id: 'dark', label: 'Dark Lip' },
    ],
  },
  accessory: {
    label: 'Accessory',
    options: [
      { id: 'none', label: 'None' },
      { id: 'glasses', label: 'Glasses' },
      { id: 'scarf', label: 'Scarf' },
      { id: 'notebook', label: 'Notebook' },
      { id: 'studs', label: 'Studs' },
      { id: 'hoops', label: 'Hoops' },
    ],
  },
};

export const DEFAULT_APPEARANCE = {
  skinTone: 'light',
  hairStyle: 'neat',
  hairColor: 'brown',
  coat: 'trench',
  facialHair: 'none',
  makeup: 'none',
  accessory: 'none',
};

const SUMMARY_LABELS = {
  skinTone: {
    light: 'Light skin',
    warm: 'Warm skin',
    golden: 'Golden skin',
    deep: 'Deep skin',
    rich: 'Rich skin',
  },
  hairStyle: {
    neat: 'Neat',
    messy: 'Messy',
    bob: 'Bob',
    long: 'Long',
    curly: 'Curly',
    braids: 'Braided',
    pixie: 'Pixie',
    shaved: 'Shaved',
    hat: 'Hat',
  },
  hairColor: {
    black: 'black hair',
    brown: 'brown hair',
    blonde: 'blonde hair',
    red: 'red hair',
    grey: 'grey hair',
  },
  coat: {
    trench: 'Trench coat',
    leather: 'Leather jacket',
    blazer: 'Blazer',
    sweater: 'Sweater',
  },
  facialHair: {
    none: 'No facial hair',
    moustache: 'Moustache',
    shortBeard: 'Short beard',
    fullBeard: 'Full beard',
  },
  makeup: {
    none: 'No makeup',
    natural: 'Natural makeup',
    red: 'Red lip',
    dark: 'Dark lip',
  },
  accessory: {
    none: 'No accessory',
    glasses: 'Glasses',
    scarf: 'Scarf',
    notebook: 'Notebook',
    studs: 'Stud earrings',
    hoops: 'Hoop earrings',
  },
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function normalizeAppearance(appearance = {}) {
  const normalized = { ...DEFAULT_APPEARANCE };

  Object.entries(APPEARANCE_OPTIONS).forEach(([category, group]) => {
    const candidate = appearance[category];
    const isValid = group.options.some(({ id }) => id === candidate);

    if (isValid) {
      normalized[category] = candidate;
    }
  });

  return normalized;
}

export function getAppearanceSummary(appearance = {}) {
  const value = normalizeAppearance(appearance);

  return [
    SUMMARY_LABELS.skinTone[value.skinTone],
    `${SUMMARY_LABELS.hairStyle[value.hairStyle]} ${SUMMARY_LABELS.hairColor[value.hairColor]}`,
    SUMMARY_LABELS.coat[value.coat],
    SUMMARY_LABELS.facialHair[value.facialHair],
    SUMMARY_LABELS.makeup[value.makeup],
    SUMMARY_LABELS.accessory[value.accessory],
  ].join(' · ');
}

export function renderAppearanceOption(category, option, selectedValue) {
  const selected = option.id === selectedValue;

  return `
    <button
      class="appearance-option${selected ? ' is-selected' : ''}"
      type="button"
      role="radio"
      aria-checked="${selected}"
      data-appearance-category="${category}"
      data-appearance-value="${option.id}"
    >
      ${option.label}
    </button>
  `;
}

export function renderAppearanceGroup(category, group, appearance) {
  return `
    <fieldset
      class="appearance-option-group"
      role="radiogroup"
      aria-label="${group.label}"
    >
      <legend>${group.label}</legend>

      <div class="appearance-option-list">
        ${group.options.map((option) => (
          renderAppearanceOption(category, option, appearance[category])
        )).join('')}
      </div>
    </fieldset>
  `;
}

export function renderAvatarPreview({ appearance, name, alias }) {
  const value = normalizeAppearance(appearance);
  const safeName = escapeHtml(name || 'UNNAMED APPLICANT');
  const safeAlias = escapeHtml(alias || 'UNLISTED');

  return `
    <aside class="agency-id-card">
      <div class="agency-id-card-header">
        <span>Mark Agency</span>
        <span>Field Operative</span>
      </div>

      <div
        class="agency-id-avatar"
        data-avatar-preview
        data-skin-tone="${value.skinTone}"
        data-hair-style="${value.hairStyle}"
        data-hair-color="${value.hairColor}"
        data-coat="${value.coat}"
        data-facial-hair="${value.facialHair}"
        data-makeup="${value.makeup}"
        data-accessory="${value.accessory}"
        role="img"
        aria-label="Detective portrait preview"
      >
        <div class="avatar-coat"></div>
        <div class="avatar-neck"></div>
        <div class="avatar-face"></div>
        <div class="avatar-ear avatar-ear--left"></div>
        <div class="avatar-ear avatar-ear--right"></div>
        <div class="avatar-hair"></div>
        <div class="avatar-eyes"></div>
        <div class="avatar-nose"></div>
        <div class="avatar-mouth"></div>
        <div class="avatar-facial-hair"></div>
        <div class="avatar-makeup"></div>
        <div class="avatar-accessory"></div>
      </div>

      <div class="agency-id-name" data-avatar-name>
        ${safeName}
      </div>

      <div class="agency-id-alias" data-avatar-alias>
        ALIAS: ${safeAlias}
      </div>

      <div class="agency-id-status">
        STATUS: QUESTIONABLE
      </div>
    </aside>
  `;
}

export function renderIdentityStep(playerData) {
  const appearance = normalizeAppearance(playerData.appearance);
  const safeName = escapeHtml(playerData.name || '');
  const safeAlias = escapeHtml(playerData.alias || '');

  return `
    <section
      class="character-step-panel is-active"
      data-step-panel="0"
    >
      <h2 class="character-section-title">IDENTIFY YOURSELF</h2>

      <p class="character-section-intro">
        For administrative purposes, legal ambiguity, and an ID badge
        nobody will respect.
      </p>

      <div class="character-identity-layout">
        <div class="character-identity-fields">
          <div class="character-field">
            <label for="character-name">Name</label>
            <input
              id="character-name"
              name="name"
              type="text"
              maxlength="28"
              autocomplete="nickname"
              placeholder="e.g. Alex Mercer"
              value="${safeName}"
              data-character-name
            >
          </div>

          <div class="character-field">
            <label for="character-alias">Alias</label>
            <input
              id="character-alias"
              name="alias"
              type="text"
              maxlength="28"
              autocomplete="off"
              placeholder="e.g. The Last Honest Invoice"
              value="${safeAlias}"
              data-character-alias
            >
          </div>

          <button
            class="character-button character-button--randomize"
            type="button"
            data-action="randomize"
          >
            Randomize My Poor Life Choices
          </button>

          <section class="character-appearance-section">
            <h3 class="character-appearance-title">
              APPEAR PROFESSIONALLY SUSPICIOUS
            </h3>

            <p class="character-appearance-intro">
              Management requires a recognisable face.
              Management has not explained why.
            </p>

            <div class="character-appearance-controls">
              ${Object.entries(APPEARANCE_OPTIONS).map(([category, group]) => (
                renderAppearanceGroup(category, group, appearance)
              )).join('')}
            </div>
          </section>
        </div>

        ${renderAvatarPreview({
          appearance,
          name: playerData.name,
          alias: playerData.alias,
        })}
      </div>
    </section>
  `;
}