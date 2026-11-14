import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';

export function formatNoteTime(minute) {
  if (!Number.isInteger(minute)) return '?';

  const normalized = ((minute % 1440) + 1440) % 1440;

  return (
    String(Math.floor(normalized / 60)).padStart(2, '0') +
    ':' +
    String(normalized % 60).padStart(2, '0')
  );
}

function interval(
  start,
  end,
  label,
  dayLabel = __dialogueText("alibi/AlibiTimeNotes.js", "t_5f22ffd4da4641b47760")
) {
  return {
    startMinute: start,
    endMinute: end,
    label,
    dayLabel
  };
}

function findStoredSubject(caseKey, suspectId) {
  return gameState.caseData?.alibiCases?.[caseKey]
    ?.suspects?.find(
      item => item.suspectId === suspectId
    );
}

function getAccountIndex(cardId) {
  const match = String(cardId || '').match(
    /_alibi_account_([1-3])$/
  );

  return match ? Number(match[1]) - 1 : -1;
}

function findCardStatement(subject, card) {
  const witness = subject?.witnesses?.find(
    item =>
      item.timelineCard?.id === card?.id ||
      (
        card?.roleId &&
        item.roleId === card.roleId
      )
  );

  return String(
    witness?.statement ||
    card?.statement ||
    ''
  );
}

function toMinute(value) {
  const match = String(value).match(
    /^([01]\d|2[0-3]):([0-5]\d)$/
  );

  return match
    ? Number(match[1]) * 60 + Number(match[2])
    : null;
}

function getExplicitIntervals(statement) {
  const text = String(statement || '')
    .split(__dialogueText("alibi/AlibiTimeNotes.js", "t_4799730304ff7214bd28"))[0];

  const result = [];

  const pattern =
    /\b(?:from|throughout|between)\s+([0-2]\d:[0-5]\d)\s+(?:to|until|and|through|[–—-])\s+([0-2]\d:[0-5]\d)\b/gi;

  for (const match of text.matchAll(pattern)) {
    const start = toMinute(match[1]);
    const end = toMinute(match[2]);

    if (
      start === null ||
      end === null ||
      end < start
    ) {
      continue;
    }

    if (
      result.some(
        item =>
          item.startMinute === start &&
          item.endMinute === end
      )
    ) {
      continue;
    }

    result.push(
      interval(
        start,
        end,
        __dialogueText("alibi/AlibiTimeNotes.js", "t_e5f42e286ef50b560071"),
        __dialogueText("alibi/AlibiTimeNotes.js", "t_5a7affbdef6467fdfef2")
      )
    );
  }

  return result;
}

function getScenarioIntervals(subject) {
  const window = subject?.crimeWindow;

  if (
    !Number.isInteger(window?.startMinute) ||
    !Number.isInteger(window?.endMinute)
  ) {
    return null;
  }

  const a = window.startMinute;
  const b = window.endMinute;

  const match = String(subject.scenarioId || '').match(
    /_(true|false)_(\d+)$/
  );

  if (!match) return null;

  const confirmed = match[1] === 'true';
  const pattern = Number(match[2]);

  const range = (start, end, label) => [
    interval(start, end, label)
  ];

  if (confirmed) {
    switch (pattern) {
      case 0:
        return [
          range(
            a - 20,
            b + 5,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_69335e25aa4ccded68b6")
          ),
          range(
            a - 5,
            b + 5,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_41a21480878be1f257c0")
          ),
          range(
            a - 5,
            b + 15,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_658d0c9dae790b6f40a6")
          )
        ];

      case 1:
        return [
          range(
            a - 20,
            a + 1,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_55cb1775e3dfaac910f0")
          ),
          range(
            a - 5,
            b + 15,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_c57d473232f08b6c7189")
          ),
          range(
            a - 5,
            b + 15,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_e556fa386b3178259b0e")
          )
        ];

      case 2:
        return [
          range(
            a - 15,
            b + 10,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_088f3418d00a23b0fe76")
          ),
          range(
            a - 5,
            b + 5,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_a13c239b1a54119af6a8")
          ),
          range(
            a - 5,
            b + 5,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_64117c7d86410912e55d")
          )
        ];

      case 3:
        return [
          range(
            a - 15,
            b + 10,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_a569a4e95ee4af258a1a")
          ),
          range(
            a - 5,
            b + 5,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_8ea5b16717aefe0ec207")
          ),
          range(
            a - 5,
            b + 10,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_f86ca45204c86d38b9b9")
          )
        ];

      case 4:
        return [
          range(
            a - 20,
            b + 10,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_a7efc6d340952978761d")
          ),
          range(
            a - 5,
            b + 5,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_c1d1f518a0092882e06f")
          ),
          range(
            a,
            b,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_6a2f1adaa46d0b431ec0")
          )
        ];

      case 5:
        return [
          range(
            a - 15,
            b + 10,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_b821bdec118de5a3b3c0")
          ),
          range(
            a - 5,
            b + 5,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_42fd587280040e633fb6")
          ),
          range(
            a - 5,
            b + 10,
            __dialogueText("alibi/AlibiTimeNotes.js", "t_6c30c16e58f0cae9410e")
          )
        ];

      default:
        return null;
    }
  }

  switch (pattern) {
    case 0:
      return [
        range(
          a - 5,
          b + 5,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_544c8a56097f3c02b525")
        ),
        range(
          a - 15,
          b + 15,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_14659bed5e363ebf4d41")
        ),
        range(
          a - 10,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_267eb722ef7d6061040f")
        )
      ];

    case 1:
      return [
        range(
          a - 5,
          b + 5,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_7630e32e16e28293aa97")
        ),
        range(
          a - 20,
          b + 20,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_ace52d23c8634b1df579")
        ),
        range(
          a - 10,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_e0cc1c50530d53f2cdfb")
        )
      ];

    case 2:
      return [
        range(
          a - 20,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_c79f59bc53173c7761c0")
        ),
        range(
          a - 15,
          b + 15,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_7c7dc860ca49099ded8c")
        ),
        range(
          a - 10,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_ae55e7c69f2a6cc90c2d")
        )
      ];

    case 3:
      return [
        range(
          a - 10,
          b + 20,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_9d50c76756b41cecda4b")
        ),
        [],
        range(
          a - 10,
          b + 5,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_95a716a9f832851a9b30")
        )
      ];

    case 4:
      return [
        range(
          a - 15,
          b + 15,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_573d740ea35366a76837")
        ),
        [],
        []
      ];

    case 5:
      return [
        range(
          a - 25,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_355a06b74fc4e1e4874c")
        ),
        range(
          a - 10,
          b + 15,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_1fc826915d88171136ce")
        ),
        range(
          a - 10,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_8d521688225a318954a5")
        )
      ];

    case 6:
      return [
        range(
          a - 15,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_21c415026d7085c5ecb7")
        ),
        [],
        []
      ];

    case 7:
      return [
        range(
          a - 10,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_15c815f68ff5b9ad638f")
        ),
        [],
        []
      ];

    case 8:
      return [
        range(
          a - 10,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_4f17835442c830c2d235")
        ),
        [],
        []
      ];

    case 9:
      return [
        range(
          a - 5,
          b + 5,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_c8dac6af1f5b0c965984")
        ),
        range(
          a - 10,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_d8bea5d8e382e497d485")
        ),
        range(
          a,
          b,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_e2eefa18a63cda9cd80d")
        )
      ];

    case 10:
      return [
        range(
          a - 10,
          b + 10,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_9860fe49dec8888fbe93")
        ),
        [],
        []
      ];

    case 11:
      return [
        range(
          a - 20,
          b + 15,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_031f9ae180c32d6badfa")
        ),
        range(
          a - 5,
          b + 15,
          __dialogueText("alibi/AlibiTimeNotes.js", "t_1eb9494603b63c4ec890")
        ),
        []
      ];

    default:
      return null;
  }
}

