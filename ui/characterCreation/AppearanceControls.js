import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";

const SOURCE = "ui/characterCreation/AppearanceControls.js";

function text(id) {
  return __dialogueText(SOURCE, id);
}

function option(id, label) {
  return { id, label };
}

export const APPEARANCE_OPTIONS = {
  skinTone: {
    label: text("t_54d975a5391daaf26c58"),
    options: [
      option("light", text("t_dbcd5e7bb7a0f538810d")),
      option("warm", text("t_316f24288be59c8327d0")),
      option("golden", text("t_30152252234e6da483c8")),
      option("deep", text("t_c54e3625467b4fdecbd7")),
      option("rich", text("t_dca900394dddb28e9369"))
    ]
  },

  hairStyle: {
    label: text("t_72995a619735750cf9e3"),
    options: [
      option("neat", text("t_4fdc1c84d9761eb1713d")),
      option("messy", text("t_5f501b6712777e15bbef")),
      option("bob", text("t_cd9fb1e148ccd8442e5a")),
      option("long", text("t_d1d87c4717d527df5912")),
      option("curly", text("t_71142c83f11418fec058")),
      option("braids", text("t_4777050dfb7dcae1a27e")),
      option("pixie", text("t_e8b883b1eadaa5344683")),
      option("shaved", text("t_988e8d7826699e62e061")),
      option("hat", text("t_dc34efd49ed738bf4500")),

      option("highPonytail", "High Ponytail"),
      option("lowBun", "Low Bun"),
      option("sideBraid", "Side Braid"),
      option("longWaves", "Long Waves"),
      option("bobBangs", "Bob with Bangs")
    ]
  },

  hairColor: {
    label: text("t_8b42c9f862e90cffa479"),
    options: [
      option("black", text("t_c6cfe6e4f129a34671d1")),
      option("brown", text("t_18f285592896ec8ead1b")),
      option("blonde", text("t_4495c74f098e4160a11a")),
      option("red", text("t_ba19e9c3d5f49882ddaa")),
      option("grey", text("t_d4ac58091b024645805d"))
    ]
  },

  coat: {
    label: "Clothing",
    options: [
      option("trench", text("t_e1d2439aa6241a93abfe")),
      option("leather", text("t_e8e775159a57aaaf0f55")),
      option("blazer", text("t_766e11b9770ba38ea5dc")),
      option("sweater", text("t_89e32192c4b2e707574a")),

      option("bowBlouse", "Bow Blouse"),
      option("vNeckBlouse", "V-Neck Blouse"),
      option("cardigan", "Cardigan"),
      option("fittedBlazer", "Fitted Blazer"),
      option("dress", "Dress")
    ]
  },

  facialHair: {
    label: text("t_2cf1d88320c0365cb7ea"),
    options: [
      option("none", text("t_dc937b59892604f5a86a")),
      option("moustache", text("t_138fa83d28e7fe1f2dec")),
      option("shortBeard", text("t_5699bc03af1d4f859b6f")),
      option("fullBeard", text("t_199b6188b54e0e67692c"))
    ]
  },

  makeup: {
    label: text("t_69689d91e1e99a29da26"),
    options: [
      option("none", text("t_dc937b59892604f5a86a")),
      option("natural", text("t_d6acb6d51cfc574936fc")),
      option("red", text("t_1f8203a7ee09c02dcf89")),
      option("dark", text("t_5190f1e8814ce878bad0")),
      option("glitter", text("t_3a9bd0161d828548fe7d"))
    ]
  },

  blush: {
    label: "Blush",
    options: [
      option("none", "None"),
      option("softRose", "Soft Rose"),
      option("peach", "Peach"),
      option("berry", "Berry")
    ]
  },

  accessory: {
    label: text("t_adf7651801aea4615532"),
    options: [
      option("none", text("t_dc937b59892604f5a86a")),
      option("glasses", text("t_eb25ede23e75985188ce")),
      option("scarf", text("t_5c22a749ac7d738d70cd")),
      option("notebook", text("t_0dec07abf92dbe7289d6")),
      option("studs", text("t_ba39f905e42025f15790")),
      option("hoops", text("t_88844c4a9225c3682473")),
      option("earring", text("t_7f86981a572461d80534")),

      option("pearlNecklace", "Pearl Necklace"),
      option("pendant", "Pendant"),
      option("dropEarrings", "Drop Earrings")
    ]
  },

  tattoos: {
    label: text("t_104975033d074c49d179"),
    options: [
      option("none", text("t_dc937b59892604f5a86a")),
      option("dragon", text("t_bbe963c645f060d61857")),
      option("skull", text("t_2fb09efc5c442995a3eb")),
      option("rose", text("t_e10d850954a8e6113899"))
    ]
  }
};

