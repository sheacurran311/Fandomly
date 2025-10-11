import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminPlatformTasks from "@/components/admin/AdminPlatformTasks";

export default function AdminTasks() {
  return (
    <AdminLayout
      title="Platform Tasks"
      description="Manage platform-wide tasks that award Fandomly Points to all users"
    >
      <AdminPlatformTasks />
    </AdminLayout>
  );
}

