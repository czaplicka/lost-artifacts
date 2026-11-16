import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getEffectiveStats } from '../ui/characterCreation/CharacterCreationData.js';
import { EventBus } from '../EventBus.js';

import {
  getAlibiKnowledge,
  publicAlibiStatement
} from './AlibiKnowledge.js';

export const COOPERATION_LABELS = [
  'Guarded',
  'Cautious',
  'Cooperative',
  'Open'
];

export const APPROACHES = [
  { id: 'reassure', label: 'Offer reassurance' },
  { id: 'direct', label: 'Get to the point' },
  { id: 'joke', label: 'Lighten the mood' }
];

export const RECOVERY_APPROACHES = [
  {
    id: 'protect',
    label: 'Explain how their statement will be used'
  },
  {
    id: 'focus',
    label: 'Offer a short, precise question'
  },
  {
    id: 'listen',
    label: 'Let them explain their concern'
  }
];

export const CHALLENGES = [
  { id: 'host', label: 'Who was actually there?' },
  { id: 'room', label: 'Were you in the same room?' },
  { id: 'departure', label: 'When did they leave?' },
  { id: 'arrival', label: 'When did they arrive?' },
  { id: 'date', label: 'Are you sure about the date?' },
  { id: 'duration', label: 'Did you see them the whole time?' }
];

const PROFILES = [
  {
    id: 'worried',
    likes: 'reassure',
    dislikes: 'direct',
    repair: 'protect',
    concern:
      'I need to understand who will see my statement. ' +
      'I am not volunteering for the front page.',
    hint:
      'They are worried about the consequences of speaking.'
  },
  {
    id: 'busy',
    likes: 'direct',
    dislikes: 'joke',
    repair: 'focus',
    concern:
      'One clear question. I cannot spend the afternoon ' +
      'discovering what you want to ask.',
    hint:
      'They value a clear question and respect for their time.'
  },
  {
    id: 'chatty',
    likes: 'joke',
    dislikes: 'direct',
    repair: 'listen',
    concern:
      'You keep cutting past the part that matters to me. ' +
      'Let me finish explaining.',
    hint:
      'They want to feel heard, not processed.'
  },
  {
    id: 'precise',
    likes: 'direct',
    dislikes: 'reassure',
    repair: 'focus',
    concern:
      'Ask for one observation at a time. ' +
      'Vague questions produce vague answers.',
    hint:
      'They distinguish observations from assumptions.'
  },
  {
    id: 'proud',
    likes: 'reassure',
    dislikes: 'joke',
    repair: 'listen',
    concern:
      'Let me explain why I remember this before you decide ' +
      'my account is worthless.',
    hint:
      'Taking their account seriously matters to them.'
  },
  {
    id: 'dry',
    likes: 'joke',
    dislikes: 'reassure',
    repair: 'protect',
    concern:
      'Before we begin, explain where these notes go ' +
      'and what happens next. No comforting slogans.',
    hint:
      'Practical transparency works better than empty promises.'
  }
];

const OPENINGS = {
  worried: [
    'Is this going into a report with my name on it? I have enough people spelling it incorrectly already.',
    'Can we speak quietly? The walls here are better at networking than I am.',
    'I saw your badge. Now I would like to know who else will see my name.',
    'I do not want trouble. My calendar is already fully booked with the ordinary kind.',
    'Before I answer: am I a witness, a suspect, or someone who should have stayed in bed?',
    'I can remember things. I would prefer not to be remembered by the wrong people.'
  ],
  busy: [
    'I have three minutes. Two if this begins with a fascinating anecdote.',
    'Ask the important question first. There is a queue forming behind my patience.',
    'I can help, but I cannot host a documentary about it.',
    'I am between appointments. Please do not become the longest one.',
    'You have my attention. It is on a very short lease.',
    'One thing at a time, detective. The rest of my day has already made other arrangements.'
  ],
  chatty: [
    'A detective! Finally, someone professionally obliged to listen. Shall I start with the landlord?',
    'It is a long story. Fortunately, I have prepared several longer introductions.',
    'Of course I will talk. People usually regret not specifying a time limit.',
    'You want my account? At last. Everyone else keeps asking for the short version.',
    'I was hoping someone would ask. I have been rehearsing the relevant indignation.',
    'Come in. Do you prefer the facts first, or the fascinating circumstances surrounding me?'
  ],
  precise: [
    'Do you want what I observed, what I inferred, or what the neighbours have already embroidered?',
    'Please define your question. I have no objection to answering an actual one.',
    'I remember the details. I object to putting them in the wrong boxes.',
    'We should distinguish a time from an estimate. Apparently that is considered a personality flaw.',
    'I can give you observations. Conclusions are your department.',
    'Ask precisely and I will answer precisely. We might both enjoy the novelty.'
  ],
  proud: [
    'I am willing to help. I am less willing to be treated like the unreliable appendix.',
    'I expect you to take my account seriously. I took the trouble to remember it.',
    'You may ask your questions. You may not answer them on my behalf.',
    'I have already been interrupted twice today. Neither person improved the story.',
    'Before we begin, I would appreciate being treated as a witness, not an obstacle.',
    'I am not offended yet. Let us regard that as a promising start.'
  ],
  dry: [
    'Another statement? My last one had more readers than my memoir. Both readers were police.',
    'I assume there will be paperwork. Otherwise how will anyone know we suffered?',
    'Please explain the procedure. I like my bureaucracy with a plot summary.',
    'You can write things down. I would like to know where the notebook goes afterwards.',
    'I am prepared to cooperate with the process, once someone admits what the process is.',
    'Before you reassure me, try explaining something. It is an underrated technique.'
  ]
};

