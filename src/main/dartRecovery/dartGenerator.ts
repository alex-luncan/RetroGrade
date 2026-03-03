/**
 * Dart Recovery Assistant - Dart Code Generator
 *
 * Generates readable Dart code stubs from recovered patterns and types.
 * Creates class skeletons, method signatures, and annotated code.
 */

import {
  DartClass,
  DartMethod,
  DartField,
  DartParameter,
  DartConstructor,
  TypeInference,
  PatternMatch,
  RecoveryConfig,
  Confidence,
} from './types';
import { FLUTTER_WIDGETS, isLifecycleMethod } from './flutterPatterns';

export class DartGenerator {
  private config: RecoveryConfig;
  private indentSize = 2;

  constructor(config: RecoveryConfig) {
    this.config = config;
  }

  /**
   * Generate complete Dart code for a class
   */
  generateClass(dartClass: DartClass): string {
    const lines: string[] = [];

    // Add confidence comment
    if (this.config.generateComments) {
      lines.push(`/// Recovered class (confidence: ${dartClass.confidence})`);
      if (this.config.preserveAddresses && dartClass.sourceAddresses.length > 0) {
        lines.push(`/// Source addresses: ${dartClass.sourceAddresses.join(', ')}`);
      }
    }

    // Class declaration
    const classKeyword = dartClass.isAbstract ? 'abstract class' : 'class';
    let declaration = `${classKeyword} ${dartClass.name}`;

    if (dartClass.superclass) {
      declaration += ` extends ${dartClass.superclass}`;
    }

    if (dartClass.mixins.length > 0) {
      declaration += ` with ${dartClass.mixins.join(', ')}`;
    }

    if (dartClass.interfaces.length > 0) {
      declaration += ` implements ${dartClass.interfaces.join(', ')}`;
    }

    lines.push(`${declaration} {`);

    // Fields
    if (dartClass.fields.length > 0) {
      for (const field of dartClass.fields) {
        lines.push(this.generateField(field, 1));
      }
      lines.push('');
    }

    // Constructors
    for (const constructor of dartClass.constructors) {
      lines.push(this.generateConstructor(dartClass.name, constructor, 1));
      lines.push('');
    }

    // Methods
    for (const method of dartClass.methods) {
      lines.push(this.generateMethod(method, 1));
      lines.push('');
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate a field declaration
   */
  generateField(field: DartField, indentLevel: number): string {
    const indent = this.getIndent(indentLevel);
    const lines: string[] = [];

    if (this.config.generateComments && field.confidence !== 'high') {
      lines.push(`${indent}/// Confidence: ${field.confidence}`);
    }

    let declaration = indent;

    if (field.isStatic) declaration += 'static ';
    if (field.isLate) declaration += 'late ';
    if (field.isFinal) declaration += 'final ';

    declaration += `${this.formatType(field.type)} ${field.name}`;

    if (field.initialValue) {
      declaration += ` = ${field.initialValue}`;
    }

    declaration += ';';
    lines.push(declaration);

    return lines.join('\n');
  }

  /**
   * Generate a constructor
   */
  generateConstructor(className: string, constructor: DartConstructor, indentLevel: number): string {
    const indent = this.getIndent(indentLevel);
    const lines: string[] = [];

    let declaration = indent;

    if (constructor.isConst) declaration += 'const ';
    if (constructor.isFactory) declaration += 'factory ';

    declaration += className;

    if (constructor.name) {
      declaration += `.${constructor.name}`;
    }

    declaration += '(';

    // Parameters
    const params = constructor.parameters.map((p) => this.formatParameter(p));
    if (params.length <= 3) {
      declaration += params.join(', ');
    } else {
      declaration += '\n';
      declaration += params.map((p) => `${this.getIndent(indentLevel + 1)}${p}`).join(',\n');
      declaration += `\n${indent}`;
    }

    declaration += ')';

    // Initializers
    if (constructor.initializers.length > 0) {
      declaration += '\n';
      declaration += `${this.getIndent(indentLevel + 2)}: ${constructor.initializers.join(',\n' + this.getIndent(indentLevel + 2) + '  ')}`;
    }

    // Body
    if (constructor.body) {
      declaration += ` {\n${this.getIndent(indentLevel + 1)}${constructor.body}\n${indent}}`;
    } else {
      declaration += ';';
    }

    lines.push(declaration);
    return lines.join('\n');
  }

  /**
   * Generate a method
   */
  generateMethod(method: DartMethod, indentLevel: number): string {
    const indent = this.getIndent(indentLevel);
    const lines: string[] = [];

    // Comments
    if (this.config.generateComments) {
      if (method.confidence !== 'high') {
        lines.push(`${indent}/// Confidence: ${method.confidence}`);
      }
      if (this.config.preserveAddresses && method.sourceAddress) {
        lines.push(`${indent}/// Source: ${method.sourceAddress}`);
      }
    }

    // Check if this is an override (lifecycle methods, build, etc.)
    const isOverride = isLifecycleMethod(method.name) || method.name === 'build';
    if (isOverride) {
      lines.push(`${indent}@override`);
    }

    // Method signature
    let signature = indent;

    if (method.isStatic) signature += 'static ';
    if (method.isAsync && !method.isGenerator) signature += 'Future<';

    signature += this.formatType(method.returnType);

    if (method.isAsync && !method.isGenerator) signature += '>';

    signature += ` ${method.name}`;

    if (method.isGenerator) {
      signature = signature.replace(method.name, method.isAsync ? `${method.name} async*` : `${method.name} sync*`);
    }

    signature += '(';

    // Parameters
    const params = method.parameters.map((p) => this.formatParameter(p));
    const namedParams = method.parameters.filter((p) => p.isNamed);
    const positionalParams = method.parameters.filter((p) => !p.isNamed);

    if (params.length <= 3) {
      const positionalStr = positionalParams.map((p) => this.formatParameter(p)).join(', ');
      const namedStr = namedParams.length > 0 ? `{${namedParams.map((p) => this.formatParameter(p)).join(', ')}}` : '';
      signature += [positionalStr, namedStr].filter(Boolean).join(', ');
    } else {
      signature += '\n';
      signature += params.map((p) => `${this.getIndent(indentLevel + 1)}${p}`).join(',\n');
      signature += `\n${indent}`;
    }

    signature += ')';

    if (method.isAsync && !method.isGenerator) {
      signature += ' async';
    }

    lines.push(`${signature} {`);

    // Body
    if (method.body) {
      const bodyLines = method.body.split('\n');
      for (const line of bodyLines) {
        lines.push(`${this.getIndent(indentLevel + 1)}${line}`);
      }
    } else {
      lines.push(`${this.getIndent(indentLevel + 1)}// TODO: Implement ${method.name}`);
      if (this.formatType(method.returnType) !== 'void') {
        lines.push(`${this.getIndent(indentLevel + 1)}throw UnimplementedError();`);
      }
    }

    lines.push(`${indent}}`);

    return lines.join('\n');
  }

  /**
   * Generate a StatefulWidget stub
   */
  generateStatefulWidget(widgetName: string, stateFields: DartField[], methods: DartMethod[]): string {
    const lines: string[] = [];

    // Widget class
    lines.push(`class ${widgetName} extends StatefulWidget {`);
    lines.push(`${this.getIndent(1)}const ${widgetName}({super.key});`);
    lines.push('');
    lines.push(`${this.getIndent(1)}@override`);
    lines.push(`${this.getIndent(1)}State<${widgetName}> createState() => _${widgetName}State();`);
    lines.push('}');
    lines.push('');

    // State class
    lines.push(`class _${widgetName}State extends State<${widgetName}> {`);

    // State fields
    for (const field of stateFields) {
      lines.push(this.generateField(field, 1));
    }

    if (stateFields.length > 0) {
      lines.push('');
    }

    // initState if there are fields
    if (stateFields.length > 0) {
      lines.push(`${this.getIndent(1)}@override`);
      lines.push(`${this.getIndent(1)}void initState() {`);
      lines.push(`${this.getIndent(2)}super.initState();`);
      lines.push(`${this.getIndent(2)}// TODO: Initialize state`);
      lines.push(`${this.getIndent(1)}}`);
      lines.push('');
    }

    // build method
    lines.push(`${this.getIndent(1)}@override`);
    lines.push(`${this.getIndent(1)}Widget build(BuildContext context) {`);
    lines.push(`${this.getIndent(2)}// TODO: Implement widget tree`);
    lines.push(`${this.getIndent(2)}return Container();`);
    lines.push(`${this.getIndent(1)}}`);

    // Additional methods
    for (const method of methods) {
      lines.push('');
      lines.push(this.generateMethod(method, 1));
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate a StatelessWidget stub
   */
  generateStatelessWidget(widgetName: string, properties: DartField[]): string {
    const lines: string[] = [];

    lines.push(`class ${widgetName} extends StatelessWidget {`);

    // Properties
    for (const prop of properties) {
      lines.push(`${this.getIndent(1)}final ${this.formatType(prop.type)} ${prop.name};`);
    }

    if (properties.length > 0) {
      lines.push('');
    }

    // Constructor
    lines.push(`${this.getIndent(1)}const ${widgetName}({`);
    lines.push(`${this.getIndent(2)}super.key,`);
    for (const prop of properties) {
      const required = prop.type.type !== 'Null' ? 'required ' : '';
      lines.push(`${this.getIndent(2)}${required}this.${prop.name},`);
    }
    lines.push(`${this.getIndent(1)}});`);
    lines.push('');

    // build method
    lines.push(`${this.getIndent(1)}@override`);
    lines.push(`${this.getIndent(1)}Widget build(BuildContext context) {`);
    lines.push(`${this.getIndent(2)}// TODO: Implement widget tree`);
    lines.push(`${this.getIndent(2)}return Container();`);
    lines.push(`${this.getIndent(1)}}`);

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate code from pattern matches
   */
  generateFromPatterns(patterns: PatternMatch[]): string {
    const lines: string[] = [];

    if (this.config.generateComments) {
      lines.push('/// Auto-generated from decompiled patterns');
      lines.push('/// Review and complete the implementation');
      lines.push('');
    }

    for (const pattern of patterns) {
      if (this.config.generateComments) {
        lines.push(`// Pattern: ${pattern.patternName} (${pattern.confidence})`);
        if (this.config.preserveAddresses) {
          lines.push(`// Location: ${pattern.location.functionName} @ ${pattern.location.address}`);
        }
      }
      lines.push(pattern.suggestedCode);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate annotated pseudo-C with Dart type hints
   */
  generateAnnotatedCode(
    pseudoC: string,
    typeInferences: Map<string, TypeInference>
  ): string {
    let annotated = pseudoC;

    for (const [varName, inference] of typeInferences) {
      // Add type annotation comments
      const typeComment = `/* ${this.formatType(inference)} ${inference.confidence} */`;
      const varRegex = new RegExp(`\\b(${varName})\\b(?!\\s*:)`, 'g');
      annotated = annotated.replace(varRegex, `$1 ${typeComment}`);
    }

    return annotated;
  }

  // Private helper methods

  private formatType(typeInference: TypeInference): string {
    const type = typeInference.type;

    if (typeof type === 'string') {
      return type;
    }

    // CustomType
    let result = type.name;

    if (type.genericArgs && type.genericArgs.length > 0) {
      result += `<${type.genericArgs.map((t) => (typeof t === 'string' ? t : t.name)).join(', ')}>`;
    }

    if (type.isNullable) {
      result += '?';
    }

    return result;
  }

  private formatParameter(param: DartParameter): string {
    let result = '';

    if (param.isNamed) {
      if (param.isRequired) {
        result += 'required ';
      }
    }

    result += `${this.formatType(param.type)} ${param.name}`;

    if (param.defaultValue) {
      result += ` = ${param.defaultValue}`;
    }

    return result;
  }

  private getIndent(level: number): string {
    return ' '.repeat(level * this.indentSize);
  }
}

/**
 * Quick helper to generate a simple class stub
 */
export function generateClassStub(
  className: string,
  methods: string[],
  isStateful: boolean = false
): string {
  const generator = new DartGenerator({
    aggressiveTypeInference: false,
    includeFlutterFramework: false,
    minConfidenceLevel: 'low',
    maxFunctionsToAnalyze: 1000,
    outputFormat: 'dart',
    generateComments: true,
    preserveAddresses: false,
  });

  const dartMethods: DartMethod[] = methods.map((name) => ({
    name,
    returnType: { type: 'void', confidence: 'low', evidence: [] },
    parameters: [],
    isStatic: false,
    isAsync: false,
    isGenerator: false,
    body: '',
    confidence: 'low',
    sourceAddress: '',
  }));

  if (isStateful) {
    return generator.generateStatefulWidget(className, [], dartMethods);
  }

  const dartClass: DartClass = {
    name: className,
    isAbstract: false,
    interfaces: [],
    mixins: [],
    fields: [],
    methods: dartMethods,
    constructors: [],
    confidence: 'low',
    sourceAddresses: [],
  };

  return generator.generateClass(dartClass);
}

// DartGenerator is already exported via the class declaration
