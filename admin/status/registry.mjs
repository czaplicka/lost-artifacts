export const REGISTRY_VERSION='admin-status-1';
export const MODULES=[
{id:'status',label:'Stan panelu',fn:'admin-status',script:'app.mjs'},
{id:'cities',label:'Miasta',fn:'city-editor-online',script:'app.js'},
{id:'city-places',label:'Lokalizacje miejskie',fn:'city-place-editor',script:'app.js'},
{id:'npcs',label:'NPC — postacie',fn:'npc-editor',script:'app.js'},
{id:'npc-dialogues',label:'Dialogi NPC',fn:'npc-dialogue-editor',script:'app.js'},
{id:'motives',label:'Motywy',fn:'motive-editor',script:'app.js'},
{id:'publications',label:'Gazety i TIME',fn:'publication-editor',script:'app.js'},
{id:'television',label:'Telewizja',fn:'tv-editor',script:'app.js'},
{id:'inventory-shops',label:'Przedmioty i sklepy',fn:'inventory-shop-editor',script:'app.js'},
{id:'crime-scenes',label:'Miejsca zbrodni',fn:'crime-scene-editor',script:'app.js'},
{id:'artifacts',label:'Artefakty',fn:'artifact-editor',script:'app.js'},
{id:'crime-cities',label:'Sprawy — edytor łączony',fn:'crime-city-editor',script:'app.js'},
{id:'music',label:'Muzyka',fn:'music-editor',script:'app.js'},
{id:'thieves',label:'Złodzieje',fn:'thief-editor',script:'app.js'},
{id:'communications',label:'E-maile i telefony',fn:'content-editor',script:'../content-editor/app.js'},
{id:'pi-classifieds',label:'Ogłoszenia i zlecenia PI',fn:'content-editor',script:'../content-editor/app.js'},
{id:'pi-cases',label:'Sprawy PI',fn:'content-editor',script:'../content-editor/app.js'}
];
