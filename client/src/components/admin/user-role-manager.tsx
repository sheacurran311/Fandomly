import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Shield, 
  Crown,
  UserCheck,
  Search,
  Filter,
  ChevronDown,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: 'fandomly_admin' | 'customer_admin' | 'customer_end_user';
  customerTier?: 'basic' | 'premium' | 'vip';
  walletAddress?: string;
  createdAt: string;
}

// Mock user data - in production, this would come from API
const mockUsers: User[] = [
  {
    id: '1',
    username: 'john_creator',
    email: 'john@example.com',
    role: 'customer_admin',
    walletAddress: '0x742...9a3e',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2', 
    username: 'sarah_fan',
    email: 'sarah@example.com',
    role: 'customer_end_user',
    customerTier: 'premium',
    walletAddress: '0x123...4567',
    createdAt: '2024-01-20T14:22:00Z'
  },
  {
    id: '3',
    username: 'admin_mike',
    email: 'mike@fandomly.com',
    role: 'fandomly_admin',
    walletAddress: '0x789...abc1',
    createdAt: '2024-01-10T09:15:00Z'
  }
];

export default function UserRoleManager() {
  const [users] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Mutation for updating user role
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, newRole, customerTier }: { 
      userId: string; 
      newRole: string; 
      customerTier?: string; 
    }) => {
      return await apiRequest(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole, customerTier }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      setSelectedUser(null);
    },
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'fandomly_admin':
        return <Shield className="h-4 w-4 text-purple-400" />;
      case 'customer_admin':
        return <Crown className="h-4 w-4 text-brand-primary" />;
      case 'customer_end_user':
        return <UserCheck className="h-4 w-4 text-brand-secondary" />;
      default:
        return <Users className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'fandomly_admin':
        return "bg-purple-500/20 text-purple-400";
      case 'customer_admin':
        return "bg-brand-primary/20 text-brand-primary";
      case 'customer_end_user':
        return "bg-brand-secondary/20 text-brand-secondary";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const handleRoleChange = (newRole: string, customerTier?: string) => {
    if (!selectedUser) return;
    
    updateUserRole.mutate({
      userId: selectedUser.id,
      newRole,
      customerTier
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white">User Role Management</h2>
          <p className="text-gray-400">Manage user roles and permissions across the platform</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-500/20 text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            {users.length} Total Users
          </Badge>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card className="bg-white/5 backdrop-blur-lg border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-400"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="fandomly_admin">Fandomly Admins</SelectItem>
                  <SelectItem value="customer_admin">Customer Admins</SelectItem>
                  <SelectItem value="customer_end_user">End Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-white/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{user.username}</h3>
                    <p className="text-gray-400">{user.email}</p>
                    {user.walletAddress && (
                      <p className="text-xs text-gray-500 font-mono">{user.walletAddress}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      {getRoleIcon(user.role)}
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                    {user.customerTier && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                        {user.customerTier.toUpperCase()} Tier
                      </Badge>
                    )}
                  </div>

                  <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (open) setSelectedUser(user);
                    else setSelectedUser(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                        Change Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-brand-dark-bg border-white/10">
                      <DialogHeader>
                        <DialogTitle className="text-white">Change User Role</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Update the role and permissions for {user.username}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 mt-4">
                        <Alert className="border-yellow-500/20 bg-yellow-500/10">
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          <AlertDescription className="text-yellow-400">
                            Changing user roles will immediately update their access permissions.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                          <Label className="text-white">Select New Role</Label>
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              className="w-full justify-start border-purple-500/20 hover:bg-purple-500/10"
                              onClick={() => handleRoleChange('fandomly_admin')}
                              disabled={updateUserRole.isPending}
                            >
                              <Shield className="h-4 w-4 mr-2 text-purple-400" />
                              Fandomly Admin - Full platform access
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start border-brand-primary/20 hover:bg-brand-primary/10"
                              onClick={() => handleRoleChange('customer_admin')}
                              disabled={updateUserRole.isPending}
                            >
                              <Crown className="h-4 w-4 mr-2 text-brand-primary" />
                              Customer Admin - Creator/Store owner
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start border-brand-secondary/20 hover:bg-brand-secondary/10"
                              onClick={() => handleRoleChange('customer_end_user', 'basic')}
                              disabled={updateUserRole.isPending}
                            >
                              <UserCheck className="h-4 w-4 mr-2 text-brand-secondary" />
                              Customer End User - Fan/Participant
                            </Button>
                          </div>
                        </div>

                        {updateUserRole.isError && (
                          <Alert className="border-red-500/20 bg-red-500/10">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <AlertDescription className="text-red-400">
                              Failed to update user role. Please try again.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Users Found</h3>
            <p className="text-gray-400">
              {searchTerm || roleFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "No users are currently registered"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
