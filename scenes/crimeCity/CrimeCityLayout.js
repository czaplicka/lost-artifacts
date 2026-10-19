// scenes/crimeCity/CrimeCityLayout.js
const CITY_LAYOUTS = {
  london: [0,1,2,3,4,5,6,7,8,9,10],
  paris: [3,0,4,1,2,8,5,10,6,9,7],
  new_delhi: [4,2,0,3,1,9,7,5,10,8,6],
  warsaw: [1,4,3,0,2,7,10,8,5,6,9],
  new_york_city: [2,3,1,4,0,10,6,9,7,5,8],
  berlin: [0,3,4,2,1,8,10,6,9,7,5],
  toronto: [3,2,1,0,4,6,9,7,10,8,5],
  kotto: [4,0,2,1,3,9,5,8,6,10,7],
  islamabad: [1,2,4,3,0,5,8,10,7,9,6],
  nairobi: [2,4,0,1,3,10,7,5,9,6,8],
  tokyo: [4,1,3,2,0,7,6,10,8,5,9]
};
const POINTS = [
  [0.12,0],[0.38,0],[0.64,0],[0.88,0],
  [0.12,0.5],[0.38,0.5],[0.64,0.5],[0.88,0.5],
  [0.20,1],[0.50,1],[0.80,1]
];
export function buildCrimeCityLayout(scene, source = {}) {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const top = Math.max(136, height * 0.18);
  const bottom = Math.max(top + 1, height - Math.max(140, height * 0.16));
  const order = CITY_LAYOUTS[scene.cityId] || CITY_LAYOUTS.london;
  const point = index => {
    const [x,y] = POINTS[order[index]];
    return { x: Math.round(width*x), y: Math.round(top+(bottom-top)*y) };
  };
  return {
    ...source,
    crimeScene: { ...source.crimeScene, ...point(0) },
    crimeLab: { ...source.crimeLab, ...point(1) },
    hotel: { ...source.hotel, ...point(2) },
    shop: { ...source.shop, ...point(3) },
    apartment: { ...source.apartment, ...point(4) },
    suspectBoard: { ...source.suspectBoard, ...point(0) },
    suspectSlots: Array.from({ length: 6 }, (_,i) => ({ id: `suspect_${i+1}`, ...point(i+5) }))
  };
}
