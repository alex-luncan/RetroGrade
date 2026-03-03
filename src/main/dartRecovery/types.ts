/**
 * Dart Recovery Assistant - Type Definitions
 *
 * Types and interfaces for the Dart recovery process
 */

// Inferred Dart types - includes common types plus allows any string for Flutter types
export type DartType =
  | 'int'
  | 'double'
  | 'bool'
  | 'String'
  | 'DateTime'
  | 'Duration'
  | 'List'
  | 'Map'
  | 'Set'
  | 'Future'
  | 'Stream'
  | 'Function'
  | 'Object'
  | 'dynamic'
  | 'void'
  | 'Null'
  | 'Widget'
  | 'Iterable'
  | 'Type'
  | CustomType
  | string; // Allow any string for Flutter/custom types

export interface CustomType {
  kind: 'custom';
  name: string;
  genericArgs?: DartType[];
  isNullable: boolean;
}

// Confidence level for inferred types
export type Confidence = 'high' | 'medium' | 'low' | 'guess';

export interface TypeInference {
  type: DartType;
  confidence: Confidence;
  evidence: string[];
  alternativeTypes?: DartType[];
}

// Pseudo-C parsed structures
export interface PseudoCFunction {
  name: string;
  address: string;
  returnType: string;
  parameters: PseudoCParameter[];
  localVariables: PseudoCVariable[];
  body: PseudoCStatement[];
  rawCode: string;
}

export interface PseudoCParameter {
  name: string;
  type: string;
  index: number;
}

export interface PseudoCVariable {
  name: string;
  type: string;
  stackOffset?: number;
  register?: string;
}

export interface PseudoCStatement {
  type: 'assignment' | 'call' | 'return' | 'if' | 'loop' | 'switch' | 'goto' | 'label' | 'raw';
  raw: string;
  parsed?: ParsedStatement;
}

export interface ParsedStatement {
  operation?: string;
  target?: string;
  source?: string;
  arguments?: string[];
  condition?: string;
  branches?: PseudoCStatement[][];
}

// Pattern matching results
export interface PatternMatch {
  patternName: string;
  confidence: Confidence;
  dartConstruct: string;
  location: CodeLocation;
  extractedInfo: Record<string, any>;
  suggestedCode: string;
}

export interface CodeLocation {
  functionName: string;
  address: string;
  lineStart?: number;
  lineEnd?: number;
}

// Symbol recovery
export interface RecoveredSymbol {
  address: string;
  name: string;
  type: 'function' | 'class' | 'field' | 'string' | 'constant';
  dartType?: TypeInference;
  references: string[];
}

export interface StringConstant {
  address: string;
  value: string;
  encoding: 'utf8' | 'utf16' | 'latin1';
  references: CodeLocation[];
  possibleUsage?: 'className' | 'methodName' | 'fieldName' | 'uiText' | 'apiEndpoint' | 'unknown';
}

// Dart code generation
export interface DartClass {
  name: string;
  isAbstract: boolean;
  superclass?: string;
  interfaces: string[];
  mixins: string[];
  fields: DartField[];
  methods: DartMethod[];
  constructors: DartConstructor[];
  confidence: Confidence;
  sourceAddresses: string[];
}

export interface DartField {
  name: string;
  type: TypeInference;
  isStatic: boolean;
  isFinal: boolean;
  isLate: boolean;
  initialValue?: string;
  confidence: Confidence;
}

export interface DartMethod {
  name: string;
  returnType: TypeInference;
  parameters: DartParameter[];
  isStatic: boolean;
  isAsync: boolean;
  isGenerator: boolean;
  body: string;
  confidence: Confidence;
  sourceAddress: string;
}

export interface DartParameter {
  name: string;
  type: TypeInference;
  isRequired: boolean;
  isNamed: boolean;
  defaultValue?: string;
}

export interface DartConstructor {
  name?: string; // Named constructor
  parameters: DartParameter[];
  initializers: string[];
  body?: string;
  isConst: boolean;
  isFactory: boolean;
}

// Analysis results
export interface AnalysisResult {
  flutterVersion?: string;
  dartVersion?: string;
  isFlutterApp: boolean;
  isObfuscated: boolean;
  hasSymbols: boolean;

  recoveredClasses: DartClass[];
  recoveredFunctions: DartMethod[];
  patternMatches: PatternMatch[];
  stringConstants: StringConstant[];
  symbols: RecoveredSymbol[];

  statistics: AnalysisStatistics;
  warnings: string[];
  errors: string[];
}

export interface AnalysisStatistics {
  totalFunctions: number;
  analyzedFunctions: number;
  recoveredClasses: number;
  recoveredMethods: number;
  patternMatches: number;
  stringConstants: number;
  averageConfidence: number;
  estimatedRecoveryRate: number;
}

// Flutter-specific patterns
export interface FlutterWidgetPattern {
  widgetType: string;
  buildMethodAddress?: string;
  stateClassAddress?: string;
  properties: Record<string, TypeInference>;
  childWidgets: string[];
}

export interface FlutterStatePattern {
  stateClassName: string;
  widgetClassName: string;
  stateFields: DartField[];
  setStateCalls: CodeLocation[];
}

// Configuration
export interface RecoveryConfig {
  aggressiveTypeInference: boolean;
  includeFlutterFramework: boolean;
  minConfidenceLevel: Confidence;
  maxFunctionsToAnalyze: number;
  outputFormat: 'dart' | 'pseudocode' | 'annotated';
  generateComments: boolean;
  preserveAddresses: boolean;
}

export const DEFAULT_CONFIG: RecoveryConfig = {
  aggressiveTypeInference: true,
  includeFlutterFramework: false,
  minConfidenceLevel: 'low',
  maxFunctionsToAnalyze: 10000,
  outputFormat: 'dart',
  generateComments: true,
  preserveAddresses: true,
};
