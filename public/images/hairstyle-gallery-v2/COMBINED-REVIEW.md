# CutMatch AI hairstyle gallery v2 — combined staging audit

**Scope:** staging assets only. Exactly 12 men's and 12 women's target styles are represented. Nothing in this package has been connected to the live gallery.

## Audit summary

| Collection | Confirmed visual match | Needs human review | Missing reference |
|---|---:|---:|---:|
| Men | 10 | 2 | 0 |
| Women | 6 | 6 | 0 |
| **Total** | **16** | **8** | **0** |

`CONFIRMED` means the visible image supports the broad target label. It does **not** establish transfer quality or guarantee an API result. `NEEDS_REVIEW` is used where technique or style-family distinctions cannot be established confidently from the image. No target is marked `MISSING_REFERENCE`, since each has an individual readable staged image.

## Men's targets

| # | Target style | Staged image | Status | Visual audit |
|---:|---|---|---|---|
| 1 | Low taper with textured afro | `men/low-taper-textured-afro.png` | CONFIRMED | Textured afro and low taper are both visible. |
| 2 | Mid taper | `men/mid-taper.png` | CONFIRMED | Curly top with a mid-height taper is visible. |
| 3 | High fade | `men/high-fade.png` | CONFIRMED | High fade beneath a short textured top is visible. |
| 4 | Burst fade | `men/burst-fade.png` | CONFIRMED | Curved burst-shaped fade around the ear is visible. |
| 5 | 360 waves | `men/360-waves.png` | CONFIRMED | Clearly defined wave pattern across the top is visible. |
| 6 | Sponge twists | `men/sponge-twists.png` | NEEDS_REVIEW | Chunky twists are visible, but a sponge-coil texture is not clear and may be two-strand twists. |
| 7 | Defined waves | `men/defined-waves.png` | NEEDS_REVIEW | Wave pattern is clear but overlaps the 360-waves reference; the target distinction is unclear. |
| 8 | Cornrows | `men/cornrows.png` | CONFIRMED | Multiple scalp-braided rows are clearly visible. |
| 9 | Locs with faded sides | `men/locs-with-faded-sides.png` | CONFIRMED | Locs and a faded side area are both visible. |
| 10 | Short buzz cut | `men/short-buzz-cut.png` | CONFIRMED | A short, even buzz cut is clearly visible. |
| 11 | Temple fade (Brooklyn fade) | `men/temple-fade-cropped.png` | CONFIRMED | Temple-focused fade is clear. The image is a proportional crop of the preserved `men/temple-fade.png` source. |
| 12 | Two-strand twists | `men/two-strand-twists.png` | CONFIRMED | Individual two-strand twists with visible parting are clear. |

The Temple Fade crop removes the blank white side margins only: source bounds `(336,0,1200,1024)`, producing 864 × 1024 pixels without stretching. The original staged image is preserved. Its upstream creator/source and usage rights remain unverified. `men/high-taper-fade.png` is an additional preserved file, not a thirteenth target and not referenced by the target manifest.

## Women's targets

| # | Target style | Staged image | Status | Visual audit |
|---:|---|---|---|---|
| 1 | Knotless braids | `women/knotless-braids.png` | NEEDS_REVIEW | Individual braids are visible, but knotless installation cannot be verified visually. |
| 2 | Box braids | `women/women-candidate-07.png` | CONFIRMED | Long individual braids with visible sectioning support the broad box-braid label. |
| 3 | Cornrows | `women/cornrows.png` | CONFIRMED | Distinct rows braided close to the scalp are clearly visible. |
| 4 | Fulani braids | `women/fulani-braids.png` | NEEDS_REVIEW | A braided pattern with adornments is visible, but the exact Fulani pattern is not conclusive. |
| 5 | Ghana braids | `women/ghana-braids.png` | NEEDS_REVIEW | Scalp braids leading into longer braids are visible; the Ghana-braid distinction needs review. |
| 6 | Passion twists | `women/passion-twists.png` | NEEDS_REVIEW | Long textured twist-like strands are visible; braid/twist technique is uncertain. |
| 7 | Butterfly locs | `women/butterfly-locs.png` | NEEDS_REVIEW | Curly loc-like strands are visible; butterfly-loc features are not conclusive. |
| 8 | Locs | `women/locs.png` | CONFIRMED | Distinct individual loc strands are visible. |
| 9 | Natural afro | `women/women-candidate-04.png` | CONFIRMED | Rounded, voluminous natural-texture afro silhouette is clear. |
| 10 | Natural curls | `women/natural-curls.png` | NEEDS_REVIEW | Loose curls are visible, but natural curls cannot be distinguished confidently from styled or installed curls. |
| 11 | Bob cut | `women/women-candidate-10.png` | CONFIRMED | Short curly bob silhouette is clear. |
| 12 | Pixie cut | `women/pixie-cut.png` | CONFIRMED | Short pixie-length cut is clearly visible. |

