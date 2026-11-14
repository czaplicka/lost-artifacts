// config/detectiveOfficeConfig.js

export const OFFICE_CONFIG = {
  backgroundKey: 'pi_office_bg',
  backgroundUrl: 'assets/local/pioffice.webp',

  officeLabel: 'PI OFFICE',

  citySceneKey: 'HomeCityScene',

  hotspots: [
  {
    "id": "computer",
    "label": "Computer",
    "x": 1582,
    "y": 851,
    "w": 420,
    "h": 435,
    "action": "computer"
  },
  {
    "id": "phone",
    "label": "Phone",
    "x": 427,
    "y": 913,
    "w": 360,
    "h": 250,
    "action": "phone"
  },
  {
    "id": "city-door",
    "label": "Go to your city",
    "x": 993,
    "y": 479,
    "w": 555,
    "h": 590,
    "action": "city"
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