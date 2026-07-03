import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { ImageError, processImage } from "../image";

async function makeImage(
  width: number,
  height: number,
  format: "jpeg" | "png" | "tiff" = "jpeg",
): Promise<Buffer> {
  const base = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
  });
  const out = format === "jpeg" ? base.jpeg() : format === "png" ? base.png() : base.tiff();
  return out.toBuffer();
}

describe("processImage", () => {
  it("resizes the longest edge to 1024 and outputs jpeg", async () => {
    const out = await processImage(await makeImage(2000, 1000));
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(512);
  });

  it("does not enlarge a small image", async () => {
    const out = await processImage(await makeImage(400, 400));
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(400);
  });

  it("strips EXIF metadata on re-encode", async () => {
    const withExif = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "SwipeJobs test", Software: "test" } })
      .toBuffer();
    // Sanity: the input actually carries EXIF.
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const out = await processImage(withExif);
    expect((await sharp(out).metadata()).exif).toBeUndefined();
  });

  it("rejects a non-image buffer", async () => {
    await expect(processImage(Buffer.from("definitely not an image"))).rejects.toBeInstanceOf(
      ImageError,
    );
  });

  it("rejects an unsupported format (tiff)", async () => {
    await expect(processImage(await makeImage(100, 100, "tiff"))).rejects.toMatchObject({
      code: "unsupported_format",
    });
  });

  it("rejects oversized source dimensions", async () => {
    await expect(processImage(await makeImage(7000, 100))).rejects.toMatchObject({
      code: "dimensions_too_large",
    });
  });
});
