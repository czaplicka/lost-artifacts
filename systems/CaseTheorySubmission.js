import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';

import {
  THEORY_FIELDS,
  normalizeTheory,
  normalizeSkillId,
  theoryCaseKey,
  readTheory,
  getTheoryReadiness,
  getTheoryCards,
  getActualIdentityIds,
  getUsedSkillIds
} from '../crimeBoard/CaseTheoryModel.js';

import { getMotiveById } from '../motiveService.js';

import {
  getOpportunityFacts,
  evaluateOpportunity
} from './OpportunityRules.js';

const FILE = 'systems/CaseTheorySubmission.js';

const text = key => __dialogueText(FILE, key);

const clone = value => JSON.parse(
  JSON.stringify(value)
);

const arr = value => Array.isArray(value)
  ? value
  : [];

const same = (a, b) => (
  a != null &&
  b != null &&
  String(a) === String(b)
);

const has = (card, tag) => (
  arr(card?.tags).includes(tag)
);

const nonempty = value => (
  typeof value === 'string' &&
  value.trim().length > 0
);

const strings = values => [
  ...new Set(
    arr(values)
      .filter(value => value != null)
      .map(String)
  )
];

const equivalent = (a, b, ids) => (
  a != null &&
  b != null &&
  (
    same(a, b) ||
    (
      ids.includes(String(a)) &&
      ids.includes(String(b))
    )
  )
);

const inScope = (value, state) => (
  Boolean(value) &&
  (
    value.caseId == null ||
    same(value.caseId, state.currentCaseId)
  ) &&
  (
    value.campaignId == null ||
    value.campaignId === state._createdAt
  )
);

function conclusionCorrect(subject, state) {
  const filed = subject?.playerConclusion;

  if (
    filed?.locked !== true ||
    !inScope(filed, state)
  ) {
    return false;
  }

  if (
    filed.evaluation?.conclusionCorrect === false
  ) {
    return false;
  }

  if (subject.alibiType === 'confirmed') {
    return filed.choice === '__no_liar__';
  }

  return (
    subject.alibiType === 'contradicted' &&
    filed.choice !== '__no_liar__' &&
    arr(subject.witnesses).some(witness => (
      witness?.isLiar === true &&
      same(witness.npcId, filed.choice)
    ))
  );
}

