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
  Palette,
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
    followerCount: "",
    
    // Athlete Fields
    sport: "",
    ageRange: "",
    position: "",
    education: "",
    grade: "",
    school: "",
    graduationYear: "",
    currentSponsors: "",
    nilCompliant: false,
    
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
    
    // Store Settings
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
        followerCount: creator?.followerCount?.toString() || "",
        
        // Athlete
        sport: typeSpecificData?.athlete?.sport || user.profileData?.sport || "",
        ageRange: typeSpecificData?.athlete?.ageRange || "",
        position: typeSpecificData?.athlete?.position || user.profileData?.position || "",
        education: typeSpecificData?.athlete?.education?.level || user.profileData?.education?.level || "",
        grade: typeSpecificData?.athlete?.education?.grade || user.profileData?.education?.grade || "",
        school: typeSpecificData?.athlete?.education?.school || user.profileData?.education?.school || "",
        graduationYear: typeSpecificData?.athlete?.education?.graduationYear?.toString() || user.profileData?.education?.graduationYear?.toString() || "",
        currentSponsors: typeSpecificData?.athlete?.currentSponsors?.join(", ") || "",
        nilCompliant: typeSpecificData?.athlete?.nilCompliant || false,
        
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
        
        // Store Colors
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
            graduationYear: data.graduationYear ? parseInt(data.graduationYear) : undefined
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
              ageRange: data.ageRange,
              position: data.position,
              education: {
                level: data.education,
                grade: data.grade,
                school: data.school,
                graduationYear: data.graduationYear ? parseInt(data.graduationYear) : undefined
              },
              currentSponsors: data.currentSponsors ? data.currentSponsors.split(',').map((s: string) => s.trim()) : [],
              nilCompliant: data.nilCompliant
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
          bannerImage: data.bannerImage,
          followerCount: data.followerCount ? parseInt(data.followerCount) : undefined,
          storeColors: data.storeColors,
          typeSpecificData,
          publicFields: data.publicFields
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
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
                <Label htmlFor="location" className="text-gray-300 flex items-center justify-between">
                  <span><MapPin className="inline mr-1 h-4 w-4" />Location</span>
                  <Switch
                    checked={formData.publicFields.location}
                    onCheckedChange={() => handlePublicFieldToggle('location')}
                    className="scale-75"
                  />
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="City, State"
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

            <div>
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
                  <Label htmlFor="ageRange" className="text-gray-300">Age Range</Label>
                  <Select value={formData.ageRange} onValueChange={(value) => handleInputChange('ageRange', value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="13-15">13-15</SelectItem>
                      <SelectItem value="16-18">16-18</SelectItem>
                      <SelectItem value="19-22">19-22</SelectItem>
                      <SelectItem value="23-26">23-26</SelectItem>
                      <SelectItem value="27-30">27-30</SelectItem>
                      <SelectItem value="31+">31+</SelectItem>
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
                  <Label htmlFor="school" className="text-gray-300">School/Institution</Label>
                  <Input
                    id="school"
                    value={formData.school}
                    onChange={(e) => handleInputChange('school', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="School name"
                  />
                </div>

                <div>
                  <Label htmlFor="graduationYear" className="text-gray-300">Graduation Year</Label>
                  <Input
                    id="graduationYear"
                    type="number"
                    value={formData.graduationYear}
                    onChange={(e) => handleInputChange('graduationYear', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="2025"
                  />
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

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <Label htmlFor="nilCompliant" className="text-gray-300">NIL Compliant</Label>
                <Switch
                  id="nilCompliant"
                  checked={formData.nilCompliant}
                  onCheckedChange={(checked) => handleInputChange('nilCompliant', checked)}
                />
              </div>
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

          <Separator className="bg-gray-700" />

          {/* Store Colors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Store Branding
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor" className="text-gray-300">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.storeColors.primary}
                    onChange={(e) => handleInputChange('storeColors', { ...formData.storeColors, primary: e.target.value })}
                    className="w-20 h-10 p-1 bg-gray-800 border-gray-700"
                  />
                  <Input
                    value={formData.storeColors.primary}
                    onChange={(e) => handleInputChange('storeColors', { ...formData.storeColors, primary: e.target.value })}
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                    placeholder="#E10698"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondaryColor" className="text-gray-300">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={formData.storeColors.secondary}
                    onChange={(e) => handleInputChange('storeColors', { ...formData.storeColors, secondary: e.target.value })}
                    className="w-20 h-10 p-1 bg-gray-800 border-gray-700"
                  />
                  <Input
                    value={formData.storeColors.secondary}
                    onChange={(e) => handleInputChange('storeColors', { ...formData.storeColors, secondary: e.target.value })}
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                    placeholder="#14FEEE"
                  />
                </div>
              </div>
            </div>
          </div>

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

