import { useQuery } from '@tanstack/react-query';
import type { Task } from '@shared/schema';

/**
 * Fetch all published tasks (for fans)
 */
async function fetchPublishedTasks(tenantId?: string): Promise<{ tasks: Task[] }> {
  const url = tenantId 
    ? `/api/tasks/published?tenantId=${tenantId}`
    : '/api/tasks/published';
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch tasks');
  }

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

