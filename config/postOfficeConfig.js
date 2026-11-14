import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const POST_OFFICE_ART = {
  room: {
    key: 'postal_room',
    url: 'assets/pi/postoffice/post_office_postman.webp'
  },
  empty: {
    key: 'postal_empty',
    url: 'assets/pi/postoffice/post_office.webp'
  },
  restante: {
    key: 'postal_restante',
    url: 'assets/pi/postoffice/post_office_poste_restante.webp'
  },
  portrait: {
    key: 'postal_postman',
    url: 'assets/pi/postoffice/postman.webp'
  }
};

// Rectangles use centres in the original 1920 x 1080 artwork.
export const POST_OFFICE_HOTSPOTS = {
  room: [
    {
      id: 'postman',
      label: __dialogueText("config/postOfficeConfig.js", "t_213985e12832da8db677"),
      x: 1075,
      y: 640,
      w: 300,
      h: 810,
      action: 'talk'
    },
    {
      id: 'bell',
      label: __dialogueText("config/postOfficeConfig.js", "t_41e1d3d7e96a79bcf1f9"),
      x: 920,
      y: 608,
      w: 66,
      h: 65,
      action: 'return'
    },
    {
      id: 'correspondence',
      label: __dialogueText("config/postOfficeConfig.js", "t_88aac9b0c74879698739"),
      x: 650,
      y: 440,
      w: 140,
      h: 300,
      action: 'restante'
    },
    {
      id: 'notice',
      label: __dialogueText("config/postOfficeConfig.js", "t_a2ac9de0918544ff40f4"),
      x: 1800,
      y: 395,
      w: 230,
      h: 390,
      action: 'notice'
    },
    {
      id: 'route',
      label: __dialogueText("config/postOfficeConfig.js", "t_faab60f585dc3e51b746"),
      x: 68,
      y: 677,
      w: 125,
      h: 170,
      action: 'route'
    },
    {
      id: 'parcels',
      label: __dialogueText("config/postOfficeConfig.js", "t_50b440ead25d46b392cf"),
      x: 1765,
      y: 817,
      w: 300,
      h: 310,
      action: 'parcels'
    }
  ],

  restante: [
    {
      id: 'clockwork',
      label: __dialogueText("config/postOfficeConfig.js", "t_006773a6c90796e52ff8"),
      x: 964,
      y: 750,
      w: 545,
      h: 362,
      action: 'collect'
    },
    {
      id: 'letters',
      label: __dialogueText("config/postOfficeConfig.js", "t_86e3d7316c267b8f6402"),
      x: 525,
      y: 781,
      w: 270,
      h: 245,
      action: 'deposit'
    },
    {
      id: 'writing',
      label: __dialogueText("config/postOfficeConfig.js", "t_143ec6898223932d6be7"),
      x: 830,
      y: 1030,
      w: 334,
      h: 90,
      action: 'write'
    },
    {
      id: 'bell',
      label: __dialogueText("config/postOfficeConfig.js", "t_41e1d3d7e96a79bcf1f9"),
      x: 1691,
      y: 988,
      w: 155,
      h: 135,
      action: 'service'
    },
    {
      id: 'policy',
      label: __dialogueText("config/postOfficeConfig.js", "t_302de45c92202abdae15"),
      x: 1873,
      y: 394,
      w: 155,
      h: 340,
      action: 'policy'
    }
  ]
};