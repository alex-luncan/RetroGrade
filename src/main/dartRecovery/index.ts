/**
 * Dart Recovery Assistant - Main Entry Point
 *
 * A library to help recover Dart/Flutter code from compiled APKs
 * by analyzing Ghidra pseudo-C output.
 *
 * This tool assists in understanding decompiled Flutter applications
 * by identifying patterns, inferring types, and generating Dart code stubs.
 *
 * Note: This cannot fully reverse AOT compilation, but provides valuable
 * insights and starting points for analysis.
 */

import {
  AnalysisResult,
  RecoveryConfig,
  DEFAULT_CONFIG,
  DartClass,
  DartMethod,
  PatternMatch,
  StringConstant,
  RecoveredSymbol,
  AnalysisStatistics,
} from './types';
import { TypeInferenceEngine, typeInference } from './typeInference';
import { PatternMatcher, patternMatcher } from './patternMatcher';
import { SymbolRecovery, symbolRecovery } from './symbolRecovery';
import { PseudoCParser, pseudoCParser } from './pseudoCParser';
import { DartGenerator, generateClassStub } from './dartGenerator';
import { detectUsedPackages, FLUTTER_WIDGETS } from './flutterPatterns';

export class DartRecoveryAssistant {
  private config: RecoveryConfig;
  private parser: PseudoCParser;
  private typeEngine: TypeInferenceEngine;
  private patternEngine: PatternMatcher;
  private symbolEngine: SymbolRecovery;
  private generator: DartGenerator;

  constructor(config: Partial<RecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.parser = new PseudoCParser();
    this.typeEngine = new TypeInferenceEngine();
    this.patternEngine = new PatternMatcher();
    this.symbolEngine = new SymbolRecovery();
    this.generator = new DartGenerator(this.config);
  }

  /**
   * Analyze pseudo-C code and extract Dart/Flutter information
   */
  analyze(pseudoCCode: string): AnalysisResult {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    // Parse the pseudo-C code
    const functions = this.parser.parseFile(pseudoCCode);

    if (functions.length === 0) {
      warnings.push('No functions found in the provided code');
    }

    // Limit analysis based on config
    const functionsToAnalyze = functions.slice(0, this.config.maxFunctionsToAnalyze);
    if (functions.length > this.config.maxFunctionsToAnalyze) {
      warnings.push(`Analyzing only ${this.config.maxFunctionsToAnalyze} of ${functions.length} functions`);
    }

    // Detect Flutter/Dart characteristics
    const isFlutterApp = this.detectFlutterApp(pseudoCCode);
    const isObfuscated = this.detectObfuscation(functionsToAnalyze);
    const hasSymbols = this.detectSymbols(pseudoCCode);

    // Extract version info if available
    const flutterVersion = this.extractVersion(pseudoCCode, 'Flutter');
    const dartVersion = this.extractVersion(pseudoCCode, 'Dart');

    // Analyze each function
    const recoveredClasses: DartClass[] = [];
    const recoveredFunctions: DartMethod[] = [];
    const allPatterns: PatternMatch[] = [];
    const allStrings: StringConstant[] = [];
    const allSymbols: RecoveredSymbol[] = [];

    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const func of functionsToAnalyze) {
      try {
        // Type inference
        const typeMap = this.typeEngine.analyzeFunction(func);

        // Pattern matching
        const patterns = this.patternEngine.findPatterns(func.rawCode, {
          functionName: func.name,
          address: func.address,
        });
        allPatterns.push(...patterns);

        // Symbol recovery
        const symbols = this.symbolEngine.extractSymbols(func.rawCode, func.name, func.address);
        allSymbols.push(...symbols);

        // String extraction
        const strings = this.symbolEngine.extractStrings(func.rawCode, {
          functionName: func.name,
          address: func.address,
        });
        allStrings.push(...strings);

        // Check for widget build method
        if (this.patternEngine.isWidgetBuildMethod(func)) {
          const widgetPattern = this.patternEngine.detectWidgetPattern(func);
          if (widgetPattern) {
            const dartClass = this.convertWidgetToClass(widgetPattern, func);
            if (dartClass) {
              recoveredClasses.push(dartClass);
              totalConfidence += this.confidenceToNumber(dartClass.confidence);
              confidenceCount++;
            }
          }
        }

        // Check for state pattern
        const statePattern = this.patternEngine.detectStatePattern(func, functionsToAnalyze);
        if (statePattern) {
          // Update corresponding class with state info
          const existingClass = recoveredClasses.find(
            (c) => c.name === statePattern.widgetClassName
          );
          if (existingClass) {
            existingClass.fields.push(...statePattern.stateFields);
          }
        }

        // Convert non-widget functions to methods
        if (!this.patternEngine.isWidgetBuildMethod(func)) {
          const dartMethod = this.convertFunctionToMethod(func, typeMap);
          if (dartMethod) {
            recoveredFunctions.push(dartMethod);
            totalConfidence += this.confidenceToNumber(dartMethod.confidence);
            confidenceCount++;
          }
        }
      } catch (error) {
        errors.push(`Error analyzing function ${func.name}: ${error}`);
      }
    }

