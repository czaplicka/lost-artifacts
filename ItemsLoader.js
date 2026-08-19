export class ItemsLoader {
    static catalog = null;

    static async load() {
        if (this.catalog) return this.catalog;
        
        const response = await fetch('assets/data/ItemsCatalog.json');
        this.catalog = await response.json();
        return this.catalog;
    }

    static get(category, itemKey) {
        return this.catalog?.[category]?.[itemKey];
    }
}