const DETECTIVE_LINES = {
  reassure: [
    'I want your account, not an answer you think I expect.',
    'If you are uncertain about something, say so. We can record that too.',
    'Let us start with what you are comfortable explaining.',
    'You can correct me if I misunderstand. I would rather cross out a sentence than build a case on it.',
    'I will distinguish your observations from anything you are only guessing.',
    'Tell me what you remember in your own words.'
  ],
  direct: [
    'Let us focus on what you personally observed.',
    'One question first. What can you tell me yourself?',
    'I will keep this specific. Please keep guesses separate from observations.',
    'Let us establish the useful details before we discuss the possibilities.',
    'Start with the part you can account for personally.',
    'I need your account, as clearly as you can give it.'
  ],
  joke: [
    'My notebook has heard worse. It has also heard my expense claims.',
    'I promise not to ask you to point at a suspicious silhouette. The artist is on leave.',
    'I brought a notebook rather than a dramatic spotlight. Budget cuts.',
    'We can skip the ominous music. I forgot the batteries.',
    'I would offer coffee, but mine could probably be charged as an accessory.',
    'Take your time. My handwriting cannot outrun anyone.'
  ],
  corroborate: [
    'I have another recorded account. Can we compare what each of you actually observed?',
    'Someone else has given a statement. I would like to compare the observations, not combine the guesses.',
    'May we go over your account alongside another witness statement?',
    'I have another account to compare with yours. Differences need explaining, not smoothing over.',
    'Let us examine the accounts separately, then see where they agree or differ.',
    'I want to check one account against another without putting words in your mouth.'
  ],
  statement: [
    'Can you tell me about {name}?',
    'I am asking about {name}. Are you willing to speak?',
    'What can you tell me concerning {name}?',
    'I would like your account regarding {name}.',
    'May we talk about {name}?',
    'I need to ask you about {name}. Where should we begin?'
  ],
  person: [
    'How do you know them?',
    'In what capacity do you know this person?',
    'How would you describe your connection?',
    'Before the details, what is your relationship to them?',
    'What should I understand about how you know them?',
    'Can you explain the connection between you?'
  ],
  personal: [
    'What makes you hesitate to talk?',
    'What is your main concern about this conversation?',
    'What would make it easier for you to explain?',
    'Is there something about this interview that is bothering you?',
    'Before we continue, what do you need me to understand?',
    'What is getting in the way of us having a useful conversation?'
  ],
  summary: [
    'Please describe exactly what you observed, including the times and the order of events.',
    'Let us record the detailed account now. Include the times and the sequence as you remember them.',
    'Please take me through your observations in order, with the relevant times.',
    'I am ready for the full account. What happened, when, and in what order?',
    'Can you now give me the details, including when things happened and their sequence?',
    'Start at the beginning of your observations and work through the times and events.'
  ],
  withheld: [
    'Is there anything else you have been holding back?',
    'Is there anything further you are willing to put on record?',
    'Before we finish, is there more you want to add?',
    'Have we left anything unsaid that you can stand behind?',
    'Is there any additional context you want recorded?',
    'Anything else you want me to know, without guessing?'
  ],
  protect: [
    'Let me explain how this statement will be used and what happens next.',
    'Before another question, I will explain where your account goes.',
    'We should go over the procedure and how your statement is handled.',
    'Let us clarify what recording your account means.',
    'I will explain the process before asking you to continue.',
    'First, the practical part: how your statement will be used.'
  ],
  focus: [
    'One short question, then. We can deal with the next one afterwards.',
    'Let me narrow that down to one observation.',
    'I will ask for one specific thing at a time.',
    'Let us remove the extra questions and start with one.',
    'A precise question first. No detours.',
    'Let me put that more simply and specifically.'
  ],
  listen: [
    'Go ahead. Explain the concern before we continue.',
    'I am listening. Finish the part you wanted me to understand.',
    'Let us pause my questions. Tell me what matters to you here.',
    'You have the floor. I will let you finish.',
    'Explain it in your own words. I will wait.',
    'Before we return to the account, I want to hear your concern.'
  ],
  space: [
    'Take your time. Explain it in your own words.',
    'I will stop interrupting. Go through it at your pace.',
    'There is room to think. Start with what you are trying to explain.',
    'All right. I am listening, not finishing your sentences.',
    'Talk me through it. I will wait.',
    'Let us slow down and give that some room.'
  ],
  press: [
    'Let us pin down that specific detail.',
    'What exactly can you account for on that point?',
    'Stay with this detail. What is your answer?',
    'Please address this particular point directly.',
    'Let us be precise about the question in front of us.',
    'I need a specific answer on this point.'
  ],
  pause: [
    'We can pause this topic and return to it.',
    'Take a moment. We can revisit the question.',
    'Let us leave this point for a moment.',
    'We do not have to rush this answer.',
    'We can stop here and come back to that detail.',
    'A pause, then. We can pick up the thread afterwards.'
  ]
};

