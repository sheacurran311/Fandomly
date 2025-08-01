import { storage } from "./storage";

export async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Create sample creators first
    const creators = await Promise.all([
      storage.createCreator({
        userId: "sample-user-1",
        displayName: "Thunder Elite Athletics",
        bio: "Top-tier college basketball program focused on building champions on and off the court.",
        category: "athlete",
        followerCount: 15000,
        brandColors: {
          primary: "#1f2937",
          secondary: "#3b82f6",
          accent: "#10b981"
        },
        socialLinks: {
          instagram: "thunderelite",
          twitter: "thunderelite_bball",
          tiktok: "thunderelitebball"
        },
        isVerified: true,
      }),
      storage.createCreator({
        userId: "sample-user-2", 
        displayName: "Luna Music Collective",
        bio: "Independent music collective creating beats, melodies, and connecting with fans worldwide.",
        category: "musician",
        followerCount: 8500,
        brandColors: {
          primary: "#7c3aed",
          secondary: "#ec4899",
          accent: "#f59e0b"
        },
        socialLinks: {
          instagram: "lunamusicco",
          twitter: "lunamusicco",
          tiktok: "lunamusicco"
        },
        isVerified: true,
      }),
      storage.createCreator({
        userId: "sample-user-3",
        displayName: "Creator Studio Pro",
        bio: "Digital content creator sharing tech reviews, tutorials, and building an amazing community.",
        category: "creator",
        followerCount: 22000,
        brandColors: {
          primary: "#dc2626",
          secondary: "#ea580c",
          accent: "#facc15"
        },
        socialLinks: {
          instagram: "creatorstudiopro",
          twitter: "creatorstudiopro",
          youtube: "creatorstudiopro"
        },
        isVerified: true,
      }),
    ]);

    // Create sample fan quests
    const quests = await Promise.all([
      storage.createFanQuest({
        creatorId: creators[0].id,
        title: "Follow Thunder Elite on All Platforms",
        description: "Join our community by following us on Instagram, Twitter, and TikTok. Show your support for the team!",
        questType: "social_follow",
        requirements: {
          platforms: ["instagram", "twitter", "tiktok"],
          actions: ["follow"],
          duration: 7
        },
        rewards: {
          points: 150,
          tier: "bronze",
          exclusiveContent: "Behind-the-scenes practice footage",
          badgeId: "team-supporter"
        },
        isActive: true,
        difficultyLevel: "easy",
        maxParticipants: 500,
        currentParticipants: 23,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      }),
      storage.createFanQuest({
        creatorId: creators[0].id,
        title: "Share Game Highlights",
        description: "Share our latest game highlights on your story with #ThunderElite and tag us!",
        questType: "social_share",
        requirements: {
          platforms: ["instagram", "twitter"],
          actions: ["share", "tag"],
          hashtags: ["#ThunderElite", "#GameHighlights"],
          mentions: ["@thunderelite"],
          duration: 3
        },
        rewards: {
          points: 300,
          tier: "silver",
          exclusiveContent: "Exclusive player interview video",
          nft: "Thunder Elite Game Highlight NFT"
        },
        isActive: true,
        difficultyLevel: "medium",
        maxParticipants: 200,
        currentParticipants: 45,
        startDate: new Date(),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      }),
      storage.createFanQuest({
        creatorId: creators[1].id,
        title: "Create Content with Luna's Latest Track",
        description: "Use our newest song 'Starlight Dreams' in your TikTok or Instagram Reel. Tag us and use #LunaVibes!",
        questType: "social_post",
        requirements: {
          platforms: ["tiktok", "instagram"],
          actions: ["create_content", "tag"],
          hashtags: ["#LunaVibes", "#StarlightDreams"],
          mentions: ["@lunamusicco"],
          customInstructions: "Must use the full song for at least 15 seconds",
          duration: 10
        },
        rewards: {
          points: 500,
          tier: "gold",
          exclusiveContent: "Early access to next album",
          nft: "Luna Music Exclusive Fan Badge NFT",
          physicalReward: "Signed merchandise bundle"
        },
        isActive: true,
        difficultyLevel: "hard",
        maxParticipants: 100,
        currentParticipants: 12,
        startDate: new Date(),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      }),
      storage.createFanQuest({
        creatorId: creators[2].id,
        title: "Engagement Challenge: Comment & Like",
        description: "Engage with our last 3 posts by liking and leaving thoughtful comments. Let's build community together!",
        questType: "engagement",
        requirements: {
          platforms: ["instagram", "youtube"],
          actions: ["like", "comment"],
          customInstructions: "Comments must be at least 10 words and relevant to the content",
          duration: 5
        },
        rewards: {
          points: 200,
          tier: "bronze",
          exclusiveContent: "Creator Studio Pro productivity templates",
          badgeId: "community-builder"
        },
        isActive: true,
        difficultyLevel: "easy",
        maxParticipants: 1000,
        currentParticipants: 156,
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      }),
      storage.createFanQuest({
        creatorId: creators[2].id,
        title: "Tech Review Video Response",
        description: "Create a video response to our latest tech review. Share your thoughts and experiences with the product!",
        questType: "custom",
        requirements: {
          platforms: ["youtube", "tiktok"],
          customInstructions: "Video must be at least 1 minute long, mention the original review, and include your honest opinion",
          duration: 14
        },
        rewards: {
          points: 750,
          tier: "platinum",
          exclusiveContent: "1-on-1 tech consultation call",
          nft: "Creator Studio Pro Reviewer NFT",
          physicalReward: "Latest tech gadget featured in review"
        },
        isActive: true,
        difficultyLevel: "hard",
        maxParticipants: 50,
        currentParticipants: 8,
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }),
    ]);

    console.log(`Successfully seeded database with ${creators.length} creators and ${quests.length} quests`);
    return { creators, quests };
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}