export function cameraPoint(event, rect) {
  if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0 || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
  return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
}
export function cameraFrame(a, b) {
  return { x: Math.min(a.x,b.x), y: Math.min(a.y,b.y), w: Math.abs(a.x-b.x), h: Math.abs(a.y-b.y) };
}
export function hasUsableCameraFrame(frame) {
  return !!frame && ['x','y','w','h'].every(k=>Number.isFinite(frame[k])) && frame.x >= 0 && frame.y >= 0 && frame.w > 0 && frame.h > 0 && frame.x+frame.w <= 1.000001 && frame.y+frame.h <= 1.000001;
}