export const DEFAULT_APPEARANCE = {
  skinTone: "light",
  hairStyle: "neat",
  hairColor: "brown",
  coat: "trench",
  facialHair: "none",
  makeup: "none",
  blush: "none",
  accessory: "none",
  tattoos: "none"
};

const SUMMARY_LABELS = {
  skinTone: {
    light: text("t_31b496fbd052454229cf"),
    warm: text("t_d70c68c1f41d177028a5"),
    golden: text("t_baa317cb679fe72a136a"),
    deep: text("t_842ab90289720d07e02d"),
    rich: text("t_cf143aaff2331d5722df")
  },

  hairStyle: {
    braids: text("t_afa47803fc09ed6b0b58")
  },

  hairColor: {
    black: text("t_78dabe4e580cd8a82234"),
    brown: text("t_e4d19a9ffc9163b5b604"),
    blonde: text("t_fcbe59ba218af790c791"),
    red: text("t_6359320b0024a00aed4b"),
    grey: text("t_6bee9dbda49c7c0b8e02")
  },

  coat: {
    trench: text("t_d83d39a249742b7df980"),
    leather: text("t_fa183538bef33094373f")
  },

  facialHair: {
    none: "No facial hair",
    shortBeard: text("t_5e40b799daced9dca470"),
    fullBeard: text("t_c0e83dcdf007717bba38")
  },

  makeup: {
    none: "No makeup",
    natural: text("t_72fdbe2b656a52ccdf9a"),
    red: text("t_5171f19a317e5546c6fe"),
    dark: text("t_eef9762589da8066898e")
  },

  blush: {
    none: "No blush",
    softRose: "Soft rose blush",
    peach: "Peach blush",
    berry: "Berry blush"
  },

  accessory: {
    none: "No accessory",
    studs: text("t_cb9100659ea2c48acc17"),
    hoops: text("t_8d4a51d06039b1a3422d")
  },

  tattoos: {
    none: "No tattoos",
    dragon: text("t_af09133a550d9cac9f63"),
    skull: text("t_4c9692675a4fd5910c70"),
    rose: text("t_50e2cd7abd7279e5efdf")
  }
};

const PREVIEW_DETAIL_STYLES = text("t_e066a49962df4c782c79");

