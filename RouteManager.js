// routeManager.js
export class RouteManager {
  constructor(route = [], crimeCityId = null) {
    this.route = Array.isArray(route) ? [...route] : [];
    this.crimeCityId = crimeCityId || null;
    this.currentRouteIndex = 0;
    this.failedAttempts = 0;
    this.state = 'CRIME_CITY';
  }

  reset(route = null, crimeCityId = null) {
    if (route) this.route = [...route];
    if (crimeCityId !== null) this.crimeCityId = crimeCityId;
    this.currentRouteIndex = 0;
    this.failedAttempts = 0;
    this.state = 'CRIME_CITY';
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
    if (this.state === 'CRIME_CITY') return 0;
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
      this.state = this.route.length > 0 ? 'ROUTE' : 'DONE';
      this.currentRouteIndex = 0;
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
    this.route = Array.isArray(data.route) ? [...data.route] : [];
    this.crimeCityId = data.crimeCityId || null;
    this.currentRouteIndex = Number.isInteger(data.currentRouteIndex)
      ? data.currentRouteIndex
      : 0;
    this.failedAttempts = Number.isInteger(data.failedAttempts)
      ? data.failedAttempts
      : 0;
    this.state = data.state || 'CRIME_CITY';
  }
}