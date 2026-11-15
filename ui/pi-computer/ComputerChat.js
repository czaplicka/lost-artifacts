import { dialogueText as __dialogueText1 } from "../../dialogues/DialogueText.js";
import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const DEFAULT_INVENTORY_SHOPS = {
  "version": 1,
  "city": {
    "rotatingCount": 2,
    "stockBoard": {
      "x": 16,
      "y": 56
    },
    "hotspots": [
      {
        "id": "coffee",
        "type": "permanent",
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_6d8bb06b01c884a4aea6")),
        "x": 176,
        "y": 533,
        "w": 220,
        "h": 160,
        "price": 5,
        "category": "consumables",
        "key": "coffee"
      },
      {
        "id": "postcards",
        "type": "permanent",
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_9c9cd84600428e871495")),
        "x": 1383,
        "y": 506,
        "w": 200,
        "h": 365,
        "price": 2,
        "category": "souvenirs",
        "key": "postcard"
      },
      {
        "id": "sandwich",
        "type": "permanent",
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_dcd284ea66f2898d6a6e")),
        "x": 1219,
        "y": 407,
        "w": 125,
        "h": 100,
        "price": 8,
        "category": "consumables",
        "key": "sandwich"
      },
      {
        "id": "snow_globe",
        "type": "permanent",
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_e72230aaa6fd850570bd")),
        "x": 1093,
        "y": 279,
        "w": 170,
        "h": 95,
        "price": 15,
        "category": "souvenirs",
        "key": "snowGlobe"
      },
      {
        "id": "energy_drink",
        "type": "rotating",
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_8551c0d799a1e982eab2")),
        "x": 900,
        "y": 380,
        "w": 120,
        "h": 160,
        "price": 7,
        "category": "consumables",
        "key": "energyDrink"
      },
      {
        "id": "mystery_pie",
        "type": "rotating",
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_de57e07b50bc305112a3")),
        "x": 1076,
        "y": 409,
        "w": 150,
        "h": 100,
        "price": 4,
        "category": "consumables",
        "key": "mysteryPie"
      },
      {
        "id": "inflatable_alibi",
        "type": "rotating",
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_6fe4d418f905812a7a61")),
        "x": 603,
        "y": 494,
        "w": 175,
        "h": 255,
        "price": 20,
        "category": "oddities",
        "key": "inflatableAlibi"
      },
      {
        "id": "souvenir_paris",
        "type": "permanent",
        "cities": [
          "paris"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_6c3d45f93e8b4dee286d")),
        "x": 1150,
        "y": 620,
        "w": 140,
        "h": 140,
        "price": 12,
        "category": "souvenirs",
        "key": "parisTower"
      },
      {
        "id": "souvenir_london",
        "type": "permanent",
        "cities": [
          "london"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_523429c54c290a02dba5")),
        "x": 1150,
        "y": 620,
        "w": 140,
        "h": 140,
        "price": 12,
        "category": "souvenirs",
        "key": "londonGuardHat"
      },
      {
        "id": "souvenir_berlin",
        "type": "permanent",
        "cities": [
          "berlin"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_241f202de018c3a061a0")),
        "x": 910,
        "y": 655,
        "w": 140,
        "h": 140,
        "price": 14,
        "category": "souvenirs",
        "key": "berlinWallChunk"
      },
      {
        "id": "souvenir_nyc",
        "type": "permanent",
        "cities": [
          "new_york_city"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_d66a4c508e67c2efae66")),
        "x": 1150,
        "y": 620,
        "w": 140,
        "h": 140,
        "price": 12,
        "category": "souvenirs",
        "key": "nycFoamCrown"
      },
      {
        "id": "souvenir_warsaw",
        "type": "permanent",
        "cities": [
          "warsaw"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_cac156683691211ccfb0")),
        "x": 912,
        "y": 653,
        "w": 160,
        "h": 125,
        "price": 10,
        "category": "souvenirs",
        "key": "warsawMermaid"
      },
      {
        "id": "souvenir_delhi",
        "type": "permanent",
        "cities": [
          "new_delhi"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_ae6af7b23cd5ae089fb3")),
        "x": 1150,
        "y": 620,
        "w": 140,
        "h": 140,
        "price": 9,
        "category": "souvenirs",
        "key": "delhiSpiceSachet"
      },
      {
        "id": "souvenir_kotte",
        "type": "permanent",
        "cities": [
          "kotte"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_aeea363ac18e4c1e827a")),
        "x": 1150,
        "y": 620,
        "w": 140,
        "h": 140,
        "price": 9,
        "category": "souvenirs",
        "key": "kotteElephant"
      },
      {
        "id": "souvenir_toronto",
        "type": "permanent",
        "cities": [
          "toronto"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_c6c1e9cc00e3e0eb17d9")),
        "x": 1150,
        "y": 620,
        "w": 140,
        "h": 140,
        "price": 11,
        "category": "souvenirs",
        "key": "torontoMaple"
      },
      {
        "id": "souvenir_nairobi",
        "type": "permanent",
        "cities": [
          "nairobi"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_3988b1afe006dd6edd9b")),
        "x": 1150,
        "y": 620,
        "w": 140,
        "h": 140,
        "price": 13,
        "category": "souvenirs",
        "key": "nairobiGiraffe"
      },
      {
        "id": "souvenir_islamabad",
        "type": "permanent",
        "cities": [
          "islamabad"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_ac9298b11b63304757d3")),
        "x": 1150,
        "y": 620,
        "w": 140,
        "h": 140,
        "price": 9,
        "category": "souvenirs",
        "key": "islamabadTruck"
      },
      {
        "id": "souvenir_tokyo",
        "type": "permanent",
        "cities": [
          "tokyo"
        ],
        "label": __dialogueText(__dialogueText1("ui/pi-computer/ComputerChat.js", "t_fa1f389287d08ed8f67e"), __dialogueText1("ui/pi-computer/ComputerChat.js", "t_529629ce63a5f3ac2500")),
        "x": 913,
        "y": 660,
        "w": 140,
        "h": 140,
        "price": 14,
        "category": "souvenirs",
        "key": "tokyoLuckyCat"
      }
    ]
  },
  "spy": [
    {
      "category": "equipment",
      "key": "camera",
      "price": 350
    },
    {
      "category": "equipment",
      "key": "videoCamera",
      "price": 650
    },
    {
      "category": "equipment",
      "key": "mobilePhone",
      "price": 500
    },
    {
      "category": "equipment",
      "key": "coolSpyGadget",
      "price": 225
    },
    {
      "category": "misc",
      "key": "piBadge",
      "price": 45
    },
    {
      "category": "oddities",
      "key": "rubberDuck",
      "price": 12
    },
    {
      "category": "documents",
      "key": "detectiveMonthly",
      "price": 8
    }
  ]
};
export function normalizeShopCity(value){if(!value)return'paris';const id=String(value).trim().toLowerCase().replace(/\s+/g,'_');return ({new_york:'new_york_city',new_york_city:'new_york_city',new_delhi:'new_delhi',new_dehli:'new_delhi',kotte:'kotte',sri_jayawardenepura_kotte:'kotte'})[id]||id;}
export function pickInventoryShopProducts(all,city,day,rotatingCount=2){city=normalizeShopCity(city);const local=all.filter(v=>v.enabled!==false&&(!Array.isArray(v.cities)||!v.cities.length||v.cities.map(normalizeShopCity).includes(city))),permanent=local.filter(v=>v.type!=='rotating'),pool=local.filter(v=>v.type==='rotating');let hash=2166136261;for(const ch of `${city}|day${day}`){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}let a=hash>>>0;const random=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};const shuffled=[...pool];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}const today=new Set(shuffled.slice(0,Math.min(pool.length,rotatingCount)));return all.filter(v=>permanent.includes(v)||today.has(v));}
export function itemGraphic(item){const v=item?.metadata?.visual;if(!v||typeof v.textureKey!=='string'||typeof v.textureUrl!=='string'||!/^assets\/[A-Za-z0-9_./-]+\.(webp|png|jpe?g)$/i.test(v.textureUrl)||v.textureUrl.includes('..'))return null;return v;}