// routeManager.js

const VALID_STATES = new Set([
  'CRIME_CITY',
  'ROUTE',
  'DONE'
]);

function isValidCityId(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeCityId(value) {
  return isValidCityId(value)
    ? value.trim()
    : null;
}

function sanitizeRoute(route) {
  if (!Array.isArray(route)) {
    return [];
  }

  return route
    .map(sanitizeCityId)
    .filter(Boolean);
}

function isPlainObject(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

export class RouteManager {
  constructor(route = [], crimeCityId = null) {
    this.route = sanitizeRoute(route);
    this.crimeCityId = sanitizeCityId(crimeCityId);
    this.currentRouteIndex = 0;
    this.failedAttempts = 0;
    this.state = this.getInitialState();
  }

  getInitialState() {
    if (this.crimeCityId) {
      return 'CRIME_CITY';
    }

    if (this.route.length > 0) {
      return 'ROUTE';
    }

    return 'DONE';
  }

  reset(route = null, crimeCityId = null) {
    if (route !== null) {
      this.route = sanitizeRoute(route);
    }

    if (crimeCityId !== null) {
      this.crimeCityId = sanitizeCityId(crimeCityId);
    }

    this.currentRouteIndex = 0;
    this.failedAttempts = 0;
    this.state = this.getInitialState();
  }

  getCrimeCity() {
    return this.crimeCityId || null;
  }

  getCurrentTarget() {
    if (this.state === 'CRIME_CITY') {
      return this.crimeCityId || null;
    }

    if (this.state === 'ROUTE' && this.currentRouteIndex < this.route.length) {
      return this.route[this.currentRouteIndex] || null;
    }

    return null;
  }

  getNextExpectedCity() {
    return this.getCurrentTarget();
  }

  getCurrentLegIndex() {
    if (this.state === 'CRIME_CITY') {
      return 0;
    }

    return this.currentRouteIndex + 1;
  }

  isCrimeCityPhase() {
    return this.state === 'CRIME_CITY';
  }

  isRoutePhase() {
    return this.state === 'ROUTE';
  }

  isComplete() {
    return this.state === 'DONE';
  }

  canEnterCity(cityId) {
    return cityId === this.getCurrentTarget();
  }

  enterCity(cityId) {
    const expected = this.getCurrentTarget();

    if (!expected) {
      return {
        ok: false,
        reason: 'route_complete',
        expected: null,
        selected: cityId,
        state: this.state
      };
    }

    if (cityId !== expected) {
      this.failedAttempts += 1;

      return {
        ok: false,
        reason: 'wrong_city',
        expected,
        selected: cityId,
        state: this.state
      };
    }

    if (this.state === 'CRIME_CITY') {
      this.currentRouteIndex = 0;
      this.state = this.route.length > 0 ? 'ROUTE' : 'DONE';

      return {
        ok: true,
        reason: 'crime_city_accepted',
        expected: this.getCurrentTarget(),
        completed: this.isComplete(),
        state: this.state
      };
    }

    if (this.state === 'ROUTE') {
      this.currentRouteIndex += 1;

      if (this.currentRouteIndex >= this.route.length) {
        this.state = 'DONE';
      }

      return {
        ok: true,
        reason: 'route_city_accepted',
        expected: this.getCurrentTarget(),
        completed: this.isComplete(),
        state: this.state
      };
    }

    return {
      ok: false,
      reason: 'route_complete',
      expected: null,
      selected: cityId,
      state: this.state
    };
  }

  forceDone() {
    this.state = 'DONE';
    this.currentRouteIndex = this.route.length;
  }

  serialize() {
    return {
      route: [...this.route],
      crimeCityId: this.crimeCityId,
      currentRouteIndex: this.currentRouteIndex,
      failedAttempts: this.failedAttempts,
      state: this.state
    };
  }

  restore(data = {}) {
    const safeData = isPlainObject(data) ? data : {};

    this.route = sanitizeRoute(safeData.route);
    this.crimeCityId = sanitizeCityId(safeData.crimeCityId);

    this.currentRouteIndex = Number.isInteger(safeData.currentRouteIndex)
      ? Phaser.Math.Clamp(safeData.currentRouteIndex, 0, this.route.length)
      : 0;

    this.failedAttempts = Number.isInteger(safeData.failedAttempts)
      ? Math.max(0, safeData.failedAttempts)
      : 0;

    const restoredState = VALID_STATES.has(safeData.state)
      ? safeData.state
      : this.getInitialState();

    // Nie można mieć fazy crime city bez poprawnego miasta zbrodni.
    if (!this.crimeCityId && restoredState === 'CRIME_CITY') {
      this.state = this.route.length > 0
        ? 'ROUTE'
        : 'DONE';

      return;
    }

    // W fazie CRIME_CITY trasa jeszcze się nie rozpoczęła.
    if (restoredState === 'CRIME_CITY') {
      this.currentRouteIndex = 0;
      this.state = 'CRIME_CITY';
      return;
    }

    // Trasa bez punktów nie może być aktywna.
    if (restoredState === 'ROUTE' && this.route.length === 0) {
      this.currentRouteIndex = 0;
      this.state = 'DONE';
      return;
    }

    // Indeks na końcu trasy oznacza ukończenie.
    if (restoredState === 'ROUTE' && this.currentRouteIndex >= this.route.length) {
      this.currentRouteIndex = this.route.length;
      this.state = 'DONE';
      return;
    }

    if (restoredState === 'DONE') {
      this.currentRouteIndex = this.route.length;
      this.state = 'DONE';
      return;
    }

    this.state = 'ROUTE';
  }
}