const VOICES = {
  worried: {
    positive: [
      'That helps. I was beginning to think every answer came with a forwarding address.',
      'All right. I can talk if I am allowed to say when I am unsure.',
      'Thank you. I would rather be careful than accidentally become important.'
    ],
    neutral: [
      'I understand the question. I am still worried about what follows the answer.',
      'Perhaps. But first I need to understand what speaking to you involves.',
      'That is not quite the part that is keeping me awake.'
    ],
    negative: [
      'Please do not rush me. I am already imagining several unfortunate outcomes.',
      'You are making this sound like something I should have brought a lawyer to.',
      'A sharper question is not making me feel any safer.'
    ],
    refusal: [
      'Not yet. I need to understand who sees this before I give an account.',
      'I cannot talk properly while I am worrying about what happens afterwards.',
      'Please address my concern first. Then we can discuss a statement.'
    ],
    basic: [
      'I understand who you mean. I need a little more confidence in this conversation before I give details.',
      'Yes, I can follow who we are discussing. I am not ready to put a detailed account on record.',
      'I may be able to help. Let us settle how this works before I get into particulars.'
    ],
    person: [
      'I can speak about my connection to them, but I do not want that stretched into knowledge I do not have.',
      'There is a connection. Please do not turn that into a claim that I know everything about them.',
      'Knowing someone does not make me responsible for explaining their entire life. I hope.'
    ],
    personal: [
      'I am worried that a careful answer will become a confident quote with my name underneath it.',
      'I want to help without discovering later that everyone else has read this conversation.',
      'It is the consequences of speaking that worry me. Not the size of your notebook.'
    ],
    repair: [
      'That makes the process clearer. I can try to give you a careful account.',
      'Good. I needed an explanation before another question.',
      'All right. Now I understand what I am agreeing to discuss.'
    ],
    repairMiss: [
      'That is not the part I am worried about. Please explain what happens to my statement.',
      'We are still skipping the question about who sees these notes.',
      'I am trying to understand the consequences, not delay you.'
    ],
    nothing: [
      'Nothing further that I can responsibly add. I would rather leave a blank than fill it with nerves.',
      'I cannot add anything I am sure enough to put on record.',
      'That is all I am prepared to stand behind. Anxiety is not additional evidence.'
    ],
    correctionKnown: [
      'My correction is already recorded. Please make sure it stays beside the original.',
      'I have already added a correction. I do not want either version disappearing from the notes.'
    ],
    standBy: [
      'I am not withdrawing that part of my account. Please compare it with the other statements.',
      'That remains my account on this point. I understand you still need to check it.'
    ],
    retraction: [
      'I cannot stand by that detail. Please record that correction alongside my earlier account.',
      'That part of what I said was not reliable. I need to withdraw it from my account.'
    ]
  },

  busy: {
    positive: [
      'Good. A question with edges. Ask it.',
      'That works. We might finish before my next obligation develops a grudge.',
      'Clear and useful. Please continue while we have momentum.'
    ],
    neutral: [
      'I still need you to narrow the question down.',
      'Possibly helpful. Not especially brief.',
      'We have not quite reached the question yet.'
    ],
    negative: [
      'If that was the warm-up, I cannot afford the main event.',
      'Please save the entertainment for someone with a longer lunch break.',
      'I can spare time for questions, not a rehearsal.'
    ],
    refusal: [
      'Not like this. Decide what you need to ask first.',
      'I cannot give a useful account while we circle the subject.',
      'Give me a clear question before asking for a statement.'
    ],
    basic: [
      'I know who you are asking about. We can get to details once this conversation becomes more focused.',
      'Understood. I may be able to help, but I am not giving a detailed account yet.',
      'Yes, that person. Tell me what you need before we spend the afternoon on introductions.'
    ],
    person: [
      'Keep the connection separate from the account. One is not a substitute for the other.',
      'I can explain how I know them. I cannot provide a complete biography.',
      'Knowing them gives this conversation a starting point, not a finished answer.'
    ],
    personal: [
      'I need this to have a shape. A beginning, a question, and ideally an end.',
      'I do not mind helping. I mind spending ten minutes discovering what help you want.',
      'My concern is time. Specifically, how much of mine is about to become yours.'
    ],
    repair: [
      'Yes. One question. That is a workable arrangement.',
      'Much better. Ask that, then we can move to the next.',
      'Now we are getting somewhere. Please maintain this level of brevity.'
    ],
    repairMiss: [
      'I still need a shorter, clearer question.',
      'We are adding discussion when I asked for focus.',
      'Please narrow it down. My schedule is not becoming more sympathetic.'
    ],
    nothing: [
      'Nothing else I can usefully add. I will not lengthen the interview for decorative purposes.',
      'That is the extent of what I can stand behind.',
      'No further account from me. A longer answer would not be a better one.'
    ],
    correctionKnown: [
      'The correction is already recorded. Please refer to that.',
      'I have already corrected the account. No need to make a third version.'
    ],
    standBy: [
      'My account on that point stands. Compare it with the others.',
      'No change to that part. The comparison is yours to make.'
    ],
    retraction: [
      'I withdraw that detail. It was not reliable.',
      'That part needs correcting: I cannot stand behind it.'
    ]
  },

  chatty: {
    positive: [
      'You have a sense of humour. Excellent. I shall try not to abuse this discovery immediately.',
      'There we are. A conversation, rather than a form with shoes.',
      'Good. I was worried this would be one of those interviews where I do all the personality.'
    ],
    neutral: [
      'Yes, but you are hurrying past the part I was trying to explain.',
      'We can get to that. First, let me finish making my point.',
      'I am trying to help you understand, not merely fill a silence. Though I can do both.'
    ],
    negative: [
      'If you trim any more off my explanation, you will be interviewing the punctuation.',
      'You have skipped straight to the end of a sentence I have not finished.',
      'Do let me complete one thought before opening the next drawer.'
    ],
    refusal: [
      'Not until you let me explain my concern. Otherwise we will talk past each other at considerable length.',
      'I need you to listen first. It is a conversation, not competitive interruption.',
      'Let me finish what matters to me before we start recording an account.'
    ],
    basic: [
      'I know who you mean. The detailed version will need a little more mutual understanding first.',
      'Yes, we can talk about them. We have not reached the account itself yet.',
      'I may be able to help. Let us get comfortable with the conversation before opening every chapter.'
    ],
    person: [
      'I can explain the connection, but do not promote me to their official biographer.',
      'There is knowing a person, and then there is being asked to explain everything they do.',
      'Our connection is context. It is not a little security camera you can rewind.'
    ],
    personal: [
      'I want to finish a thought without seeing the next question already overtaking it.',
      'People hear that I talk a lot and decide none of it can matter. A remarkably convenient theory.',
      'Let me explain the concern properly. I promise it has a destination.'
    ],
    repair: [
      'Thank you. Being heard is much more pleasant than being efficiently processed.',
      'There. Now that I have finished, I am ready for your questions.',
      'I appreciate that. We can return to the account without leaving half a conversation behind.'
    ],
    repairMiss: [
      'You are still trying to solve my concern before hearing it.',
      'Please let me finish the explanation. Then you can decide what to ask.',
      'That would be useful if it were the thing I was trying to tell you.'
    ],
    nothing: [
      'For once, I have nothing further I can put on record. Please appreciate the historical significance.',
      'I could keep talking, but I would be moving from information into entertainment.',
      'That is all I can stand behind. The extended edition would mostly be adjectives.'
    ],
    correctionKnown: [
      'The correction is already in your notes. An important revision, not an invitation to rewrite the whole conversation.',
      'I have already corrected that part. Keep both versions, so it is clear what changed.'
    ],
    standBy: [
      'I stand by that part. You will have to compare it with what the others told you.',
      'That point remains as I described it. I cannot settle the entire comparison for you.'
    ],
    retraction: [
      'I need to withdraw that detail. Whatever else I said around it, that part was not reliable.',
      'Please record a correction: I cannot stand behind that part of my earlier account.'
    ]
  },

  precise: {
    positive: [
      'A properly defined question. Yes, I can answer one of those.',
      'Good. We have separated the observation from the interpretation.',
      'That is sufficiently specific. Let us proceed without improving it into vagueness.'
    ],
    neutral: [
      'Your intention is clear. The scope of the question is not.',
      'Please specify what you want me to address.',
      'We still need to distinguish the subject from the assumption.'
    ],
    negative: [
      'Reassurance is not a definition. Please ask precisely.',
      'That makes the question more comfortable, not more accurate.',
      'I would prefer a clear question to a comforting introduction.'
    ],
    refusal: [
      'Not until the question is properly defined.',
      'I cannot give a useful account in response to an unspecified request.',
      'Please narrow the scope before asking me to put anything on record.'
    ],
    basic: [
      'I understand the person under discussion. This is not yet a detailed account of events.',
      'I can identify the subject of your question. Further details require a more precise conversation.',
      'We have established whom you mean. We have not established my account.'
    ],
    person: [
      'A connection explains why you are asking me. It does not establish the extent of my observations.',
      'Please distinguish familiarity with a person from knowledge of their movements.',
      'The relationship is context. Any observations need to be considered separately.'
    ],
    personal: [
      'I do not want an estimate recorded as a fact, or an inference quoted as an observation.',
      'My concern is precision. Qualifiers have a habit of vanishing between a conversation and a report.',
      'I need questions that let me distinguish what I know from what I merely suppose.'
    ],
    repair: [
      'That is specific enough. I can work with it.',
      'Good. One observation at a time avoids several unnecessary errors.',
      'A clear question. We now have the beginnings of a useful method.'
    ],
    repairMiss: [
      'The question is still insufficiently specific.',
      'Please address the ambiguity rather than the atmosphere.',
      'We have not yet reduced this to one clearly defined point.'
    ],
    nothing: [
      'I have no additional observation to record. I will not manufacture one to complete the paragraph.',
      'Nothing further that meets the same standard of accuracy.',
      'That is the limit of what I can responsibly state.'
    ],
    correctionKnown: [
      'The correction has already been recorded. It should remain distinguishable from the original.',
      'Refer to the recorded correction. Do not silently replace the earlier wording.'
    ],
    standBy: [
      'I maintain that part of my account. Its agreement with other statements remains for you to assess.',
      'No revision to that point. This is not a certification of the entire account.'
    ],
    retraction: [
      'That detail is not reliable. I withdraw that part of my earlier account.',
      'Please record this precisely: I cannot stand by that particular detail.'
    ]
  },

  proud: {
    positive: [
      'Thank you. A little respect makes this considerably easier.',
      'Good. You are asking for my account rather than delivering your verdict on it.',
      'That is a reasonable way to proceed. I will answer on that basis.'
    ],
    neutral: [
      'You have not quite addressed why I object to the way this conversation is going.',
      'I am willing to help, but I expect to be heard properly.',
      'We may continue once you understand the point I am making.'
    ],
    negative: [
      'I am not here to provide material for your routine.',
      'Perhaps you can save the comedy until after you have listened.',
      'My willingness to help is not an invitation to make me the joke.'
    ],
    refusal: [
      'Not while my account is being treated as an inconvenience.',
      'First, allow me to explain my concern without dismissing it.',
      'I will speak when it is clear you intend to hear the answer.'
    ],
    basic: [
      'I understand who you mean. You have not yet heard the account I am prepared to give.',
      'I may be able to assist. Let us not confuse that with having already taken my statement.',
      'Yes, we can discuss them. The details deserve a proper hearing.'
    ],
    person: [
      'My connection to them does not make me either an authority on everything or someone to dismiss.',
      'Judge any account on what it says, not on a convenient assumption about the relationship.',
      'The connection is one matter. What I can personally account for is another.'
    ],
    personal: [
      'I object to being treated as though listening to me is a procedural nuisance.',
      'I want the opportunity to explain myself before my account is assigned a value.',
      'Take the account seriously enough to hear it before deciding what it is worth.'
    ],
    repair: [
      'Thank you for letting me finish. Now we can proceed properly.',
      'That is all I was asking: a fair hearing before the next question.',
      'Good. We can discuss the account without discussing my right to explain it.'
    ],
    repairMiss: [
      'You are still moving past the concern I wanted heard.',
      'Let me explain why this matters before you offer the next solution.',
      'I asked to be listened to, not handled more efficiently.'
    ],
    nothing: [
      'Nothing further. I would rather stop at what I can defend than embellish it for effect.',
      'That is all I am prepared to put my name to.',
      'I have no additional account to offer. Please take the existing one seriously.'
    ],
    correctionKnown: [
      'I have already made the correction. It deserves to be recorded as carefully as the original.',
      'The correction is on record. Please do not make me repeat it as though I had not said it.'
    ],
    standBy: [
      'I stand by that part of my account. Give it the same consideration as the others.',
      'That point remains unchanged. You must weigh the accounts fairly.'
    ],
    retraction: [
      'I cannot defend that detail. I withdraw it from my earlier account.',
      'It is important to correct this: that part of my account was not reliable.'
    ]
  },

  dry: {
    positive: [
      'Good. A conversation with a pulse. Ask away.',
      'That is better. I was beginning to feel myself becoming an attachment.',
      'All right. We may yet produce something more useful than a signed attendance sheet.'
    ],
    neutral: [
      'A promising sentence. It has not explained the process, though.',
      'We are approaching my concern from a picturesque distance.',
      'Possibly. I still need the practical explanation.'
    ],
    negative: [
      'Please do not reassure me into signing something I do not understand.',
      'Comforting. Now try the version with information in it.',
      'I prefer a procedure to a slogan. Procedures occasionally contain instructions.'
    ],
    refusal: [
      'Not until someone explains where the notes go. Presumably they do not migrate naturally.',
      'Explain the process first. Then I can decide which part to be concerned about.',
      'I would like the practical details before I become one of them.'
    ],
    basic: [
      'I know who you mean. That is the introduction, not the evidence.',
      'Understood. A detailed account is a separate item, not a complimentary extra.',
      'We have identified the subject. The rest will require an actual conversation.'
    ],
    person: [
      'A connection to someone is not a subscription to their daily movements.',
      'I know them. I have not been appointed curator of their entire existence.',
      'Familiarity is context, not surveillance with better manners.'
    ],
    personal: [
      'I want to know where the statement goes and what follows. Bureaucracy is less alarming with a map.',
      'I object to discovering the procedure after participating in it.',
      'Practical transparency. An unfashionable request, but I persist.'
    ],
    repair: [
      'Good. Instructions. Civilisation survives another afternoon.',
      'Now I understand the process. We can attempt the conversation.',
      'An explanation with practical content. I shall try not to look overwhelmed.'
    ],
    repairMiss: [
      'We have improved the atmosphere without explaining the paperwork.',
      'Still waiting for the practical part. It seems to be travelling separately.',
      'That is not the procedural explanation I requested.'
    ],
    nothing: [
      'Nothing further. I could speculate, but you appear to have enough paperwork already.',
      'That is all I can stand behind. Anything else would be creative writing.',
      'No additional account. An empty space in a notebook is not a personal defeat.'
    ],
    correctionKnown: [
      'The correction is already recorded. Please resist producing a commemorative third version.',
      'Refer to my correction. The original and the revision can share a file without a custody dispute.'
    ],
    standBy: [
      'That part of my account stands. Comparison remains a detective-shaped responsibility.',
      'No withdrawal on that point. This is a statement, not a warranty.'
    ],
    retraction: [
      'That detail does not survive scrutiny. Please record that I withdraw it.',
      'A correction for the file: I cannot stand behind that part of my account.'
    ]
  }
};

