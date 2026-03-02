import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Building2, Users, TrendingUp, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';

interface Agency {
  id: string;
  name: string;
  ownerUserId: string;
  website?: string;
  dataIsolationLevel: 'strict' | 'aggregated' | 'shared';
  allowCrossBrandAnalytics: boolean;
  createdAt: string;
  brandCount?: number;
  ownerUsername?: string;
}

export default function AdminAgencies() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: agencies, isLoading } = useQuery<Agency[]>({
    queryKey: ['/api/admin/agencies', { search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/agencies?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch agencies');
      return response.json();
    },
  });

  const getIsolationBadge = (level: string) => {
    switch (level) {
      case 'strict':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Strict</Badge>;
      case 'aggregated':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
            Aggregated
          </Badge>
        );
      case 'shared':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Shared</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalBrands = agencies?.reduce((sum, agency) => sum + (agency.brandCount || 0), 0) || 0;

  return (
    <AdminLayout title="Agency Management" description="Manage agencies and multi-brand accounts">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <AdminStatCard
          title="Total Agencies"
          value={agencies?.length || 0}
          description="Active agency accounts"
          icon={Building2}
          loading={isLoading}
        />
        <AdminStatCard
          title="Managed Brands"
          value={totalBrands}
          description="Brands under management"
          icon={Users}
          loading={isLoading}
        />
        <AdminStatCard
          title="Avg Brands/Agency"
          value={agencies?.length ? (totalBrands / agencies.length).toFixed(1) : '0'}
          description="Average portfolio size"
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      {/* Agencies Table */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          {/* Search */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search agencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-gray-400">Agency Name</TableHead>
                  <TableHead className="text-gray-400">Owner</TableHead>
                  <TableHead className="text-gray-400">Brands</TableHead>
                  <TableHead className="text-gray-400">Data Isolation</TableHead>
                  <TableHead className="text-gray-400">Analytics</TableHead>
                  <TableHead className="text-gray-400">Created</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/10">
                      <TableCell>
                        <Skeleton className="h-8 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : agencies && agencies.length > 0 ? (
                  agencies.map((agency) => (
                    <TableRow key={agency.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{agency.name}</div>
                          {agency.website && (
                            <a
                              href={agency.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-400 hover:underline"
                            >
                              {agency.website}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-gray-300">{agency.ownerUsername || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">
                          {agency.ownerUserId.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                          {agency.brandCount || 0} brands
                        </Badge>
                      </TableCell>
                      <TableCell>{getIsolationBadge(agency.dataIsolationLevel)}</TableCell>
                      <TableCell>
                        {agency.allowCrossBrandAnalytics ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-500/50 text-gray-400">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatDate(agency.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin-dashboard/agencies/${agency.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-300 hover:text-white"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      {searchQuery ? 'No agencies match your search.' : 'No agencies created yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