const EXTRA_PREVIEW_STYLES = `
<style>
/* Independent cheek colour, without replacing existing makeup. */

.agency-id-avatar[data-blush="softRose"] {
  --avatar-blush: rgba(208, 92, 119, 0.58);
}

.agency-id-avatar[data-blush="peach"] {
  --avatar-blush: rgba(242, 143, 100, 0.62);
}

.agency-id-avatar[data-blush="berry"] {
  --avatar-blush: rgba(175, 53, 103, 0.68);
}

.agency-id-avatar:is(
  [data-blush="softRose"],
  [data-blush="peach"],
  [data-blush="berry"]
) .avatar-face {
  background-image:
    radial-gradient(
      ellipse 20px 12px at 20% 61%,
      var(--avatar-blush) 0%,
      transparent 100%
    ),
    radial-gradient(
      ellipse 20px 12px at 80% 61%,
      var(--avatar-blush) 0%,
      transparent 100%
    );
  background-color: var(--skin);
}

/* New hairstyles. */

.agency-id-avatar:is(
  [data-hair-style="highPonytail"],
  [data-hair-style="lowBun"],
  [data-hair-style="sideBraid"],
  [data-hair-style="longWaves"],
  [data-hair-style="bobBangs"]
) .avatar-hair {
  background: var(--hair);
  box-shadow: none;
  clip-path: none;
}

.agency-id-avatar:is(
  [data-hair-style="highPonytail"],
  [data-hair-style="lowBun"],
  [data-hair-style="sideBraid"],
  [data-hair-style="longWaves"],
  [data-hair-style="bobBangs"]
) .avatar-hair::before,
.agency-id-avatar:is(
  [data-hair-style="highPonytail"],
  [data-hair-style="lowBun"],
  [data-hair-style="sideBraid"],
  [data-hair-style="longWaves"],
  [data-hair-style="bobBangs"]
) .avatar-hair::after {
  position: absolute;
  display: block;
  background: var(--hair);
  content: "";
  pointer-events: none;
}

.agency-id-avatar[data-hair-style="highPonytail"] .avatar-hair {
  top: 48px;
  width: 138px;
  height: 75px;
  border-radius: 62% 52% 28% 22%;
}

.agency-id-avatar[data-hair-style="highPonytail"] .avatar-hair::before {
  top: -17px;
  right: -35px;
  width: 58px;
  height: 170px;
  border-radius: 62% 72% 48% 70%;
  transform: rotate(-12deg);
  box-shadow: inset -8px 0 rgba(0, 0, 0, 0.13);
}

.agency-id-avatar[data-hair-style="highPonytail"] .avatar-hair::after {
  top: -1px;
  right: -7px;
  width: 28px;
  height: 13px;
  border-radius: 5px;
  background: #9a354a;
  transform: rotate(20deg);
}

.agency-id-avatar[data-hair-style="lowBun"] .avatar-hair {
  top: 53px;
  width: 140px;
  height: 70px;
  border-radius: 65% 58% 20% 28%;
}

.agency-id-avatar[data-hair-style="lowBun"] .avatar-hair::before {
  top: 76px;
  right: -25px;
  width: 47px;
  height: 55px;
  border: 5px solid rgba(0, 0, 0, 0.13);
  border-radius: 50%;
  box-sizing: border-box;
}

.agency-id-avatar[data-hair-style="lowBun"] .avatar-hair::after {
  top: 22px;
  left: 5px;
  width: 55px;
  height: 59px;
  border-radius: 80% 0 80% 20%;
  transform: rotate(19deg);
}

.agency-id-avatar[data-hair-style="sideBraid"] .avatar-hair {
  top: 47px;
  width: 143px;
  height: 78px;
  border-radius: 60% 58% 30% 25%;
}

.agency-id-avatar[data-hair-style="sideBraid"] .avatar-hair::before {
  top: 61px;
  right: -6px;
  width: 31px;
  height: 151px;
  border-radius: 48% 48% 42% 42%;
  background:
    repeating-linear-gradient(
      145deg,
      transparent 0 9px,
      rgba(0, 0, 0, 0.24) 9px 12px,
      transparent 12px 20px
    ),
    var(--hair);
  transform: rotate(-7deg);
  box-shadow: inset -5px 0 rgba(0, 0, 0, 0.14);
}

.agency-id-avatar[data-hair-style="sideBraid"] .avatar-hair::after {
  top: 198px;
  right: -9px;
  width: 27px;
  height: 9px;
  border-radius: 3px;
  background: #9a354a;
}

.agency-id-avatar[data-hair-style="longWaves"] .avatar-hair {
  top: 39px;
  width: 162px;
  height: 91px;
  border-radius: 55% 55% 30% 30%;
}

.agency-id-avatar[data-hair-style="longWaves"] .avatar-hair::before,
.agency-id-avatar[data-hair-style="longWaves"] .avatar-hair::after {
  top: 45px;
  width: 35px;
  height: 171px;
  border-radius: 48% 48% 42% 42%;
  box-shadow:
    inset -7px 0 rgba(0, 0, 0, 0.15),
    0 29px 0 -4px var(--hair);
}

.agency-id-avatar[data-hair-style="longWaves"] .avatar-hair::before {
  left: -5px;
  transform: rotate(5deg);
}

.agency-id-avatar[data-hair-style="longWaves"] .avatar-hair::after {
  right: -5px;
  transform: rotate(-5deg);
}

.agency-id-avatar[data-hair-style="bobBangs"] .avatar-hair {
  top: 47px;
  width: 164px;
  height: 169px;
  border-radius: 49% 49% 21% 21%;
  clip-path: polygon(
    0 0,
    100% 0,
    100% 100%,
    80% 100%,
    79% 41%,
    67% 44%,
    54% 41%,
    42% 44%,
    30% 41%,
    21% 43%,
    20% 100%,
    0 100%
  );
}

/* Clothing. */

.agency-id-avatar[data-coat="bowBlouse"] {
  --coat: #e3c9ad;
}

.agency-id-avatar[data-coat="vNeckBlouse"] {
  --coat: #6d3d60;
}

.agency-id-avatar[data-coat="cardigan"] {
  --coat: #638172;
}

.agency-id-avatar[data-coat="fittedBlazer"] {
  --coat: #723e4d;
}

.agency-id-avatar[data-coat="dress"] {
  --coat: #253c54;
}

.agency-id-avatar:is(
  [data-coat="bowBlouse"],
  [data-coat="vNeckBlouse"],
  [data-coat="cardigan"],
  [data-coat="fittedBlazer"],
  [data-coat="dress"]
) .avatar-coat {
  width: 214px;
  height: 153px;
  border-radius: 47% 47% 0 0;
}

.agency-id-avatar:is(
  [data-coat="bowBlouse"],
  [data-coat="vNeckBlouse"],
  [data-coat="cardigan"],
  [data-coat="fittedBlazer"],
  [data-coat="dress"]
) .avatar-coat::before,
.agency-id-avatar:is(
  [data-coat="bowBlouse"],
  [data-coat="vNeckBlouse"],
  [data-coat="cardigan"],
  [data-coat="fittedBlazer"],
  [data-coat="dress"]
) .avatar-coat::after {
  position: absolute;
  left: 50%;
  display: block;
  margin: 0;
  border: 0;
  box-sizing: border-box;
  content: "";
  transform: translateX(-50%);
  pointer-events: none;
}

.agency-id-avatar[data-coat="bowBlouse"] .avatar-coat::before {
  top: 30px;
  width: 65px;
  height: 52px;
  background: #8c4053;
  clip-path: polygon(
    0 7%,
    43% 28%,
    50% 20%,
    57% 28%,
    100% 7%,
    94% 62%,
    60% 47%,
    76% 100%,
    51% 80%,
    26% 100%,
    40% 47%,
    6% 62%
  );
}

.agency-id-avatar[data-coat="bowBlouse"] .avatar-coat::after {
  top: 87px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #9b7963;
  box-shadow:
    0 19px 0 #9b7963,
    0 38px 0 #9b7963;
}

.agency-id-avatar[data-coat="vNeckBlouse"] .avatar-coat::before {
  top: 16px;
  width: 70px;
  height: 67px;
  background: var(--skin);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}

.agency-id-avatar[data-coat="vNeckBlouse"] .avatar-coat::after {
  top: 24px;
  width: 91px;
  height: 70px;
  background: rgba(255, 235, 225, 0.2);
  clip-path: polygon(
    0 0,
    9% 0,
    50% 86%,
    91% 0,
    100% 0,
    50% 100%
  );
}

.agency-id-avatar[data-coat="cardigan"] .avatar-coat::before {
  top: 20px;
  width: 75px;
  height: 135px;
  background: #e7d5b7;
  clip-path: polygon(
    0 0,
    100% 0,
    78% 49%,
    78% 100%,
    22% 100%,
    22% 49%
  );
}

.agency-id-avatar[data-coat="cardigan"] .avatar-coat::after {
  top: 87px;
  left: calc(50% + 35px);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d6b778;
  box-shadow:
    0 21px 0 #d6b778,
    0 42px 0 #d6b778;
}

.agency-id-avatar[data-coat="fittedBlazer"] .avatar-coat::before {
  top: 16px;
  width: 85px;
  height: 135px;
  background: #e7d6c4;
  clip-path: polygon(13% 0, 87% 0, 56% 100%, 44% 100%);
}

.agency-id-avatar[data-coat="fittedBlazer"] .avatar-coat::after {
  top: 22px;
  width: 117px;
  height: 100px;
  background: #512a38;
  clip-path: polygon(
    0 0,
    27% 0,
    50% 70%,
    73% 0,
    100% 0,
    83% 42%,
    68% 40%,
    50% 100%,
    32% 40%,
    17% 42%
  );
}

.agency-id-avatar[data-coat="dress"] .avatar-coat::before {
  top: 9px;
  width: 100px;
  height: 61px;
  border-radius: 0 0 48% 48%;
  background: var(--skin);
}

.agency-id-avatar[data-coat="dress"] .avatar-coat::after {
  top: 49px;
  width: 109px;
  height: 29px;
  border-bottom: 4px solid #c8a76d;
  border-radius: 0 0 50% 50%;
  background: transparent;
}

/* New accessories: above face and clothing, below scan lines. */

.agency-id-avatar:is(
  [data-accessory="pearlNecklace"],
  [data-accessory="pendant"],
  [data-accessory="dropEarrings"]
) .avatar-accessory {
  position: absolute;
  z-index: 8;
  inset: 0;
  width: auto;
  height: auto;
  border: 0;
  background: transparent;
  transform: none;
  pointer-events: none;
}

.agency-id-avatar:is(
  [data-accessory="pearlNecklace"],
  [data-accessory="pendant"],
  [data-accessory="dropEarrings"]
) .avatar-accessory::before,
.agency-id-avatar:is(
  [data-accessory="pearlNecklace"],
  [data-accessory="pendant"],
  [data-accessory="dropEarrings"]
) .avatar-accessory::after {
  position: absolute;
  display: block;
  box-sizing: border-box;
  content: "";
}

.agency-id-avatar[data-accessory="pearlNecklace"] .avatar-accessory::before {
  top: 223px;
  left: 50%;
  width: 86px;
  height: 40px;
  border: 7px dotted #f4e9ce;
  border-top: 0;
  border-radius: 0 0 50% 50%;
  background: transparent;
  transform: translateX(-50%);
  filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.35));
}

.agency-id-avatar[data-accessory="pearlNecklace"] .avatar-accessory::after {
  display: none;
}

.agency-id-avatar[data-accessory="pendant"] .avatar-accessory::before {
  top: 220px;
  left: 50%;
  width: 71px;
  height: 49px;
  border: 2px solid #d7b35f;
  border-top: 0;
  border-radius: 0 0 50% 50%;
  background: transparent;
  transform: translateX(-50%);
}

.agency-id-avatar[data-accessory="pendant"] .avatar-accessory::after {
  top: 260px;
  left: 50%;
  width: 14px;
  height: 20px;
  border: 3px solid #d7b35f;
  border-radius: 45% 45% 55% 55%;
  background: #318c83;
  transform: translateX(-50%);
  box-shadow: inset 3px 0 rgba(255, 255, 255, 0.2);
}

.agency-id-avatar[data-accessory="dropEarrings"] .avatar-accessory::before,
.agency-id-avatar[data-accessory="dropEarrings"] .avatar-accessory::after {
  top: 176px;
  width: 13px;
  height: 34px;
  border: 3px solid #d9b867;
  border-radius: 45% 45% 58% 58%;
  background:
    linear-gradient(
      to bottom,
      transparent 0 43%,
      #327f82 43% 100%
    );
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.25);
}

.agency-id-avatar[data-accessory="dropEarrings"] .avatar-accessory::before {
  left: calc(50% - 80px);
}

.agency-id-avatar[data-accessory="dropEarrings"] .avatar-accessory::after {
  right: calc(50% - 80px);
}
</style>
`;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeAppearance(appearance = {}) {
  const source =
    appearance && typeof appearance === "object"
      ? appearance
      : {};

  const normalized = { ...DEFAULT_APPEARANCE };

  for (const [category, group] of Object.entries(APPEARANCE_OPTIONS)) {
    if (group.options.some(entry => entry.id === source[category])) {
      normalized[category] = source[category];
    }
  }

  return normalized;
}

