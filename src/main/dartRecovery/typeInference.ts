/**
 * Dart Recovery Assistant - Type Inference Engine
 *
 * Analyzes pseudo-C code patterns to infer original Dart types.
 * Uses heuristics based on:
 * - Arithmetic operations (division suggests double)
 * - Bitwise operations (suggests int)
 * - Known constant values (DateTime epoch, Duration microseconds)
 * - Memory access patterns (object field offsets)
 * - Function call patterns (known Dart runtime functions)
 */

import {
  DartType,
  TypeInference,
  Confidence,
  PseudoCFunction,
  PseudoCVariable,
  CustomType,
} from './types';

// Known Dart runtime function signatures
const DART_RUNTIME_FUNCTIONS: Record<string, { returnType: DartType; paramTypes: DartType[] }> = {
  '_StringBase_+': { returnType: 'String', paramTypes: ['String', 'String'] },
  '_StringBase_substring': { returnType: 'String', paramTypes: ['String', 'int', 'int'] },
  '_StringBase_contains': { returnType: 'bool', paramTypes: ['String', 'String'] },
  '_GrowableList_add': { returnType: 'void', paramTypes: ['List', 'dynamic'] },
  '_GrowableList_[]': { returnType: 'dynamic', paramTypes: ['List', 'int'] },
  '_LinkedHashMap_[]=': { returnType: 'void', paramTypes: ['Map', 'dynamic', 'dynamic'] },
  '_Double_+': { returnType: 'double', paramTypes: ['double', 'double'] },
  '_Double_*': { returnType: 'double', paramTypes: ['double', 'double'] },
  '_Double_/': { returnType: 'double', paramTypes: ['double', 'double'] },
  '_Smi_+': { returnType: 'int', paramTypes: ['int', 'int'] },
  '_Smi_*': { returnType: 'int', paramTypes: ['int', 'int'] },
  '_Smi_~/': { returnType: 'int', paramTypes: ['int', 'int'] },
  'DateTime_now': { returnType: 'DateTime', paramTypes: [] },
  'DateTime_difference': { returnType: 'Duration', paramTypes: ['DateTime', 'DateTime'] },
  'Future_then': { returnType: 'Future', paramTypes: ['Future', 'Function'] },
  'Future_catchError': { returnType: 'Future', paramTypes: ['Future', 'Function'] },
  '_asyncThenWrapperHelper': { returnType: 'Future', paramTypes: ['dynamic'] },
  '_asyncErrorWrapperHelper': { returnType: 'Future', paramTypes: ['dynamic'] },
};

// Known magic constants
const MAGIC_CONSTANTS: Record<string, { type: DartType; meaning: string }> = {
  // DateTime
  '1000000': { type: 'Duration', meaning: 'microseconds per second' },
  '86400000000': { type: 'Duration', meaning: 'microseconds per day' },
  '3600000000': { type: 'Duration', meaning: 'microseconds per hour' },
  '60000000': { type: 'Duration', meaning: 'microseconds per minute' },

  // Common bool representations
  '0x1': { type: 'bool', meaning: 'true' },
  '0x0': { type: 'bool', meaning: 'false' },

  // Null
  '0x0 (null)': { type: 'Null', meaning: 'null reference' },

  // Double special values
  '0x7ff0000000000000': { type: 'double', meaning: 'positive infinity' },
  '0xfff0000000000000': { type: 'double', meaning: 'negative infinity' },
  '0x7ff8000000000000': { type: 'double', meaning: 'NaN' },
};

// Object field offset patterns (common Dart object layouts)
const FIELD_OFFSET_PATTERNS: Record<number, { className: string; fieldName: string; type: DartType }[]> = {
  0x7: [{ className: '_GrowableList', fieldName: 'length', type: 'int' }],
  0xf: [{ className: '_GrowableList', fieldName: '_data', type: 'List' }],
  0x17: [{ className: 'String', fieldName: 'length', type: 'int' }],
};

