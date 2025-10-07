import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users, TrendingUp, DollarSign, Award } from "lucide-react";

interface Creator {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  tenantName?: string;
  tenantSlug?: string;
  isVerified: boolean;
  subscriptionTier?: string;
  status?: string;
  createdAt: Date;
}

export default function AdminCreators() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  const { data: creators = [], isLoading } = useQuery<Creator[]>({
    queryKey: ["/api/admin/creators"],
  });

  // Filter creators
  const filteredCreators = creators.filter((creator) => {
    const matchesSearch = 
      creator.username?.toLowerCase().includes(search.toLowerCase()) ||
      creator.email?.toLowerCase().includes(search.toLowerCase()) ||
      creator.displayName?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || creator.status === statusFilter;
    const matchesTier = tierFilter === "all" || creator.subscriptionTier === tierFilter;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  // Calculate stats
  const stats = {
    total: creators.length,
    verified: creators.filter(c => c.isVerified).length,
    active: creators.filter(c => c.status === 'active').length,
    revenue: 0, // TODO: Calculate from transactions
  };

  return (
    <AdminLayout
      title="Creators"
      description="Manage all creator accounts and tenants"
    >
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Creators
            </CardTitle>
            <Users className="h-4 w-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Verified
            </CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.verified}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Active Tenants
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${stats.revenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by username, email, or display name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Creators Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">All Creators</CardTitle>
          <CardDescription className="text-gray-400">
            {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading creators...</div>
          ) : filteredCreators.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No creators found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Creator</TableHead>
                  <TableHead className="text-gray-400">Tenant</TableHead>
                  <TableHead className="text-gray-400">Tier</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Verified</TableHead>
                  <TableHead className="text-gray-400">Joined</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreators.map((creator) => (
                  <TableRow key={creator.id} className="border-white/10">
                    <TableCell>
                      <div>
                        <div className="font-medium text-white">{creator.displayName}</div>
                        <div className="text-sm text-gray-400">@{creator.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-white">{creator.tenantName || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{creator.tenantSlug || ''}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {creator.subscriptionTier || 'starter'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={creator.status === 'active' ? 'default' : 'secondary'}
                      >
                        {creator.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {creator.isVerified ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-400">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unverified</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {new Date(creator.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-brand-primary">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

