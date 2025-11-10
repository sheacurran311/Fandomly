import { useQuery } from '@tanstack/react-query';
import type { Task } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

/**
 * Fetch all published tasks (for fans)
 * Server-side filters to only return tasks from programs the fan has joined
 */
async function fetchPublishedTasks(tenantId?: string): Promise<{ tasks: Task[] }> {
  const url = tenantId 
    ? `/api/tasks/published?tenantId=${tenantId}`
    : '/api/tasks/published';
  
  const response = await apiRequest('GET', url);
  return response.json();
}

/**
 * Hook to fetch all published tasks
 */
export function useTasks(tenantId?: string) {
  return useQuery({
    queryKey: ['tasks', 'published', tenantId],
    queryFn: () => fetchPublishedTasks(tenantId),
  });
}

