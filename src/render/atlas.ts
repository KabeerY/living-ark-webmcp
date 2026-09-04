import { Rectangle, Texture } from "pixi.js";
import atlasUrl from "../assets/living-ark-sprite-atlas-v1.png";

const COLUMNS = 6;
const ROWS = 10;

export type ArkAtlas = {
  textureAt: (column: number, row: number) => Texture;
};

/**
 * The generator returned a strong atlas with a baked neutral checkerboard.
 * We preserve the source asset and key only near-neutral bright pixels in a
 * runtime canvas. Warm ivory pixels remain because their channel spread is
 * intentionally much larger than the background's.
 */
async function loadKeyedSource(): Promise<Texture> {
  const image = new Image();
  image.decoding = "async";
  image.src = atlasUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Living Ark atlas canvas is unavailable.");
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);

  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    const red = pixels.data[offset];
    const green = pixels.data[offset + 1];
    const blue = pixels.data[offset + 2];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const neutralSpread = maximum - minimum;
    if (minimum > 218 && neutralSpread < 11) {
      pixels.data[offset + 3] = 0;
    } else if (minimum > 204 && neutralSpread < 15) {
      pixels.data[offset + 3] = Math.round(((218 - minimum) / 14) * 255);
    }
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.putImageData(pixels, 0, 0);
  const texture = Texture.from(canvas);
  texture.source.scaleMode = "nearest";
  return texture;
}

export async function loadArkAtlas(): Promise<ArkAtlas> {
  const sourceTexture = await loadKeyedSource();
  const cellWidth = sourceTexture.width / COLUMNS;
  const cellHeight = sourceTexture.height / ROWS;
  const textures = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, column) => {
      const left = Math.floor(column * cellWidth);
      const top = Math.floor(row * cellHeight);
      const right = Math.floor((column + 1) * cellWidth);
      const bottom = Math.floor((row + 1) * cellHeight);
      return new Texture({
        source: sourceTexture.source,
        frame: new Rectangle(left, top, right - left, bottom - top),
      });
    }),
  );

  return {
    textureAt(column, row) {
      const texture = textures[row]?.[column];
      if (!texture) throw new Error(`Unknown Living Ark atlas cell ${column}:${row}.`);
      return texture;
    },
  };
}
