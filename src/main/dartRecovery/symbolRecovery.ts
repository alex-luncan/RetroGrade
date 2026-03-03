/**
 * Dart Recovery Assistant - Symbol Recovery
 *
 * Extracts and recovers symbol information from decompiled code.
 * Identifies strings, class names, method names, and other metadata.
 */

import {
  RecoveredSymbol,
  StringConstant,
  CodeLocation,
  TypeInference,
  Confidence,
} from './types';

// Common Dart/Flutter prefixes that indicate internal symbols
const INTERNAL_PREFIXES = [
  '_',        // Private
  'Object_',  // Dart core
  '_GrowableList_',
  '_LinkedHashMap_',
  '_StringBase_',
  '_Double_',
  '_Smi_',
  '_async',
  '_sync',
];

// Known Flutter framework class prefixes
const FLUTTER_FRAMEWORK_PREFIXES = [
  'Widget',
  'State',
  'Element',
  'RenderObject',
  'BuildContext',
  'Navigator',
  'MaterialApp',
  'Scaffold',
  'AppBar',
  'Container',
  'Row',
  'Column',
  'Text',
  'Icon',
  'Image',
  'ListView',
  'GridView',
  'Stack',
  'Positioned',
  'Expanded',
  'Flexible',
  'SizedBox',
  'Padding',
  'Center',
  'Align',
  'GestureDetector',
  'InkWell',
  'TextField',
  'Button',
  'FloatingActionButton',
  'Dialog',
  'BottomSheet',
  'Drawer',
  'TabBar',
  'PageView',
];

