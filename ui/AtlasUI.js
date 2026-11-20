// ui/AtlasUI.js

import {
  AtlasUI as AtlasUIBase
} from './AtlasUIBase.js';

const BOUNDARY_URL =
  'https://raw.githubusercontent.com/' +
  'nvkelso/natural-earth-vector/master/geojson/' +
  'ne_50m_admin_0_countries.geojson';

const FETCH_TIMEOUT_MS = 20000;

let detailedBoundariesPromise = null;

function normalizeFeature(feature) {
  if (
    feature?.type !== 'Feature' ||
    !['Polygon', 'MultiPolygon'].includes(
      feature.geometry?.type
    ) ||
    !Array.isArray(feature.geometry.coordinates)
  ) {
    return null;
  }

  const properties = {};

  for (const [key, value] of Object.entries(
    feature.properties || {}
  )) {
    properties[key.toUpperCase()] = value;
  }

  const countryCodes = [
    properties.ADM0_A3,
    properties.ISO_A3,
    properties.ISO_A3_EH,
    properties.SOV_A3
  ].map(value => String(value || '').toUpperCase());

  const countryNames = [
    properties.ADMIN,
    properties.NAME,
    properties.NAME_EN,
    properties.SOVEREIGNT
  ].map(value => String(value || '').toLowerCase());

  const isSingapore =
    countryCodes.includes('SGP') ||
    countryNames.includes('singapore');

  if (isSingapore) {
    properties.ADM0_A3 = 'SGP';
    properties.ISO_A3 = 'SGP';
    properties.ISO_A3_EH = 'SGP';
    properties.ADMIN = 'Singapore';
    properties.NAME = 'Singapore';
    properties.NAME_EN = 'Singapore';
  }

  return {
    ...feature,
    properties
  };
}

async function fetchDetailedBoundaries() {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    FETCH_TIMEOUT_MS
  );

  try {
    const response = await fetch(BOUNDARY_URL, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `Boundary download failed: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (
      data?.type !== 'FeatureCollection' ||
      !Array.isArray(data.features)
    ) {
      throw new Error(
        'Invalid country boundary FeatureCollection.'
      );
    }

    const features = data.features
      .map(normalizeFeature)
      .filter(Boolean);

    const singapore = features.find(
      feature => feature.properties.ADM0_A3 === 'SGP'
    );

    if (!singapore) {
      throw new Error(
        'Downloaded boundary data does not contain Singapore.'
      );
    }

    console.info(
      '[AtlasUI] Detailed boundaries loaded:',
      features.length,
      'countries. Singapore geometry found.'
    );

    return features;
  } finally {
    clearTimeout(timeout);
  }
}

function getDetailedBoundaries() {
  if (!detailedBoundariesPromise) {
    detailedBoundariesPromise = fetchDetailedBoundaries()
      .catch(error => {
        detailedBoundariesPromise = null;
        throw error;
      });
  }

  return detailedBoundariesPromise;
}

export class AtlasUI extends AtlasUIBase {
  async loadBoundaries() {
    try {
      const features = await getDetailedBoundaries();

      if (this.destroyed) return;

      // Oryginalny renderer nadal buduje rekordy, dopasowuje
      // kraje i rysuje mapę. Podmieniamy tylko dane wejściowe.
      AtlasUIBase.boundariesPromise =
        Promise.resolve(features);
    } catch (error) {
      if (this.destroyed) return;

      console.warn(
        '[AtlasUI] Detailed boundaries unavailable. ' +
          'Using original boundary sources.',
        error
      );
    }

    if (this.destroyed) return;

    return super.loadBoundaries();
  }
}