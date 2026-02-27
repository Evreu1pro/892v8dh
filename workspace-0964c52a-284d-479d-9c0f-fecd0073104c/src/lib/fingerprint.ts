import type { FingerprintData, GeoSyncResult } from './types/fingerprint';
import { collectCanvasFingerprint } from './anti-spoofing';
import { collectWebGLFingerprint } from './collectors/webgl';
import { collectAudioFingerprint } from './collectors/audio';
import { collectHardwareInfo } from './collectors/hardware';
import { collectWebRTCLeak } from './collectors/webrtc';
import { collectNetworkInfo } from './collectors/network';
import { collectTimezoneInfo, validateTimezoneConsistency } from './collectors/timezone';
import { collectLanguageInfo, validateLanguageConsistency, detectKeyboardLayout } from './collectors/language';
import { collectFontInfo } from './collectors/fonts';
import { fetchIPInfoClient } from './ip-fetch';
import { detectAutomation, testHardwarePerformance } from './anti-spoofing';
import { GERMAN_PROFILE_STANDARD } from './german-profile';

// Check geo-sync between IP and system settings
function checkGeoSync(
  ipInfo: FingerprintData['ipInfo'],
  timezone: FingerprintData['timezone'],
  language: FingerprintData['language']
): GeoSyncResult {
  const mismatches: string[] = [];
  
  // Check IP country matches system language
  const ipCountryMatchesSystemLanguage = !ipInfo?.countryCode || 
    ipInfo.countryCode === 'DE' && language.isGermanPrimary ||
    ipInfo.countryCode !== 'DE'; // Non-German IP is OK if language matches elsewhere
  
  if (!ipCountryMatchesSystemLanguage && ipInfo?.countryCode === 'DE' && !language.hasGerman) {
    mismatches.push(`IP country (Germany) doesn't match system language (${language.primaryLanguage})`);
  }
  
  // Check IP timezone matches system timezone
  const ipTimezoneMatchesSystem = !ipInfo?.timezone || 
    ipInfo.timezone === timezone.timezone;
  
  if (!ipTimezoneMatchesSystem && ipInfo?.timezone) {
    mismatches.push(`IP timezone (${ipInfo.timezone}) doesn't match system (${timezone.timezone})`);
  }
  
  // Overall location match
  const ipLocationMatchesSystem = ipTimezoneMatchesSystem && 
    (ipCountryMatchesSystemLanguage || ipInfo?.countryCode !== 'DE');
  
  return {
    ipCountryMatchesSystemLanguage,
    ipTimezoneMatchesSystem,
    ipLocationMatchesSystem,
    mismatches
  };
}

export async function collectFingerprint(): Promise<FingerprintData> {
  // Collect all fingerprint data in parallel for better performance
  // IP info is fetched CLIENT-SIDE to get real user IP
  const [
    canvas,
    webgl,
    audio,
    hardware,
    webrtc,
    ipInfo,
    timezone,
    language,
    fonts,
    antiSpoofing,
    performanceScore
  ] = await Promise.all([
    collectCanvasFingerprint(),
    collectWebGLFingerprint(),
    collectAudioFingerprint(),
    collectHardwareInfo(),
    collectWebRTCLeak(),
    fetchIPInfoClient(),
    Promise.resolve(collectTimezoneInfo()),
    Promise.resolve(collectLanguageInfo()),
    collectFontInfo(),
    Promise.resolve(detectAutomation()),
    Promise.resolve(testHardwarePerformance())
  ]);
  
  // Get keyboard layout
  const keyboard = detectKeyboardLayout();
  
  // Get network info with IP data
  const network = collectNetworkInfo(ipInfo);
  
  // Validate consistency
  const timezoneValidation = validateTimezoneConsistency();
  const languageValidation = validateLanguageConsistency();
  
  // Check geo-sync
  const geoSync = checkGeoSync(ipInfo, timezone, language);
  
  // Log any inconsistencies
  if (!timezoneValidation.isConsistent) {
    console.warn('Timezone inconsistencies:', timezoneValidation.issues);
  }
  if (!languageValidation.isConsistent) {
    console.warn('Language inconsistencies:', languageValidation.issues);
  }
  
  // Collect metadata
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const screenResolution = `${screen.width}x${screen.height}`;
  const colorDepth = screen.colorDepth;
  const devicePixelRatio = window.devicePixelRatio;
  
  // Build complete fingerprint data
  const fingerprintData: FingerprintData = {
    // Hardware
    canvas,
    webgl,
    audio,
    hardware,
    performanceScore,
    
    // Network
    webrtc,
    network,
    ipInfo,
    
    // Environment
    timezone,
    language,
    keyboard: {
      layout: keyboard.layout,
      hasGermanKeys: keyboard.hasGermanKeys,
      detectedKeys: []
    },
    fonts,
    geoSync,
    
    // Anti-Spoofing
    antiSpoofing,
    
    // Metadata
    userAgent,
    platform,
    screenResolution,
    colorDepth,
    devicePixelRatio,
    timestamp: Date.now()
  };
  
  return fingerprintData;
}

// Export all collectors for individual use
export {
  collectCanvasFingerprint,
  collectWebGLFingerprint,
  collectAudioFingerprint,
  collectHardwareInfo,
  collectWebRTCLeak,
  collectNetworkInfo,
  collectTimezoneInfo,
  collectLanguageInfo,
  collectFontInfo,
  fetchIPInfoClient,
  detectAutomation,
  testHardwarePerformance
};
