import { useState, useMemo } from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface ReviewItem {
  id: number;
  task_completion_id: number;
  tenant_id: number;
  creator_id: number;
  fan_id: number;
  task_id: number;
  platform: string;
  task_type: string;
  task_name: string;
  screenshot_url: string | null;
  proof_url: string | null;
  proof_notes: string | null;
  status: string;
  priority: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
  review_notes: string | null;
  auto_check_result: any;
  verification_attempts: number;
}

interface ReviewsResponse {
  data: ReviewItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">High</Badge>;
    case 'low':
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">Low</Badge>;
    default:
      return (
        <Badge variant="outline" className="border-white/20 text-gray-300">
          Normal
        </Badge>
      );
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Approved</Badge>;
    case 'rejected':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Rejected</Badge>;
    default:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Pending</Badge>
      );
  }
}

export default function AdminReviewQueue() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviewsData, isLoading } = useQuery<ReviewsResponse>({
    queryKey: [
      '/api/admin/reviews',
      { status: statusFilter, platform: platformFilter, page, pageSize },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: statusFilter,
      });
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      const res = await fetch(`/api/admin/reviews?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await fetch(`/api/admin/reviews/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Review approved' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
      setSelectedReview(null);
      setReviewNotes('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await fetch(`/api/admin/reviews/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Review rejected' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
      setSelectedReview(null);
      setReviewNotes('');
    },
    onError: () => {
      toast({ title: 'Notes required for rejection', variant: 'destructive' });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async ({
      ids,
      action,
      notes,
    }: {
      ids: number[];
      action: 'approve' | 'reject';
      notes?: string;
    }) => {
      const res = await fetch('/api/admin/reviews/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids, action, notes }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (_, { action, ids }) => {
      toast({ title: `${ids.length} reviews ${action}d` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
    },
  });

  const pendingCount = reviewsData?.totalCount ?? 0;

  const columns = useMemo<ColumnDef<ReviewItem, unknown>[]>(
    () => [
      {
        accessorKey: 'task_name',
        header: 'Task',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-white text-sm">{row.original.task_name}</div>
            <div className="text-xs text-gray-500">{row.original.task_type}</div>
          </div>
        ),
      },
      {
        accessorKey: 'platform',
        header: 'Platform',
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize border-white/20 text-gray-300">
            {row.original.platform}
          </Badge>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => getPriorityBadge(row.original.priority),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: 'verification_attempts',
        header: 'Attempts',
        cell: ({ row }) => (
          <span className="text-gray-400 text-sm">{row.original.verification_attempts}</span>
        ),
      },
      {
        accessorKey: 'submitted_at',
        header: 'Submitted',
        cell: ({ row }) => (
          <span className="text-gray-400 text-sm">
            {new Date(row.original.submitted_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedReview(row.original);
              setReviewNotes('');
            }}
          >
            Review
          </Button>
        ),
      },
    ],
    []
  );

  const filterSlot = (
    <div className="flex gap-2">
      <Select
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          setPage(0);
        }}
      >
        <SelectTrigger className="w-[120px] h-9 bg-white/5 border-white/10 text-gray-300">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={platformFilter}
        onValueChange={(v) => {
          setPlatformFilter(v);
          setPage(0);
        }}
      >
        <SelectTrigger className="w-[120px] h-9 bg-white/5 border-white/10 text-gray-300">
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="twitter">Twitter</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
          <SelectItem value="tiktok">TikTok</SelectItem>
          <SelectItem value="youtube">YouTube</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <AdminLayout title="Review Queue" description="Manual task verification review queue">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <AdminStatCard
            title="Pending Reviews"
            value={pendingCount}
            description="Awaiting review"
            icon={Clock}
            loading={isLoading}
          />
          <AdminStatCard
            title="Total in Queue"
            value={reviewsData?.totalCount ?? 0}
            description={`${statusFilter === 'all' ? 'All statuses' : statusFilter}`}
            icon={ClipboardCheck}
            loading={isLoading}
          />
          <AdminStatCard
            title="Filter Active"
            value={statusFilter !== 'pending' || platformFilter !== 'all' ? 'Yes' : 'No'}
            description={`${statusFilter} / ${platformFilter}`}
            icon={ClipboardCheck}
            loading={false}
          />
        </div>

        <AdminDataTable
          columns={columns}
          data={reviewsData?.data ?? []}
          totalCount={reviewsData?.totalCount ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={isLoading}
          filterSlot={filterSlot}
          emptyMessage="No reviews in queue"
          bulkActions={[
            {
              label: 'Approve',
              variant: 'default',
              onClick: (rows: ReviewItem[]) => {
                bulkMutation.mutate({ ids: rows.map((r) => r.id), action: 'approve' });
              },
            },
            {
              label: 'Reject',
              variant: 'destructive',
              onClick: (rows: ReviewItem[]) => {
                const notes = prompt('Rejection reason (required):');
                if (notes) {
                  bulkMutation.mutate({ ids: rows.map((r) => r.id), action: 'reject', notes });
                }
              },
            },
          ]}
        />
      </div>

      {/* Review Detail Sheet */}
      <Sheet open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <SheetContent className="bg-brand-dark-bg border-white/10 w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Review Submission</SheetTitle>
          </SheetHeader>

          {selectedReview ? (
            <div className="space-y-6 mt-6">
              {/* Submission Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Submission</h3>
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Task</span>
                    <span className="text-white text-sm">{selectedReview.task_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Platform</span>
                    <span className="text-white text-sm capitalize">{selectedReview.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Type</span>
                    <span className="text-white text-sm">{selectedReview.task_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Priority</span>
                    {getPriorityBadge(selectedReview.priority)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Attempts</span>
                    <span className="text-white text-sm">
                      {selectedReview.verification_attempts}
                    </span>
                  </div>
                </div>
              </div>

              {/* Proof */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Proof</h3>
                <div className="bg-white/5 rounded-lg p-3 space-y-3">
                  {selectedReview.screenshot_url && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Screenshot</p>
                      <img
                        src={selectedReview.screenshot_url}
                        alt="Proof screenshot"
                        className="max-w-full rounded border border-white/10"
                      />
                    </div>
                  )}
                  {(selectedReview as any).proof_url && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                      <a
                        href={String(selectedReview.proof_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-primary hover:underline break-all"
                      >
                        {String(selectedReview.proof_url)}
                      </a>
                    </div>
                  )}
                  {selectedReview.proof_notes && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Notes from user</p>
                      <p className="text-sm text-gray-300">{selectedReview.proof_notes}</p>
                    </div>
                  )}
                  {!selectedReview.screenshot_url &&
                    !selectedReview.proof_url &&
                    !selectedReview.proof_notes && (
                      <p className="text-sm text-gray-500">No proof provided</p>
                    )}
                </div>
              </div>

              {/* Auto-check Result */}
              {selectedReview.auto_check_result && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-400">Auto-Check Result</h3>
                  <pre className="bg-white/5 rounded-lg p-3 text-xs text-gray-400 overflow-auto max-h-[150px]">
                    {JSON.stringify(selectedReview.auto_check_result, null, 2)}
                  </pre>
                </div>
              )}

              {/* Review Actions */}
              {selectedReview.status === 'pending' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">Your Review</h3>
                  <Textarea
                    placeholder="Review notes..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        approveMutation.mutate({ id: selectedReview.id, notes: reviewNotes })
                      }
                      disabled={approveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        rejectMutation.mutate({ id: selectedReview.id, notes: reviewNotes })
                      }
                      disabled={rejectMutation.isPending || !reviewNotes.trim()}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                  {!reviewNotes.trim() && (
                    <p className="text-xs text-gray-500">Notes are required for rejection</p>
                  )}
                </div>
              )}

              {/* Already Reviewed */}
              {selectedReview.status !== 'pending' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-400">Review Result</h3>
                  <div className="bg-white/5 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Status</span>
                      {getStatusBadge(selectedReview.status)}
                    </div>
                    {selectedReview.review_notes && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Reviewer notes</p>
                        <p className="text-sm text-gray-300">{selectedReview.review_notes}</p>
                      </div>
                    )}
                    {selectedReview.reviewed_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Reviewed at</span>
                        <span className="text-white text-sm">
                          {new Date(selectedReview.reviewed_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
