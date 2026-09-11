export class HiddenObjectsZoneFactory {
  constructor(scene) {
    this.scene = scene;
  }

  createHiddenZones() {
    const scene = this.scene;

    let map;

    try {
      map = scene.make.tilemap({
        key: scene.mapKey
      });
    } catch (error) {
      console.error(
        `[HiddenObjectsZoneFactory] Could not load map "${scene.mapKey}".`,
        error
      );

      return 0;
    }

    const objectLayer = map?.getObjectLayer(
      scene.objectLayerName
    );

    if (!objectLayer) {
      console.error(
        `[HiddenObjectsZoneFactory] Missing object layer ` +
        `"${scene.objectLayerName}" in map "${scene.mapKey}".`
      );

      return 0;
    }

    this.destroy();

    objectLayer.objects.forEach((objectData) => {
      this.createZoneFromTiledObject(objectData);
    });

    return scene.hiddenZones.length;
  }

  createZoneFromTiledObject(objectData) {
    const scene = this.scene;

    const id = String(
      this.getTiledProperty(objectData, 'id') ||
      objectData.name ||
      ''
    ).trim();

    if (!id || !scene.activeItemIds.has(id)) {
      return null;
    }

    const itemData = scene.itemsById[id];
    const bounds = this.getObjectBounds(objectData);

    if (
      !itemData ||
      !bounds ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      console.warn(
        `[HiddenObjectsZoneFactory] Invalid Tiled object for id="${id}".`,
        {
          objectData,
          itemData,
          bounds
        }
      );

      return null;
    }

    const zone = scene.add.rectangle(
      scene.playOffsetX +
        bounds.x * scene.playScale,
      scene.playOffsetY +
        bounds.y * scene.playScale,
      Math.max(8, bounds.width * scene.playScale),
      Math.max(8, bounds.height * scene.playScale),
      0xffff00,
      scene.debugZones ? 0.18 : 0
    );

    zone.setInteractive();

    zone.setData('id', id);
    zone.setData('itemData', itemData);
    zone.setData('found', false);

    zone.setData(
      'isStaticRedHerring',
      Boolean(itemData.isRedHerring)
    );

    zone.setData(
      'clueType',
      itemData.clueType || 'soft_clue'
    );

    if (scene.debugZones) {
      zone.setStrokeStyle(2, 0xff0000, 0.85);
    }

    zone.on('pointerdown', (pointer) => {
      pointer?.event?.stopPropagation?.();

      if (
        scene.interactions &&
        typeof scene.interactions.handleHiddenObjectClick ===
          'function'
      ) {
        scene.interactions.handleHiddenObjectClick(zone);

        return;
      }

      if (
        typeof scene.handleHiddenObjectClick ===
        'function'
      ) {
        scene.handleHiddenObjectClick(zone);

        return;
      }

      console.error(
        '[HiddenObjectsZoneFactory] No click handler was found.',
        {
          id,
          sceneKey: scene.scene.key
        }
      );
    });

    scene.hiddenZones.push(zone);

    return zone;
  }

  disableAllZones() {
    this.scene.hiddenZones.forEach((zone) => {
      if (zone?.input?.enabled) {
        zone.disableInteractive();
      }
    });
  }

  getObjectBounds(objectData) {
    if (objectData.polygon?.length) {
      return this.getPolylineBounds(
        objectData.x,
        objectData.y,
        objectData.polygon
      );
    }

    if (objectData.polyline?.length) {
      return this.getPolylineBounds(
        objectData.x,
        objectData.y,
        objectData.polyline
      );
    }

    const width = Number(objectData.width) || 0;
    const height = Number(objectData.height) || 0;
    const x = Number(objectData.x) || 0;
    const y = Number(objectData.y) || 0;

    return {
      x: x + width / 2,
      y: y + height / 2,
      width,
      height
    };
  }

  getPolylineBounds(originX, originY, points) {
    if (!Array.isArray(points) || points.length === 0) {
      return null;
    }

    const xs = points.map((point) => Number(point.x) || 0);
    const ys = points.map((point) => Number(point.y) || 0);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x:
        Number(originX || 0) +
        minX +
        (maxX - minX) / 2,
      y:
        Number(originY || 0) +
        minY +
        (maxY - minY) / 2,
      width: Math.max(8, maxX - minX),
      height: Math.max(8, maxY - minY)
    };
  }

  getTiledProperty(objectData, propertyName) {
    const property = objectData.properties?.find(
      (entry) => entry.name === propertyName
    );

    return property ? property.value : null;
  }

  destroy() {
    const scene = this.scene;

    scene.hiddenZones.forEach((zone) => {
      if (!zone) {
        return;
      }

      zone.removeAllListeners?.();

      if (zone.input?.enabled) {
        zone.disableInteractive();
      }

      zone.destroy?.();
    });

    scene.hiddenZones = [];
  }
}