export function addTrialEvidence(input, state) {
  const data = clone(input || {});

  const previous = new Map(
    arr(data.items)
      .filter(Boolean)
      .map(card => [card.id, card])
  );

  data.items = arr(data.items).filter(card => (
    card &&
    (
      card.createdByPlayer ||
      !has(card, 'trial-evidence')
    )
  ));

  let index = 0;

  const put = (
    id,
    label,
    body,
    tags,
    extra = {}
  ) => {
    const card = {
      id,
      type: 'evidence',
      label,
      body,
      tag: text('t_71a4dbb8919b90dd2187'),

      x: 1100 + (index % 2) * 230,
      y: 580 + Math.floor(index++ / 2) * 210,

      z: 7,
      rotation: -1.2,
      pinned: false,
      fields: [],

      tags: ['trial-evidence', ...tags],

      discovered: true,
      createdByPlayer: false,
      editableByPlayer: false,

      ...extra,

      caseId: state.currentCaseId,
      campaignId: state._createdAt
    };

    const old = previous.get(id);

    if (old && !old.createdByPlayer) {
      for (const key of [
        'x',
        'y',
        'z',
        'rotation',
        'pinned'
      ]) {
        if (old[key] !== undefined) {
          card[key] = old[key];
        }
      }
    }

    const position = data.items.findIndex(
      item => item.id === id
    );

    if (position >= 0) {
      if (data.items[position].createdByPlayer) {
        return;
      }

      data.items[position] = card;
    } else {
      data.items.push(card);
    }
  };

  for (const clue of arr(state.cluesCollected)) {
    if (
      clue?.type !== 'motive' ||
      clue.id == null ||
      !inScope(clue, state) ||
      !nonempty(clue.text)
    ) {
      continue;
    }

    put(
      `agency-motive-${encodeURIComponent(clue.id)}`,

      clue.label ||
        text('t_eaec6ca7694d36fa9a99'),

      clue.text,

      ['motive-evidence'],

      {
        clueId: clue.id,

        fields: [
          {
            key: 'Source',
            value:
              clue.npcId ||
              text('t_06149ba4730bc7d4973b')
          }
        ]
      }
    );
  }

  const key = theoryCaseKey(state);

  const investigation =
    state.caseData?.alibiCases?.[key];

  const alibis = inScope(investigation, state)
    ? arr(investigation.suspects)
    : [];

  const people = [
    ...arr(state.caseSuspects),
    ...arr(state.suspects),
    ...arr(state.suspectList)
  ];

  const encounters = arr(
    state.crimeCityEncounterState?.[key]
  ).filter(entry => inScope(entry, state));

  for (const alibi of alibis) {
    if (
      !inScope(alibi, state) ||
      alibi.suspectId == null
    ) {
      continue;
    }

    const person = people.find(value => (
      same(value?.id, alibi.suspectId)
    ));

    const name =
      person?.publicProfile?.displayName ||
      person?.name ||
      alibi.suspectName ||
      text('t_f5ebb28614ebb0ee63cb');

    for (const witness of arr(alibi.witnesses)) {
      if (
        !witness ||
        witness.npcId == null ||
        !nonempty(witness.statement)
      ) {
        continue;
      }

      const interviewed = encounters.some(entry => (
        same(entry.npcId, witness.npcId) &&
        entry.interviewed === true &&
        entry.dialogueCompleted === true
      ));

      if (!interviewed) continue;

      put(
        `agency-witness-${encodeURIComponent(key)}-${encodeURIComponent(witness.npcId)}`,

        `${witness.role || text('t_5464a8914419f3a1a237')} — ${name}`,

        witness.statement,

        ['alibi-evidence', 'witness-statement'],

        {
          suspectId: alibi.suspectId,
          clueId: witness.npcId
        }
      );
    }

    const filed = alibi.playerConclusion;

    if (
      filed?.locked === true &&
      inScope(filed, state) &&
      ['confirmed', 'contradicted'].includes(
        filed.status
      )
    ) {
      put(
        `agency-alibi-${encodeURIComponent(key)}-${encodeURIComponent(alibi.suspectId)}`,

        `${text('t_9595f25d96469fbfed58')}${name}`,

        `${text('t_2bb78b9a20efd50fd4bf')}${filed.status}${text('t_b3d24121d6b898783085')}`,

        ['alibi-evidence', 'filed-alibi'],

        {
          suspectId: alibi.suspectId,
          alibiStatus: filed.status,

          alibiVerified:
            conclusionCorrect(alibi, state) &&
            filed.status === alibi.alibiType,

          clueId: `filed-alibi-${alibi.suspectId}`
        }
      );
    }
  }

  const validIds = new Set(
    data.items.map(card => card.id)
  );

  data.links = arr(data.links).filter(link => (
    link &&
    validIds.has(link.from) &&
    validIds.has(link.to)
  ));

  return data;
}

