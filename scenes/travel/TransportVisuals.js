// scenes/travel/TransportVisuals.js
// Every legacy key (icon, logTitle, label, color, routeColor, clearRouteText,
// rerouteLabel, sfxKey, sfxVolume, iconOffsetY, animation) is kept, so other
// files that read TRANSPORT_VISUALS keep working.
//
// New keys:
//   ticketTitle / ticketColor  - header of the ticket card
//   lineColor                  - colour of the dashed route on the parchment map
//   vehicleKey                 - procedural texture (TravelTextures.js)
//   customVehicleKey           - OPTIONAL hand-drawn sprite; used automatically if loaded
//   vehicleScale, flies, arc   - sprite size, altitude effect, bend of the route
//   journeyMs                  - how long the vehicle needs to cross the map
//   trail                      - particle style behind the vehicle
//   seats, quips               - ticket seat + funny journal lines

export const TRANSPORT_VISUALS = {
  plane: {
    id: 'plane',
    icon: '✈',
    logTitle: 'FLIGHT LOG',
    ticketTitle: 'BOARDING PASS',
    label: 'Plane',
    color: '#f4e7c1',
    routeColor: 0xd9c27a,
    lineColor: 0xb3261e,
    ticketColor: 0x1b2a3a,
    clearRouteText: 'Clear skies. The flight remains on schedule.',
    rerouteLabel: 'FLIGHT PATH REROUTE',
    sfxKey: 'planesound',
    sfxVolume: 0.5,
    iconOffsetY: -18,
    animation: 'flight',
    vehicleKey: 'travel-vehicle-plane',
    customVehicleKey: 'travel_vehicle_plane',
    vehicleScale: 0.62,
    flies: true,
    arc: 0.22,
    journeyMs: 2600,
    trail: 'contrail',
    seatLabel: 'SEAT',
    seats: ['3A', '7C', '14B', '22F', '31E'],
    quips: [
      'Peanuts: 12. Legroom: theoretical.',
      'The captain says turbulence is just clouds being dramatic.',
      'Seat 14C. The neighbour is sure it was the butler.',
      'Your passport photo has aged better than you have.',
      'The in-flight crossword has one answer: ALIBI.'
    ]
  },

  train: {
    id: 'train',
    icon: '🚆',
    logTitle: 'RAIL LOG',
    ticketTitle: 'RAIL TICKET',
    label: 'Train',
    color: '#b8e0d2',
    routeColor: 0x8fd3ff,
    lineColor: 0x1f5f8b,
    ticketColor: 0x1d3b2f,
    clearRouteText: 'Clear tracks. The train remains on schedule.',
    rerouteLabel: 'RAIL ROUTE CHANGE',
    sfxKey: null,
    sfxVolume: 0,
    iconOffsetY: -20,
    animation: 'rail',
    vehicleKey: 'travel-vehicle-train',
    customVehicleKey: 'travel_vehicle_train',
    vehicleScale: 0.7,
    flies: false,
    arc: 0.06,
    journeyMs: 3000,
    trail: 'smoke',
    seatLabel: 'CAR / SEAT',
    seats: ['4 / 17A', '2 / 8C', '6 / 31B', '1 / 3D'],
    quips: [
      'Window seat. Beautiful landscape. A man eating a whole rotisserie chicken.',
      'The conductor punches your ticket and your confidence.',
      'Somewhere, a timetable weeps.',
      'Dining car coffee: officially classified as evidence.'
    ]
  },

  bus: {
    id: 'bus',
    icon: '🚌',
    logTitle: 'ROAD LOG',
    ticketTitle: 'BUS TICKET',
    label: 'Bus',
    color: '#ffd166',
    routeColor: 0xffb347,
    lineColor: 0xc2661a,
    ticketColor: 0x4a3216,
    clearRouteText: 'Clear roads. The bus remains on schedule.',
    rerouteLabel: 'ROAD DETOUR',
    sfxKey: null,
    sfxVolume: 0,
    iconOffsetY: -20,
    animation: 'road',
    vehicleKey: 'travel-vehicle-bus',
    customVehicleKey: 'travel_vehicle_bus',
    vehicleScale: 0.62,
    flies: false,
    arc: 0.05,
    journeyMs: 3200,
    trail: 'dust',
    seatLabel: 'SEAT',
    seats: ['STANDING', 'BY THE DOOR', 'LAST ROW', 'SOMEONE\'S LAP?'],
    quips: [
      'The bus smells of rain, onions and mystery. Perfect detective ambience.',
      'The driver\'s playlist has one song. On repeat. It is a crime.',
      'Seat belt: decorative. Suspension: philosophical.'
    ]
  },

  ship: {
    id: 'ship',
    icon: '🚢',
    logTitle: 'SEA LOG',
    ticketTitle: 'SEA PASSAGE',
    label: 'Ship',
    color: '#a8d8ff',
    routeColor: 0x62b6cb,
    lineColor: 0x0f6b73,
    ticketColor: 0x1a3a4a,
    clearRouteText: 'Calm waters. The vessel remains on schedule.',
    rerouteLabel: 'SEA ROUTE CHANGE',
    sfxKey: null,
    sfxVolume: 0,
    iconOffsetY: -22,
    animation: 'sea',
    vehicleKey: 'travel-vehicle-ship',
    customVehicleKey: 'travel_vehicle_ship',
    vehicleScale: 0.7,
    flies: false,
    arc: 0.08,
    journeyMs: 3400,
    trail: 'wake',
    seatLabel: 'CABIN',
    seats: ['12', '3 (BELOW WATERLINE)', '9', '27'],
    quips: [
      'The sea is big. Your budget is not.',
      'Everyone is a suspect. Mostly seasick, though.',
      'A seagull stares at you. It knows something.',
      'Deck chair: $2. Dignity: sold separately.'
    ]
  }
};

