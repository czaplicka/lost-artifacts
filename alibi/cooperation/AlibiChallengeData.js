export const MODES = ['space', 'press', 'pause'];

export const CUES = {
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

export const CHALLENGE_PROGRESS = [
  'Let me think through the next part.',
  'All right. There is another point I need to consider.',
  'I am working through it. Let us not rush the next part.',
  'One more part of this needs thinking through.',
  'I need to consider how to answer the next point.',
  'We have not finished with this question yet.'
];

export const CHALLENGE_SETBACK = [
  'That did not help me explain it.',
  'We are not getting a clearer answer that way.',
  'That approach is not helping me work through the question.',
  'We seem to be talking past each other.',
  'I cannot explain it better while we proceed like this.',
  'That has not made the question easier to address.'
];
