/**
 * Dart Recovery Assistant - Pseudo-C Parser
 *
 * Parses Ghidra's pseudo-C output into structured data for analysis.
 * Handles function definitions, local variables, statements, and control flow.
 */

import {
  PseudoCFunction,
  PseudoCParameter,
  PseudoCVariable,
  PseudoCStatement,
  ParsedStatement,
} from './types';

// Regex patterns for parsing
const PATTERNS = {
  // Function definition: returnType functionName(params) { ... }
  functionDef: /^(\w+(?:\s*\*)?)\s+(\w+)\s*\(([\s\S]*?)\)\s*\{/m,

  // Function with address comment: /* 0x12345 */ returnType functionName(...)
  functionWithAddress: /\/\*\s*(0x[0-9a-fA-F]+)\s*\*\/\s*(\w+(?:\s*\*)?)\s+(\w+)\s*\(([\s\S]*?)\)\s*\{/m,

  // Local variable declaration: type varName;
  localVar: /^\s*(\w+(?:\s*\*)?)\s+(\w+)\s*;/gm,

  // Variable with stack offset: type varName; // [sp+0x10]
  localVarWithOffset: /^\s*(\w+(?:\s*\*)?)\s+(\w+)\s*;\s*\/\/\s*\[sp\+(0x[0-9a-fA-F]+)\]/gm,

  // Assignment: target = expression;
  assignment: /^\s*(\w+)\s*=\s*(.+?)\s*;/,

  // Function call: result = function(args); or function(args);
  functionCall: /^\s*(?:(\w+)\s*=\s*)?(\w+)\s*\((.*?)\)\s*;/,

  // Return statement: return expression;
  returnStmt: /^\s*return\s+(.+?)\s*;/,

  // If statement: if (condition) { ... }
  ifStmt: /^\s*if\s*\(([\s\S]+?)\)\s*\{/,

  // While loop: while (condition) { ... }
  whileLoop: /^\s*while\s*\(([\s\S]+?)\)\s*\{/,

  // For loop: for (init; cond; update) { ... }
  forLoop: /^\s*for\s*\((.+?);(.+?);(.+?)\)\s*\{/,

  // Do-while loop: do { ... } while (condition);
  doWhileLoop: /^\s*do\s*\{/,

  // Switch statement: switch (expr) { ... }
  switchStmt: /^\s*switch\s*\(([\s\S]+?)\)\s*\{/,

  // Goto: goto label;
  gotoStmt: /^\s*goto\s+(\w+)\s*;/,

  // Label: label:
  labelStmt: /^\s*(\w+)\s*:/,

  // Memory access: *(base + offset)
  memoryAccess: /\*\((\w+)\s*\+\s*(0x[0-9a-fA-F]+|\d+)\)/g,

  // Address comment: /* 0x12345 */
  addressComment: /\/\*\s*(0x[0-9a-fA-F]+)\s*\*\//,
};

export class PseudoCParser {
  /**
   * Parse a complete pseudo-C file containing multiple functions
   */
  parseFile(content: string): PseudoCFunction[] {
    const functions: PseudoCFunction[] = [];

    // Split by function definitions
    const functionBlocks = this.splitIntoFunctions(content);

    for (const block of functionBlocks) {
      const func = this.parseFunction(block);
      if (func) {
        functions.push(func);
      }
    }

    return functions;
  }

  /**
   * Parse a single function definition
   */
  parseFunction(code: string): PseudoCFunction | null {
    // Try to match function with address comment first
    let match = code.match(PATTERNS.functionWithAddress);
    let address = '';
    let returnType = '';
    let name = '';
    let paramString = '';

    if (match) {
      address = match[1];
      returnType = match[2];
      name = match[3];
      paramString = match[4];
    } else {
      // Try without address
      match = code.match(PATTERNS.functionDef);
      if (!match) return null;

      returnType = match[1];
      name = match[2];
      paramString = match[3];

      // Try to find address in surrounding comments
      const addressMatch = code.match(PATTERNS.addressComment);
      if (addressMatch) {
        address = addressMatch[1];
      }
    }

    // Extract function body
    const bodyStart = code.indexOf('{') + 1;
    const bodyEnd = this.findMatchingBrace(code, code.indexOf('{'));
    const bodyCode = code.substring(bodyStart, bodyEnd);

    // Parse parameters
    const parameters = this.parseParameters(paramString);

    // Parse local variables
    const localVariables = this.parseLocalVariables(bodyCode);

    // Parse statements
    const body = this.parseStatements(bodyCode);

    return {
      name,
      address,
      returnType,
      parameters,
      localVariables,
      body,
      rawCode: code,
    };
  }

  /**
   * Parse function parameters
   */
  parseParameters(paramString: string): PseudoCParameter[] {
    const params: PseudoCParameter[] = [];

    if (!paramString.trim()) return params;

    const paramParts = this.splitParameters(paramString);

    for (let i = 0; i < paramParts.length; i++) {
      const part = paramParts[i].trim();
      if (!part || part === 'void') continue;

      // Match type and name: "int* foo" or "void* param1"
      const match = part.match(/^(\w+(?:\s*\*)?)\s+(\w+)$/);
      if (match) {
        params.push({
          name: match[2],
          type: match[1],
          index: i,
        });
      } else {
        // Just a type, no name (like "int")
        params.push({
          name: `param${i}`,
          type: part,
          index: i,
        });
      }
    }

    return params;
  }

  /**
   * Parse local variable declarations
   */
  parseLocalVariables(code: string): PseudoCVariable[] {
    const variables: PseudoCVariable[] = [];
    const seen = new Set<string>();

    // Match variables with stack offsets first
    let match: RegExpExecArray | null;
    const offsetRegex = new RegExp(PATTERNS.localVarWithOffset.source, 'gm');

    while ((match = offsetRegex.exec(code)) !== null) {
      const name = match[2];
      if (!seen.has(name)) {
        seen.add(name);
        variables.push({
          name,
          type: match[1],
          stackOffset: parseInt(match[3], 16),
        });
      }
    }

    // Match regular variable declarations
    const varRegex = new RegExp(PATTERNS.localVar.source, 'gm');
    while ((match = varRegex.exec(code)) !== null) {
      const name = match[2];
      if (!seen.has(name)) {
        seen.add(name);
        variables.push({
          name,
          type: match[1],
        });
      }
    }

    return variables;
  }

  /**
   * Parse function body into statements
   */
  parseStatements(code: string): PseudoCStatement[] {
    const statements: PseudoCStatement[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//')) continue;

      // Skip variable declarations (already parsed)
      if (PATTERNS.localVar.test(line) && !line.includes('=')) continue;

      const stmt = this.parseStatement(line);
      if (stmt) {
        statements.push(stmt);
      }
    }

    return statements;
  }

  /**
   * Parse a single statement
   */
  parseStatement(line: string): PseudoCStatement | null {
    // Return statement
    let match = line.match(PATTERNS.returnStmt);
    if (match) {
      return {
        type: 'return',
        raw: line,
        parsed: {
          source: match[1],
        },
      };
    }

    // If statement
    match = line.match(PATTERNS.ifStmt);
    if (match) {
      return {
        type: 'if',
        raw: line,
        parsed: {
          condition: match[1],
        },
      };
    }

    // While loop
    match = line.match(PATTERNS.whileLoop);
    if (match) {
      return {
        type: 'loop',
        raw: line,
        parsed: {
          condition: match[1],
          operation: 'while',
        },
      };
    }

    // For loop
    match = line.match(PATTERNS.forLoop);
    if (match) {
      return {
        type: 'loop',
        raw: line,
        parsed: {
          operation: 'for',
          arguments: [match[1], match[2], match[3]],
        },
      };
    }

    // Switch statement
    match = line.match(PATTERNS.switchStmt);
    if (match) {
      return {
        type: 'switch',
        raw: line,
        parsed: {
          condition: match[1],
        },
      };
    }

    // Goto statement
    match = line.match(PATTERNS.gotoStmt);
    if (match) {
      return {
        type: 'goto',
        raw: line,
        parsed: {
          target: match[1],
        },
      };
    }

    // Label
    match = line.match(PATTERNS.labelStmt);
    if (match && !line.includes('=')) {
      return {
        type: 'label',
        raw: line,
        parsed: {
          target: match[1],
        },
      };
    }

    // Function call (with or without assignment)
    match = line.match(PATTERNS.functionCall);
    if (match) {
      return {
        type: 'call',
        raw: line,
        parsed: {
          target: match[1] || undefined,
          operation: match[2],
          arguments: this.splitArguments(match[3]),
        },
      };
    }

    // Assignment
    match = line.match(PATTERNS.assignment);
    if (match) {
      return {
        type: 'assignment',
        raw: line,
        parsed: {
          target: match[1],
          source: match[2],
        },
      };
    }

    // Raw statement (unrecognized)
    if (line.endsWith(';') || line.endsWith('{') || line.endsWith('}')) {
      return {
        type: 'raw',
        raw: line,
      };
    }

    return null;
  }

  /**
   * Extract memory access patterns from code
   */
  extractMemoryAccesses(code: string): { base: string; offset: number }[] {
    const accesses: { base: string; offset: number }[] = [];
    const regex = new RegExp(PATTERNS.memoryAccess.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(code)) !== null) {
      accesses.push({
        base: match[1],
        offset: parseInt(match[2]),
      });
    }

    return accesses;
  }

  /**
   * Extract all function addresses from a file
   */
  extractFunctionAddresses(content: string): Map<string, string> {
    const addressMap = new Map<string, string>();
    const regex = /\/\*\s*(0x[0-9a-fA-F]+)\s*\*\/\s*\w+(?:\s*\*)?\s+(\w+)\s*\(/g;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      addressMap.set(match[2], match[1]);
    }

    return addressMap;
  }

  // Private helper methods

  private splitIntoFunctions(content: string): string[] {
    const functions: string[] = [];
    let depth = 0;
    let currentFunc = '';
    let inFunction = false;

    const lines = content.split('\n');
    for (const line of lines) {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;

      // Check if this line starts a function
      if (depth === 0 && (PATTERNS.functionDef.test(line) || PATTERNS.functionWithAddress.test(line))) {
        inFunction = true;
        currentFunc = '';
      }

      if (inFunction) {
        currentFunc += line + '\n';
        depth += openBraces - closeBraces;

        if (depth === 0 && currentFunc.includes('{')) {
          functions.push(currentFunc.trim());
          currentFunc = '';
          inFunction = false;
        }
      }
    }

    return functions;
  }

  private findMatchingBrace(code: string, startIndex: number): number {
    let depth = 0;
    for (let i = startIndex; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return code.length;
  }

  private splitParameters(paramString: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of paramString) {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        params.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }

    if (current.trim()) {
      params.push(current.trim());
    }

    return params;
  }

  private splitArguments(argString: string): string[] {
    if (!argString.trim()) return [];
    return this.splitParameters(argString);
  }
}

// Export singleton instance
export const pseudoCParser = new PseudoCParser();