The women's manifest retains the 12 earlier candidate entries and adds these 12 target mappings. Original candidates remain unchanged.

## Existing source assets found and reuse

Existing local source collages found in Downloads include:

- `Men’s Hairstyle Reference Guide.png` — source for the men's collage crops.
- `Braided Beauty Portrait Grid.png` and `Six Faces, One Timeless Beauty Grid.png` — sources for the retained women's candidate portraits.
- `Black Hairstyle Lookbook Collage.png` — source for the nine named women's target crops.
- `Hairstyle Portrait Gallery Grid.png`, `CutMatch AI Hairstyle Gallery.png`, and other men's hairstyle collages were also present. The existing staged crops were used rather than treating a multi-style collage as a standalone reference.

Existing individual project images were also found under `public/images/hairstyles/`, including `afro-portrait.jpg`, `box-braids.jpg`, `cornrows.jpg`, `locs.jpg`, and `pixie-cut.jpg`. They were not substituted into this audit's target mappings; existing target-specific staged images were retained. No project image or source collage was modified.

## Duplicate and overlap review

- No exact duplicate image hashes were found among the 24 target image files.
- **Men:** `360 waves` and `Defined waves` are visually close enough that their intended distinction needs human review. `Sponge twists` and `Two-strand twists` share a twist-like appearance; the sponge technique is not clear in the assigned image.
- **Women:** braid subtypes (`Knotless`, `Box`, `Fulani`, `Ghana`) are related and not all installation distinctions are visually decisive. `Passion twists` and `Butterfly locs` also need subtype review. An unassigned retained candidate, `women-candidate-11.png`, has a straight shoulder-length bob silhouette and could be an alternate Bob reference; it is not a second target mapping.
- Labels are unique within each 12-style target collection.

## Provenance and licensing

The manifests record the source file path and crop coordinates where available. Local source-file presence was checked, but file presence does not establish who created the image, its generation history, or permission to use it. Every target record is marked `provenance_status=UNVERIFIED` and `license_status=UNVERIFIED`. Commercial-use rights are unresolved for all 24 targets. Obtain and document appropriate rights before app integration or public use.

## Validation

- 12 unique men's target labels and 12 unique women's target labels.
- All 24 target images exist and open as PNG files; all preserved women's candidate records also point to readable image files.
- All recorded source paths exist, and recorded crop bounds are within source-image dimensions and match staged crop dimensions.
- Men’s and women’s individual contact sheets and the combined contact sheet open as valid PNG files.
- The staged candidate/reference images and source collages were read-only during this audit. SHA-256 before/after comparison confirmed the Temple Fade original remained unchanged while creating its derivative.
- `git diff --check` passed.

## Staging deliverables

- `COMBINED-REVIEW.md`
- `combined-contact-sheet.png`
- `men/manifest.csv`, `men/contact-sheet.png`, and `men/MISSING-REFERENCES.md`
- `men/temple-fade-cropped.png` (new derivative; original preserved)
- `women/manifest.csv`

No application code, live gallery data, API routes, environment variables, or production configuration were changed.