export function getAlibiTimeNote(
  caseKey,
  suspectId,
  card
) {
  const subject = findStoredSubject(
    caseKey,
    suspectId
  );

  const index = getAccountIndex(card?.id);
  const scenarioIntervals = getScenarioIntervals(subject);

  const statement = findCardStatement(subject, card);

  const explicitIntervals =
    getExplicitIntervals(statement);

  const scenarioRanges =
    index >= 0 && scenarioIntervals
      ? scenarioIntervals[index] || []
      : [];

  // Prefer times actually written in the witness statement.
  const ranges = explicitIntervals.length
    ? explicitIntervals
    : scenarioRanges;

  const eventTime = Number.isInteger(card?.minute)
    ? card.minute
    : null;

  return {
    eventTime,
    ranges,
    hasKnownScenario: Boolean(scenarioIntervals),

    eventLabel:
      eventTime === null
        ? __dialogueText("alibi/AlibiTimeNotes.js", "t_924384f1d63acdc6797f")
        : `${__dialogueText("alibi/AlibiTimeNotes.js", "t_06d915c5cd08042cb3f3")}${formatNoteTime(eventTime)}`,

    rangeLabel:
      ranges.length
        ? ranges.map(item =>
            `${formatNoteTime(item.startMinute)}–` +
            `${formatNoteTime(item.endMinute)}`
          ).join(' / ')
        : __dialogueText("alibi/AlibiTimeNotes.js", "t_554241e3f42a86e6ab48")
  };
}

export function getAlibiTimeDetail(
  caseKey,
  suspectId,
  card
) {
  const note = getAlibiTimeNote(
    caseKey,
    suspectId,
    card
  );

  const subject = findStoredSubject(
    caseKey,
    suspectId
  );

  const lines = [note.eventLabel];

  if (note.ranges.length) {
    note.ranges.forEach(item => {
      lines.push(
        `${item.dayLabel}: ` +
        `${formatNoteTime(item.startMinute)}–` +
        `${formatNoteTime(item.endMinute)} — ${item.label}`
      );
    });
  } else {
    lines.push(
      __dialogueText("alibi/AlibiTimeNotes.js", "t_40efe53c94a36c4427fd") +
      __dialogueText("alibi/AlibiTimeNotes.js", "t_f2e73348a7d6bd60087e")
    );
  }

  if (
    /_false_4$/.test(
      String(subject?.scenarioId || '')
    )
  ) {
    lines.push(
      __dialogueText("alibi/AlibiTimeNotes.js", "t_b342232db725fae1b09e") +
      __dialogueText("alibi/AlibiTimeNotes.js", "t_a8a31a4e56cdc90784a3")
    );
  }

  lines.push(
    __dialogueText("alibi/AlibiTimeNotes.js", "t_82a5f83990dd07ff4eea") +
    __dialogueText("alibi/AlibiTimeNotes.js", "t_3fb50fba9cb7b4d2e53f")
  );

  return lines.join('\n');
}

export function getAlibiCardBody(
  caseKey,
  suspectId,
  card
) {
  const note = getAlibiTimeNote(
    caseKey,
    suspectId,
    card
  );

  const summary = String(card?.label || '')
    .replace(/^\d{2}:\d{2}\s*[—–-]\s*/, '');

  return [
    note.eventLabel,
    note.ranges.length
      ? `${__dialogueText("alibi/AlibiTimeNotes.js", "t_3058de197cc86546e4f6")}${note.rangeLabel}`
      : __dialogueText("alibi/AlibiTimeNotes.js", "t_0e7a4f3f05fd2b625715"),
    summary
  ].join('\n');
}