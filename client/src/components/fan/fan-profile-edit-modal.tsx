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
import { Save, X, User, Mail, Phone, MapPin, Calendar } from "lucide-react";

interface FanProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileData {
  name?: string;
  age?: number;
  bio?: string;
  location?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
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
  
  const [formData, setFormData] = useState<ProfileData>({
    name: "",
    age: undefined,
    bio: "",
    location: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
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
      marketingEmails: false,
      smsNotifications: false,
    },
  });

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen && user?.profileData) {
      setFormData({
        name: user.profileData.name || "",
        age: user.profileData.age || undefined,
        bio: user.profileData.bio || "",
        location: user.profileData.location || "",
        phoneNumber: user.profileData.phoneNumber || "",
        dateOfBirth: user.profileData.dateOfBirth || "",
        gender: user.profileData.gender || "",
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
          marketingEmails: user.profileData.preferences?.marketingEmails ?? false,
          smsNotifications: user.profileData.preferences?.smsNotifications ?? false,
        },
      });
    }
  }, [isOpen, user?.profileData]);

  const updateProfile = useMutation({
    mutationFn: async (profileData: ProfileData) => {
      if (!user) throw new Error("User not found");
      
      const response = await apiRequest("POST", "/api/auth/profile", {
        userId: user.id,
        profileData: {
          ...profileData,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
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

            <div>
              <Label htmlFor="bio" className="text-gray-300">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Tell us about yourself..."
                rows={3}
              />
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
              
              <div>
                <Label htmlFor="phoneNumber" className="text-gray-300">
                  <Phone className="inline mr-1 h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Interests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "musicians", label: "Musicians" },
                { key: "athletes", label: "Athletes" },
                { key: "content_creators", label: "Content Creators" },
              ].map((interest) => (
                <Badge
                  key={interest.key}
                  variant={formData.interests?.includes(interest.key as any) ? "default" : "outline"}
                  className={`cursor-pointer ${
                    formData.interests?.includes(interest.key as any)
                      ? "bg-brand-primary text-white"
                      : "border-gray-600 text-gray-300 hover:bg-gray-800"
                  }`}
                  onClick={() => toggleInterest(interest.key as "musicians" | "athletes" | "content_creators")}
                >
                  {interest.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Social Media Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="twitter" className="text-gray-300">Twitter/X</Label>
                <Input
                  id="twitter"
                  value={formData.socialLinks?.twitter}
                  onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="@username"
                />
              </div>
              
              <div>
                <Label htmlFor="instagram" className="text-gray-300">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.socialLinks?.instagram}
                  onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="@username"
                />
              </div>
              
              <div>
                <Label htmlFor="tiktok" className="text-gray-300">TikTok</Label>
                <Input
                  id="tiktok"
                  value={formData.socialLinks?.tiktok}
                  onChange={(e) => handleSocialLinkChange('tiktok', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="@username"
                />
              </div>
              
              <div>
                <Label htmlFor="youtube" className="text-gray-300">YouTube</Label>
                <Input
                  id="youtube"
                  value={formData.socialLinks?.youtube}
                  onChange={(e) => handleSocialLinkChange('youtube', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Channel name"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Notification Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailNotifications" className="text-gray-300">Email Notifications</Label>
                <Switch
                  id="emailNotifications"
                  checked={formData.preferences?.emailNotifications}
                  onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="pushNotifications" className="text-gray-300">Push Notifications</Label>
                <Switch
                  id="pushNotifications"
                  checked={formData.preferences?.pushNotifications}
                  onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="marketingEmails" className="text-gray-300">Marketing Emails</Label>
                <Switch
                  id="marketingEmails"
                  checked={formData.preferences?.marketingEmails}
                  onCheckedChange={(checked) => handlePreferenceChange('marketingEmails', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="smsNotifications" className="text-gray-300">SMS Notifications</Label>
                <Switch
                  id="smsNotifications"
                  checked={formData.preferences?.smsNotifications}
                  onCheckedChange={(checked) => handlePreferenceChange('smsNotifications', checked)}
                />
              </div>
            </div>
          </div>

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