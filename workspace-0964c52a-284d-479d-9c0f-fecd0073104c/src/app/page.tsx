'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw,
  Shield,
  Fingerprint,
  Play,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wifi,
  Cpu,
  Globe,
  Monitor
} from 'lucide-react';
import { TrustGauge } from '@/components/TrustGauge';
import { collectFingerprint } from '@/lib/fingerprint';
import { calculateTrustScore } from '@/lib/trust-score';
import type { FingerprintData, TrustScoreResult, TableRowData } from '@/lib/types/fingerprint';

export default function Home() {
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState<FingerprintData | null>(null);
  const [trustResult, setTrustResult] = useState<TrustScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  const runAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsStarted(true);
    
    const steps = [
      '🌐 Fetching IP geolocation...',
      '🎮 Analyzing WebGL renderer...',
      '🔓 Testing WebRTC status...',
      '🎨 Checking canvas fingerprint...',
      '🔊 Scanning audio context...',
      '💻 Detecting hardware info...',
      '🕐 Validating timezone...',
      '🗣️ Checking language settings...',
      '🔍 Anti-spoofing detection...',
      '📊 Calculating Trust Score...'
    ];
    
    try {
      // Animate through steps
      for (let i = 0; i < steps.length - 1; i++) {
        setCurrentStep(steps[i]);
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      
      setCurrentStep(steps[steps.length - 1]);
      
      // Collect fingerprint data
      const data = await collectFingerprint();
      setFingerprint(data);
      
      // Calculate trust score
      const result = calculateTrustScore(data);
      setTrustResult(result);
      
      setCurrentStep('Analysis complete!');
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze browser fingerprint. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Build table data from fingerprint and trust result
  const buildTableData = (): TableRowData[] => {
    if (!fingerprint || !trustResult) return [];
    
    const rows: TableRowData[] = [];
    
    // Connection Type
    rows.push({
      parameter: 'Connection Type',
      userValue: fingerprint.ipInfo?.mobile ? 'Mobile' : 
                 fingerprint.network.ispType === 'residential' ? 'Residential' :
                 fingerprint.network.ispType.toUpperCase(),
      expectedValue: 'Residential/Mobile',
      status: fingerprint.network.ispType === 'residential' || fingerprint.ipInfo?.mobile ? 'pass' : 
             fingerprint.network.ispType === 'datacenter' ? 'fail' : 'warning',
      criticality: 'critical'
    });
    
    // ISP
    rows.push({
      parameter: 'ISP',
      userValue: fingerprint.ipInfo?.isp || 'Unknown',
      expectedValue: 'Telekom/Vodafone/O2',
      status: fingerprint.network.isTrustedISP ? 'pass' : 'warning',
      criticality: 'high'
    });
    
    // MTU
    rows.push({
      parameter: 'MTU',
      userValue: fingerprint.network.mtu?.toString() || 'Unknown',
      expectedValue: '1492/1500',
      status: fingerprint.network.vpnDetectedByMTU ? 'fail' : 
             fingerprint.network.mtu === 1492 || fingerprint.network.mtu === 1500 ? 'pass' : 'warning',
      details: fingerprint.network.vpnDetectedByMTU ? 'VPN detected by MTU' : undefined,
      criticality: 'high'
    });
    
    // WebGL
    rows.push({
      parameter: 'WebGL Renderer',
      userValue: fingerprint.webgl.renderer.substring(0, 35),
      expectedValue: 'NVIDIA/AMD/Intel/Apple',
      status: fingerprint.webgl.isVirtualGPU ? 'fail' : 'pass',
      criticality: 'critical'
    });
    
    // WebRTC
    rows.push({
      parameter: 'WebRTC',
      userValue: fingerprint.webrtc.status === 'blocked' ? 'Blocked' :
                 fingerprint.webrtc.hasLeak ? `Leak: ${fingerprint.webrtc.localIPs[0]}` : 'OK',
      expectedValue: 'Active/No leak',
      status: fingerprint.webrtc.status === 'blocked' ? 'warning' : 
             fingerprint.webrtc.hasLeak ? 'warning' : 'pass',
      criticality: 'high'
    });
    
    // Timezone
    rows.push({
      parameter: 'Timezone',
      userValue: fingerprint.timezone.timezone,
      expectedValue: 'Europe/Berlin',
      status: fingerprint.timezone.isGermanTimezone ? 'pass' : 
             fingerprint.geoSync.ipTimezoneMatchesSystem ? 'warning' : 'fail',
      criticality: 'high'
    });
    
    // Language
    rows.push({
      parameter: 'Language',
      userValue: fingerprint.language.languages.slice(0, 2).join(', '),
      expectedValue: 'de-DE (primary)',
      status: fingerprint.language.isGermanPrimary ? 'pass' : 
             fingerprint.language.hasGerman ? 'warning' : 'fail',
      criticality: 'medium'
    });
    
    // CPU Cores
    rows.push({
      parameter: 'CPU Cores',
      userValue: `${fingerprint.hardware.cores || 'Unknown'} cores`,
      expectedValue: '4+ cores',
      status: fingerprint.hardware.cores >= 4 ? 'pass' : 
             fingerprint.hardware.cores >= 2 ? 'warning' : 'fail',
      criticality: 'medium'
    });
    
    // Memory
    rows.push({
      parameter: 'Device Memory',
      userValue: fingerprint.hardware.memory ? `${fingerprint.hardware.memory} GB` : 'Unknown',
      expectedValue: '4+ GB',
      status: (fingerprint.hardware.memory ?? 0) >= 4 ? 'pass' : 
             fingerprint.hardware.memory ? 'warning' : 'warning',
      criticality: 'low'
    });
    
    // Browser Version
    rows.push({
      parameter: 'Browser Version',
      userValue: fingerprint.antiSpoofing.browserVersion,
      expectedValue: 'Current stable',
      status: fingerprint.antiSpoofing.fakeBrowserVersion ? 'fail' : 'pass',
      criticality: 'high'
    });
    
    // Canvas
    rows.push({
      parameter: 'Canvas Fingerprint',
      userValue: fingerprint.canvas.isSpoofed ? 'Masked' : 
                 (fingerprint.canvas.isConsistent ? 'Consistent' : 'Inconsistent'),
      expectedValue: 'Consistent',
      status: fingerprint.canvas.isSpoofed ? 'fail' : 
             fingerprint.canvas.isConsistent ? 'pass' : 'warning',
      criticality: 'medium'
    });
    
    // Automation
    rows.push({
      parameter: 'Automation',
      userValue: fingerprint.antiSpoofing.webdriver ? 'Webdriver' :
                 fingerprint.antiSpoofing.chromeDriver ? 'ChromeDriver' :
                 fingerprint.antiSpoofing.isHeadless ? 'Headless' : 'None',
      expectedValue: 'None',
      status: fingerprint.antiSpoofing.webdriver || fingerprint.antiSpoofing.chromeDriver ? 'fail' : 'pass',
      criticality: 'critical'
    });
    
    return rows;
  };

  // Render status icon
  const renderStatus = (status: 'pass' | 'warning' | 'fail' | 'loading') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <span className="text-gray-400">-</span>;
    }
  };

  // Initial landing page
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 mb-6 shadow-lg shadow-purple-500/30">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
              Trust Score
            </h1>
            <p className="text-xl text-slate-400 mb-2">
              Browser Fingerprint Analysis
            </p>
            <p className="text-slate-500 max-w-lg mx-auto">
              Deep audit for AliExpress discount eligibility. 
              Detects VPNs, VMs, automation, and fingerprint spoofing.
            </p>
          </div>
          
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                What will be checked:
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { icon: Wifi, text: 'ISP Type & MTU', desc: 'VPN detection' },
                  { icon: Monitor, text: 'WebGL Renderer', desc: 'VM detection' },
                  { icon: Globe, text: 'Geo-Sync', desc: 'IP vs System' },
                  { icon: Cpu, text: 'Hardware', desc: 'CPU/RAM correlation' },
                  { icon: Shield, text: 'Anti-Automation', desc: 'Webdriver/ChromeDriver' },
                  { icon: Fingerprint, text: 'Canvas', desc: 'Fingerprint spoofing' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
                    <item.icon className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-slate-200 font-medium">{item.text}</div>
                      <div className="text-slate-500 text-xs">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="text-center">
            <Button 
              onClick={runAnalysis}
              size="lg"
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white px-10 py-7 text-lg font-semibold shadow-lg shadow-purple-500/30"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Deep Audit
            </Button>
            <p className="text-slate-500 text-sm mt-4">
              Analysis takes ~5 seconds. No data is stored.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 mb-6 animate-pulse">
            <Fingerprint className="w-12 h-12 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Analyzing...</h2>
          <p className="text-slate-400 mb-6">{currentStep}</p>
          
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((steps.indexOf(currentStep) + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg bg-red-900/20 border-red-500/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={runAnalysis} className="ml-4 bg-slate-700 hover:bg-slate-600">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const tableData = buildTableData();

  // Results view
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Trust Score Analysis</h1>
                <p className="text-sm text-slate-400">AliExpress Discount Eligibility</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={runAnalysis}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-analyze
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Kill Switch Alert */}
        {trustResult?.killSwitchTriggered && (
          <Alert variant="destructive" className="mb-6 border-red-500 bg-red-900/20">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-red-400 text-lg font-bold">🚨 KILL-SWITCH TRIGGERED</AlertTitle>
            <AlertDescription className="text-red-300 text-base">
              {trustResult.specialFlags[0]}
            </AlertDescription>
          </Alert>
        )}

        {/* Trust Score Section */}
        <section className="mb-8">
          <Card className="overflow-hidden bg-slate-800/50 border-slate-700">
            <div className="p-8">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Verdict */}
                <div className="flex-1 text-center lg:text-left">
                  <div className={`text-3xl font-bold mb-4 ${
                    trustResult?.percentage && trustResult.percentage >= 90 ? 'text-green-400' :
                    trustResult?.percentage && trustResult.percentage >= 70 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {trustResult?.verdict}
                  </div>
                  
                  {trustResult?.specialFlags && trustResult.specialFlags.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {trustResult.specialFlags.map((flag, i) => (
                        <div 
                          key={i} 
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-sm mr-2 mb-2"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          {flag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Gauge */}
                <TrustGauge 
                  score={trustResult?.percentage || 0}
                  riskLevel={trustResult?.riskLevel || 'high_risk'}
                />
              </div>
            </div>
          </Card>
        </section>

        {/* Error Log */}
        {trustResult?.errorLog && trustResult.errorLog.length > 0 && (
          <section className="mb-8">
            <Card className="border-red-500/50 bg-red-900/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  Error Log
                </CardTitle>
                <CardDescription className="text-red-300/70">
                  Параметры, которые &quot;спалили&quot; систему:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {trustResult.errorLog.map((err, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 p-3 rounded-lg">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="font-mono">{err}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Comparison Table */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Parameter Analysis
          </h2>
          
          <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600">
                    <th className="text-left p-4 text-slate-400 font-medium">Параметр</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Твоё значение</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Эталон (DE)</th>
                    <th className="text-center p-4 text-slate-400 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{row.parameter}</span>
                          {row.criticality === 'critical' && (
                            <Badge variant="destructive" className="text-xs">Critical</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-sm">
                        {row.userValue}
                      </td>
                      <td className="p-4 text-slate-400 text-sm">
                        {row.expectedValue}
                      </td>
                      <td className="p-4 text-center">
                        {renderStatus(row.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Recommendations */}
        {trustResult && trustResult.recommendations.length > 0 && (
          <section className="mb-8">
            <Card className="border-yellow-500/50 bg-yellow-900/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {trustResult.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-yellow-500 mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        {/* IP Details */}
        {fingerprint?.ipInfo && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">IP Details</h2>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400">IP Address</div>
                    <div className="text-white font-mono">{fingerprint.ipInfo.ip}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Country</div>
                    <div className="text-white">{fingerprint.ipInfo.country} ({fingerprint.ipInfo.countryCode})</div>
                  </div>
                  <div>
                    <div className="text-slate-400">City</div>
                    <div className="text-white">{fingerprint.ipInfo.city}, {fingerprint.ipInfo.region}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">ISP</div>
                    <div className="text-white">{fingerprint.ipInfo.isp}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Usage Type</div>
                    <div className={`capitalize ${
                      fingerprint.ipInfo.usageType === 'residential' || fingerprint.ipInfo.usageType === 'mobile' 
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {fingerprint.ipInfo.usageType}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">VPN/Proxy</div>
                    <div className={fingerprint.ipInfo.vpn || fingerprint.ipInfo.proxy ? 'text-red-400' : 'text-green-400'}>
                      {fingerprint.ipInfo.vpn || fingerprint.ipInfo.proxy ? 'Detected' : 'None'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Datacenter</div>
                    <div className={fingerprint.ipInfo.isDatacenter ? 'text-red-400' : 'text-green-400'}>
                      {fingerprint.ipInfo.isDatacenter ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Trusted ISP</div>
                    <div className={fingerprint.network.isTrustedISP ? 'text-green-400' : 'text-slate-400'}>
                      {fingerprint.network.isTrustedISP ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800/30 border-t border-slate-700 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Browser Fingerprint Analyzer</span>
            </div>
            <div>
              Analysis: {fingerprint ? new Date(fingerprint.timestamp).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const steps = [
  '🌐 Fetching IP geolocation...',
  '🎮 Analyzing WebGL renderer...',
  '🔓 Testing WebRTC status...',
  '🎨 Checking canvas fingerprint...',
  '🔊 Scanning audio context...',
  '💻 Detecting hardware info...',
  '🕐 Validating timezone...',
  '🗣️ Checking language settings...',
  '🔍 Anti-spoofing detection...',
  '📊 Calculating Trust Score...'
];