    // Detect used packages
    const usedPackages = detectUsedPackages(pseudoCCode);
    if (usedPackages.length > 0 && this.config.generateComments) {
      warnings.push(`Detected packages: ${usedPackages.join(', ')}`);
    }

    // Filter by confidence level
    const minConfidence = this.confidenceToNumber(this.config.minConfidenceLevel);
    const filteredClasses = recoveredClasses.filter(
      (c) => this.confidenceToNumber(c.confidence) >= minConfidence
    );
    const filteredMethods = recoveredFunctions.filter(
      (m) => this.confidenceToNumber(m.confidence) >= minConfidence
    );
    const filteredPatterns = allPatterns.filter(
      (p) => this.confidenceToNumber(p.confidence) >= minConfidence
    );

    // Calculate statistics
    const statistics: AnalysisStatistics = {
      totalFunctions: functions.length,
      analyzedFunctions: functionsToAnalyze.length,
      recoveredClasses: filteredClasses.length,
      recoveredMethods: filteredMethods.length,
      patternMatches: filteredPatterns.length,
      stringConstants: allStrings.length,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      estimatedRecoveryRate: this.estimateRecoveryRate(filteredClasses, filteredMethods, functionsToAnalyze.length),
    };

    const elapsed = Date.now() - startTime;
    if (elapsed > 5000) {
      warnings.push(`Analysis took ${(elapsed / 1000).toFixed(1)} seconds`);
    }

