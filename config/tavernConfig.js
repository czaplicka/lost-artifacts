// config/tavernConfig.js
// x/y = center of hotspot; w/h = fraction of scene size, as in SpyShopScene.
// Character layers keep their full original canvas. No cropping or removal of background.
export const TAVERN_CONFIG = {
  "backgroundKey": "pi__city__tavern__tavern_empty",
  "backgroundUrl": "assets/pi/city/tavern/tavern_empty.webp",
  "npcs": {
    "bartender": {
      "key": "pi__city__tavern__bartender",
      "url": "assets/pi/city/tavern/bartender.webp",
      "alwaysPresent": true,
      "chance": 1,
      "depth": 10
    },
    "regular": {
      "key": "men",
      "url": "assets/pi/city/tavern/men.webp",
      "alwaysPresent": false,
      "chance": 0.5,
      "depth": 11
    },
    "guest": {
      "key": "woman",
      "url": "assets/pi/city/tavern/woman.webp",
      "alwaysPresent": false,
      "chance": 0.5,
      "depth": 12
    }
  },
  "hotspots": [
    {
      "id": "bartender",
      "label": "Talk to the bartender",
      "action": "talk",
      "npcId": "bartender",
      "x": 0.1875,
      "y": 0.37,
      "w": 0.115,
      "h": 0.28
    },
    {
      "id": "regular",
      "label": "Talk to the regular",
      "action": "talk",
      "npcId": "regular",
      "x": 0.5425,
      "y": 0.49,
      "w": 0.105,
      "h": 0.38
    },
    {
      "id": "guest",
      "label": "Talk to the woman",
      "action": "talk",
      "npcId": "guest",
      "x": 0.8425,
      "y": 0.625,
      "w": 0.115,
      "h": 0.53
    },
    {
      "id": "board",
      "label": "Noticeboard",
      "action": "comment",
      "textKey": "boardBusy",
      "x": 0.783,
      "y": 0.2925,
      "w": 0.1,
      "h": 0.145
    },
    {
      "id": "exit",
      "label": "Return to the neighborhood",
      "action": "exit",
      "x": 0.917,
      "y": 0.29,
      "w": 0.072,
      "h": 0.38
    }
  ]
};
