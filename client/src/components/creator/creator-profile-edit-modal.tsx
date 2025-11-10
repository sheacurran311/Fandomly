import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ImageUpload } from "@/components/ui/image-upload";
import { LocationPicker } from "@/components/ui/location-picker";
import { PersonalLinksInput } from "@/components/ui/personal-links-input";
import { StarRating } from "@/components/ui/star-rating";
import { 
  Save, 
  X, 
  User as UserIcon, 
  Mail, 
  MapPin, 
  Upload, 
  Image as ImageIcon,
  Eye,
  EyeOff,
  Trophy,
  Music,
  Video
} from "lucide-react";
import type { User, Creator } from "@shared/schema";

interface CreatorProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  creator?: Creator;
}

const topSports = [
  "American Football", "Basketball", "Baseball", "Soccer", "Tennis", "Golf", 
  "Swimming", "Track & Field", "Wrestling", "Gymnastics", "Volleyball", 
  "Softball", "Hockey", "Lacrosse", "Cross Country", "Skiing"
];

const collegeCommitmentOptions = [
  "Committed", "Signed", "Enrolled", "Interested", "Contacted", "Offered"
];

const educationLevels = [
  { value: "middle_school", label: "Middle School" },
  { value: "high_school", label: "High School" },
  { value: "junior_college", label: "Junior College" },
  { value: "college_d1", label: "College - Division I" },
  { value: "college_d2", label: "College - Division II" },
  { value: "college_d3", label: "College - Division III" },
  { value: "professional", label: "Professional" }
];

const musicGenres = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Country", "Electronic", "Jazz", "Classical",
  "Alternative", "Indie", "Folk", "Blues", "Reggae", "Latin", "Metal"
];

const contentTypes = [
  "Creative Video", "Podcast", "Influencer", "Gaming", "Educational", "Comedy",
  "Lifestyle", "Fashion", "Beauty", "Fitness", "Food", "Travel", "Technology"
];

