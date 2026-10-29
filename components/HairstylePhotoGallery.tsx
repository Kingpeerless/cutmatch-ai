"use client";

import Image from "next/image";
import { useState } from "react";
import {
  matchesFacialHairVisibility,
  matchesHairstylePhotoSearch,
} from "@/lib/hairstyle-photo-filters";
import { HAIRSTYLE_PHOTO_CANDIDATES } from "@/lib/hairstyle-photo-candidates";

export type HairstyleAudience = "all" | "men" | "women";

const PHOTO_CATEGORIES = [
  "All references",
  "Short cuts, fades & tapers",
  "Low taper fade",
  "Mid taper fade",
  "High taper fade",
  "Afros & natural",
  "Waves",
  "360 waves",
  "Burst fade",
  "Sponge twists with taper",
  "Braids & cornrows",
  "Box braids",
  "Knotless braids",
  "Fulani braids",
  "Ghana braids",
  "Passion twists",
  "Butterfly locs",
  "Twists & locs",
  "Braided updos",
  "Long hairstyles",
  "Bobs & pixie cuts",
  "Curly bob",
  "Protective styles",
  "Wigs & other",
  "Nigerian barbershop",
] as const;

type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

type HairstylePhoto = {
  file: string;
  title: string;
  creator?: string;
  src: string;
  sourceUrl?: string;
  alt: string;
  categoryLabel: string;
  categories: readonly string[];
  audience: Exclude<HairstyleAudience, "all">;
  use: "custom-reference" | "inspiration-only";
  facialHairVisible?: boolean;
  candidate?: boolean;
  availabilityNote?: string;
  aiGenerated?: boolean;
};