function getSummaryLabel(category, value) {
  const customLabel = SUMMARY_LABELS[category]?.[value];

  if (customLabel !== undefined) {
    return customLabel;
  }

  return APPEARANCE_OPTIONS[category]?.options.find(
    entry => entry.id === value
  )?.label ?? value;
}

export function getAppearanceSummary(appearance = {}) {
  const value = normalizeAppearance(appearance);

  return [
    getSummaryLabel("skinTone", value.skinTone),

    [
      getSummaryLabel("hairStyle", value.hairStyle),
      getSummaryLabel("hairColor", value.hairColor)
    ].join(" "),

    getSummaryLabel("coat", value.coat),
    getSummaryLabel("facialHair", value.facialHair),
    getSummaryLabel("makeup", value.makeup),
    getSummaryLabel("blush", value.blush),
    getSummaryLabel("accessory", value.accessory),
    getSummaryLabel("tattoos", value.tattoos)
  ].join(" · ");
}

export function renderAppearanceOption(
  category,
  appearanceOption,
  selectedValue
) {
  const selected = appearanceOption.id === selectedValue;

  return (
    text("t_240690a370d1245e61d6") +
    (selected ? text("t_dad1545efbcffe484e06") : "") +
    text("t_562375a04662590aef62") +
    selected +
    text("t_6a9e68bc782be3fbbe28") +
    escapeHtml(category) +
    text("t_5cfa57562b5863c008dc") +
    escapeHtml(appearanceOption.id) +
    text("t_ab2cd774889293a06156") +
    escapeHtml(appearanceOption.label) +
    text("t_d8de48c79715e8f2762e")
  );
}