export default function CreatorProfileEditModal({ isOpen, onClose, user, creator }: CreatorProfileEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    // Basic Info
    displayName: "",
    bio: "",
    location: "",
    bannerImage: "",
    avatar: "",
    
    // Athlete Fields
    sport: "",
    position: "",
    education: "",
    grade: "",
    school: "",
    graduatingClass: "",
    currentSponsors: "",
    personalLinks: [] as string[],
    rivalsScore: "",
    espnScoutGrade: "",
    rating247: "",
    collegeCommitmentStatus: "",
    
    // Musician Fields
    musicGenre: [] as string[],
    artistType: "",
    bandArtistName: "",
    musicCatalogUrl: "",
    
    // Content Creator Fields
    contentType: [] as string[],
    platforms: [] as string[],
    topicsOfFocus: "",
    sponsorships: "",
    totalViews: "",
    
    // Store Settings (hidden from UI, but kept for backend)
    storeColors: {
      primary: "#E10698",
      secondary: "#14FEEE"
    },
    
    // Public/Private Toggles
    publicFields: {
      location: true,
      education: true,
      sport: true,
      followers: true,
      bio: true
    }
  });

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      const creatorType = creator?.category || user.profileData?.creatorType;
      const typeSpecificData = creator?.typeSpecificData as any;
      
      setFormData({
        displayName: creator?.displayName || user.profileData?.name || "",
        bio: creator?.bio || user.profileData?.bio || "",
        location: user.profileData?.location || "",
        bannerImage: user.profileData?.bannerImage || creator?.bannerImage || "",
        avatar: user.profileData?.avatar || "",
        
        // Athlete
        sport: typeSpecificData?.athlete?.sport || user.profileData?.sport || "",
        position: typeSpecificData?.athlete?.position || user.profileData?.position || "",
        education: typeSpecificData?.athlete?.education?.level || user.profileData?.education?.level || "",
        grade: typeSpecificData?.athlete?.education?.grade || user.profileData?.education?.grade || "",
        school: typeSpecificData?.athlete?.education?.school || user.profileData?.education?.school || "",
        graduatingClass: typeSpecificData?.athlete?.graduatingClass?.toString() || user.profileData?.education?.graduationYear?.toString() || "",
        currentSponsors: typeSpecificData?.athlete?.currentSponsors?.join(", ") || "",
        personalLinks: typeSpecificData?.athlete?.personalLinks || [],
        rivalsScore: typeSpecificData?.athlete?.rivalsScore?.toString() || "",
        espnScoutGrade: typeSpecificData?.athlete?.espnScoutGrade?.toString() || "",
        rating247: typeSpecificData?.athlete?.rating247?.toString() || "",
        collegeCommitmentStatus: typeSpecificData?.athlete?.collegeCommitmentStatus || "",
        
        // Musician
        musicGenre: typeSpecificData?.musician?.musicGenre || user.profileData?.musicGenre || [],
        artistType: typeSpecificData?.musician?.artistType || user.profileData?.artistType || "",
        bandArtistName: typeSpecificData?.musician?.bandArtistName || "",
        musicCatalogUrl: typeSpecificData?.musician?.musicCatalogUrl || "",
        
        // Content Creator
        contentType: typeSpecificData?.contentCreator?.contentType || user.profileData?.contentType || [],
        platforms: typeSpecificData?.contentCreator?.platforms || user.profileData?.platforms || [],
        topicsOfFocus: Array.isArray(typeSpecificData?.contentCreator?.topicsOfFocus) 
          ? typeSpecificData.contentCreator.topicsOfFocus.join(", ") 
          : (typeSpecificData?.contentCreator?.topicsOfFocus || ""),
        sponsorships: Array.isArray(typeSpecificData?.contentCreator?.sponsorships)
          ? typeSpecificData.contentCreator.sponsorships.join(", ")
          : (typeSpecificData?.contentCreator?.sponsorships || ""),
        totalViews: typeSpecificData?.contentCreator?.totalViews || "",
        
        // Store Colors (hidden from UI, preserved for backend)
        storeColors: creator?.storeColors as any || {
          primary: "#E10698",
          secondary: "#14FEEE"
        },
        
        // Public/Private (default to public)
        publicFields: (creator as any)?.publicFields || {
          location: true,
          education: true,
          sport: true,
          followers: true,
          bio: true
        }
      });
    }
  }, [isOpen, user, creator]);

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Update user profile data
      await apiRequest("POST", "/api/auth/profile", {
        userId: user.id,
        profileData: {
          name: data.displayName,
          bio: data.bio,
          location: data.location,
          bannerImage: data.bannerImage,
          avatar: data.avatar,
          sport: data.sport,
          position: data.position,
          education: data.education ? {
            level: data.education,
            grade: data.grade,
            school: data.school,
            graduatingClass: data.graduatingClass ? parseInt(data.graduatingClass) : undefined
          } : undefined,
          musicGenre: data.musicGenre,
          artistType: data.artistType,
          contentType: data.contentType,
          platforms: data.platforms
        }
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
                school: data.school
              },
              graduatingClass: data.graduatingClass ? parseInt(data.graduatingClass) : undefined,
              currentSponsors: data.currentSponsors ? data.currentSponsors.split(',').map((s: string) => s.trim()) : [],
              personalLinks: data.personalLinks,
              rivalsScore: data.rivalsScore ? parseFloat(data.rivalsScore) : undefined,
              espnScoutGrade: data.espnScoutGrade ? parseFloat(data.espnScoutGrade) : undefined,
              rating247: data.rating247 ? parseFloat(data.rating247) : undefined,
              collegeCommitmentStatus: data.collegeCommitmentStatus || undefined
            }
          };
        } else if (creatorType === 'musician') {
          typeSpecificData = {
            musician: {
              musicGenre: data.musicGenre,
              artistType: data.artistType,
              bandArtistName: data.bandArtistName,
              musicCatalogUrl: data.musicCatalogUrl
            }
          };
        } else if (creatorType === 'content_creator') {
          typeSpecificData = {
            contentCreator: {
              contentType: data.contentType,
              platforms: data.platforms,
              topicsOfFocus: data.topicsOfFocus ? data.topicsOfFocus.split(',').map((t: string) => t.trim()) : [],
              sponsorships: data.sponsorships ? data.sponsorships.split(',').map((s: string) => s.trim()) : [],
              totalViews: data.totalViews
            }
          };
        }
        
        await apiRequest("PUT", `/api/creators/${creator.id}`, {
          displayName: data.displayName,
          bio: data.bio,
          imageUrl: data.avatar,  // Save profile photo to creator.imageUrl for verification
          storeColors: data.storeColors,  // Preserve store colors (managed in program builder)
          typeSpecificData,
          publicFields: data.publicFields
        });
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      
      // Trigger verification check after profile update
      try {
        await apiRequest("POST", "/api/creator-verification/check", {});
        queryClient.invalidateQueries({ queryKey: ["/api/creator-verification/status"] });
      } catch (error) {
        console.error("Verification check failed:", error);
      }
      
      toast({
        title: "Profile Updated! ✅",
        description: "Your creator profile has been successfully updated.",
        duration: 3000
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePublicFieldToggle = (field: keyof typeof formData.publicFields) => {
    setFormData(prev => ({
      ...prev,
      publicFields: {
        ...prev.publicFields,
        [field]: !prev.publicFields[field]
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const creatorType = creator?.category || user.profileData?.creatorType;

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
                {creator?.isVerified ? "✓ Verified" : "Pending Verification"}
              </Badge>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName" className="text-gray-300">Display Name *</Label>
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
                    <MapPin className="inline mr-1 h-4 w-4" />Location
                  </Label>
                  <Switch
                    checked={formData.publicFields.location}
                    onCheckedChange={() => handlePublicFieldToggle('location')}
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
                  checked={formData.publicFields.bio}
                  onCheckedChange={() => handlePublicFieldToggle('bio')}
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

            <div className="hidden">
              <Label htmlFor="followerCount" className="text-gray-300 flex items-center justify-between">
                <span>Total Follower Count</span>
                <Switch
                  checked={formData.publicFields.followers}
                  onCheckedChange={() => handlePublicFieldToggle('followers')}
                  className="scale-75"
                />
              </Label>
              <Input
                id="followerCount"
                type="number"
                value={formData.followerCount}
                onChange={(e) => handleInputChange('followerCount', e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Total followers across all platforms"
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
                  <Label htmlFor="sport" className="text-gray-300 flex items-center justify-between">
                    <span>Sport *</span>
                    <Switch
                      checked={formData.publicFields.sport}
                      onCheckedChange={() => handlePublicFieldToggle('sport')}
                      className="scale-75"
                    />
                  </Label>
                  <Select value={formData.sport} onValueChange={(value) => handleInputChange('sport', value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {topSports.map(sport => (
                        <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="position" className="text-gray-300">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="e.g., Point Guard"
                  />
                </div>

                <div>
                  <Label htmlFor="education" className="text-gray-300 flex items-center justify-between">
                    <span>Education Level</span>
                    <Switch
                      checked={formData.publicFields.education}
                      onCheckedChange={() => handlePublicFieldToggle('education')}
                      className="scale-75"
                    />
                  </Label>
                  <Select value={formData.education} onValueChange={(value) => handleInputChange('education', value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="grade" className="text-gray-300">Grade/Year</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => handleInputChange('grade', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="e.g., Freshman"
                  />
                </div>

                <div>
                  <Label htmlFor="school" className="text-gray-300">Current School/College/Institution</Label>
                  <Input
                    id="school"
                    value={formData.school}
                    onChange={(e) => handleInputChange('school', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="University of Oklahoma, St. John Bosco..."
                  />
                </div>

                <div>
                  <Label htmlFor="graduatingClass" className="text-gray-300">Graduating Class</Label>
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
                  <Select value={formData.collegeCommitmentStatus} onValueChange={(value) => handleInputChange('collegeCommitmentStatus', value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select status (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {collegeCommitmentOptions.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="currentSponsors" className="text-gray-300">Current Sponsors</Label>
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
                    <Label htmlFor="rivalsScore" className="text-gray-300">Rivals Score</Label>
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
                    <Label htmlFor="espnScoutGrade" className="text-gray-300">ESPN Scout Grade</Label>
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
                    <Label htmlFor="rating247" className="text-gray-300">247 Rating</Label>
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
                  <Label htmlFor="bandArtistName" className="text-gray-300">Band/Artist Name</Label>
                  <Input
                    id="bandArtistName"
                    value={formData.bandArtistName}
                    onChange={(e) => handleInputChange('bandArtistName', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Your stage name"
                  />
                </div>

                <div>
                  <Label htmlFor="artistType" className="text-gray-300">Artist Type</Label>
                  <Select value={formData.artistType} onValueChange={(value) => handleInputChange('artistType', value)}>
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
                  {musicGenres.map(genre => (
                    <Badge
                      key={genre}
                      variant={formData.musicGenre.includes(genre) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        formData.musicGenre.includes(genre)
                          ? "bg-brand-primary hover:bg-brand-primary/80"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
                      onClick={() => {
                        const genres = formData.musicGenre.includes(genre)
                          ? formData.musicGenre.filter(g => g !== genre)
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
                <Label htmlFor="musicCatalogUrl" className="text-gray-300">Music Catalog URL</Label>
                <Input
                  id="musicCatalogUrl"
                  value={formData.musicCatalogUrl}
                  onChange={(e) => handleInputChange('musicCatalogUrl', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Link to Spotify, Apple Music, SoundCloud, etc."
                />
                <p className="text-xs text-gray-500 mt-1">Your music streaming profile or website</p>
              </div>
            </div>
          )}

          {creatorType === 'content_creator' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Video className="h-5 w-5" />
                Content Creator Information
              </h3>

              <div>
                <Label className="text-gray-300 mb-2 block">Content Types</Label>
                <div className="flex flex-wrap gap-2">
                  {contentTypes.map(type => (
                    <Badge
                      key={type}
                      variant={formData.contentType.includes(type) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        formData.contentType.includes(type)
                          ? "bg-brand-primary hover:bg-brand-primary/80"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
                      onClick={() => {
                        const types = formData.contentType.includes(type)
                          ? formData.contentType.filter(t => t !== type)
                          : [...formData.contentType, type];
                        handleInputChange('contentType', types);
                      }}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="topicsOfFocus" className="text-gray-300">Topics of Focus</Label>
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
                  <Label htmlFor="totalViews" className="text-gray-300">Total Views</Label>
                  <Input
                    id="totalViews"
                    value={formData.totalViews}
                    onChange={(e) => handleInputChange('totalViews', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Total views across platforms"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sponsorships" className="text-gray-300">Current Sponsorships</Label>
                <Input
                  id="sponsorships"
                  value={formData.sponsorships}
                  onChange={(e) => handleInputChange('sponsorships', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Brand partnerships separated by commas"
                />
                <p className="text-xs text-gray-500 mt-1">e.g., Amazon, Skillshare, NordVPN</p>
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
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

