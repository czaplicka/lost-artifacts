import { gameState } from '../../GameData.js';
import { ALIBI_CLUB_CONTACT } from './AlibiCaseData.js';

const SECRETARY = 'Membership secretary';
const line = (speaker, text) => ({ speaker, text });
const you = text => line('You', text);
const secretary = text => line(SECRETARY, text);
const rich = (before, keywordId, text, after = '') => ({
  speaker: SECRETARY,
  text: before + text + after,
  fragments: [before, { keywordId, text }, after]
});

const GREETING = [
  secretary('Tuesday Club. Membership enquiries.'),
  you('I’m calling about your Dinner Companion package.'),
  secretary('Certainly. Is this for an upcoming occasion or an evening you’ve already had?'),
  you('Last Tuesday.'),
  secretary('Then you’re calling the right department.')
];
const FALLBACK = [secretary('I’m sorry, what are you asking about?')];
const OFFER_SAMPLE = rich(
  'I can send you a ', 'sample', 'free sample', '.'
);
const PITCH = [
  you('What exactly would I be buying?'),
  secretary('A written account of an evening out. Restaurant, meal, conversation. Enough detail for a personal letter.'),
  rich('A name is included — a ', 'respectable_witness', 'respectable companion', '.'),
  you('Even if I wasn’t there?'),
  secretary('We don’t check attendance.'),
  you('I’d like to see what I’m getting before I pay.'),
  OFFER_SAMPLE,
  you('Does that sign me up for anything?'),
  secretary('No. You’ll have to make a separate mistake for that.')
];
const SEND_SAMPLE = [
  you('Send me the sample, please.'),
  secretary('Of course. What email address?'),
  you('I’ll give you my office address.'),
  secretary('Thank you. It should arrive shortly.')
];
const FOOTER = [
  you('I have a document marked “Tuesday package — revision 2”.'),
  secretary('That sounds like our Dinner Companion material.'),
  you('There’s also a note saying “Remove before forwarding”.'),
  secretary('That note should have been removed.')
];
const COMPANION = [
  you('And the dinner companion?'),
  secretary('A name is included.'),
  you('Do they agree to this?'),
  secretary('We don’t arrange introductions.'),
  you('So they might not know me.'),
  secretary('That is possible.')
];
const ARTHUR = [
  you('Does Arthur Finch know his name is in your material?'),
  secretary('I don’t handle the selection of names.'),
  you('Who does?'),
  secretary('I can pass on a complaint.'),
  you('That wasn’t a complaint.'),
  secretary('Noted.')
];
const SILENCE_OFFER = [
  you('I have your sample and the messages sent to Mr Finch. I’m including them in my report.'),
  secretary('Before you do that, we could offer you $120 to settle the matter privately.'),
  you('In exchange for?'),
  secretary('Leaving our material out of the report.'),
  you('Send me the offer in writing.'),
  secretary('Certainly.')
];

function topic(id, terms, lines, grantFlags = []) {
  return {
    id, terms: [...terms], requiresFlags: [], grantKeywords: [],
    grantFlags, lines
  };
}

export function installAlibiClubDialogue() {
  // mergeAlibiPhone uses this exported contact when loading phone data.
  ALIBI_CLUB_CONTACT.greeting = GREETING;
  ALIBI_CLUB_CONTACT.fallback = FALLBACK;
  ALIBI_CLUB_CONTACT.fallbackVariants = [FALLBACK];
  ALIBI_CLUB_CONTACT.choicePrompt = 'What do you ask?';
}

