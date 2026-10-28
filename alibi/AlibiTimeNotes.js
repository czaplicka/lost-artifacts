import { gameState } from '../GameData.js';

export function formatNoteTime(minute) {
  if (!Number.isInteger(minute)) return '?';

  return (
    String(Math.floor(minute / 60)).padStart(2, '0') +
    ':' +
    String(minute % 60).padStart(2, '0')
  );
}

function interval(start, end, label, dayLabel = 'Theft day') {
  return {
    startMinute: start,
    endMinute: end,
    label,
    dayLabel
  };
}

function findStoredSubject(caseKey, suspectId) {
  return gameState.caseData?.alibiCases?.[caseKey]
    ?.suspects?.find(item => item.suspectId === suspectId);
}

function getAccountIndex(cardId) {
  const match = String(cardId || '').match(
    /_alibi_account_([1-3])$/
  );

  return match ? Number(match[1]) - 1 : -1;
}

function getScenarioIntervals(subject) {
  const window = subject?.crimeWindow;

  if (!window) return null;

  const a = window.startMinute;
  const b = window.endMinute;

  const match = String(subject.scenarioId || '').match(
    /_(true|false)_([0-5])$/
  );

  if (!match) return null;

  const confirmed = match[1] === 'true';
  const pattern = Number(match[2]);

  if (confirmed) {
    switch (pattern) {
      case 0:
        return [
          [],
          [
            interval(
              a - 10,
              b + 10,
              'Continuous observation'
            )
          ],
          [
            interval(
              a - 5,
              b + 5,
              'Observation before departure'
            )
          ]
        ];

      case 1:
        return [
          [
            interval(
              a - 15,
              a,
              'First observer'
            )
          ],
          [
            interval(
              a - 5,
              b + 15,
              'Second observer'
            )
          ],
          [
            interval(
              a,
              b + 15,
              'Observation after handover'
            )
          ]
        ];

      case 2:
        return [
          [
            interval(
              a - 25,
              b + 5,
              'Face-to-face session'
            )
          ],
          [
            interval(
              a - 10,
              b + 10,
              'Direct observation'
            )
          ],
          [
            interval(
              a - 5,
              b + 15,
              'Observation in the room'
            )
          ]
        ];

      case 3:
        return [
          [
            interval(
              a - 20,
              b,
              'First observer'
            )
          ],
          [
            interval(
              a - 5,
              b + 20,
              'Second observer'
            )
          ],
          [
            interval(
              a,
              b,
              'Observation during the theft window'
            )
          ]
        ];

      default:
        return null;
    }
  }

  switch (pattern) {
    case 0:
      return [
        [
          interval(
            a - 5,
            b + 5,
            'Claimed meeting at the apartment'
          )
        ],
        [
          interval(
            a - 15,
            b + 15,
            'Observation of the claimed host'
          )
        ],
        [
          interval(
            a - 10,
            b + 10,
            'Observation of the session'
          )
        ]
      ];

    case 1:
      return [
        [
          interval(
            a - 5,
            b + 5,
            'Claimed indoor meeting'
          )
        ],
        [
          interval(
            a - 20,
            b + 20,
            'Room locked; only key retained'
          )
        ],
        [
          interval(
            a - 10,
            b + 10,
            'Continuous observation of the sealed door'
          )
        ]
      ];

    case 2:
      return [
        [
          interval(
            a - 20,
            b + 10,
            'Claimed uninterrupted attendance'
          )
        ],
        [
          interval(
            a - 15,
            b + 15,
            'Entrance watched after departure'
          )
        ],
        [
          interval(
            a - 10,
            b + 10,
            'Entrance watched; no return reported'
          )
        ]
      ];

    case 3:
      return [
        [
          interval(
            a - 10,
            b + 20,
            'Claimed attendance'
          )
        ],
        [],
        [
          interval(
            a - 10,
            b + 5,
            'Entrance watched before first arrival'
          )
        ]
      ];

    case 4:
      return [
        [
          interval(
            a - 15,
            b + 15,
            'Meeting claimed for the theft day'
          )
        ],
        [],
        []
      ];

    case 5:
      return [
        [
          interval(
            a - 25,
            b + 10,
            'Claimed length of the visit'
          )
        ],
        [
          interval(
            a - 10,
            b + 15,
            'Entrance watched after sign-out'
          )
        ],
        [
          interval(
            a - 5,
            b + 10,
            'Entrance watched; no return reported'
          )
        ]
      ];

    default:
      return null;
  }
}

export function getAlibiTimeNote(caseKey, suspectId, card) {
  const subject = findStoredSubject(caseKey, suspectId);
  const index = getAccountIndex(card?.id);
  const scenarioIntervals = getScenarioIntervals(subject);

  const ranges = index >= 0 && scenarioIntervals
    ? scenarioIntervals[index] || []
    : [];

  const eventTime = Number.isInteger(card?.minute)
    ? card.minute
    : null;

  return {
    eventTime,
    ranges,
    hasKnownScenario: Boolean(scenarioIntervals),
    eventLabel: eventTime === null
      ? 'Event time not recorded'
      : `Event: ${formatNoteTime(eventTime)}`,
    rangeLabel: ranges.length
      ? ranges.map(item =>
          `${formatNoteTime(item.startMinute)}–` +
          `${formatNoteTime(item.endMinute)}`
        ).join(' / ')
      : 'Single event / no bounded observation stated'
  };
}

export function getAlibiTimeDetail(caseKey, suspectId, card) {
  const note = getAlibiTimeNote(caseKey, suspectId, card);
  const subject = findStoredSubject(caseKey, suspectId);

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
    lines.push('No bounded observation interval stated.');
  }

  if (/_false_4$/.test(String(subject?.scenarioId || ''))) {
    lines.push(
      'Check the date as well as the time: these accounts discuss an attendance slip.'
    );
  }

  lines.push(
    'Times describe the account being given; they do not verify that it is true.'
  );

  return lines.join('\n');
}

export function getAlibiCardBody(caseKey, suspectId, card) {
  const note = getAlibiTimeNote(caseKey, suspectId, card);

  const summary = String(card?.label || '')
    .replace(/^\d{2}:\d{2}\s*[—–-]\s*/, '');

  return [
    note.eventLabel,
    note.ranges.length
      ? `Interval: ${note.rangeLabel}`
      : 'Interval: not stated',
    summary
  ].join('\n');
}