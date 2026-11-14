import './ui/inventory/InventoryGraphics.js';
export class ItemsLoader {
 static catalog=null;
 static async load(){if(this.catalog)return this.catalog;const r=await fetch(new URL('./assets/data/ItemsCatalog.json',import.meta.url));if(!r.ok)throw Error('Item catalogue HTTP '+r.status);this.catalog=await r.json();return this.catalog;}
 static get(category,itemKey){return this.catalog?.[category]?.[itemKey];}
}