const MODES = ['space', 'press', 'pause'];

const CUES = {
  space: [
    'You are moving too fast. Give me room to remember the order.',
    'I can explain, if you stop filling in the gaps for me.',
    'Let me finish the thought before you ask the next question.',
    'Slow down. I am trying to put this into my own words.',
    'You keep anticipating the answer. Please let me give it.',
    'I need room to work through what you are asking.',
    'One moment. I have not finished explaining that.',
    'Please listen to the whole answer before narrowing it.'
  ],
  press: [
    'Which detail are you disputing? Ask me something specific.',
    'Be precise. What exactly do you need me to account for?',
    'Name the particular point you want answered.',
    'What is the exact question on this detail?',
    'If you want a definite answer, give me a definite question.',
    'Please narrow that to the specific thing you are asking.',
    'Which part do you want me to address directly?',
    'Let us stop circling. Ask the precise question.'
  ],
  pause: [
    'I need to stop and think about that. Come back to the question in a moment.',
    'Not another question immediately. Let me collect my thoughts.',
    'Can we leave this point for a moment? I need to think.',
    'I would like a pause before we return to that.',
    'Give me a moment away from this question.',
    'I need a break from this point, not a different wording of it.',
    'Let us put that question aside briefly.',
    'Please stop here for a moment. We can return to it.'
  ]
};

