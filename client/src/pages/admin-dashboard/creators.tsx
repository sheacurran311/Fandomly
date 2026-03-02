import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Users, Store, Award, CheckCircle, XCircle } from 'lucide-react';

interface Creator {
  id: string;
  userId: string;
  username: string;
  email: string | null;
  displayName: string;
  tenantName: string | null;
  tenantSlug: string | null;
  isVerified: boolean;
  category: string;
  subscriptionTier: string | null;
  tenantStatus: string | null;
  fanCount: number;
  createdAt: string;
}

interface CreatorDetail extends Creator {
  socialConnections: Array<{ platform: string; platformUsername: string | null }>;
  taskCount: number;
  tenant?: { name: string; slug: string; status: string; subscriptionTier: string };
  user?: { username: string; email: string };
}

interface CreatorsResponse {
  data: Creator[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export default function AdminCreators() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: creatorsData, isLoading } = useQuery<CreatorsResponse>({
    queryKey: [
      '/api/admin/creators',
      { search, tier: tierFilter, verified: verifiedFilter, page, pageSize },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set('search', search);
      if (tierFilter !== 'all') params.set('tier', tierFilter);
      if (verifiedFilter !== 'all') params.set('verified', verifiedFilter);
      const res = await fetch(`/api/admin/creators?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch creators');
      return res.json();
    },
  });

  const { data: creatorDetail, isLoading: detailLoading } = useQuery<CreatorDetail>({
    queryKey: ['/api/admin/creators', selectedCreatorId, 'details'],
    enabled: !!selectedCreatorId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/creators/${selectedCreatorId}/details`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch creator details');
      return res.json();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({
      creatorId,
      approved,
      notes,
    }: {
      creatorId: string;
      approved: boolean;
      notes: string;
    }) => {
      const res = await fetch(`/api/admin/creators/${creatorId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approved, notes }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (_, { approved }) => {
      toast({ title: approved ? 'Creator verified' : 'Verification rejected' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/creators'] });
      setVerifyNotes('');
    },
  });

  const tierMutation = useMutation({
    mutationFn: async ({ creatorId, tier }: { creatorId: string; tier: string }) => {
      const res = await fetch(`/api/admin/creators/${creatorId}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Tier updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/creators'] });
    },
  });

  // Stats from the data
  const totalCreators = creatorsData?.totalCount ?? 0;
  const verifiedCount = creatorsData?.data.filter((c) => c.isVerified).length ?? 0;
  const totalFans = creatorsData?.data.reduce((sum, c) => sum + c.fanCount, 0) ?? 0;

  const columns = useMemo<ColumnDef<Creator, unknown>[]>(
    () => [
      {
        accessorKey: 'displayName',
        header: 'Creator',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-white">{row.original.displayName}</div>
            <div className="text-xs text-gray-500">@{row.original.username}</div>
          </div>
        ),
      },
      {
        accessorKey: 'tenantName',
        header: 'Tenant',
        cell: ({ row }) => (
          <div>
            <div className="text-white text-sm">{row.original.tenantName || 'N/A'}</div>
            <div className="text-xs text-gray-500">{row.original.tenantSlug || ''}</div>
          </div>
        ),
      },
      {
        accessorKey: 'fanCount',
        header: 'Fans',
        cell: ({ row }) => <span className="text-gray-300">{row.original.fanCount}</span>,
      },
      {
        accessorKey: 'subscriptionTier',
        header: 'Tier',
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize border-white/20 text-gray-300">
            {row.original.subscriptionTier || 'starter'}
          </Badge>
        ),
      },
      {
        accessorKey: 'isVerified',
        header: 'Verified',
        cell: ({ row }) =>
          row.original.isVerified ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Verified</Badge>
          ) : (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
              Unverified
            </Badge>
          ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-gray-400 text-sm">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => setSelectedCreatorId(row.original.id)}>
            View
          </Button>
        ),
      },
    ],
    []
  );

