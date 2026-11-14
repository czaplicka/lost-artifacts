const CASE = 'borrowed_alibi';
const STORE = 'playerCloudNotebookV1';

const array = value =>
  Array.isArray(value) ? value : [];

const signature = values =>
  [...new Set(array(values))]
    .sort()
    .join('|');

const NAME_IDS = new Set([
  'arthur_finch',
  'nora_bell',
  'simon_pike',
  'evelyn_shaw',
  'copper_spoon',
  'alibi_club',
  'morrow_records',
  'pie_contest',
  'board_tournament'
]);

const PEOPLE = [
  'arthur_finch',
  'nora_bell',
  'simon_pike',
  'evelyn_shaw'
];

const DINNER = new Set([
  'copper_spoon',
  'tuesday',
  'tomato_soup',
  'red_wine',
  'kitchen_failure',
  'receipt',
  'consent',
  'one_guest'
]);

const CLUB = new Set([
  'alibi_club',
  'tuesday_package',
  'revision_two',
  'dinner_package',
  'respectable_witness',
  'sample',
  'sample_code'
]);

const COMPANY = new Set([
  'morrow_records',
  'records_breakin',
  'blue_folder'
]);

export function alibiNamingOptions(
  state,
  definition
) {
  if (definition?.id !== CASE) {
    return [];
  }

  const known = new Set(
    array(
      state.piKeywordSearch
        ?.cases?.[CASE]?.known
    )
  );

  return array(definition.keywords)
    .filter(word =>
      known.has(word.id) &&
      NAME_IDS.has(word.id)
    )
    .map(word => ({
      id: word.id,
      label: word.label
    }));
}

function cloudContext(
  state,
  cloud,
  known
) {
  const progress =
    state[STORE]?.cases?.[CASE] || {};

  const neighbours = new Set();

  for (const link of array(progress.links)) {
    if (link.from === cloud.id) {
      neighbours.add(link.to);
    }

    if (link.to === cloud.id) {
      neighbours.add(link.from);
    }
  }

  const relevant = [
    cloud,

    ...array(progress.clouds).filter(
      item => neighbours.has(item.id)
    )
  ];

  return new Set(
    relevant
      .flatMap(item => [
        item.titleKey,
        ...array(item.words)
      ])
      .filter(id => known.has(id))
  );
}

function subjectsFor(topic) {
  const result = new Set();

  for (const term of array(topic.terms)) {
    if (NAME_IDS.has(term)) {
      result.add(term);
    }

    if (DINNER.has(term)) {
      result.add('copper_spoon');

      PEOPLE.forEach(id => {
        result.add(id);
      });
    }

    if (CLUB.has(term)) {
      result.add('alibi_club');

      PEOPLE.forEach(id => {
        result.add(id);
      });
    }

    if (COMPANY.has(term)) {
      result.add('morrow_records');
      result.add('evelyn_shaw');
    }

    if (
      term === 'pie_contest' ||
      term === 'nora_verified'
    ) {
      result.add('nora_bell');
      result.add('pie_contest');
    }

    if (
      term === 'board_tournament' ||
      term === 'simon_verified'
    ) {
      result.add('simon_pike');
      result.add('board_tournament');
    }
  }

  return result;
}

function available(
  topic,
  known,
  flags
) {
  return (
    array(topic.requiresFlags).every(
      flag => flags.has(flag)
    ) &&

    !array(topic.unlessFlags).some(
      flag => flags.has(flag)
    ) &&

    array(topic.requiresKeywords).every(
      id => known.has(id)
    ) &&

    !array(topic.unlessKeywords).some(
      id => known.has(id)
    )
  );
}

function priority(topic) {
  const value = Number(topic.priority);

  return Number.isFinite(value)
    ? value
    : 0;
}

function responseSignature(topic) {
  return JSON.stringify({
    lines: array(topic.lines),

    grantFlags: [
      ...new Set(array(topic.grantFlags))
    ].sort(),

    grantKeywords: [
      ...new Set(array(topic.grantKeywords))
    ].sort()
  });
}

export function alibiCloudQuestions(
  state,
  definition,
  cloud,
  contact,
  flags = []
) {
  if (
    definition?.id !== CASE ||
    contact?.caseId !== CASE ||
    !cloud?.titleKey
  ) {
    return [];
  }

  const validName = alibiNamingOptions(
    state,
    definition
  ).some(
    option =>
      option.id === cloud.titleKey
  );

  if (!validName) {
    return [];
  }

  const known = new Set(
    array(
      state.piKeywordSearch
        ?.cases?.[CASE]?.known
    )
  );

  const currentFlags = new Set(
    array(flags)
  );

  const context = cloudContext(
    state,
    cloud,
    known
  );

  const selected = new Map();

  for (const topic of array(contact.topics)) {
    const terms = array(topic.terms);

    if (
      !terms.length ||
      terms.length > 2 ||
      new Set(terms).size !== terms.length
    ) {
      continue;
    }

    if (
      !subjectsFor(topic).has(
        cloud.titleKey
      )
    ) {
      continue;
    }

    if (
      !terms.every(id =>
        known.has(id) &&
        context.has(id)
      )
    ) {
      continue;
    }

    if (
      !available(
        topic,
        known,
        currentFlags
      )
    ) {
      continue;
    }

    if (!array(topic.lines).length) {
      continue;
    }

    const key = signature(terms);

    const previous = selected.get(key);

    if (
      !previous ||
      priority(topic) > priority(previous)
    ) {
      selected.set(key, topic);
    }
  }

  const seen = new Set();

  return [...selected.values()]
    .sort((a, b) =>
      (
        array(b.terms).length -
        array(a.terms).length
      ) ||
      (
        priority(b) -
        priority(a)
      )
    )
    .filter(topic => {
      const key = responseSignature(topic);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    })
    .map(topic => ({
      ...topic,

      questionLabel:
        topic.questionLabel ||

        array(topic.lines).find(
          line => line.speaker === 'You'
        )?.text ||

        'Ask about this topic'
    }));
}