const CHALLENGE_PROGRESS = [
  'Let me think through the next part.',
  'All right. There is another point I need to consider.',
  'I am working through it. Let us not rush the next part.',
  'One more part of this needs thinking through.',
  'I need to consider how to answer the next point.',
  'We have not finished with this question yet.'
];

const CHALLENGE_SETBACK = [
  'That did not help me explain it.',
  'We are not getting a clearer answer that way.',
  'That approach is not helping me work through the question.',
  'We seem to be talking past each other.',
  'I cannot explain it better while we proceed like this.',
  'That has not made the question easier to address.'
];

function hash(value) {
  let result = 2166136261;

  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}

function pick(pool, key) {
  return pool[hash(key) % pool.length];
}

function findData(caseKey, encounterId) {
  const stored =
    gameState.caseData?.alibiCases?.[caseKey];

  const encounter =
    gameState.crimeCityEncounterState?.[caseKey]?.find(
      entry =>
        entry.id === encounterId &&
        entry.alibiWitness === true
    );

  const subject = stored?.suspects?.find(
    entry => entry.suspectId === encounter?.suspectId
  );

  const witness = subject?.witnesses?.find(
    entry => entry.npcId === encounter?.npcId
  );

  if (!stored || !encounter || !subject || !witness) {
    throw new Error('Missing stored alibi witness.');
  }

  return {
    stored,
    encounter,
    subject,
    witness
  };
}

function profileFor(state) {
  return PROFILES.find(
    profile => profile.id === state.profileId
  ) || PROFILES[0];
}