// Keys are normalised (lowercase, a-z0-9 only): 'new_york_city' -> 'newyorkcity'.
export const CITY_QUIPS = {
  paris: 'Paris: every suspect has an alibi and a better coat than you.',
  london: 'London: rain, tea and a crime rate best described as politely concerning.',
  berlin: 'Berlin: the club queue is longer than the suspect list.',
  newyorkcity: 'New York: everyone is in a hurry, nobody saw anything.',
  newyork: 'New York: everyone is in a hurry, nobody saw anything.',
  warsaw: 'Warsaw: pierogi first, interrogation second.',
  tokyo: 'Tokyo: a vending machine for everything except clues.',
  nairobi: 'Nairobi: the coffee is excellent. The leads are better.',
  newdelhi: 'New Delhi: honking is a language. You are learning it fast.',
  islamabad: 'Islamabad: tea first, questions later.',
  toronto: 'Toronto: so polite that even the suspects apologise.',
  kotte: 'Kotte: a lizard gives you a long look. You give it one back.',
  hq: 'Headquarters: the coffee machine is out of order. Again.'
};

export const GENERIC_ARRIVAL_QUIPS = [
  'Arrived. Time to ask uncomfortable questions.',
  'New city, same trail. Somebody here knows something.',
  'You step off with the confidence of a man holding an expired ticket.'
];

// archetype -> which mini-scene plays inside the incident popup.
// hold = how long (ms) the vehicle stops while the incident plays.
export const ENCOUNTER_VISUALS = {
  // plane
  storm: { archetype: 'storm', stamp: 'STORM', color: 0x8fd3ff, hold: 2600 },
  security_delay: { archetype: 'scanner', stamp: 'SECURITY', color: 0x8fd3ff, hold: 2000 },
  baggage_hold: { archetype: 'baggage', stamp: 'RECHECK', color: 0xf4d4a2, hold: 2000 },
  reroute: { archetype: 'reroute', stamp: 'REROUTED', color: 0xffd166, hold: 2200 },
  // train
  signal_failure: { archetype: 'signal', stamp: 'SIGNAL FAULT', color: 0xff6b5c, hold: 2000 },
  missed_connection: { archetype: 'clock', stamp: 'MISSED IT', color: 0xffd166, hold: 2000 },
  rail_strike: { archetype: 'clock', stamp: 'RAIL STRIKE', color: 0xffd166, hold: 2000 },
  suspicious_passenger: { archetype: 'suspect', stamp: 'SUSPICIOUS', color: 0xff9f68, hold: 2000 },
  // bus
  traffic_jam: { archetype: 'traffic', stamp: 'TRAFFIC JAM', color: 0xffb347, hold: 2000 },
  roadworks: { archetype: 'roadworks', stamp: 'ROADWORKS', color: 0xff7a1a, hold: 2000 },
  wrong_turn: { archetype: 'reroute', stamp: 'WRONG TURN', color: 0xffd166, hold: 2200 },
  chatty_driver: { archetype: 'chatter', stamp: 'CHATTY DRIVER', color: 0xf4e7c1, hold: 2000 },
  // ship
  rough_seas: { archetype: 'waves', stamp: 'ROUGH SEAS', color: 0xa8d8ff, hold: 2600 },
  customs_search: { archetype: 'scanner', stamp: 'CUSTOMS', color: 0x8fd3ff, hold: 2000 },
  engine_trouble: { archetype: 'smoke', stamp: 'ENGINE TROUBLE', color: 0xff9f68, hold: 2200 },
  port_delay: { archetype: 'clock', stamp: 'PORT DELAY', color: 0xffd166, hold: 2000 }
};

export const DEFAULT_ENCOUNTER_VISUAL = {
  archetype: 'clock',
  stamp: 'DELAYED',
  color: 0xffd166,
  hold: 2000
};
