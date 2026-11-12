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
    'Agency Reviews {artifact} Case',

    'Investigators work through the details. ' +
    'Administration works through the stationery.',

    'Mark Agency is reviewing the case concerning ' +
    '{artifact} and {location} in {city}. Staff have ' +
    'been reminded to distinguish established facts ' +
    'from attractive theories. The distinction is ' +
    'considered important, particularly when ' +
    'explaining either to a lawyer. The agency has ' +
    'not authorised the use of red string as a ' +
    'substitute for evidence.'
  ],

  [
    '{artifact} Case Attracts Questions, Then More Questions',

    'The simplest questions continue to require ' +
    'the most careful answers.',

    'The case concerning {artifact} remains a subject ' +
    'of attention at Mark Agency. Officials stress ' +
    'that a convincing explanation must account for ' +
    'the evidence, not merely fit on the investigation ' +
    'board. A proposal to use smaller handwriting has ' +
    'been returned to its author. Enquiries about ' +
    '{location} in {city} should be directed through ' +
    'the proper channels.'
  ],

  [
    'Paperwork Follows {artifact} Investigation',

    'Every important detail deserves a record. ' +
    'Some records apparently deserve another record.',

    'Mark Agency staff handling the {artifact} case ' +
    'have been asked to keep their notes clear and ' +
    'their evidence properly documented. The matter ' +
    'concerns {location} in {city}. An internal ' +
    'reminder explains that a folder marked IMPORTANT ' +
    'does not become more useful when placed inside ' +
    'a second folder marked VERY IMPORTANT.'
  ],

  [
    'Agency Urges Caution Over {artifact} Theories',

    'An interesting possibility is not automatically ' +
    'a useful conclusion.',

    'Mark Agency has reminded personnel discussing ' +
    'the {artifact} case to avoid presenting ' +
    'speculation as fact. The reminder applies ' +
    'equally to meetings, telephone calls and ' +
    'conversations near the coffee machine. Staff ' +
    'examining the circumstances at {location} in ' +
    '{city} are encouraged to ask difficult questions, ' +
    'preferably before announcing that everything ' +
    'is obvious.'
  ],

  [
    '{artifact} Briefing Keeps Maps on the Table',

    'The agency recommends looking at the destination ' +
    'before booking the journey.',

    'The case concerning {artifact} has prompted ' +
    'another reminder about careful fieldwork. ' +
    'Mark Agency expects accurate notes, properly ' +
    'handled evidence and travel claims that can ' +
    'survive basic arithmetic. The reference file ' +
    'identifies {location} in {city}. An employee who ' +
    'asked whether sightseeing counted as ' +
    'reconnaissance has been advised to be ' +
    'considerably more specific.'
  ],

  [
    'Agency Requests Readable Notes on {artifact}',

    'Handwriting is not an encryption method, ' +
    'despite appearances.',

    'Staff reviewing the {artifact} case have been ' +
    'asked to write names and places legibly. ' +
    'The case file concerns {location} in {city}, ' +
    'a fact the agency would prefer not to reconstruct ' +
    'from three ambiguous squiggles. A proposal to ' +
    'employ a handwriting specialist to read the ' +
    'investigators’ own notes is awaiting a cost estimate.'
  ],

  [
    '{artifact} Case Inspires Reminder About Evidence',

    'Please label the bag before having a breakthrough.',

    'Mark Agency has circulated guidance on ' +
    'documenting material associated with the ' +
    '{artifact} case. Staff are reminded that a ' +
    'dramatic pause does not establish provenance. ' +
    'The case references {location} in {city}. ' +
    'Personal shopping, lunch receipts and objects ' +
    'described only as interesting should not be ' +
    'filed together merely because they fit in ' +
    'the same envelope.'
  ],

  [
    'Agency Keeps {artifact} Discussion Professional',

    'Professional, in this instance, means no betting pool.',

    'An internal notice asks employees discussing ' +
    'the {artifact} case to focus on verifiable ' +
    'information. Management has clarified that ' +
    'confidence, seniority and winning the office ' +
    'crossword do not make a theory correct. ' +
    'The case concerns {location} in {city}. ' +
    'The notice ends by requesting that whoever ' +
    'borrowed the noticeboard pins return at least ' +
    'some of them.'
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