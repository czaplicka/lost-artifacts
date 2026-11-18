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

export const PROFILES = [
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
