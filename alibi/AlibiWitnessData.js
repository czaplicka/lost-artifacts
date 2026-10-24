// AlibiWitnessData.js — complete replacement, storage-schema compatible.
const WITNESS_TEXTURE_KEYS = ['npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'];
const WITNESS_ROLES = [
  { id: 'neighbor', label: 'Neighbor', tone: 'gossipy' },
  { id: 'coworker', label: 'Coworker', tone: 'matter_of_fact' },
  { id: 'receptionist', label: 'Receptionist', tone: 'chatty' }
];
export const ALIBI_DATA_VERSION = 4;
export const ALIBI_GENERATOR_REVISION = 3;
const WORK = [
  {
    "id": "curator",
    "occupations": [
      "museum curator",
      "museum island curator"
    ],
    "venue": "the public lecture room at a separate cultural centre",
    "activity": "giving an invited talk about exhibition objects",
    "roles": [
      "Lecture organiser",
      "Fellow speaker",
      "Venue caretaker"
    ],
    "joke": "Forty minutes about one vase. The vase declined questions."
  },
  {
    "id": "archaeology",
    "occupations": [
      "assistant archaeologist",
      "archaeologist's assistant"
    ],
    "venue": "the university teaching room",
    "activity": "attending a supervised finds-cataloguing workshop",
    "roles": [
      "Workshop tutor",
      "Fellow participant",
      "University porter"
    ],
    "joke": "We labelled the labels. Archaeology takes no chances."
  },
  {
    "id": "security",
    "occupations": [
      "night security guard",
      "security guard",
      "private security consultant"
    ],
    "venue": "the external security training room",
    "activity": "attending a practical first-aid assessment",
    "roles": [
      "Training instructor",
      "Fellow trainee",
      "Training centre caretaker"
    ],
    "joke": "The practice dummy declined to press charges."
  },
  {
    "id": "administration",
    "occupations": [
      "deputy director",
      "museum board member",
      "louvre sponsor's aide"
    ],
    "venue": "the chamber of commerce committee room",
    "activity": "attending an exhibition-funding hearing",
    "roles": [
      "Committee clerk",
      "Fellow delegate",
      "Venue caretaker"
    ],
    "joke": "The stapler budget survived another hostile amendment."
  },
  {
    "id": "archive",
    "occupations": [
      "archive clerk"
    ],
    "venue": "the municipal records training room",
    "activity": "attending a records-handling assessment",
    "roles": [
      "Records trainer",
      "Fellow clerk",
      "Municipal caretaker"
    ],
    "joke": "The attendance form had its own attendance form."
  },
  {
    "id": "design",
    "occupations": [
      "exhibition designer",
      "exhibit designer"
    ],
    "venue": "the trade association workshop room",
    "activity": "demonstrating a scale-model exhibition stand",
    "roles": [
      "Workshop organiser",
      "Fellow designer",
      "Workshop caretaker"
    ],
    "joke": "The miniature exit was the only affordable part."
  },
  {
    "id": "conservation",
    "occupations": [
      "restoration technician",
      "art conservator",
      "restoration intern",
      "monument restoration assistant",
      "notre-dame restoration volunteer"
    ],
    "venue": "the conservation training room at another institution",
    "activity": "taking part in a supervised conservation exercise",
    "roles": [
      "Conservation tutor",
      "Fellow participant",
      "Venue caretaker"
    ],
    "joke": "The practice object was already damaged. We documented the relief."
  },
  {
    "id": "guide",
    "occupations": [
      "museum guide",
      "tour guide",
      "old town guide",
      "heritage site guide",
      "street art tour guide",
      "seine riverboat guide",
      "river cruise guide",
      "auto-rickshaw tour guide",
      "vodka distillery tour guide"
    ],
    "venue": "the guide association classroom",
    "activity": "taking an indoor guide-accreditation assessment",
    "roles": [
      "Accreditation examiner",
      "Fellow candidate",
      "Association caretaker"
    ],
    "joke": "Nobody got lost. It was one room."
  },
  {
    "id": "insurance",
    "occupations": [
      "insurance assessor"
    ],
    "venue": "the insurers association meeting room",
    "activity": "attending a supervised valuation case review",
    "roles": [
      "Session chair",
      "Fellow assessor",
      "Building caretaker"
    ],
    "joke": "The broken teapot was insured for more than the chair."
  },
  {
    "id": "collector",
    "occupations": [
      "private collector",
      "antiques dealer",
      "antique print dealer",
      "antique camera dealer",
      "antique jewelry dealer",
      "rare book appraiser"
    ],
    "venue": "the collectors association seminar room",
    "activity": "attending a supervised provenance seminar",
    "roles": [
      "Seminar organiser",
      "Fellow attendee",
      "Association caretaker"
    ],
    "joke": "Everybody brought provenance. Nobody brought biscuits."
  },
  {
    "id": "courier",
    "occupations": [
      "art courier",
      "delivery courier",
      "bicycle courier",
      "bike messenger",
      "financial district courier"
    ],
    "venue": "the transport association training room",
    "activity": "taking a supervised fragile-cargo handling assessment",
    "roles": [
      "Cargo trainer",
      "Fellow trainee",
      "Training centre caretaker"
    ],
    "joke": "The practice crate contained paperwork. Extremely fragile paperwork."
  },
  {
    "id": "retail",
    "occupations": [
      "gift shop manager",
      "museum gift shop manager",
      "gift shop clerk",
      "bookshop clerk",
      "antique bookstore clerk"
    ],
    "venue": "the retail association classroom",
    "activity": "attending an inventory-control workshop",
    "roles": [
      "Workshop organiser",
      "Fellow retailer",
      "Venue caretaker"
    ],
    "joke": "Three souvenir magnets remained unaccounted for emotionally."
  },
  {
    "id": "facilities",
    "occupations": [
      "facilities supervisor",
      "cleaning staff supervisor",
      "night janitor",
      "temple caretaker"
    ],
    "venue": "the municipal maintenance classroom",
    "activity": "taking a practical building-safety assessment",
    "roles": [
      "Safety instructor",
      "Fellow trainee",
      "Municipal caretaker"
    ],
    "joke": "The leaking pipe was a demonstration. Allegedly."
  },
  {
    "id": "research",
    "occupations": [
      "research fellow"
    ],
    "venue": "the research institute seminar room away from the museum",
    "activity": "presenting research at a supervised seminar",
    "roles": [
      "Seminar chair",
      "Fellow researcher",
      "Institute porter"
    ],
    "joke": "A whole room of people had read the abstract. Suspicious."
  },
  {
    "id": "volunteers",
    "occupations": [
      "volunteer coordinator"
    ],
    "venue": "the volunteer association training room",
    "activity": "running a supervised volunteer induction",
    "roles": [
      "Induction organiser",
      "Fellow trainer",
      "Community caretaker"
    ],
    "joke": "The volunteers volunteered somebody else to take the minutes."
  }
];
const PERSONAL = [
  {
    "id": "baking",
    "venue": "the community baking classroom",
    "activity": "attending a one-off bread-making class",
    "roles": [
      "Baking tutor",
      "Fellow learner",
      "Community caretaker"
    ],
    "joke": "The bread rose. The conversation did not."
  },
  {
    "id": "dance",
    "venue": "the dance-school classroom",
    "activity": "attending an introductory dance workshop",
    "roles": [
      "Dance tutor",
      "Fellow learner",
      "School caretaker"
    ],
    "joke": "Two left feet. Neither is a criminal offence."
  },
  {
    "id": "pottery",
    "venue": "the community pottery room",
    "activity": "attending a beginners pottery class",
    "roles": [
      "Pottery tutor",
      "Fellow learner",
      "Community caretaker"
    ],
    "joke": "The bowl had character. No known structural integrity."
  },
  {
    "id": "theatre",
    "venue": "the amateur theatre rehearsal room",
    "activity": "attending an open acting workshop",
    "roles": [
      "Workshop director",
      "Fellow participant",
      "Theatre caretaker"
    ],
    "joke": "The fictional detective had misplaced the fictional evidence."
  },
  {
    "id": "language",
    "venue": "the adult education classroom",
    "activity": "attending a conversational language taster session",
    "roles": [
      "Language tutor",
      "Fellow learner",
      "College porter"
    ],
    "joke": "Everyone learned how to ask for coffee. Priorities."
  },
  {
    "id": "repair",
    "venue": "the community repair classroom",
    "activity": "attending a supervised household-repair workshop",
    "roles": [
      "Repair tutor",
      "Fellow learner",
      "Community caretaker"
    ],
    "joke": "Someone repaired a radio. It immediately complained."
  },
  {
    "id": "choir",
    "venue": "the community music room",
    "activity": "attending an open choir workshop",
    "roles": [
      "Choir tutor",
      "Fellow singer",
      "Community caretaker"
    ],
    "joke": "One person found the right note. We preserved it as evidence."
  },
  {
    "id": "firstaid",
    "venue": "the community first-aid classroom",
    "activity": "attending a public first-aid course",
    "roles": [
      "First-aid tutor",
      "Fellow learner",
      "Community caretaker"
    ],
    "joke": "The training dummy survived. Its dignity did not."
  }
];
function hash(value) {
  let n = 2166136261;
  for (const c of String(value)) { n ^= c.charCodeAt(0); n = Math.imul(n, 16777619); }
  return n >>> 0;
}
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(items, rng) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const pick = (items, rng) => items[Math.floor(rng() * items.length)];
const norm = value => String(value || '').trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
export function formatAlibiTime(minute) {
  if (!Number.isInteger(minute)) throw new Error('Alibi time must be an integer minute.');
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function selectSetting(occupation, rng) {
  const matches = WORK.filter(item => item.occupations.includes(norm(occupation)));
  // Unknown jobs use an explicitly private activity, never an invented profession.
  if (matches.length && rng() < 0.55) return { ...pick(matches, rng), contextType: 'professional' };
  return { ...pick(PERSONAL, rng), contextType: 'personal' };
}
function buildAccounts(kind, c, thief) {
  const { n, v, a, b, t, activity, intro, roles, joke } = c;
  const entry = (minute, statement, summary) => ({ minute, statement, summary });
  if (!thief) {
    switch (kind) {
      case 0:
        return { explanation: null, entries: [
          entry(a - 20, `${intro} I checked ${n}'s photo ID on arrival at ${t(a - 20)}. The session took place at ${v}, away from the crime scene.`, `${n} arrived at ${v}; identity checked.`),
          entry(a - 10, `I was beside ${n} at ${v} continuously from ${t(a - 10)} to ${t(b + 10)}. They were ${activity}; I saw them throughout, with no break or substitution. ${joke}`, `Continuous observation at ${v} until ${t(b + 10)}.`),
          entry(b + 20, `I saw ${n} leave ${v} at ${t(b + 20)}. Before that I had been in the room from ${t(a - 5)} to ${t(b + 5)}, watching the same session. Nobody left during that interval.`, `Departure after the session; a second observer covers the theft.`)
        ] };
      case 1:
        return { explanation: null, entries: [
          entry(a - 15, `${intro} At ${v}, away from the crime scene, I checked ${n}'s ID at ${t(a - 15)}. I personally supervised them until ${t(a)}. The ${roles[1]} joined before I left.`, `First observer stays with ${n} until ${t(a)}.`),
          entry(a - 5, `At ${t(a - 5)} I joined ${n} and the ${roles[0]} at ${v}. I stayed beside ${n} continuously until ${t(b + 15)} while they were ${activity}. The handover had a five-minute overlap.`, `Second observer takes over before the first leaves.`),
          entry(b + 20, `At ${t(b + 20)} I countersigned the attendance sheet. I personally witnessed the handover at ${t(a)} and stayed in the room until ${t(b + 15)}. ${n} did not leave. ${joke}`, `Attendance and the overlapping supervision are corroborated.`)
        ] };
      case 2:
        return { explanation: null, entries: [
          entry(a - 25, `${intro} I checked ${n}'s photo ID at ${v} at ${t(a - 25)}. We stayed face to face until ${t(b + 5)}, ${activity}. The venue is away from the crime scene.`, `A face-to-face session begins at ${v}.`),
          entry(a - 10, `From ${t(a - 10)} to ${t(b + 10)} I was sitting directly opposite ${n} at ${v}. They spoke to me repeatedly during the session; nobody left or changed places.`, `A second participant observes ${n} throughout the theft.`),
          entry(b + 15, `I collected the signed session sheets at ${t(b + 15)}. I had remained in the room from ${t(a - 5)} until then, and ${n} stayed there throughout. ${joke}`, `A third observer confirms continued presence.`)
        ] };
      default:
        return { explanation: null, entries: [
          entry(a - 20, `${intro} At ${t(a - 20)} I checked ${n}'s ID at ${v}, away from the crime scene, and began the supervised session. I was next to them until ${t(b)}.`, `Supervision starts before the theft.`),
          entry(a - 5, `I joined the session at ${v} at ${t(a - 5)}. I watched ${n} continuously until ${t(b + 20)}, ${activity}. The ${roles[0]} was also present until ${t(b)}.`, `Overlapping direct observation continues past the theft.`),
          entry(b + 25, `At ${t(b + 25)} I locked up ${v}. I had personally observed ${n} and both other witnesses from ${t(a)} to ${t(b)}. Nobody left during the theft window. ${joke}`, `A third observer confirms the complete theft window.`)
        ] };
    }
  }
  switch (kind) {
    case 0:
      return { explanation: 'The person claiming to host a private meeting was independently observed at the session venue for the whole interval.', entries: [
        entry(a - 5, `${intro} The session was moved to my apartment. ${n} was with me there continuously from ${t(a - 5)} to ${t(b + 5)}, ${activity}. We did not go to ${v}.`, `A private meeting away from ${v} is claimed.`),
        entry(a - 15, `I worked face to face with the ${roles[0]} at ${v} from ${t(a - 15)} to ${t(b + 15)}. That person never left. ${n} did not attend.`, `The claimed host was continuously at ${v}.`),
        entry(a - 10, `From ${t(a - 10)} to ${t(b + 10)} I too was in the room at ${v}. The ${roles[0]} and ${roles[1]} stayed there together throughout. Nobody moved the session to an apartment. ${joke}`, `A second observer corroborates the host's location.`)
      ] };
    case 1:
      return { explanation: 'A claimed indoor meeting conflicts with a sealed room and independent continuous observation of its only entrance.', entries: [
        entry(a - 5, `${intro} ${n} was inside ${v} with me from ${t(a - 5)} until ${t(b + 5)}, ${activity}.`, `An indoor meeting at ${v} is claimed.`),
        entry(a - 20, `At ${t(a - 20)} I evacuated ${v} because of a water leak. I checked it was empty, locked its only door and put a numbered seal over it. I held the only key until ${t(b + 20)}.`, `The empty room was locked and sealed.`),
        entry(a - 10, `I watched the only door of ${v} continuously from ${t(a - 10)} to ${t(b + 10)}. The numbered seal remained intact and nobody entered. I checked its number against the closure sheet. ${joke}`, `The sealed entrance remained continuously observed.`)
      ] };
    case 2:
      return { explanation: 'Uninterrupted attendance is disproved by an identified departure and a second observer confirming no return.', entries: [
        entry(a - 20, `${intro} ${n} arrived at ${v} at ${t(a - 20)} and stayed with me until ${t(b + 10)}, ${activity}. Neither of us left the room.`, `Uninterrupted attendance is claimed.`),
        entry(a - 15, `At ${t(a - 15)} I returned a wallet to ${n}, checked the photo ID with them and watched them leave ${v}. I remained at the only entrance until ${t(b + 15)}; they never came back.`, `The identified suspect left before the theft.`),
        entry(a - 10, `At ${t(a - 10)} I joined the ${roles[1]} at the only entrance to ${v}. I personally know ${n}; they were absent, and did not return before ${t(b + 10)}. ${joke}`, `A second observer confirms no return during the theft.`)
      ] };
    case 3:
      return { explanation: 'Attendance before the theft is contradicted by two independent observations that the suspect first arrived afterwards.', entries: [
        entry(a - 10, `${intro} ${n} was already beside me at ${v} by ${t(a - 10)} and remained until ${t(b + 20)}, ${activity}.`, `Attendance before the theft is claimed.`),
        entry(b + 5, `I staffed the only entrance to ${v} from opening. ${n} first arrived at ${t(b + 5)}; I checked their photo ID and recorded their first admission. They had not been inside earlier that day.`, `The suspect first entered after the theft.`),
        entry(b + 10, `At ${t(b + 10)} I signed the late-arrival note with ${n}. I had been at the same entrance since before ${t(a - 10)} and saw their first arrival at ${t(b + 5)}. ${joke}`, `A second observer corroborates the late arrival.`)
      ] };
    case 4:
      return { explanation: 'A real meeting from the previous day is being presented as an alibi for the theft day.', entries: [
        entry(a - 15, `${intro} On the day of the theft, ${n} met me at ${v} at ${t(a - 15)}. We remained together until ${t(b + 15)}, ${activity}. Their signed attendance slip proves it.`, `A meeting on the theft day is claimed.`),
        entry(a - 10, `At ${t(a - 10)} on the theft day I checked the original attendance slip. Its printed date and register number belong to the previous day, when I personally admitted ${n}. There was no booking for them today.`, `The original attendance slip is from the previous day.`),
        entry(a - 5, `At ${t(a - 5)} on the theft day I checked the original bound register against the slip. Both say the previous day. I witnessed that earlier session myself; I did not see ${n} at today's session. ${joke}`, `A second check confirms the previous-day appointment.`)
      ] };
    default:
      return { explanation: 'A genuine short visit ending before the theft is falsely extended to cover the entire theft window.', entries: [
        entry(a - 25, `${intro} ${n} was at ${v} with me from ${t(a - 25)} until ${t(b + 10)}, ${activity}. Their signed attendance sheet is authentic.`, `A visit is claimed to last throughout the theft.`),
        entry(a - 10, `I personally watched ${n} sign out and leave ${v} at ${t(a - 10)}. The authentic sheet records that exact departure. I stayed at the only entrance until ${t(b + 15)} and they did not return.`, `The authentic sheet records departure before the theft.`),
        entry(a - 5, `At ${t(a - 5)} I checked that signed sheet with the ${roles[1]}. I had also watched ${n} leave at ${t(a - 10)}. I then stayed at the entrance until ${t(b + 10)}; there was no return. ${joke}`, `A second observer verifies the short visit ended before the theft.`)
      ] };
  }
}

export function generateAlibiWitnesses(suspect, caseSeed = 'default_case', crimeWindow) {
  if (!suspect?.id) throw new Error('An alibi suspect with an ID is required.');
  const w = crimeWindow;
  if (!w || !Number.isInteger(w.day) || !Number.isInteger(w.startMinute) || !Number.isInteger(w.endMinute) ||
      w.startMinute < 30 || w.endMinute <= w.startMinute || w.endMinute > 1409) {
    throw new Error('A valid crimeWindow with a 30-minute day margin is required.');
  }
  const thief = suspect.hiddenCaseData?.isTrueThief === true;
  const twin = suspect.hiddenCaseData?.isForensicTwin === true;
  if (thief === twin) throw new Error('Alibi suspect must be either the real thief or the forensic twin.');
  const occupation = String(suspect.occupation || suspect.publicProfile?.occupation || '').trim();
  const name = suspect.name || 'The suspect';
  const rng = random(hash(`${caseSeed}:${suspect.id}:${name}:${norm(occupation)}:${w.day}:${w.startMinute}:${w.endMinute}`));
  const setting = selectSetting(occupation, rng);
  const pattern = Math.floor(rng() * (thief ? 6 : 4));
  const internalRoles = shuffle(WITNESS_ROLES, rng);
  const portraits = shuffle(WITNESS_TEXTURE_KEYS, rng);
  const intro = setting.contextType === 'professional'
    ? `${name}${occupation ? ', the ' + occupation : ''} was booked for a professional session: ${setting.activity}.`
    : `${name}${occupation ? ' works as a ' + occupation + '. This' : ': this'} was a personal booking, not a work duty: ${setting.activity}.`;
  const built = buildAccounts(pattern, {
    n: name, v: setting.venue, a: w.startMinute, b: w.endMinute,
    t: formatAlibiTime, activity: setting.activity, roles: setting.roles,
    joke: setting.joke, intro
  }, thief);
  const connection = suspect.publicProfile?.caseConnection || suspect.caseConnection;
  const contextNote = typeof connection === 'string' && connection.trim()
    ? ` Separately, the case file records: "${connection.trim()}" That does not establish their whereabouts during the theft.` : '';
  const cards = built.entries.map((entry, i) => ({
    id: `${suspect.id}_alibi_account_${i + 1}`,
    minute: entry.minute, timeSlot: formatAlibiTime(entry.minute),
    locationTag: setting.id, roleId: internalRoles[i].id, role: setting.roles[i],
    label: `${formatAlibiTime(entry.minute)} — ${entry.summary}`,
    isReal: !(thief && i === 0)
  }));
  const witnesses = built.entries.map((entry, i) => ({
    npcId: `${suspect.id}_witness_${internalRoles[i].id}`,
    suspectId: suspect.id, roleId: internalRoles[i].id, role: setting.roles[i],
    tone: internalRoles[i].tone, portraitKey: portraits[i], textureKey: portraits[i],
    isLiar: thief && i === 0,
    statement: entry.statement + (i === 2 ? contextNote : ''),
    contradictionHint: null, timelineCard: cards[i], motiveFragment: null
  }));
  return {
    version: ALIBI_DATA_VERSION, generatorRevision: ALIBI_GENERATOR_REVISION,
    suspectId: suspect.id, suspectName: name, crimeWindow: { ...w },
    alibiType: thief ? 'contradicted' : 'confirmed',
    scenarioId: `${setting.contextType}_${setting.id}_${thief ? 'false' : 'true'}_${pattern}`,
    scenarioContext: { type: setting.contextType, occupation, venue: setting.venue, activity: setting.activity },
    witnesses: shuffle(witnesses, rng),
    contradiction: thief ? {
      witnessRoleId: internalRoles[0].id, supportingRoleId: internalRoles[1].id,
      explanation: built.explanation
    } : null,
    trueTimeline: [...cards].sort((a, b) => a.minute - b.minute),
    boardCards: shuffle(cards, rng)
  };
}
export const AlibiWitnessData = {
  WITNESS_ROLES, WITNESS_TEXTURE_KEYS, generateAlibiWitnesses, formatAlibiTime
};