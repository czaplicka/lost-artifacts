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
  dayLabel = 'Theft day'
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
    .split('Separately, the case file records:')[0];

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
        'Interval stated in the original account',
        'Account day — check the statement'
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
            'Face-to-face observation after the ID check'
          ),
          range(
            a - 5,
            b + 5,
            'Continuous direct observation'
          ),
          range(
            a - 5,
            b + 15,
            'Observation until the recorded departure'
          )
        ];

      case 1:
        return [
          range(
            a - 20,
            a + 1,
            'First observer before the handover'
          ),
          range(
            a - 5,
            b + 15,
            'Second observer after joining the meeting'
          ),
          range(
            a - 5,
            b + 15,
            'Independent observation of the handover'
          )
        ];

      case 2:
        return [
          range(
            a - 15,
            b + 10,
            'Continuous supervision after the ID check'
          ),
          range(
            a - 5,
            b + 5,
            'Face-to-face interaction'
          ),
          range(
            a - 5,
            b + 5,
            'Direct observation corroborated by video'
          )
        ];

      case 3:
        return [
          range(
            a - 15,
            b + 10,
            'Time spent together after arrival'
          ),
          range(
            a - 5,
            b + 5,
            'Continuous observation'
          ),
          range(
            a - 5,
            b + 10,
            'Observation before signing the record'
          )
        ];

      case 4:
        return [
          range(
            a - 20,
            b + 10,
            'Continuous presence after the ID check'
          ),
          range(
            a - 5,
            b + 5,
            'Observation using the corrected arrival time'
          ),
          range(
            a,
            b,
            'Observation throughout the theft window'
          )
        ];

      case 5:
        return [
          range(
            a - 15,
            b + 10,
            'Continuous direct supervision'
          ),
          range(
            a - 5,
            b + 5,
            'Direct observation despite reader failure'
          ),
          range(
            a - 5,
            b + 10,
            'Independent direct observation'
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
          'Claimed private meeting'
        ),
        range(
          a - 15,
          b + 15,
          'Observation of the claimed host elsewhere'
        ),
        range(
          a - 10,
          b + 10,
          'Independent observation of the claimed host'
        )
      ];

    case 1:
      return [
        range(
          a - 5,
          b + 5,
          'Claimed meeting inside the room'
        ),
        range(
          a - 20,
          b + 20,
          'Empty room locked; only key retained'
        ),
        range(
          a - 10,
          b + 10,
          'Continuous observation of the sealed entrance'
        )
      ];

    case 2:
      return [
        range(
          a - 20,
          b + 10,
          'Claimed uninterrupted attendance'
        ),
        range(
          a - 15,
          b + 15,
          'Entrance watched after departure'
        ),
        range(
          a - 10,
          b + 10,
          'Entrance watched; no return reported'
        )
      ];

    case 3:
      return [
        range(
          a - 10,
          b + 20,
          'Claimed attendance before and after the theft'
        ),
        [],
        range(
          a - 10,
          b + 5,
          'Entrance watched from before this start time'
        )
      ];

    case 4:
      return [
        range(
          a - 15,
          b + 15,
          'Meeting claimed for the theft day'
        ),
        [],
        []
      ];

    case 5:
      return [
        range(
          a - 25,
          b + 10,
          'Claimed length of the visit'
        ),
        range(
          a - 10,
          b + 15,
          'Entrance watched after sign-out'
        ),
        range(
          a - 10,
          b + 10,
          'Entrance watched after the witnessed departure'
        )
      ];

    case 6:
      return [
        range(
          a - 15,
          b + 10,
          'Claimed attendance linked to a booking'
        ),
        [],
        []
      ];

    case 7:
      return [
        range(
          a - 10,
          b + 10,
          'Claimed personal attendance'
        ),
        [],
        []
      ];

    case 8:
      return [
        range(
          a - 10,
          b + 10,
          'Claimed live attendance'
        ),
        [],
        []
      ];

    case 9:
      return [
        range(
          a - 5,
          b + 5,
          'Claimed face-to-face presence'
        ),
        range(
          a - 10,
          b + 10,
          'Observation of the witness making an audio call'
        ),
        range(
          a,
          b,
          'Independent observation of the audio call'
        )
      ];

    case 10:
      return [
        range(
          a - 10,
          b + 10,
          'Claimed attendance linked to a receipt'
        ),
        [],
        []
      ];

    case 11:
      return [
        range(
          a - 20,
          b + 15,
          'Claimed attendance on the disputed copy'
        ),
        range(
          a - 5,
          b + 15,
          'Entrance watched after the recorded departure'
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
        ? 'Event time not recorded'
        : `Event: ${formatNoteTime(eventTime)}`,

    rangeLabel:
      ranges.length
        ? ranges.map(item =>
            `${formatNoteTime(item.startMinute)}–` +
            `${formatNoteTime(item.endMinute)}`
          ).join(' / ')
        : 'No complete start–end interval identified'
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
      'No complete start–end interval identified. ' +
      'Read the original account for individual times.'
    );
  }

  if (
    /_false_4$/.test(
      String(subject?.scenarioId || '')
    )
  ) {
    lines.push(
      'Check the date as well as the time: ' +
      'these accounts discuss an attendance slip.'
    );
  }

  lines.push(
    'Times describe the account being given; ' +
    'they do not verify that it is true.'
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
      ? `Interval: ${note.rangeLabel}`
      : 'Interval: no complete range identified',
    summary
  ].join('\n');
}