export function assessSubmission(submission) {
  const theory = normalizeTheory(
    submission?.theory
  );

  const solution = submission?.solution || {};
  const ids = strings(solution.identityIds);

  const cardList = arr(
    submission?.cards
  ).filter(card => (
    card &&
    typeof card.id === 'string'
  ));

  const cards = new Map(
    cardList.map(card => [card.id, card])
  );

  const duplicateIds = new Set(
    cardList
      .filter((card, index) => (
        cardList.findIndex(
          other => other.id === card.id
        ) !== index
      ))
      .map(card => card.id)
  );

  const status = value => (
    value == null
      ? 'inconclusive'
      : value
        ? 'supported'
        : 'contradicted'
  );

  return THEORY_FIELDS.map(([field, label]) => {
    const section = theory.sections[field];

    const referenceIds = arr(
      section.evidenceIds
    );

    const attached = referenceIds
      .map(id => cards.get(id))
      .filter(Boolean);

    const sourced = attached.filter(card => (
      !card.createdByPlayer &&
      card.discovered !== false &&
      (
        submission.caseId == null ||
        card.caseId == null ||
        same(card.caseId, submission.caseId)
      ) &&
      (
        submission.campaignId == null ||
        card.campaignId == null ||
        card.campaignId === submission.campaignId
      )
    ));

    let answer = null;
    let evidence = null;

    if (field === 'identity') {
      if (ids.length) {
        answer =
          ids.includes(String(section.answerId)) &&
          equivalent(
            section.answerId,
            submission.suspectId,
            ids
          );
      }

      evidence = sourced.some(card => (
        card.suspectId != null &&
        equivalent(
          card.suspectId,
          section.answerId,
          ids
        ) &&
        !has(card, 'unknown')
      ));
    } else if (field === 'motive') {
      if (nonempty(solution.motiveAnswerId)) {
        answer =
          section.answerId ===
          solution.motiveAnswerId;
      }

      evidence = sourced.some(card => (
        has(card, 'motive-evidence') &&
        strings(solution.motiveEvidenceIds).includes(
          String(card.clueId)
        )
      ));
    } else if (field === 'means') {
      const chosen = [
        ...new Set(
          arr(section.skillIds)
            .map(normalizeSkillId)
            .filter(Boolean)
        )
      ].sort();

      const expected = Array.isArray(
        solution.usedSkills
      )
        ? [
          ...new Set(
            solution.usedSkills
              .map(normalizeSkillId)
              .filter(Boolean)
          )
        ].sort()
        : null;

      if (expected) {
        answer =
          expected.length > 0 &&
          chosen.length > 0 &&
          JSON.stringify(chosen) ===
            JSON.stringify(expected);
      }

      evidence =
        chosen.length > 0 &&
        chosen.every(id => (
          sourced.some(card => (
            (
              has(card, 'hypothesis-skill') &&
              has(card, 'skill-confirmed') &&
              !has(card, 'skill-uncertain') &&
              normalizeSkillId(
                String(card.label || '')
                  .replace(/\s*\?$/, '')
              ) === id
            ) ||
            (
              card.sourceObjectId != null &&
              strings(
                solution.skillObjects?.[id]
              ).includes(
                String(card.sourceObjectId)
              ) &&
              !has(card, 'skill-uncertain') &&
              !has(card, 'reconstruction-uncertain')
            )
          ))
        ));
    } else if (field === 'opportunity') {
      const verdict = evaluateOpportunity(
        solution.opportunity,
        section.answerId
      );

      answer = verdict === 'inconclusive'
        ? null
        : verdict === 'supported';

      if (section.answerId === 'false_alibi') {
        evidence = sourced.some(card => (
          has(card, 'filed-alibi') &&
          card.alibiStatus === 'contradicted' &&
          card.alibiVerified === true &&
          equivalent(
            card.suspectId,
            theory.sections.identity.answerId,
            ids
          )
        ));
      } else if (
        section.answerId === 'security_gap'
      ) {
        evidence = sourced.some(card => (
          strings(
            solution.securityObjectIds
          ).includes(
            String(
              card.sourceObjectId ??
              card.clueId
            )
          ) &&
          !has(card, 'skill-uncertain') &&
          !has(card, 'reconstruction-uncertain')
        ));
      } else if (answer != null) {
        evidence = sourced.some(card => (
          arr(
            card.opportunityAnswerIds
          ).includes(section.answerId)
        ));
      }
    }

    if (
      !referenceIds.length ||
      attached.length !== referenceIds.length ||
      sourced.length !== attached.length ||
      referenceIds.some(id => duplicateIds.has(id)) ||
      attached.some(card => card.isRedHerring === true)
    ) {
      evidence = false;
    }

    return {
      field,
      label,

      answerStatus: status(answer),
      evidenceStatus: status(evidence),

      answerLabel:
        submission.answerLabels?.[field] ||
        label,

      evidenceLabels: attached.map(card => (
        card.label ||
        text('t_e1a5b05ffd1d4a86ab57')
      ))
    };
  });
}

export function isFatalSubmission(submission) {
  return assessSubmission(submission).some(row => (
    row.answerStatus === 'contradicted' ||
    row.evidenceStatus === 'contradicted'
  ));
}

export function validSubmission(
  submission,
  state,
  suspectId = null
) {
  try {
    if (
      submission?.version !== 3 ||
      !same(
        submission.caseId,
        state.currentCaseId
      ) ||
      submission.campaignId !== state._createdAt ||
      submission.suspectId == null ||
      (
        suspectId != null &&
        !same(submission.suspectId, suspectId)
      ) ||
      !Array.isArray(submission.cards) ||
      !submission.solution ||
      !submission.answerLabels
    ) {
      return false;
    }

    if (
      submission.cards.some(card => (
        !card ||
        typeof card.id !== 'string' ||
        !inScope(card, state)
      ))
    ) {
      return false;
    }

    if (
      new Set(
        submission.cards.map(card => card.id)
      ).size !== submission.cards.length
    ) {
      return false;
    }

    // Niepełna teoria jest dopuszczalnym zgłoszeniem.
    // Nadal sprawdzamy spójność zapisanej oceny.
    return (
      JSON.stringify(submission.assessment) ===
      JSON.stringify(assessSubmission(submission))
    );
  } catch {
    return false;
  }
}

export function getSubmittedTheory(
  state,
  suspectId = null
) {
  const value =
    state.caseData?.submittedCaseTheory;

  return validSubmission(
    value,
    state,
    suspectId
  )
    ? clone(value)
    : null;
}

