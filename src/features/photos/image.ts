import sharp from "sharp";

// Not `server-only`: this is a pure image-processing module (sharp is Node-only,
// which naturally prevents client bundling) so it can be unit-tested directly.

export const ALLOWED_FORMATS = ["jpeg", "png", "webp"] as const;
export const MAX_INPUT_DIMENSION = 6000; // reject absurdly large source images
export const OUTPUT_MAX_EDGE = 1024; // resize the longest edge to this

export type ImageErrorCode = "invalid_image" | "unsupported_format" | "dimensions_too_large";

export class ImageError extends Error {
  code: ImageErrorCode;
  constructor(code: ImageErrorCode) {
    super(code);
    this.code = code;
    this.name = "ImageError";
  }
}

/**
 * Validate (by magic bytes via sharp's decoder, NOT the file extension) and
 * re-encode an uploaded image: auto-orient, strip EXIF/GPS, resize the longest
 * edge to OUTPUT_MAX_EDGE, and emit a clean JPEG. `.rotate()` bakes the EXIF
 * orientation and the re-encode drops all metadata (no `withMetadata()`), so
 * GPS/EXIF is removed by construction. Throws ImageError on anything that isn't a
 * supported, sane image.
 */
export async function processImage(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input)
    .metadata()
    .catch(() => {
      // Not a decodable image (magic-byte fail).
      throw new ImageError("invalid_image");
    });

  if (!meta.format || !ALLOWED_FORMATS.includes(meta.format as (typeof ALLOWED_FORMATS)[number])) {
    throw new ImageError("unsupported_format"); // e.g. svg/gif/tiff — rejected
  }
  if (!meta.width || !meta.height) {
    throw new ImageError("invalid_image");
  }
  if (meta.width > MAX_INPUT_DIMENSION || meta.height > MAX_INPUT_DIMENSION) {
    throw new ImageError("dimensions_too_large");
  }

  return sharp(input)
    .rotate()
    .resize(OUTPUT_MAX_EDGE, OUTPUT_MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}
