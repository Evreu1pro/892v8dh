// Hardware Fingerprinting Types
export interface CanvasResult {
  hash: string;
  isVM: boolean;
  vmType?: 'VMware' | 'VirtualBox' | 'QEMU' | 'Parallels' | 'Unknown';
  isConsistent: boolean; // Hash should be consistent across renders
  isSpoofed: boolean; // Too unique = spoofing detected
  hashVariance: number; // Variance between multiple renders
}

export interface WebGLResult {
  vendor: string;
  renderer: string;
  isVirtualGPU: boolean;
  gpuType?: 'NVIDIA' | 'AMD' | 'Intel' | 'Apple' | 'Virtual' | 'Unknown';
}

export interface AudioResult {
  audioHash: string;
  hasADCArtifacts: boolean;
  sampleRate: number;
  channelCount: number;
}

export interface HardwareResult {
  cores: number;
  memory: number | null;
  isSuspicious: boolean;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
}

// Network Intelligence Types
export interface WebRTCResult {
  localIPs: string[];
  hasLeak: boolean;
  leakType?: 'VirtualBox' | 'VMware' | 'Proxy' | 'Normal';
  isBlocked: boolean; // WebRTC is blocked (privacy extension)
  isUnsupported: boolean; // WebRTC not supported
  status: 'active' | 'blocked' | 'unsupported' | 'error';
}

export interface NetworkResult {
  mtu: number | null;
  isVPN: boolean;
  vpnDetectedByMTU: boolean;
  ttlMismatch: boolean;
  proxyHeaders: string[];
  hasProxyHeaders: boolean;
  ispType: 'residential' | 'mobile' | 'datacenter' | 'hosting' | 'unknown';
  isTrustedISP: boolean;
}

export interface IPInfo {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  asname: string;
  mobile: boolean;
  proxy: boolean;
  hosting: boolean;
  vpn: boolean;
  tor: boolean;
  isDatacenter: boolean;
  isResidential: boolean;
  connectionType: 'mobile' | 'isp' | 'datacenter' | 'proxy' | 'unknown';
  usageType: 'residential' | 'mobile' | 'datacenter' | 'business' | 'unknown';
}

// Environmental Types
export interface TimezoneResult {
  timezone: string;
  isGermanTimezone: boolean;
  offset: number;
  ipTimezoneMismatch: boolean;
}

export interface LanguageResult {
  languages: string[];
  isGermanPrimary: boolean;
  hasGerman: boolean;
  primaryLanguage: string;
}

export interface KeyboardResult {
  layout: string | null;
  hasGermanKeys: boolean;
  detectedKeys: string[];
}

export interface FontResult {
  detectedFonts: string[];
  supportsGerman: boolean;
  germanFonts: string[];
}

// Anti-Spoofing Types
export interface AntiSpoofingResult {
  webdriver: boolean;
  chromeDriver: boolean;
  fakeBrowserVersion: boolean;
  browserVersion: string;
  actualChromeVersion: number | null;
  isHeadless: boolean;
  automationIndicators: string[];
}

// Geo-Sync Types
export interface GeoSyncResult {
  ipCountryMatchesSystemLanguage: boolean;
  ipTimezoneMatchesSystem: boolean;
  ipLocationMatchesSystem: boolean;
  mismatches: string[];
}

// Combined Results
export interface FingerprintData {
  // Hardware
  canvas: CanvasResult;
  webgl: WebGLResult;
  audio: AudioResult;
  hardware: HardwareResult;
  performanceScore: number;
  
  // Network
  webrtc: WebRTCResult;
  network: NetworkResult;
  ipInfo: IPInfo | null;
  
  // Environment
  timezone: TimezoneResult;
  language: LanguageResult;
  keyboard: KeyboardResult;
  fonts: FontResult;
  geoSync: GeoSyncResult;
  
  // Anti-Spoofing
  antiSpoofing: AntiSpoofingResult;
  
  // Metadata
  userAgent: string;
  platform: string;
  screenResolution: string;
  colorDepth: number;
  devicePixelRatio: number;
  timestamp: number;
}

// Trust Score Types
export interface ParameterScore {
  name: string;
  value: unknown;
  expected: string;
  score: number;
  maxScore: number;
  weight: number;
  status: 'pass' | 'warning' | 'fail';
  criticality: 'critical' | 'high' | 'medium' | 'low';
  details?: string;
}

export interface TrustScoreResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  riskLevel: 'trusted' | 'suspicious' | 'high_risk';
  verdict: string; // Human-readable verdict
  parameters: ParameterScore[];
  specialFlags: string[];
  errorLog: string[]; // Specific error messages
  recommendations: string[];
  killSwitchTriggered: boolean;
  killSwitchReason?: string;
}

// Table Row for UI display
export interface TableRowData {
  parameter: string;
  userValue: string;
  expectedValue: string;
  status: 'pass' | 'warning' | 'fail' | 'loading';
  details?: string;
  weight?: number;
  criticality?: 'critical' | 'high' | 'medium' | 'low';
}

// Analysis Profile
export interface GermanProfile {
  expectedWebGLVendors: string[];
  virtualGPUPatterns: string[];
  expectedTimezone: string;
  expectedLanguages: string[];
  minCores: number;
  expectedFontFamilies: string[];
  vmCanvasHashes: string[];
}

// Status indicator type
export type StatusType = 'pass' | 'warning' | 'fail' | 'loading' | 'unknown';

export interface ModuleStatus {
  name: string;
  status: StatusType;
  parameters: {
    name: string;
    status: StatusType;
    value: string;
    expected: string;
  }[];
}
