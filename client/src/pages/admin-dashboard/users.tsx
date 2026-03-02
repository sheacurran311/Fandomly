import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Eye, Shield, Ban } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string | null;
  userType: string;
  role: string;
  createdAt: string;
  lastActive: string | null;
  status: string;
}

interface UserDetail extends User {
  socialConnections: Array<{
    platform: string;
    platformUsername: string | null;
    createdAt: string;
  }>;
  taskCompletionsCount: number;
  currentPoints: number;
  totalPointsEarned: number;
  walletAddress?: string;
  primaryAuthProvider?: string;
}

interface UsersResponse {
  data: User[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'fandomly_admin':
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">Admin</Badge>;
    case 'customer_admin':
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Creator Admin</Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-white/20 text-gray-400">
          User
        </Badge>
      );
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'creator':
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">Creator</Badge>
      );
    case 'fan':
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Fan</Badge>;
    case 'suspended':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Suspended</Badge>;
    default:
      return (
        <Badge variant="outline" className="border-white/20 text-gray-400">
          {type}
        </Badge>
      );
  }
}

function formatDate(date: string | null) {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminUsers() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery<UsersResponse>({
    queryKey: [
      '/api/admin/users',
      { search, role: roleFilter, userType: typeFilter, page, pageSize },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (typeFilter !== 'all') params.set('userType', typeFilter);
      const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const { data: userDetail, isLoading: detailLoading } = useQuery<UserDetail>({
    queryKey: ['/api/admin/users', selectedUserId, 'details'],
    enabled: !!selectedUserId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${selectedUserId}/details`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch user details');
      return res.json();
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Role updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ suspended }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'User status updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const columns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        accessorKey: 'username',
        header: 'User',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-white">{row.original.username}</div>
            <div className="text-xs text-gray-500">{row.original.email || 'No email'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'userType',
        header: 'Type',
        cell: ({ row }) => getTypeBadge(row.original.userType),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => getRoleBadge(row.original.role),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-gray-400 text-sm">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: 'lastActive',
        header: 'Last Active',
        cell: ({ row }) => (
          <span className="text-gray-400 text-sm">{formatDate(row.original.lastActive)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(row.original.id)}>
            <Eye className="h-4 w-4 mr-1" />
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
        value={typeFilter}
        onValueChange={(v) => {
          setTypeFilter(v);
          setPage(0);
        }}
      >
        <SelectTrigger className="w-[120px] h-9 bg-white/5 border-white/10 text-gray-300">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="fan">Fan</SelectItem>
          <SelectItem value="creator">Creator</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={roleFilter}
        onValueChange={(v) => {
          setRoleFilter(v);
          setPage(0);
        }}
      >
        <SelectTrigger className="w-[130px] h-9 bg-white/5 border-white/10 text-gray-300">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="fandomly_admin">Admin</SelectItem>
          <SelectItem value="customer_end_user">User</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <AdminLayout title="All Users" description="Manage and monitor all platform users">
      <AdminDataTable
        columns={columns}
        data={usersData?.data ?? []}
        totalCount={usersData?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by username or email..."
        isLoading={isLoading}
        filterSlot={filterSlot}
      />

      {/* User Detail Sheet */}
      <Sheet open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <SheetContent className="bg-brand-dark-bg border-white/10 w-[400px] sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">User Details</SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : userDetail ? (
            <div className="space-y-6 mt-6">
              {/* Profile Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Profile</h3>
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Username</span>
                    <span className="text-white text-sm">{userDetail.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Email</span>
                    <span className="text-white text-sm">{userDetail.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Auth Provider</span>
                    <span className="text-white text-sm">
                      {userDetail.primaryAuthProvider || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Wallet</span>
                    <span className="text-white text-sm font-mono text-xs">
                      {userDetail.walletAddress || 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Activity</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-white">
                      {userDetail.taskCompletionsCount}
                    </div>
                    <div className="text-xs text-gray-400">Tasks Completed</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-white">
                      {userDetail.currentPoints.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">Current Points</div>
                  </div>
                </div>
              </div>

              {/* Social Connections */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">
                  Social Connections ({userDetail.socialConnections.length})
                </h3>
                <div className="space-y-1">
                  {userDetail.socialConnections.map((sc, i) => (
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
                  {userDetail.socialConnections.length === 0 && (
                    <p className="text-sm text-gray-500">No social connections</p>
                  )}
                </div>
              </div>

              {/* Role Management */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Role Management</h3>
                <div className="flex gap-2">
                  {userDetail.role !== 'fandomly_admin' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        roleMutation.mutate({ userId: userDetail.id, role: 'fandomly_admin' })
                      }
                      disabled={roleMutation.isPending}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Promote to Admin
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        roleMutation.mutate({ userId: userDetail.id, role: 'customer_end_user' })
                      }
                      disabled={roleMutation.isPending}
                    >
                      Remove Admin
                    </Button>
                  )}
                  {userDetail.userType !== 'suspended' ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        statusMutation.mutate({ userId: userDetail.id, suspended: true })
                      }
                      disabled={statusMutation.isPending}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        statusMutation.mutate({ userId: userDetail.id, suspended: false })
                      }
                      disabled={statusMutation.isPending}
                    >
                      Unsuspend
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
