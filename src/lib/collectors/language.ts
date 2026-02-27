import type { LanguageResult } from '../types/fingerprint';

// German language codes
const GERMAN_LANGUAGE_CODES = ['de', 'de-DE', 'de-AT', 'de-CH', 'de-LI', 'de-LU', 'de-BE'];

export function collectLanguageInfo(): LanguageResult {
  try {
    // Get browser languages
    const languages = [...navigator.languages];
    const language = navigator.language;
    
    // Check if German is primary
    const isGermanPrimary = GERMAN_LANGUAGE_CODES.some(code => 
      languages[0]?.toLowerCase().startsWith(code.toLowerCase())
    );
    
    // Check if German is present anywhere
    const hasGerman = languages.some(lang => 
      GERMAN_LANGUAGE_CODES.some(code => 
        lang.toLowerCase().startsWith(code.toLowerCase())
      )
    );
    
    // Primary language code
    const primaryLanguage = languages[0] || language || 'Unknown';
    
    return {
      languages,
      isGermanPrimary,
      hasGerman,
      primaryLanguage
    };
  } catch (error) {
    console.error('Language info error:', error);
    return {
      languages: [],
      isGermanPrimary: false,
      hasGerman: false,
      primaryLanguage: 'Unknown'
    };
  }
}

// Additional language validation
export function validateLanguageConsistency(): {
  isConsistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  try {
    const languages = navigator.languages;
    const language = navigator.language;
    
    // Check if navigator.language matches the first in navigator.languages
    if (languages.length > 0 && language !== languages[0]) {
      issues.push(`Language mismatch: navigator.language (${language}) != navigator.languages[0] (${languages[0]})`);
    }
    
    // Check for suspicious language ordering
    // Real users typically have their primary language first
    if (languages.length > 1) {
      const firstLang = languages[0];
      const secondLang = languages[1];
      
      // Check if second language is a variant of the first (suspicious)
      if (firstLang && secondLang && 
          firstLang.split('-')[0] === secondLang.split('-')[0] &&
          firstLang !== secondLang) {
        // This is actually normal (e.g., de-DE followed by de)
      }
    }
    
    // Check for empty or missing languages
    if (languages.length === 0) {
      issues.push('No languages detected');
    }
    
    // Check for inconsistent locale format
    const hasInvalidFormat = languages.some(lang => 
      !/^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/.test(lang)
    );
    if (hasInvalidFormat) {
      issues.push('Invalid language format detected');
    }
    
    return {
      isConsistent: issues.length === 0,
      issues
    };
  } catch (error) {
    return {
      isConsistent: false,
      issues: ['Error validating languages']
    };
  }
}

// Check for German keyboard layout indicators
export function detectKeyboardLayout(): {
  layout: string | null;
  hasGermanKeys: boolean;
} {
  try {
    // We can't directly detect keyboard layout in browsers
    // But we can make educated guesses based on language settings
    
    const languages = navigator.languages;
    const hasGerman = languages.some(lang => 
      lang.toLowerCase().startsWith('de')
    );
    
    return {
      layout: hasGerman ? 'German (inferred)' : null,
      hasGermanKeys: hasGerman
    };
  } catch {
    return {
      layout: null,
      hasGermanKeys: false
    };
  }
}
