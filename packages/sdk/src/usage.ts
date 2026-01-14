import type { HttpClient } from './http.js';
import type { UsageSummary, UsageSummaryResponse, DailyUsage, DailyUsageResponse } from './types.js';

/**
 * API for accessing usage statistics
 */
export class UsageAPI {
  constructor(private client: HttpClient) {}

  /**
   * Get usage summary for a period
   * @param options - Options including number of days (default: 30)
   * @returns Usage summary with totals
   */
  async summary(options?: { days?: number }): Promise<UsageSummary> {
    const response = await this.client.request<UsageSummaryResponse>('GET', '/usage', {
      query: { days: options?.days },
    });

    return {
      total_invocations: response.total_invocations,
      total_input_tokens: response.total_input_tokens,
      total_output_tokens: response.total_output_tokens,
      total_cost_usd: parseFloat(response.total_cost_usd),
      period_start: response.period_start,
      period_end: response.period_end,
    };
  }

  /**
   * Get daily usage breakdown
   * @param options - Options including number of days (default: 7)
   * @returns Array of daily usage stats
   */
  async daily(options?: { days?: number }): Promise<DailyUsage[]> {
    const response = await this.client.request<DailyUsageResponse>('GET', '/usage/daily', {
      query: { days: options?.days },
    });

    return response.daily_usage.map((day) => ({
      date: day.date,
      invocation_count: day.invocation_count,
      input_tokens: day.input_tokens,
      output_tokens: day.output_tokens,
      cost_usd: parseFloat(day.cost_usd),
    }));
  }
}