  const filterSlot = (
    <div className="flex gap-2">
      <Select
        value={verifiedFilter}
        onValueChange={(v) => {
          setVerifiedFilter(v);
          setPage(0);
        }}
      >
        <SelectTrigger className="w-[130px] h-9 bg-white/5 border-white/10 text-gray-300">
          <SelectValue placeholder="Verified" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="true">Verified</SelectItem>
          <SelectItem value="false">Unverified</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={tierFilter}
        onValueChange={(v) => {
          setTierFilter(v);
          setPage(0);
        }}
      >
        <SelectTrigger className="w-[120px] h-9 bg-white/5 border-white/10 text-gray-300">
          <SelectValue placeholder="Tier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tiers</SelectItem>
          <SelectItem value="starter">Starter</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
          <SelectItem value="business">Business</SelectItem>
          <SelectItem value="enterprise">Enterprise</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <AdminLayout title="Creators" description="Manage creator accounts, verification, and tiers">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <AdminStatCard
            title="Total Creators"
            value={totalCreators}
            description="Across all tiers"
            icon={Store}
            loading={isLoading}
          />
          <AdminStatCard
            title="Verified"
            value={verifiedCount}
            description="Of current page"
            icon={Award}
            loading={isLoading}
          />
          <AdminStatCard
            title="Total Fans"
            value={totalFans}
            description="Across current page"
            icon={Users}
            loading={isLoading}
          />
        </div>

        {/* Table */}
        <AdminDataTable
          columns={columns}
          data={creatorsData?.data ?? []}
          totalCount={creatorsData?.totalCount ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, username, or email..."
          isLoading={isLoading}
          filterSlot={filterSlot}
        />
      </div>

      {/* Creator Detail Sheet */}
      <Sheet
        open={!!selectedCreatorId}
        onOpenChange={(open) => !open && setSelectedCreatorId(null)}
      >
        <SheetContent className="bg-brand-dark-bg border-white/10 w-[400px] sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Creator Details</SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : creatorDetail ? (
            <div className="space-y-6 mt-6">
              {/* Profile Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Profile</h3>
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Display Name</span>
                    <span className="text-white text-sm">{creatorDetail.displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Category</span>
                    <span className="text-white text-sm capitalize">{creatorDetail.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Tasks</span>
                    <span className="text-white text-sm">{creatorDetail.taskCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Fans</span>
                    <span className="text-white text-sm">{creatorDetail.fanCount}</span>
                  </div>
                </div>
              </div>

              {/* Social Connections */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Social Connections</h3>
                <div className="space-y-1">
                  {creatorDetail.socialConnections.map((sc, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white/5 rounded-lg p-2"
                    >
                      <span className="text-sm text-white capitalize">{sc.platform}</span>
                      <span className="text-sm text-gray-400">
                        {sc.platformUsername || 'Connected'}
                      </span>
                    </div>
                  ))}
                  {creatorDetail.socialConnections.length === 0 && (
                    <p className="text-sm text-gray-500">No social connections</p>
                  )}
                </div>
              </div>

              {/* Verification */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Verification</h3>
                <div className="bg-white/5 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Status:</span>
                    {creatorDetail.isVerified ? (
                      <Badge className="bg-green-500/20 text-green-400">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    placeholder="Verification notes..."
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        verifyMutation.mutate({
                          creatorId: creatorDetail.id,
                          approved: true,
                          notes: verifyNotes,
                        })
                      }
                      disabled={verifyMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        verifyMutation.mutate({
                          creatorId: creatorDetail.id,
                          approved: false,
                          notes: verifyNotes,
                        })
                      }
                      disabled={verifyMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tier Management */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Subscription Tier</h3>
                <Select
                  value={creatorDetail.subscriptionTier || 'starter'}
                  onValueChange={(v) =>
                    tierMutation.mutate({ creatorId: creatorDetail.id, tier: v })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
