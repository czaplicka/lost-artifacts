const CASE = 'borrowed_alibi';
const STORE = 'playerCloudNotebookV1';

const array = value =>
  Array.isArray(value) ? value : [];

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

export function alibiNamingOptions(
  state,
  definition
) {
  if (definition?.id !== CASE) return [];

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

function cloudContext(state, cloud, known) {
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

function equivalentQuestion(topic) {
  const flags = [
    ...new Set(array(topic.grantFlags))
  ].sort();

  if (flags.length) {
    return 'effect:' + flags.join('|');
  }

  const reply = array(topic.lines)
    .filter(line => line.speaker !== 'You')
    .map(line =>
      String(line.text || '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .join('|');

  return reply
    ? 'reply:' + reply
    : 'id:' + topic.id;
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
  ).some(option =>
    option.id === cloud.titleKey
  );

  if (!validName) return [];

  const known = new Set(
    array(
      state.piKeywordSearch
        ?.cases?.[CASE]?.known
    )
  );

  const context = cloudContext(
    state,
    cloud,
    known
  );

  const available = array(contact.topics)
    .filter(topic => {
      const terms = array(topic.terms);

      return (
        terms.length > 0 &&
        terms.length <= 2 &&

        subjectsFor(topic).has(
          cloud.titleKey
        ) &&

        terms.every(id =>
          known.has(id) &&
          context.has(id)
        ) &&

        array(topic.requiresFlags).every(
          flag => flags.includes(flag)
        )
      );
    })
    .sort((a, b) =>
      array(b.terms).length -
      array(a.terms).length
    );

  const seen = new Set();

  return available
    .filter(topic => {
      const key = equivalentQuestion(topic);

      if (seen.has(key)) return false;

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