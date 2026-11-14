import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
    logTitle: __dialogueText("scenes/travel/TransportVisuals.js", "t_8ad6897c774c9ddbd469"),
    ticketTitle: __dialogueText("scenes/travel/TransportVisuals.js", "t_095c58eb18293caf5009"),
    label: __dialogueText("scenes/travel/TransportVisuals.js", "t_c66523fc0372c5cb81b1"),
    color: '#f4e7c1',
    routeColor: 0xd9c27a,
    lineColor: 0xb3261e,
    ticketColor: 0x1b2a3a,
    clearRouteText: __dialogueText("scenes/travel/TransportVisuals.js", "t_e7b059d4c4c21ac25f12"),
    rerouteLabel: __dialogueText("scenes/travel/TransportVisuals.js", "t_6791e54364877f734e5b"),
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
      __dialogueText("scenes/travel/TransportVisuals.js", "t_84841e4d14246d653b48"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_8c773e8c17eecd9a3321"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_c21a0bf5db77aa96382f"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_6a1b4b93e28379b566f0"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_db6758d0813a99e720c7")
    ]
  },

  train: {
    id: 'train',
    icon: '🚆',
    logTitle: __dialogueText("scenes/travel/TransportVisuals.js", "t_f9a44e55bc0cdf5f3957"),
    ticketTitle: __dialogueText("scenes/travel/TransportVisuals.js", "t_61bb95daef2638759268"),
    label: __dialogueText("scenes/travel/TransportVisuals.js", "t_e99c90db87c0e400832e"),
    color: '#b8e0d2',
    routeColor: 0x8fd3ff,
    lineColor: 0x1f5f8b,
    ticketColor: 0x1d3b2f,
    clearRouteText: __dialogueText("scenes/travel/TransportVisuals.js", "t_78dc9acbcb3aa067fa93"),
    rerouteLabel: __dialogueText("scenes/travel/TransportVisuals.js", "t_245343837f3c1931efa6"),
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
    seatLabel: __dialogueText("scenes/travel/TransportVisuals.js", "t_39fb44998e2b67f22b01"),
    seats: [__dialogueText("scenes/travel/TransportVisuals.js", "t_757c8a67660cba4b50e7"), __dialogueText("scenes/travel/TransportVisuals.js", "t_4ccfad3156799b9eee34"), __dialogueText("scenes/travel/TransportVisuals.js", "t_db8e5e674083b656515e"), __dialogueText("scenes/travel/TransportVisuals.js", "t_927ea7d2ef29155989a0")],
    quips: [
      __dialogueText("scenes/travel/TransportVisuals.js", "t_a90db5e57a7c6fcce298"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_74887c9a9c8a18996e53"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_f3fd060aa4180a6693f5"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_a59488f2a514183ecf34")
    ]
  },

  bus: {
    id: 'bus',
    icon: '🚌',
    logTitle: __dialogueText("scenes/travel/TransportVisuals.js", "t_8fa1609d0e4cbac37fa1"),
    ticketTitle: __dialogueText("scenes/travel/TransportVisuals.js", "t_427d78fc5b998010df33"),
    label: __dialogueText("scenes/travel/TransportVisuals.js", "t_bb3d83ff198b139d1037"),
    color: '#ffd166',
    routeColor: 0xffb347,
    lineColor: 0xc2661a,
    ticketColor: 0x4a3216,
    clearRouteText: __dialogueText("scenes/travel/TransportVisuals.js", "t_010306a0edd359e864dc"),
    rerouteLabel: __dialogueText("scenes/travel/TransportVisuals.js", "t_be1af3f4a02612687299"),
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
    seats: ['STANDING', __dialogueText("scenes/travel/TransportVisuals.js", "t_0b058066a1d5dcca5d07"), __dialogueText("scenes/travel/TransportVisuals.js", "t_2776a0b2210f2f3bfd2e"), __dialogueText("scenes/travel/TransportVisuals.js", "t_d9f1f22cd128e450967e")],
    quips: [
      __dialogueText("scenes/travel/TransportVisuals.js", "t_6d4f266c961345957ed6"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_35752c51be6c9716a02b"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_ebcaefc236a9ebe1e995")
    ]
  },

  ship: {
    id: 'ship',
    icon: '🚢',
    logTitle: __dialogueText("scenes/travel/TransportVisuals.js", "t_9adf00b662729d6efd86"),
    ticketTitle: __dialogueText("scenes/travel/TransportVisuals.js", "t_3d9569f9f2b70de9e189"),
    label: __dialogueText("scenes/travel/TransportVisuals.js", "t_40970cf7b5e2e4deffe1"),
    color: '#a8d8ff',
    routeColor: 0x62b6cb,
    lineColor: 0x0f6b73,
    ticketColor: 0x1a3a4a,
    clearRouteText: __dialogueText("scenes/travel/TransportVisuals.js", "t_6c13f5fc3b28f665a666"),
    rerouteLabel: __dialogueText("scenes/travel/TransportVisuals.js", "t_a3c553c57e72801592ba"),
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
    seats: ['12', __dialogueText("scenes/travel/TransportVisuals.js", "t_6f1643f812ca0dc8bac0"), '9', '27'],
    quips: [
      __dialogueText("scenes/travel/TransportVisuals.js", "t_50c517c7eab3d7c4427c"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_f7e7eba6492ddcf2c0dd"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_bc31d0825a1ef567e625"),
      __dialogueText("scenes/travel/TransportVisuals.js", "t_43ad5175a27be81d62f2")
    ]
  }
};

