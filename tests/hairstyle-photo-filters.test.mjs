import assert from "node:assert/strict";
import test from "node:test";
import {
  matchesFacialHairVisibility,
  matchesHairstylePhotoSearch,
} from "../lib/hairstyle-photo-filters.ts";

test("facial-hair-only filter includes only references explicitly marked visible", () => {
  const confirmed = { facialHairVisible: true };
  const notConfirmed = { facialHairVisible: false };
  const unknown = {};

  assert.equal(matchesFacialHairVisibility(confirmed, true), true);
  assert.equal(matchesFacialHairVisibility(notConfirmed, true), false);
  assert.equal(matchesFacialHairVisibility(unknown, true), false);
  assert.equal(matchesFacialHairVisibility(notConfirmed, false), true);
  assert.equal(matchesFacialHairVisibility(unknown, false), true);
});

test("reference search matches candidate labels and supported category names", () => {
  const lowTaper = {
    title: "Low taper + textured afro",
    categoryLabel: "Afros & natural",
    categories: ["Short cuts, fades & tapers", "Low taper fade", "Afros & natural"],
  };

  assert.equal(matchesHairstylePhotoSearch(lowTaper, "textured afro"), true);
  assert.equal(matchesHairstylePhotoSearch(lowTaper, "low taper fade"), true);
  assert.equal(matchesHairstylePhotoSearch(lowTaper, "  AFROS  "), true);
  assert.equal(matchesHairstylePhotoSearch(lowTaper, "sponge twists"), false);
  assert.equal(matchesHairstylePhotoSearch(lowTaper, ""), true);
});
