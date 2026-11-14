// AlibiWitnessData.js
const WITNESS_TEXTURE_KEYS = ['npc', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'];
const WITNESS_ROLES = [
  { id: 'neighbor', label: 'Neighbor', tone: 'gossipy' },
  { id: 'coworker', label: 'Coworker', tone: 'matter_of_fact' },
  { id: 'receptionist', label: 'Receptionist', tone: 'chatty' }
];
export const ALIBI_DATA_VERSION = 5;
export const ALIBI_GENERATOR_REVISION = 4;

// Private activities do not invent or depend on a suspect's occupation.
const SETTINGS = [
  ['baking', 'the community bakery kitchen', 'taking part in a bread-making session', ['Baker', 'Fellow baker', 'Kitchen supervisor'], 'The sourdough had a stronger personality than most of the guests.'],
  ['dance', 'the dance-school studio', 'practising a beginners dance routine', ['Dance instructor', 'Dance partner', 'Studio manager'], 'Two left feet. Neither matched the instructor.'],
  ['pottery', 'the pottery studio', 'making a bowl at a pottery session', ['Pottery tutor', 'Fellow potter', 'Studio assistant'], 'The bowl was declared abstract before anyone could declare it broken.'],
  ['theatre', 'the community theatre rehearsal room', 'rehearsing a scene', ['Director', 'Scene partner', 'Stage manager'], 'The murder was fictional. The criticism was not.'],
  ['language', 'the adult education language room', 'practising a conversation exercise', ['Language tutor', 'Conversation partner', 'Course coordinator'], 'Everyone could order coffee. Nobody could explain the homework.'],
  ['repair', 'the community repair workshop', 'repairing a household radio', ['Repair tutor', 'Fellow repairer', 'Workshop supervisor'], 'The radio recovered just in time to deliver bad news.'],
  ['choir', 'the community choir room', 'rehearsing with the choir', ['Choir conductor', 'Fellow singer', 'Music-room supervisor'], 'We found the right note eventually. It had been hiding in another song.'],
  ['firstaid', 'the first-aid training room', 'performing a first-aid assessment', ['First-aid instructor', 'Practice partner', 'Course assistant'], 'The dummy remained professionally unresponsive.'],
  ['dinner', 'the restaurant private dining room', 'having a long dinner', ['Dinner companion', 'Waiter', 'Dining-room manager'], 'The soup was cold. The argument about the bill was not.'],
  ['chess', 'the chess club tournament room', 'playing a supervised chess match', ['Opponent', 'Tournament referee', 'Match recorder'], 'The bishop travelled diagonally. Everybody else used the door.'],
  ['dentist', 'the dental practice treatment room', 'undergoing a dental procedure', ['Dentist', 'Dental nurse', 'Clinical assistant'], 'The conversation was limited, but surprisingly honest.'],
  ['lift', 'the stalled lift in a separate office building', 'waiting inside the stalled lift', ['Fellow passenger', 'Lift technician', 'Building supervisor'], 'The emergency music had a second emergency inside it.'],
  ['nightshift', 'the warehouse packing room', 'working at a packing station', ['Shift supervisor', 'Packing partner', 'Quality inspector'], 'We packed boxes into bigger boxes. Management called it growth.'],
  ['dogs', 'the indoor dog-training arena', 'taking part in a dog-training session', ['Dog trainer', 'Fellow handler', 'Arena supervisor'], 'The dog passed. The human was advised to repeat the course.'],
  ['dumplings', 'the dumpling contest hall', 'competing in a dumpling-eating contest', ['Contest referee', 'Fellow contestant', 'Event medic'], 'The scoreboard said twelve. The suspect requested witness protection.'],
  ['neighbours', 'the residents association meeting room', 'arguing about a noisy household appliance', ['Neighbour', 'Residents chair', 'Meeting secretary'], 'The blender had been named as a co-defendant.'],
  ['broadcast', 'the community television studio', 'taking part in an in-person broadcast rehearsal', ['Studio director', 'Camera operator', 'Floor manager'], 'The audience applause was recorded. The awkward silence was live.'],
  ['bingo', 'the bingo club hall', 'playing a supervised bingo round', ['Bingo caller', 'Table neighbour', 'Floor steward'], 'Somebody shouted murder. They meant number thirty.'],
  ['karaoke', 'the karaoke venue private room', 'singing at a private karaoke session', ['Karaoke host', 'Duet partner', 'Room attendant'], 'The high note remains a matter for the authorities.'],
  ['tailor', 'the tailoring shop fitting room', 'having a suit fitted', ['Tailor', 'Fitting assistant', 'Shop partner'], 'The trousers had a motive, but no opportunity.'],
  ['hairdresser', 'the hair salon treatment room', 'having a lengthy hair treatment', ['Hairdresser', 'Salon assistant', 'Salon manager'], 'The colour was described as innocent auburn.'],
  ['cards', 'the bridge club game room', 'playing a supervised bridge match', ['Playing partner', 'Opponent', 'Club referee'], 'Four people agreed on the time. Nothing else.'],
  ['painting', 'the community art studio', 'painting a still life', ['Art tutor', 'Fellow painter', 'Studio monitor'], 'The fruit looked guilty. Especially the pear.'],
  ['magic', 'the amateur magic club rehearsal room', 'practising a card trick', ['Magic tutor', 'Practice partner', 'Club secretary'], 'No disappearing people were permitted. We checked.'],
  ['radio', 'the amateur radio club equipment room', 'taking a practical radio assessment', ['Radio examiner', 'Fellow operator', 'Club technician'], 'The emergency biscuit frequency was unusually busy.'],
  ['flowers', 'the florist workshop room', 'making a flower arrangement', ['Floristry tutor', 'Fellow participant', 'Workshop assistant'], 'The bouquet expressed regret. Mostly about the colour scheme.'],
  ['boardgames', 'the board-game cafe tournament room', 'playing a supervised board-game final', ['Opponent', 'Tournament host', 'Scorekeeper'], 'The rules explanation lasted longer than the game.'],
  ['auction', 'the auction house inspection room', 'examining a collection under supervision', ['Auction specialist', 'Fellow collector', 'Room attendant'], 'Nobody bid on the biscuits. Their provenance was doubtful.'],
  ['sewing', 'the sewing club workroom', 'working on a shared sewing project', ['Sewing tutor', 'Fellow member', 'Club organiser'], 'There was a cover-up. It was a duvet.'],
  ['mediation', 'the community mediation room', 'taking part in a face-to-face mediation session', ['Mediator', 'Other participant', 'Co-mediator'], 'Both sides agreed the chair was uncomfortable. Progress.'],
  ['quiz', 'the quiz club competition room', 'competing in a supervised quiz final', ['Quiz host', 'Team partner', 'Scorekeeper'], 'The answer was not the butler. For once.'],
  ['fitness', 'the fitness centre assessment room', 'taking a supervised fitness assessment', ['Fitness instructor', 'Assessment partner', 'Centre supervisor'], 'The only thing running away was enthusiasm.']
].map(([id, venue, activity, roles, joke]) => ({ id, venue, activity, roles, joke }));

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
export function formatAlibiTime(minute) {
  if (!Number.isInteger(minute)) throw new Error('Alibi time must be an integer minute.');
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function buildAccounts(kind, c, thief) {
  const { n, v, a, b, t, activity, roles, joke, day } = c;
  const e = (minute, statement, summary) => ({ minute, statement, summary });
  const full = `${t(a - 5)} to ${t(b + 5)}`;
  const intro = `On case day ${day}, at ${v}, away from the crime scene,`;
  let explanation = null;
  let entries;
  if (!thief) {
    switch (kind) {
      case 0:
        entries = [
          e(a - 20, `${intro} I checked ${n}'s photo ID at ${t(a - 20)}. I stayed face to face with them until ${t(b + 5)} while they were ${activity}. There were no breaks.`, 'Identity checked; continuous face-to-face presence.'),
          e(a - 5, `I was directly beside ${n} at ${v} from ${full}. I watched them throughout and saw no departure or substitution. ${joke}`, 'A second observer covers the entire theft window.'),
          e(b + 15, `At ${t(b + 15)} I recorded ${n}'s departure. I had been in the same room, watching them from ${t(a - 5)} until then.`, 'A third observer confirms presence until after the theft.')
        ]; break;
      case 1:
        entries = [
          e(a - 20, `${intro} I checked ${n}'s ID and stayed beside them from ${t(a - 20)} to ${t(a + 1)}. The ${roles[1]} joined us at ${t(a - 5)} before I left.`, 'First observer confirms identity and an overlapping handover.'),
          e(a - 5, `I joined ${n} and the ${roles[0]} at ${v} at ${t(a - 5)}. I stayed beside ${n} without a break until ${t(b + 15)} while they were ${activity}.`, 'Second observer takes over before the first leaves.'),
          e(b + 20, `At ${t(b + 20)} I countersigned the attendance record. I personally saw the handover and watched ${n} continuously from ${t(a - 5)} to ${t(b + 15)}. ${joke}`, 'A third observer independently corroborates the handover.')
        ]; break;
      case 2:
        entries = [
          e(a - 15, `${intro} I checked ${n}'s photo ID at ${t(a - 15)}. I supervised them without interruption until ${t(b + 10)}. They were ${activity}.`, 'The identified participant is continuously supervised.'),
          e(a - 5, `At ${v}, I stayed directly opposite ${n} from ${full}. We spoke throughout. I would have noticed anyone leaving or replacing them.`, 'Face-to-face interaction covers the theft window.'),
          e(b + 20, `At ${t(b + 20)} we reviewed the original continuous room video together. I had also been there throughout ${full}; I can identify ${n} in person and on the video. There are no cuts or absences. ${joke}`, 'Direct observation is backed by an uninterrupted recording.')
        ]; break;
      case 3:
        entries = [
          e(a - 15, `${intro} ${n} arrived at ${t(a - 15)}. I checked their ID. We stayed together until ${t(b + 10)}, ${activity}. They asked me not to mention it.`, 'An embarrassing activity is admitted, with continuous observation.'),
          e(a - 5, `I saw ${n} at ${v} throughout ${full}. They were embarrassed, not absent. I watched their face the whole time. ${joke}`, 'A second witness confirms the embarrassing but genuine account.'),
          e(b + 15, `At ${t(b + 15)} I signed the session record. I had watched ${n} continuously from ${t(a - 5)} until ${t(b + 10)}. Nobody left.`, 'A third witness confirms no gap in attendance.')
        ]; break;
      case 4:
        entries = [
          e(a - 20, `${intro} I checked ${n}'s ID at ${t(a - 20)}. They were ${activity}. I stayed beside them until ${t(b + 10)}.`, 'Identity and continuous presence are established.'),
          e(a - 5, `I originally wrote ${t(a + 5)} as my arrival time, but that was a copying error. The original signed log says ${t(a - 5)}. From then until ${t(b + 5)} I watched ${n} without interruption at ${v}.`, 'A witness openly corrects a clerical error using the original log.'),
          e(b + 15, `At ${t(b + 15)} I checked the original log: ${roles[1]} arrived at ${t(a - 5)}, not ${t(a + 5)}. I was there and saw both witnesses with ${n} throughout the theft. ${joke}`, 'Independent observation and the original record confirm the correction.')
        ]; break;
      default:
        entries = [
          e(a - 15, `${intro} I checked ${n}'s photo ID at ${t(a - 15)} and watched them continuously until ${t(b + 10)}, ${activity}.`, 'Direct supervision begins before the theft.'),
          e(a - 5, `The card reader at ${v} failed. That does not mean ${n} was absent: I stood beside them throughout ${full} and checked their identity myself.`, 'A missing electronic record is explained by direct observation.'),
          e(b + 15, `At ${t(b + 15)} I filed the reader fault report. I had personally watched ${n} and both other witnesses from ${t(a - 5)} to ${t(b + 10)}. They never left. ${joke}`, 'An independently witnessed equipment failure is not a gap in presence.')
        ];
    }
  } else {
    switch (kind) {
      case 0:
        explanation = 'The alleged private host was continuously observed elsewhere by two independent witnesses.';
        entries = [
          e(a - 5, `On case day ${day}, ${n} was at my apartment with me from ${full}, ${activity}. We never went to ${v}.`, 'A private meeting with this witness is claimed.'),
          e(a - 15, `On case day ${day}, I worked face to face with the ${roles[0]} at ${v} from ${t(a - 15)} to ${t(b + 15)}. They never left. ${n} was not there.`, 'The claimed host was continuously somewhere else.'),
          e(a - 10, `I watched the ${roles[0]} and ${roles[1]} together at ${v} from ${t(a - 10)} to ${t(b + 10)}. The ${roles[0]} could not also have been hosting an apartment meeting. ${joke}`, 'A second observer corroborates the host location.')
        ]; break;
      case 1:
        explanation = 'The claimed meeting room was empty, locked and sealed throughout the theft.';
        entries = [
          e(a - 5, `${intro} ${n} was inside the room with me from ${full}, ${activity}.`, 'Attendance in the room is claimed.'),
          e(a - 20, `On case day ${day}, I checked ${v} was empty at ${t(a - 20)}, locked its only entrance and applied a numbered seal. There is no other access. I held the only key until ${t(b + 20)}.`, 'The empty room was locked and sealed.'),
          e(a - 10, `I watched the only entrance to ${v} continuously from ${t(a - 10)} to ${t(b + 10)}. The seal matched the closure record and remained unbroken. Nobody entered. ${joke}`, 'Independent observation confirms the room stayed inaccessible.')
        ]; break;
      case 2:
        explanation = 'Two witnesses identify a departure before the theft and confirm there was no return.';
        entries = [
          e(a - 20, `${intro} ${n} stayed with me from ${t(a - 20)} to ${t(b + 10)}, ${activity}. Neither of us left.`, 'Unbroken attendance is claimed.'),
          e(a - 15, `I checked ${n}'s photo ID while returning their wallet at ${t(a - 15)} on case day ${day}. Then I watched them leave ${v}. I remained at its only entrance until ${t(b + 15)}; they did not return.`, 'The identified suspect left before the theft.'),
          e(a - 10, `I personally know ${n}. At ${t(a - 10)} I joined the ${roles[1]} at the only entrance to ${v}. ${n} was absent and did not return before ${t(b + 10)}. ${joke}`, 'A second witness confirms no return during the theft.')
        ]; break;
      case 3:
        explanation = 'Two entrance witnesses establish that the first arrival was after the theft.';
        entries = [
          e(a - 10, `${intro} ${n} was already with me by ${t(a - 10)} and stayed until ${t(b + 20)}, ${activity}.`, 'Arrival before the theft is claimed.'),
          e(b + 5, `On case day ${day}, I staffed the only entrance to ${v} from opening. ${n} first arrived at ${t(b + 5)}. I checked their photo ID. They had not entered earlier.`, 'The first admission occurred after the theft.'),
          e(b + 10, `I signed ${n}'s late-arrival note at ${t(b + 10)}. I had watched the same entrance since before ${t(a - 10)} and saw their first arrival at ${t(b + 5)}. ${joke}`, 'An independent witness corroborates the late arrival.')
        ]; break;
      case 4:
        explanation = 'A genuine meeting on the previous day is falsely dated to the theft day.';
        entries = [
          e(a - 15, `${intro} ${n} met me at ${t(a - 15)} and stayed until ${t(b + 15)}, ${activity}. Their signed attendance slip proves this was the theft day.`, 'A signed slip is presented as proof of the theft-day meeting.'),
          e(a - 10, `At ${t(a - 10)} on case day ${day}, I checked that original slip. Its date and register number belong to day ${day - 1}. I personally admitted ${n} then, not today.`, 'The original slip belongs to the previous day.'),
          e(a - 5, `At ${t(a - 5)} on case day ${day}, I checked the bound register against the slip. Both specify day ${day - 1}. I witnessed that earlier session myself. ${joke}`, 'An independent source confirms the earlier date.')
        ]; break;
      case 5:
        explanation = 'An authentic short visit ended before the theft, not afterwards as claimed.';
        entries = [
          e(a - 25, `${intro} ${n} stayed with me from ${t(a - 25)} to ${t(b + 10)}, ${activity}. The attendance sheet is authentic.`, 'An authentic visit is claimed to cover the theft.'),
          e(a - 10, `On case day ${day}, I watched ${n} sign out and leave ${v} at ${t(a - 10)}. The original sheet records that time. I stayed at the only entrance until ${t(b + 15)}; there was no return.`, 'The authentic sheet records departure before the theft.'),
          e(a - 5, `At ${t(a - 5)} I checked the sheet with the ${roles[1]}. I had also watched ${n} leave at ${t(a - 10)}. I watched the entrance until ${t(b + 10)}; they did not return. ${joke}`, 'A second witness confirms the early departure.')
        ]; break;
      case 6:
        explanation = 'The booking is real, but two witnesses confirm that the named suspect never attended.';
        entries = [
          e(a - 15, `${intro} ${n} was with me from ${t(a - 15)} until ${t(b + 10)}, ${activity}. The booking in their name proves they attended.`, 'A booking is treated as proof of personal attendance.'),
          e(a - 10, `On case day ${day}, I handled the sole entrance to ${v} from opening until ${t(b + 15)}. I checked every attendee's photo ID. ${n}'s booking was marked no-show; they never entered.`, 'ID checks establish that the booking holder did not attend.'),
          e(b + 20, `At ${t(b + 20)} I reconciled the booking with the signed admission register. I had stood beside the ${roles[1]} throughout all admissions and can independently confirm ${n} never arrived. ${joke}`, 'The no-show is independently corroborated.')
        ]; break;
      case 7:
        explanation = 'The entry record belongs to the suspect card, but a different identified person used it.';
        entries = [
          e(a - 10, `${intro} ${n} was beside me from ${t(a - 10)} until ${t(b + 10)}, ${activity}. Their access-card scan proves they personally entered.`, 'A card scan is presented as proof of the owner presence.'),
          e(a - 5, `At ${t(a - 5)} on case day ${day}, I checked the card scan against the entrance video. The user was not ${n}: I checked that visitor's own photo ID and recorded a borrowed-card incident.`, 'The card was used by a different identified visitor.'),
          e(b + 15, `At ${t(b + 15)} I countersigned that incident report. I personally witnessed the visitor's ID check and staffed the only entrance from opening until ${t(b + 10)}. ${n} never entered. ${joke}`, 'A second witness confirms substitution and no attendance by the suspect.')
        ]; break;
      case 8:
        explanation = 'A genuine video from the previous day is falsely described as live theft-day footage.';
        entries = [
          e(a - 10, `${intro} ${n} was with me throughout ${t(a - 10)} to ${t(b + 10)}, ${activity}. The video being shown today is live footage of us.`, 'A video is claimed to show live theft-day attendance.'),
          e(a - 5, `At ${t(a - 5)} on case day ${day}, I checked the original video file. I filmed it on day ${day - 1}; the shot includes that day's dated event board. Today it is being replayed, not recorded live.`, 'The original recording belongs to the previous day.'),
          e(a, `At ${t(a)} on case day ${day}, I verified the playback file against the original. I was present when it was filmed on day ${day - 1}. Today's player shows exactly that earlier recording, not a live feed. ${joke}`, 'Independent firsthand evidence confirms a replay.')
        ]; break;
      case 9:
        explanation = 'The supposed in-person witness only had an audio call and cannot truthfully claim physical presence.';
        entries = [
          e(a - 5, `${intro} ${n} was physically beside me throughout ${full}, ${activity}. We spoke face to face, not by telephone.`, 'Physical face-to-face presence is explicitly claimed.'),
          e(a - 10, `On case day ${day}, I sat beside the ${roles[0]} at ${v} throughout ${t(a - 10)} to ${t(b + 10)}. They spoke to ${n} over an audio-only phone call. ${n} was not in the room.`, 'The alleged face-to-face meeting was an audio call.'),
          e(a, `From ${t(a)} to ${t(b)} I was in that room with the ${roles[0]} and ${roles[1]}. I heard the call on speakerphone. I personally know ${n}; they were not physically present. ${joke}`, 'A second observer confirms remote rather than physical contact.')
        ]; break;
      case 10:
        explanation = 'A genuine receipt records a purchase made by another person, not attendance by the suspect.';
        entries = [
          e(a - 10, `${intro} ${n} was with me from ${t(a - 10)} until ${t(b + 10)}, ${activity}. The receipt bearing their name proves they paid here in person.`, 'A named receipt is presented as proof of physical presence.'),
          e(a, `At ${t(a)} on case day ${day}, I issued that receipt at ${v}. A different customer asked me to put ${n}'s name on it. I checked the payer's own photo ID; they were not ${n}.`, 'Another identified person made the purchase.'),
          e(b + 15, `At ${t(b + 15)} I checked the original transaction with the ${roles[1]}. I witnessed that other person's ID check and staffed the only entrance from opening until ${t(b + 10)}. ${n} never entered. ${joke}`, 'A second witness confirms the named person did not attend.')
        ]; break;
      default:
        explanation = 'The written finish time was changed after signing; the original and two observers establish an early departure.';
        entries = [
          e(a - 20, `${intro} ${n} stayed with me from ${t(a - 20)} until ${t(b + 15)}, ${activity}. The finish time on my copy has never been changed.`, 'An unchanged record of attendance through the theft is claimed.'),
          e(a - 5, `At ${t(a - 5)} on case day ${day}, I watched ${n} sign out and leave ${v}. I immediately filed the original carbon copy with that finish time. I then watched the only entrance until ${t(b + 15)}; they did not return.`, 'The original copy records departure before the theft.'),
          e(b + 20, `At ${t(b + 20)} I compared the copies. The ${roles[0]}'s copy has an overwritten finish time; the filed original says ${t(a - 5)}. I personally saw ${n} leave at that earlier time. ${joke}`, 'An altered copy conflicts with the original and firsthand observation.')
        ];
    }
  }
  return { explanation, entries };
}

export function generateAlibiWitnesses(suspect, caseSeed = 'default_case', crimeWindow) {
  if (!suspect?.id) throw new Error('An alibi suspect with an ID is required.');
  const w = crimeWindow;
  if (!w || !Number.isInteger(w.day) || !Number.isInteger(w.startMinute) ||
      !Number.isInteger(w.endMinute) || w.startMinute < 30 ||
      w.endMinute <= w.startMinute || w.endMinute > 1409) {
    throw new Error('A valid crimeWindow with a 30-minute day margin is required.');
  }
  const thief = suspect.hiddenCaseData?.isTrueThief === true;
  const twin = suspect.hiddenCaseData?.isForensicTwin === true;
  if (thief === twin) throw new Error('Alibi suspect must be either the real thief or the forensic twin.');
  const occupation = String(suspect.occupation || suspect.publicProfile?.occupation || '').trim();
  const name = suspect.name || 'The suspect';
  const rng = random(hash(`${caseSeed}:${suspect.id}:${name}:${occupation.toLowerCase()}:${w.day}:${w.startMinute}:${w.endMinute}`));
  const setting = SETTINGS[Math.floor(rng() * SETTINGS.length)];
  const pattern = Math.floor(rng() * (thief ? 12 : 6));
  const internalRoles = shuffle(WITNESS_ROLES, rng);
  const portraits = shuffle(WITNESS_TEXTURE_KEYS, rng);
  const built = buildAccounts(pattern, {
    n: name, v: setting.venue, a: w.startMinute, b: w.endMinute,
    day: w.day, t: formatAlibiTime, activity: setting.activity,
    roles: setting.roles, joke: setting.joke
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
    scenarioId: `personal_${setting.id}_${thief ? 'false' : 'true'}_${pattern}`,
    scenarioContext: { type: 'personal', occupation, venue: setting.venue, activity: setting.activity },
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