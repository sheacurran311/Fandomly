import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, User, Mail, Phone, MapPin, Calendar, Check, AlertCircle, Upload, Image as ImageIcon, Users, Music, Video, Bell } from "lucide-react";
import { Link } from "wouter";
import useUsernameValidation from "@/hooks/use-username-validation";
import { CREATOR_TYPE_OPTIONS, getSubcategoryOptions, getCreatorTypeLabel } from "@shared/fanInterestOptions";
import type { CreatorTypeInterest } from "@shared/fanInterestOptions";
import { ImageUpload } from "@/components/ui/image-upload";

// Topic categories for fan interests (same as creator onboarding)
const topicCategories = [
  // Main categories and subcategories
  { value: "sports", label: "Sports", isMain: true },
  { value: "football", label: "Football", parent: "sports" },
  { value: "soccer", label: "Soccer", parent: "sports" },
  { value: "basketball", label: "Basketball", parent: "sports" },
  { value: "hockey", label: "Hockey", parent: "sports" },
  { value: "sports-betting", label: "Sports Betting", parent: "sports" },
  
  { value: "technology", label: "Technology", isMain: true },
  { value: "blockchain-crypto", label: "Blockchain/Crypto", parent: "technology" },
  { value: "ai", label: "AI", parent: "technology" },
  { value: "coding", label: "Coding", parent: "technology" },
  
  { value: "entertainment", label: "Entertainment", isMain: true },
  { value: "gaming", label: "Gaming", parent: "entertainment" },
  { value: "music", label: "Music", parent: "entertainment" },
  { value: "movies-tv", label: "Movies & TV", parent: "entertainment" },
  
  { value: "health-wellness", label: "Health & Wellness", isMain: true },
  { value: "diet-fitness", label: "Diet/Fitness", parent: "health-wellness" },
  { value: "mental-health", label: "Mental Health", parent: "health-wellness" },
  { value: "meditation", label: "Meditation", parent: "health-wellness" },
  
  { value: "finance", label: "Finance", isMain: true },
  { value: "stock-market", label: "Stock Market", parent: "finance" },
  { value: "investing", label: "Investing", parent: "finance" },
  { value: "personal-finance", label: "Personal Finance", parent: "finance" },
  
  { value: "science", label: "Science", isMain: true },
  { value: "physics", label: "Physics", parent: "science" },
  { value: "biology", label: "Biology", parent: "science" },
  { value: "astronomy", label: "Astronomy", parent: "science" },
  
  { value: "writing", label: "Writing", isMain: true },
  { value: "blogs", label: "Blogs", parent: "writing" },
  { value: "journalism", label: "Journalism", parent: "writing" },
  { value: "creative-writing", label: "Creative Writing", parent: "writing" },
  
  { value: "fashion", label: "Fashion", isMain: true },
  { value: "modeling", label: "Modeling", parent: "fashion" },
  { value: "streetwear", label: "Streetwear", parent: "fashion" },
  { value: "luxury", label: "Luxury", parent: "fashion" },
  
  { value: "academics", label: "Academics", isMain: true },
  { value: "tutoring", label: "Tutoring", parent: "academics" },
  { value: "study-tips", label: "Study Tips", parent: "academics" },
  
  { value: "guides-how-tos", label: "Guides/How-Tos", isMain: true },
  { value: "recipes", label: "Recipes", parent: "guides-how-tos" },
  { value: "diy", label: "DIY", parent: "guides-how-tos" },
  { value: "tutorials", label: "Tutorials", parent: "guides-how-tos" },
  
  { value: "travel", label: "Travel", isMain: true },
  { value: "adventure", label: "Adventure", parent: "travel" },
  { value: "budget-travel", label: "Budget Travel", parent: "travel" },
  { value: "luxury-travel", label: "Luxury Travel", parent: "travel" },
  
  { value: "politics", label: "Politics", isMain: true },
  { value: "news", label: "News", parent: "politics" },
  { value: "predictions", label: "Predictions", parent: "politics" },
  { value: "policy", label: "Policy", parent: "politics" },
];

interface FanProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileData {
  name?: string;
  age?: number;
  location?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  avatar?: string; // Profile photo
  bannerImage?: string;
  
  // Marketing Fields (NEW)
  phone?: string; // SMS marketing
  creatorTypeInterests?: CreatorTypeInterest[]; // Which creator types they follow
  interestSubcategories?: {
    athletes?: string[];
    musicians?: string[];
    content_creators?: string[];
  };
  topicsOfFocus?: string[]; // Selected predefined topics
  customTopics?: string[]; // Custom user-entered topics
  
  // Legacy fields (kept for backwards compatibility)
  interests?: Array<"musicians" | "athletes" | "content_creators">;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    marketingEmails?: boolean;
    smsNotifications?: boolean;
  };
}

