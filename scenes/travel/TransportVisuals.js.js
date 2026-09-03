export const TRANSPORT_VISUALS = {
    plane: {
        icon: '✈',
        logTitle: 'FLIGHT LOG',
        label: 'Plane',
        color: '#f4e7c1',
        routeColor: 0xd9c27a,
        clearRouteText: 'Clear skies. The flight remains on schedule.',
        rerouteLabel: 'FLIGHT PATH REROUTE',
        sfxKey: 'planesound',
        sfxVolume: 0.5,
        iconOffsetY: -18,
        animation: 'flight'
    },

    train: {
        icon: '🚆',
        logTitle: 'RAIL LOG',
        label: 'Train',
        color: '#b8e0d2',
        routeColor: 0x8fd3ff,
        clearRouteText: 'Clear tracks. The train remains on schedule.',
        rerouteLabel: 'RAIL ROUTE CHANGE',
        sfxKey: null,
        sfxVolume: 0,
        iconOffsetY: -20,
        animation: 'rail'
    },

    bus: {
        icon: '🚌',
        logTitle: 'ROAD LOG',
        label: 'Bus',
        color: '#ffd166',
        routeColor: 0xffb347,
        clearRouteText: 'Clear roads. The bus remains on schedule.',
        rerouteLabel: 'ROAD DETOUR',
        sfxKey: null,
        sfxVolume: 0,
        iconOffsetY: -20,
        animation: 'road'
    },

    ship: {
        icon: '🚢',
        logTitle: 'SEA LOG',
        label: 'Ship',
        color: '#a8d8ff',
        routeColor: 0x62b6cb,
        clearRouteText: 'Calm waters. The vessel remains on schedule.',
        rerouteLabel: 'SEA ROUTE CHANGE',
        sfxKey: null,
        sfxVolume: 0,
        iconOffsetY: -22,
        animation: 'sea'
    }
};