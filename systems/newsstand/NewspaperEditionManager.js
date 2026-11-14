import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  SHARED_NEWSPAPER_ARTICLES
} from './SharedNewspaperArticles.js';

import {
  latestWorldNewspaperEvent,
  worldNewspaperArticle
} from '../WorldReactionModel.js';

const clone = value =>
  JSON.parse(JSON.stringify(value));

const norm = value =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

function hash(text) {
  let n = 2166136261;

  for (const character of String(text)) {
    n = Math.imul(
      n ^ character.charCodeAt(0),
      16777619
    );
  }

  return n >>> 0;
}

export function getNewspaperDay(state) {
  for (const value of [
    state.currentDay,
    state.day
  ]) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 1
    ) {
      return Math.floor(number);
    }
  }

  return 1;
}

const MISSION_TEXTS = [
  [
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_b7f7993fc490ee9697d8"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_a62c086c1c3c7aea735d") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_67ced25815218cecdf7e"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_5362e0899254cf4e85e3") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_12ce39aa4d7b870874ea") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_23aada5c681f6d945cd6") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_3112ff35f1656ff7e6ba") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_05d75d12957c72fca583") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_af20c85e3e8e9e33c9f8") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_a6b8bba149c35c9637f2") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_f86ddb8abb1659f6115d")
  ],

  [
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_ba0ae5a44e69e9f87501"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_f09b46906ec1a8045e22") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_b32517d16e85b5333777"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_66796be7fddaa101b6f5") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_21cc57056a3fe49d80c5") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_d5a2bf6bdb6a32f7d5fd") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_0c39799560a9b624249c") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_134b99e7a84b42adae5d") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_3ed1bee157fdbde2177f") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_959860bfb9007cb19845") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_bfce5db7246e1828c12b")
  ],

  [
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_7b4e75b93217f5942649"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_dd405be95121b2c9f0b6") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_54b9b0d3ab8cfa418325"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_5e0ce94d34d4352c1682") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_37cc10f7d6b084373bb8") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_da61c698f0577df7dc16") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_7bb8fc4b61c3d4e0e804") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_f31cc1a3f9197962631c") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_0f24856e7f1b7fe053cc") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_225ab4af3d970c3d0afe")
  ],

  [
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_23096982416afc09f9d5"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_930de85f5c5f2509a314") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_704967ade09a9e17d096"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_82467083c16c7a5807bd") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_56ba8e348ad5457996f6") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_df3f4ffcc80d480a5850") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_8ad9e0d5a862e4095d53") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_1677131548e0be369b29") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_ea94936df28ba1f4e75d") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_2e66ee79665a5e974216") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_9d9afb0d94197bdcddeb") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_a72dee9e96b943f6121c")
  ],

  [
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_f3fd4f4539c85fa19afe"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_c70399956639bcf40582") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_43e4635486ab7cff4d4c"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_879cc883be3bebae59c5") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_1c655da18b6c4f7ae270") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_9a94051b5c474a7508f0") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_40cfc050a8ae37cf06a4") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_36fcef546d68ffa6f36e") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_4dc33f79c9660d14ab09") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_9e2c1750459c357d9031") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_388c0abf60ae86b01018") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_cb8159ab8100d866b7ae")
  ],

  [
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_5d7a683ed3c777b400c4"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_cfd17eb99ce0ac9bc7e4") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_065fc6ed6ace1de4555e"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_fd15d0e289d7f7015bd5") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_f0ae8428f6ce01777b2f") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_ba62919f429490c2a9a5") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_5533e8f768a3334cb79b") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_9dbde7c03ea48eaae24a") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_340a18d3c664eddbbfd1") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_8c2da3d55d7dfdbbb04f")
  ],

  [
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_70b20a6abd5598ef2552"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_a6069c1de58bec59d721"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_fc771580d8e54e8c39d1") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_7bb2a366d6783a220ace") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_4f168d3f5da61bd62620") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_cf6f0dac5ae4adcd557e") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_92621b2e70b205734f1d") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_4dcf0ebfe5a347c78288") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_6daf34270354f50c6f61") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_bb53c0d61fb31a5a27fb") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_2a81eaf39557894f4d8f")
  ],

  [
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_16ec1f62751e8967d559"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_d0dec82a598b6ad83b3e"),

    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_88df70a36a577870144f") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_3640818149780a4d50bd") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_47246224498a167d4433") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_fe83c4fc51b5ce7aaad4") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_8413660301028b688ca1") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_ba50111c7565abcca224") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_64c861778f8eba5b92d2") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_3eac8db0f460f2650c96") +
    __dialogueText("systems/newsstand/NewspaperEditionManager.js", "t_abd6393176e5901bf9c1")
  ]
];

const GENERIC_MISSION = MISSION_TEXTS.map(
  ([headline, lead, body], index) => ({
    id: `shared_mission_${index + 1}`,
    slotId: 'lead',
    headline,
    lead,
    body
  })
);

function usable(article, context) {
  return [
    'headline',
    'lead',
    'body',
    'imageCaption'
  ].every(field => {
    const matches = String(
      article[field] || ''
    ).matchAll(/\{([\w.]+)\}/g);

    for (const match of matches) {
      const value = match[1]
        .split('.')
        .reduce(
          (current, key) =>
            current == null
              ? undefined
              : current[key],
          context
        );

      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return false;
      }
    }

    return true;
  });
}

