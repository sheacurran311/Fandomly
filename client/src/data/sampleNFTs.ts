// Sample NFT data for demonstration purposes
import { type Reward } from "@shared/schema";

export const sampleNFTRewards: Reward[] = [
  {
    id: "reward_1",
    tenantId: "sample_tenant",
    programId: "prog_1", 
    name: "Legendary Dragon NFT",
    description: "An exclusive legendary dragon NFT from the Mystic Beasts collection",
    pointsCost: 5000,
    rewardType: "nft",
    rewardData: {
      nftMetadata: {
        name: "Mystic Dragon #001",
        description: "A legendary fire-breathing dragon with emerald scales and golden wings",
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
        attributes: [
          { trait_type: "Element", value: "Fire" },
          { trait_type: "Rarity", value: "Legendary" },
          { trait_type: "Power", value: "9500" }
        ],
        contractAddress: "0x123...abc",
        tokenId: "001",
        blockchain: "ethereum",
        rarity: "legendary",
        collection: "Mystic Beasts"
      }
    },
    maxRedemptions: 10,
    currentRedemptions: 2,
    requiredTier: "gold",
    isActive: true,
    createdAt: new Date("2024-01-15")
  },
  {
    id: "reward_2",
    tenantId: "sample_tenant",
    programId: "prog_1",
    name: "Epic Warrior NFT", 
    description: "A fierce warrior ready for battle from the Champions collection",
    pointsCost: 3000,
    rewardType: "nft",
    rewardData: {
      nftMetadata: {
        name: "Champion Warrior #042",
        description: "An epic warrior with legendary armor and a mystical sword",
        image: "https://images.unsplash.com/photo-1551328631-6d1b3e51c3f7?w=400",
        attributes: [
          { trait_type: "Class", value: "Warrior" },
          { trait_type: "Rarity", value: "Epic" },
          { trait_type: "Strength", value: "8200" }
        ],
        contractAddress: "0x456...def",
        tokenId: "042",
        blockchain: "ethereum", 
        rarity: "epic",
        collection: "Champions"
      }
    },
    maxRedemptions: 25,
    currentRedemptions: 8,
    requiredTier: "silver",
    isActive: true,
    createdAt: new Date("2024-01-16")
  },
  {
    id: "reward_3",
    tenantId: "sample_tenant",
    programId: "prog_1",
    name: "Rare Space Explorer",
    description: "Discover the cosmos with this rare space explorer NFT",
    pointsCost: 2500,
    rewardType: "nft",
    rewardData: {
      nftMetadata: {
        name: "Cosmos Explorer #156",
        description: "A rare astronaut exploring distant galaxies",
        image: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400",
        attributes: [
          { trait_type: "Mission", value: "Galaxy Quest" },
          { trait_type: "Rarity", value: "Rare" },
          { trait_type: "Experience", value: "7800" }
        ],
        blockchain: "solana",
        rarity: "rare",
        collection: "Cosmos Explorers"
      }
    },
    maxRedemptions: 50,
    currentRedemptions: 15,
    requiredTier: "bronze",
    isActive: true,
    createdAt: new Date("2024-01-17")
  },
  {
    id: "reward_4",
    tenantId: "sample_tenant",
    programId: "prog_1",
    name: "Uncommon Pixel Art",
    description: "Retro pixel art NFT from the 8-bit collection",
    pointsCost: 1500,
    rewardType: "nft",
    rewardData: {
      nftMetadata: {
        name: "Pixel Hero #288",
        description: "A nostalgic 8-bit style hero character",
        image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400",
        attributes: [
          { trait_type: "Style", value: "8-bit" },
          { trait_type: "Rarity", value: "Uncommon" },
          { trait_type: "Nostalgia", value: "9000" }
        ],
        blockchain: "solana",
        rarity: "uncommon",
        collection: "Retro Pixels"
      }
    },
    maxRedemptions: 100,
    currentRedemptions: 32,
    requiredTier: null,
    isActive: true,
    createdAt: new Date("2024-01-18")
  },
  {
    id: "reward_5",
    tenantId: "sample_tenant",
    programId: "prog_1",
    name: "Common Crystal Gem",
    description: "Beautiful crystal gem from the Mineral collection",
    pointsCost: 800,
    rewardType: "nft",
    rewardData: {
      nftMetadata: {
        name: "Crystal Gem #512",
        description: "A shimmering crystal with mystical properties",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400",
        attributes: [
          { trait_type: "Type", value: "Amethyst" },
          { trait_type: "Rarity", value: "Common" },
          { trait_type: "Clarity", value: "High" }
        ],
        blockchain: "polygon",
        rarity: "common",
        collection: "Mystic Minerals"
      }
    },
    maxRedemptions: 200,
    currentRedemptions: 89,
    requiredTier: null,
    isActive: true,
    createdAt: new Date("2024-01-19")
  },
  {
    id: "reward_6",
    tenantId: "sample_tenant",
    programId: "prog_1",
    name: "Epic Cyberpunk Avatar",
    description: "Futuristic cyberpunk character from Neo City",
    pointsCost: 4000,
    rewardType: "nft",
    rewardData: {
      nftMetadata: {
        name: "Neo Cyber #099",
        description: "A cybernetic enhanced character from the year 2099",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400",
        attributes: [
          { trait_type: "Enhancement", value: "Neural Link" },
          { trait_type: "Rarity", value: "Epic" },
          { trait_type: "Tech Level", value: "Advanced" }
        ],
        blockchain: "bsc",
        rarity: "epic",
        collection: "Neo City"
      }
    },
    maxRedemptions: 30,
    currentRedemptions: 12,
    requiredTier: "gold",
    isActive: true,
    createdAt: new Date("2024-01-20")
  }
];