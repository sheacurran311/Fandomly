/**
 * AnnouncementsManager - Component for managing program announcements
 * Extracted from program-builder.tsx for better maintainability
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchApi, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Megaphone,
  Plus,
  Pin,
  Trash2,
  Edit,
  Send
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'update' | 'new_campaign' | 'new_task' | 'achievement';
  isPinned: boolean;
  isPublished: boolean;
  createdAt: string;
}

interface AnnouncementsManagerProps {
  programId: string;
}

export function AnnouncementsManager({ programId }: AnnouncementsManagerProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Fetch announcements
  const { data: announcements = [], refetch } = useQuery<Announcement[]>({
    queryKey: [`/api/programs/${programId}/announcements`],
    enabled: !!programId,
  });

  // Create/Update announcement mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Announcement>) => {
      if (editingAnnouncement) {
        return fetchApi(`/api/announcements/${editingAnnouncement.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return fetchApi(`/api/programs/${programId}/announcements`, {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${programId}/announcements`] });
      setIsComposerOpen(false);
      setEditingAnnouncement(null);
      refetch();
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return fetchApi(`/api/announcements/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${programId}/announcements`] });
      refetch();
    },
  });

  // Pin/Unpin announcement mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      return fetchApi(`/api/announcements/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isPinned: !isPinned }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs/${programId}/announcements`] });
      refetch();
    },
  });

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsComposerOpen(true);
  };

  const handleCloseComposer = () => {
    setIsComposerOpen(false);
    setEditingAnnouncement(null);
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Announcements & Updates
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">Share news, updates, and achievements with your fans</p>
          </div>
          <Button
            onClick={() => setIsComposerOpen(true)}
            className="bg-brand-primary hover:bg-brand-primary/80"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400 mb-2">No announcements yet</p>
            <p className="text-sm text-gray-500 mb-4">Share updates with your fans to keep them engaged!</p>
            <Button
              onClick={() => setIsComposerOpen(true)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Create Your First Announcement
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-white font-semibold">{announcement.title}</h4>
                        {announcement.isPinned && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className="border-white/20 text-gray-400 text-xs"
                        >
                          {announcement.type}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{announcement.content}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(announcement.createdAt).toLocaleDateString()} at {new Date(announcement.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-white hover:bg-white/10"
                        onClick={() => togglePinMutation.mutate({ id: announcement.id, isPinned: announcement.isPinned })}
                      >
                        <Pin className={`h-4 w-4 ${announcement.isPinned ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-white hover:bg-white/10"
                        onClick={() => handleEdit(announcement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                        onClick={() => deleteMutation.mutate(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Announcement Composer Modal */}
      <AnnouncementComposer
        isOpen={isComposerOpen}
        onClose={handleCloseComposer}
        onSubmit={(data) => saveMutation.mutate(data)}
        isSubmitting={saveMutation.isPending}
        initialData={editingAnnouncement}
      />
    </Card>
  );
}

// Announcement Composer Component
interface AnnouncementComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Announcement>) => void;
  isSubmitting: boolean;
  initialData?: Announcement | null;
}

function AnnouncementComposer({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData
}: AnnouncementComposerProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'update' as 'update' | 'new_campaign' | 'new_task' | 'achievement',
    isPinned: false,
    isPublished: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        type: initialData.type || 'update',
        isPinned: initialData.isPinned || false,
        isPublished: initialData.isPublished ?? true,
      });
    } else {
      setFormData({
        title: '',
        content: '',
        type: 'update',
        isPinned: false,
        isPublished: true,
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            {initialData ? 'Edit Announcement' : 'Create Announcement'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label className="text-white">Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="Exciting news!"
              required
            />
          </div>
          <div>
            <Label className="text-white">Content *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1"
              placeholder="Share your update with fans..."
              rows={5}
              required
            />
          </div>
          <div>
            <Label className="text-white">Type</Label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-md"
            >
              <option value="update">General Update</option>
              <option value="new_campaign">New Campaign Launch</option>
              <option value="new_task">New Task Available</option>
              <option value="achievement">Achievement/Milestone</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isPinned}
                onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked })}
              />
              <Label className="text-white">Pin to top</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
              />
              <Label className="text-white">Publish immediately</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary hover:bg-brand-primary/80"
              disabled={isSubmitting || !formData.title || !formData.content}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Publish'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AnnouncementsManager;