// Wybór zapisujemy osobno od transkryptu.
// Po wyczerpaniu puli wybierana jest najmniej używana kwestia.
function savedLine(caseKey, state, slot, pool) {
  state.dialogueLines ??= {};

  if (
    typeof state.dialogueLines[slot] === 'string' &&
    state.dialogueLines[slot]
  ) {
    return state.dialogueLines[slot];
  }

  if (!Array.isArray(pool) || !pool.length) {
    throw new Error(`Missing dialogue pool: ${slot}`);
  }

  const stored =
    gameState.caseData?.alibiCases?.[caseKey];

  const counts = new Map(
    pool.map(line => [line, 0])
  );

  const countLine = line => {
    if (counts.has(line)) {
      counts.set(line, counts.get(line) + 1);
    }
  };

  for (const other of Object.values(stored?.cooperation || {})) {
    const saved = Object.values(other?.dialogueLines || {});

    for (const line of saved) {
      countLine(line);
    }

    // Uwzględniamy także wcześniejsze rozmowy bez nowego zapisu kwestii.
    const alreadySaved = new Set(saved);

    for (const entry of other?.transcript || []) {
      for (const line of [entry.detective, entry.witness]) {
        if (!alreadySaved.has(line)) {
          countLine(line);
        }
      }
    }
  }

  const minimum = Math.min(...counts.values());

  const candidates = pool.filter(
    line => counts.get(line) === minimum
  );

  const selected = pick(
    candidates,
    `${state.dialogueSeed}:variety-v1:${slot}`
  );

  state.dialogueLines[slot] = selected;
  requestAutosave();

  return selected;
}

function voiceLine(caseKey, state, category, slot = category) {
  const profile = profileFor(state);
  const pool = VOICES[profile.id]?.[category];

  return savedLine(
    caseKey,
    state,
    `witness:${slot}`,
    pool
  );
}

function detectiveLine(caseKey, state, category, slot = category) {
  return savedLine(
    caseKey,
    state,
    `detective:${slot}`,
    DETECTIVE_LINES[category]
  );
}

export function getRapport() {
  const stats = getEffectiveStats({
    profile: gameState.detectiveProfile || 'analyst',
    stats: gameState.detectiveStats || {}
  });

  return Math.max(
    0,
    Math.floor(Number(stats.rapport) || 0)
  );
}

export function getCooperationState(caseKey, encounterId) {
  const {
    stored,
    encounter
  } = findData(caseKey, encounterId);

  stored.cooperation ??= {};

  let state = stored.cooperation[encounterId];
  let dirty = false;

  if (!state) {
    state = stored.cooperation[encounterId] = {
      level: 1,
      usedApproaches: [],
      asked: [],
      transcript: [],
      challenges: [],
      pendingChallenge: null,
      revisedStatement: null,
      confrontations: {},
      positiveBonusUsed: false,
      protectionUsed: false
    };

    if (
      encounter.interviewed &&
      encounter.dialogueCompleted
    ) {
      state.asked = ['statement', 'summary'];
    }

    dirty = true;
  }

  state.asked = Array.isArray(state.asked)
    ? state.asked
    : [];

  state.transcript = Array.isArray(state.transcript)
    ? state.transcript
    : [];

  state.usedApproaches = Array.isArray(state.usedApproaches)
    ? state.usedApproaches
    : [];

  state.challenges = Array.isArray(state.challenges)
    ? state.challenges
    : [];

  state.confrontations ??= {};
  state.pendingChallenge ??= null;
  state.revisedStatement ??= null;

  state.level = Math.max(
    0,
    Math.min(
      3,
      Number.isFinite(state.level)
        ? state.level
        : 1
    )
  );

  if (state.disclosureVersion !== 1) {
    state.detailsUnlocked =
      state.asked.includes('statement') ||
      Boolean(
        encounter.interviewed &&
        encounter.dialogueCompleted
      );

    state.disclosureVersion = 1;
    dirty = true;
  }

  if (!PROFILES.some(profile => profile.id === state.profileId)) {
    state.profileId = pick(
      PROFILES,
      `profile:${caseKey}:${encounterId}`
    ).id;

    dirty = true;
  }

  if (!Number.isInteger(state.dialogueSeed)) {
    state.dialogueSeed = hash(
      `dialogue-v3:${caseKey}:${encounterId}`
    );

    dirty = true;
  }

  if (state.version !== 4) {
    state.version = 4;
    dirty = true;
  }

  if (
    !state.dialogueLines ||
    typeof state.dialogueLines !== 'object' ||
    Array.isArray(state.dialogueLines)
  ) {
    state.dialogueLines = {};
    dirty = true;
  }

  if (dirty) {
    requestAutosave();
  }

  return state;
}

export function getWitnessPersonality(caseKey, encounterId) {
  const state = getCooperationState(
    caseKey,
    encounterId
  );

  const profile = profileFor(state);

  return {
    ...profile,
    opening: savedLine(
      caseKey,
      state,
      'opening',
      OPENINGS[profile.id]
    )
  };
}

function addEntry(
  state,
  id,
  detective,
  witness,
  note = ''
) {
  const entry = {
    id,
    detective,
    witness,
    note
  };

  state.transcript.push(entry);
  requestAutosave();

  return entry;
}

function spendMinutes(minutes) {
  gameState.timeSpent =
    (Number(gameState.timeSpent) || 0) +
    minutes / 60;

  EventBus.emit('advanceTime', 0, minutes);
  requestAutosave();
}

export function getInterviewView(caseKey, encounterId) {
  const state = getCooperationState(
    caseKey,
    encounterId
  );

  const {
    encounter,
    subject,
    witness
  } = findData(caseKey, encounterId);

  const others = subject.witnesses.filter(
    entry => entry.npcId !== witness.npcId
  );

  const otherDetails = others.filter(
    entry => getAlibiKnowledge(
      caseKey,
      entry.npcId
    ).details
  ).length;

  return {
    state,
    personality: getWitnessPersonality(
      caseKey,
      encounterId
    ),
    completed:
      encounter.interviewed === true &&
      encounter.dialogueCompleted === true,
    canChallenge:
      state.detailsUnlocked &&
      state.level >= 2 &&
      otherDetails === others.length,
    canCorroborate:
      otherDetails > 0 &&
      !state.usedApproaches.includes('corroborate'),
    originalStatement: publicAlibiStatement(
      caseKey,
      witness
    ),
    revisedStatement: state.revisedStatement,
    detailsKnown: state.detailsUnlocked,
    otherDetails
  };
}

