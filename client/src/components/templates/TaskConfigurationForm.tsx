import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TaskConfigurationFormProps {
  platform: string;
  taskType: {
    value: string;
    label: string;
    description: string;
    points: number;
  };
  onSubmit: (config: any) => void;
  isLoading?: boolean;
}

// Platform-specific schemas
const twitterConfigSchema = z.object({
  points: z.number().min(1).max(10000),
  handle: z.string().min(1, "Twitter handle is required").regex(/^@?[\w_]+$/, "Invalid Twitter handle format"),
  include_name: z.boolean().optional(),
  include_bio: z.boolean().optional(),
  verification_method: z.enum(["manual", "api"]).default("manual")
});

const facebookConfigSchema = z.object({
  points: z.number().min(1).max(10000),
  page_url: z.string().url("Please enter a valid Facebook page URL"),
  verification_method: z.enum(["manual", "api"]).default("manual")
});

const instagramConfigSchema = z.object({
  points: z.number().min(1).max(10000),
  handle: z.string().min(1, "Instagram handle is required").regex(/^@?[\w.]+$/, "Invalid Instagram handle format"),
  verification_method: z.enum(["manual", "api"]).default("manual")
});

const youtubeConfigSchema = z.object({
  points: z.number().min(1).max(10000),
  channel_url: z.string().url("Please enter a valid YouTube channel URL"),
  verification_method: z.enum(["manual", "api"]).default("manual")
});

const tiktokConfigSchema = z.object({
  points: z.number().min(1).max(10000),
  handle: z.string().min(1, "TikTok handle is required").regex(/^@?[\w.]+$/, "Invalid TikTok handle format"),
  verification_method: z.enum(["manual", "api"]).default("manual")
});

const spotifyConfigSchema = z.object({
  points: z.number().min(1).max(10000),
  artist_url: z.string().url("Please enter a valid Spotify artist URL"),
  verification_method: z.enum(["manual", "api"]).default("manual")
});

function getSchemaForPlatform(platform: string) {
  switch (platform) {
    case "twitter": return twitterConfigSchema;
    case "facebook": return facebookConfigSchema;
    case "instagram": return instagramConfigSchema;
    case "youtube": return youtubeConfigSchema;
    case "tiktok": return tiktokConfigSchema;
    case "spotify": return spotifyConfigSchema;
    default: return z.object({ points: z.number().min(1).max(10000) });
  }
}

export function TaskConfigurationForm({ platform, taskType, onSubmit, isLoading }: TaskConfigurationFormProps) {
  const schema = getSchemaForPlatform(platform);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      points: taskType.points,
      verification_method: "manual",
      include_name: false,
      include_bio: false,
      handle: "",
      page_url: "",
      channel_url: "",
      artist_url: ""
    }
  });

  const handleSubmit = (data: any) => {
    onSubmit({
      ...data,
      taskType: taskType.value
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Configure {taskType.label} Task
        </CardTitle>
        <CardDescription>
          Set up the specific requirements and reward points for this task
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Points Configuration */}
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward Points</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      max="10000"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      data-testid="input-points"
                    />
                  </FormControl>
                  <FormDescription>
                    Points users will earn for completing this task
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Platform-specific fields */}
            {platform === "twitter" && (
              <>
                <FormField
                  control={form.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter Handle</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="@username or username" 
                          {...field}
                          data-testid="input-twitter-handle"
                        />
                      </FormControl>
                      <FormDescription>
                        The Twitter account users should follow or interact with
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="include_name"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Include Name</FormLabel>
                          <FormDescription>
                            Require users to include their name in interactions
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-include-name"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="include_bio"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Include Bio</FormLabel>
                          <FormDescription>
                            Require users to update their bio
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-include-bio"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {platform === "facebook" && (
              <FormField
                control={form.control}
                name="page_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook Page URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://facebook.com/your-page" 
                        {...field}
                        data-testid="input-facebook-url"
                      />
                    </FormControl>
                    <FormDescription>
                      The Facebook page users should like or interact with
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {platform === "instagram" && (
              <FormField
                control={form.control}
                name="handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram Handle</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="@username or username" 
                        {...field}
                        data-testid="input-instagram-handle"
                      />
                    </FormControl>
                    <FormDescription>
                      The Instagram account users should follow or interact with
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {platform === "youtube" && (
              <FormField
                control={form.control}
                name="channel_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Channel URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://youtube.com/@channel" 
                        {...field}
                        data-testid="input-youtube-url"
                      />
                    </FormControl>
                    <FormDescription>
                      The YouTube channel users should subscribe to or interact with
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {platform === "tiktok" && (
              <FormField
                control={form.control}
                name="handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok Handle</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="@username or username" 
                        {...field}
                        data-testid="input-tiktok-handle"
                      />
                    </FormControl>
                    <FormDescription>
                      The TikTok account users should follow or interact with
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {platform === "spotify" && (
              <FormField
                control={form.control}
                name="artist_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spotify Artist URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://open.spotify.com/artist/..." 
                        {...field}
                        data-testid="input-spotify-url"
                      />
                    </FormControl>
                    <FormDescription>
                      The Spotify artist users should follow or interact with
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Verification Method */}
            <FormField
              control={form.control}
              name="verification_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-verification">
                        <SelectValue placeholder="Choose verification method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual Review</SelectItem>
                      <SelectItem value="api">Automatic (API)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How task completion will be verified
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1"
                data-testid="button-create-task"
              >
                {isLoading ? "Creating Task..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}