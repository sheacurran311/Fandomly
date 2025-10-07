/**
 * React Query hooks for Points System
 * 
 * Hooks for fetching and managing:
 * - Fandomly Points (platform currency)
 * - Creator Points (per-creator currency)
 * - Transaction history
 */

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// ============================================================================
// TYPES
// ============================================================================

export interface PointsBalance {
  userId: string;
  fandomlyPoints: number;
  creatorPoints: Record<string, number>;
}

export interface PointTransaction {
  id: string;
  userId: string;
  tenantId?: string;
  amount: number;
  type: 'earned' | 'spent' | 'bonus' | 'refund';
  source: string;
  description?: string;
  metadata?: any;
  createdAt: string;
}

export interface TransactionHistory {
  fandomly: PointTransaction[];
  creator: PointTransaction[];
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get user's complete points balance
 */
export function usePointsBalance() {
  return useQuery({
    queryKey: ['points-balance'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/points/balance');
      return response.json() as Promise<PointsBalance>;
    },
  });
}

/**
 * Get Fandomly Points balance only
 */
export function useFandomlyPoints() {
  return useQuery({
    queryKey: ['fandomly-points'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/points/fandomly');
      return response.json() as Promise<{ balance: number }>;
    },
  });
}

/**
 * Get Creator Points balance for a specific creator
 */
export function useCreatorPoints(creatorId: string, tenantId: string) {
  return useQuery({
    queryKey: ['creator-points', creatorId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/points/creator/${creatorId}?tenantId=${tenantId}`);
      return response.json() as Promise<{ balance: number }>;
    },
    enabled: !!creatorId && !!tenantId,
  });
}

/**
 * Get all transaction history
 */
export function useTransactionHistory(limit: number = 50) {
  return useQuery({
    queryKey: ['point-transactions', limit],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/points/transactions?limit=${limit}`);
      return response.json() as Promise<TransactionHistory>;
    },
  });
}

/**
 * Format points for display
 */
export function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toString();
}

/**
 * Get transaction type color
 */
export function getTransactionColor(type: PointTransaction['type']): string {
  switch (type) {
    case 'earned':
    case 'bonus':
      return 'text-green-400';
    case 'spent':
      return 'text-red-400';
    case 'refund':
      return 'text-blue-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get transaction type icon
 */
export function getTransactionIcon(type: PointTransaction['type']): string {
  switch (type) {
    case 'earned':
      return '+';
    case 'spent':
      return '-';
    case 'bonus':
      return '⭐';
    case 'refund':
      return '↩';
    default:
      return '';
  }
}

