export const APPEARANCE_OPTIONS = {
  "skinTone": {
    "label": "Skin Tone",
    "options": [
      {
        "id": "light",
        "label": "Light"
      },
      {
        "id": "warm",
        "label": "Warm"
      },
      {
        "id": "golden",
        "label": "Golden"
      },
      {
        "id": "deep",
        "label": "Deep"
      },
      {
        "id": "rich",
        "label": "Rich"
      }
    ]
  },
  "hairStyle": {
    "label": "Hair Style",
    "options": [
      {
        "id": "neat",
        "label": "Neat"
      },
      {
        "id": "messy",
        "label": "Messy"
      },
      {
        "id": "bob",
        "label": "Bob"
      },
      {
        "id": "long",
        "label": "Long"
      },
      {
        "id": "curly",
        "label": "Curly"
      },
      {
        "id": "braids",
        "label": "Braids"
      },
      {
        "id": "pixie",
        "label": "Pixie"
      },
      {
        "id": "shaved",
        "label": "Shaved"
      },
      {
        "id": "hat",
        "label": "Hat"
      }
    ]
  },
  "hairColor": {
    "label": "Hair Colour",
    "options": [
      {
        "id": "black",
        "label": "Black"
      },
      {
        "id": "brown",
        "label": "Brown"
      },
      {
        "id": "blonde",
        "label": "Blonde"
      },
      {
        "id": "red",
        "label": "Red"
      },
      {
        "id": "grey",
        "label": "Grey"
      }
    ]
  },
  "coat": {
    "label": "Coat",
    "options": [
      {
        "id": "trench",
        "label": "Trench"
      },
      {
        "id": "leather",
        "label": "Leather"
      },
      {
        "id": "blazer",
        "label": "Blazer"
      },
      {
        "id": "sweater",
        "label": "Sweater"
      }
    ]
  },
  "facialHair": {
    "label": "Facial Hair",
    "options": [
      {
        "id": "none",
        "label": "None"
      },
      {
        "id": "moustache",
        "label": "Moustache"
      },
      {
        "id": "shortBeard",
        "label": "Short Beard"
      },
      {
        "id": "fullBeard",
        "label": "Full Beard"
      }
    ]
  },
  "makeup": {
    "label": "Makeup",
    "options": [
      {
        "id": "none",
        "label": "None"
      },
      {
        "id": "natural",
        "label": "Natural"
      },
      {
        "id": "red",
        "label": "Red Lip"
      },
      {
        "id": "dark",
        "label": "Dark Lip"
      },
      {
        "id": "glitter",
        "label": "Glitter"
      }
    ]
  },
  "accessory": {
    "label": "Accessory",
    "options": [
      {
        "id": "none",
        "label": "None"
      },
      {
        "id": "glasses",
        "label": "Glasses"
      },
      {
        "id": "scarf",
        "label": "Scarf"
      },
      {
        "id": "notebook",
        "label": "Notebook"
      },
      {
        "id": "studs",
        "label": "Studs"
      },
      {
        "id": "hoops",
        "label": "Hoops"
      },
      {
        "id": "earring",
        "label": "Earring"
      }
    ]
  },
  "tattoos": {
    "label": "Tattoos",
    "options": [
      {
        "id": "none",
        "label": "None"
      },
      {
        "id": "dragon",
        "label": "Dragon"
      },
      {
        "id": "skull",
        "label": "Skull"
      },
      {
        "id": "rose",
        "label": "Rose"
      }
    ]
  }
};

export const DEFAULT_APPEARANCE = {
  "skinTone": "light",
  "hairStyle": "neat",
  "hairColor": "brown",
  "coat": "trench",
  "facialHair": "none",
  "makeup": "none",
  "accessory": "none",
  "tattoos": "none"
};

const SUMMARY_LABELS = {
  "skinTone": {
    "light": "Light skin",
    "warm": "Warm skin",
    "golden": "Golden skin",
    "deep": "Deep skin",
    "rich": "Rich skin"
  },
  "hairStyle": {
    "neat": "Neat",
    "messy": "Messy",
    "bob": "Bob",
    "long": "Long",
    "curly": "Curly",
    "braids": "Braided",
    "pixie": "Pixie",
    "shaved": "Shaved",
    "hat": "Hat"
  },
  "hairColor": {
    "black": "black hair",
    "brown": "brown hair",
    "blonde": "blonde hair",
    "red": "red hair",
    "grey": "grey hair"
  },
  "coat": {
    "trench": "Trench coat",
    "leather": "Leather jacket",
    "blazer": "Blazer",
    "sweater": "Sweater"
  },
  "facialHair": {
    "none": "No facial hair",
    "moustache": "Moustache",
    "shortBeard": "Short beard",
    "fullBeard": "Full beard"
  },
  "makeup": {
    "none": "No makeup",
    "natural": "Natural makeup",
    "red": "Red lip",
    "dark": "Dark lip",
    "glitter": "Glitter"
  },
  "accessory": {
    "none": "No accessory",
    "glasses": "Glasses",
    "scarf": "Scarf",
    "notebook": "Notebook",
    "studs": "Stud earrings",
    "hoops": "Hoop earrings",
    "earring": "Earring"
  },
  "tattoos": {
    "none": "No tattoos",
    "dragon": "Dragon tattoo",
    "skull": "Skull tattoo",
    "rose": "Rose tattoo"
  }
};

