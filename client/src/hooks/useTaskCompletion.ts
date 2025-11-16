import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TaskCompletion, RewardDistribution } from '@shared/schema';

// ==========================================
// API Functions
// ==========================================

/**
 * Fetch all task completions for the current user
 */
async function fetchUserTaskCompletions(tenantId?: string): Promise<{ completions: TaskCompletion[] }> {
  const url = tenantId 
    ? `/api/task-completions/me?tenantId=${tenantId}`
    : '/api/task-completions/me';
  
  // Use apiRequest for proper authentication
  const { apiRequest } = await import('@/lib/queryClient');
  return await apiRequest('GET', url);
}

/**
 * Fetch task completion for a specific task
 */
async function fetchTaskCompletion(taskId: string): Promise<{ completion: TaskCompletion }> {
  try {
    const { apiRequest } = await import('@/lib/queryClient');
    const response = await apiRequest('GET', `/api/task-completions/${taskId}`);
    return response.json();
  } catch (error: any) {
    // Return null completion for 404 (task not started yet)
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return { completion: null as any };
    }
    throw error;
  }
}

/**
 * Start a task
 */
async function startTask(data: { taskId: string; tenantId: string }): Promise<{ completion: TaskCompletion }> {
  const { apiRequest } = await import('@/lib/queryClient');
  const response = await apiRequest('POST', '/api/task-completions/start', data);
  return response.json();
}

/**
 * Update task progress
 */
async function updateTaskProgress(data: {
  completionId: string;
  progress: number;
  completionData?: Record<string, any>;
}): Promise<{ completion: TaskCompletion }> {
  const { completionId, ...body } = data;
  const { apiRequest } = await import('@/lib/queryClient');
  const response = await apiRequest('PATCH', `/api/task-completions/${completionId}/progress`, body);
  return response.json();
}

/**
 * Complete a task
 */
async function completeTask(data: {
  completionId: string;
  completionData?: Record<string, any>;
  verificationMethod?: 'auto' | 'manual' | 'api';
}): Promise<{
  completion: TaskCompletion;
  reward: RewardDistribution;
  pointsAwarded: number;
}> {
  const { completionId, ...body } = data;
  const { apiRequest } = await import('@/lib/queryClient');
  const response = await apiRequest('POST', `/api/task-completions/${completionId}/complete`, body);
  return response.json();
}

/**
 * Check in (for daily check-in tasks)
 */
async function checkIn(data: {
  taskId: string;
  tenantId: string;
}): Promise<{
  completion: TaskCompletion;
  reward: RewardDistribution;
  pointsAwarded: number;
  streak: number;
  nextCheckIn: Date;
}> {
  const { taskId, ...body } = data;
  const { apiRequest } = await import('@/lib/queryClient');
  const response = await apiRequest('POST', `/api/task-completions/${taskId}/check-in`, body);
  return response.json();
}

// ==========================================
// React Query Hooks
// ==========================================

/**
 * Hook to fetch all user's task completions
 */
export function useUserTaskCompletions(tenantId?: string) {
  return useQuery({
    queryKey: ['task-completions', 'me', tenantId],
    queryFn: () => fetchUserTaskCompletions(tenantId),
  });
}

/**
 * Hook to fetch a specific task completion
 */
export function useTaskCompletion(taskId: string, enabled = true) {
  return useQuery({
    queryKey: ['task-completion', taskId],
    queryFn: () => fetchTaskCompletion(taskId),
    enabled,
  });
}

/**
 * Hook to start a task
 */
export function useStartTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startTask,
    onSuccess: (data, variables) => {
      // Invalidate user's completions list
      queryClient.invalidateQueries({ queryKey: ['task-completions', 'me'] });
      
      // Set the new completion in cache
      queryClient.setQueryData(['task-completion', variables.taskId], data);
    },
  });
}

/**
 * Hook to update task progress
 */
export function useUpdateTaskProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTaskProgress,
    onSuccess: (data, variables) => {
      // Update the completion in cache
      queryClient.setQueryData(['task-completion', data.completion.taskId], data);
      
      // Invalidate user's completions list
      queryClient.invalidateQueries({ queryKey: ['task-completions', 'me'] });
    },
  });
}

/**
 * Hook to complete a task
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeTask,
    onSuccess: (data, variables) => {
      // Update the completion in cache
      queryClient.setQueryData(['task-completion', data.completion.taskId], { completion: data.completion });
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['task-completions', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Refresh user points balance
    },
  });
}

/**
 * Hook for daily check-in
 */
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkIn,
    onSuccess: (data, variables) => {
      // Update the completion in cache
      queryClient.setQueryData(['task-completion', variables.taskId], { completion: data.completion });
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['task-completions', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Calculate task progress percentage
 */
export function calculateTaskProgress(completion?: TaskCompletion): number {
  if (!completion) return 0;
  return completion.progress || 0;
}

/**
 * Check if a task is completed
 */
export function isTaskCompleted(completion?: TaskCompletion): boolean {
  if (!completion) return false;
  return completion.status === 'completed' || completion.status === 'claimed';
}

/**
 * Check if a task is in progress
 */
export function isTaskInProgress(completion?: TaskCompletion): boolean {
  if (!completion) return false;
  return completion.status === 'in_progress';
}

/**
 * Get the current streak for check-in tasks
 */
export function getCurrentStreak(completion?: TaskCompletion): number {
  if (!completion) return 0;
  return completion.completionData?.currentStreak || 0;
}

/**
 * Check if user can check in today
 */
export function canCheckInToday(completion?: TaskCompletion): boolean {
  if (!completion) return true;
  
  const lastCheckIn = completion.completionData?.lastCheckIn;
  if (!lastCheckIn) return true;
  
  const lastCheckInDate = new Date(lastCheckIn);
  const today = new Date();
  
  return lastCheckInDate.toDateString() !== today.toDateString();
}

/**
 * Get next check-in time
 */
export function getNextCheckInTime(completion?: TaskCompletion): Date | null {
  if (!completion) return null;
  
  const lastCheckIn = completion.completionData?.lastCheckIn;
  if (!lastCheckIn) return null;
  
  const lastCheckInDate = new Date(lastCheckIn);
  const nextCheckIn = new Date(lastCheckInDate);
  nextCheckIn.setDate(nextCheckIn.getDate() + 1);
  nextCheckIn.setHours(0, 0, 0, 0);
  
  return nextCheckIn;
}

