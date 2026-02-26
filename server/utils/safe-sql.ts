/**
 * Safe SQL utilities to prevent SQL injection
 * Uses strict whitelists for dynamic SQL components
 */

// Whitelist of allowed leaderboard view names
const LEADERBOARD_VIEWS = {
  'campaign': {
    'all-time': 'campaign_leaderboard',
    'week': 'campaign_leaderboard_week',
    'month': 'campaign_leaderboard_month',
  },
  'platform': {
    'all-time': 'platform_leaderboard',
    'week': 'platform_leaderboard_week',
    'month': 'platform_leaderboard_month',
  },
  'program': {
    'all-time': 'program_leaderboard',
    'week': 'program_leaderboard_week',
    'month': 'program_leaderboard_month',
  },
} as const;

type LeaderboardType = keyof typeof LEADERBOARD_VIEWS;
type TimePeriod = 'all-time' | 'week' | 'month';

/**
 * Get a safe, validated leaderboard view name
 * @throws Error if invalid type or period
 */
export function getSafeLeaderboardView(type: string, period: string): string {
  const validType = type as LeaderboardType;
  const validPeriod = (period || 'all-time') as TimePeriod;
  
  if (!LEADERBOARD_VIEWS[validType]) {
    throw new Error(`Invalid leaderboard type: ${type}. Must be one of: ${Object.keys(LEADERBOARD_VIEWS).join(', ')}`);
  }
  
  const views = LEADERBOARD_VIEWS[validType];
  if (!views[validPeriod]) {
    throw new Error(`Invalid period: ${period}. Must be one of: ${Object.keys(views).join(', ')}`);
  }
  
  return views[validPeriod];
}

// Whitelist of allowed date grouping formats
const DATE_GROUP_FORMATS = {
  'daily': {
    format: 'YYYY-MM-DD',
    daysBack: 30,
    groupBy: 'DATE',
  },
  'weekly': {
    format: 'Mon DD',
    daysBack: 90,
    groupBy: "DATE_TRUNC('week', ",
    groupByEnd: ')',
  },
  'monthly': {
    format: 'YYYY-MM',
    daysBack: 365,
    groupBy: "DATE_TRUNC('month', ",
    groupByEnd: ')',
  },
  'yearly': {
    format: 'YYYY',
    daysBack: 1095,
    groupBy: "DATE_TRUNC('year', ",
    groupByEnd: ')',
  },
} as const;

type DateTimeframe = keyof typeof DATE_GROUP_FORMATS;

interface DateGroupConfig {
  format: string;
  daysBack: number;
  toCharExpr: (column: string) => string;
  groupByExpr: (column: string) => string;
}

/**
 * Get safe date grouping configuration for analytics queries
 * @throws Error if invalid timeframe
 */
export function getSafeDateGroupConfig(timeframe: string): DateGroupConfig {
  const config = DATE_GROUP_FORMATS[timeframe as DateTimeframe];
  
  if (!config) {
    throw new Error(`Invalid timeframe: ${timeframe}. Must be one of: ${Object.keys(DATE_GROUP_FORMATS).join(', ')}`);
  }
  
  // Build safe SQL expressions
  const toCharExpr = (column: string) => {
    // Validate column name contains only safe characters
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
    
    if ('groupByEnd' in config) {
      return `TO_CHAR(${config.groupBy}${column}${config.groupByEnd}, '${config.format}')`;
    }
    return `TO_CHAR(${config.groupBy}(${column}), '${config.format}')`;
  };
  
  const groupByExpr = (column: string) => {
    // Validate column name contains only safe characters
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
    
    if ('groupByEnd' in config) {
      return `${config.groupBy}${column}${config.groupByEnd}`;
    }
    return `${config.groupBy}(${column})`;
  };
  
  return {
    format: config.format,
    daysBack: config.daysBack,
    toCharExpr,
    groupByExpr,
  };
}

/**
 * Validate and sanitize a column name for safe SQL usage
 * Only allows alphanumeric, underscores, and dots (for table.column)
 */
export function validateColumnName(column: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(column)) {
    throw new Error(`Invalid column name: ${column}`);
  }
  return column;
}

/**
 * Validate and return a safe table/view name
 * Only allows alphanumeric and underscores
 */
export function validateTableName(table: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error(`Invalid table/view name: ${table}`);
  }
  return table;
}