const PREVIEW_DETAIL_STYLES = `
.agency-id-avatar .avatar-makeup,
.agency-id-avatar .avatar-tattoos {
  position:absolute; inset:0; pointer-events:none;
}
.agency-id-avatar .avatar-makeup {z-index:7}
.agency-id-avatar .avatar-tattoos {z-index:7}
.agency-id-avatar[data-makeup="glitter"] .avatar-makeup::before,
.agency-id-avatar[data-makeup="glitter"] .avatar-makeup::after {
  content:""; position:absolute; top:143px; width:30px; height:24px;
  background:
    radial-gradient(circle at 15% 28%,#fff6be 0 1.7px,transparent 2px),
    radial-gradient(circle at 43% 12%,#f6a4e7 0 1.6px,transparent 2px),
    radial-gradient(circle at 72% 26%,#c6b5ff 0 1.8px,transparent 2.2px),
    radial-gradient(circle at 28% 62%,#cceaff 0 1.5px,transparent 2px),
    radial-gradient(circle at 60% 78%,#fff2a9 0 1.7px,transparent 2px),
    radial-gradient(circle at 88% 55%,#fba7dc 0 1.6px,transparent 2px);
  filter:drop-shadow(0 0 1px #e8c7ff);
}
.agency-id-avatar[data-makeup="glitter"] .avatar-makeup::before {left:calc(50% - 50px)}
.agency-id-avatar[data-makeup="glitter"] .avatar-makeup::after {left:calc(50% + 20px);transform:scaleX(-1)}
.agency-id-avatar[data-makeup="glitter"] .avatar-mouth {border-top-color:#b55d83}
.agency-id-avatar[data-accessory="studs"] .avatar-accessory,
.agency-id-avatar[data-accessory="hoops"] .avatar-accessory,
.agency-id-avatar[data-accessory="earring"] .avatar-accessory,
.agency-id-avatar[data-accessory="notebook"] .avatar-accessory {z-index:8}
.agency-id-avatar[data-accessory="earring"] .avatar-accessory::before {
  content:"";position:absolute;top:177px;left:calc(50% - 83px);
  width:14px;height:24px;border:3px solid #f2c46b;border-radius:50%;
  box-shadow:0 1px 0 #513828;
}
.agency-id-avatar[data-accessory="earring"] .avatar-accessory::after {content:none}
.agency-id-avatar .avatar-tattoos::before {
  position:absolute;top:174px;left:calc(50% + 23px);
  width:29px;height:34px;background-repeat:no-repeat;
  background-position:center;background-size:contain;opacity:.9;
}
.agency-id-avatar[data-tattoos="dragon"] .avatar-tattoos::before {content:"";background-image:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2034%2036%22%3E%3Cg%20fill%3D%22%23263b3b%22%20stroke%3D%22%23263b3b%22%20stroke-width%3D%221%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M22%205%2015%208l3%204-7%203%204%204-7%206%203%206%208-2%204-6-7-3%205-5-2-4%206-2z%22%2F%3E%3Cpath%20d%3D%22m15%208-5-3%201%207M8%2025l-4%202%204%206M19%2029l6%204%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E")}
.agency-id-avatar[data-tattoos="skull"] .avatar-tattoos::before {content:"";background-image:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2034%2036%22%3E%3Cg%20fill%3D%22%23263b3b%22%20stroke%3D%22%23263b3b%22%20stroke-width%3D%221%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M8%2018C2%206%2010%202%2017%203c11%201%2012%2012%206%2016l-1%209H10l-1-9z%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2214%22%20r%3D%223%22%20fill%3D%22%23e5b68d%22%2F%3E%3Ccircle%20cx%3D%2221%22%20cy%3D%2214%22%20r%3D%223%22%20fill%3D%22%23e5b68d%22%2F%3E%3Cpath%20d%3D%22m16%2018-2%204h4z%22%20fill%3D%22%23e5b68d%22%2F%3E%3Cpath%20d%3D%22M12%2025v4m5-4v4m4-4v4%22%20stroke%3D%22%23e5b68d%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E")}
.agency-id-avatar[data-tattoos="rose"] .avatar-tattoos::before {content:"";background-image:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2034%2036%22%3E%3Cg%20fill%3D%22%23263b3b%22%20stroke%3D%22%23263b3b%22%20stroke-width%3D%221%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M17%2020v12m0-6-8-5m8%209%209-6%22%20fill%3D%22none%22%20stroke%3D%22%2329433b%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22m16%2021-8-2%202-8%207-6%209%205%201%209-7%205z%22%20fill%3D%22%23793443%22%2F%3E%3Cpath%20d%3D%22m17%208-5%206%206%205%206-6-7-2-2%205%22%20fill%3D%22none%22%20stroke%3D%22%23d18a83%22%20stroke-width%3D%221.5%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E")}
`;

