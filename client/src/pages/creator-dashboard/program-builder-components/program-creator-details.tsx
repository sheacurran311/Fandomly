import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin } from 'lucide-react';

type CreatorType = 'athlete' | 'musician' | 'content_creator';

interface AthleteDetails {
  sport?: string;
  position?: string;
  school?: string;
  education?: {
    level?: string;
  };
  currentSponsors?: string;
}

interface MusicianDetails {
  bandArtistName?: string;
  artistType?: string;
  musicGenre?: string;
  musicCatalogUrl?: string;
}

interface ContentCreatorDetails {
  aboutMe?: string;
  contentType?: string[];
  topicsOfFocus?: string[] | string;
  mainContentPlatforms?: string[] | string;
}

const CONTENT_TYPES = [
  'Creative Video',
  'Podcast',
  'Influencer',
  'Gaming',
  'Educational',
  'Comedy',
  'Lifestyle',
  'Fashion',
  'Beauty',
  'Fitness',
  'Food',
  'Travel',
  'Technology',
];

interface ProgramCreatorDetailsProps {
  creatorType: CreatorType;
  location: string;
  creatorDetails: CreatorDetails;
  onLocationChange: (location: string) => void;
  onCreatorDetailsChange: (details: CreatorDetails) => void;
  /** Connected platform IDs from social integrations (e.g. instagram, tiktok, twitter) - used to auto-select Main Content Platforms */
  connectedPlatformIds?: string[];
}

interface CreatorDetails {
  athlete?: AthleteDetails;
  musician?: MusicianDetails;
  contentCreator?: ContentCreatorDetails;
}

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  spotify: 'Spotify',
  discord: 'Discord',
  twitch: 'Twitch',
};