export function applyApproach(
  caseKey,
  encounterId,
  approachId
) {
  const state = getCooperationState(
    caseKey,
    encounterId
  );

  if (
    state.pendingChallenge ||
    state.usedApproaches.includes(approachId)
  ) {
    return null;
  }

  const profile = getWitnessPersonality(
    caseKey,
    encounterId
  );

  if (approachId === 'corroborate') {
    if (!getInterviewView(caseKey, encounterId).canCorroborate) {
      return null;
    }

    state.usedApproaches.push(approachId);
    state.level = Math.min(3, state.level + 1);

    return addEntry(
      state,
      'approach:corroborate',
      detectiveLine(caseKey, state, 'corroborate'),
      savedLine(
        caseKey,
        state,
        'witness:corroborate',
        [
          'All right. Let us compare what was observed, not what everyone has decided it means.',
          'We can compare the accounts. Please keep each person responsible for their own words.',
          'Yes. Put the statements beside one another and ask about the differences.',
          'I can discuss my account alongside theirs. I cannot answer on their behalf.',
          'A comparison is reasonable. Do not turn two accounts into one before checking them.',
          'Let us look at the statements separately first. Agreement should not be something we manufacture.'
        ]
      ),
      'Cooperation +1. No new facts have been added automatically.'
    );
  }

  if (!APPROACHES.some(entry => entry.id === approachId)) {
    return null;
  }

  const previous = state.level;

  let change = 0;
  let kind = 'neutral';

  if (approachId === profile.likes) {
    change = 1;
    kind = 'positive';

    if (
      getRapport() >= 3 &&
      !state.positiveBonusUsed
    ) {
      change = 2;
      state.positiveBonusUsed = true;
    }
  } else if (approachId === profile.dislikes) {
    change = -1;
    kind = 'negative';

    if (
      getRapport() >= 4 &&
      !state.protectionUsed
    ) {
      change = 0;
      state.protectionUsed = true;
    }
  }

  state.level = Math.max(
    0,
    Math.min(3, state.level + change)
  );

  state.usedApproaches.push(approachId);

  const answer = voiceLine(
    caseKey,
    state,
    kind,
    `approach:${approachId}:${kind}`
  );

  const delta = state.level - previous;

  return addEntry(
    state,
    `approach:${approachId}`,
    detectiveLine(
      caseKey,
      state,
      approachId,
      `approach:${approachId}`
    ),
    answer,
    `Cooperation ${delta >= 0 ? '+' : ''}${delta}.`
  );
}

export function repairCooperation(
  caseKey,
  encounterId,
  approachId
) {
  const approach = RECOVERY_APPROACHES.find(
    entry => entry.id === approachId
  );

  if (!approach) return null;

  const state = getCooperationState(
    caseKey,
    encounterId
  );

  if (
    state.pendingChallenge ||
    !state.usedApproaches.length ||
    state.level >= 3
  ) {
    return null;
  }

  const profile = getWitnessPersonality(
    caseKey,
    encounterId
  );

  spendMinutes(5);

  state.repairAttempts =
    (state.repairAttempts || 0) + 1;

  const slot = `repair:${state.repairAttempts}`;

  const question = detectiveLine(
    caseKey,
    state,
    approachId,
    slot
  );

  if (approachId !== profile.repair) {
    state.level = Math.max(0, state.level - 1);

    return addEntry(
      state,
      slot,
      question,
      voiceLine(
        caseKey,
        state,
        'repairMiss',
        `${slot}:miss`
      ),
      '5 minutes spent. Cooperation -1 (minimum 0).'
    );
  }

  const before = state.level;

  // Naprawa nie podnosi współpracy do poziomu 3.
  state.level = Math.max(2, state.level);

  const delta = state.level - before;

  return addEntry(
    state,
    slot,
    question,
    voiceLine(
      caseKey,
      state,
      'repair',
      `${slot}:success`
    ),
    `5 minutes spent. Cooperation ${delta >= 0 ? '+' : ''}${delta}. ` +
    'Ask for details to record them.'
  );
}

export function askWitness(
  caseKey,
  encounterId,
  topic
) {
  const state = getCooperationState(
    caseKey,
    encounterId
  );

  const {
    subject,
    witness
  } = findData(caseKey, encounterId);

  if (state.pendingChallenge) return null;

  const existing = state.transcript.find(
    entry => entry.id === `question:${topic}`
  );

  // Ponowne pytanie odtwarza zapisaną wypowiedź.
  if (existing) return existing;

  let question;
  let answer;
  let note = '';

  if (topic === 'statement') {
    question = detectiveLine(
      caseKey,
      state,
      'statement'
    ).replace(
      '{name}',
      subject.suspectName || 'this person'
    );

    if (state.level === 0) {
      return addEntry(
        state,
        `refusal:${state.transcript.length}`,
        question,
        voiceLine(
          caseKey,
          state,
          'refusal',
          `refusal:${state.transcript.length}`
        ),
        "No statement recorded. Address the witness's concern."
      );
    }

    answer = voiceLine(caseKey, state, 'basic');

    note =
      'Basic contact recorded. ' +
      'Times, places and sequence remain unknown.';
  } else if (topic === 'summary') {
    if (
      state.level < 2 ||
      !state.asked.includes('statement')
    ) {
      return null;
    }

    question = detectiveLine(
      caseKey,
      state,
      'summary'
    );

    // Fakty alibi pozostają dokładnie takie jak w generatorze.
    answer = String(witness.statement || '');

    if (!answer) return null;

    state.detailsUnlocked = true;

    note =
      'Detailed account recorded. Its timeline note is now available. ' +
      'This is testimony, not proof of truth.';
  } else if (topic === 'person') {
    if (state.level === 0) return null;

    question = detectiveLine(
      caseKey,
      state,
      'person'
    );

    answer = voiceLine(
      caseKey,
      state,
      'person'
    );

    note = 'Context only. No new alibi evidence.';
  } else if (topic === 'personal') {
    if (
      state.level < 2 ||
      !state.asked.includes('person')
    ) {
      return null;
    }

    question = detectiveLine(
      caseKey,
      state,
      'personal'
    );

    answer = voiceLine(
      caseKey,
      state,
      'personal'
    );

    note =
      'Their concern may help you choose how to repair cooperation. ' +
      'No timeline fact unlocked.';
  } else if (topic === 'withheld') {
    if (
      state.level < 3 ||
      !state.detailsUnlocked
    ) {
      return null;
    }

    question = detectiveLine(
      caseKey,
      state,
      'withheld'
    );

    if (state.revisedStatement) {
      answer = voiceLine(
        caseKey,
        state,
        'correctionKnown'
      );
    } else if (
      typeof witness.motiveFragment === 'string' &&
      witness.motiveFragment.trim()
    ) {
      answer = witness.motiveFragment;
    } else {
      answer = voiceLine(
        caseKey,
        state,
        'nothing'
      );
    }

    note =
      'Additional context only. A retraction still requires ' +
      'a specific, supported challenge.';
  } else {
    return null;
  }

  if (!state.asked.includes(topic)) {
    state.asked.push(topic);
  }

  return addEntry(
    state,
    `question:${topic}`,
    question,
    answer,
    note
  );
}

