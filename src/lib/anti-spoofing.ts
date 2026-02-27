import type { CanvasResult } from './types/fingerprint';

// ============================================
// ANTI-SPOOFING DETECTION MODULE
// ============================================

export interface AntiSpoofingResult {
  webdriver: boolean;
  chromeDriver: boolean;
  fakeBrowserVersion: boolean;
  browserVersion: string;
  actualChromeVersion: number | null;
  isHeadless: boolean;
  automationIndicators: string[];
}

export interface DrawingConsistencyResult {
  isConsistent: boolean;
  isMasked: boolean;
  noiseDetected: boolean;
  hashUniqueness: number; // 0-1, higher = more unique (suspicious)
}

// Check for automation indicators
export function detectAutomation(): AntiSpoofingResult {
  const result: AntiSpoofingResult = {
    webdriver: false,
    chromeDriver: false,
    fakeBrowserVersion: false,
    browserVersion: 'Unknown',
    actualChromeVersion: null,
    isHeadless: false,
    automationIndicators: []
  };

  try {
    // 1. Check navigator.webdriver
    if ((navigator as Navigator & { webdriver?: boolean }).webdriver === true) {
      result.webdriver = true;
      result.automationIndicators.push('navigator.webdriver = true');
    }

    // 2. Check for ChromeDriver traces in window object
    const windowObj = window as unknown as Record<string, unknown>;
    const chromeDriverPatterns = [
      'cdc_asdjflasdf_',
      'cdc_asdjflasdjflasdf_',
      'cdc_adoQpoasnfa76pfcZLmcfl_',
      'cdc_',
      '$cdc_',
      '__webdriver_script_fn',
      '__selenium_evaluate',
      '__webdriver_evaluate',
      '__driver_evaluate',
      '__webdriver_unwrapped',
      '__driver_unwrapped'
    ];

    for (const pattern of chromeDriverPatterns) {
      if (pattern in windowObj) {
        result.chromeDriver = true;
        result.automationIndicators.push(`window.${pattern} found`);
      }
    }

    // 3. Check for headless browser indicators
    const headlessIndicators = [
      'HeadlessChrome',
      'PhantomJS',
      'slimerjs',
      'nightmare'
    ];

    const userAgent = navigator.userAgent;
    for (const indicator of headlessIndicators) {
      if (userAgent.includes(indicator)) {
        result.isHeadless = true;
        result.automationIndicators.push(`User-Agent contains ${indicator}`);
      }
    }

    // Additional headless checks
    const nav = navigator as Navigator & {
      plugins?: { length?: number };
      languages?: string[];
    };
    
    if (nav.plugins && nav.plugins.length === 0) {
      result.isHeadless = true;
      result.automationIndicators.push('No browser plugins (headless)');
    }

    // 4. Extract and validate browser version
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
    if (chromeMatch) {
      result.browserVersion = chromeMatch[0];
      result.actualChromeVersion = parseInt(chromeMatch[1], 10);
      
      // Valid Chrome versions: 100+ 
      // As of early 2025: stable=133, beta=134, dev=135, canary=136
      // Some users may have newer versions (145+ = beta/dev/canary)
      // Only flag versions that are IMPOSSIBLE (> 150 is definitely fake)
      if (result.actualChromeVersion > 150) {
        result.fakeBrowserVersion = true;
        result.automationIndicators.push(`Chrome version ${result.actualChromeVersion} doesn't exist`);
      }
      
      // Versions below 80 are suspiciously old (Chrome 80 was from 2020)
      if (result.actualChromeVersion < 80) {
        result.fakeBrowserVersion = true;
        result.automationIndicators.push(`Chrome version ${result.actualChromeVersion} is impossibly old`);
      }
    }

    // 5. Check for additional automation frameworks
    const automationProps = [
      '_phantom',
      '__nightmare',
      'domAutomation',
      'domAutomationController',
      '__puppeteer_evaluation_script__',
      '__playwright_evaluation_script__'
    ];

    for (const prop of automationProps) {
      if (prop in windowObj) {
        result.automationIndicators.push(`Automation property: ${prop}`);
      }
    }

    // 6. Check for Selenium
    const documentObj = document as unknown as Record<string, unknown>;
    if ('$cdc_asdjflasdf_' in documentObj || 
        '$cdc_asdjflasdjflasdf_' in documentObj ||
        '_Selenium_IDE_Recorder' in windowObj) {
      result.chromeDriver = true;
      result.automationIndicators.push('Selenium/ChromeDriver detected');
    }

  } catch (error) {
    console.error('Automation detection error:', error);
  }

  return result;
}