export class TypeInferenceEngine {
  private variableTypes: Map<string, TypeInference> = new Map();
  private functionReturnTypes: Map<string, TypeInference> = new Map();
  private evidence: Map<string, string[]> = new Map();

  /**
   * Analyze a pseudo-C function and infer types for all variables
   */
  analyzeFunction(func: PseudoCFunction): Map<string, TypeInference> {
    this.variableTypes.clear();
    this.evidence.clear();

    // Initialize with parameter types (usually generic)
    for (const param of func.parameters) {
      this.initializeVariable(param.name, param.type);
    }

    // Initialize local variables
    for (const local of func.localVariables) {
      this.initializeVariable(local.name, local.type);
    }

    // Analyze each statement for type evidence
    for (const stmt of func.body) {
      this.analyzeStatement(stmt.raw);
    }

    // Refine types based on collected evidence
    this.refineTypes();

    return this.variableTypes;
  }

  /**
   * Infer the type of a single expression
   */
  inferExpressionType(expression: string): TypeInference {
    // Check for string literals
    if (expression.match(/^".*"$/) || expression.match(/^'.*'$/)) {
      return this.createInference('String', 'high', ['String literal']);
    }

    // Check for numeric literals
    if (expression.match(/^\d+\.\d+$/)) {
      return this.createInference('double', 'high', ['Floating point literal']);
    }

    if (expression.match(/^-?\d+$/)) {
      const value = parseInt(expression);
      // Large numbers might be timestamps
      if (Math.abs(value) > 1e12) {
        return this.createInference('DateTime', 'medium', ['Large number possibly timestamp']);
      }
      return this.createInference('int', 'high', ['Integer literal']);
    }

    // Check for hex literals
    if (expression.match(/^0x[0-9a-fA-F]+$/)) {
      const magicConstant = MAGIC_CONSTANTS[expression];
      if (magicConstant) {
        return this.createInference(magicConstant.type, 'high', [magicConstant.meaning]);
      }
      return this.createInference('int', 'medium', ['Hex literal']);
    }

    // Check for boolean literals
    if (expression === 'true' || expression === '1' || expression === '0x1') {
      return this.createInference('bool', 'high', ['Boolean true']);
    }
    if (expression === 'false' || expression === '0' || expression === '0x0') {
      return this.createInference('bool', 'medium', ['Possibly boolean false or null']);
    }

    // Check for null
    if (expression === 'null' || expression === 'NULL' || expression === '(void*)0') {
      return this.createInference('Null', 'high', ['Null literal']);
    }

    // Check for known function calls
    for (const [funcName, signature] of Object.entries(DART_RUNTIME_FUNCTIONS)) {
      if (expression.includes(funcName)) {
        return this.createInference(signature.returnType, 'high', [`Return type of ${funcName}`]);
      }
    }

    // Default to dynamic
    return this.createInference('dynamic', 'guess', ['Unable to determine type']);
  }

  /**
   * Infer type from an operation
   */
  inferFromOperation(operation: string, operands: string[]): TypeInference {
    const op = operation.trim();

    // Division always produces double in Dart
    if (op === '/') {
      return this.createInference('double', 'high', ['Division operator always returns double']);
    }

    // Integer division
    if (op === '~/' || op === '%') {
      return this.createInference('int', 'high', ['Integer division/modulo']);
    }

    // Bitwise operations
    if (['&', '|', '^', '<<', '>>', '>>>'].includes(op)) {
      return this.createInference('int', 'high', ['Bitwise operation']);
    }

    // Comparison operators
    if (['==', '!=', '<', '>', '<=', '>='].includes(op)) {
      return this.createInference('bool', 'high', ['Comparison operator']);
    }

    // Logical operators
    if (['&&', '||', '!'].includes(op)) {
      return this.createInference('bool', 'high', ['Logical operator']);
    }

    // String concatenation
    if (op === '+' && operands.some(o => o.includes('"') || o.includes("'"))) {
      return this.createInference('String', 'medium', ['Possible string concatenation']);
    }

    // Arithmetic with floating point
    if (['+', '-', '*'].includes(op)) {
      const hasFloat = operands.some(o => o.includes('.') && !o.includes('->'));
      if (hasFloat) {
        return this.createInference('double', 'medium', ['Arithmetic with floating point']);
      }
      // Could be int or double, need more context
      return this.createInference('dynamic', 'low', ['Arithmetic operation, type unclear']);
    }

    return this.createInference('dynamic', 'guess', ['Unknown operation']);
  }

