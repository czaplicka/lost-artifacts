// All texts of St. John Church (plain data - easy to move to a JSON file later).
export const PRIEST = 'FATHER CRUMB';

export const TEXT = {
  title: 'ST. JOHN CHURCH',
  hint: 'Click things. In a church everything is either holy or suspicious.',
  back: 'BACK TO TOWN',
  exitLabel: 'EXIT TO THE STREET',

  priestGreeting: 'Ah, a detective! Welcome to St. John\'s. We get two kinds of visitors: people who want forgiveness and people who want to find out whether the donation box has a bottom. Which are you?',
  priestMenu: 'Yes, my child? I have seventeen minutes before the next funeral. Nothing personal.',
  priestChoices: {
    about: 'Tell me about this church.',
    gossip: 'Any gossip? Priests hear everything.',
    bless: 'Could you bless my magnifying glass?',
    advice: 'I\'m on a case. Any advice?',
    bye: 'Never mind, Father.'
  },
  about: 'St. John\'s was built in 1887, rebuilt in 1923 after The Incident, and rebuilt again in 1924 after the rebuilding. The tower leans on purpose. That is what I tell the insurance people, anyway.',
  aboutChoices: { incident: 'What was The Incident?' },
  incident: 'A choir, a barrel of communion wine and a very ambitious fireworks display for the Feast Day. We do not talk about it. The bishop does not talk about it. The choir sings about it, though. That is Hymn 404.',
  gossip: 'Priests hear nothing. Confession is sacred. HOWEVER, nothing in the rules stops me from noticing who walks past the cemetery gate at midnight. Not saying who. Not saying it is busy. Mrs. Pennywhistle\'s cat has been on the roof since Tuesday, by the way. Possibly Tuesday last year. It has taken it well.',
  bless: 'A magnifying glass? Certainly. May it find what is hidden and never, ever set fire to the evidence. *waves hand* Done. No charge. I will not bless a gun, though. I will, however, bless the sandwich in your coat pocket.',
  advice: 'Advice is free, wisdom costs five dollars in the box over there. Mostly I would say: people lie about where they were, almost never about how they felt. Ask about feelings, and the timeline falls out by itself. And check Tuesday. It is always Tuesday.',
  priestBye: 'Go in peace. Or at least go quietly, the pigeon is trying to sleep.',

  quips: {
    window: [
      'The window shows St. John holding a book in one hand and, for reasons lost to history, a fish in the other. Father Crumb says the fish represents "the one that got away". The artist was clearly also an angler.',
      'One pane is the bottom of a beer bottle. Nobody remembers when it was installed. It is the best pane.'
    ],
    altar: [
      'The altar is covered with a white cloth and one faint ring of tea. Father Crumb insists it is "the Holy Mug". It is a mug.',
      'A very small sign under the cross: "PLEASE DO NOT PUT YOUR COFFEE ON THE ALTAR. - MANAGEMENT". Under it, in a different pen: "WE MEAN IT. - THE ALTAR".'
    ],
    organ: [
      'You press a key. The organ answers with a sound like a goose being introduced to a tuba.',
      'You play three notes of something that might be Bach. The pigeon in the rafters boos.',
      'The organ has 1,204 pipes. Three work. They all play the same note.',
      'A sign on the keys: "PLEASE DON\'T. - MANAGEMENT". Underneath, in another pen: "WE MEAN IT. - THE CHOIR".'
    ],
    pigeon: [
      'A pigeon sits on a rafter and watches you. It gives you the exact look your own pigeon gives you when you forget the feed.',
      'The pigeon coos once. In church acoustics that sounds a lot like a verdict.',
      'You are fairly sure this pigeon claimed sanctuary. Nobody has the heart to tell it that is not how it works.'
    ],
    hymns: [
      'HYMNS TODAY: 12, 12, 404 and 7 (verse four only). Someone has added, in pencil: "NOT 12 AGAIN".',
      'Hymn 404 is missing from the hymnbook. Everybody sings it anyway. It is the best one.'
    ],
    pews: [
      'The pews are hard enough to make you confess to crimes you did not commit.',
      'Carved into a pew: "GERALD WAS HERE 1962". Underneath: "GERALD IS STILL HERE. HE LIVES IN PEW 9."',
      'Under the seat you find chewing gum from at least three centuries. You decide not to bring it to the lab.'
    ],
    bell: [
      'DONG! Somewhere across town a cat falls off a roof. It lands on its feet. The roof is less lucky.',
      'You pull again. DONG. A pigeon files a formal complaint.',
      'DONG. Mrs. Pennywhistle opens her window and shouts something. You have never seen so much fury in a dressing gown.',
      'DONG. DONG. Father Crumb appears from nowhere: "That is for FUNERALS, my child." A pause. "And for the lunch break."'
    ]
  },

  confessional: {
    intro: 'A wooden booth with a red curtain and a small grille. A faded sign says: "SPEAK UP. THE PRIEST IS 83 AND PROUD OF IT."',
    confess: 'Confess something',
    eavesdrop: 'Eavesdrop on the other booth',
    leave: 'Step away from the booth',
    confessions: [
      'You admit you told your landlady the rent was "in the mail". From behind the grille: "Everyone says that. Three Hail Marys, and mail it."',
      'You admit you once ate a witness\'s lunch. "Was the witness hungry?" "Very." "Ten Hail Marys and buy him a sandwich."',
      'You admit you have never read the terms and conditions of anything. A long silence. "Nobody has, my child. Go in peace."',
      'You confess that you peek at the last page of detective novels. "Heresy," whispers the priest. "But a popular one."'
    ],
    eavesdropText: 'Priest-penitent privilege protects the priest. It does not protect the person kneeling in the next booth. You hear: "Father, I may have borrowed a church bell." "Which one?" "...The other one was already missing." You note it down. In your head. Which is less reliable than a notebook.'
  },

  donation: {
    intro: 'A sturdy wooden box with an iron lock and a slot the size of a very optimistic coin. The plaque says DONATE.',
    amounts: [5, 20],
    thanks: [
      'Clink. The box does not say thank you. You feel it did.',
      'Clink. Far away at the altar, Father Crumb nods without turning around. He has ears like a bat.',
      'Clink. Father Crumb has started praying for you personally. Quietly. In the key of "invoice".',
      'Clink. The box is now, technically, a sponsor of your investigation.'
    ],
    broke: 'You pat your pockets. Lint, a button and a receipt for something you do not remember buying. The box looks at you with infinite patience.',
    leave: 'Walk away from the box'
  },

  candles: {
    intro: 'An iron stand with votive candles. A hand-written card: "$2 PER CANDLE. THE LIGHT IS FREE. THE WAX IS NOT."',
    light: 'Light a candle ($2)',
    leave: 'Step back',
    lit: [
      'You light a candle for the case. It burns bravely for forty seconds, then drowns in its own wax.',
      'You light a candle for good alibis. It flickers whenever somebody lies. So, constantly.',
      'You light a candle for your pigeon. It sizzles. You hope that is a good sign.',
      'Another candle. The stand glows like a tiny, expensive city.'
    ],
    full: 'The stand is full. If you light one more, the fire brigade will become a regular.',
    broke: 'You are two dollars short of a miracle.'
  },

  exit: 'Back out into the street. The pigeon watches you go.'
};