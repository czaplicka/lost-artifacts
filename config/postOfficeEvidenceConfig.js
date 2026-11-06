const ROOT = 'assets/side_quests/Post/';

export const POSTAL_EVIDENCE_ART = {
  envelope: {
    key: 'post_case_envelope',
    url: ROOT + 'return_to_sender_envelope.webp'
  },
  card: {
    key: 'post_case_card',
    url: ROOT + 'return_to_sender_forwarding_card.webp'
  },
  notice: {
    key: 'post_case_notice',
    url: ROOT + 'return_to_sender_clock_repairs_notice.webp'
  },
  reply: {
    key: 'post_case_reply',
    url: ROOT + 'return_to_sender_reply.webp'
  },
  reward: {
    key: 'post_case_reward',
    url: ROOT + 'return_to_sender_delivered_card.webp'
  },
  restanteEmpty: {
    key: 'post_restante_empty',
    url: ROOT + 'post_office_poste_restante_empty.webp'
  }
};

// Hotspot centres and sizes in a 1920 x 1080 canvas.
// Edit using D / C in the scene.
export const POSTAL_DOCUMENTS = {
  envelope: {
    title: 'THE RETURNING LETTER',
    clue: 'envelope',
    spots: [
      {
        id: 'name',
        label: 'Original recipient',
        x: 1019,
        y: 455,
        w: 600,
        h: 170,
        text:
          'A. REED / CLOCK REPAIRS. A name and a trade, not yet a verified current identity.'
      },
      {
        id: 'trail',
        label: 'Forwarding trail',
        x: 621,
        y: 726,
        w: 625,
        h: 410,
        text:
          'Three old addresses have been crossed out or superseded. The envelope has repeatedly returned; its contents remain sealed.'
      },
      {
        id: 'office',
        label: 'Final forwarding',
        x: 1426,
        y: 787,
        w: 440,
        h: 220,
        text:
          'The last forwarding instruction names the PI office, not the recipient’s home.'
      }
    ]
  },

  card: {
    title: 'SIGNED FORWARDING CARD',
    clue: 'card',
    overlay: {
      x: 435,
      y: 390,
      w: 1030,
      h: 250,
      text:
        'If my mail cannot be delivered,\nI authorise its referral to a\nprivate investigator for the purpose\nof locating me.'
    },
    spots: [
      {
        id: 'authorisation',
        label: 'Authorisation',
        x: 960,
        y: 490,
        w: 1030,
        h: 250,
        text:
          'A. Reed authorises undeliverable correspondence to be referred to a private investigator. This is not permission to open the sealed letter.'
      },
      {
        id: 'signature',
        label: 'Signature',
        x: 590,
        y: 790,
        w: 500,
        h: 170,
        text:
          'The forwarding card is signed A. Reed.'
      },
      {
        id: 'watch',
        label: 'Watch drawing',
        x: 1320,
        y: 790,
        w: 330,
        h: 210,
        text:
          'A small pocket-watch drawing accompanies the signature. It is a supporting detail, not proof of identity by itself.'
      }
    ]
  },

  notice: {
    title: 'CLOCK REPAIRS',
    clue: 'notice',
    spots: [
      {
        id: 'identity',
        label: 'Current and former name',
        x: 960,
        y: 540,
        w: 820,
        h: 230,
        text:
          'ELLIS BELL. Formerly trading as A. Reed. The advertisement explicitly connects the two names.'
      },
      {
        id: 'contact',
        label: 'Correspondence contact',
        x: 960,
        y: 780,
        w: 800,
        h: 210,
        text:
          'Poste restante / CLOCKWORK. A correspondence alias, not a residential address.'
      }
    ]
  },

  reply: {
    title: 'ELLIS’S REPLY',
    overlay: {
      x: 440,
      y: 340,
      w: 1020,
      h: 400,
      text:
        'Yes, A. Reed was my old trading name.\nI changed it after a business partnership ended.\n\nPlease leave the sealed letter here for CLOCKWORK.\n\nTell the sender I can receive a reply through this desk,\nbut please do not pass on my new name.'
    },
    spots: [
      {
        id: 'message',
        label: 'Read the reply',
        x: 960,
        y: 540,
        w: 1050,
        h: 430,
        text:
          'Ellis confirms that A. Reed was his former trading name. He asks for the sealed letter to be left for CLOCKWORK and for his new name not to be passed to the sender.'
      },
      {
        id: 'signature',
        label: 'Ellis Bell’s signature',
        x: 1350,
        y: 820,
        w: 420,
        h: 180,
        text:
          'Ellis Bell signs the reply. His request for privacy gives you a choice about what to put in your report.'
      }
    ]
  },

  reward: {
    title: 'DELIVERED. EVENTUALLY.',
    spots: [
      {
        id: 'card',
        label: 'Postal commendation',
        x: 960,
        y: 540,
        w: 1150,
        h: 620,
        text:
          'DELIVERED. EVENTUALLY. A commemorative card for completing Return to Sender. Not a payment voucher, and not new evidence.'
      }
    ]
  }
};