export default function FanProfileEditModal({ isOpen, onClose }: FanProfileEditModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Username editing state
  const [username, setUsername] = useState(user?.username || "");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  
  // Username validation (only validate when editing)
  const { isChecking, isAvailable, error: usernameError, suggestions, hasChecked } = useUsernameValidation(
    isEditingUsername ? username : ""
  );
  
  const [formData, setFormData] = useState<ProfileData>({
    name: "",
    age: undefined,
    location: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
    avatar: "",
    bannerImage: "",
    phone: "", // NEW
    creatorTypeInterests: [], // NEW
    interestSubcategories: { // NEW
      athletes: [],
      musicians: [],
      content_creators: []
    },
    topicsOfFocus: [], // NEW
    customTopics: [], // NEW
    interests: [],
    socialLinks: {
      twitter: "",
      instagram: "",
      tiktok: "",
      youtube: "",
    },
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: true,
      smsNotifications: true,
    },
  });

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      // Load username
      setUsername(user.username || "");
      setIsEditingUsername(false);
      
      // Load profile data
      if (user.profileData) {
        setFormData({
          name: user.profileData.name || "",
          age: user.profileData.age || undefined,
          location: user.profileData.location || "",
          phoneNumber: user.profileData.phoneNumber || "",
          dateOfBirth: user.profileData.dateOfBirth || "",
          gender: user.profileData.gender || "",
          avatar: user.avatar || (user.profileData as any).avatar || "",
          bannerImage: user.profileData.bannerImage || "",
          phone: (user.profileData as any).phone || "", // NEW
          creatorTypeInterests: (user.profileData as any).creatorTypeInterests || [], // NEW
          interestSubcategories: (user.profileData as any).interestSubcategories || { // NEW
            athletes: [],
            musicians: [],
            content_creators: []
          },
          topicsOfFocus: (user.profileData as any).topicsOfFocus || [], // NEW
          customTopics: (user.profileData as any).customTopics || [], // NEW
          interests: user.profileData.interests || [],
          socialLinks: {
            twitter: user.profileData.socialLinks?.twitter || "",
            instagram: user.profileData.socialLinks?.instagram || "",
            tiktok: user.profileData.socialLinks?.tiktok || "",
            youtube: user.profileData.socialLinks?.youtube || "",
          },
          preferences: {
            emailNotifications: user.profileData.preferences?.emailNotifications ?? true,
            pushNotifications: user.profileData.preferences?.pushNotifications ?? true,
            marketingEmails: user.profileData.preferences?.marketingEmails ?? true,
            smsNotifications: user.profileData.preferences?.smsNotifications ?? true,
          },
        });
      }
    }
  }, [isOpen, user]);

  const updateProfile = useMutation({
    mutationFn: async (data: { username?: string; avatar?: string; profileData: ProfileData }) => {
      if (!user) throw new Error("User not found");
      
      const response = await apiRequest("POST", "/api/auth/profile", {
        userId: user.id,
        username: data.username, // Include username if changed
        avatar: data.avatar, // Include avatar update
        profileData: {
          ...data.profileData,
          // Keep existing Facebook data
          facebookData: user.profileData?.facebookData,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate user data to refetch updated profile
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Profile Updated! ✅",
        description: "Your fan profile has been successfully updated.",
        duration: 4000,
      });
      
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (field: keyof ProfileData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkChange = (platform: keyof NonNullable<ProfileData['socialLinks']>, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handlePreferenceChange = (preference: keyof NonNullable<ProfileData['preferences']>, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
  };

  const toggleInterest = (interest: "musicians" | "athletes" | "content_creators") => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests?.includes(interest) 
        ? prev.interests.filter(i => i !== interest)
        : [...(prev.interests || []), interest]
    }));
  };
  
  // NEW: Handle creator type interests (marketing)
  const toggleCreatorTypeInterest = (type: CreatorTypeInterest) => {
    setFormData(prev => {
      const currentInterests = prev.creatorTypeInterests || [];
      const isSelected = currentInterests.includes(type);
      
      if (isSelected) {
        // Remove type and clear its subcategories
        return {
          ...prev,
          creatorTypeInterests: currentInterests.filter(t => t !== type),
          interestSubcategories: {
            ...prev.interestSubcategories,
            [type]: []
          }
        };
      } else {
        // Add type
        return {
          ...prev,
          creatorTypeInterests: [...currentInterests, type]
        };
      }
    });
  };
  
  // NEW: Handle subcategory selection
  const toggleSubcategory = (creatorType: CreatorTypeInterest, subcategory: string) => {
    setFormData(prev => {
      const currentSubs = prev.interestSubcategories?.[creatorType] || [];
      const isSelected = currentSubs.includes(subcategory);
      
      return {
        ...prev,
        interestSubcategories: {
          ...prev.interestSubcategories,
          [creatorType]: isSelected
            ? currentSubs.filter(s => s !== subcategory)
            : [...currentSubs, subcategory]
        }
      };
    });
  };

  // NEW: Handle topic selection (limit to 5)
  const [customTopicInput, setCustomTopicInput] = useState("");
  
  const toggleTopic = (topicValue: string) => {
    setFormData(prev => {
      const currentTopics = prev.topicsOfFocus || [];
      const isSelected = currentTopics.includes(topicValue);
      const totalSelected = currentTopics.length + (prev.customTopics || []).length;
      
      if (isSelected) {
        return {
          ...prev,
          topicsOfFocus: currentTopics.filter(t => t !== topicValue)
        };
      } else if (totalSelected < 5) {
        return {
          ...prev,
          topicsOfFocus: [...currentTopics, topicValue]
        };
      }
      return prev;
    });
  };
  
  const addCustomTopic = () => {
    if (!customTopicInput.trim()) return;
    
    const totalSelected = (formData.topicsOfFocus || []).length + (formData.customTopics || []).length;
    if (totalSelected >= 5) {
      toast({
        title: "Maximum Reached",
        description: "You can select up to 5 topics total",
        variant: "destructive",
      });
      return;
    }
    
    // Check for duplicates
    if ((formData.customTopics || []).includes(customTopicInput.trim())) {
      toast({
        title: "Duplicate Topic",
        description: "You've already added this topic",
        variant: "destructive",
      });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      customTopics: [...(prev.customTopics || []), customTopicInput.trim()]
    }));
    setCustomTopicInput("");
  };
  
  const removeCustomTopic = (topic: string) => {
    setFormData(prev => ({
      ...prev,
      customTopics: (prev.customTopics || []).filter(t => t !== topic)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate username if editing
    if (isEditingUsername && (!isAvailable || isChecking)) {
      toast({
        title: "Invalid Username",
        description: "Please choose a valid and available username",
        variant: "destructive",
      });
      return;
    }
    
    updateProfile.mutate({
      username: isEditingUsername && username !== user?.username ? username : undefined,
      avatar: formData.avatar !== (user?.avatar || user?.profileData?.avatar) ? formData.avatar : undefined,
      profileData: formData,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <User className="mr-2 h-5 w-5" />
            Edit Fan Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Username</h3>
            <div>
              <Label htmlFor="username" className="text-gray-300 flex items-center justify-between">
                <span>Username *</span>
                {!isEditingUsername && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingUsername(true)}
                    className="text-brand-primary hover:text-brand-primary/80 h-auto p-1"
                  >
                    Edit
                  </Button>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                  disabled={!isEditingUsername}
                  className={`bg-gray-800 border-gray-700 text-white pr-10 ${
                    !isEditingUsername ? 'opacity-70 cursor-not-allowed' : ''
                  } ${
                    isEditingUsername && hasChecked && !isAvailable ? 'border-red-500' : 
                    isEditingUsername && hasChecked && isAvailable ? 'border-green-500' : ''
                  }`}
                  placeholder="your_unique_username"
                />
                {isEditingUsername && isChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {isEditingUsername && hasChecked && !isChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isAvailable ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {isEditingUsername && usernameError && (
                <p className="text-red-400 text-sm mt-1">{usernameError}</p>
              )}
              {isEditingUsername && hasChecked && isAvailable && (
                <p className="text-green-400 text-sm mt-1 flex items-center">
                  <Check className="h-3 w-3 mr-1" />
                  Username available!
                </p>
              )}
              {isEditingUsername && suggestions && suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-gray-400 text-xs mb-1">Suggestions:</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestions.slice(0, 3).map(suggestion => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer text-xs bg-gray-800 hover:bg-gray-700"
                        onClick={() => setUsername(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-gray-300">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Your display name"
                />
              </div>
              
              <div>
                <Label htmlFor="age" className="text-gray-300">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age || ""}
                  onChange={(e) => handleInputChange('age', e.target.value ? Number(e.target.value) : undefined)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Your age"
                />
              </div>
              
              <div>
                <Label htmlFor="gender" className="text-gray-300">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dateOfBirth" className="text-gray-300">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location" className="text-gray-300">
                  <MapPin className="inline mr-1 h-4 w-4" />
                  Location
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

          {/* Interests - Creator Preferences (UPDATED) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Interests
            </h3>
            <p className="text-sm text-gray-400">Help us connect you with the right creators and campaigns</p>
            
            {/* Creator Type Interests */}
            <div>
              <Label className="text-gray-300 mb-2 block">What type of creators do you follow?</Label>
              <div className="flex flex-wrap gap-2">
                {CREATOR_TYPE_OPTIONS.map(option => (
                  <Badge
                    key={option.value}
                    variant={formData.creatorTypeInterests?.includes(option.value) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      formData.creatorTypeInterests?.includes(option.value)
                        ? "bg-brand-primary hover:bg-brand-primary/80"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                    onClick={() => toggleCreatorTypeInterest(option.value)}
                  >
                    {option.value === "athletes" && <Users className="mr-1 h-3 w-3" />}
                    {option.value === "musicians" && <Music className="mr-1 h-3 w-3" />}
                    {option.value === "content_creators" && <Video className="mr-1 h-3 w-3" />}
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Dynamic Subcategories */}
            {formData.creatorTypeInterests?.map(creatorType => {
              const subcategoryOptions = getSubcategoryOptions(creatorType);
              const selectedSubs = formData.interestSubcategories?.[creatorType] || [];
              
              return (
                <div key={creatorType} className="pl-4 border-l-2 border-brand-primary/30">
                  <Label className="text-gray-300 mb-2 block">
                    {getCreatorTypeLabel(creatorType)} - What interests you?
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {subcategoryOptions.map(sub => (
                      <Badge
                        key={sub}
                        variant={selectedSubs.includes(sub) ? "default" : "outline"}
                        className={`cursor-pointer text-xs ${
                          selectedSubs.includes(sub)
                            ? "bg-brand-secondary hover:bg-brand-secondary/80"
                            : "bg-gray-800 hover:bg-gray-700"
                        }`}
                        onClick={() => toggleSubcategory(creatorType, sub)}
                      >
                        {sub}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* Topics Selection (NEW) */}
            <div className="mt-4">
              <Label className="text-gray-300 mb-2 block">
                Your Interest Topics (Select up to 5)
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                {(formData.topicsOfFocus || []).length + (formData.customTopics || []).length}/5 selected
              </p>
              
              {/* Topic Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar p-2 bg-gray-800/50 rounded-lg">
                {topicCategories.map((topic) => {
                  const isSelected = (formData.topicsOfFocus || []).includes(topic.value);
                  const totalSelected = (formData.topicsOfFocus || []).length + (formData.customTopics || []).length;
                  const isDisabled = !isSelected && totalSelected >= 5;
                  
                  return (
                    <button
                      key={topic.value}
                      type="button"
                      onClick={() => toggleTopic(topic.value)}
                      disabled={isDisabled}
                      className={`p-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected 
                          ? 'bg-brand-primary text-white border-2 border-brand-primary' 
                          : isDisabled
                            ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed opacity-50'
                            : topic.isMain
                              ? 'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600'
                              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                      } ${topic.isMain ? 'font-bold' : 'pl-4'}`}
                    >
                      {topic.label}
                    </button>
                  );
                })}
              </div>
              
              {/* Custom Topic Input */}
              <div className="mt-3">
                <Label className="text-gray-300 text-xs mb-1 block">Add Custom Topic</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTopic())}
                    placeholder="Enter a topic..."
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                    disabled={(formData.topicsOfFocus || []).length + (formData.customTopics || []).length >= 5}
                  />
                  <Button
                    type="button"
                    onClick={addCustomTopic}
                    size="sm"
                    disabled={(formData.topicsOfFocus || []).length + (formData.customTopics || []).length >= 5}
                    className="bg-brand-secondary hover:bg-brand-secondary/80"
                  >
                    Add
                  </Button>
                </div>
              </div>
              
              {/* Selected Topics Display */}
              {((formData.topicsOfFocus || []).length > 0 || (formData.customTopics || []).length > 0) && (
                <div className="mt-3">
                  <Label className="text-gray-300 text-xs mb-2 block">Selected Topics:</Label>
                  <div className="flex flex-wrap gap-2">
                    {(formData.topicsOfFocus || []).map(topic => {
                      const topicData = topicCategories.find(t => t.value === topic);
                      return (
                        <Badge
                          key={topic}
                          className="bg-brand-primary/20 text-brand-primary border border-brand-primary/30 cursor-pointer hover:bg-brand-primary/30"
                          onClick={() => toggleTopic(topic)}
                        >
                          {topicData?.label || topic}
                          <X className="ml-1 h-3 w-3" />
                        </Badge>
                      );
                    })}
                    {(formData.customTopics || []).map(topic => (
                      <Badge
                        key={topic}
                        className="bg-purple-500/20 text-purple-400 border border-purple-500/30 cursor-pointer hover:bg-purple-500/30"
                        onClick={() => removeCustomTopic(topic)}
                      >
                        {topic}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Phone and Notification Preferences removed - Now managed in Settings page */}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="bg-brand-primary hover:bg-brand-primary/80 text-white"
            >
              {updateProfile.isPending ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}