    return {
      flutterVersion,
      dartVersion,
      isFlutterApp,
      isObfuscated,
      hasSymbols,
      recoveredClasses: filteredClasses,
      recoveredFunctions: filteredMethods,
      patternMatches: filteredPatterns,
      stringConstants: allStrings,
      symbols: allSymbols,
      statistics,
      warnings,
      errors,
    };
  }

  /**
   * Generate Dart code from analysis results
   */
  generateCode(result: AnalysisResult): string {
    const lines: string[] = [];

    // Header
    lines.push('// Generated by Dart Recovery Assistant');
    lines.push(`// Flutter app: ${result.isFlutterApp}`);
    lines.push(`// Obfuscated: ${result.isObfuscated}`);
    if (result.flutterVersion) {
      lines.push(`// Flutter version: ${result.flutterVersion}`);
    }
    if (result.dartVersion) {
      lines.push(`// Dart version: ${result.dartVersion}`);
    }
    lines.push('');

    // Imports (common ones for Flutter)
    if (result.isFlutterApp) {
      lines.push("import 'package:flutter/material.dart';");
      lines.push('');
    }

    // Generate classes
    for (const dartClass of result.recoveredClasses) {
      lines.push(this.generator.generateClass(dartClass));
      lines.push('');
    }

    // Generate standalone functions
    if (result.recoveredFunctions.length > 0) {
      lines.push('// Recovered functions');
      for (const method of result.recoveredFunctions) {
        lines.push(this.generator.generateMethod(method, 0));
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get a summary report of the analysis
   */
  getSummaryReport(result: AnalysisResult): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('              DART RECOVERY ASSISTANT REPORT                ');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');

    lines.push('APPLICATION INFO:');
    lines.push(`  Flutter App: ${result.isFlutterApp ? 'Yes' : 'No'}`);
    lines.push(`  Obfuscated: ${result.isObfuscated ? 'Yes' : 'No'}`);
    lines.push(`  Has Symbols: ${result.hasSymbols ? 'Yes' : 'No'}`);
    if (result.flutterVersion) lines.push(`  Flutter Version: ${result.flutterVersion}`);
    if (result.dartVersion) lines.push(`  Dart Version: ${result.dartVersion}`);
    lines.push('');

    lines.push('STATISTICS:');
    lines.push(`  Total Functions: ${result.statistics.totalFunctions}`);
    lines.push(`  Analyzed: ${result.statistics.analyzedFunctions}`);
    lines.push(`  Recovered Classes: ${result.statistics.recoveredClasses}`);
    lines.push(`  Recovered Methods: ${result.statistics.recoveredMethods}`);
    lines.push(`  Pattern Matches: ${result.statistics.patternMatches}`);
    lines.push(`  String Constants: ${result.statistics.stringConstants}`);
    lines.push(`  Average Confidence: ${(result.statistics.averageConfidence * 100 / 3).toFixed(1)}%`);
    lines.push(`  Estimated Recovery: ${(result.statistics.estimatedRecoveryRate * 100).toFixed(1)}%`);
    lines.push('');

    if (result.recoveredClasses.length > 0) {
      lines.push('RECOVERED CLASSES:');
      for (const cls of result.recoveredClasses.slice(0, 10)) {
        lines.push(`  - ${cls.name} (${cls.confidence})`);
      }
      if (result.recoveredClasses.length > 10) {
        lines.push(`  ... and ${result.recoveredClasses.length - 10} more`);
      }
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('WARNINGS:');
      for (const warning of result.warnings) {
        lines.push(`  ⚠ ${warning}`);
      }
      lines.push('');
    }

    if (result.errors.length > 0) {
      lines.push('ERRORS:');
      for (const error of result.errors) {
        lines.push(`  ✗ ${error}`);
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  // Private helper methods

  private detectFlutterApp(code: string): boolean {
    const flutterIndicators = [
      'Flutter',
      'Widget',
      'StatefulWidget',
      'StatelessWidget',
      'BuildContext',
      'MaterialApp',
      'CupertinoApp',
      '_flutter',
    ];
    return flutterIndicators.some((indicator) => code.includes(indicator));
  }

  private detectObfuscation(functions: any[]): boolean {
    // Check for heavily obfuscated names (short, random-looking)
    const shortNameCount = functions.filter(
      (f) => /^[a-z]{1,2}\d*$/.test(f.name) || /^_\$\w+/.test(f.name)
    ).length;
    return shortNameCount > functions.length * 0.5;
  }

  private detectSymbols(code: string): boolean {
    // Check for meaningful symbol names
    const meaningfulNames = code.match(/\b[A-Z][a-z]+[A-Z][a-z]+\b/g) || [];
    return meaningfulNames.length > 10;
  }

  private extractVersion(code: string, product: string): string | undefined {
    const versionMatch = code.match(new RegExp(`${product}[\\s_]*(\\d+\\.\\d+\\.\\d+)`));
    return versionMatch ? versionMatch[1] : undefined;
  }

  private convertWidgetToClass(pattern: any, func: any): DartClass | null {
    const widgetInfo = FLUTTER_WIDGETS[pattern.widgetType];
    const isStateful = widgetInfo?.isStateful ?? false;

    return {
      name: pattern.widgetType,
      isAbstract: false,
      superclass: isStateful ? 'StatefulWidget' : 'StatelessWidget',
      interfaces: [],
      mixins: [],
      fields: [],
      methods: [
        {
          name: 'build',
          returnType: { type: 'Widget', confidence: 'high', evidence: ['Widget build method'] },
          parameters: [
            {
              name: 'context',
              type: { type: 'Object', confidence: 'high', evidence: ['BuildContext parameter'] },
              isRequired: true,
              isNamed: false,
            },
          ],
          isStatic: false,
          isAsync: false,
          isGenerator: false,
          body: '// TODO: Implement widget tree',
          confidence: 'medium',
          sourceAddress: func.address,
        },
      ],
      constructors: [
        {
          parameters: [
            {
              name: 'key',
              type: { type: 'Object', confidence: 'high', evidence: [] },
              isRequired: false,
              isNamed: true,
            },
          ],
          initializers: ['super(key: key)'],
          isConst: true,
          isFactory: false,
        },
      ],
      confidence: 'medium',
      sourceAddresses: [func.address],
    };
  }

  private convertFunctionToMethod(func: any, typeMap: Map<string, any>): DartMethod | null {
    const isAsync = this.patternEngine.isAsyncFunction(func);
    const isGenerator = this.patternEngine.isGeneratorFunction(func);

    return {
      name: func.name,
      returnType: {
        type: isAsync ? 'Future' : func.returnType === 'void' ? 'void' : 'dynamic',
        confidence: 'low',
        evidence: ['From C return type'],
      },
      parameters: func.parameters.map((p: any) => ({
        name: p.name,
        type: typeMap.get(p.name) || { type: 'dynamic', confidence: 'guess', evidence: [] },
        isRequired: true,
        isNamed: false,
      })),
      isStatic: false,
      isAsync,
      isGenerator,
      body: '// TODO: Implement',
      confidence: 'low',
      sourceAddress: func.address,
    };
  }

  private confidenceToNumber(confidence: string): number {
    const map: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
      guess: 0,
    };
    return map[confidence] || 0;
  }

  private estimateRecoveryRate(
    classes: DartClass[],
    methods: DartMethod[],
    totalFunctions: number
  ): number {
    if (totalFunctions === 0) return 0;

    const recoveredCount = classes.length + methods.length;
    const baseRate = recoveredCount / totalFunctions;

    // Weight by confidence
    let weightedSum = 0;
    for (const cls of classes) {
      weightedSum += this.confidenceToNumber(cls.confidence) / 3;
    }
    for (const method of methods) {
      weightedSum += this.confidenceToNumber(method.confidence) / 3;
    }

    const avgConfidence = recoveredCount > 0 ? weightedSum / recoveredCount : 0;
    return Math.min(baseRate * avgConfidence, 1.0);
  }
}

// Export all types and classes
export * from './types';
export { TypeInferenceEngine, typeInference } from './typeInference';
export { PatternMatcher, patternMatcher } from './patternMatcher';
export { SymbolRecovery, symbolRecovery } from './symbolRecovery';
export { PseudoCParser, pseudoCParser } from './pseudoCParser';
export { DartGenerator, generateClassStub } from './dartGenerator';
export * from './flutterPatterns';

// Default export
export default DartRecoveryAssistant;
