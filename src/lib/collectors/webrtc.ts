import type { WebRTCResult } from '../types/fingerprint';

// Known VM IP patterns (private IP ranges that might indicate VM)
const VM_IP_PATTERNS = [
  /^10\./,                    // Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private
  /^192\.168\./,              // Class C private
  /^169\.254\./,              // Link-local
  /^127\./                    // Loopback
];

// VirtualBox typically uses 10.0.2.x range
const VBOX_PATTERN = /^10\.0\.2\./;
// VMware typically uses 172.16.x.x or 192.168.x.x with specific patterns
const VMWARE_PATTERN = /^172\.16\./;

export async function collectWebRTCLeak(): Promise<WebRTCResult> {
  try {
    const localIPs: string[] = [];
    let hasLeak = false;
    let leakType: 'VirtualBox' | 'VMware' | 'Proxy' | 'Normal' | undefined;
    let isBlocked = false;
    let isUnsupported = false;
    let status: 'active' | 'blocked' | 'unsupported' | 'error' = 'error';

    // Check if RTCPeerConnection is available
    const RTCPeerConnection = (window as unknown as { 
      RTCPeerConnection?: typeof globalThis.RTCPeerConnection,
      webkitRTCPeerConnection?: typeof globalThis.RTCPeerConnection 
    }).RTCPeerConnection || (window as unknown as { 
      webkitRTCPeerConnection?: typeof globalThis.RTCPeerConnection 
    }).webkitRTCPeerConnection;

    if (!RTCPeerConnection) {
      // WebRTC is not supported or blocked
      isUnsupported = true;
      status = 'unsupported';
      
      return {
        localIPs: [],
        hasLeak: false,
        leakType: undefined,
        isBlocked: false,
        isUnsupported: true,
        status: 'unsupported'
      };
    }

    // Try to create a peer connection
    const servers: RTCConfiguration = { iceServers: [] };
    let pc: RTCPeerConnection | null = null;
    
    try {
      pc = new RTCPeerConnection(servers);
    } catch {
      // WebRTC creation blocked (privacy extension)
      isBlocked = true;
      status = 'blocked';
      
      return {
        localIPs: [],
        hasLeak: false,
        leakType: undefined,
        isBlocked: true,
        isUnsupported: false,
        status: 'blocked'
      };
    }

    // Create data channel to trigger ICE gathering
    try {
      pc.createDataChannel('');
    } catch {
      // Blocked
      pc.close();
      isBlocked = true;
      status = 'blocked';
      
      return {
        localIPs: [],
        hasLeak: false,
        leakType: undefined,
        isBlocked: true,
        isUnsupported: false,
        status: 'blocked'
      };
    }

    // Create offer and set local description
    let offer: RTCSessionDescriptionInit;
    try {
      offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
    } catch {
      pc.close();
      isBlocked = true;
      status = 'blocked';
      
      return {
        localIPs: [],
        hasLeak: false,
        leakType: undefined,
        isBlocked: true,
        isUnsupported: false,
        status: 'blocked'
      };
    }

    // Wait for ICE candidates
    const ips = await new Promise<string[]>((resolve) => {
      const candidates: string[] = [];
      const timeout = setTimeout(() => {
        if (pc) pc.close();
        resolve(candidates);
      }, 3000);

      pc!.onicecandidate = (event) => {
        if (!event.candidate) {
          clearTimeout(timeout);
          if (pc) pc.close();
          resolve(candidates);
          return;
        }

        const candidate = event.candidate.candidate;
        
        // Check for blocked status (no candidates)
        if (candidate.includes('candidate:') === false) {
          return;
        }
        
        // Extract IP address from candidate
        const ipMatch = candidate.match(/(\d{1,3}\.){3}\d{1,3}/);
        if (ipMatch && !candidates.includes(ipMatch[0])) {
          candidates.push(ipMatch[0]);
        }
        
        // Also check for IPv6
        const ipv6Match = candidate.match(/([a-f0-9:]+:+)+[a-f0-9]+/i);
        if (ipv6Match && !candidates.includes(ipv6Match[0])) {
          candidates.push(ipv6Match[0]);
        }
      };
    });

    localIPs.push(...ips);
    
    // Determine status
    if (localIPs.length === 0) {
      // No IPs found - could be blocked or just no leak
      status = 'active'; // WebRTC works but no leak
    } else {
      status = 'active';
      hasLeak = true;
      
      // Determine leak type based on IP patterns
      for (const ip of localIPs) {
        if (VBOX_PATTERN.test(ip)) {
          leakType = 'VirtualBox';
          break;
        }
        if (VMWARE_PATTERN.test(ip)) {
          leakType = 'VMware';
          break;
        }
        if (VM_IP_PATTERNS.some(pattern => pattern.test(ip))) {
          leakType = 'Normal';
        }
      }
      
      // If we found local IPs but they're not VM-specific
      if (!leakType && localIPs.some(ip => VM_IP_PATTERNS.some(pattern => pattern.test(ip)))) {
        leakType = 'Normal';
      }
    }

    return {
      localIPs,
      hasLeak,
      leakType,
      isBlocked,
      isUnsupported,
      status
    };
  } catch (error) {
    console.error('WebRTC leak detection error:', error);
    return {
      localIPs: [],
      hasLeak: false,
      leakType: undefined,
      isBlocked: false,
      isUnsupported: false,
      status: 'error'
    };
  }
}
