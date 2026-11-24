import { dialogueText } from '../../dialogues/DialogueText.js';

// Klucze tekstów pozostają przypisane do dawnego pliku sceny.
const SOURCE = 'scenes/HollyIntroScene.js';

export const T = id => dialogueText(SOURCE, id);

export const HOLLY = T('t_58de530cfa35752b7230');
export const DETECTIVE = T('t_1e954e77ee4e5253c6c5');

const line = (speaker, id, extra = {}) => ({
  speaker,
  text: T(id),
  ...extra
});

export const OPENING_SCRIPT = [
  line(HOLLY, 't_3cfc53f7bfc5b8f7ae88'),
  {
    choice: true,
    options: [
      {
        tone: 'sarcastic',
        lines: [
          line(DETECTIVE, 't_74c233625f6b492e13c7'),
          line(HOLLY, 't_50e757c57fabc06607f1')
        ]
      },
      {
        tone: 'serious',
        lines: [
          line(DETECTIVE, 't_f4f93a89db6836d93750'),
          line(HOLLY, 't_240d4587c662a3616fac')
        ]
      },
      {
        tone: 'greedy',
        lines: [
          line(DETECTIVE, 't_bb744364ded3e1c4e5b2'),
          line(HOLLY, 't_ebbdaa241cb92cf1064a'),
          line(HOLLY, 't_50e757c57fabc06607f1')
        ]
      }
    ]
  },
  line(HOLLY, 't_62c37e29d04f7e79b74c'),
  line(DETECTIVE, 't_dd7c20fddbdfc0013122'),
  line(HOLLY, 't_e9fbee6a8263393ebd98', {
    stamp: 'CLASSIFIED'
  }),
  {
    choice: true,
    options: [
      {
        tone: 'sarcastic',
        lines: [
          line(DETECTIVE, 't_5ad00f98d7e55e4f19be'),
          line(HOLLY, 't_27cd71ceb568b2a867e3')
        ]
      },
      {
        tone: 'serious',
        lines: [
          line(DETECTIVE, 't_034bc3a16d07673de51a')
        ]
      },
      {
        tone: 'greedy',
        lines: [
          line(DETECTIVE, 't_1da4c748f4fb0244aa69'),
          line(HOLLY, 't_6030b237e93b17d23fff')
        ]
      }
    ]
  },
  line(HOLLY, 't_9e5655f42cefea5b5d71'),
  line(DETECTIVE, 't_f65d02ecbea38aac4be3'),
  line(HOLLY, 't_54ca21d98060df467a90'),
  line(DETECTIVE, 't_51863d7a15d8a13e3401'),
  line(HOLLY, 't_0048782429e52a93ccdf', {
    stamp: T('t_26ce46b10bbdbeeccac6')
  })
];

export const CLOSING_SCRIPT = [
  line(HOLLY, 't_446661c97578f44ff416'),
  line(DETECTIVE, 't_d97965f43c564e3eeb15'),
  line(HOLLY, 't_d51576c7ff76180b8316'),
  line(DETECTIVE, 't_6509a5b517eb995a2b4c')
];

export const REWARD_CHOICES = [
  {
    id: 'cash',
    label: T('t_fb5b1b0623205ba2c12c'),
    desc: T('t_e21e026308b1dd9fce2a')
  },
  {
    id: 'rest',
    label: T('t_878cef89d2a9686096fb'),
    desc: T('t_21b6487c0f96a50b7a2e')
  },
  {
    id: 'kit',
    label: T('t_2fb1d1b9ec31b925e61f'),
    desc: T('t_cb1031afb8c84378546b')
  },
  {
    id: 'travel',
    label: T('t_434a8d75fb758289413a'),
    desc: T('t_47b1dcd8b1cdd60d9be7')
  }
];