// Keys are normalised (lowercase, a-z0-9 only): 'new_york_city' -> 'newyorkcity'.
export const CITY_QUIPS = {
  paris: __dialogueText("scenes/travel/TransportVisuals.js", "t_247131f8e1c0215f51ab"),
  london: __dialogueText("scenes/travel/TransportVisuals.js", "t_3a0e0b30044a0aaaca3e"),
  berlin: __dialogueText("scenes/travel/TransportVisuals.js", "t_aa7799abf95d742574db"),
  newyorkcity: __dialogueText("scenes/travel/TransportVisuals.js", "t_899b02709712a6a74a0a"),
  newyork: __dialogueText("scenes/travel/TransportVisuals.js", "t_899b02709712a6a74a0a"),
  warsaw: __dialogueText("scenes/travel/TransportVisuals.js", "t_1a9fabf606c57714bccd"),
  tokyo: __dialogueText("scenes/travel/TransportVisuals.js", "t_cdb70660d3109880b2d9"),
  nairobi: __dialogueText("scenes/travel/TransportVisuals.js", "t_8bdad025cebbfa4ae37f"),
  newdelhi: __dialogueText("scenes/travel/TransportVisuals.js", "t_020e91bb59372fc5d9ef"),
  islamabad: __dialogueText("scenes/travel/TransportVisuals.js", "t_3742a543f9c39f77bc48"),
  toronto: __dialogueText("scenes/travel/TransportVisuals.js", "t_86f67993039ae2f8e5fd"),
  kotte: __dialogueText("scenes/travel/TransportVisuals.js", "t_b99a3c3cd22b1e9d7b4e"),
  hq: __dialogueText("scenes/travel/TransportVisuals.js", "t_d9cb92feca8360c5441c")
};

export const GENERIC_ARRIVAL_QUIPS = [
  __dialogueText("scenes/travel/TransportVisuals.js", "t_060cd03e8a7bdd52d1bc"),
  __dialogueText("scenes/travel/TransportVisuals.js", "t_21d9af20549ea19b3d11"),
  __dialogueText("scenes/travel/TransportVisuals.js", "t_7079fb35880d8a2403a7")
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
  signal_failure: { archetype: 'signal', stamp: __dialogueText("scenes/travel/TransportVisuals.js", "t_2680f2a698048b211fd9"), color: 0xff6b5c, hold: 2000 },
  missed_connection: { archetype: 'clock', stamp: __dialogueText("scenes/travel/TransportVisuals.js", "t_83e21c53eeda97e2b74b"), color: 0xffd166, hold: 2000 },
  rail_strike: { archetype: 'clock', stamp: __dialogueText("scenes/travel/TransportVisuals.js", "t_e2cff0d5263a40d259b4"), color: 0xffd166, hold: 2000 },
  suspicious_passenger: { archetype: 'suspect', stamp: 'SUSPICIOUS', color: 0xff9f68, hold: 2000 },
  // bus
  traffic_jam: { archetype: 'traffic', stamp: __dialogueText("scenes/travel/TransportVisuals.js", "t_324994bd2b1b3f3ea3b4"), color: 0xffb347, hold: 2000 },
  roadworks: { archetype: 'roadworks', stamp: 'ROADWORKS', color: 0xff7a1a, hold: 2000 },
  wrong_turn: { archetype: 'reroute', stamp: __dialogueText("scenes/travel/TransportVisuals.js", "t_f594fe3d2c845990161e"), color: 0xffd166, hold: 2200 },
  chatty_driver: { archetype: 'chatter', stamp: __dialogueText("scenes/travel/TransportVisuals.js", "t_3b55b2cd71fc0e470f8f"), color: 0xf4e7c1, hold: 2000 },
  // ship
  rough_seas: { archetype: 'waves', stamp: __dialogueText("scenes/travel/TransportVisuals.js", "t_d8143e8713b8a2ba57dd"), color: 0xa8d8ff, hold: 2600 },
  customs_search: { archetype: 'scanner', stamp: 'CUSTOMS', color: 0x8fd3ff, hold: 2000 },
  engine_trouble: { archetype: 'smoke', stamp: __dialogueText("scenes/travel/TransportVisuals.js", "t_4c6e1323636674be8d15"), color: 0xff9f68, hold: 2200 },
  port_delay: { archetype: 'clock', stamp: __dialogueText("scenes/travel/TransportVisuals.js", "t_adc69d85abbb68357ec4"), color: 0xffd166, hold: 2000 }
};

export const DEFAULT_ENCOUNTER_VISUAL = {
  archetype: 'clock',
  stamp: 'DELAYED',
  color: 0xffd166,
  hold: 2000
};