export function renderAppearanceGroup(
  category,
  group,
  appearance
) {
  return (
    text("t_e0cd9558b74a36c0e24a") +
    escapeHtml(group.label) +
    text("t_8c998aeda729488fe7e9") +
    escapeHtml(group.label) +
    text("t_65580357d1a3d08d936d") +
    group.options
      .map(entry =>
        renderAppearanceOption(
          category,
          entry,
          appearance[category]
        )
      )
      .join("") +
    text("t_0294d5119d34a3a3b160")
  );
}

export function renderAvatarPreview({
  appearance,
  name,
  alias
} = {}) {
  const value = normalizeAppearance(appearance);

  const markup =
    text("t_8795647af0f7644f21f2") +
    PREVIEW_DETAIL_STYLES +
    EXTRA_PREVIEW_STYLES +
    text("t_5cb4d47ab987d1d8611a") +
    value.skinTone +
    text("t_1c6982a114fbfe64dd69") +
    value.hairStyle +
    text("t_9ab6d5036fb309f32917") +
    value.hairColor +
    text("t_65d9400395a7320d077c") +
    value.coat +
    text("t_b5a56d7e67f2e395fa15") +
    value.facialHair +
    text("t_77589c056af9e5dd17eb") +
    value.makeup +
    text("t_988d1bc283d58315960f") +
    value.accessory +
    text("t_c5b6bb7ee549e8defeef") +
    value.tattoos +
    text("t_dc26122131f0b419700e") +
    escapeHtml(
      name || text("t_803b7246d0b19ce1283c")
    ) +
    text("t_5405535349d1c308cd9d") +
    escapeHtml(alias || "UNLISTED") +
    text("t_6499957dbbab7ecb17cf");

  return markup.replace(
    /\bdata-skin-tone\s*=/,
    `data-blush="${escapeHtml(value.blush)}" data-skin-tone=`
  );
}

export function renderIdentityStep(playerData = {}) {
  const data = playerData || {};
  const appearance = normalizeAppearance(data.appearance);

  return (
    text("t_ba38744009a35e7a1533") +
    escapeHtml(data.name || "") +
    text("t_b8bd8230f00d07c9ce08") +
    escapeHtml(data.alias || "") +
    text("t_720f7855f99a3f2056e4") +
    Object.entries(APPEARANCE_OPTIONS)
      .map(([category, group]) =>
        renderAppearanceGroup(
          category,
          group,
          appearance
        )
      )
      .join("") +
    text("t_ad5b829e9f213c43ead5") +
    renderAvatarPreview({
      appearance,
      name: data.name,
      alias: data.alias
    }) +
    text("t_879327a0fe30559f153e")
  );
}