export function ProgramCreatorDetails({
  creatorType,
  location,
  creatorDetails,
  onLocationChange,
  onCreatorDetailsChange,
  connectedPlatformIds = [],
}: ProgramCreatorDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Location */}
      <div className="space-y-2">
        <Label className="text-white flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-primary" />
          Location
        </Label>
        <Input
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="e.g., Los Angeles, CA"
          className="bg-white/10 border-white/20 text-white"
        />
      </div>

      {/* Athlete-specific fields */}
      {creatorType === 'athlete' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Sport</Label>
              <select
                value={String((creatorDetails?.athlete as AthleteDetails)?.sport ?? '')}
                onChange={(e) =>
                  onCreatorDetailsChange({
                    ...creatorDetails,
                    athlete: {
                      ...(creatorDetails?.athlete ?? {}),
                      sport: e.target.value,
                    },
                  })
                }
                className="w-full h-10 rounded-md bg-[#1a1a2e] border border-white/20 text-white px-3 [&>option]:bg-[#1a1a2e] [&>option]:text-white"
              >
                <option value="">Select sport</option>
                <option value="Basketball">Basketball</option>
                <option value="Football">Football</option>
                <option value="Soccer">Soccer</option>
                <option value="Baseball">Baseball</option>
                <option value="Softball">Softball</option>
                <option value="Track & Field">Track &amp; Field</option>
                <option value="Swimming">Swimming</option>
                <option value="Tennis">Tennis</option>
                <option value="Golf">Golf</option>
                <option value="Volleyball">Volleyball</option>
                <option value="Wrestling">Wrestling</option>
                <option value="Lacrosse">Lacrosse</option>
                <option value="Hockey">Hockey</option>
                <option value="Gymnastics">Gymnastics</option>
                <option value="Cross Country">Cross Country</option>
                <option value="Boxing">Boxing</option>
                <option value="MMA">MMA</option>
                <option value="Rowing">Rowing</option>
                <option value="Cycling">Cycling</option>
                <option value="Skiing">Skiing</option>
                <option value="Snowboarding">Snowboarding</option>
                <option value="Surfing">Surfing</option>
                <option value="Skateboarding">Skateboarding</option>
                <option value="Cheerleading">Cheerleading</option>
                <option value="Esports">Esports</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Position</Label>
              <Input
                value={String((creatorDetails?.athlete as AthleteDetails)?.position ?? '')}
                onChange={(e) =>
                  onCreatorDetailsChange({
                    ...creatorDetails,
                    athlete: {
                      ...(creatorDetails?.athlete ?? {}),
                      position: e.target.value,
                    },
                  })
                }
                placeholder="e.g., Point Guard, Quarterback"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">School</Label>
              <Input
                value={String((creatorDetails?.athlete as AthleteDetails)?.school ?? '')}
                onChange={(e) =>
                  onCreatorDetailsChange({
                    ...creatorDetails,
                    athlete: {
                      ...(creatorDetails?.athlete ?? {}),
                      school: e.target.value,
                    },
                  })
                }
                placeholder="e.g., Ohio State University"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Education Level</Label>
              <select
                value={String((creatorDetails?.athlete as AthleteDetails)?.education?.level ?? '')}
                onChange={(e) =>
                  onCreatorDetailsChange({
                    ...creatorDetails,
                    athlete: {
                      ...(creatorDetails?.athlete ?? {}),
                      education: {
                        ...(creatorDetails?.athlete?.education ?? {}),
                        level: e.target.value,
                      },
                    },
                  })
                }
                className="w-full h-10 rounded-md bg-[#1a1a2e] border border-white/20 text-white px-3 [&>option]:bg-[#1a1a2e] [&>option]:text-white"
              >
                <option value="">Select level</option>
                <option value="high_school">High School</option>
                <option value="college_d1">College D1</option>
                <option value="college_d2">College D2</option>
                <option value="college_d3">College D3</option>
                <option value="professional">Professional</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-white">Current Sponsors</Label>
            <Input
              value={String((creatorDetails?.athlete as AthleteDetails)?.currentSponsors ?? '')}
              onChange={(e) =>
                onCreatorDetailsChange({
                  ...creatorDetails,
                  athlete: {
                    ...(creatorDetails?.athlete ?? {}),
                    currentSponsors: e.target.value,
                  },
                })
              }
              placeholder="e.g., Nike, Gatorade (comma separated)"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>
      )}

      {/* Musician-specific fields */}
      {creatorType === 'musician' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Band / Artist Name</Label>
              <Input
                value={String((creatorDetails?.musician as MusicianDetails)?.bandArtistName ?? '')}
                onChange={(e) =>
                  onCreatorDetailsChange({
                    ...creatorDetails,
                    musician: {
                      ...(creatorDetails?.musician ?? {}),
                      bandArtistName: e.target.value,
                    },
                  })
                }
                placeholder="Your stage name or band name"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Artist Type</Label>
              <select
                value={String((creatorDetails?.musician as MusicianDetails)?.artistType ?? '')}
                onChange={(e) =>
                  onCreatorDetailsChange({
                    ...creatorDetails,
                    musician: {
                      ...(creatorDetails?.musician ?? {}),
                      artistType: e.target.value,
                    },
                  })
                }
                className="w-full h-10 rounded-md bg-[#1a1a2e] border border-white/20 text-white px-3 [&>option]:bg-[#1a1a2e] [&>option]:text-white"
              >
                <option value="">Select type</option>
                <option value="independent">Independent</option>
                <option value="signed">Signed</option>
                <option value="hobby">Hobby</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Music Genre</Label>
              <Input
                value={String((creatorDetails?.musician as MusicianDetails)?.musicGenre ?? '')}
                onChange={(e) =>
                  onCreatorDetailsChange({
                    ...creatorDetails,
                    musician: {
                      ...(creatorDetails?.musician ?? {}),
                      musicGenre: e.target.value,
                    },
                  })
                }
                placeholder="e.g., Hip Hop, Pop, Rock"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Music Catalog URL</Label>
              <Input
                value={String((creatorDetails?.musician as MusicianDetails)?.musicCatalogUrl ?? '')}
                onChange={(e) =>
                  onCreatorDetailsChange({
                    ...creatorDetails,
                    musician: {
                      ...(creatorDetails?.musician ?? {}),
                      musicCatalogUrl: e.target.value,
                    },
                  })
                }
                placeholder="Spotify, Apple Music, or SoundCloud link"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content Creator-specific fields */}
      {creatorType === 'content_creator' && (
        <div className="space-y-4">
          <ContentTypeSelector
            contentTypes={
              (creatorDetails?.contentCreator as ContentCreatorDetails)?.contentType ?? []
            }
            onChange={(next) =>
              onCreatorDetailsChange({
                ...creatorDetails,
                contentCreator: {
                  ...(creatorDetails?.contentCreator ?? {}),
                  contentType: next,
                },
              })
            }
          />
          <div className="space-y-2">
            <Label className="text-white">Bio / Description / About Me</Label>
            <Textarea
              value={String(
                (creatorDetails?.contentCreator as ContentCreatorDetails)?.aboutMe ?? ''
              )}
              onChange={(e) =>
                onCreatorDetailsChange({
                  ...creatorDetails,
                  contentCreator: {
                    ...(creatorDetails?.contentCreator ?? {}),
                    aboutMe: e.target.value,
                  },
                })
              }
              placeholder="Tell fans about yourself..."
              rows={4}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Topics of Focus</Label>
            <Input
              value={
                Array.isArray(
                  (creatorDetails?.contentCreator as ContentCreatorDetails)?.topicsOfFocus
                )
                  ? (
                      creatorDetails?.contentCreator as { topicsOfFocus: string[] }
                    ).topicsOfFocus.join(', ')
                  : String(
                      (creatorDetails?.contentCreator as ContentCreatorDetails)?.topicsOfFocus ?? ''
                    )
              }
              onChange={(e) =>
                onCreatorDetailsChange({
                  ...creatorDetails,
                  contentCreator: {
                    ...(creatorDetails?.contentCreator ?? {}),
                    topicsOfFocus: e.target.value.split(',').map((s: string) => s.trim()),
                  },
                })
              }
              onBlur={(e) =>
                onCreatorDetailsChange({
                  ...creatorDetails,
                  contentCreator: {
                    ...(creatorDetails?.contentCreator ?? {}),
                    topicsOfFocus: e.target.value
                      .split(',')
                      .map((s: string) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
              placeholder="e.g., Gaming, Tech Reviews, Fitness (comma separated)"
              className="bg-white/10 border-white/20 text-white"
            />
            <p className="text-xs text-gray-400">Separate topics with commas</p>
          </div>
          <div className="space-y-2">
            <Label className="text-white">Main Content Platforms</Label>
            <p className="text-xs text-gray-400">Auto-selected from your connected integrations</p>
            <div className="flex flex-wrap gap-2">
              {connectedPlatformIds.length > 0 ? (
                connectedPlatformIds.map((platformId) => (
                  <span
                    key={platformId}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-brand-primary/20 text-brand-primary border border-brand-primary/30"
                  >
                    {PLATFORM_LABELS[platformId] || platformId}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">
                  Connect platforms in the Social section above
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const OTHER_PREFIX = 'Other: ';

function ContentTypeSelector({
  contentTypes: selected,
  onChange,
}: {
  contentTypes: string[];
  onChange: (next: string[]) => void;
}) {
  const selectedArr = Array.isArray(selected) ? selected : [];
  const otherEntry = selectedArr.find((t) => t.startsWith(OTHER_PREFIX));
  const hasOther = selectedArr.includes('Other') || !!otherEntry;
  const [otherText, setOtherText] = useState(
    otherEntry ? otherEntry.slice(OTHER_PREFIX.length) : ''
  );

  const toggleType = (type: string) => {
    if (type === 'Other') {
      if (hasOther) {
        // Remove "Other" and any "Other: ..." entries
        onChange(selectedArr.filter((t) => t !== 'Other' && !t.startsWith(OTHER_PREFIX)));
        setOtherText('');
      } else {
        onChange([...selectedArr, 'Other']);
      }
      return;
    }
    const isSelected = selectedArr.includes(type);
    onChange(isSelected ? selectedArr.filter((t) => t !== type) : [...selectedArr, type]);
  };

  const handleOtherTextChange = (text: string) => {
    setOtherText(text);
    // Replace any existing Other/Other: entries with the new value
    const withoutOther = selectedArr.filter((t) => t !== 'Other' && !t.startsWith(OTHER_PREFIX));
    if (text.trim()) {
      onChange([...withoutOther, `${OTHER_PREFIX}${text.trim()}`]);
    } else {
      onChange([...withoutOther, 'Other']);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-white">Content Type</Label>
      <p className="text-xs text-gray-400">What type of content do you create?</p>
      <div className="flex flex-wrap gap-2">
        {CONTENT_TYPES.map((type) => {
          const isSelected = selectedArr.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-brand-primary text-white border-2 border-brand-primary'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              {type}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => toggleType('Other')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            hasOther
              ? 'bg-brand-primary text-white border-2 border-brand-primary'
              : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
          }`}
        >
          Other
        </button>
      </div>
      {hasOther && (
        <Input
          value={otherText}
          onChange={(e) => handleOtherTextChange(e.target.value)}
          placeholder="Describe your content type..."
          className="bg-white/10 border-white/20 text-white mt-2"
        />
      )}
    </div>
  );
}