export function prepareTheorySubmission(
  state,
  suspectId
) {
  if (suspectId == null) {
    throw new Error(
      'Select a suspect before submitting the theory.'
    );
  }

  const previous =
    state.caseData?.submittedCaseTheory;

  if (previous?.version === 3) {
    if (
      !validSubmission(
        previous,
        state,
        suspectId
      )
    ) {
      throw new Error(
        'The submitted theory belongs to another suspect, ' +
        'uses older evidence rules or is inconsistent. ' +
        'It was not overwritten. ' +
        'Load a save from before submitting the theory.'
      );
    }

    return clone(previous);
  }

  if (
    previous &&
    (
      !same(
        previous.caseId,
        state.currentCaseId
      ) ||
      previous.campaignId !== state._createdAt ||
      !same(previous.suspectId, suspectId)
    )
  ) {
    throw new Error(
      'The existing submitted theory does not match this arrest.'
    );
  }

  const raw =
    previous?.theory ||
    readTheory(state);

  const board = addTrialEvidence(
    {
      items: getTheoryCards(state),
      links: []
    },
    state
  );

  const readiness = getTheoryReadiness(
    state,
    raw,
    board.items
  );

  // Nie blokujemy aresztowania przy niepełnej teorii.
  // Zapisujemy jej aktualny, znormalizowany stan.
  const motive = getMotiveById(
    state.caseData?.motiveId
  );

  const identityIds =
    getActualIdentityIds(state);

  const usedSkills =
    getUsedSkillIds(state);

  const claims = arr(
    state.reconstructedHeist?.claims
  );

  const skillObjects = {};

  for (const claim of claims) {
    const id = normalizeSkillId(
      claim?.thiefSkill
    );

    if (
      !id ||
      claim?.solutionItemId == null
    ) {
      continue;
    }

    skillObjects[id] = [
      ...new Set([
        ...arr(skillObjects[id]),
        String(claim.solutionItemId)
      ])
    ];
  }

  const theory = readiness.theory;

  theory.caseId = state.currentCaseId;
  theory.campaignId = state._createdAt;

  const selected = new Set(
    THEORY_FIELDS.flatMap(([field]) => (
      theory.sections[field].evidenceIds
    ))
  );

  const identityCard = board.items.find(card => (
    same(
      card.suspectId,
      theory.sections.identity.answerId
    ) &&
    !has(card, 'unknown')
  ));

  const finalIds = new Set(
    arr(
      motive?.escapeInvestigation?.clueStages
    )
      .filter(stage => (
        stage?.boardAnswerUnlocked === true
      ))
      .map(stage => String(stage.evidenceId))
  );

  const motiveEvidenceIds = arr(
    state.cluesCollected
  )
    .filter(clue => (
      clue?.type === 'motive' &&
      inScope(clue, state) &&
      nonempty(clue.text) &&
      finalIds.has(String(clue.id))
    ))
    .map(clue => String(clue.id));

  const submission = {
    version: 3,

    caseId: state.currentCaseId,
    campaignId: state._createdAt,

    workspaceKey: theoryCaseKey(state),
    suspectId,

    theory: clone(theory),

    cards: clone(
      board.items.filter(card => (
        selected.has(card.id)
      ))
    ),

    solution: {
      identityIds,

      motiveAnswerId:
        motive?.crimeBoard?.answerId ||
        null,

      motiveEvidenceIds: [
        ...new Set(motiveEvidenceIds)
      ],

      usedSkills,
      skillObjects,

      opportunity: getOpportunityFacts(state),

      securityObjectIds: claims
        .filter(claim => (
          claim?.solutionItemId != null &&
          [
            'beat_security',
            'disable_system',
            'create_blind_spot'
          ].includes(claim.questionId)
        ))
        .map(claim => (
          String(claim.solutionItemId)
        ))
    },

    answerLabels: {
      identity:
        identityCard?.label ||
        text('t_4bf8456b297fe93a1c10'),

      motive:
        theory.sections.motive.answerId ===
          motive?.crimeBoard?.answerId
          ? motive.crimeBoard.label
          : theory.sections.motive.answerId
            .replaceAll('_', ' '),

      means:
        theory.sections.means.skillIds.join(', '),

      opportunity:
        theory.sections.opportunity.answerId
          .replaceAll('_', ' ')
    },

    submittedAt:
      previous?.submittedAt ||
      new Date().toISOString(),

    migratedFromLegacy: Boolean(previous)
  };

  submission.assessment =
    assessSubmission(submission);

  const caseData = {
    ...(state.caseData || {}),
    submittedCaseTheory: clone(submission)
  };

  if (typeof state.updateState === 'function') {
    state.updateState({ caseData });
  } else {
    state.caseData = caseData;
  }

  return submission;
}