export type CropSettings = { x: number; y: number; zoom: number; turns: number };
export const DEFAULT_CROP: CropSettings = { x: 0.5, y: 0.5, zoom: 1, turns: 0 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

/** All coordinates are in the EXIF-oriented, then quarter-turned source image. */
export function cropGeometry(width: number, height: number, settings: CropSettings) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error("This photo has no readable dimensions.");
  const turns = ((Math.round(Number.isFinite(settings.turns) ? settings.turns : 0) % 4) + 4) % 4;
  const rotatedWidth = turns % 2 ? height : width;
  const rotatedHeight = turns % 2 ? width : height;
  const maxZoom = Math.max(1, Math.min(4, Math.min(rotatedWidth, rotatedHeight) / 120));
  const zoom = clamp(settings.zoom, 1, maxZoom);
  const side = Math.min(rotatedWidth, rotatedHeight) / zoom;
  return {
    turns,
    rotatedWidth,
    rotatedHeight,
    side,
    maxZoom,
    zoom,
    left: (rotatedWidth - side) * clamp(settings.x, 0, 1),
    top: (rotatedHeight - side) * clamp(settings.y, 0, 1),
  };
}

export function panCrop(
  width: number,
  height: number,
  settings: CropSettings,
  dx: number,
  dy: number,
  previewSize: number,
): CropSettings {
  const crop = cropGeometry(width, height, settings);
  if (previewSize <= 0) return settings;
  const horizontalRoom = crop.rotatedWidth - crop.side;
  const verticalRoom = crop.rotatedHeight - crop.side;
  return {
    ...settings,
    x:
      horizontalRoom > 0
        ? clamp(settings.x - ((dx / previewSize) * crop.side) / horizontalRoom, 0, 1)
        : settings.x,
    y:
      verticalRoom > 0
        ? clamp(settings.y - ((dy / previewSize) * crop.side) / verticalRoom, 0, 1)
        : settings.y,
  };
}