const PHOTOS: HairstylePhoto[] = [
  {
    file: "afro-portrait.jpg",
    title: "Natural afro",
    creator: "Bobography",
    src: "/images/hairstyles/afro-portrait.jpg",
    sourceUrl: "https://www.pexels.com/photo/portrait-of-woman-with-natural-afro-hairstyle-34786792/",
    alt: "Portrait of a woman with a full natural Afro, photographed in warm light.",
    categoryLabel: "Afros & natural",
    categories: ["Afros & natural"],
    audience: "women",
    use: "custom-reference",
    facialHairVisible: false,
  },
  {
    file: "waves.jpg",
    title: "Defined waves",
    creator: "Ismail Suleiman",
    src: "/images/hairstyles/waves.jpg",
    sourceUrl: "https://www.pexels.com/photo/man-in-sunglasses-with-stylish-wave-haircut-39945585/",
    alt: "Portrait of a man wearing short, defined waves.",
    categoryLabel: "Waves",
    categories: ["Waves"],
    audience: "men",
    use: "custom-reference",
    facialHairVisible: false,
  },
  {
    file: "cornrows.jpg",
    title: "Cornrows",
    creator: "Omotaiyewoo",
    src: "/images/hairstyles/cornrows.jpg",
    sourceUrl: "https://www.pexels.com/photo/profile-of-a-man-with-cornrows-against-rustic-wall-29138328/",
    alt: "Side-profile portrait of a man wearing cornrows.",
    categoryLabel: "Braids & cornrows",
    categories: ["Braids & cornrows", "Protective styles"],
    audience: "men",
    use: "custom-reference",
    facialHairVisible: true,
  },
  {
    file: "box-braids.jpg",
    title: "Long box braids",
    creator: "Geezy Photography",
    src: "/images/hairstyles/box-braids.jpg",
    sourceUrl: "https://www.pexels.com/photo/portrait-of-woman-with-box-braids-among-leaves-13767165/",
    alt: "Portrait of a woman wearing long box braids.",
    categoryLabel: "Box braids",
    categories: ["Braids & cornrows", "Box braids", "Long hairstyles", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    facialHairVisible: false,
  },
  {
    file: "locs.jpg",
    title: "Locs with faded sides",
    creator: "Reyna Montgomery",
    src: "/images/hairstyles/locs.jpg",
    sourceUrl: "https://www.pexels.com/photo/12093796/",
    alt: "Side-profile portrait showing short locs and closely faded sides.",
    categoryLabel: "Twists & locs",
    categories: ["Short cuts, fades & tapers", "Twists & locs", "Protective styles"],
    audience: "men",
    use: "custom-reference",
    facialHairVisible: true,
  },
  {
    file: "short-buzz-cut-close.jpg",
    title: "Short buzz cut",
    creator: "Marcelo Chagas",
    src: "/images/hairstyles/short-buzz-cut-close.jpg",
    sourceUrl: "https://www.pexels.com/photo/thoughtful-black-woman-on-footbridge-6151195/",
    alt: "Close side portrait showing a closely shaved, even buzz cut and hairline.",
    categoryLabel: "Short cuts, fades & tapers",
    categories: ["Short cuts, fades & tapers"],
    audience: "women",
    use: "custom-reference",
    facialHairVisible: false,
  },
  {
    file: "pixie-cut.jpg",
    title: "Textured pixie cut",
    creator: "Beatriz Fernandes",
    src: "/images/hairstyles/pixie-cut.jpg",
    sourceUrl: "https://www.pexels.com/photo/a-tattooed-woman-looking-at-the-camera-while-hands-is-on-her-chin-12900365/",
    alt: "Front-facing portrait of a woman with a short, textured pixie haircut.",
    categoryLabel: "Bobs & pixie cuts",
    categories: ["Short cuts, fades & tapers", "Bobs & pixie cuts"],
    audience: "women",
    use: "custom-reference",
    facialHairVisible: false,
  },
  {
    file: "cornrows-with-long-braids.jpg",
    title: "Cornrows with long braids",
    creator: "Evlogia Pictures",
    src: "/images/hairstyles/cornrows-with-long-braids.jpg",
    sourceUrl: "https://www.pexels.com/photo/an-african-woman-with-braids-17463802/",
    alt: "Close side portrait showing cornrows braided back into long braids.",
    categoryLabel: "Braids & cornrows",
    categories: ["Braids & cornrows", "Long hairstyles", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    facialHairVisible: false,
  },
  {
    file: "long-braids-close.jpg",
    title: "Long braids",
    creator: "Wayne Fotografias",
    src: "/images/hairstyles/long-braids-close.jpg",
    sourceUrl: "https://www.pexels.com/photo/dreamy-black-woman-with-afro-braids-5722771/",
    alt: "Close portrait of long individual braids framing the face; the specific braid pattern is not identified.",
    categoryLabel: "Long hairstyles",
    categories: ["Braids & cornrows", "Long hairstyles", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    facialHairVisible: false,
  },
  {
    file: "braided-space-buns.jpg",
    title: "Braided buns",
    creator: "Oluwapamilerinayo Ajala",
    src: "/images/hairstyles/braided-space-buns.jpg",
    sourceUrl: "https://www.pexels.com/photo/portrait-of-a-young-woman-with-unique-braids-36426407/",
    alt: "Portrait showing multiple braided buns with individual braids framing the face.",
    categoryLabel: "Braided updos",
    categories: ["Braids & cornrows", "Braided updos", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    facialHairVisible: false,
  },
  ...HAIRSTYLE_PHOTO_CANDIDATES,
  {
    file: "long-braids-profile.jpg",
    title: "Long braids in profile",
    creator: "Kabe Rossi",
    src: "/images/hairstyles/long-braids-profile.jpg",
    sourceUrl: "https://www.pexels.com/photo/model-in-long-braids-wearing-denim-dungarees-15290414/",
    alt: "Wide side-profile portrait showing long braids; hairstyle details are small in the frame.",
    categoryLabel: "Long hairstyles",
    categories: ["Braids & cornrows", "Long hairstyles", "Protective styles"],
    audience: "women",
    use: "inspiration-only",
    facialHairVisible: false,
    availabilityNote: "The source is framed too wide to inspect the hairline and braid detail closely.",
  },
  {
    file: "braids-detail.jpg",
    title: "Braided texture detail",
    creator: "Malama Mushitu",
    src: "/images/hairstyles/braids-detail.jpg",
    sourceUrl: "https://www.pexels.com/photo/close-up-of-textured-braids-on-a-woman-34191088/",
    alt: "Extreme close-up of braid texture without enough context to identify the hairstyle.",
    categoryLabel: "Braid detail",
    categories: ["Braids & cornrows"],
    audience: "women",
    use: "inspiration-only",
    facialHairVisible: false,
    availabilityNote: "The exact hairstyle cannot be identified from this detail crop.",
  },
];

const AI_HAIRSTYLE_STYLES: HairstylePhoto[] = [
  {
    file: "ai-men-low-taper-textured-afro.jpeg",
    title: "Low taper textured afro",
    src: "/images/hairstyle-portraits/men/low-taper-textured-afro.jpeg",
    alt: "AI-generated hairstyle reference portrait showing a low taper textured afro.",
    categoryLabel: "Low taper textured afro",
    categories: ["Short cuts, fades & tapers", "Afros & natural"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-mid-taper.jpeg",
    title: "Mid taper",
    src: "/images/hairstyle-portraits/men/mid-taper.jpeg",
    alt: "AI-generated hairstyle reference portrait showing a mid taper.",
    categoryLabel: "Mid taper",
    categories: ["Short cuts, fades & tapers", "Mid taper fade"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-high-fade.jpeg",
    title: "High fade",
    src: "/images/hairstyle-portraits/men/high-fade.jpeg",
    alt: "AI-generated hairstyle reference portrait showing a high fade.",
    categoryLabel: "High fade",
    categories: ["Short cuts, fades & tapers", "High taper fade"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-burst-fade.jpeg",
    title: "Burst fade",
    src: "/images/hairstyle-portraits/men/burst-fade.jpeg",
    alt: "AI-generated hairstyle reference portrait showing a burst fade.",
    categoryLabel: "Burst fade",
    categories: ["Short cuts, fades & tapers", "Burst fade"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-360-waves.jpeg",
    title: "360 waves",
    src: "/images/hairstyle-portraits/men/360-waves.jpeg",
    alt: "AI-generated hairstyle reference portrait showing 360 waves.",
    categoryLabel: "360 waves",
    categories: ["Waves", "360 waves"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-sponge-twists.jpeg",
    title: "Sponge twists",
    src: "/images/hairstyle-portraits/men/sponge-twists.jpeg",
    alt: "AI-generated hairstyle reference portrait showing sponge twists.",
    categoryLabel: "Sponge twists",
    categories: ["Sponge twists with taper", "Twists & locs"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-defined-waves.jpeg",
    title: "Defined waves",
    src: "/images/hairstyle-portraits/men/defined-waves.jpeg",
    alt: "AI-generated hairstyle reference portrait showing defined waves.",
    categoryLabel: "Defined waves",
    categories: ["Waves"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-cornrows.jpeg",
    title: "Cornrows",
    src: "/images/hairstyle-portraits/men/cornrows.jpeg",
    alt: "AI-generated hairstyle reference portrait showing cornrows.",
    categoryLabel: "Cornrows",
    categories: ["Braids & cornrows", "Protective styles"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-locs-faded-sides.jpeg",
    title: "Locs with faded sides",
    src: "/images/hairstyle-portraits/men/locs-faded-sides.jpeg",
    alt: "AI-generated hairstyle reference portrait showing locs with faded sides.",
    categoryLabel: "Locs with faded sides",
    categories: ["Short cuts, fades & tapers", "Twists & locs"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-short-buzz-cut.jpeg",
    title: "Short buzz cut",
    src: "/images/hairstyle-portraits/men/short-buzz-cut.jpeg",
    alt: "AI-generated hairstyle reference portrait showing a short buzz cut.",
    categoryLabel: "Short buzz cut",
    categories: ["Short cuts, fades & tapers"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-temple-fade.jpeg",
    title: "Temple fade",
    src: "/images/hairstyle-portraits/men/temple-fade.jpeg",
    alt: "AI-generated hairstyle reference portrait showing a temple fade.",
    categoryLabel: "Temple fade",
    categories: ["Short cuts, fades & tapers"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-men-two-strand-twists.jpeg",
    title: "Two-strand twists",
    src: "/images/hairstyle-portraits/men/two-strand-twists.jpeg",
    alt: "AI-generated hairstyle reference portrait showing two-strand twists.",
    categoryLabel: "Two-strand twists",
    categories: ["Twists & locs", "Protective styles"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-knotless-braids.jpeg",
    title: "Knotless braids",
    src: "/images/hairstyle-portraits/women/knotless-braids.jpeg",
    alt: "AI-generated hairstyle reference portrait showing knotless braids.",
    categoryLabel: "Knotless braids",
    categories: ["Braids & cornrows", "Knotless braids", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-box-braids.jpeg",
    title: "Box braids",
    src: "/images/hairstyle-portraits/women/box-braids.jpeg",
    alt: "AI-generated hairstyle reference portrait showing box braids.",
    categoryLabel: "Box braids",
    categories: ["Braids & cornrows", "Box braids", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-cornrows.jpeg",
    title: "Cornrows",
    src: "/images/hairstyle-portraits/women/cornrows.jpeg",
    alt: "AI-generated hairstyle reference portrait showing cornrows.",
    categoryLabel: "Cornrows",
    categories: ["Braids & cornrows", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-fulani-braids.jpeg",
    title: "Fulani braids",
    src: "/images/hairstyle-portraits/women/fulani-braids.jpeg",
    alt: "AI-generated hairstyle reference portrait showing Fulani braids.",
    categoryLabel: "Fulani braids",
    categories: ["Braids & cornrows", "Fulani braids", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-ghana-braids.jpeg",
    title: "Ghana braids",
    src: "/images/hairstyle-portraits/women/ghana-braids.jpeg",
    alt: "AI-generated hairstyle reference portrait showing Ghana braids.",
    categoryLabel: "Ghana braids",
    categories: ["Braids & cornrows", "Ghana braids", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-passion-twists.jpeg",
    title: "Passion twists",
    src: "/images/hairstyle-portraits/women/passion-twists.jpeg",
    alt: "AI-generated hairstyle reference portrait showing passion twists.",
    categoryLabel: "Passion twists",
    categories: ["Passion twists", "Twists & locs", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-butterfly-locs.jpeg",
    title: "Butterfly locs",
    src: "/images/hairstyle-portraits/women/butterfly-locs.jpeg",
    alt: "AI-generated hairstyle reference portrait showing butterfly locs.",
    categoryLabel: "Butterfly locs",
    categories: ["Butterfly locs", "Twists & locs", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-locs.jpeg",
    title: "Locs",
    src: "/images/hairstyle-portraits/women/locs.jpeg",
    alt: "AI-generated hairstyle reference portrait showing locs.",
    categoryLabel: "Locs",
    categories: ["Twists & locs", "Protective styles"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-natural-afro.jpeg",
    title: "Natural afro",
    src: "/images/hairstyle-portraits/women/natural-afro.jpeg",
    alt: "AI-generated hairstyle reference portrait showing a natural afro.",
    categoryLabel: "Natural afro",
    categories: ["Afros & natural"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-natural-curls.jpeg",
    title: "Natural curls",
    src: "/images/hairstyle-portraits/women/natural-curls.jpeg",
    alt: "AI-generated hairstyle reference portrait showing natural curls.",
    categoryLabel: "Natural curls",
    categories: ["Afros & natural", "Curly bob"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-bob-cut.jpeg",
    title: "Bob cut",
    src: "/images/hairstyle-portraits/women/bob-cut.jpeg",
    alt: "AI-generated hairstyle reference portrait showing a bob cut.",
    categoryLabel: "Bob cut",
    categories: ["Bobs & pixie cuts", "Curly bob"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
  {
    file: "ai-women-pixie-cut.jpeg",
    title: "Pixie cut",
    src: "/images/hairstyle-portraits/women/pixie-cut.jpeg",
    alt: "AI-generated hairstyle reference portrait showing a pixie cut.",
    categoryLabel: "Pixie cut",
    categories: ["Bobs & pixie cuts", "Short cuts, fades & tapers"],
    audience: "women",
    use: "custom-reference",
    candidate: true,
    aiGenerated: true,
  },
];

type Props = {
  disabled: boolean;
  audience: HairstyleAudience;
  selectedFile: string | null;
  onSelect: (file: File, title: string) => void;
  onError: (message: string) => void;
};

export default function HairstylePhotoGallery({
  disabled,
  audience,
  selectedFile,
  onSelect,
  onError,
}: Props) {
  const [category, setCategory] = useState<PhotoCategory>("All references");
  const [query, setQuery] = useState("");
  const [loadingFile, setLoadingFile] = useState("");
  const [facialHairOnly, setFacialHairOnly] = useState(false);
  const [aiAudience, setAiAudience] = useState<HairstyleAudience>("all");
  const photos = PHOTOS.filter((photo) => {
    return (
      matchesHairstylePhotoSearch(photo, query) &&
      (category === "All references" || photo.categories.includes(category)) &&
      (audience === "all" || photo.audience === audience) &&
      matchesFacialHairVisibility(photo, facialHairOnly)
    );
  });
  const aiStyles = AI_HAIRSTYLE_STYLES.filter((style) => {
    return (
      (audience === "all" || style.audience === audience) &&
      (aiAudience === "all" || style.audience === aiAudience) &&
      matchesHairstylePhotoSearch(style, query)
    );
  });

  async function choosePhoto(photo: HairstylePhoto) {
    if (photo.use !== "custom-reference") return;
    setLoadingFile(photo.file);
    onError("");
    try {
      const response = await fetch(photo.src);
      if (!response.ok) throw new Error("Could not load this local reference photo.");
      const blob = await response.blob();
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(blob.type) ||
        blob.size <= 0 ||
        blob.size > 10 * 1024 * 1024
      ) {
        throw new Error("This reference photo could not be prepared. Please upload your own image.");
      }
      onSelect(new File([blob], photo.file, { type: blob.type }), photo.title);
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Could not load this reference photo.");
    } finally {
      setLoadingFile("");
    }
  }

  return (
    <section className="photo-reference-library" aria-labelledby="photo-reference-title">
      <div className="photo-reference-heading">
        <div>
          <h4 id="photo-reference-title">Browse hairstyle reference photos</h4>
          <p>
            References are separate from YouCam presets. AI-generated collage crops are marked as
            candidates; licensing and YouCam transfer quality are unverified.
          </p>
        </div>
      </div>
      <div className="photo-reference-categories" aria-label="Filter photo references by hairstyle">
        {PHOTO_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
          >
            {item}
          </button>
        ))}
      </div>
      <label className="photo-reference-search">
        <span className="visually-hidden">Search reference photos</span>
        <input
          type="search"
          placeholder="Search reference photos"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <label className="photo-reference-facial-hair-filter">
        <input
          type="checkbox"
          checked={facialHairOnly}
          onChange={(event) => setFacialHairOnly(event.target.checked)}
        />
        <span>Facial hair visible</span>
      </label>
      {photos.length > 0 ? (
        <div className="photo-reference-grid">
          {photos.map((photo) => {
            const isInspirational = photo.use === "inspiration-only";
            return (
              <article
                key={photo.file}
                className={`photo-reference-card${photo.candidate ? " candidate" : ""}${selectedFile === photo.file ? " selected" : ""}`}
              >
                <span className="photo-reference-image">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={800}
                    height={1000}
                    sizes="(max-width: 1100px) 42vw, (max-width: 1500px) 19vw, 260px"
                    loading="lazy"
                  />
                </span>
                <span className="photo-reference-copy">
                  <strong>{photo.title}</strong>
                  <small>{photo.categoryLabel}</small>
                  {photo.facialHairVisible && (
                    <span className="photo-reference-facial-hair-indicator">
                      Facial hair visible
                    </span>
                  )}
                  <span
                    className={`photo-reference-badge${isInspirational ? " inspiration" : ""}${photo.candidate ? " candidate" : ""}`}
                  >
                    {loadingFile === photo.file
                      ? "LOADING…"
                      : isInspirational
                        ? "INSPIRATION ONLY"
                        : photo.candidate
                          ? "AI CANDIDATE · UNVERIFIED"
                          : "REFERENCE · RESULT UNVERIFIED"}
                  </span>
                  {photo.availabilityNote && (
                    <small className="photo-reference-limitation">{photo.availabilityNote}</small>
                  )}
                  {photo.sourceUrl && photo.creator && (
                    <a
                      className="photo-reference-credit"
                      href={photo.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Photo by {photo.creator} · Pexels
                    </a>
                  )}
                </span>
                {isInspirational ? (
                  <span className="photo-reference-action" aria-label="Inspiration only">
                    Inspiration only
                  </span>
                ) : (
                  <button
                    type="button"
                    className="photo-reference-action"
                    onClick={() => void choosePhoto(photo)}
                    disabled={disabled || Boolean(loadingFile)}
                    aria-pressed={selectedFile === photo.file}
                  >
                    {loadingFile === photo.file
                      ? "Preparing…"
                      : selectedFile === photo.file
                        ? "Selected"
                        : "Use as reference"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="photo-reference-empty">
          <strong>
            {query.trim()
              ? "No verified close-up matches this search."
              : "No verified close-up reference for this category yet."}
          </strong>
          <span>
            {query.trim()
              ? `No selectable image is currently verified for “${query.trim()}”. Try another search or upload your own reference photo.`
              : `No source-verified close-up currently shows ${category.toLowerCase()} clearly enough to label it accurately. Photos with obscured hair, a cut in progress, or only generic braid/fade details are not used as substitutes. Upload your own reference photo or explore another category.`}
          </span>
        </div>
      )}
      <p className="photo-reference-note">
        Audience filters describe the person shown, not who can wear a hairstyle. Cards marked
        CUSTOM REF use YouCam&apos;s existing reference-upload flow; cards marked INSPIRATION ONLY
        cannot be sent as references. The facial-hair label describes the photo only and does not
        predict whether a generated result will preserve it. No image is sent until you press
        Generate preview.
      </p>
      <section
        className="photo-reference-library ai-hairstyle-styles"
        aria-labelledby="ai-hairstyle-styles-title"
      >
        <div className="photo-reference-heading">
          <div>
            <h4 id="ai-hairstyle-styles-title">AI Hairstyle Styles</h4>
            <p>
              AI-generated hairstyle reference portraits. Generated previews are not guaranteed to
              match the reference exactly.
            </p>
          </div>
        </div>
        <div className="photo-reference-categories" aria-label="Filter AI hairstyle styles by audience">
          {(["all", "men", "women"] as const).map((filter) => {
            const isUnavailable = audience !== "all" && filter !== "all" && filter !== audience;
            const isActive =
              audience === "all"
                ? aiAudience === filter
                : filter === "all"
                  ? aiAudience === "all"
                  : filter === audience && aiAudience !== "all";
            return (
              <button
                key={filter}
                type="button"
                className={isActive ? "active" : ""}
                onClick={() => setAiAudience(filter)}
                disabled={isUnavailable}
                aria-pressed={isActive}
              >
                {filter === "all" ? "All" : filter === "men" ? "Men" : "Women"}
              </button>
            );
          })}
        </div>
        {aiStyles.length > 0 ? (
          <div className="photo-reference-grid">
            {aiStyles.map((style) => (
              <article
                key={`${style.audience}-${style.file}`}
                className={`photo-reference-card candidate${selectedFile === style.file ? " selected" : ""}`}
              >
                <span className="photo-reference-image">
                  <Image
                    src={style.src}
                    alt={style.alt}
                    width={800}
                    height={1000}
                    sizes="(max-width: 1100px) 42vw, (max-width: 1500px) 19vw, 260px"
                    loading="lazy"
                  />
                </span>
                <span className="photo-reference-copy">
                  <strong>{style.title}</strong>
                  <small>{style.categoryLabel}</small>
                  <span className="photo-reference-badge candidate">
                    {loadingFile === style.file
                      ? "LOADING…"
                      : "AI-GENERATED REFERENCE · RESULT UNVERIFIED"}
                  </span>
                </span>
                <button
                  type="button"
                  className="photo-reference-action"
                  onClick={() => void choosePhoto(style)}
                  disabled={disabled || Boolean(loadingFile)}
                  aria-pressed={selectedFile === style.file}
                >
                  {loadingFile === style.file
                    ? "Preparing…"
                    : selectedFile === style.file
                      ? "Selected"
                      : "Use as reference"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="photo-reference-empty">
            <strong>No AI hairstyle reference matches this search.</strong>
            <span>Try another search or choose a different audience filter.</span>
          </div>
        )}
      </section>
    </section>
  );
}
