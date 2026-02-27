import type { WebGLResult } from '../types/fingerprint';

// Known virtual GPU patterns
const VIRTUAL_GPU_PATTERNS = [
  'swiftshader',
  'llvmpipe',
  'software',
  'microsoft basic render',
  'gallium',
  'vmware',
  'virtualbox',
  'vbox',
  'parallels',
  'qemu',
  'mesa',
  'unknown'
];

// Known good GPU patterns
const GOOD_GPU_PATTERNS = {
  NVIDIA: ['nvidia', 'geforce', 'gtx', 'rtx', 'quadro'],
  AMD: ['amd', 'radeon', 'r9', 'rx '],
  Intel: ['intel', 'iris', 'uhd graphics', 'hd graphics'],
  Apple: ['apple', 'm1', 'm2', 'm3', 'apple gpu']
};

export async function collectWebGLFingerprint(): Promise<WebGLResult> {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (!gl) {
      return {
        vendor: 'Not available',
        renderer: 'Not available',
        isVirtualGPU: false,
        gpuType: 'Unknown'
      };
    }

    // Get debug renderer info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    
    let vendor = 'Unknown';
    let renderer = 'Unknown';
    
    if (debugInfo) {
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
    } else {
      // Fallback to standard parameters
      vendor = gl.getParameter(gl.VENDOR) || 'Unknown';
      renderer = gl.getParameter(gl.RENDERER) || 'Unknown';
    }

    // Normalize for comparison
    const rendererLower = renderer.toLowerCase();
    const vendorLower = vendor.toLowerCase();
    const combined = `${vendor} ${renderer}`.toLowerCase();
    
    // Check for virtual GPU
    const isVirtualGPU = VIRTUAL_GPU_PATTERNS.some(pattern => 
      rendererLower.includes(pattern) || vendorLower.includes(pattern)
    );
    
    // Determine GPU type
    let gpuType: 'NVIDIA' | 'AMD' | 'Intel' | 'Apple' | 'Virtual' | 'Unknown' = 'Unknown';
    
    if (isVirtualGPU) {
      gpuType = 'Virtual';
    } else {
      for (const [type, patterns] of Object.entries(GOOD_GPU_PATTERNS)) {
        if (patterns.some(pattern => combined.includes(pattern))) {
          gpuType = type as 'NVIDIA' | 'AMD' | 'Intel' | 'Apple';
          break;
        }
      }
    }

    // Additional WebGL capabilities check
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    
    // VMs often have lower texture size limits
    if (maxTextureSize < 4096 || maxRenderbufferSize < 4096) {
      // This could indicate a VM with limited GPU resources
      if (!isVirtualGPU && gpuType === 'Unknown') {
        // Don't mark as virtual, but it's suspicious
      }
    }

    return {
      vendor,
      renderer,
      isVirtualGPU,
      gpuType
    };
  } catch (error) {
    console.error('WebGL fingerprint error:', error);
    return {
      vendor: 'Error',
      renderer: 'Error',
      isVirtualGPU: false,
      gpuType: 'Unknown'
    };
  }
}
