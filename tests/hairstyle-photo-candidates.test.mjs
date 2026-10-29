import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";
import { HAIRSTYLE_PHOTO_CANDIDATES } from "../lib/hairstyle-photo-candidates.ts";

const expectedLabels = [
  "Low taper + textured afro",
  "Mid taper",
  "High fade",
  "Burst fade",
  "360 waves",
  "Sponge twists",
];

test("candidate references have distinct paths and remain custom male references", () => {
  assert.deepEqual(
    HAIRSTYLE_PHOTO_CANDIDATES.map((photo) => photo.title),
    expectedLabels,
  );
  assert.equal(new Set(HAIRSTYLE_PHOTO_CANDIDATES.map((photo) => photo.file)).size, 6);
  assert.equal(new Set(HAIRSTYLE_PHOTO_CANDIDATES.map((photo) => photo.src)).size, 6);

  for (const photo of HAIRSTYLE_PHOTO_CANDIDATES) {
    assert.equal(photo.audience, "men");
    assert.equal(photo.use, "custom-reference");
    assert.equal(photo.candidate, true);
    assert.equal("facialHairVisible" in photo, false);
    assert.ok(photo.src.startsWith("/images/hairstyle-candidates/"));
    assert.equal(photo.src.split("/").at(-1), photo.file);
  }

  assert.ok(
    !HAIRSTYLE_PHOTO_CANDIDATES.find((photo) => photo.title === "High fade")?.categories.includes(
      "High taper fade",
    ),
  );
  assert.match(
    HAIRSTYLE_PHOTO_CANDIDATES.find((photo) => photo.title === "Sponge twists")?.availabilityNote ?? "",
    /provisional/i,
  );
});

test("all candidate paths resolve to readable PNG images with suitable dimensions", async () => {
  for (const photo of HAIRSTYLE_PHOTO_CANDIDATES) {
    const path = fileURLToPath(new URL(`../public${photo.src}`, import.meta.url));
    const metadata = await sharp(path).metadata();

    assert.equal(metadata.format, "png", photo.file);
    assert.ok(metadata.width && metadata.width >= 400 && metadata.width <= 600, photo.file);
    assert.ok(metadata.height && metadata.height >= 350 && metadata.height <= 500, photo.file);
  }
});
