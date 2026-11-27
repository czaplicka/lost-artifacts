export const PI_CLOCK_START_MINUTES = 9 * 60;
export const PI_LOCATION_HOURS = Object.freeze({
  'pi-office': [[0, 1440]],
  'your-home': [[0, 1440]],
  'spy-shop': [[600, 1200]],
  tavern: [[960, 120]],
  'police-station': [[0, 1440]],
  cemetery: [[0, 1440]],
  'shooting-range': [[480, 1320]]
});
// Recurring daily windows, in minutes. Overnight windows cross midnight.
export const PI_NPC_HOURS = Object.freeze({
  'tavern:bartender': { location: 'tavern', windows: [[960, 120]] },
  'tavern:regular': { location: 'tavern', windows: [[1080, 120]] },
  'tavern:guest': { location: 'tavern', windows: [[960, 1320]] }
});
export const PI_SCENE_LOCATIONS = Object.freeze({
  DetectiveOfficeScene: 'pi-office', PigeonLoftScene: 'your-home',
  SpyShopScene: 'spy-shop', TavernScene: 'tavern',
  PoliceStationScene: 'police-station', PrecinctOfficeScene: 'police-station', ShootingRangeScene: 'shooting-range'
});
