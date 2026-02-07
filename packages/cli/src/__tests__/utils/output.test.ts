import { describe, it, expect } from 'vitest';
import { formatNumber, formatCost, formatDate } from '../../utils/output.js';

describe('formatNumber', () => {
  it('should format 0', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should format 1000 with locale separators', () => {
    const result = formatNumber(1000);
    // toLocaleString output varies by environment, but should contain "1" and "000"
    expect(result).toContain('1');
    expect(result).toContain('000');
    // In en-US locale, it should be "1,000"
    expect(result).toBe('1,000');
  });

  it('should format 1000000 with locale separators', () => {
    const result = formatNumber(1000000);
    expect(result).toBe('1,000,000');
  });

  it('should format negative numbers', () => {
    const result = formatNumber(-1234);
    expect(result).toContain('1');
    expect(result).toContain('234');
    // Should include a negative sign
    expect(result).toMatch(/^-/);
  });
});

describe('formatCost', () => {
  it('should format 0 as $0.0000', () => {
    expect(formatCost(0)).toBe('$0.0000');
  });

  it('should format small values with 4 decimal places', () => {
    expect(formatCost(0.0001)).toBe('$0.0001');
  });

  it('should format and round to 4 decimal places', () => {
    expect(formatCost(1.2345)).toBe('$1.2345');
  });

  it('should format whole dollar amounts with trailing zeros', () => {
    expect(formatCost(100)).toBe('$100.0000');
  });

  it('should truncate beyond 4 decimal places', () => {
    // 0.00005 rounds to 0.0001 at 4 decimal places
    expect(formatCost(0.00005)).toBe('$0.0001');
  });
});

describe('formatDate', () => {
  it('should format a valid ISO date string into a readable date', () => {
    const result = formatDate('2024-06-15T14:30:00Z');
    // Should contain month, day, year, and time components
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should include time components in the output', () => {
    // Use a mid-day time to avoid timezone date-boundary shifts
    const result = formatDate('2024-03-15T12:00:00Z');
    expect(result).toContain('Mar');
    expect(result).toContain('15');
    expect(result).toContain('2024');
    // The result should contain a colon from the time portion (HH:MM)
    expect(result).toContain(':');
  });

  it('should handle date-only ISO strings', () => {
    // Date-only strings are parsed as UTC midnight; use mid-month to avoid
    // day-boundary shift in any timezone
    const result = formatDate('2023-07-15');
    expect(result).toContain('Jul');
    expect(result).toContain('2023');
    // Day could be 14 or 15 depending on local timezone offset
    expect(result).toMatch(/1[45]/);
  });
});