function fill(article, context) {
  const result = clone(article);

  for (const key of [
    'headline',
    'lead',
    'body',
    'imageCaption'
  ]) {
    if (typeof result[key] !== 'string') {
      continue;
    }

    result[key] = result[key].replace(
      /\{([\w.]+)\}/g,

      (match, path) => {
        const value = path
          .split('.')
          .reduce(
            (current, part) =>
              current == null
                ? undefined
                : current[part],
            context
          );

        return [
          'string',
          'number',
          'boolean'
        ].includes(typeof value)
          ? String(value)
          : match;
      }
    );
  }

  return result;
}

function idOf(article, mission = false) {
  return article.id ||
    `${mission ? 'mission' : 'local'}_${
      hash(
        article.headline + '|' + article.body
      )
    }`;
}

export function getDailyNewspaperEdition(
  state,
  cityData,
  options
) {
  const {
    cityId,
    context
  } = options;

  const day = getNewspaperDay(state);
  const old = state.newspaperHistory;

  const history = old?.version === 1
    ? clone(old)
    : {
        version: 1,
        seen: {},
        editions: {}
      };

  history.seen ||= {};
  history.editions ||= {};

  const event = latestWorldNewspaperEvent(
    state,
    cityId
  );

  const active = Boolean(
    state.isGameActive &&
    context.artifact
  );

  const mission = state.currentMission || {};

  const recovered = Boolean(
    mission.artifactRecovered ||
    state.artifactRecovery?.recovered
  );

  // Nowy wynik odświeża wydanie tego samego dnia.
  // Nowa misja nie nadpisuje treści poprzedniej sprawy.
  const issueKey = JSON.stringify([
    day,
    'daily',
    cityId,
    'world-v1',
    event?.id || null,
    state.currentCaseId ?? null,
    active,
    recovered
  ]);

  if (history.editions[issueKey]) {
    return clone(
      history.editions[issueKey]
    );
  }

  const missionCity =
    mission.city ||
    context.crimeCity ||
    context.city;

  const eligible = article =>
    usable(article, context);

  const local = (
    cityData.articles || []
  ).filter(eligible);

  const missionLocal = active && !recovered
    ? (
        cityData.missionLead || []
      ).filter(article =>
        eligible(article) &&
        (
          !article.missionCity ||
          norm(article.missionCity) ===
            norm(missionCity)
        ) &&
        (
          !article.missionArtifact ||
          norm(article.missionArtifact) ===
            norm(context.artifact)
        )
      )
    : [];

  const genericMission = active
    ? GENERIC_MISSION.filter(eligible)
    : [];

  const shared =
    SHARED_NEWSPAPER_ARTICLES.filter(eligible);

  const chosen = new Set();

  const seen = article =>
    history.seen[idOf(article)] || null;

  const unread = list =>
    list.filter(article => !seen(article));

  function pick(
    preferred,
    fallback,
    slot
  ) {
    let candidates = [
      ...preferred,
      ...fallback
    ].filter(
      article => !chosen.has(idOf(article))
    );

    const freshPreferred = unread(
      preferred
    ).filter(
      article => !chosen.has(idOf(article))
    );

    const freshFallback = unread(
      fallback
    ).filter(
      article => !chosen.has(idOf(article))
    );

    if (freshPreferred.length) {
      candidates = freshPreferred;
    } else if (freshFallback.length) {
      candidates = freshFallback;
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      const dayA = seen(a)?.day ?? -1;
      const dayB = seen(b)?.day ?? -1;

      return (
        dayA - dayB ||
        hash(
          `${day}|${cityId}|${slot}|${idOf(a)}`
        ) -
        hash(
          `${day}|${cityId}|${slot}|${idOf(b)}`
        )
      );
    });

    const article = candidates[0];
    const id = idOf(article);

    chosen.add(id);

    history.seen[id] = {
      day,
      cityId
    };

    return {
      ...fill(article, context),
      id,
      slotId: slot
    };
  }

  const newCaseActive = Boolean(
    event &&
    active &&
    String(event.caseId) !==
      String(state.currentCaseId)
  );

  const reaction = event
    ? worldNewspaperArticle(event)
    : null;

  let lead;

  if (
    reaction &&
    !newCaseActive
  ) {
    lead = {
      ...reaction,
      slotId: 'lead'
    };
  } else if (
    missionLocal.length ||
    genericMission.length
  ) {
    lead = pick(
      missionLocal,
      genericMission,
      'lead'
    );
  } else {
    lead = pick(
      local.filter(
        article => article.slotId === 'lead'
      ),
      shared,
      'lead'
    );
  }

  if (reaction) {
    chosen.add(reaction.id);

    history.seen[reaction.id] = {
      day,
      cityId
    };
  }

  const first =
    reaction && newCaseActive
      ? {
          ...reaction,
          slotId: 'secondary_1'
        }
      : pick(
          local.filter(
            article =>
              article.slotId === 'secondary_1'
          ),
          shared,
          'secondary_1'
        );

  const second = pick(
    shared,
    local.filter(
      article =>
        article.slotId === 'secondary_2'
    ),
    'secondary_2'
  );

  const edition = {
    title: cityData.title,
    subtitle: cityData.subtitle,
    editionDay: day,

    missionLead:
      !reaction || newCaseActive
        ? (
            missionLocal.length ||
            genericMission.length
              ? [lead].filter(Boolean)
              : []
          )
        : [],

    articles: [
      lead,
      first,
      second
    ].filter(Boolean)
  };

  history.editions[issueKey] =
    clone(edition);

  state.newspaperHistory = history;

  return clone(edition);
}