import type { IPInfo } from './types/fingerprint';

/**
 * Fetch IP info directly from client using CORS-enabled APIs
 * Multiple fallbacks for reliability
 */

/**
 * Primary: ipapi.co (CORS-enabled, free tier 1000 req/month)
 */
async function fetchFromIPAPICo(): Promise<IPInfo | null> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('ipapi.co failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error('ipapi.co error:', data.reason);
      return null;
    }

    // Determine connection type
    const isProxy = data.threat?.is_proxy ?? false;
    const isVPN = data.threat?.is_anonymous ?? false;
    const isTor = data.threat?.is_tor_exit ?? false;
    const isDatacenter = isProxy || isVPN || isTor;
    
    let connectionType: IPInfo['connectionType'] = 'unknown';
    let usageType: IPInfo['usageType'] = 'unknown';
    
    if (isProxy || isVPN) {
      connectionType = 'proxy';
      usageType = 'datacenter';
    } else if (isDatacenter) {
      connectionType = 'datacenter';
      usageType = 'datacenter';
    } else if (data.org) {
      connectionType = 'isp';
      usageType = 'residential';
    }

    return {
      ip: data.ip || '',
      country: data.country_name || '',
      countryCode: data.country_code || '',
      region: data.region || '',
      city: data.city || '',
      zip: data.postal || '',
      lat: data.latitude || 0,
      lon: data.longitude || 0,
      timezone: data.timezone || '',
      isp: data.org || '',
      org: data.org || '',
      as: data.asn || '',
      asname: '',
      mobile: false,
      proxy: isProxy,
      hosting: isDatacenter,
      vpn: isVPN,
      tor: isTor,
      isDatacenter,
      isResidential: !isDatacenter,
      connectionType,
      usageType
    };
  } catch (error) {
    console.error('ipapi.co fetch error:', error);
    return null;
  }
}

/**
 * Fallback 1: ip-api.com (works from browser with specific endpoint)
 */
async function fetchFromIPAPICom(): Promise<IPInfo | null> {
  try {
    // Note: ip-api.com has CORS issues from browser, but let's try
    const response = await fetch('http://ip-api.com/json/', {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('ip-api.com failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'success') {
      console.error('ip-api.com error:', data.message);
      return null;
    }

    const isDatacenter = data.hosting === true || data.proxy === true;
    
    let connectionType: IPInfo['connectionType'] = 'unknown';
    let usageType: IPInfo['usageType'] = 'unknown';
    
    if (data.mobile === true) {
      connectionType = 'mobile';
      usageType = 'mobile';
    } else if (data.proxy === true) {
      connectionType = 'proxy';
      usageType = 'datacenter';
    } else if (data.hosting === true) {
      connectionType = 'datacenter';
      usageType = 'datacenter';
    } else {
      connectionType = 'isp';
      usageType = 'residential';
    }

    return {
      ip: data.query || '',
      country: data.country || '',
      countryCode: data.countryCode || '',
      region: data.regionName || '',
      city: data.city || '',
      zip: data.zip || '',
      lat: data.lat || 0,
      lon: data.lon || 0,
      timezone: data.timezone || '',
      isp: data.isp || '',
      org: data.org || '',
      as: data.as || '',
      asname: data.asname || '',
      mobile: data.mobile || false,
      proxy: data.proxy || false,
      hosting: data.hosting || false,
      vpn: data.proxy || false,
      tor: false,
      isDatacenter,
      isResidential: !isDatacenter,
      connectionType,
      usageType
    };
  } catch (error) {
    console.error('ip-api.com fetch error:', error);
    return null;
  }
}

/**
 * Fallback 2: ipgeolocation.io (requires API key but has free tier)
 * Using their free endpoint
 */
async function fetchFromIPGeolocation(): Promise<IPInfo | null> {
  try {
    // Free tier endpoint
    const response = await fetch('https://ipgeolocation.abstractapi.com/v1/', {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('ipgeolocation failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    const isDatacenter = data.security?.is_vpn || data.security?.is_proxy || data.security?.is_tor;
    
    return {
      ip: data.ip_address || data.ip || '',
      country: data.country || data.country_name || '',
      countryCode: data.country_code || '',
      region: data.region || data.region_iso_code || '',
      city: data.city || '',
      zip: data.postal_code || '',
      lat: data.latitude || 0,
      lon: data.longitude || 0,
      timezone: data.timezone?.name || '',
      isp: data.connection?.isp_name || '',
      org: data.connection?.organization || '',
      as: '',
      asname: '',
      mobile: false,
      proxy: data.security?.is_proxy || false,
      hosting: isDatacenter || false,
      vpn: data.security?.is_vpn || false,
      tor: data.security?.is_tor || false,
      isDatacenter: isDatacenter || false,
      isResidential: !isDatacenter,
      connectionType: isDatacenter ? 'datacenter' : 'isp',
      usageType: isDatacenter ? 'datacenter' : 'residential'
    };
  } catch (error) {
    console.error('ipgeolocation fetch error:', error);
    return null;
  }
}

/**
 * Fallback 3: Get just IP from ipify, then use free geolocation
 */
async function fetchFromIPify(): Promise<IPInfo | null> {
  try {
    // Get IP first
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    const ip = ipData.ip;

    if (!ip) return null;

    // Return basic info with IP at least
    return {
      ip,
      country: '',
      countryCode: '',
      region: '',
      city: '',
      zip: '',
      lat: 0,
      lon: 0,
      timezone: '',
      isp: '',
      org: '',
      as: '',
      asname: '',
      mobile: false,
      proxy: false,
      hosting: false,
      vpn: false,
      tor: false,
      isDatacenter: false,
      isResidential: true, // Assume residential
      connectionType: 'unknown',
      usageType: 'unknown'
    };
  } catch (error) {
    console.error('ipify fetch error:', error);
    return null;
  }
}

/**
 * Main function to fetch IP info using client-side fetch
 * Tries multiple APIs in order of preference
 */
export async function fetchIPInfoClient(): Promise<IPInfo | null> {
  console.log('Fetching IP info from client...');
  
  // Try primary API (ipapi.co - most reliable with CORS)
  let result = await fetchFromIPAPICo();
  if (result && result.ip) {
    console.log('IP info fetched from ipapi.co:', result.ip);
    return result;
  }

  // Fallback 1: ip-api.com
  result = await fetchFromIPAPICom();
  if (result && result.ip) {
    console.log('IP info fetched from ip-api.com:', result.ip);
    return result;
  }

  // Fallback 2: ipgeolocation
  result = await fetchFromIPGeolocation();
  if (result && result.ip) {
    console.log('IP info fetched from ipgeolocation:', result.ip);
    return result;
  }

  // Fallback 3: at least get the IP
  result = await fetchFromIPify();
  if (result && result.ip) {
    console.log('IP fetched from ipify:', result.ip);
    return result;
  }

  console.error('All IP APIs failed');
  return null;
}

/**
 * Quick IP-only fetch (minimal data, fast)
 */
export async function fetchQuickIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch {
    return null;
  }
}