function escapeHtml(value = '') {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

export function normalizeAppearance(appearance = {}) {
  const source = appearance && typeof appearance === 'object' ? appearance : {};
  const normalized = {...DEFAULT_APPEARANCE};
  for (const [category,group] of Object.entries(APPEARANCE_OPTIONS)) {
    if (group.options.some(option => option.id === source[category])) {
      normalized[category] = source[category];
    }
  }
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
    SUMMARY_LABELS.tattoos[value.tattoos]
  ].join(' · ');
}

export function renderAppearanceOption(category,option,selectedValue) {
  const selected = option.id === selectedValue;
  return `<button class="appearance-option${selected ? ' is-selected' : ''}"
    type="button" role="radio" aria-checked="${selected}"
    data-appearance-category="${escapeHtml(category)}"
    data-appearance-value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</button>`;
}

export function renderAppearanceGroup(category,group,appearance) {
  return `<fieldset class="appearance-option-group" role="radiogroup"
    aria-label="${escapeHtml(group.label)}">
    <legend>${escapeHtml(group.label)}</legend>
    <div class="appearance-option-list">${group.options.map(option =>
      renderAppearanceOption(category,option,appearance[category])).join('')}</div>
  </fieldset>`;
}

export function renderAvatarPreview({appearance,name,alias} = {}) {
  const value = normalizeAppearance(appearance);
  return `
    <style data-avatar-detail-styles>${PREVIEW_DETAIL_STYLES}</style>
    <aside class="agency-id-card">
      <div class="agency-id-card-header"><span>Mark Agency</span><span>Field Operative</span></div>
      <div class="agency-id-avatar" data-avatar-preview
        data-skin-tone="${value.skinTone}" data-hair-style="${value.hairStyle}"
        data-hair-color="${value.hairColor}" data-coat="${value.coat}"
        data-facial-hair="${value.facialHair}" data-makeup="${value.makeup}"
        data-accessory="${value.accessory}" data-tattoos="${value.tattoos}"
        role="img" aria-label="Detective portrait preview">
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
        <div class="avatar-tattoos"></div>
        <div class="avatar-accessory"></div>
      </div>
      <div class="agency-id-name" data-avatar-name>${escapeHtml(name || 'UNNAMED APPLICANT')}</div>
      <div class="agency-id-alias" data-avatar-alias>ALIAS: ${escapeHtml(alias || 'UNLISTED')}</div>
      <div class="agency-id-status">STATUS: QUESTIONABLE</div>
    </aside>`;
}

export function renderIdentityStep(playerData = {}) {
  const data = playerData || {};
  const appearance = normalizeAppearance(data.appearance);
  return `
    <section class="character-step-panel is-active" data-step-panel="0">
      <h2 class="character-section-title">IDENTIFY YOURSELF</h2>
      <p class="character-section-intro">
        For administrative purposes, legal ambiguity, and an ID badge nobody will respect.
      </p>
      <div class="character-identity-layout">
        <div class="character-identity-fields">
          <div class="character-field">
            <label for="character-name">Name</label>
            <input id="character-name" name="name" type="text" maxlength="28"
              autocomplete="nickname" placeholder="e.g. Alex Mercer"
              value="${escapeHtml(data.name || '')}" data-character-name>
          </div>
          <div class="character-field">
            <label for="character-alias">Alias</label>
            <input id="character-alias" name="alias" type="text" maxlength="28"
              autocomplete="off" placeholder="e.g. The Last Honest Invoice"
              value="${escapeHtml(data.alias || '')}" data-character-alias>
          </div>
          <button class="character-button character-button--randomize" type="button" data-action="randomize">
            Randomize My Poor Life Choices
          </button>
          <section class="character-appearance-section">
            <h3 class="character-appearance-title">APPEAR PROFESSIONALLY SUSPICIOUS</h3>
            <p class="character-appearance-intro">
              Management requires a recognisable face. Management has not explained why.
            </p>
            <div class="character-appearance-controls">
              ${Object.entries(APPEARANCE_OPTIONS).map(([category,group]) =>
                renderAppearanceGroup(category,group,appearance)).join('')}
            </div>
          </section>
        </div>
        ${renderAvatarPreview({appearance,name:data.name,alias:data.alias})}
      </div>
    </section>`;
}