/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useSocialConnections } from '@/hooks/use-social-connections';
import { ImageUpload } from '@/components/ui/image-upload';
import { LocationPicker } from '@/components/ui/location-picker';
import { PersonalLinksInput } from '@/components/ui/personal-links-input';
import { StarRating } from '@/components/ui/star-rating';
import { Save, X, User as UserIcon, MapPin, Trophy, Music, Video } from 'lucide-react';
import type { User, Creator } from '@shared/schema';

interface CreatorProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  creator?: Creator;
}

const topSports = [
  'American Football',
  'Basketball',
  'Baseball',
  'Soccer',
  'Tennis',
  'Golf',
  'Swimming',
  'Track & Field',
  'Wrestling',
  'Gymnastics',
  'Volleyball',
  'Softball',
  'Hockey',
  'Lacrosse',
  'Cross Country',
  'Skiing',
];

const collegeCommitmentOptions = [
  'Committed',
  'Signed',
  'Enrolled',
  'Interested',
  'Contacted',
  'Offered',
];

const educationLevels = [
  { value: 'middle_school', label: 'Middle School' },
  { value: 'high_school', label: 'High School' },
  { value: 'junior_college', label: 'Junior College' },
  { value: 'college_d1', label: 'College - Division I' },
  { value: 'college_d2', label: 'College - Division II' },
  { value: 'college_d3', label: 'College - Division III' },
  { value: 'professional', label: 'Professional' },
];

const musicGenres = [
  'Pop',
  'Rock',
  'Hip-Hop',
  'R&B',
  'Country',
  'Electronic',
  'Jazz',
  'Classical',
  'Alternative',
  'Indie',
  'Folk',
  'Blues',
  'Reggae',
  'Latin',
  'Metal',
];

