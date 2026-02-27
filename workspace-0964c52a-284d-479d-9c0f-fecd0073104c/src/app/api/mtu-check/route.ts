import { NextResponse } from 'next/server';

interface MTUCheckResult {
  mtu: number;
  isVPN: boolean;
  confidence: 'high' | 'medium' | 'low';
  details: string;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const testSize = parseInt(url.searchParams.get('size') || '1500');

    // We'll estimate MTU based on request timing and packet analysis
    // This is a heuristic approach since true MTU detection requires 
    // sending packets of varying sizes and checking for fragmentation
    
    const startTime = Date.now();
    
    // Simple timing-based MTU estimation
    // In a real scenario, you would send packets of increasing size
    // until fragmentation occurs
    
    // For now, we'll use a combination of timing and heuristics
    const responseTime = Date.now() - startTime;
    
    // Typical MTU values:
    // - Standard Ethernet: 1500
    // - PPPoE: 1492
    // - VPN (OpenVPN, WireGuard): 1300-1420
    // - Mobile networks: 1460-1500
    
    // Simulate MTU detection based on response characteristics
    // In production, this would involve actual packet size testing
    const detectedMTU = await detectMTU();
    
    // Determine if VPN based on MTU
    const isVPN = detectedMTU < 1450;
    
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    let details = '';
    
    if (detectedMTU >= 1460) {
      confidence = 'high';
      details = 'Standard MTU - No VPN tunnel detected';
    } else if (detectedMTU >= 1400 && detectedMTU < 1460) {
      confidence = 'medium';
      details = 'Slightly reduced MTU - Possible VPN or PPPoE connection';
    } else if (detectedMTU >= 1300 && detectedMTU < 1400) {
      confidence = 'high';
      details = 'Reduced MTU - VPN tunnel likely detected';
    } else {
      confidence = 'high';
      details = 'Very low MTU - Strong VPN/tunnel indicator';
    }

    const result: MTUCheckResult = {
      mtu: detectedMTU,
      isVPN,
      confidence,
      details
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('MTU check error:', error);
    return NextResponse.json(
      { error: 'Failed to check MTU', mtu: null },
      { status: 500 }
    );
  }
}

// Simulated MTU detection
// In a real implementation, this would send packets of varying sizes
async function detectMTU(): Promise<number> {
  // For demonstration, we return a simulated value
  // Real implementation would:
  // 1. Send ICMP packets of increasing size with DF (Don't Fragment) flag
  // 2. Find the largest size that succeeds
  // 3. Add IP header size (typically 20 bytes) to get MTU
  
  // For now, return a default value
  // In production, this would be actual detection
  return 1500;
}

// Alternative: Client-side timing-based estimation
// This can be called from the client to get a rough estimate
export function estimateMTUFromTiming(rtt: number, throughput: number): number {
  // This is a heuristic based on network characteristics
  // Higher latency with good throughput often indicates VPN
  
  if (rtt < 20) {
    return 1500; // Local/fast connection
  } else if (rtt < 50) {
    return 1500; // Good connection
  } else if (rtt < 100) {
    return 1460; // Slight reduction, mobile or normal
  } else if (rtt < 200) {
    return 1400; // VPN-like timing
  } else {
    return 1300; // High latency, likely VPN
  }
}
