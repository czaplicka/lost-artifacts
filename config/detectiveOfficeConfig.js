// config/detectiveOfficeConfig.js

export const OFFICE_CONFIG = {
  backgroundKey: 'pi_office_bg',
  backgroundUrl: 'assets/local/pioffice.jpg',

  officeLabel: 'PI OFFICE',

  citySceneKey: 'HomeCityScene',

  hotspots: [
    {
      id: 'computer',
      label: 'Computer',
      x: 260,
      y: 430,
      w: 230,
      h: 170,
      action: 'computer'
    },
    {
      id: 'phone',
      label: 'Phone',
      x: 640,
      y: 520,
      w: 110,
      h: 130,
      action: 'phone'
    },
    {
      id: 'city-door',
      label: 'Go to your city',
      x: 1300,
      y: 470,
      w: 140,
      h: 420,
      action: 'city'
    }
  ],

  newsTicker: {
    y: 0,
    height: 44,
    speed: 90,

    headlines: [
      'PI OFFICE OPEN — private enquiries welcome.',
      'Police remind residents that a convincing story is not necessarily an alibi.',
      'Local classifieds: unusual requests, discreet payments.',
      'The city never sleeps. Your detective probably should.'
    ]
  }
};