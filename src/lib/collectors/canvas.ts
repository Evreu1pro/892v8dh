import type { CanvasResult } from '../types/fingerprint';

// Known VM canvas hash patterns (simplified signatures)
const VM_SIGNATURES = {
  VMware: ['vmware', 'svga'],
  VirtualBox: ['virtualbox', 'vbox'],
  QEMU: ['qemu', 'stdvga'],
  Parallels: ['parallels', 'prl']
};

// Known "normal" canvas hash prefixes for popular configurations
// Real browsers have consistent hashes, spoofers generate unique ones
const COMMON_HASH_PATTERNS = [
  // These are patterns that real browsers produce
  // If hash doesn't match any pattern and is completely unique = suspicious
];

// Generate a hash from a string
async function generateHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Create a single canvas render
async function renderCanvas(): Promise<{ dataUrl: string; hash: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 60;
  canvas.style.display = 'none';
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: '', hash: 'error' };
  }

  // Draw text with various styles to create unique fingerprint
  ctx.fillStyle = '#f60';
  ctx.fillRect(100, 1, 62, 20);
  
  // Add gradient
  const gradient = ctx.createLinearGradient(0, 0, 280, 60);
  gradient.addColorStop(0, '#ff6b6b');
  gradient.addColorStop(0.5, '#4ecdc4');
  gradient.addColorStop(1, '#45b7d1');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 280, 60);
  
  // Draw text with specific fonts
  ctx.font = '14px Arial';
  ctx.fillStyle = '#000';
  ctx.fillText('Browser Fingerprint 🎨', 2, 15);
  
  ctx.font = '18px Times New Roman';
  ctx.fillStyle = '#fff';
  ctx.fillText('Trust Analysis', 2, 40);
  
  // Add special characters for German detection
  ctx.font = '12px Courier New';
  ctx.fillText('äöüß ÄÖÜ ẞ', 150, 55);
  
  // Draw some geometric shapes
  ctx.beginPath();
  ctx.arc(240, 30, 20, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(200, 10);
  ctx.lineTo(220, 50);
  ctx.lineTo(180, 50);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fill();

  const dataUrl = canvas.toDataURL('image/png');
  const hash = await generateHash(dataUrl);
  
  return { dataUrl, hash };
}

export async function collectCanvasFingerprint(): Promise<CanvasResult> {
  try {
    // Render canvas multiple times to check consistency
    const renders: string[] = [];
    const renderCount = 3;
    
    for (let i = 0; i < renderCount; i++) {
      const { hash } = await renderCanvas();
      renders.push(hash);
    }

    // Check if all hashes are identical (they should be for real browsers)
    const allIdentical = renders.every(h => h === renders[0]);
    
    // Calculate hash variance (should be 0 for consistent browsers)
    const hashVariance = allIdentical ? 0 : 
      renders.filter(h => h !== renders[0]).length / renders.length;
    
    // Use the first hash as the primary
    const hash = renders[0];
    
    // Check for VM signatures in rendering patterns
    let isVM = false;
    let vmType: 'VMware' | 'VirtualBox' | 'QEMU' | 'Parallels' | 'Unknown' | undefined;
    
    // Create a canvas to check rendering characteristics
    const testCanvas = document.createElement('canvas');
    const ctx = testCanvas.getContext('2d');
    
    if (ctx) {
      testCanvas.width = 280;
      testCanvas.height = 60;
      
      // Render and get pixel data
      ctx.fillStyle = '#f60';
      ctx.fillRect(100, 1, 62, 20);
      
      const imageData = ctx.getImageData(0, 0, 280, 60);
      const pixelData = Array.from(imageData.data.slice(0, 1000)).join(',');
      const canvasInfo = `${ctx.font} ${ctx.fillStyle} ${pixelData.substring(0, 200)}`.toLowerCase();
      
      for (const [type, signatures] of Object.entries(VM_SIGNATURES)) {
        if (signatures.some(sig => canvasInfo.includes(sig))) {
          isVM = true;
          vmType = type as 'VMware' | 'VirtualBox' | 'QEMU' | 'Parallels';
          break;
        }
      }
      
      // Additional VM detection: Check for software rendering patterns
      const textMetrics = ctx.measureText('Browser Fingerprint 🎨');
      const expectedWidth = textMetrics.width;
      
      ctx.font = '14px Arial';
      const retestMetrics = ctx.measureText('Browser Fingerprint 🎨');
      
      if (Math.abs(expectedWidth - retestMetrics.width) > 0.5) {
        isVM = true;
        vmType = vmType || 'Unknown';
      }
    }

    // ANTI-SPOOFING DETECTION
    // Check if hash is too unique (sign of fingerprint spoofing)
    // Real browsers have hashes that match patterns from similar hardware
    // Spoofers often generate completely random/unique hashes
    
    let isSpoofed = false;
    
    // Check 1: Inconsistent hashes across renders = spoofing
    if (!allIdentical) {
      isSpoofed = true;
    }
    
    // Check 2: Hash that changes on every render = randomization (spoofing)
    if (hashVariance > 0.3) {
      isSpoofed = true;
    }
    
    // Check 3: Extremely long/short hash (sign of custom implementation)
    if (hash.length !== 32) {
      isSpoofed = true;
    }
    
    // A consistent hash that doesn't show VM signatures is considered good
    const isConsistent = allIdentical && hashVariance === 0;

    return {
      hash,
      isVM,
      vmType,
      isConsistent,
      isSpoofed,
      hashVariance
    };
  } catch (error) {
    console.error('Canvas fingerprint error:', error);
    return {
      hash: 'error',
      isVM: false,
      isConsistent: false,
      isSpoofed: false,
      hashVariance: 1
    };
  }
}
