export const MOMS_CASE_ID = 'pi_moms_not_proud';
export const MOMS_CONTENT_VERSION = 1;

export const MOMS_BRIEFING = Object.freeze({
  id: 'moms_not_proud_client_briefing',
  from: 'Vincenzo Moretti',
  subject: "Mom's Not Proud — a wall-related emergency",

  body:
    'Detective,\n\n' +
    'Someone is painting outside my pizzeria after closing.\n\n' +
    'The artwork appears to depict a pigeon judging my pizza. ' +
    'I will accept criticism from customers, but not birds.\n\n' +
    'Please identify the person and establish exactly what they are doing. ' +
    'Observe from the public pavement. Do not enter the premises.\n\n' +
    'I have supplied a family photograph in case you need to speak to my daughter Raven. ' +
    'She helps with the advertising. This does not make her a suspect. ' +
    'I am saying this before you make that face.\n\n' +
    'My wife restores historic buildings for the city. ' +
    'If she hears the words “unauthorised mural”, I shall be sleeping next to the flour.\n\n' +
    'Agreed fee: $150.\n\n' +
    'Vincenzo Moretti'
});

export const MOMS_OBJECTIVES = Object.freeze([
  Object.freeze({
    id: 'review_briefing',
    text: 'Read Moretti’s instructions and inspect the family photograph.'
  }),

  Object.freeze({
    id: 'document_activity',
    text: 'Photograph the artist working and obtain a clear identification photograph during the same observation.'
  }),

  Object.freeze({
    id: 'identify_artist',
    text: 'Compare the identification photograph with the supplied family photograph.'
  }),

  Object.freeze({
    id: 'verify_permission',
    text: 'Speak to the artist and check the written permission.'
  }),

  Object.freeze({
    id: 'submit_report',
    text: 'Submit your findings to the client.'
  })
]);

export const MOMS_PHOTO_RULES = Object.freeze({
  activity: Object.freeze({
    id: 'activity',
    label: 'The painting in progress',

    requiredSubjects: Object.freeze([
      'artist',
      'painting_hand',
      'advertising_panel'
    ]),

    description:
      'The artist is applying paint to a panel mounted outside the pizzeria. ' +
      'This documents the activity, not whether it was authorised.'
  }),

  identity: Object.freeze({
    id: 'identity',
    label: 'The artist’s face',

    requiredSubjects: Object.freeze([
      'artist_face'
    ]),

    description:
      'A clear view of the artist’s face. ' +
      'It must be compared with the client’s reference photograph.'
  }),

  requireSameObservation: true
});

export const MOMS_IDENTITY_OPTIONS = Object.freeze([
  Object.freeze({
    id: 'raven',
    label: 'Raven Moretti',
    correct: true
  }),

  Object.freeze({
    id: 'vincenzo',
    label: 'Vincenzo Moretti',
    correct: false
  }),

  Object.freeze({
    id: 'unidentified',
    label: 'The photographs do not permit identification',
    correct: false
  })
]);

export const MOMS_DIALOGUE = Object.freeze([
  Object.freeze({
    id: 'introduction',
    speaker: 'Raven',

    text:
      'Dad hired a detective? Excellent. ' +
      'The marketing budget has finally overtaken the napkin budget.'
  }),

  Object.freeze({
    id: 'surface',
    speaker: 'Raven',

    text:
      'It is a removable advertising panel. ' +
      'The original wall is behind it. Untouched. ' +
      'Mum made me explain that distinction three times.'
  }),

  Object.freeze({
    id: 'permission',
    speaker: 'Raven',

    text:
      'Dad signed the proposal. ' +
      '“Refresh the exterior visual communication.” ' +
      'I even attached a sketch. He used it to write down a mozzarella delivery.'
  }),

  Object.freeze({
    id: 'pigeon',
    speaker: 'Raven',

    text:
      'The pigeon is not judging the pizza. ' +
      'It is experiencing authentic Italian emotion. ' +
      'Dad makes the same face when someone orders pineapple.'
  })
]);

export const MOMS_DOCUMENT = Object.freeze({
  id: 'moms_signed_proposal',
  title: 'Exterior advertising proposal',

  body:
    'MORETTI PIZZERIA\n' +
    'Exterior visual communication refresh\n\n' +
    'Surface: existing removable advertising panel beside the entrance.\n' +
    'Work: repaint the panel with the attached pigeon-and-pizza design.\n' +
    'Original building wall: no paint or alterations.\n' +
    'Artist: Raven Moretti.\n\n' +
    'Approved: Vincenzo Moretti.\n\n' +
    'Handwritten addition: “Ask supplier about mozzarella.”'
});

export const MOMS_CONCLUSION = Object.freeze({
  question: 'What do the collected records establish?',

  options: Object.freeze([
    Object.freeze({
      id: 'authorised_panel',
      correct: true,

      text:
        'Raven is repainting the removable advertising panel. ' +
        'The written approval names her and describes that work.'
    }),

    Object.freeze({
      id: 'criminal_wall_damage',
      correct: false,

      text:
        'The photographs prove that Raven damaged the original wall without permission.'
    }),

    Object.freeze({
      id: 'unknown_vandal',
      correct: false,

      text:
        'An unidentified vandal is responsible. ' +
        'The family photograph and signed proposal can be ignored.'
    })
  ]),

  correction:
    'Separate identity, activity, surface and permission. ' +
    'The photographs document the person and painting. ' +
    'The proposal documents what Moretti approved.'
});

export const MOMS_ENDINGS = Object.freeze({
  honest: Object.freeze({
    id: 'honest',
    label: 'SUBMIT THE COMPLETE FINDINGS',
    integrityEffect: 'honest_report',
    nominalIntegrity: 5,

    report:
      'The observed artist was identified as Raven Moretti by comparison ' +
      'with the client’s supplied family photograph.\n\n' +
      'The photographs document painting on the exterior advertising panel. ' +
      'Raven explained that the panel is removable and that the original wall is untouched.\n\n' +
      'The signed proposal names Raven, identifies the removable panel, ' +
      'and authorises the pigeon-and-pizza design. ' +
      'The client should resolve any disagreement about the design directly with the artist.\n\n' +
      'The collected material does not support the allegation of an unknown, unauthorised vandal.',

    reply:
      'Moretti: “I thought exterior communication meant a bigger menu.”\n\n' +
      'Raven: “The pigeon is holding one.”\n\n' +
      'Moretti: “Fine. But the bird pays for its own toppings.”'
  }),

  conceal: Object.freeze({
    id: 'conceal',
    label: 'WITHHOLD THE IDENTIFICATION AND APPROVAL',
    integrityEffect: 'concealed_findings',
    nominalIntegrity: -5,

    report:
      'Painting was observed outside the pizzeria. ' +
      'The report does not identify the artist or provide a conclusion about permission.\n\n' +
      'The identification match and signed approval are deliberately withheld from the client.',

    reply:
      'Moretti: “An inconclusive report. For $150.”\n\n' +
      'Raven: “Dad, shall I put that on the next advertising panel?”'
  })
});