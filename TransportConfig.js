import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
export const HQ_CITY = __dialogueText("TransportConfig.js", "t_d30a57953b11809a70cf");
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
    label: __dialogueText("TransportConfig.js", "t_c66523fc0372c5cb81b1"),
    minHours: 2,
    hoursPerMapPixel: 0.012,
    baseCost: 130,
    costPerHour: 35,
    energyPerHour: 0.7
  },
  train: {
    id: 'train',
    label: __dialogueText("TransportConfig.js", "t_e99c90db87c0e400832e"),
    minHours: 3,
    hoursPerMapPixel: 0.045,
    baseCost: 35,
    costPerHour: 15,
    energyPerHour: 1.15
  },
  bus: {
    id: 'bus',
    label: __dialogueText("TransportConfig.js", "t_bb3d83ff198b139d1037"),
    minHours: 4,
    hoursPerMapPixel: 0.06,
    baseCost: 18,
    costPerHour: 9,
    energyPerHour: 1.7
  },
  ship: {
    id: 'ship',
    label: __dialogueText("TransportConfig.js", "t_40970cf7b5e2e4deffe1"),
    minHours: 6,
    hoursPerMapPixel: 0.03,
    baseCost: 45,
    costPerHour: 12,
    energyPerHour: 1.25
  }
};

export const TRAVEL_ENCOUNTERS = {
  plane: [
    { id: 'storm', label: __dialogueText("TransportConfig.js", "t_593aef18a5cd31a536a1"), timePenalty: 2, message: __dialogueText("TransportConfig.js", "t_c260bd7e814869898e8f") },
    { id: 'security_delay', label: __dialogueText("TransportConfig.js", "t_3cfafee628dd13f819d1"), timePenalty: 1, message: __dialogueText("TransportConfig.js", "t_eb7ff00c846f191fdf7e") },
    { id: 'baggage_hold', label: __dialogueText("TransportConfig.js", "t_5ff72795bf8fd55803bb"), timePenalty: 1, message: __dialogueText("TransportConfig.js", "t_46a9a6efc455f69fe75f") },
    { id: 'reroute', label: __dialogueText("TransportConfig.js", "t_1474f71d23b3f19df643"), timePenalty: 3, message: __dialogueText("TransportConfig.js", "t_5745710c6b5a7d6a0853") }
  ],
  train: [
    { id: 'signal_failure', label: __dialogueText("TransportConfig.js", "t_bd7c09cea05d0754f2b4"), timePenalty: 2, message: __dialogueText("TransportConfig.js", "t_a0f11a72812a31777ffd") },
    { id: 'missed_connection', label: __dialogueText("TransportConfig.js", "t_b1dd7605a05b8d60b8df"), timePenalty: 2, message: __dialogueText("TransportConfig.js", "t_527c5db4b78b57fb9b72") },
    { id: 'rail_strike', label: __dialogueText("TransportConfig.js", "t_2a228572d2a9603c926c"), timePenalty: 3, message: __dialogueText("TransportConfig.js", "t_9592c4be56d7cc111f34") },
    { id: 'suspicious_passenger', label: __dialogueText("TransportConfig.js", "t_ec65e1a87d56f013fe7d"), timePenalty: 1, message: __dialogueText("TransportConfig.js", "t_968ce976035884cd6e95") }
  ],
  bus: [
    { id: 'traffic_jam', label: __dialogueText("TransportConfig.js", "t_403d4e2738150fcd06c7"), timePenalty: 2, message: __dialogueText("TransportConfig.js", "t_badfefdde6398de77c8c") },
    { id: 'roadworks', label: __dialogueText("TransportConfig.js", "t_bfd06b573368ce8848ab"), timePenalty: 2, message: __dialogueText("TransportConfig.js", "t_5b33f70890839f50cc1d") },
    { id: 'wrong_turn', label: __dialogueText("TransportConfig.js", "t_1249f772c4c6d83c9f3b"), timePenalty: 1, message: __dialogueText("TransportConfig.js", "t_af5f28b34cd59bb084f9") },
    { id: 'chatty_driver', label: __dialogueText("TransportConfig.js", "t_cc9129ac41ed54281888"), timePenalty: 1, message: __dialogueText("TransportConfig.js", "t_14587575500fc7b2529c") }
  ],
  ship: [
    { id: 'rough_seas', label: __dialogueText("TransportConfig.js", "t_27d9c011bbc39f5ed7c0"), timePenalty: 3, message: __dialogueText("TransportConfig.js", "t_ebff3c6080fe3582c071") },
    { id: 'customs_search', label: __dialogueText("TransportConfig.js", "t_72258c5aa48606626cf3"), timePenalty: 2, message: __dialogueText("TransportConfig.js", "t_021736bf51100843e1f8") },
    { id: 'engine_trouble', label: __dialogueText("TransportConfig.js", "t_0bc24507160763d1e24d"), timePenalty: 3, message: __dialogueText("TransportConfig.js", "t_d84eb4beaf0645de434c") },
    { id: 'port_delay', label: __dialogueText("TransportConfig.js", "t_6108e608161b444c9e10"), timePenalty: 2, message: __dialogueText("TransportConfig.js", "t_c674f3fd390dcc5a6692") }
  ]
};