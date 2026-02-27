// German User Profile Standard for Trust Score Analysis
// Updated with advanced detection rules

export const GERMAN_PROFILE_STANDARD = {
  target_market: "Germany",
  
  // ============================================
  // EXPECTED VALUES
  // ============================================
  expected_values: {
    webrtc_lan_ip: null, // No leaks allowed
    tcp_mtu: [1492, 1500], // Standard for residential/mobile
    dns_match: true, // Country IP = Country DNS
    webgl_unmasked_vendor: [
      "NVIDIA Corporation",
      "Apple Inc.",
      "Intel Inc.",
      "Intel",
      "AMD",
      "Google Inc. (NVIDIA)",
      "Google Inc. (AMD)",
      "Google Inc. (Intel)"
    ],
    // Valid GPU patterns - ANGLE is NORMAL on Windows!
    // ANGLE = Almost Native Graphics Layer (WebGL to DirectX translation)
    webgl_unmasked_renderer: [
      "NVIDIA GeForce",
      "NVIDIA RTX",
      "NVIDIA GTX",
      "NVIDIA Quadro",
      "AMD Radeon",
      "Apple M1",
      "Apple M2",
      "Apple M3",
      "Apple GPU",
      "Intel Iris",
      "Intel Iris Plus",
      "Intel UHD Graphics",
      "Intel HD Graphics",
      "ANGLE (Intel",     // ANGLE with Intel = REAL GPU on Windows
      "ANGLE (NVIDIA",    // ANGLE with NVIDIA = REAL GPU on Windows
      "ANGLE (AMD",       // ANGLE with AMD = REAL GPU on Windows
      "ANGLE (Apple"      // ANGLE with Apple = REAL GPU
    ],
    timezone: "Europe/Berlin",
    languages: ["de-DE", "de", "de-AT", "de-CH"],
    primary_language: "de-DE",
    language_header: "de-DE, de;q=0.9, en-US;q=0.8, en;q=0.7",
    min_cores: 4,
    min_memory: 4,
    max_cores_low_memory: 8 // If cores > 8 and memory < 4GB = VM
  },

  // ============================================
  // ISP LISTS
  // ============================================
  
  // ISPs that indicate BAN (datacenter/hosting)
  // Note: Be careful with "hosting" - some residential ISPs have "hosting" in name
  banned_isp_patterns: [
    "netcup",
    "hetzner",
    "ovh",
    "alibaba cloud",
    "amazon aws",
    "aws ",
    "azure",
    "google cloud",
    "digitalocean",
    "linode",
    "vultr",
    "contabo",
    "datacenter",
    "vps",
    "dedicated server",
    "colocation"
  ],
  
  // Trusted German ISPs (+50 trust)
  trusted_german_isps: [
    "Telekom",
    "Deutsche Telekom",
    "Vodafone",
    "Telefonica",
    "O2",
    "Freenet",
    "Vitroconnect",
    "1&1",
    "Unitymedia",
    "Pyur",
    "Deutsche Glasfaser",
    "M-net",
    "TNets"
  ],

  // ============================================
  // VIRTUAL GPU PATTERNS (KILL-SWITCH)
  // ============================================
  // IMPORTANT: ANGLE is NOT a virtual GPU!
  // ANGLE = Almost Native Graphics Layer (WebGL->DirectX on Windows)
  // "ANGLE (Intel, Intel UHD Graphics)" = REAL Intel GPU
  // "SwiftShader" = VIRTUAL GPU (software renderer)
  virtual_gpu_patterns: [
    "swiftshader",        // Google's software renderer - VM indicator
    "llvmpipe",           // Linux software renderer - VM indicator  
    "microsoft basic render", // Windows software renderer
    "gallium",            // Often VM
    "vmware svga",
    "virtualbox",
    "vbox",
    "parallels",
    "qemu",
    "unknown device",
    "software renderer"
    // REMOVED: "angle" - ANGLE is NORMAL on Windows with real GPU!
    // REMOVED: "mesa" - Mesa can be real GPU on Linux
  ],

  // ============================================
  // MTU STANDARDS
  // ============================================
  mtu_standards: {
    residential: [1492, 1500],
    mobile: [1460, 1500],
    vpn: [1300, 1400, 1420],
    pppoe: 1492,
    standard: 1500,
    vpn_threshold: 1400 // Below this = VPN detected
  },

  // ============================================
  // BROWSER VERSIONS (Chrome releases)
  // ============================================
  // Valid Chrome versions (update periodically)
  // As of 2025: Stable = 133, Beta = 134, Dev = 135, Canary = 136
  valid_chrome_versions: {
    min: 100,
    max: 145,   // Allow some future versions
    stable: 133,
    beta: 134,
    dev: 135,
    canary: 136,
    warning_threshold: 137 // Above this = suspicious (from future)
  },

  // ============================================
  // SCORING WEIGHTS (New System)
  // ============================================
  scoring: {
    // POSITIVE SCORES
    connection_residential: 50,
    trusted_isp: 50,
    good_mtu: 20,
    
    // NEGATIVE SCORES
    mtu_vpn: -80,
    webrtc_blocked: -40,
    timezone_mismatch: -100,
    browser_version_fake: -30, // Reduced - not critical
    vm_detected: -50,
    
    // KILL-SWITCH (Score = 0)
    datacenter_ip: true,
    virtual_gpu: true,
    fingerprint_masking: true,
    webdriver_detected: true
  },

  // ============================================
  // CRITICAL ALERTS
  // ============================================
  critical_alerts: {
    google_swift_shader: {
      code: "DETECTED_VIRTUAL_MACHINE",
      message: "SwiftShader detected - Virtual GPU (VM/Bot)",
      severity: "kill_switch"
    },
    datacenter_ip: {
      code: "DATACENTER_IP_DETECTED",
      message: "IP belongs to datacenter/hosting - Not residential",
      severity: "kill_switch"
    },
    webdriver_detected: {
      code: "WEBDRIVER_DETECTED",
      message: "Automation detected - navigator.webdriver = true",
      severity: "kill_switch"
    },
    chrome_driver_detected: {
      code: "CHROMEDRIVER_DETECTED",
      message: "ChromeDriver traces found in window object",
      severity: "kill_switch"
    },
    fingerprint_masking: {
      code: "FINGERPRINT_MASKING",
      message: "Canvas fingerprint masking detected",
      severity: "kill_switch"
    },
    fake_browser_version: {
      code: "FAKE_BROWSER_VERSION",
      message: "Browser version doesn't exist or is from future",
      severity: "warning" // Changed from critical
    },
    webrtc_blocked: {
      code: "WEBRTC_BLOCKED",
      message: "WebRTC is blocked - Indicates privacy extension/VPN",
      severity: "warning"
    },
    mtu_vpn: {
      code: "MTU_VPN_DETECTED",
      message: "MTU indicates VPN tunnel",
      severity: "warning"
    },
    timezone_mismatch: {
      code: "TIMEZONE_MISMATCH",
      message: "Timezone doesn't match IP geolocation",
      severity: "critical"
    },
    vm_hardware: {
      code: "VM_HARDWARE",
      message: "Hardware configuration typical of VM",
      severity: "warning"
    }
  },

  // ============================================
  // EXPECTED FONTS
  // ============================================
  expected_fonts: {
    windows: ["Segoe UI", "Arial", "Times New Roman", "Calibri", "Verdana", "Tahoma"],
    macos: ["San Francisco", "Helvetica Neue", "Arial", "Lucida Grande", "Menlo"],
    linux: ["DejaVu Sans", "Liberation Sans", "Ubuntu", "Noto Sans"],
    german_fonts: ["Arial", "Helvetica", "Verdana", "Times New Roman", "Georgia", "Segoe UI"]
  },

  // ============================================
  // VERDICT THRESHOLDS
  // ============================================
  verdicts: {
    ready: {
      min: 90,
      max: 100,
      message: "Ready for AliExpress Discount",
      color: "green"
    },
    risk: {
      min: 70,
      max: 89,
      message: "Risk of Order Close (Check MTU/WebRTC)",
      color: "yellow"
    },
    banned: {
      min: 0,
      max: 69,
      message: "Account will be banned/Coupon fail",
      color: "red"
    }
  }
};

// Type exports
export type GermanProfileStandard = typeof GERMAN_PROFILE_STANDARD;
