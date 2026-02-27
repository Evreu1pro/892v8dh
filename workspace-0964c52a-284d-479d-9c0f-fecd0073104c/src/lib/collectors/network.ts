import type { NetworkResult, IPInfo } from '../types/fingerprint';
import { GERMAN_PROFILE_STANDARD } from '../german-profile';

// Proxy headers that might be exposed
const PROXY_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'x-proxy-id',
  'x-forwarded-host',
  'x-forwarded-server',
  'x-forwarded-proto',
  'via',
  'x-cache',
  'x-cache-lookup',
  'forwarded',
  'client-ip',
  'true-client-ip',
  'x-originating-ip',
  'x-wap-profile',
  'proxy-connection',
  'x-bluecoat-via'
];

// Determine ISP type based on IP info
function determineISPType(ipInfo: IPInfo | null): NetworkResult['ispType'] {
  if (!ipInfo) return 'unknown';
  
  const ispLower = (ipInfo.isp || '').toLowerCase();
  
  // Check for datacenter/hosting patterns
  if (GERMAN_PROFILE_STANDARD.banned_isp_patterns.some(pattern => 
    ispLower.includes(pattern.toLowerCase())
  )) {
    return 'hosting';
  }
  
  if (ipInfo.hosting || ipInfo.proxy || ipInfo.vpn) {
    return 'datacenter';
  }
  
  if (ipInfo.mobile) {
    return 'mobile';
  }
  
  if (ipInfo.isResidential) {
    return 'residential';
  }
  
  return 'unknown';
}

// Check if ISP is trusted German ISP
function checkTrustedISP(ipInfo: IPInfo | null): boolean {
  if (!ipInfo || !ipInfo.isp) return false;
  
  return GERMAN_PROFILE_STANDARD.trusted_german_isps.some(trusted => 
    ipInfo.isp.toLowerCase().includes(trusted.toLowerCase())
  );
}

export function collectNetworkInfo(ipInfo: IPInfo | null = null): NetworkResult {
  try {
    // Check for proxy-related timing patterns
    const timing = performance.timing;
    const navigationStart = timing.navigationStart;
    const responseStart = timing.responseStart;
    const responseEnd = timing.responseEnd;
    
    // Calculate latency metrics
    const responseTime = responseEnd - navigationStart;
    const ttfb = responseStart - navigationStart;
    
    // MTU detection through timing patterns (approximate)
    const mtu = estimateMTU(ttfb, responseTime);
    
    // Check VPN by MTU
    const vpnDetectedByMTU = mtu !== null && mtu < GERMAN_PROFILE_STANDARD.mtu_standards.vpn_threshold;
    
    // Check for VPN indicators
    const isVPN = vpnDetectedByMTU || (ipInfo?.vpn ?? false);
    
    // TTL mismatch detection is server-side, so we set it to false here
    const ttlMismatch = false;
    
    // Proxy headers are typically detected server-side
    const proxyHeaders = detectClientProxyIndicators();
    const hasProxyHeaders = proxyHeaders.length > 0;
    
    // Determine ISP type
    const ispType = determineISPType(ipInfo);
    
    // Check if trusted ISP
    const isTrustedISP = checkTrustedISP(ipInfo);
    
    return {
      mtu,
      isVPN,
      vpnDetectedByMTU,
      ttlMismatch,
      proxyHeaders,
      hasProxyHeaders,
      ispType,
      isTrustedISP
    };
  } catch (error) {
    console.error('Network info error:', error);
    return {
      mtu: null,
      isVPN: false,
      vpnDetectedByMTU: false,
      ttlMismatch: false,
      proxyHeaders: [],
      hasProxyHeaders: false,
      ispType: 'unknown',
      isTrustedISP: false
    };
  }
}

function estimateMTU(ttfb: number, responseTime: number): number | null {
  // This is a rough heuristic based on timing patterns
  // Real MTU detection requires sending packets of varying sizes
  
  // For more accurate MTU, we'll use client-side estimation
  // VPN connections typically have higher latency
  
  if (ttfb < 50) {
    return 1500; // Fast connection, likely direct
  } else if (ttfb < 150) {
    return 1500; // Normal connection
  } else if (ttfb < 300) {
    return 1460; // Slight overhead
  } else if (ttfb < 500) {
    return 1400; // VPN-like overhead
  } else {
    return 1300; // Heavy VPN/proxy overhead
  }
}

function detectClientProxyIndicators(): string[] {
  const indicators: string[] = [];
  
  try {
    // Check if certain APIs are blocked or modified
    const entries = performance.getEntriesByType('resource');
    for (const entry of entries) {
      const resourceEntry = entry as PerformanceResourceTiming;
      if (resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0) {
        // Resource served from cache or proxy
      }
    }
  } catch {
    // Ignore errors
  }
  
  return indicators;
}

// Function to check proxy headers from server response
export function getProxyHeadersFromResponse(headers: Headers): string[] {
  const foundHeaders: string[] = [];
  
  PROXY_HEADERS.forEach(header => {
    const value = headers.get(header);
    if (value) {
      foundHeaders.push(`${header}: ${value}`);
    }
  });
  
  return foundHeaders;
}
