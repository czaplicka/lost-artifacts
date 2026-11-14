import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const BUSINESS_CENTER_CONFIG = {
  sceneKey: 'BusinessCenterScene',
  buildingId: 'business-center',
  title: __dialogueText("config/businessCenterConfig.js", "t_ea28bc91925091253ae9"),
  status: 'UNDER CONSTRUCTION',
  receptionText: __dialogueText("config/businessCenterConfig.js", "t_fd38d488dffe6fa1a5b7"),
  directoryText: __dialogueText("config/businessCenterConfig.js", "t_87df6f488c832e4a5366"),
  elevatorText: __dialogueText("config/businessCenterConfig.js", "t_e08dd859c56627901ec4"),
  // Reserved for future mission-specific tenants; no mission logic is assumed yet.
  tenants: []
};