// Generate hash from string
async function generateHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Render canvas and get hash
async function renderCanvas(): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 60;
  canvas.style.display = 'none';
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'error';

  // Complex rendering for fingerprint
  ctx.fillStyle = '#f60';
  ctx.fillRect(100, 1, 62, 20);
  
  const gradient = ctx.createLinearGradient(0, 0, 280, 60);
  gradient.addColorStop(0, '#ff6b6b');
  gradient.addColorStop(0.5, '#4ecdc4');
  gradient.addColorStop(1, '#45b7d1');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 280, 60);
  
  ctx.font = '14px Arial';
  ctx.fillStyle = '#000';
  ctx.fillText('Browser Fingerprint Analysis 🎨', 2, 15);
  
  ctx.font = '18px Times New Roman';
  ctx.fillStyle = '#fff';
  ctx.fillText('Trust Score System', 2, 40);
  
  ctx.font = '12px Courier New';
  ctx.fillText('äöüß ÄÖÜ ẞ Test', 150, 55);
  
  ctx.beginPath();
  ctx.arc(240, 30, 20, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fill();

  const dataUrl = canvas.toDataURL('image/png');
  return generateHash(dataUrl);
}

// Check drawing consistency (anti-spoofing)
export async function checkDrawingConsistency(): Promise<DrawingConsistencyResult> {
  try {
    // Render canvas multiple times
    const renders: string[] = [];
    for (let i = 0; i < 5; i++) {
      const hash = await renderCanvas();
      renders.push(hash.substring(0, 32)); // Use first 32 chars
    }

    // Check if all hashes are identical (they should be)
    const allIdentical = renders.every(h => h === renders[0]);
    
    // Check for variation (spoofing tools add random noise)
    const uniqueHashes = new Set(renders);
    const hashVariety = uniqueHashes.size;
    
    // Calculate uniqueness (0 = all same, 1 = all different)
    const hashUniqueness = (hashVariety - 1) / (renders.length - 1);
    
    // Noise detected = hashes are different each render (anti-fingerprinting tool)
    const noiseDetected = hashUniqueness > 0.3;
    
    // Masking = completely unique hash every time
    const isMasked = hashUniqueness > 0.7;

    return {
      isConsistent: allIdentical,
      isMasked,
      noiseDetected,
      hashUniqueness
    };
  } catch (error) {
    console.error('Drawing consistency check error:', error);
    return {
      isConsistent: false,
      isMasked: false,
      noiseDetected: false,
      hashUniqueness: 0
    };
  }
}

// Full canvas fingerprint collection with anti-spoofing
export async function collectCanvasFingerprint(): Promise<CanvasResult> {
  try {
    // Check drawing consistency
    const consistency = await checkDrawingConsistency();
    
    // Get the primary hash
    const hash = await renderCanvas();
    
    // Detect VM signatures
    let isVM = false;
    let vmType: 'VMware' | 'VirtualBox' | 'QEMU' | 'Parallels' | 'Unknown' | undefined;
    
    const testCanvas = document.createElement('canvas');
    const ctx = testCanvas.getContext('2d');
    
    if (ctx) {
      testCanvas.width = 280;
      testCanvas.height = 60;
      
      // Check for rendering inconsistencies that indicate VM
      const textMetrics1 = ctx.measureText('Test String 123');
      ctx.font = '14px Arial';
      const textMetrics2 = ctx.measureText('Test String 123');
      
      if (Math.abs(textMetrics1.width - textMetrics2.width) > 0.5) {
        isVM = true;
        vmType = 'Unknown';
      }
    }

    return {
      hash: hash.substring(0, 32),
      isVM,
      vmType,
      isConsistent: consistency.isConsistent,
      isSpoofed: consistency.isMasked || consistency.noiseDetected,
      hashVariance: consistency.hashUniqueness
    };
  } catch (error) {
    console.error('Canvas fingerprint error:', error);
    return {
      hash: 'error',
      isVM: false,
      isConsistent: false,
      isSpoofed: false,
      hashVariance: 0
    };
  }
}

// Performance test for hardware correlation
export function testHardwarePerformance(): number {
  // Simple performance test
  const iterations = 100000;
  const start = performance.now();
  
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }
  
  const duration = performance.now() - start;
  
  // Normalize to 0-1 scale (lower duration = higher performance)
  // Typical desktop: 5-20ms, Mobile: 20-100ms, VM: varies widely
  const normalized = Math.max(0, Math.min(1, (100 - duration) / 100));
  
  return normalized;
}
