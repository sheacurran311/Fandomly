// Fan Interest Options - Matches Creator Onboarding Options
// These options should match what creators select during their onboarding

export const CREATOR_TYPE_OPTIONS = [
  { value: "athletes", label: "Athletes" },
  { value: "musicians", label: "Musicians" },
  { value: "content_creators", label: "Content Creators" }
] as const;

// Sport types (matches athlete creator onboarding)
export const SPORT_OPTIONS = [
  "Football",
  "Basketball",
  "Baseball",
  "Soccer",
  "Hockey",
  "Lacrosse",
  "Tennis",
  "Golf",
  "Track & Field",
  "Swimming",
  "Volleyball",
  "Wrestling",
  "Gymnastics",
  "Softball",
  "Cross Country",
  "Other"
] as const;

// Music genres (matches musician creator onboarding)
export const MUSIC_GENRE_OPTIONS = [
  "Hip Hop",
  "Pop",
  "Rock",
  "R&B",
  "Country",
  "Electronic/EDM",
  "Jazz",
  "Classical",
  "Latin",
  "Reggae",
  "Blues",
  "Metal",
  "Folk",
  "Indie",
  "Alternative",
  "Other"
] as const;

// Content creator types (matches content creator onboarding)
export const CONTENT_TYPE_OPTIONS = [
  "Gaming",
  "Vlogging",
  "Comedy/Skits",
  "Beauty/Fashion",
  "Cooking/Food",
  "Fitness/Health",
  "Travel",
  "Education/Tutorials",
  "Technology/Reviews",
  "Music/Covers",
  "Art/Design",
  "Lifestyle",
  "Sports Commentary",
  "Podcasting",
  "Animation",
  "Other"
] as const;

// Helper types
export type CreatorTypeInterest = typeof CREATOR_TYPE_OPTIONS[number]['value'];
export type SportOption = typeof SPORT_OPTIONS[number];
export type MusicGenreOption = typeof MUSIC_GENRE_OPTIONS[number];
export type ContentTypeOption = typeof CONTENT_TYPE_OPTIONS[number];

// Get subcategory options based on creator type
export function getSubcategoryOptions(creatorType: CreatorTypeInterest) {
  switch (creatorType) {
    case "athletes":
      return SPORT_OPTIONS;
    case "musicians":
      return MUSIC_GENRE_OPTIONS;
    case "content_creators":
      return CONTENT_TYPE_OPTIONS;
    default:
      return [];
  }
}

// Get label for creator type
export function getCreatorTypeLabel(creatorType: CreatorTypeInterest): string {
  const option = CREATOR_TYPE_OPTIONS.find(opt => opt.value === creatorType);
  return option?.label || creatorType;
}

