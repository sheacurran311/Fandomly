/**
 * Dynamic Analytics Service
 * 
 * Integrates with Dynamic's Analytics API to fetch wallet and visit data.
 * 
 * API Documentation:
 * - https://www.dynamic.xyz/docs/api-reference/analytics/get-environments-analyticswallets
 * - https://www.dynamic.xyz/docs/api-reference/analytics/get-environments-analyticsvisits
 * - https://www.dynamic.xyz/docs/api-reference/analytics/get-analytics-overview-data
 */

const DYNAMIC_API_BASE = 'https://app.dynamic.xyz/api/v0';

interface DynamicAnalyticsOptions {
  environmentId: string;
  apiToken: string;
}

export class DynamicAnalyticsService {
  private environmentId: string;
  private apiToken: string;

  constructor(options: DynamicAnalyticsOptions) {
    this.environmentId = options.environmentId;
    this.apiToken = options.apiToken;
  }

  private async fetchDynamicAPI(endpoint: string, queryParams?: Record<string, string>) {
    // Replace {environmentId} placeholder in endpoint
    const resolvedEndpoint = endpoint.replace('{environmentId}', this.environmentId);
    const url = new URL(`${DYNAMIC_API_BASE}${resolvedEndpoint}`);
    
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    console.log(`[Dynamic Analytics] Fetching: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Dynamic Analytics] API Error: ${response.status} - ${error}`);
      throw new Error(`Dynamic API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get wallet analytics for the environment
   * Returns data about wallet connections, types, and chains
   */
  async getWalletAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await this.fetchDynamicAPI(
        `/environments/{environmentId}/analytics/wallets`,
        params
      );

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[Dynamic Analytics] Error fetching wallet analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  }

  /**
   * Get visit analytics for the environment
   * Returns data about unique visitors and sessions
   */
  async getVisitAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await this.fetchDynamicAPI(
        `/environments/{environmentId}/analytics/visits`,
        params
      );

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[Dynamic Analytics] Error fetching visit analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  }

  /**
   * Get overview analytics
   * Returns high-level platform metrics
   */
  async getOverviewAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await this.fetchDynamicAPI(
        `/environments/{environmentId}/analytics/overview`,
        params
      );

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[Dynamic Analytics] Error fetching overview analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  }

  /**
   * Get topline analytics data
   * Returns key metrics and KPIs
   */
  async getToplineAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await this.fetchDynamicAPI(
        `/environments/{environmentId}/analytics/topline`,
        params
      );

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[Dynamic Analytics] Error fetching topline analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  }

  /**
   * Get engagement analytics
   * Returns data about user engagement and activity
   */
  async getEngagementAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await this.fetchDynamicAPI(
        `/environments/{environmentId}/analytics/engagement`,
        params
      );

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[Dynamic Analytics] Error fetching engagement analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  }

  /**
   * Get wallet breakdown analytics
   * Returns detailed breakdown of wallet types and chains
   */
  async getWalletBreakdownAnalytics(startDate?: string, endDate?: string) {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await this.fetchDynamicAPI(
        `/environments/{environmentId}/analytics/wallets/breakdown`,
        params
      );

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[Dynamic Analytics] Error fetching wallet breakdown:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  }

  /**
   * Get all users for the environment
   * Returns list of users with wallet information
   */
  async getAllUsers(limit?: number, offset?: number) {
    try {
      const params: Record<string, string> = {};
      if (limit) params.limit = limit.toString();
      if (offset) params.offset = offset.toString();

      const data = await this.fetchDynamicAPI(
        `/environments/{environmentId}/users`,
        params
      );

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[Dynamic Analytics] Error fetching users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  }
}

// Singleton instance
let dynamicAnalyticsService: DynamicAnalyticsService | null = null;

export function initializeDynamicAnalytics() {
  const environmentId = process.env.DYNAMIC_ENVIRONMENT_ID;
  const apiToken = process.env.DYNAMIC_API_KEY || process.env.DYNAMIC_API_TOKEN;

  if (!environmentId || !apiToken) {
    console.warn('⚠️  Dynamic Analytics not configured. Set DYNAMIC_ENVIRONMENT_ID and DYNAMIC_API_KEY in .env');
    return null;
  }

  dynamicAnalyticsService = new DynamicAnalyticsService({
    environmentId,
    apiToken,
  });

  console.log('✅ Dynamic Analytics Service initialized');
  return dynamicAnalyticsService;
}

export function getDynamicAnalyticsService() {
  if (!dynamicAnalyticsService) {
    return initializeDynamicAnalytics();
  }
  return dynamicAnalyticsService;
}

