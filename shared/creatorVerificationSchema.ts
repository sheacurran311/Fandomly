import { z } from 'zod';

/**
 * Creator Verification System
 *
 * Defines required fields for creator profile completion and automatic verification.
 * Unlike fan profiles (which earn Fandomly Points), creator verification unlocks
 * platform features and displays a "Verified" badge.
 */

// Required fields for Creator verification
export const CREATOR_VERIFICATION_REQUIREMENTS = {
  // Basic Profile Fields (Always Required)
  basic: [
    'displayName', // Creator/brand name
    'bio', // Tell your story
    'imageUrl', // Profile photo
    'category', // athlete | musician | content_creator
  ],

  // Type-Specific Fields (Required based on creator type)
  athlete: [
    'sport', // Sport played
    'education', // Education level (HS, College, Pro, etc.)
  ],

  musician: [
    'bandArtistName', // Artist/band name
    'musicCatalogUrl', // Link to music (Spotify, Apple Music, etc.)
    'artistType', // independent | signed | hobby
    'musicGenre', // Genre(s)
  ],

  contentCreator: [
    'contentType', // Type of content (video, podcast, gaming, etc.)
    'topicsOfFocus', // Main topics
    'totalViews', // View count range
    'platforms', // Active platforms
  ],

  // Social Media (At least 4 required)
  socialMedia: ['instagram', 'tiktok', 'twitter', 'youtube', 'spotify', 'facebook', 'discord'],
  minSocialAccounts: 4,

  // Platform Activity (Required)
  platformActivity: {
    activeProgram: true, // At least 1 active loyalty program
    publishedTask: true, // At least 1 published task
  },

  // Optional but Recommended
  optional: [
    'brandColors', // Primary, secondary, accent colors
    'bannerImage', // Profile banner
  ],
} as const;

// Zod schema for verification data
export const creatorVerificationDataSchema = z.object({
  profileComplete: z.boolean(),
  requiredFieldsFilled: z.array(z.string()),
  verifiedAt: z.string().optional(),
  verificationMethod: z.enum(['auto', 'manual']).optional(),
  completionPercentage: z.number().min(0).max(100),
  missingFields: z.array(z.string()).optional(),
});

export type CreatorVerificationData = z.infer<typeof creatorVerificationDataSchema>;

// Field display information
export const CREATOR_FIELD_INFO: Record<
  string,
  { label: string; description: string; category: string }
> = {
  // Basic
  displayName: {
    label: 'Creator Name',
    description: 'Your brand or creator name',
    category: 'basic',
  },
  bio: {
    label: 'Bio',
    description: 'Tell your fans about yourself',
    category: 'basic',
  },
  imageUrl: {
    label: 'Profile Photo',
    description: 'Your profile picture',
    category: 'basic',
  },
  category: {
    label: 'Creator Type',
    description: 'Athlete, musician, or content creator',
    category: 'basic',
  },

  // Athlete
  sport: {
    label: 'Sport',
    description: 'Which sport do you play?',
    category: 'athlete',
  },
  education: {
    label: 'Education Level',
    description: 'High school, college, professional, etc.',
    category: 'athlete',
  },
  ageRange: {
    label: 'Age Range',
    description: 'Your age bracket',
    category: 'athlete',
  },
  position: {
    label: 'Position',
    description: 'Position you play',
    category: 'athlete',
  },
  school: {
    label: 'School/Team',
    description: 'Current or former school/team',
    category: 'athlete',
  },
  nilCompliant: {
    label: 'NIL Compliance',
    description: 'Confirm NIL eligibility status',
    category: 'athlete',
  },

  // Musician
  bandArtistName: {
    label: 'Artist/Band Name',
    description: 'Your professional music name',
    category: 'musician',
  },
  musicCatalogUrl: {
    label: 'Music Catalog',
    description: 'Link to your music (Spotify, Apple Music, etc.)',
    category: 'musician',
  },
  artistType: {
    label: 'Artist Type',
    description: 'Independent, signed, or hobby artist',
    category: 'musician',
  },
  musicGenre: {
    label: 'Music Genre',
    description: 'Primary genre(s)',
    category: 'musician',
  },

  // Content Creator
  contentType: {
    label: 'Content Type',
    description: 'What type of content do you create?',
    category: 'contentCreator',
  },
  topicsOfFocus: {
    label: 'Topics',
    description: 'Main topics you cover',
    category: 'contentCreator',
  },
  totalViews: {
    label: 'Total Views',
    description: 'Approximate total view count',
    category: 'contentCreator',
  },
  platforms: {
    label: 'Platforms',
    description: 'Where you create content',
    category: 'contentCreator',
  },

  // Social Media
  instagram: {
    label: 'Instagram',
    description: 'Connect your Instagram',
    category: 'social',
  },
  tiktok: {
    label: 'TikTok',
    description: 'Connect your TikTok',
    category: 'social',
  },
  twitter: {
    label: 'Twitter/X',
    description: 'Connect your Twitter',
    category: 'social',
  },
  youtube: {
    label: 'YouTube',
    description: 'Connect your YouTube',
    category: 'social',
  },
  spotify: {
    label: 'Spotify',
    description: 'Connect your Spotify',
    category: 'social',
  },
  facebook: {
    label: 'Facebook',
    description: 'Connect your Facebook page',
    category: 'social',
  },
  discord: {
    label: 'Discord',
    description: 'Connect your Discord server',
    category: 'social',
  },

  // Platform Activity
  activeProgram: {
    label: 'Active Program',
    description: 'Create at least one active loyalty program',
    category: 'platformActivity',
  },
  publishedTask: {
    label: 'Published Task',
    description: 'Publish at least one task in your program',
    category: 'platformActivity',
  },

  // Optional
  brandColors: {
    label: 'Brand Colors',
    description: 'Customize your profile colors',
    category: 'optional',
  },
  bannerImage: {
    label: 'Banner Image',
    description: 'Profile banner image',
    category: 'optional',
  },
};

