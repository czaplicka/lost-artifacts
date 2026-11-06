export const POST_OFFICE_ART = {
  room: {
    key: 'postal_room',
    url: 'assets/local/post_office_postman.webp'
  },
  empty: {
    key: 'postal_empty',
    url: 'assets/local/post_office.webp'
  },
  restante: {
    key: 'postal_restante',
    url: 'assets/local/post_office_poste_restante.webp'
  },
  portrait: {
    key: 'postal_postman',
    url: 'assets/local/postman.webp'
  }
};

// Rectangles use centres in the original 1920 x 1080 artwork.
export const POST_OFFICE_HOTSPOTS = {
  room: [
    {
      id: 'postman',
      label: 'Postman',
      x: 1075,
      y: 640,
      w: 300,
      h: 810,
      action: 'talk'
    },
    {
      id: 'bell',
      label: 'Service bell',
      x: 920,
      y: 608,
      w: 66,
      h: 65,
      action: 'return'
    },
    {
      id: 'correspondence',
      label: 'Poste restante',
      x: 650,
      y: 440,
      w: 140,
      h: 300,
      action: 'restante'
    },
    {
      id: 'notice',
      label: 'Public notices',
      x: 1800,
      y: 395,
      w: 230,
      h: 390,
      action: 'notice'
    },
    {
      id: 'route',
      label: 'Delivery route',
      x: 68,
      y: 677,
      w: 125,
      h: 170,
      action: 'route'
    },
    {
      id: 'parcels',
      label: 'Undelivered parcels',
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
      label: 'CLOCKWORK',
      x: 964,
      y: 750,
      w: 545,
      h: 362,
      action: 'collect'
    },
    {
      id: 'letters',
      label: 'Letter deposit',
      x: 525,
      y: 781,
      w: 270,
      h: 245,
      action: 'deposit'
    },
    {
      id: 'writing',
      label: 'Write a message',
      x: 830,
      y: 1030,
      w: 334,
      h: 90,
      action: 'write'
    },
    {
      id: 'bell',
      label: 'Service bell',
      x: 1691,
      y: 988,
      w: 155,
      h: 135,
      action: 'service'
    },
    {
      id: 'policy',
      label: 'Postal policy',
      x: 1873,
      y: 394,
      w: 155,
      h: 340,
      action: 'policy'
    }
  ]
};