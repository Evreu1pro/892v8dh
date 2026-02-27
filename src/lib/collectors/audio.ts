import type { AudioResult } from '../types/fingerprint';

// Generate a hash from a buffer
async function generateHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

export async function collectAudioFingerprint(): Promise<AudioResult> {
  try {
    // Check if AudioContext is available
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    
    if (!AudioContextClass) {
      return {
        audioHash: 'not_supported',
        hasADCArtifacts: false,
        sampleRate: 0,
        channelCount: 0
      };
    }

    // Create offline context for consistent results
    const sampleRate = 44100;
    const duration = 1; // 1 second
    const offlineContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
    
    // Create oscillator (440Hz sine wave - A4 note)
    const oscillator = offlineContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, 0);
    
    // Create compressor for more complex signal
    const compressor = offlineContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, 0);
    compressor.knee.setValueAtTime(40, 0);
    compressor.ratio.setValueAtTime(12, 0);
    compressor.attack.setValueAtTime(0, 0);
    compressor.release.setValueAtTime(0.25, 0);
    
    // Create gain node
    const gain = offlineContext.createGain();
    gain.gain.setValueAtTime(0.5, 0);
    
    // Connect nodes
    oscillator.connect(compressor);
    compressor.connect(gain);
    gain.connect(offlineContext.destination);
    
    // Start and render
    oscillator.start(0);
    const renderedBuffer = await offlineContext.startRendering();
    
    // Analyze the rendered audio
    const leftChannel = renderedBuffer.getChannelData(0);
    const rightChannel = renderedBuffer.getChannelData(1);
    
    // Create fingerprint from channel data
    // Sample every 100th value to create a compact representation
    const fingerprint: number[] = [];
    for (let i = 0; i < leftChannel.length; i += 100) {
      fingerprint.push(leftChannel[i]);
      fingerprint.push(rightChannel[i]);
    }
    
    // Convert to ArrayBuffer for hashing
    const fingerprintBuffer = new Float32Array(fingerprint).buffer;
    const audioHash = await generateHash(fingerprintBuffer);
    
    // Detect ADC artifacts
    // VMs often have very clean (no noise) or unusual noise patterns
    let hasADCArtifacts = false;
    
    // Calculate variance in the signal - real hardware has natural variations
    const variance = calculateVariance(leftChannel);
    
    // Real audio hardware typically has variance in a certain range
    // VMs may have too consistent (near zero) or too chaotic values
    if (variance < 0.00001 || variance > 0.5) {
      hasADCArtifacts = true;
    }
    
    // Check for uniform distribution (VM signature)
    const mean = leftChannel.reduce((a, b) => a + b, 0) / leftChannel.length;
    const deviation = Math.abs(mean);
    
    // Real audio output should be centered around 0
    // Large deviation might indicate processing artifacts
    if (deviation > 0.1) {
      hasADCArtifacts = true;
    }
    
    // Additional check: sample correlation between channels
    // Real stereo often has slight differences, VMs might have identical channels
    let channelDifference = 0;
    for (let i = 0; i < Math.min(leftChannel.length, rightChannel.length); i++) {
      channelDifference += Math.abs(leftChannel[i] - rightChannel[i]);
    }
    channelDifference /= leftChannel.length;
    
    // Identical channels in a stereo setup could indicate VM
    if (channelDifference < 0.0001) {
      // Not necessarily VM, but suspicious
    }

    return {
      audioHash,
      hasADCArtifacts,
      sampleRate: renderedBuffer.sampleRate,
      channelCount: renderedBuffer.numberOfChannels
    };
  } catch (error) {
    console.error('Audio fingerprint error:', error);
    return {
      audioHash: 'error',
      hasADCArtifacts: false,
      sampleRate: 0,
      channelCount: 0
    };
  }
}

function calculateVariance(data: Float32Array): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squaredDiffs = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0);
  return squaredDiffs / data.length;
}