  /**
   * Infer type from memory access pattern
   */
  inferFromMemoryAccess(baseType: string, offset: number): TypeInference {
    const patterns = FIELD_OFFSET_PATTERNS[offset];
    if (patterns) {
      for (const pattern of patterns) {
        if (baseType.includes(pattern.className) || baseType === 'unknown') {
          return this.createInference(pattern.type, 'medium', [
            `Field ${pattern.fieldName} at offset 0x${offset.toString(16)} in ${pattern.className}`,
          ]);
        }
      }
    }

    // Common object header size is 8 bytes (class ID + hash)
    if (offset < 8) {
      return this.createInference('int', 'low', ['Object header field']);
    }

    return this.createInference('dynamic', 'guess', [`Unknown field at offset 0x${offset.toString(16)}`]);
  }

  /**
   * Analyze common Dart patterns in pseudo-C
   */
  analyzeCommonPatterns(code: string): TypeInference[] {
    const results: TypeInference[] = [];

    // List iteration pattern
    // for (i = 0; i < *(obj + 0x7); i++)
    const listIterPattern = /for\s*\([^;]+;\s*\w+\s*<\s*\*\([^)]+\s*\+\s*0x7\)/;
    if (listIterPattern.test(code)) {
      results.push(this.createInference('List', 'high', ['List iteration pattern detected']));
    }

    // String length access
    // *(str + 0x17)
    const strLenPattern = /\*\([^)]+\s*\+\s*0x17\)/;
    if (strLenPattern.test(code)) {
      results.push(this.createInference('String', 'high', ['String length access pattern']));
    }

    // Future/async pattern
    // _asyncThenWrapperHelper or similar
    if (code.includes('_async') || code.includes('_Future')) {
      results.push(this.createInference('Future', 'high', ['Async pattern detected']));
    }

    // DateTime pattern
    if (code.includes('DateTime') || code.match(/\b86400000000\b/) || code.match(/\b1000000\b/)) {
      results.push(this.createInference('DateTime', 'medium', ['DateTime-related constant or function']));
    }

