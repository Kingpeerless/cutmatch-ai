"use client";

import Image from "next/image";
import { useState } from "react";

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
  creator: string;
  src: string;
  sourceUrl: string;
  alt: string;
  categoryLabel: string;
  categories: readonly PhotoCategory[];
  audience: Exclude<HairstyleAudience, "all">;
  use: "custom-reference" | "inspiration-only";
  availabilityNote?: string;
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
  },
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
    availabilityNote: "The exact hairstyle cannot be identified from this detail crop.",
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
  const photos = PHOTOS.filter((photo) => {
    const search = query.trim().toLowerCase();
    const matchesSearch =
      !search ||
      photo.title.toLowerCase().includes(search) ||
      photo.categoryLabel.toLowerCase().includes(search);
    return (
      matchesSearch &&
      (category === "All references" || photo.categories.includes(category)) &&
      (audience === "all" || photo.audience === audience)
    );
  });

  async function choosePhoto(photo: (typeof PHOTOS)[number]) {
    if (photo.use !== "custom-reference") return;
    setLoadingFile(photo.file);
    onError("");
    try {
      const response = await fetch(photo.src);
      if (!response.ok) throw new Error("Could not load this local reference photo.");
      const blob = await response.blob();
      if (blob.type !== "image/jpeg" || blob.size <= 0 || blob.size > 10 * 1024 * 1024) {
        throw new Error("This reference photo could not be prepared. Please upload your own image.");
      }
      onSelect(new File([blob], photo.file, { type: "image/jpeg" }), photo.title);
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
          <h4 id="photo-reference-title">Browse real hairstyle photos</h4>
          <p>
            Pexels references are separate from YouCam presets. Supported reference uploads do not
            guarantee an exact style match.
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
      {photos.length > 0 ? (
        <div className="photo-reference-grid">
          {photos.map((photo) => {
            const isInspirational = photo.use === "inspiration-only";
            return (
              <article
                key={photo.file}
                className={`photo-reference-card ${selectedFile === photo.file ? "selected" : ""}`}
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
                  <span className={`photo-reference-badge${isInspirational ? " inspiration" : ""}`}>
                    {loadingFile === photo.file
                      ? "LOADING…"
                      : isInspirational
                        ? "INSPIRATION ONLY"
                        : "REFERENCE · RESULT UNVERIFIED"}
                  </span>
                  {photo.availabilityNote && (
                    <small className="photo-reference-limitation">{photo.availabilityNote}</small>
                  )}
                  <a
                    className="photo-reference-credit"
                    href={photo.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Photo by {photo.creator} · Pexels
                  </a>
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
        cannot be sent as references. No image is sent until you press Generate preview.
      </p>
    </section>
  );
}
