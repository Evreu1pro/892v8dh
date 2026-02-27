import type { FontResult } from '../types/fingerprint';

// Common German fonts and font families
const GERMAN_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Times',
  'Georgia',
  'Verdana',
  'Trebuchet MS',
  'Tahoma',
  'Geneva',
  'Palatino Linotype'
];

// Base fonts that are always available
const BASE_FONTS = ['monospace', 'sans-serif', 'serif'];

// Test fonts for detection
const TEST_FONTS = [
  // Common Windows fonts
  'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
  'Calibri', 'Cambria', 'Cambria Math', 'Candara', 'Consolas', 'Constantia', 'Corbel',
  'Courier New', 'Georgia', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
  'Microsoft Sans Serif', 'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman',
  'Trebuchet MS', 'Verdana', 'Wingdings',
  
  // Common Mac fonts
  'American Typewriter', 'Andale Mono', 'Apple Chancery', 'AppleGothic',
  'Apple Symbols', 'Avenir', 'Avenir Next', 'Avenir Next Condensed',
  'Baskerville', 'Big Caslon', 'Bodoni 72', 'Bradley Hand', 'Brush Script MT',
  'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charter', 'Cochin', 'Comic Sans MS',
  'Copperplate', 'Courier', 'DIN Alternate', 'DIN Condensed', 'Didot',
  'Euphemia UCAS', 'Futura', 'Geneva', 'Gill Sans', 'Helvetica', 'Helvetica Neue',
  'Herculanum', 'Hiragino Kaku Gothic Pro', 'Hiragino Mincho Pro', 'Hoefler Text',
  'InaiMathi', 'Kailasa', 'Kannada MN', 'Kannada Sangam MN', 'Kefa', 'Knockout',
  'Kohinoor Bangla', 'Kohinoor Devanagari', 'Kohinoor Gujarati', 'Kohinoor Telugu',
  'Kokonor', 'Krungthep', 'KufiStandardGK', 'Lao MN', 'Lao Sangam MN',
  'Malayalam MN', 'Malayalam Sangam MN', 'Marker Felt', 'Menlo', 'Microsoft YaHei',
  'Mishafi', 'Mishafi Gold', 'Monaco', 'Mshtakan', 'Mukta Mahee', 'Muna',
  'Myanmar MN', 'Myanmar Sangam MN', 'Nadeem', 'New Peninim MT', 'Noteworthy',
  'Noto Nastaliq Urdu', 'Noto Sans Kannada', 'Noto Sans Myanmar', 'Noto Sans Oriya',
  'Noto Serif Myanmar', 'Optima', 'Oriya MN', 'Oriya Sangam MN', 'PT Mono',
  'PT Sans', 'PT Serif', 'Palatino', 'Papyrus', 'Phosphate', 'PingFang HK',
  'PingFang SC', 'PingFang TC', 'Plantagenet Cherokee', 'Raanana', 'Rockwell',
  'STIX Two Math', 'STIX Two Text', 'STIXGeneral', 'STIXIntegralsD', 'STIXIntegralsSm',
  'STIXIntegralsUp', 'STIXIntegralsUpD', 'STIXIntegralsUpSm', 'STIXNonUnicode',
  'STIXSizeFiveSym', 'STIXSizeFourSym', 'STIXSizeOneSym', 'STIXSizeThreeSym',
  'STIXSizeTwoSym', 'Sana', 'Sathu', 'Savoye LET', 'SignPainter', 'Silom',
  'Sinhala MN', 'Sinhala Sangam MN', 'Skia', 'Snell Roundhand', 'Songti SC',
  'Songti TC', 'STFangsong', 'STHeiti', 'STKaiti', 'STSong', 'Sukhumvit Set',
  'Symbol', 'System Font', 'Tamil MN', 'Tamil Sangam MN', 'Telugu MN',
  'Telugu Sangam MN', 'Thonburi', 'Times', 'Trattatello', 'Trebuchet MS',
  'Waseem', 'Zapf Dingbats', 'Zapfino',
  
  // Common Linux fonts
  'Bitstream Charter', 'Century Schoolbook L', 'Courier 10 Pitch', 'DejaVu Sans',
  'DejaVu Sans Mono', 'DejaVu Serif', 'Dingbats', 'FreeMono', 'FreeSans', 'FreeSerif',
  'Garuda', 'Liberation Mono', 'Liberation Sans', 'Liberation Serif', 'Loma',
  'Nimbus Mono L', 'Nimbus Roman No9 L', 'Nimbus Sans L', 'Norasi', 'Purisa',
  'Sawasdee', 'Standard Symbols L', 'TlwgMono', 'TlwgTypewriter', 'Tlwg Typist',
  'Tlwg Typo', 'Ubuntu', 'Ubuntu Condensed', 'Ubuntu Mono', 'Umpush', 'URW Bookman L',
  'URW Chancery L', 'URW Gothic L', 'URW Palladio L', 'Waree',
  
  // Google Fonts (common)
  'Roboto', 'Open Sans', 'Lato', 'Oswald', 'Source Sans Pro', 'Montserrat',
  'Raleway', 'PT Sans', 'Roboto Slab', 'Merriweather', 'Nunito', 'Ubuntu',
  'Playfair Display', 'Poppins', 'Rubik', 'Work Sans', 'Inter',
  
  // Virtual machine / suspicious fonts
  'VMware SVGA', 'VGASYS', 'Fixedsys', 'Terminal'
];

export async function collectFontInfo(): Promise<FontResult> {
  try {
    const detectedFonts = await detectFonts();
    
    // Check if German fonts are supported
    const germanFonts = detectedFonts.filter(font => 
      GERMAN_FONTS.some(germanFont => 
        font.toLowerCase() === germanFont.toLowerCase()
      )
    );
    
    const supportsGerman = germanFonts.length >= 3;
    
    return {
      detectedFonts,
      supportsGerman,
      germanFonts
    };
  } catch (error) {
    console.error('Font detection error:', error);
    return {
      detectedFonts: [],
      supportsGerman: false,
      germanFonts: []
    };
  }
}

async function detectFonts(): Promise<string[]> {
  const detected: string[] = [];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return detected;
  }
  
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  
  // Test each font
  for (const font of TEST_FONTS) {
    try {
      // Get width with base font
      ctx.font = `${testSize} monospace`;
      const baseWidth = ctx.measureText(testString).width;
      
      ctx.font = `${testSize} sans-serif`;
      const sansWidth = ctx.measureText(testString).width;
      
      ctx.font = `${testSize} serif`;
      const serifWidth = ctx.measureText(testString).width;
      
      // Get width with test font
      ctx.font = `${testSize} "${font}", monospace`;
      const testWidthMono = ctx.measureText(testString).width;
      
      ctx.font = `${testSize} "${font}", sans-serif`;
      const testWidthSans = ctx.measureText(testString).width;
      
      ctx.font = `${testSize} "${font}", serif`;
      const testWidthSerif = ctx.measureText(testString).width;
      
      // If width differs from base fonts, the font is installed
      if (testWidthMono !== baseWidth || 
          testWidthSans !== sansWidth || 
          testWidthSerif !== serifWidth) {
        detected.push(font);
      }
    } catch {
      // Font test failed, skip
    }
  }
  
  return detected;
}

// Check for VM fonts
export function detectVMFonts(detectedFonts: string[]): string[] {
  const vmFonts = [
    'VMware SVGA',
    'VGASYS',
    'Fixedsys',
    'Terminal'
  ];
  
  return detectedFonts.filter(font => 
    vmFonts.some(vmFont => 
      font.toLowerCase().includes(vmFont.toLowerCase())
    )
  );
}