export function selectAlibiClubRule(contact, terms, known, flags, state = gameState) {
  if (contact?.caseId !== 'borrowed_alibi' || contact.number !== '428') return null;
  if (!Array.isArray(terms) || terms.length < 1 || terms.length > 2 ||
      new Set(terms).size !== terms.length || !terms.every(id => known.includes(id))) return null;

  const has = id => terms.includes(id);
  const exact = (...ids) => ids.length === terms.length && ids.every(has);
  const result = (id, lines, grants = []) => topic(id, terms, lines, grants);
  const read = state.piBorrowedAlibi?.read || [];

  if (exact('dinner_package', 'sample_code')) {
    if (!flags.includes('club_sample_received') || !read.includes('alibi_club_sample')) {
      return result('club_reference_enquiry', [
        you('What does TUE-DC-02 refer to?'),
        secretary('The Dinner Companion demonstration. That’s the document reference.')
      ]);
    }
    if (flags.includes('alibi_silence_offer_requested')) {
      return result('club_silence_offer_repeat', [
        you('About the offer you made.'),
        secretary('The terms are in writing. I have nothing to add.')
      ]);
    }
    return result('alibi_v3_club_sample_reference', SILENCE_OFFER, ['alibi_silence_offer_requested']);
  }

  if (has('sample') && (terms.length === 1 || exact('sample', 'dinner_package'))) {
    if (!flags.includes('club_pitch_heard')) {
      return result('club_dinner_pitch', [
        you('Could I see an example?'),
        secretary('Of the Dinner Companion package?'),
        you('Yes.'),
        ...PITCH.slice(1)
      ], ['club_pitch_heard']);
    }
    if (flags.includes('club_sample_received')) {
      return result('club_sample_already_requested', [
        you('About the sample I requested.'),
        secretary('I have your request. It’s going to the address you gave me.')
      ]);
    }
    return result(exact('sample') ? 'club_sample' : 'club_sample_named', SEND_SAMPLE, ['club_sample_received']);
  }

  if (exact('dinner_package') || exact('alibi_club', 'dinner_package')) {
    return result('club_dinner_pitch', PITCH, ['club_pitch_heard']);
  }
  if (exact('respectable_witness') || exact('respectable_witness', 'dinner_package')) {
    return result('club_companion', COMPANION, ['club_witness_claim']);
  }
  if (exact('tuesday_package', 'revision_two')) return result('alibi_v3_club_footer', FOOTER);
  if (exact('tuesday_package')) {
    return result('club_tuesday_package', [
      you('Do you sell something called the Tuesday package?'),
      rich('That’s the ', 'dinner_package', 'Dinner Companion package', '. Yes.'),
      you('I have a document with that name at the bottom.'),
      secretary('We put the product name on our documents.')
    ]);
  }
  if (exact('revision_two')) {
    return result('club_revision_two', [
      you('Your document says “revision 2”.'),
      secretary('Yes. We corrected the first edition.'),
      you('What was wrong with it?'),
      secretary('A spelling error.')
    ]);
  }
  if (exact('alibi_club') || exact('club_phone')) {
    return result('club_general', [
      you('Your website says the meeting was cancelled. Are you still open?'),
      secretary('For telephone enquiries, yes.'),
      rich('Were you interested in the ', 'dinner_package', 'Dinner Companion package', '?')
    ]);
  }
  if (exact('arthur_finch') || exact('arthur_finch', 'dinner_package')) {
    return result('club_privacy_arthur', ARTHUR);
  }
  for (const [id, name] of [['evelyn_shaw', 'Evelyn Shaw'], ['nora_bell', 'Nora Bell'], ['simon_pike', 'Simon Pike']]) {
    if (exact(id) || exact(id, 'dinner_package')) {
      return result(`club_privacy_${id}`, [
        you(`Has ${name} bought a package?`),
        secretary('I can’t discuss individual customers.'),
        you('Is that a yes?'),
        secretary('It’s the answer I’m authorised to give.')
      ]);
    }
  }
  if (exact('tomato_soup') || exact('dinner_package', 'tomato_soup')) {
    return result('alibi_v3_club_truth_of_dinner', [
      you('Was the tomato soup actually served?'),
      secretary('We don’t serve food.'),
      you('But your dinner account includes a meal.'),
      secretary('Our product is the account.')
    ]);
  }
  if (exact('copper_spoon') || exact('copper_spoon', 'dinner_package')) {
    return result('club_restaurant', [
      you('Do you have an arrangement with The Copper Spoon?'),
      secretary('No. We don’t make reservations or arrange meals.'),
      you('Their name is in your material.'),
      secretary('It is.')
    ]);
  }
  if (exact('sample_code')) {
    return result('club_sample_reference', [
      you('TUE-DC-02. What is it?'),
      secretary('The reference for our Dinner Companion demonstration.')
    ]);
  }
  return result('club_general_enquiry', [you('Could you clarify something for me?'), ...FALLBACK]);
}