/**
 * Platform activity context — passed in from the server layer since
 * this shared module cannot import DB queries directly.
 */
export interface PlatformActivityContext {
  activeProgramCount: number;
  publishedTaskCount: number;
}

/**
 * Calculate creator verification status.
 *
 * Requirements:
 * 1. Full profile (basic + type-specific fields)
 * 2. At least 4 connected social accounts
 * 3. At least 1 active loyalty program
 * 4. At least 1 published task
 */
export function calculateCreatorVerification(
  creator: Record<string, unknown>,
  creatorType: 'athlete' | 'musician' | 'content_creator',
  platformActivity?: PlatformActivityContext
): CreatorVerificationData {
  const requiredFields = [
    ...CREATOR_VERIFICATION_REQUIREMENTS.basic,
    ...CREATOR_VERIFICATION_REQUIREMENTS[
      creatorType === 'content_creator' ? 'contentCreator' : creatorType
    ],
  ];

  const filledFields: string[] = [];
  const missingFields: string[] = [];

  // Check basic + type-specific fields
  requiredFields.forEach((field) => {
    let isFilled = false;

    // Check basic creator fields
    if (['displayName', 'bio', 'imageUrl', 'category'].includes(field)) {
      isFilled = !!creator[field];
    }

    // Check type-specific data
    else if (creator.typeSpecificData) {
      const typeSpecificData = creator.typeSpecificData as Record<string, Record<string, unknown>>;
      const typeData =
        typeSpecificData[creatorType === 'content_creator' ? 'contentCreator' : creatorType];
      if (typeData && typeData[field] !== undefined && typeData[field] !== null) {
        // For arrays, check if not empty
        if (Array.isArray(typeData[field])) {
          isFilled = (typeData[field] as unknown[]).length > 0;
        } else {
          isFilled = true;
        }
      }
    }

    if (isFilled) {
      filledFields.push(field);
    } else {
      missingFields.push(field);
    }
  });

  // Check social media (at least 4 required)
  const socialMediaFields = CREATOR_VERIFICATION_REQUIREMENTS.socialMedia;
  const minSocial = CREATOR_VERIFICATION_REQUIREMENTS.minSocialAccounts;
  const socialLinks = creator.socialLinks as Record<string, unknown> | undefined;
  const connectedSocial = socialMediaFields.filter((social) => {
    return socialLinks?.[social];
  });

  if (connectedSocial.length >= minSocial) {
    filledFields.push('socialMedia');
  } else {
    const remaining = minSocial - connectedSocial.length;
    missingFields.push(
      `socialMedia (${remaining} more account${remaining !== 1 ? 's' : ''} needed, ${connectedSocial.length}/${minSocial} connected)`
    );
  }

  // Check platform activity: active program
  const programCount = platformActivity?.activeProgramCount ?? 0;
  if (programCount > 0) {
    filledFields.push('activeProgram');
  } else {
    missingFields.push('activeProgram');
  }

  // Check platform activity: published task
  const taskCount = platformActivity?.publishedTaskCount ?? 0;
  if (taskCount > 0) {
    filledFields.push('publishedTask');
  } else {
    missingFields.push('publishedTask');
  }

  // +1 social media + 2 platform activity requirements
  const totalRequired = requiredFields.length + 3;
  const completionPercentage = Math.round((filledFields.length / totalRequired) * 100);
  const profileComplete = missingFields.length === 0;

  return {
    profileComplete,
    requiredFieldsFilled: filledFields,
    completionPercentage,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
    verifiedAt: profileComplete ? new Date().toISOString() : undefined,
    verificationMethod: profileComplete ? 'auto' : undefined,
  };
}

/**
 * Get human-readable missing fields list
 */
export function getMissingFieldsDisplay(missingFields: string[]): string[] {
  return missingFields.map((field) => {
    const info = CREATOR_FIELD_INFO[field];
    return info ? info.label : field;
  });
}