// String usage patterns
const STRING_USAGE_PATTERNS: { pattern: RegExp; usage: StringConstant['possibleUsage'] }[] = [
  { pattern: /^[A-Z][a-zA-Z0-9]*$/, usage: 'className' },
  { pattern: /^[a-z][a-zA-Z0-9]*$/, usage: 'methodName' },
  { pattern: /^_[a-z][a-zA-Z0-9]*$/, usage: 'fieldName' },
  { pattern: /^https?:\/\//, usage: 'apiEndpoint' },
  { pattern: /^\/api\//, usage: 'apiEndpoint' },
  { pattern: /\s/, usage: 'uiText' },
  { pattern: /^[A-Z][a-z]/, usage: 'uiText' },
];

export class SymbolRecovery {
  private symbols: Map<string, RecoveredSymbol> = new Map();
  private strings: Map<string, StringConstant> = new Map();

  /**
   * Extract all symbols from pseudo-C code
   */
  extractSymbols(code: string, functionName: string, address: string): RecoveredSymbol[] {
    const results: RecoveredSymbol[] = [];

    // Extract function calls
    const funcCallMatches = code.matchAll(/(\w+)_(\w+)\s*\(/g);
    for (const match of funcCallMatches) {
      const className = match[1];
      const methodName = match[2];
      const fullName = `${className}.${methodName}`;

      if (!this.symbols.has(fullName)) {
        const symbol: RecoveredSymbol = {
          address: this.extractAddressFromContext(code, match.index || 0),
          name: fullName,
          type: 'function',
          dartType: this.inferSymbolType(className, methodName),
          references: [address],
        };
        this.symbols.set(fullName, symbol);
        results.push(symbol);
      } else {
        // Add reference
        const existing = this.symbols.get(fullName)!;
        if (!existing.references.includes(address)) {
          existing.references.push(address);
        }
      }
    }

    // Extract class names from type checks
    const typeCheckMatches = code.matchAll(/_instanceOf\s*\(\s*\w+\s*,\s*(\w+)\s*\)/g);
    for (const match of typeCheckMatches) {
      const className = match[1];
      if (!this.symbols.has(className)) {
        const symbol: RecoveredSymbol = {
          address: '',
          name: className,
          type: 'class',
          references: [address],
        };
        this.symbols.set(className, symbol);
        results.push(symbol);
      }
    }

    // Extract field accesses
    const fieldMatches = code.matchAll(/\*\((\w+)\s*\+\s*(0x[0-9a-fA-F]+)\)/g);
    for (const match of fieldMatches) {
      const baseVar = match[1];
      const offset = match[2];
      const fieldKey = `${baseVar}@${offset}`;

      if (!this.symbols.has(fieldKey)) {
        const symbol: RecoveredSymbol = {
          address: offset,
          name: `field_${offset}`,
          type: 'field',
          references: [address],
        };
        this.symbols.set(fieldKey, symbol);
        results.push(symbol);
      }
    }

    return results;
  }

  /**
   * Extract string constants from code
   */
  extractStrings(code: string, location: CodeLocation): StringConstant[] {
    const results: StringConstant[] = [];

    // Extract quoted strings
    const stringMatches = code.matchAll(/"([^"\\]*(\\.[^"\\]*)*)"/g);
    for (const match of stringMatches) {
      const value = match[1];
      const key = value.substring(0, 100); // Use first 100 chars as key

      if (!this.strings.has(key) && value.length > 0) {
        const stringConst: StringConstant = {
          address: this.extractAddressFromContext(code, match.index || 0),
          value,
          encoding: this.detectEncoding(value),
          references: [location],
          possibleUsage: this.classifyStringUsage(value),
        };
        this.strings.set(key, stringConst);
        results.push(stringConst);
      } else if (this.strings.has(key)) {
        // Add reference
        const existing = this.strings.get(key)!;
        existing.references.push(location);
      }
    }

    return results;
  }

  /**
   * Recover class hierarchy information
   */
  recoverClassHierarchy(symbols: RecoveredSymbol[]): Map<string, string[]> {
    const hierarchy = new Map<string, string[]>();

    // Group methods by class
    for (const symbol of symbols) {
      if (symbol.type === 'function' && symbol.name.includes('.')) {
        const [className] = symbol.name.split('.');
        const methods = hierarchy.get(className) || [];
        methods.push(symbol.name);
        hierarchy.set(className, methods);
      }
    }

    return hierarchy;
  }

  /**
   * Find potential class definitions
   */
  findClassDefinitions(code: string): string[] {
    const classes = new Set<string>();

    // Look for constructor calls
    const constructorMatches = code.matchAll(/(\w+)_\w*[Cc]onstructor|new_(\w+)/g);
    for (const match of constructorMatches) {
      const className = match[1] || match[2];
      if (className && !this.isInternalSymbol(className)) {
        classes.add(className);
      }
    }

    // Look for class type references
    const typeMatches = code.matchAll(/_instanceOf\s*\(\s*\w+\s*,\s*(\w+)\s*\)/g);
    for (const match of typeMatches) {
      if (!this.isInternalSymbol(match[1])) {
        classes.add(match[1]);
      }
    }

    return Array.from(classes);
  }

  /**
   * Find API endpoints from strings
   */
  findApiEndpoints(): StringConstant[] {
    return Array.from(this.strings.values()).filter(
      (s) => s.possibleUsage === 'apiEndpoint'
    );
  }

  /**
   * Find UI text strings
   */
  findUiStrings(): StringConstant[] {
    return Array.from(this.strings.values()).filter(
      (s) => s.possibleUsage === 'uiText'
    );
  }

  /**
   * Get all recovered symbols
   */
  getAllSymbols(): RecoveredSymbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Get all recovered strings
   */
  getAllStrings(): StringConstant[] {
    return Array.from(this.strings.values());
  }

  /**
   * Check if a symbol is internal (framework/runtime)
   */
  isInternalSymbol(name: string): boolean {
    return INTERNAL_PREFIXES.some((prefix) => name.startsWith(prefix));
  }

  /**
   * Check if a symbol is from Flutter framework
   */
  isFlutterFrameworkSymbol(name: string): boolean {
    return FLUTTER_FRAMEWORK_PREFIXES.some((prefix) => name.startsWith(prefix));
  }

  /**
   * Get symbol statistics
   */
  getStatistics(): {
    totalSymbols: number;
    functions: number;
    classes: number;
    fields: number;
    strings: number;
    userSymbols: number;
    frameworkSymbols: number;
  } {
    const symbols = this.getAllSymbols();
    return {
      totalSymbols: symbols.length,
      functions: symbols.filter((s) => s.type === 'function').length,
      classes: symbols.filter((s) => s.type === 'class').length,
      fields: symbols.filter((s) => s.type === 'field').length,
      strings: this.strings.size,
      userSymbols: symbols.filter((s) => !this.isInternalSymbol(s.name) && !this.isFlutterFrameworkSymbol(s.name)).length,
      frameworkSymbols: symbols.filter((s) => this.isFlutterFrameworkSymbol(s.name)).length,
    };
  }

  /**
   * Clear all recovered data
   */
  clear(): void {
    this.symbols.clear();
    this.strings.clear();
  }

  // Private helper methods

  private extractAddressFromContext(code: string, index: number): string {
    // Look for address comments near the match
    const contextStart = Math.max(0, index - 100);
    const context = code.substring(contextStart, index);
    const addressMatch = context.match(/\/\*\s*(0x[0-9a-fA-F]+)\s*\*\/|@\s*(0x[0-9a-fA-F]+)/);
    return addressMatch ? (addressMatch[1] || addressMatch[2]) : '';
  }

  private inferSymbolType(className: string, methodName: string): TypeInference | undefined {
    // Known return types
    const knownReturns: Record<string, string> = {
      'build': 'Widget',
      'createState': 'State',
      'initState': 'void',
      'dispose': 'void',
      'toString': 'String',
      'toJson': 'Map',
      'fromJson': className,
      'hashCode': 'int',
      'runtimeType': 'Type',
    };

    const returnType = knownReturns[methodName];
    if (returnType) {
      return {
        type: returnType as any,
        confidence: 'medium',
        evidence: [`Known method ${methodName} returns ${returnType}`],
      };
    }

    return undefined;
  }

  private detectEncoding(value: string): 'utf8' | 'utf16' | 'latin1' {
    // Check for non-ASCII characters
    const hasNonAscii = /[^\x00-\x7F]/.test(value);
    if (!hasNonAscii) return 'utf8';

    // Check for surrogate pairs (UTF-16)
    const hasSurrogates = /[\uD800-\uDFFF]/.test(value);
    if (hasSurrogates) return 'utf16';

    // Check for Latin-1 range
    const isLatin1 = /^[\x00-\xFF]*$/.test(value);
    if (isLatin1) return 'latin1';

    return 'utf8';
  }

  private classifyStringUsage(value: string): StringConstant['possibleUsage'] {
    for (const { pattern, usage } of STRING_USAGE_PATTERNS) {
      if (pattern.test(value)) {
        return usage;
      }
    }
    return 'unknown';
  }
}

// Export singleton instance
export const symbolRecovery = new SymbolRecovery();