    return results;
  }

  /**
   * Combine multiple type inferences with different evidence
   */
  combineInferences(inferences: TypeInference[]): TypeInference {
    if (inferences.length === 0) {
      return this.createInference('dynamic', 'guess', ['No type information']);
    }

    if (inferences.length === 1) {
      return inferences[0];
    }

    // Count type occurrences and aggregate evidence
    const typeCounts = new Map<string, { count: number; maxConfidence: Confidence; evidence: string[] }>();

    for (const inf of inferences) {
      const typeKey = typeof inf.type === 'string' ? inf.type : inf.type.name;
      const existing = typeCounts.get(typeKey) || { count: 0, maxConfidence: 'guess' as Confidence, evidence: [] };

      existing.count++;
      existing.evidence.push(...inf.evidence);

      if (this.confidenceToNumber(inf.confidence) > this.confidenceToNumber(existing.maxConfidence)) {
        existing.maxConfidence = inf.confidence;
      }

      typeCounts.set(typeKey, existing);
    }

    // Find the most likely type
    let bestType = 'dynamic';
    let bestScore = 0;

    for (const [type, data] of typeCounts) {
      const score = data.count * (this.confidenceToNumber(data.maxConfidence) + 1);
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    const bestData = typeCounts.get(bestType)!;
    return this.createInference(
      bestType as DartType,
      bestData.maxConfidence,
      [...new Set(bestData.evidence)], // Deduplicate evidence
      inferences.filter(i => (typeof i.type === 'string' ? i.type : i.type.name) !== bestType).map(i => i.type)
    );
  }

  // Private helper methods

  private initializeVariable(name: string, cType: string): void {
    const dartType = this.cTypeToDartType(cType);
    this.variableTypes.set(name, dartType);
    this.evidence.set(name, []);
  }

  private cTypeToDartType(cType: string): TypeInference {
    const typeMap: Record<string, DartType> = {
      'int': 'int',
      'int32_t': 'int',
      'int64_t': 'int',
      'uint64_t': 'int',
      'long': 'int',
      'double': 'double',
      'float': 'double',
      'bool': 'bool',
      'char*': 'String',
      'void*': 'dynamic',
      'void': 'void',
    };

    const mapped = typeMap[cType.toLowerCase().trim()];
    if (mapped) {
      return this.createInference(mapped, 'low', ['From C type declaration']);
    }

    // Pointer types are likely objects
    if (cType.includes('*')) {
      return this.createInference('Object', 'low', ['Pointer type, likely Dart object']);
    }

    return this.createInference('dynamic', 'guess', ['Unknown C type']);
  }

  private analyzeStatement(statement: string): void {
    // Assignment analysis
    const assignMatch = statement.match(/(\w+)\s*=\s*(.+);/);
    if (assignMatch) {
      const [, varName, expression] = assignMatch;
      const inference = this.inferExpressionType(expression);
      this.addEvidence(varName, inference);
    }

    // Function call return value analysis
    const callMatch = statement.match(/(\w+)\s*=\s*(\w+)\s*\(([^)]*)\)/);
    if (callMatch) {
      const [, varName, funcName, args] = callMatch;
      if (DART_RUNTIME_FUNCTIONS[funcName]) {
        const returnType = DART_RUNTIME_FUNCTIONS[funcName].returnType;
        this.addEvidence(varName, this.createInference(returnType, 'high', [`Return value of ${funcName}`]));
      }
    }

    // Memory access pattern analysis
    const memAccessMatch = statement.match(/\*\((\w+)\s*\+\s*(0x[0-9a-fA-F]+|\d+)\)/g);
    if (memAccessMatch) {
      for (const access of memAccessMatch) {
        const parts = access.match(/\*\((\w+)\s*\+\s*(0x[0-9a-fA-F]+|\d+)\)/);
        if (parts) {
          const [, baseVar, offsetStr] = parts;
          const offset = parseInt(offsetStr);
          const baseType = this.variableTypes.get(baseVar);
          if (baseType) {
            const fieldType = this.inferFromMemoryAccess(
              typeof baseType.type === 'string' ? baseType.type : baseType.type.name,
              offset
            );
            // The result type hints at what the base object might be
          }
        }
      }
    }
  }

  private addEvidence(varName: string, inference: TypeInference): void {
    const existing = this.variableTypes.get(varName);
    if (existing) {
      const combined = this.combineInferences([existing, inference]);
      this.variableTypes.set(varName, combined);
    } else {
      this.variableTypes.set(varName, inference);
    }

    const evidenceList = this.evidence.get(varName) || [];
    evidenceList.push(...inference.evidence);
    this.evidence.set(varName, evidenceList);
  }

  private refineTypes(): void {
    // Second pass: propagate type information
    // If var1 = var2, they should have compatible types
    // This is a simplified version; real implementation would do data flow analysis
  }

  private createInference(
    type: DartType,
    confidence: Confidence,
    evidence: string[],
    alternatives?: DartType[]
  ): TypeInference {
    return {
      type,
      confidence,
      evidence,
      alternativeTypes: alternatives,
    };
  }

  private confidenceToNumber(confidence: Confidence): number {
    const map: Record<Confidence, number> = {
      high: 3,
      medium: 2,
      low: 1,
      guess: 0,
    };
    return map[confidence];
  }
}

// Export singleton instance
export const typeInference = new TypeInferenceEngine();
