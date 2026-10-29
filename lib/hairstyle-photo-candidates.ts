export type HairstylePhotoCandidate = {
  file: string;
  title: string;
  src: string;
  alt: string;
  categoryLabel: string;
  categories: readonly string[];
  audience: "men";
  use: "custom-reference";
  candidate: true;
  availabilityNote?: string;
};

export const HAIRSTYLE_PHOTO_CANDIDATES = [
  {
    file: "low-taper-textured-afro.png",
    title: "Low taper + textured afro",
    src: "/images/hairstyle-candidates/low-taper-textured-afro.png",
    alt: "AI-generated collage crop labeled low taper with a textured afro; transfer quality is unverified.",
    categoryLabel: "Afros & natural",
    categories: ["Short cuts, fades & tapers", "Low taper fade", "Afros & natural"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
  },
  {
    file: "mid-taper.png",
    title: "Mid taper",
    src: "/images/hairstyle-candidates/mid-taper.png",
    alt: "AI-generated collage crop labeled mid taper; transfer quality is unverified.",
    categoryLabel: "Mid taper fade",
    categories: ["Short cuts, fades & tapers", "Mid taper fade"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
  },
  {
    file: "high-fade.png",
    title: "High fade",
    src: "/images/hairstyle-candidates/high-fade.png",
    alt: "AI-generated collage crop labeled high fade; transfer quality is unverified.",
    categoryLabel: "Short cuts, fades & tapers",
    categories: ["Short cuts, fades & tapers"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
  },
  {
    file: "burst-fade.png",
    title: "Burst fade",
    src: "/images/hairstyle-candidates/burst-fade.png",
    alt: "AI-generated collage crop labeled burst fade; transfer quality is unverified.",
    categoryLabel: "Burst fade",
    categories: ["Short cuts, fades & tapers", "Burst fade"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
  },
  {
    file: "360-waves.png",
    title: "360 waves",
    src: "/images/hairstyle-candidates/360-waves.png",
    alt: "AI-generated collage crop labeled 360 waves; transfer quality is unverified.",
    categoryLabel: "360 waves",
    categories: ["Waves", "360 waves"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
  },
  {
    file: "sponge-twists.png",
    title: "Sponge twists",
    src: "/images/hairstyle-candidates/sponge-twists.png",
    alt: "AI-generated collage crop labeled sponge twists; the exact style and transfer quality are unverified.",
    categoryLabel: "Twists & locs",
    categories: ["Short cuts, fades & tapers", "Twists & locs"],
    audience: "men",
    use: "custom-reference",
    candidate: true,
    availabilityNote:
      "The sponge-twist label is provisional; the exact styling method is not independently verified.",
  },
] as const satisfies readonly HairstylePhotoCandidate[];
