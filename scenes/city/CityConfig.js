import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { SCORE_CONFIG } from '../../config/ScoreConfig.js';

export const ALL_DAY = [__dialogueText("scenes/city/CityConfig.js", "t_e9376a281aac57bb78e2"), __dialogueText("scenes/city/CityConfig.js", "t_fb847b43637eee429168"), __dialogueText("scenes/city/CityConfig.js", "t_458c1fed574354042397"), __dialogueText("scenes/city/CityConfig.js", "t_4e9f8db8242b57e72e00")];
export const LOCATION_HOURS = {
  bank: [__dialogueText("scenes/city/CityConfig.js", "t_e9376a281aac57bb78e2"), __dialogueText("scenes/city/CityConfig.js", "t_fb847b43637eee429168")],
  policehq: [__dialogueText("scenes/city/CityConfig.js", "t_e9376a281aac57bb78e2"), __dialogueText("scenes/city/CityConfig.js", "t_fb847b43637eee429168"), __dialogueText("scenes/city/CityConfig.js", "t_458c1fed574354042397")],
  hotel: ALL_DAY, airport: ALL_DAY, harbor: ALL_DAY, alley: ALL_DAY,
  parking: ALL_DAY, restaurant: [__dialogueText("scenes/city/CityConfig.js", "t_fb847b43637eee429168"), __dialogueText("scenes/city/CityConfig.js", "t_458c1fed574354042397")], garbage: ALL_DAY,
  shop: [__dialogueText("scenes/city/CityConfig.js", "t_e9376a281aac57bb78e2"), __dialogueText("scenes/city/CityConfig.js", "t_fb847b43637eee429168"), __dialogueText("scenes/city/CityConfig.js", "t_458c1fed574354042397")]
};
export const CITY_BACKGROUND_KEYS = {
  london:'london', paris:'paris', new_delhi:'newdelhi', newdelhi:'newdelhi',
  warsaw:'warsaw', new_york_city:'newyorkcity', newyorkcity:'newyorkcity',
  berlin:'berlin', toronto:'toronto', nairobi:'nairobi', islamabad:'islamabad',
  kotte:'kotte', tokyo:'tokyo', hq:'start'
};
export const NPC_QUESTION_PENALTY = Math.abs(SCORE_CONFIG.NPC_PENALTY);
export const NPC_SCALE = 0.80;
export const NPC_HOVER_SCALE = 0.88;
export const SHOP_TAXI_ENERGY = 3;
export const SHOP_ICON_SIZE = 132;
export const SHOP_LABEL_OFFSET = 82;
export const MINUTES_PER_DAY = 1440;
export const HUD_READY_TIMEOUT = 15000;

// BEGIN SINGAPORE CITY INTEGRATION v1
CITY_BACKGROUND_KEYS.singapore = 'singapore';
// END SINGAPORE CITY INTEGRATION v1
