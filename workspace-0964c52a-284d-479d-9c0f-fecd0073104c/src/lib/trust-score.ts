import type { FingerprintData, TrustScoreResult, ParameterScore } from './types/fingerprint';
import { GERMAN_PROFILE_STANDARD } from './german-profile';

// ============================================
// TRUST SCORE CALCULATOR
// Advanced scoring with kill-switches
// ============================================

export function calculateTrustScore(fingerprint: FingerprintData): TrustScoreResult {
  const parameters: ParameterScore[] = [];
  const specialFlags: string[] = [];
  const errorLog: string[] = [];
  const recommendations: string[] = [];
  
  // ========================================
  // PHASE 1: KILL-SWITCH CHECKS
  // These result in immediate 0% score
  // ========================================
  
  // KILL-SWITCH 1: Automation detected
  if (fingerprint.antiSpoofing.webdriver) {
    return createKillSwitchResult(
      'WEBDRIVER_DETECTED',
      '🚨 navigator.webdriver = true - Automation detected',
      ['Automation framework detected. Use a real browser.'],
      parameters
    );
  }
  
  // KILL-SWITCH 2: ChromeDriver detected
  if (fingerprint.antiSpoofing.chromeDriver) {
    return createKillSwitchResult(
      'CHROMEDRIVER_DETECTED',
      '🚨 ChromeDriver traces found in window object',
      ['ChromeDriver/Selenium detected. Use a real browser.'],
      parameters
    );
  }
  
  // KILL-SWITCH 3: Canvas fingerprint masking
  if (fingerprint.canvas.isSpoofed) {
    return createKillSwitchResult(
      'FINGERPRINT_MASKING',
      '🚨 Canvas fingerprint masking detected (noise injection)',
      ['Fingerprint randomization detected. Disable anti-fingerprinting tools.'],
      parameters
    );
  }
  
  // KILL-SWITCH 4: Virtual GPU (SwiftShader, llvmpipe, etc.)
  const webglRendererLower = fingerprint.webgl.renderer.toLowerCase();
  const webglVendorLower = fingerprint.webgl.vendor.toLowerCase();
  const combinedWebGL = `${webglVendorLower} ${webglRendererLower}`;
  
  const isVirtualGPU = GERMAN_PROFILE_STANDARD.virtual_gpu_patterns.some(
    pattern => combinedWebGL.includes(pattern.toLowerCase())
  );
  
  if (isVirtualGPU) {
    const virtualPattern = GERMAN_PROFILE_STANDARD.virtual_gpu_patterns.find(
      pattern => combinedWebGL.includes(pattern.toLowerCase())
    );
    return createKillSwitchResult(
      'VIRTUAL_GPU_DETECTED',
      `🚨 Virtual GPU detected: ${virtualPattern}`,
      ['Use a device with physical GPU (NVIDIA, AMD, Intel, or Apple).'],
      parameters
    );
  }
  
  // KILL-SWITCH 5: Datacenter IP
  if (fingerprint.ipInfo?.isDatacenter || fingerprint.ipInfo?.hosting) {
    return createKillSwitchResult(
      'DATACENTER_IP_DETECTED',
      `🚨 Datacenter IP detected: ${fingerprint.ipInfo.isp}`,
      [
        'Your IP belongs to a datacenter/hosting provider.',
        'Use a residential connection (mobile or home ISP).'
      ],
      parameters
    );
  }
  
  // KILL-SWITCH 6: Banned ISP
  const ispLower = (fingerprint.ipInfo?.isp || '').toLowerCase();
  const isBannedISP = GERMAN_PROFILE_STANDARD.banned_isp_patterns.some(
    pattern => ispLower.includes(pattern.toLowerCase())
  );
  
  if (isBannedISP) {
    return createKillSwitchResult(
      'BANNED_ISP',
      `🚨 Banned ISP detected: ${fingerprint.ipInfo?.isp}`,
      ['Your ISP is in the banned list (hosting/datacenter).'],
      parameters
    );
  }
  
  // ========================================
  // PHASE 2: SCORING (Starting from 100)
  // ========================================
  
  let totalScore = 100; // Start with 100, subtract for issues
  
  // ========== CONNECTION TYPE (±50 points) ==========
  const usageType = fingerprint.ipInfo?.usageType || 'unknown';
  const isTrustedISP = fingerprint.network.isTrustedISP;
  const isMobile = fingerprint.ipInfo?.mobile ?? false;
  
  if (usageType === 'residential' || isMobile) {
    totalScore += 50; // Residential/mobile = +50
    parameters.push({
      name: 'Connection Type',
      value: isMobile ? 'Mobile' : 'Residential',
      expected: 'Residential/Mobile',
      score: 50,
      maxScore: 50,
      weight: 50,
      status: 'pass',
      criticality: 'critical',
      details: 'Residential connection verified'
    });
  } else if (isTrustedISP) {
    totalScore += 50; // Trusted German ISP = +50
    parameters.push({
      name: 'Connection Type',
      value: `Trusted ISP (${fingerprint.ipInfo?.isp})`,
      expected: 'German ISP',
      score: 50,
      maxScore: 50,
      weight: 50,
      criticality: 'critical',
      status: 'pass',
      details: 'Trusted German ISP detected'
    });
  } else {
    parameters.push({
      name: 'Connection Type',
      value: usageType || 'Unknown',
      expected: 'Residential/Mobile',
      score: 0,
      maxScore: 50,
      weight: 50,
      status: 'warning',
      criticality: 'critical',
      details: 'Connection type not verified as residential'
    });
  }
  
  // ========== MTU ANALYSIS (-80 or +20) ==========
  const mtu = fingerprint.network.mtu;
  const isVPNByMTU = fingerprint.network.vpnDetectedByMTU;
  
  if (mtu && mtu < 1400) {
    totalScore -= 80; // VPN by MTU = -80
    parameters.push({
      name: 'MTU Analysis',
      value: `${mtu} (VPN detected)`,
      expected: '1500 (standard)',
      score: -80,
      maxScore: 20,
      weight: 20,
      status: 'fail',
      criticality: 'high',
      details: 'MTU indicates VPN tunnel'
    });
    errorLog.push(`MTU ${mtu} указывает на VPN (стандарт: 1500)`);
    specialFlags.push('⚠️ VPN detected by MTU analysis');
  } else if (mtu && (mtu === 1492 || mtu === 1500)) {
    totalScore += 20; // Good MTU = +20
    parameters.push({
      name: 'MTU Analysis',
      value: `${mtu}`,
      expected: '1492/1500',
      score: 20,
      maxScore: 20,
      weight: 20,
      status: 'pass',
      criticality: 'medium',
      details: 'Standard MTU - no VPN detected'
    });
  } else {
    parameters.push({
      name: 'MTU Analysis',
      value: mtu?.toString() || 'Unknown',
      expected: '1500 (standard)',
      score: 0,
      maxScore: 20,
      weight: 20,
      status: 'warning',
      criticality: 'medium',
      details: 'Could not determine MTU'
    });
  }
  
  // ========== WebRTC STATUS (-40 if blocked) ==========
  if (fingerprint.webrtc.status === 'blocked') {
    totalScore -= 40; // Blocked WebRTC = -40
    parameters.push({
      name: 'WebRTC Status',
      value: 'Blocked',
      expected: 'Active or No leak',
      score: -40,
      maxScore: 0,
      weight: 40,
      status: 'warning',
      criticality: 'high',
      details: 'WebRTC blocked - indicates privacy extension'
    });
    errorLog.push('WebRTC заблокирован - признак VPN/прокси расширения');
    specialFlags.push('⚠️ WebRTC blocked - privacy extension detected');
  } else if (fingerprint.webrtc.hasLeak) {
    parameters.push({
      name: 'WebRTC Status',
      value: `Leak: ${fingerprint.webrtc.localIPs[0]}`,
      expected: 'No leak',
      score: -20,
      maxScore: 0,
      weight: 20,
      status: 'warning',
      criticality: 'high',
      details: 'Local IP exposed'
    });
    errorLog.push(`WebRTC утечка: ${fingerprint.webrtc.localIPs[0]}`);
  } else {
    parameters.push({
      name: 'WebRTC Status',
      value: 'No leak',
      expected: 'No leak',
      score: 0,
      maxScore: 0,
      weight: 0,
      status: 'pass',
      criticality: 'high',
      details: 'WebRTC is secure'
    });
  }
  
  // ========== TIMEZONE MISMATCH (-100) ==========
  if (!fingerprint.geoSync.ipTimezoneMatchesSystem) {
    totalScore -= 100; // Timezone mismatch = -100
    parameters.push({
      name: 'Timezone Sync',
      value: `${fingerprint.timezone.timezone} (IP: ${fingerprint.ipInfo?.timezone})`,
      expected: 'Europe/Berlin',
      score: -100,
      maxScore: 0,
      weight: 100,
      status: 'fail',
      criticality: 'critical',
      details: 'Timezone doesn\'t match IP location'
    });
    errorLog.push(`Timezone не совпадает: система=${fingerprint.timezone.timezone}, IP=${fingerprint.ipInfo?.timezone}`);
    specialFlags.push('🚨 Timezone mismatch with IP');
    recommendations.push(`Change timezone to ${fingerprint.ipInfo?.timezone || 'Europe/Berlin'}`);
  } else {
    parameters.push({
      name: 'Timezone Sync',
      value: fingerprint.timezone.timezone,
      expected: 'Europe/Berlin',
      score: 0,
      maxScore: 0,
      weight: 0,
      status: 'pass',
      criticality: 'critical',
      details: 'Timezone matches IP location'
    });
  }
  
  // ========== BROWSER VERSION (-30 if suspicious) ==========
  if (fingerprint.antiSpoofing.fakeBrowserVersion) {
    totalScore -= 30; // Fake version - warning
    parameters.push({
      name: 'Browser Version',
      value: fingerprint.antiSpoofing.browserVersion,
      expected: 'Valid Chrome version',
      score: -30,
      maxScore: 0,
      weight: 30,
      status: 'warning',
      criticality: 'medium',
      details: 'Browser version appears fake'
    });
    errorLog.push(`Подозрительная версия браузера: ${fingerprint.antiSpoofing.browserVersion}`);
    specialFlags.push('⚠️ Unusual browser version');
  } else {
    parameters.push({
      name: 'Browser Version',
      value: fingerprint.antiSpoofing.browserVersion,
      expected: 'Chrome 80+',
      score: 0,
      maxScore: 0,
      weight: 0,
      status: 'pass',
      criticality: 'medium',
      details: 'Valid browser version'
    });
  }
  
  // ========== HARDWARE CORRELATION (-50 if VM) ==========
  const cores = fingerprint.hardware.cores;
  const memory = fingerprint.hardware.memory;
  
  // Check for VM pattern: high cores, low memory
  if (cores > 8 && memory !== null && memory < 4) {
    totalScore -= 50;
    parameters.push({
      name: 'Hardware Correlation',
      value: `${cores} cores, ${memory}GB RAM`,
      expected: 'Consistent hardware',
      score: -50,
      maxScore: 0,
      weight: 50,
      status: 'fail',
      criticality: 'high',
      details: 'VM pattern: high cores with low RAM'
    });
    errorLog.push(`VM паттерн: ${cores} ядер, ${memory}GB RAM`);
    specialFlags.push('⚠️ VM hardware pattern detected');
  } else if (cores <= 2 && cores > 0) {
    totalScore -= 30;
    parameters.push({
      name: 'CPU Cores',
      value: `${cores} cores`,
      expected: '4+ cores',
      score: -30,
      maxScore: 0,
      weight: 30,
      status: 'warning',
      criticality: 'medium',
      details: 'Low core count - typical of VMs'
    });
    errorLog.push(`Мало ядер CPU: ${cores} (типично для VM)`);
  } else {
    parameters.push({
      name: 'Hardware',
      value: `${cores} cores, ${memory || '?'}GB RAM`,
      expected: '4+ cores, 4+ GB',
      score: 0,
      maxScore: 0,
      weight: 0,
      status: 'pass',
      criticality: 'medium',
      details: 'Normal hardware configuration'
    });
  }
  
  // ========== GPU CHECK ==========
  // ANGLE is NORMAL on Windows! It translates WebGL to DirectX
  // "ANGLE (Intel, Intel UHD Graphics)" = REAL Intel GPU
  const isGoodGPU = GERMAN_PROFILE_STANDARD.expected_values.webgl_unmasked_renderer.some(
    renderer => webglRendererLower.includes(renderer.toLowerCase())
  );
  
  // Check for real GPU keywords even if not in expected list
  const hasRealGPUKeywords = 
    webglRendererLower.includes('nvidia') ||
    webglRendererLower.includes('geforce') ||
    webglRendererLower.includes('radeon') ||
    webglRendererLower.includes('intel') && webglRendererLower.includes('uhd') ||
    webglRendererLower.includes('intel') && webglRendererLower.includes('hd graphics') ||
    webglRendererLower.includes('apple') && (webglRendererLower.includes('m1') || webglRendererLower.includes('m2') || webglRendererLower.includes('m3'));
  
  const isRealGPU = isGoodGPU || hasRealGPUKeywords;

  parameters.push({
    name: 'GPU Type',
    value: fingerprint.webgl.renderer.substring(0, 40),
    expected: 'NVIDIA/AMD/Intel/Apple',
    score: isRealGPU ? 0 : -20,
    maxScore: 0,
    weight: 20,
    status: isRealGPU ? 'pass' : 'warning',
    criticality: 'critical',
    details: isRealGPU ? 'Physical GPU detected' : 'Unknown GPU type'
  });
  
  // ========== LANGUAGE CHECK ==========
  if (!fingerprint.language.isGermanPrimary && fingerprint.ipInfo?.countryCode === 'DE') {
    totalScore -= 20;
    parameters.push({
      name: 'Language',
      value: fingerprint.language.languages.slice(0, 2).join(', '),
      expected: 'de-DE (primary)',
      score: -20,
      maxScore: 0,
      weight: 20,
      status: 'warning',
      criticality: 'medium',
      details: 'German not primary for German IP'
    });
    recommendations.push('Set German (de-DE) as primary language');
  } else {
    parameters.push({
      name: 'Language',
      value: fingerprint.language.languages.slice(0, 2).join(', '),
      expected: 'de-DE',
      score: 0,
      maxScore: 0,
      weight: 0,
      status: 'pass',
      criticality: 'medium',
      details: 'Language settings OK'
    });
  }
  
  // ========== CANVAS CONSISTENCY ==========
  if (!fingerprint.canvas.isConsistent) {
    totalScore -= 15;
    parameters.push({
      name: 'Canvas',
      value: 'Inconsistent',
      expected: 'Consistent hash',
      score: -15,
      maxScore: 0,
      weight: 15,
      status: 'warning',
      criticality: 'low',
      details: 'Canvas hash varies between renders'
    });
  } else {
    parameters.push({
      name: 'Canvas',
      value: 'Consistent',
      expected: 'Consistent hash',
      score: 0,
      maxScore: 0,
      weight: 0,
      status: 'pass',
      criticality: 'low',
      details: 'Canvas fingerprint consistent'
    });
  }
  
  // ========================================
  // FINAL CALCULATIONS
  // ========================================
  
  // Clamp score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, totalScore));
  
  // Determine risk level and verdict
  let riskLevel: 'trusted' | 'suspicious' | 'high_risk';
  let verdict: string;
  
  if (finalScore >= 90) {
    riskLevel = 'trusted';
    verdict = '✅ Ready for AliExpress Discount';
  } else if (finalScore >= 70) {
    riskLevel = 'suspicious';
    verdict = '⚠️ Risk of Order Close (Check MTU/WebRTC)';
  } else {
    riskLevel = 'high_risk';
    verdict = '❌ Account will be banned/Coupon fail';
  }
  
  return {
    totalScore: finalScore,
    maxScore: 100,
    percentage: finalScore,
    riskLevel,
    verdict,
    parameters,
    specialFlags,
    errorLog,
    recommendations,
    killSwitchTriggered: false
  };
}

// Helper function to create kill-switch result
function createKillSwitchResult(
  reason: string,
  message: string,
  recommendations: string[],
  parameters: ParameterScore[]
): TrustScoreResult {
  return {
    totalScore: 0,
    maxScore: 100,
    percentage: 0,
    riskLevel: 'high_risk',
    verdict: '❌ Account will be banned/Coupon fail',
    parameters,
    specialFlags: [message],
    errorLog: [`KILL-SWITCH: ${reason}`],
    recommendations,
    killSwitchTriggered: true,
    killSwitchReason: reason
  };
}

export { GERMAN_PROFILE_STANDARD };
