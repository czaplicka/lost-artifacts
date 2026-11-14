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
        "label": __dialogueText("config/InventoryShopModel.js", "t_b0e1f06cf1e7d466ee30"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_71f19d2c59806b8ca384"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_ba0d0a429396a6ca6fe2"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_5a7d1aa6b64488aa3b74"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_31adc9243b8bc59d26ae"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_ec327eeba25860d31092"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_75b2f7fcb4d861f0ffcd"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_c70425545f2c3dee0cfb"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_cbc8427ffae3de3baa4d"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_97e75aa3534b5bcf3790"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_5c2840a2403250a9f18d"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_7e1ca15aeca325b207cc"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_486e3044c9e80f92d819"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_c43420f68618e322edbd"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_69b37a03f518f74af8a9"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_96c54558d37d88868b2d"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_346f9aeebad0c128a809"),
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
        "label": __dialogueText("config/InventoryShopModel.js", "t_b48e6afc7713cb9e6b2e"),
        "x": 1150,
        "y": 620,
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