function threadFor(state, topic) {
  if (!state.confrontations[topic]) {
    const first = hash(
      `${state.dialogueSeed}:${topic}:first`
    ) % 3;

    const second = (
      first +
      1 +
      hash(`${state.dialogueSeed}:${topic}:second`) % 2
    ) % 3;

    state.confrontations[topic] = {
      stage: 0,
      failures: 0,
      attempts: 0,
      modes: [
        MODES[first],
        MODES[second]
      ],
      resolved: false
    };
  }

  return state.confrontations[topic];
}

function cue(caseKey, state, topic, thread) {
  const mode = thread.modes[
    Math.min(thread.stage, 1)
  ];

  return savedLine(
    caseKey,
    state,
    `cue:${topic}:${thread.stage}:${thread.failures}`,
    CUES[mode]
  );
}

export function challengeWitness(
  caseKey,
  encounterId,
  topic
) {
  const view = getInterviewView(
    caseKey,
    encounterId
  );

  const state = view.state;

  if (
    !view.canChallenge ||
    state.pendingChallenge ||
    state.revisedStatement
  ) {
    return null;
  }

  const challenge = CHALLENGES.find(
    entry => entry.id === topic
  );

  if (!challenge) return null;

  const thread = threadFor(state, topic);

  if (thread.resolved) {
    return state.transcript.find(
      entry => entry.id === `resolved:${topic}`
    ) || null;
  }

  thread.attempts++;
  state.pendingChallenge = topic;

  if (!state.challenges.includes(topic)) {
    state.challenges.push(topic);
  }

  return addEntry(
    state,
    `challenge:${topic}:${thread.attempts}`,
    challenge.label,
    cue(caseKey, state, topic, thread),
    'Compare the collected accounts. Opening a topic does not identify a liar.'
  );
}

export function followUpChallenge(
  caseKey,
  encounterId,
  mode
) {
  if (!MODES.includes(mode)) return null;

  const state = getCooperationState(
    caseKey,
    encounterId
  );

  const topic = state.pendingChallenge;

  if (!topic) return null;

  const {
    subject,
    witness
  } = findData(caseKey, encounterId);

  const thread = threadFor(state, topic);

  const turn = `${topic}:${thread.stage}:${thread.failures}`;

  const question = detectiveLine(
    caseKey,
    state,
    mode,
    `followup:${turn}:${mode}`
  );

  const expected = thread.modes[
    Math.min(thread.stage, 1)
  ];

  if (mode !== expected) {
    thread.failures++;
    spendMinutes(5);

    if (mode === 'press') {
      state.level = Math.max(0, state.level - 1);
    }

    if (
      mode === 'pause' ||
      state.level < 2
    ) {
      state.pendingChallenge = null;
    }

    const setback = savedLine(
      caseKey,
      state,
      `setback:${topic}:${thread.failures}`,
      CHALLENGE_SETBACK
    );

    return addEntry(
      state,
      `followup:${topic}:${state.transcript.length}`,
      question,
      `${setback} ${cue(caseKey, state, topic, thread)}`,
      '5 minutes spent. No new fact recorded.'
    );
  }

  thread.stage++;

  if (thread.stage < 2) {
    if (mode === 'pause') {
      state.pendingChallenge = null;
    }

    const progress = savedLine(
      caseKey,
      state,
      `progress:${topic}:${thread.stage}`,
      CHALLENGE_PROGRESS
    );

    return addEntry(
      state,
      `step:${topic}:1`,
      question,
      `${progress} ${cue(caseKey, state, topic, thread)}`,
      'The topic is not resolved yet.'
    );
  }

  state.pendingChallenge = null;
  thread.resolved = true;

  const match = String(
    subject.scenarioId || ''
  ).match(/_false_([0-5])$/);

  const relevant =
    witness.isLiar === true &&
    match &&
    CHALLENGES[Number(match[1])]?.id === topic;

  let answer;

  if (relevant) {
    state.revisedStatement = voiceLine(
      caseKey,
      state,
      'retraction',
      `retraction:${topic}`
    );

    answer = state.revisedStatement;
  } else {
    answer = voiceLine(
      caseKey,
      state,
      'standBy',
      `standBy:${topic}`
    );
  }

  return addEntry(
    state,
    `resolved:${topic}`,
    question,
    answer,
    relevant
      ? 'Retraction recorded alongside the original. You must still draw your own conclusion.'
      : 'No retraction. This does not certify that the entire account is true.'
  );
}