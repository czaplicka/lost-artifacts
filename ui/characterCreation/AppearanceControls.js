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
    label: text(__dialogueText("ui/characterCreation/AppearanceControls.js", "t_1f555d849065b210b76c")),
    options: [
      option("light", text("t_dbcd5e7bb7a0f538810d")),
      option("warm", text("t_316f24288be59c8327d0")),
      option("golden", text("t_30152252234e6da483c8")),
      option("deep", text("t_c54e3625467b4fdecbd7")),
      option("rich", text("t_dca900394dddb28e9369"))
    ]
  },

  hairStyle: {
    label: text(__dialogueText("ui/characterCreation/AppearanceControls.js", "t_c8f9a7f8ddbeaab0a33f")),
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

      option("highPonytail", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_c4b4dd6dd313827eccc0")),
      option("lowBun", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_c7731e917428e933e706")),
      option("sideBraid", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_97caccf8d1bde48dc9b6")),
      option("longWaves", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_7c41b6e054cfde0cc8fc")),
      option("bobBangs", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_fdb6e8a1ecbb31208016"))
    ]
  },

  hairColor: {
    label: text(__dialogueText("ui/characterCreation/AppearanceControls.js", "t_62882b9195db1fa1a89d")),
    options: [
      option("black", text("t_c6cfe6e4f129a34671d1")),
      option("brown", text("t_18f285592896ec8ead1b")),
      option("blonde", text("t_4495c74f098e4160a11a")),
      option("red", text("t_ba19e9c3d5f49882ddaa")),
      option("grey", text("t_d4ac58091b024645805d"))
    ]
  },

  coat: {
    label: __dialogueText("ui/characterCreation/AppearanceControls.js", "t_5bea3ab36d884792954c"),
    options: [
      option("trench", text("t_e1d2439aa6241a93abfe")),
      option("leather", text("t_e8e775159a57aaaf0f55")),
      option("blazer", text("t_766e11b9770ba38ea5dc")),
      option("sweater", text("t_89e32192c4b2e707574a")),

      option("bowBlouse", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_af0a8c6e6a276e3c4d37")),
      option("vNeckBlouse", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_8004bc2bae315c3dd68f")),
      option("cardigan", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_8c25ea3e749db218f59d")),
      option("fittedBlazer", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_1c2473800b9e18ab4b54")),
      option("dress", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_2f524af640388c7d2928"))
    ]
  },

  facialHair: {
    label: text(__dialogueText("ui/characterCreation/AppearanceControls.js", "t_1f57370dca80642aa612")),
    options: [
      option("none", text("t_dc937b59892604f5a86a")),
      option("moustache", text("t_138fa83d28e7fe1f2dec")),
      option("shortBeard", text("t_5699bc03af1d4f859b6f")),
      option("fullBeard", text("t_199b6188b54e0e67692c"))
    ]
  },

  makeup: {
    label: text(__dialogueText("ui/characterCreation/AppearanceControls.js", "t_0ce3cb87e04e9b0ead03")),
    options: [
      option("none", text("t_dc937b59892604f5a86a")),
      option("natural", text("t_d6acb6d51cfc574936fc")),
      option("red", text("t_1f8203a7ee09c02dcf89")),
      option("dark", text("t_5190f1e8814ce878bad0")),
      option("glitter", text("t_3a9bd0161d828548fe7d"))
    ]
  },

  blush: {
    label: __dialogueText("ui/characterCreation/AppearanceControls.js", "t_c5c152f7e89062d27c38"),
    options: [
      option("none", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_dc937b59892604f5a86a")),
      option("softRose", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_7ab4122b9deccbe29781")),
      option("peach", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_2b1f3f0b7afa26e4a824")),
      option("berry", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_ef2a28f03f6eafb0fe03"))
    ]
  },

  accessory: {
    label: text(__dialogueText("ui/characterCreation/AppearanceControls.js", "t_2fefa0cb9c5aefc6c4fb")),
    options: [
      option("none", text("t_dc937b59892604f5a86a")),
      option("glasses", text("t_eb25ede23e75985188ce")),
      option("scarf", text("t_5c22a749ac7d738d70cd")),
      option("notebook", text("t_0dec07abf92dbe7289d6")),
      option("studs", text("t_ba39f905e42025f15790")),
      option("hoops", text("t_88844c4a9225c3682473")),
      option("earring", text("t_7f86981a572461d80534")),

      option("pearlNecklace", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_1978bc390d430fc2024b")),
      option("pendant", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_f0f7234ab71431779509")),
      option("dropEarrings", __dialogueText("ui/characterCreation/AppearanceControls.js", "t_de634a2519963fe0c40b"))
    ]
  },

  tattoos: {
    label: text(__dialogueText("ui/characterCreation/AppearanceControls.js", "t_f4a3f7e6de11dde0f3a1")),
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
    softRose: __dialogueText("ui/characterCreation/AppearanceControls.js", "t_e3298f36ed042b426c58"),
    peach: __dialogueText("ui/characterCreation/AppearanceControls.js", "t_361534ced30aa7edb8c8"),
    berry: __dialogueText("ui/characterCreation/AppearanceControls.js", "t_564fdefb670706993241")
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

const EXTRA_PREVIEW_STYLES = `${__dialogueText("ui/characterCreation/AppearanceControls.js", "t_23e2cd827ff6972b7695")}`;

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
    `${__dialogueText("ui/characterCreation/AppearanceControls.js", "t_f083284179fa044fc4ad")}${escapeHtml(value.blush)}${__dialogueText("ui/characterCreation/AppearanceControls.js", "t_6a0ebab8d9bb19e3eab4")}`
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