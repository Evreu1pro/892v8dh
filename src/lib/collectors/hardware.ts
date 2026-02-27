import type { HardwareResult } from '../types/fingerprint';

export async function collectHardwareInfo(): Promise<HardwareResult> {
  try {
    // Get CPU cores
    const cores = navigator.hardwareConcurrency || 0;
    
    // Get device memory (Chrome/Edge only, in GB)
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || null;
    
    // Detect device type
    const deviceType = detectDeviceType();
    
    // Check for suspicious configurations
    const isSuspicious = checkSuspiciousHardware(cores, memory);
    
    return {
      cores,
      memory,
      isSuspicious,
      deviceType
    };
  } catch (error) {
    console.error('Hardware info error:', error);
    return {
      cores: 0,
      memory: null,
      isSuspicious: false,
      deviceType: 'Unknown'
    };
  }
}

function detectDeviceType(): 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown' {
  const ua = navigator.userAgent.toLowerCase();
  
  // Check for tablets
  if (/ipad|tablet|playbook|silk/.test(ua)) {
    return 'Tablet';
  }
  
  // Check for mobile devices
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(ua)) {
    return 'Mobile';
  }
  
  // Check for touch devices that might be tablets
  if ('ontouchstart' in window && screen.width >= 768) {
    return 'Tablet';
  }
  
  // Default to desktop for non-mobile devices
  if (!/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|ipad|tablet/.test(ua)) {
    return 'Desktop';
  }
  
  return 'Unknown';
}

function checkSuspiciousHardware(cores: number, memory: number | null): boolean {
  // VMs typically have 1-2 cores
  if (cores > 0 && cores <= 2) {
    return true;
  }
  
  // VMs often have low memory allocations
  if (memory !== null && memory <= 2) {
    return true;
  }
  
  // No cores detected is suspicious
  if (cores === 0) {
    return true;
  }
  
  return false;
}
