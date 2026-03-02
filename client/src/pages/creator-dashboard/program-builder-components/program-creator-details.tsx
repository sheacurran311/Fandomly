import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  topicsOfFocus?: string[] | string;
  platforms?: string[] | string;
  sponsorships?: string;
}

interface CreatorDetails {
  athlete?: AthleteDetails;
  musician?: MusicianDetails;
  contentCreator?: ContentCreatorDetails;
}

interface ProgramCreatorDetailsProps {
  creatorType: CreatorType;
  location: string;
  creatorDetails: CreatorDetails;
  onLocationChange: (location: string) => void;
  onCreatorDetailsChange: (details: CreatorDetails) => void;
}

export function ProgramCreatorDetails({
  creatorType,
  location,
  creatorDetails,
  onLocationChange,
  onCreatorDetailsChange,
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
              <Input
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
                placeholder="e.g., Basketball, Football"
                className="bg-white/10 border-white/20 text-white"
              />
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
                className="w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3"
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
                className="w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3"
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
            <Label className="text-white">Platforms</Label>
            <Input
              value={
                Array.isArray((creatorDetails?.contentCreator as ContentCreatorDetails)?.platforms)
                  ? (creatorDetails?.contentCreator as { platforms: string[] }).platforms.join(', ')
                  : String(
                      (creatorDetails?.contentCreator as ContentCreatorDetails)?.platforms ?? ''
                    )
              }
              onChange={(e) =>
                onCreatorDetailsChange({
                  ...creatorDetails,
                  contentCreator: {
                    ...(creatorDetails?.contentCreator ?? {}),
                    platforms: e.target.value.split(',').map((s: string) => s.trim()),
                  },
                })
              }
              onBlur={(e) =>
                onCreatorDetailsChange({
                  ...creatorDetails,
                  contentCreator: {
                    ...(creatorDetails?.contentCreator ?? {}),
                    platforms: e.target.value
                      .split(',')
                      .map((s: string) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
              placeholder="e.g., YouTube, TikTok, Twitch (comma separated)"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Sponsorships</Label>
            <Input
              value={String(
                (creatorDetails?.contentCreator as ContentCreatorDetails)?.sponsorships ?? ''
              )}
              onChange={(e) =>
                onCreatorDetailsChange({
                  ...creatorDetails,
                  contentCreator: {
                    ...(creatorDetails?.contentCreator ?? {}),
                    sponsorships: e.target.value,
                  },
                })
              }
              placeholder="Current brand partnerships"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
