import type { TimezoneResult } from '../types/fingerprint';

// German timezone
const GERMAN_TIMEZONE = 'Europe/Berlin';

export function collectTimezoneInfo(): TimezoneResult {
  try {
    // Get timezone using Intl API
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Get timezone offset in minutes
    const offset = new Date().getTimezoneOffset();
    
    // Check if timezone matches German timezone
    const isGermanTimezone = timezone === GERMAN_TIMEZONE;
    
    // IP timezone mismatch would be detected server-side or via IP lookup
    // For now, we assume it matches if timezone is German
    const ipTimezoneMismatch = false;
    
    return {
      timezone,
      isGermanTimezone,
      offset,
      ipTimezoneMismatch
    };
  } catch (error) {
    console.error('Timezone info error:', error);
    return {
      timezone: 'Unknown',
      isGermanTimezone: false,
      offset: 0,
      ipTimezoneMismatch: true
    };
  }
}

// Additional timezone validation
export function validateTimezoneConsistency(): {
  isConsistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  try {
    // Check if timezone APIs return consistent results
    const intlTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dateOffset = new Date().getTimezoneOffset();
    
    // Calculate expected offset for Europe/Berlin
    // CET = UTC+1 (winter), CEST = UTC+2 (summer)
    const now = new Date();
    const isDST = isDaylightSavingTime(now);
    const expectedBerlinOffset = isDST ? -120 : -60; // Negative because getTimezoneOffset returns opposite
    
    // Check if offset matches timezone
    if (intlTimezone === GERMAN_TIMEZONE && dateOffset !== expectedBerlinOffset) {
      issues.push('Timezone offset mismatch detected');
    }
    
    // Check for timezone manipulation via Date methods
    const testDate = new Date();
    const toString = testDate.toString();
    const toTimeString = testDate.toTimeString();
    
    // Extract timezone abbreviation
    const tzAbbr = toTimeString.match(/\(([^)]+)\)/)?.[1] || '';
    
    // German timezone should show CET or CEST
    if (intlTimezone === GERMAN_TIMEZONE && !['CET', 'CEST', 'Mitteleuropäische Zeit', 'Mitteleuropäische Sommerzeit'].includes(tzAbbr)) {
      issues.push(`Unexpected timezone abbreviation: ${tzAbbr}`);
    }
    
    return {
      isConsistent: issues.length === 0,
      issues
    };
  } catch (error) {
    return {
      isConsistent: false,
      issues: ['Error validating timezone']
    };
  }
}

function isDaylightSavingTime(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  const standardOffset = Math.max(jan, jul);
  return date.getTimezoneOffset() < standardOffset;
}
