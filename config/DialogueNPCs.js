// config/DialogueNPCs.js
import { MainStoryManager } from '../managers/MainStoryManager.js';

export const DIALOGUE_EVIDENCE_IDS = Object.freeze({
  BLACK_HAIR: 'clue_black_hair',
  COIN: 'clue_coin',
  MUSEUM_TICKET: 'museum_ticket'
});

// Stały indeks odpowiedzi: po awansie fabuły odpowiedź Holly nie zostanie
// błędnie potraktowana jako powtórzenie wcześniejszej odpowiedzi.
const husbandDeathResponse = {
  get when() {
    return MainStoryManager.hasReachedStage('learned_dead')
      ? null
      : { any: [] };
  },
  say: ['Dead? Honey. Check the funeral. Then check if the funeral checked out.']
};

export const DIALOGUE_NPCS = {
  holly: {
    id: 'holly',
    name: 'Holly',
    role: '(this is a dream. probably.)',
    showTrust: false,
    useTones: false,
    evidenceTab: false,
    greeting: [
      {
        when: { firstVisit: true },
        say: [
          '*The office is upside down. Holly sits on the ceiling, filing her nails. Your trousers are missing.*',
          "You're late, {player}. Also: no trousers. Relax. It's a dream. Mostly."
        ],
        choices: [
          {
            label: 'Why am I here?',
            say: ['Because you keep ignoring the obvious. Your subconscious has a very short fuse.'],
            effects: [{ flag: 'holly_asked_why' }]
          },
          {
            label: 'Where are my trousers?',
            say: ["Filed under 'Things You Lost Along The Way'. Third drawer. Don't look."]
          },
          {
            label: 'Wake me up.',
            say: [
              'Too early. You still have a case, a client, and no pants.',
              '*It starts raining coffee from the ceiling.*'
            ],
            end: true
          }
        ]
      },
      { say: ['Back again? Dream rent is due Friday.'] }
    ],
    farewell: [{
      say: [
        '*Holly waves with a nail file.*',
        'Mind the floor. It is the ceiling.'
      ]
    }],
    topics: [
      {
        id: 'husband',
        label: 'The missing husband. Any ideas?',
        responses: [
          husbandDeathResponse,
          {
            say: ["He's where men always are when you need them: 'in a meeting'. Try the basement. Metaphorically. Possibly literally."],
            effects: [{ event: 'dream:hint', data: { topic: 'husband' } }]
          }
        ]
      },
      {
        id: 'who',
        label: 'Who are you, really?',
        say: ["I'm the part of you that reads the small print. Also, I have great legs."]
      },
      {
        id: 'ceiling',
        label: 'Why are you on the ceiling?',
        say: ['Better view. The floor is full of things you refuse to deal with.']
      }
    ]
  },

  csi_dex: {
    id: 'csi_dex',
    name: 'Dex',
    role: 'CSI Lab Assistant',
    startTrust: 45,
    bribeCost: 10,
    reacts: { polite: 2, joke: [0, 5], pressure: -5, bribe: 3 },
    greeting: [
      {
        when: { firstVisit: true },
        say: [
          '*A man in a lab coat three sizes too large looks up from a microscope. He is eating cereal. In the lab.*',
          "You must be the detective. Don't touch anything. Especially not the cereal."
        ]
      },
      {
        when: { level: ['hostile', 'wary'] },
        say: ['Oh. You again. The microscope is busy. So am I.']
      },
      { say: ['Hey, {player}! The lab smells like burnt coffee and justice. What do you need?'] }
    ],
    farewell: [
      {
        when: { level: ['hostile', 'wary'] },
        say: ['Close the door. From the outside.']
      },
      { say: ['Bring me something interesting. Not another coin.'] }
    ],
    topics: [
      {
        id: 'results',
        label: 'Any results on my evidence?',
        minTrust: 25,
        locked: ['The lab does not run on goodwill. Or on strangers.'],
        responses: [
          {
            when: { trustMin: 70 },
            say: [
              'Okay, off the record: that hair is dyed. Cheap box dye. Our thief wants to be a brunette so badly.',
              '*He lowers his voice.*',
              'And the shoe print is worn on the outside edge. Bad knees. Or bad choices.'
            ],
            effects: [
              { flag: 'dex_gave_bonus' },
              { event: 'clue:bonus', data: { id: 'dyed_hair' } }
            ],
            meta: { bonusClue: true }
          },
          { say: ['Hair: one. Fibre: one. Coin: one. Conclusion: "yes, those exist". Come back when I like you more.'] }
        ]
      },
      {
        id: 'coffee',
        label: 'Nice lab. Is that coffee any good?',
        responses: [{
          say: [
            "It's three days old. It has evolved. I call it Kevin.",
            '*He gently pats the coffee machine.*'
          ],
          effects: [{ trust: 5 }, { unlock: 'cat' }]
        }]
      },
      {
        id: 'cereal',
        label: 'Why are you eating cereal in a crime lab?',
        responses: [{
          say: ["It's a controlled environment. Mostly controlled by cereal."],
          effects: [{ trust: [0, 6] }]
        }]
      },
      {
        id: 'cat',
        label: 'Do you have a cat? You look like a cat person.',
        hidden: true,
        responses: [{
          say: ["Two. Fingerprint and Alibi. Alibi never has an alibi. He's always on the evidence table."],
          effects: [{ trust: 6 }]
        }]
      },
      {
        id: 'red_herring',
        label: 'What about the fibre and the coin?',
        responses: [{
          say: [
            'Polyester fibre. From every jacket in the city. And a coin. It is a coin.',
            'Interesting? Sure. Useful? Ask me in a parallel universe.'
          ],
          meta: { redHerring: true }
        }]
      }
    ],
    evidence: {
      [DIALOGUE_EVIDENCE_IDS.BLACK_HAIR]: {
        responses: [
          {
            when: { trustMin: 50 },
            say: ['Black, human, shed recently. Give me an hour and a coffee. Not Kevin.'],
            effects: [{ trust: 2 }]
          },
          { say: ['Put it in the bag. THE bag. Not on my desk.'] }
        ]
      },
      [DIALOGUE_EVIDENCE_IDS.COIN]: {
        say: ["A coin. It's a coin. I'm not paid enough to say more."],
        effects: [{ trust: -1 }]
      }
    }
  },

  curator_pemberton: {
    id: 'curator_pemberton',
    name: 'Dr. Pemberton',
    role: 'Curator, City Museum',
    startTrust: 25,
    reacts: { polite: 3, joke: [-5, 1], pressure: -8, bribe: -12 },
    walkOut: {
      at: 8,
      recoverTo: 20,
      say: [
        '*He straightens his bow tie. Slowly. With menace.*',
        'This conversation is over. Security will help you find the exit. Or the pavement.'
      ],
      returnSay: [
        '*He sighs the sigh of a man who remembers everything.*',
        'Oh. You. Make it quick. Keep your voice down. And your hands.'
      ]
    },
    greeting: [
      {
        when: { firstVisit: true },
        say: [
          '*Dr. Pemberton polishes a vase that is clearly not his to polish.*',
          'If this is about the break-in, I have already told the police everything. Twice. In writing.'
        ]
      },
      { say: ["Detective. I'd say 'welcome back', but I'm a man of facts."] }
    ],
    farewell: [
      {
        when: { trustMin: 60 },
        say: ['Do come again. Preferably with fewer questions and more pottery.']
      },
      { say: ['The exit is that way. It was also that way when you came in.'] }
    ],
    topics: [
      {
        id: 'alibi',
        label: 'Where were you on the night of the theft?',
        responses: [
          {
            when: { trustMin: 60 },
            say: [
              'I gave a lecture on Ming-era pottery. Until 21:40. Not 22:30, as the flyer says. I ran out of pottery.',
              '*He looks mildly ashamed.*',
              'Then I left to feed the museum cat. The one we do not officially have.'
            ],
            effects: [
              { flag: 'pemberton_left_early' },
              { unlock: 'assistant' },
              { event: 'alibi:update', data: { suspect: 'curator', claim: 'left_2140' } }
            ],
            meta: { lie: false }
          },
          {
            when: { trustMin: 35 },
            say: ['I gave a lecture. Until 22:30. Ask anyone. Well. Ask the four people who stayed awake.'],
            effects: [
              { unlock: 'assistant' },
              { event: 'alibi:statement', data: { suspect: 'curator', claim: 'lecture_until_2230' } }
            ],
            meta: { lie: true }
          },
          { say: ['I was... occupied. Culturally. That is all I will say.'] }
        ]
      },
      {
        id: 'vase',
        label: 'That is a beautiful vase.',
        responses: [{
          say: [
            '*His eyes light up.*',
            'Qing dynasty. Nobody ever notices. Thank you.',
            'Please keep talking. About the vase.'
          ],
          effects: [{ trust: 8 }]
        }]
      },
      {
        id: 'value',
        label: 'How much was the stolen artifact worth?',
        minTrust: 45,
        locked: ["Priceless. And I am not discussing prices with a man in that coat."],
        responses: [{
          say: [
            'Officially: priceless. Insurance says: very, very priced.',
            'Unofficially: someone out there is going to be very disappointed with a fence. Or a very pleased one.'
          ],
          effects: [{ event: 'clue:value', data: { id: 'artifact_value' } }]
        }]
      },
      {
        id: 'assistant',
        label: 'Tell me about your assistant.',
        hidden: true,
        responses: [
          {
            when: { flag: 'pemberton_left_early' },
            say: ['Lucy? Brilliant. Always late. Last Friday she was early, which in hindsight is rather suspicious.'],
            effects: [{ event: 'suspect:note', data: { who: 'assistant', note: 'unusually early on Friday' } }]
          },
          { say: ['Reliable. Mostly. She has never once stolen anything. To my knowledge.'] }
        ]
      }
    ],
    evidence: {
      [DIALOGUE_EVIDENCE_IDS.BLACK_HAIR]: {
        responses: [
          {
            when: { trustMin: 50 },
            say: ['Black. Not mine. I am, as you see, gloriously silver.'],
            effects: [{ trust: 3 }]
          },
          { say: ['Hair? Detective, this is a museum. We have mummies. Hair is our business.'] }
        ]
      },
      [DIALOGUE_EVIDENCE_IDS.MUSEUM_TICKET]: {
        responses: [
          {
            when: { flag: 'pemberton_left_early' },
            say: [
              '*He looks at the ticket and sags.*',
              'Yes. The lecture ended early. I should have said so.'
            ],
            effects: [{ trust: 6 }]
          },
          { say: ['A ticket to my lecture. Row F. Strangely, nobody ever sits in row F.'] }
        ]
      }
    }
  }
};

export function registerAllDialogues(manager) {
  manager.registerNpcs(DIALOGUE_NPCS);
}