const contentTypes = [
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

export default function CreatorProfileEditModal({
  isOpen,
  onClose,
  user,
  creator,
}: CreatorProfileEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connections } = useSocialConnections();
  const mainContentPlatformIds = connections.map((c) => c.platform).filter(Boolean);

  // Fetch the creator's program (the fan-facing "profile")
  const { data: programs } = useQuery<any[]>({
    queryKey: ['/api/programs'],
    enabled: isOpen && !!creator,
  });

  // The creator's primary program
  const program = programs?.[0];
  const pageConfig = program?.pageConfig as any;

  const [formData, setFormData] = useState({
    // Basic Info
    displayName: '',
    bio: '',
    location: '',
    bannerImage: '',
    avatar: '',

    // Athlete Fields
    sport: '',
    position: '',
    education: '',
    grade: '',
    school: '',
    graduatingClass: '',
    currentSponsors: '',
    personalLinks: [] as string[],
    rivalsScore: '',
    espnScoutGrade: '',
    rating247: '',
    collegeCommitmentStatus: '',

    // Musician Fields
    musicGenre: [] as string[],
    artistType: '',
    bandArtistName: '',
    musicCatalogUrl: '',

    // Content Creator Fields
    contentType: [] as string[],
    aboutMe: '',
    topicsOfFocus: '',

    // Brand Colors (from program.pageConfig)
    brandColors: {
      primary: '#E10698',
      secondary: '#14FEEE',
      accent: '#FFFFFF',
    },

    // Visibility Toggles (from program.pageConfig.visibility.profileData)
    visibility: {
      showLocation: true,
      showBio: true,
      showSocialLinks: true,
      showVerificationBadge: true,
    },
  });

  // Load existing data when modal opens
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isOpen && user) {
      const typeSpecificData = creator?.typeSpecificData as any;

      setFormData({
        displayName: program?.name || creator?.displayName || user.profileData?.name || '',
        bio: program?.description || creator?.bio || user.profileData?.bio || '',
        location: pageConfig?.location || user.profileData?.location || '',
        bannerImage: pageConfig?.headerImage || user.profileData?.bannerImage || '',
        avatar: pageConfig?.logo || user.profileData?.avatar || '',

        // Athlete
        sport: typeSpecificData?.athlete?.sport || user.profileData?.sport || '',
        position: typeSpecificData?.athlete?.position || user.profileData?.position || '',
        education:
          typeSpecificData?.athlete?.education?.level || user.profileData?.education?.level || '',
        grade:
          typeSpecificData?.athlete?.education?.grade || user.profileData?.education?.grade || '',
        school:
          typeSpecificData?.athlete?.education?.school || user.profileData?.education?.school || '',
        graduatingClass:
          typeSpecificData?.athlete?.graduatingClass?.toString() ||
          user.profileData?.education?.graduationYear?.toString() ||
          '',
        currentSponsors: typeSpecificData?.athlete?.currentSponsors?.join(', ') || '',
        personalLinks: typeSpecificData?.athlete?.personalLinks || [],
        rivalsScore: typeSpecificData?.athlete?.rivalsScore?.toString() || '',
        espnScoutGrade: typeSpecificData?.athlete?.espnScoutGrade?.toString() || '',
        rating247: typeSpecificData?.athlete?.rating247?.toString() || '',
        collegeCommitmentStatus: typeSpecificData?.athlete?.collegeCommitmentStatus || '',

        // Musician
        musicGenre: typeSpecificData?.musician?.musicGenre || user.profileData?.musicGenre || [],
        artistType: typeSpecificData?.musician?.artistType || user.profileData?.artistType || '',
        bandArtistName: typeSpecificData?.musician?.bandArtistName || '',
        musicCatalogUrl: typeSpecificData?.musician?.musicCatalogUrl || '',

        // Content Creator (merge from creator typeSpecificData and program pageConfig.creatorDetails)
        contentType:
          typeSpecificData?.contentCreator?.contentType ||
          pageConfig?.creatorDetails?.contentCreator?.contentType ||
          user.profileData?.contentType ||
          [],
        aboutMe:
          typeSpecificData?.contentCreator?.aboutMe ||
          pageConfig?.creatorDetails?.contentCreator?.aboutMe ||
          program?.description ||
          creator?.bio ||
          '',
        topicsOfFocus: (() => {
          const fromCreator = typeSpecificData?.contentCreator?.topicsOfFocus;
          const fromProgram = pageConfig?.creatorDetails?.contentCreator?.topicsOfFocus;
          const arr = Array.isArray(fromCreator)
            ? fromCreator
            : Array.isArray(fromProgram)
              ? fromProgram
              : undefined;
          return arr
            ? arr.join(', ')
            : (typeof fromCreator === 'string'
                ? fromCreator
                : typeof fromProgram === 'string'
                  ? fromProgram
                  : '') || '';
        })(),

        // Brand Colors from program pageConfig
        brandColors: pageConfig?.brandColors || {
          primary: '#E10698',
          secondary: '#14FEEE',
          accent: '#FFFFFF',
        },

        // Visibility from program pageConfig
        visibility: pageConfig?.visibility?.profileData || {
          showLocation: true,
          showBio: true,
          showSocialLinks: true,
          showVerificationBadge: true,
        },
      });
    }
  }, [isOpen, user, creator, program, pageConfig]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Update user profile data
      await apiRequest('POST', '/api/auth/profile', {
        userId: user.id,
        profileData: {
          name: data.displayName,
          bio: data.bio,
          location: data.location,
          avatar: data.avatar,
          sport: data.sport,
          position: data.position,
          education: data.education
            ? {
                level: data.education,
                grade: data.grade,
                school: data.school,
                graduatingClass: data.graduatingClass ? parseInt(data.graduatingClass) : undefined,
              }
            : undefined,
          musicGenre: data.musicGenre,
          artistType: data.artistType,
          contentType: data.contentType,
        },
      });

      // Update creator-specific data if creator exists
      if (creator) {
        const creatorType = creator.category;
        let typeSpecificData = {};

        if (creatorType === 'athlete') {
          typeSpecificData = {
            athlete: {
              sport: data.sport,
              position: data.position,
              education: {
                level: data.education,
                grade: data.grade,
                school: data.school,
              },
              graduatingClass: data.graduatingClass ? parseInt(data.graduatingClass) : undefined,
              currentSponsors: data.currentSponsors
                ? data.currentSponsors.split(',').map((s: string) => s.trim())
                : [],
              personalLinks: data.personalLinks,
              rivalsScore: data.rivalsScore ? parseFloat(data.rivalsScore) : undefined,
              espnScoutGrade: data.espnScoutGrade ? parseFloat(data.espnScoutGrade) : undefined,
              rating247: data.rating247 ? parseFloat(data.rating247) : undefined,
              collegeCommitmentStatus: data.collegeCommitmentStatus || undefined,
            },
          };
        } else if (creatorType === 'musician') {
          typeSpecificData = {
            musician: {
              musicGenre: data.musicGenre,
              artistType: data.artistType,
              bandArtistName: data.bandArtistName,
              musicCatalogUrl: data.musicCatalogUrl,
            },
          };
        } else if (creatorType === 'content_creator') {
          typeSpecificData = {
            contentCreator: {
              aboutMe: data.aboutMe,
              contentType: data.contentType,
              topicsOfFocus: data.topicsOfFocus
                ? data.topicsOfFocus.split(',').map((t: string) => t.trim())
                : [],
              mainContentPlatforms: mainContentPlatformIds,
            },
          };
        }

        await apiRequest('PUT', `/api/creators/${creator.id}`, {
          displayName: data.displayName,
          bio: data.bio,
          imageUrl: data.avatar,
          typeSpecificData,
        });
      }

      // Update program (the fan-facing profile) with pageConfig data
      if (program?.id) {
        const programDescription =
          creator?.category === 'content_creator' ? data.aboutMe : data.bio;
        const creatorDetails =
          creator?.category === 'content_creator'
            ? {
                ...(pageConfig?.creatorDetails ?? {}),
                contentCreator: {
                  aboutMe: data.aboutMe,
                  contentType: data.contentType,
                  topicsOfFocus: data.topicsOfFocus
                    ? data.topicsOfFocus.split(',').map((t: string) => t.trim())
                    : [],
                  mainContentPlatforms: mainContentPlatformIds,
                },
              }
            : pageConfig?.creatorDetails;
        await apiRequest('PUT', `/api/programs/${program.id}`, {
          name: data.displayName,
          description: programDescription,
          pageConfig: {
            ...pageConfig,
            headerImage: data.bannerImage,
            logo: data.avatar,
            location: data.location,
            creatorDetails,
            brandColors: data.brandColors,
            visibility: {
              ...pageConfig?.visibility,
              profileData: data.visibility,
            },
          },
        });
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });

      // Trigger verification check after profile update
      try {
        await apiRequest('POST', '/api/creator-verification/check', {});
        queryClient.invalidateQueries({ queryKey: ['/api/creator-verification/status'] });
      } catch (error) {
        console.error('Verification check failed:', error);
      }

      toast({
        title: 'Profile Updated!',
        description: 'Your creator profile has been successfully updated.',
        duration: 3000,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVisibilityToggle = (field: string) => {
    setFormData((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [field]: !(prev.visibility as any)[field],
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const creatorType =
    creator?.category || (user.profileData as { creatorType?: string })?.creatorType;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl flex items-center gap-2">
            <UserIcon className="h-6 w-6" />
            Edit Creator Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center justify-between">
              Basic Information
              <Badge variant="outline" className="text-xs">
                {creator?.isVerified ? 'Verified' : 'Pending Verification'}
              </Badge>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName" className="text-gray-300">
                  Display Name *
                </Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Your display name"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-300 flex items-center">
                    <MapPin className="inline mr-1 h-4 w-4" />
                    Location
                  </Label>
                  <Switch
                    checked={formData.visibility.showLocation}
                    onCheckedChange={() => handleVisibilityToggle('showLocation')}
                    className="scale-75"
                  />
                </div>
                <LocationPicker
                  value={formData.location}
                  onChange={(location) => handleInputChange('location', location)}
                  label=""
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio" className="text-gray-300 flex items-center justify-between">
                <span>Bio</span>
                <Switch
                  checked={formData.visibility.showBio}
                  onCheckedChange={() => handleVisibilityToggle('showBio')}
                  className="scale-75"
                />
              </Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Tell your fans about yourself..."
                rows={3}
              />
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Profile Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Profile Images</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 mb-2 block">Profile Photo</Label>
                <ImageUpload
                  type="avatar"
                  currentImageUrl={formData.avatar}
                  onUploadSuccess={(url) => handleInputChange('avatar', url)}
                />
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Banner Image</Label>
                <ImageUpload
                  type="banner"
                  currentImageUrl={formData.bannerImage}
                  onUploadSuccess={(url) => handleInputChange('bannerImage', url)}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Type-Specific Fields */}
          {creatorType === 'athlete' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Athlete Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sport" className="text-gray-300">
                    <span>Sport *</span>
                  </Label>
                  <Select
                    value={formData.sport}
                    onValueChange={(value) => handleInputChange('sport', value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {topSports.map((sport) => (
                        <SelectItem key={sport} value={sport}>
                          {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="position" className="text-gray-300">
                    Position
                  </Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="e.g., Point Guard"
                  />
                </div>

                <div>
                  <Label htmlFor="education" className="text-gray-300">
                    <span>Education Level</span>
                  </Label>
                  <Select
                    value={formData.education}
                    onValueChange={(value) => handleInputChange('education', value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="grade" className="text-gray-300">
                    Grade/Year
                  </Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => handleInputChange('grade', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="e.g., Freshman"
                  />
                </div>

                <div>
                  <Label htmlFor="school" className="text-gray-300">
                    Current School/College/Institution
                  </Label>
                  <Input
                    id="school"
                    value={formData.school}
                    onChange={(e) => handleInputChange('school', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="University of Oklahoma, St. John Bosco..."
                  />
                </div>

                <div>
                  <Label htmlFor="graduatingClass" className="text-gray-300">
                    Graduating Class
                  </Label>
                  <Input
                    id="graduatingClass"
                    type="number"
                    value={formData.graduatingClass}
                    onChange={(e) => handleInputChange('graduatingClass', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="2025"
                    min={new Date().getFullYear()}
                    max={new Date().getFullYear() + 10}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-gray-300">College Commitment Status</Label>
                  <Select
                    value={formData.collegeCommitmentStatus}
                    onValueChange={(value) => handleInputChange('collegeCommitmentStatus', value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select status (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {collegeCommitmentOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="currentSponsors" className="text-gray-300">
                  Current Sponsors
                </Label>
                <Input
                  id="currentSponsors"
                  value={formData.currentSponsors}
                  onChange={(e) => handleInputChange('currentSponsors', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="List sponsors separated by commas"
                />
                <p className="text-xs text-gray-500 mt-1">e.g., Nike, Gatorade, Under Armour</p>
              </div>

              {/* Recruiting Metrics */}
              <div className="space-y-4 p-4 bg-white/5 rounded-lg">
                <h4 className="text-white font-semibold">Recruiting Metrics (Optional)</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="rivalsScore" className="text-gray-300">
                      Rivals Score
                    </Label>
                    <Input
                      id="rivalsScore"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.rivalsScore}
                      onChange={(e) => handleInputChange('rivalsScore', e.target.value)}
                      placeholder="0-100"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    {formData.rivalsScore && (
                      <div className="mt-2">
                        <StarRating score={parseFloat(formData.rivalsScore)} />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="espnScoutGrade" className="text-gray-300">
                      ESPN Scout Grade
                    </Label>
                    <Input
                      id="espnScoutGrade"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.espnScoutGrade}
                      onChange={(e) => handleInputChange('espnScoutGrade', e.target.value)}
                      placeholder="0-100"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    {formData.espnScoutGrade && (
                      <div className="mt-2">
                        <StarRating score={parseFloat(formData.espnScoutGrade)} />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="rating247" className="text-gray-300">
                      247 Rating
                    </Label>
                    <Input
                      id="rating247"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.rating247}
                      onChange={(e) => handleInputChange('rating247', e.target.value)}
                      placeholder="0-100"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    {formData.rating247 && (
                      <div className="mt-2">
                        <StarRating score={parseFloat(formData.rating247)} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Links */}
              <PersonalLinksInput
                value={formData.personalLinks}
                onChange={(links) => handleInputChange('personalLinks', links)}
              />
            </div>
          )}

          {creatorType === 'musician' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Music className="h-5 w-5" />
                Musician Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bandArtistName" className="text-gray-300">
                    Band/Artist Name
                  </Label>
                  <Input
                    id="bandArtistName"
                    value={formData.bandArtistName}
                    onChange={(e) => handleInputChange('bandArtistName', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Your stage name"
                  />
                </div>

                <div>
                  <Label htmlFor="artistType" className="text-gray-300">
                    Artist Type
                  </Label>
                  <Select
                    value={formData.artistType}
                    onValueChange={(value) => handleInputChange('artistType', value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="independent">Independent Artist</SelectItem>
                      <SelectItem value="signed">Signed to Label</SelectItem>
                      <SelectItem value="hobby">Hobby/Amateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Music Genres</Label>
                <div className="flex flex-wrap gap-2">
                  {musicGenres.map((genre) => (
                    <Badge
                      key={genre}
                      variant={formData.musicGenre.includes(genre) ? 'default' : 'outline'}
                      className={`cursor-pointer ${
                        formData.musicGenre.includes(genre)
                          ? 'bg-brand-primary hover:bg-brand-primary/80'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                      onClick={() => {
                        const genres = formData.musicGenre.includes(genre)
                          ? formData.musicGenre.filter((g) => g !== genre)
                          : [...formData.musicGenre, genre];
                        handleInputChange('musicGenre', genres);
                      }}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="musicCatalogUrl" className="text-gray-300">
                  Music Catalog URL
                </Label>
                <Input
                  id="musicCatalogUrl"
                  value={formData.musicCatalogUrl}
                  onChange={(e) => handleInputChange('musicCatalogUrl', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Link to Spotify, Apple Music, SoundCloud, etc."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your music streaming profile or website
                </p>
              </div>
            </div>
          )}

          {creatorType === 'content_creator' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Video className="h-5 w-5" />
                Content Creator Information
              </h3>

              <SettingsContentTypeSelector
                contentTypes={Array.isArray(formData.contentType) ? formData.contentType : []}
                onChange={(next) => handleInputChange('contentType', next)}
              />

              <div>
                <Label htmlFor="aboutMe" className="text-gray-300">
                  Bio / Description / About Me
                </Label>
                <Textarea
                  id="aboutMe"
                  value={formData.aboutMe}
                  onChange={(e) => handleInputChange('aboutMe', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Tell fans about yourself..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="topicsOfFocus" className="text-gray-300">
                  Topics of Focus
                </Label>
                <Input
                  id="topicsOfFocus"
                  value={formData.topicsOfFocus}
                  onChange={(e) => handleInputChange('topicsOfFocus', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Topics separated by commas"
                />
                <p className="text-xs text-gray-500 mt-1">e.g., Gaming, Cooking, Travel</p>
              </div>

              <div>
                <Label className="text-gray-300">Main Content Platforms</Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  Auto-selected from your connected integrations (X, Instagram, TikTok, YouTube,
                  etc.)
                </p>
                {mainContentPlatformIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {mainContentPlatformIds.map((platformId) => (
                      <Badge
                        key={platformId}
                        variant="secondary"
                        className="bg-brand-primary/20 text-brand-primary"
                      >
                        {platformId === 'twitter'
                          ? 'X'
                          : platformId.charAt(0).toUpperCase() + platformId.slice(1)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Connect platforms in Settings → Social to see them here.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              disabled={updateProfile.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary/80"
              disabled={updateProfile.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const OTHER_PREFIX = 'Other: ';

function SettingsContentTypeSelector({
  contentTypes: selected,
  onChange,
}: {
  contentTypes: string[];
  onChange: (next: string[]) => void;
}) {
  const otherEntry = selected.find((t) => t.startsWith(OTHER_PREFIX));
  const hasOther = selected.includes('Other') || !!otherEntry;
  const [otherText, setOtherText] = useState(
    otherEntry ? otherEntry.slice(OTHER_PREFIX.length) : ''
  );

  const toggleType = (type: string) => {
    if (type === 'Other') {
      if (hasOther) {
        onChange(selected.filter((t) => t !== 'Other' && !t.startsWith(OTHER_PREFIX)));
        setOtherText('');
      } else {
        onChange([...selected, 'Other']);
      }
      return;
    }
    const isSelected = selected.includes(type);
    onChange(isSelected ? selected.filter((t) => t !== type) : [...selected, type]);
  };

  const handleOtherTextChange = (text: string) => {
    setOtherText(text);
    const withoutOther = selected.filter((t) => t !== 'Other' && !t.startsWith(OTHER_PREFIX));
    if (text.trim()) {
      onChange([...withoutOther, `${OTHER_PREFIX}${text.trim()}`]);
    } else {
      onChange([...withoutOther, 'Other']);
    }
  };

  return (
    <div>
      <Label className="text-gray-300">Content Type</Label>
      <p className="text-xs text-gray-500 mt-1 mb-2">What type of content do you create?</p>
      <div className="flex flex-wrap gap-2">
        {contentTypes.map((type) => {
          const isSelected = selected.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-brand-primary text-white border-2 border-brand-primary'
                  : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700'
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
              : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700'
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
          className="bg-gray-800 border-gray-600 text-white mt-2"
        />
      )}
    </div>
  );
}
