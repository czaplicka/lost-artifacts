export const HQ_CITY = 'Mark Agency Headquarters';
export const HQ_ID = 'hq';

export const MAX_DESTINATIONS = 5;
export const MAX_ENCOUNTERS = 3;
export const ESCAPE_ROUTE_LENGTH = 4;

export const TRAVEL_ENCOUNTER_CHANCE = 0.18;
export const SUSPECT_DATA_URL = '/assets/data/citysuspects.json';
export const SUSPECT_FETCH_RETRIES = 1;
export const SUSPECT_FETCH_RETRY_DELAY_MS = 800;

export const STARTING_AGENCY_BUDGETS = {
  rookie: 900,
  field: 650,
  master: 450
};

export const TRANSPORT_CONFIG = {
  plane: {
    id: 'plane',
    label: 'Plane',
    minHours: 2,
    hoursPerMapPixel: 0.012,
    baseCost: 130,
    costPerHour: 35,
    energyPerHour: 0.7
  },
  train: {
    id: 'train',
    label: 'Train',
    minHours: 3,
    hoursPerMapPixel: 0.045,
    baseCost: 35,
    costPerHour: 15,
    energyPerHour: 1.15
  },
  bus: {
    id: 'bus',
    label: 'Bus',
    minHours: 4,
    hoursPerMapPixel: 0.06,
    baseCost: 18,
    costPerHour: 9,
    energyPerHour: 1.7
  },
  ship: {
    id: 'ship',
    label: 'Ship',
    minHours: 6,
    hoursPerMapPixel: 0.03,
    baseCost: 45,
    costPerHour: 12,
    energyPerHour: 1.25
  }
};

export const TRAVEL_ENCOUNTERS = {
  plane: [
    { id: 'storm', label: 'Storm front over the route', timePenalty: 2, message: 'Heavy weather forces the pilot to slow the approach.' },
    { id: 'security_delay', label: 'Airport security delay', timePenalty: 1, message: 'A random security check slows everything down.' },
    { id: 'baggage_hold', label: 'Checked luggage hold-up', timePenalty: 1, message: 'Ground crew delays departure while cargo is rechecked.' },
    { id: 'reroute', label: 'Flight path reroute', timePenalty: 3, message: 'Air traffic control redirects the plane around congestion.' }
  ],
  train: [
    { id: 'signal_failure', label: 'Signal failure', timePenalty: 2, message: 'A stubborn signal refuses to appreciate the urgency of your case.' },
    { id: 'missed_connection', label: 'Missed connection', timePenalty: 2, message: 'The connecting train left precisely when you reached the platform.' },
    { id: 'rail_strike', label: 'Rail disruption', timePenalty: 3, message: 'A timetable is only a suggestion when the network disagrees.' },
    { id: 'suspicious_passenger', label: 'Suspicious passenger', timePenalty: 1, message: 'A passenger drops a suspiciously heavy suitcase in the wrong compartment.' }
  ],
  bus: [
    { id: 'traffic_jam', label: 'Traffic jam', timePenalty: 2, message: 'The road is full of people who did not plan around your investigation.' },
    { id: 'roadworks', label: 'Roadworks', timePenalty: 2, message: 'Cones and a worker with a shovel defeat modern transport.' },
    { id: 'wrong_turn', label: 'Wrong turn', timePenalty: 1, message: 'The driver insists this scenic detour was intentional.' },
    { id: 'chatty_driver', label: 'Chatty driver', timePenalty: 1, message: 'The driver has several strong opinions about your case.' }
  ],
  ship: [
    { id: 'rough_seas', label: 'Rough seas', timePenalty: 3, message: 'The sea turns the journey into an unwanted balancing exercise.' },
    { id: 'customs_search', label: 'Customs inspection', timePenalty: 2, message: 'Customs officers become interested in every suitcase on board.' },
    { id: 'engine_trouble', label: 'Engine trouble', timePenalty: 3, message: 'The engine makes a noise best described as expensive.' },
    { id: 'port_delay', label: 'Port delay', timePenalty: 2, message: 'The harbor has misplaced a permit, a tugboat or both.' }
  ]
};