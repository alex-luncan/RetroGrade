/**
 * Dart Recovery Assistant - Pattern Matcher
 *
 * Identifies common Dart/Flutter patterns in pseudo-C code.
 * Recognizes widget build patterns, state management, async/await,
 * and other Flutter-specific constructs.
 */

import {
  PatternMatch,
  Confidence,
  CodeLocation,
  PseudoCFunction,
  FlutterWidgetPattern,
  FlutterStatePattern,
} from './types';

// Pattern definitions for common Dart constructs
interface PatternDefinition {
  name: string;
  description: string;
  regex: RegExp;
  dartConstruct: string;
  confidence: Confidence;
  extractor: (match: RegExpMatchArray, context: string) => Record<string, any>;
}

const PATTERN_DEFINITIONS: PatternDefinition[] = [
  // Widget build method pattern
  {
    name: 'widget_build',
    description: 'Flutter Widget build() method',
    regex: /(\w+)_build\s*\(\s*\w+\s*,\s*(\w+)\s*context\s*\)/,
    dartConstruct: 'Widget build(BuildContext context)',
    confidence: 'high',
    extractor: (match) => ({
      widgetClass: match[1],
      contextParam: match[2],
    }),
  },

  // StatefulWidget createState pattern
  {
    name: 'create_state',
    description: 'StatefulWidget createState() method',
    regex: /(\w+)_createState\s*\(\s*\w+\s*\)/,
    dartConstruct: 'State createState()',
    confidence: 'high',
    extractor: (match) => ({
      widgetClass: match[1],
      stateClass: `_${match[1]}State`,
    }),
  },

  // setState call pattern
  {
    name: 'set_state',
    description: 'setState() call for state updates',
    regex: /_setState\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/,
    dartConstruct: 'setState(() { ... })',
    confidence: 'high',
    extractor: (match) => ({
      stateObject: match[1],
      callback: match[2],
    }),
  },

  // initState pattern
  {
    name: 'init_state',
    description: 'State initState() lifecycle method',
    regex: /(\w+)_initState\s*\(\s*\w+\s*\)/,
    dartConstruct: 'void initState()',
    confidence: 'high',
    extractor: (match) => ({
      stateClass: match[1],
    }),
  },

  // dispose pattern
  {
    name: 'dispose',
    description: 'State dispose() lifecycle method',
    regex: /(\w+)_dispose\s*\(\s*\w+\s*\)/,
    dartConstruct: 'void dispose()',
    confidence: 'high',
    extractor: (match) => ({
      stateClass: match[1],
    }),
  },

  // Async function pattern
  {
    name: 'async_function',
    description: 'Async function with Future return',
    regex: /_asyncThenWrapperHelper|_asyncErrorWrapperHelper|_awaitHelper/,
    dartConstruct: 'async/await',
    confidence: 'high',
    extractor: () => ({
      isAsync: true,
    }),
  },

  // Future.then pattern
  {
    name: 'future_then',
    description: 'Future.then() callback chain',
    regex: /Future_then\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/,
    dartConstruct: 'Future.then()',
    confidence: 'high',
    extractor: (match) => ({
      future: match[1],
      callback: match[2],
    }),
  },

  // List iteration pattern
  {
    name: 'list_iteration',
    description: 'for loop over List',
    regex: /for\s*\([^;]+;\s*(\w+)\s*<\s*\*\((\w+)\s*\+\s*0x7\)/,
    dartConstruct: 'for (var item in list)',
    confidence: 'medium',
    extractor: (match) => ({
      indexVar: match[1],
      listVar: match[2],
    }),
  },

  // Map access pattern
  {
    name: 'map_access',
    description: 'Map key-value access',
    regex: /_LinkedHashMap_\[\]=?\s*\(\s*(\w+)\s*,\s*(\w+)/,
    dartConstruct: 'map[key] or map[key] = value',
    confidence: 'high',
    extractor: (match) => ({
      mapVar: match[1],
      keyOrValue: match[2],
    }),
  },

  // String concatenation pattern
  {
    name: 'string_concat',
    description: 'String concatenation with +',
    regex: /_StringBase_\+\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/,
    dartConstruct: 'string1 + string2',
    confidence: 'high',
    extractor: (match) => ({
      leftString: match[1],
      rightString: match[2],
    }),
  },

  // Null check pattern
  {
    name: 'null_check',
    description: 'Null safety check',
    regex: /if\s*\(\s*(\w+)\s*==\s*(?:NULL|0x0|null)\s*\)/,
    dartConstruct: 'if (variable == null)',
    confidence: 'medium',
    extractor: (match) => ({
      variable: match[1],
    }),
  },

  // Type check pattern (is operator)
  {
    name: 'type_check',
    description: 'Runtime type check (is operator)',
    regex: /_instanceOf\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/,
    dartConstruct: 'variable is Type',
    confidence: 'high',
    extractor: (match) => ({
      object: match[1],
      type: match[2],
    }),
  },

  // Navigator push pattern
  {
    name: 'navigator_push',
    description: 'Navigator.push() for navigation',
    regex: /Navigator_push\w*\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/,
    dartConstruct: 'Navigator.push(context, route)',
    confidence: 'high',
    extractor: (match) => ({
      context: match[1],
      route: match[2],
    }),
  },

  // showDialog pattern
  {
    name: 'show_dialog',
    description: 'showDialog() for dialogs',
    regex: /showDialog\w*\s*\(\s*(\w+)/,
    dartConstruct: 'showDialog(context: context, builder: ...)',
    confidence: 'high',
    extractor: (match) => ({
      context: match[1],
    }),
  },

  // StreamBuilder pattern
  {
    name: 'stream_builder',
    description: 'StreamBuilder widget',
    regex: /StreamBuilder_build|_StreamBuilderBase/,
    dartConstruct: 'StreamBuilder(stream: ..., builder: ...)',
    confidence: 'medium',
    extractor: () => ({
      widgetType: 'StreamBuilder',
    }),
  },

  // FutureBuilder pattern
  {
    name: 'future_builder',
    description: 'FutureBuilder widget',
    regex: /FutureBuilder_build|_FutureBuilderState/,
    dartConstruct: 'FutureBuilder(future: ..., builder: ...)',
    confidence: 'medium',
    extractor: () => ({
      widgetType: 'FutureBuilder',
    }),
  },

  // Provider/Consumer pattern
  {
    name: 'provider_consumer',
    description: 'Provider state management',
    regex: /Provider_of|Consumer_build|_InheritedProvider/,
    dartConstruct: 'Provider.of<T>(context) or Consumer<T>',
    confidence: 'medium',
    extractor: () => ({
      stateManagement: 'Provider',
    }),
  },

  // BLoC pattern
  {
    name: 'bloc_pattern',
    description: 'BLoC state management',
    regex: /Bloc_add|BlocBuilder|BlocProvider|_BlocBase/,
    dartConstruct: 'BlocBuilder or BlocProvider',
    confidence: 'medium',
    extractor: () => ({
      stateManagement: 'BLoC',
    }),
  },

  // GetX pattern
  {
    name: 'getx_pattern',
    description: 'GetX state management',
    regex: /GetBuilder|Obx_build|GetxController/,
    dartConstruct: 'GetBuilder or Obx',
    confidence: 'medium',
    extractor: () => ({
      stateManagement: 'GetX',
    }),
  },

  // HTTP request pattern
  {
    name: 'http_request',
    description: 'HTTP request (get/post)',
    regex: /http_(?:get|post|put|delete)\s*\(|_HttpClient/,
    dartConstruct: 'http.get() or http.post()',
    confidence: 'medium',
    extractor: () => ({
      isNetworkCall: true,
    }),
  },

  // JSON decode pattern
  {
    name: 'json_decode',
    description: 'JSON parsing',
    regex: /jsonDecode|json_decode|_JsonDecoder/,
    dartConstruct: 'jsonDecode(string)',
    confidence: 'high',
    extractor: () => ({
      isJsonParsing: true,
    }),
  },

  // SharedPreferences pattern
  {
    name: 'shared_prefs',
    description: 'SharedPreferences storage',
    regex: /SharedPreferences_get|_SharedPreferencesPlugin/,
    dartConstruct: 'SharedPreferences.getInstance()',
    confidence: 'medium',
    extractor: () => ({
      storage: 'SharedPreferences',
    }),
  },
];

// Flutter widget type patterns
const WIDGET_PATTERNS: Record<string, { parent: string; hasState: boolean }> = {
  'StatelessWidget': { parent: 'Widget', hasState: false },
  'StatefulWidget': { parent: 'Widget', hasState: true },
  'Container': { parent: 'StatelessWidget', hasState: false },
  'Row': { parent: 'Flex', hasState: false },
  'Column': { parent: 'Flex', hasState: false },
  'Stack': { parent: 'MultiChildRenderObjectWidget', hasState: false },
  'ListView': { parent: 'BoxScrollView', hasState: false },
  'GridView': { parent: 'BoxScrollView', hasState: false },
  'Scaffold': { parent: 'StatefulWidget', hasState: true },
  'AppBar': { parent: 'StatefulWidget', hasState: true },
  'FloatingActionButton': { parent: 'StatelessWidget', hasState: false },
  'TextField': { parent: 'StatefulWidget', hasState: true },
  'Text': { parent: 'StatelessWidget', hasState: false },
  'Icon': { parent: 'StatelessWidget', hasState: false },
  'Image': { parent: 'StatefulWidget', hasState: true },
  'GestureDetector': { parent: 'StatelessWidget', hasState: false },
  'InkWell': { parent: 'StatefulWidget', hasState: true },
  'AnimatedBuilder': { parent: 'StatefulWidget', hasState: true },
};

export class PatternMatcher {
  private matches: PatternMatch[] = [];

  /**
   * Find all pattern matches in the given pseudo-C code
   */
  findPatterns(code: string, location: CodeLocation): PatternMatch[] {
    this.matches = [];

    for (const pattern of PATTERN_DEFINITIONS) {
      const regex = new RegExp(pattern.regex.source, 'gm');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(code)) !== null) {
        this.matches.push({
          patternName: pattern.name,
          confidence: pattern.confidence,
          dartConstruct: pattern.dartConstruct,
          location: {
            ...location,
            lineStart: this.getLineNumber(code, match.index),
          },
          extractedInfo: pattern.extractor(match, code),
          suggestedCode: this.generateSuggestedCode(pattern.name, pattern.extractor(match, code)),
        });
      }
    }

    return this.matches;
  }

  /**
   * Detect Flutter widget patterns in a function
   */
  detectWidgetPattern(func: PseudoCFunction): FlutterWidgetPattern | null {
    const code = func.rawCode;

    // Check for build method signature
    const buildMatch = code.match(/(\w+)_build\s*\(\s*\w+\s*,\s*\w+\s*context/);
    if (!buildMatch) return null;

    const widgetType = buildMatch[1];

    // Look for child widget creation patterns
    const childWidgets: string[] = [];
    for (const [widgetName] of Object.entries(WIDGET_PATTERNS)) {
      const widgetRegex = new RegExp(`${widgetName}_\\w+\\s*\\(`, 'g');
      if (widgetRegex.test(code)) {
        childWidgets.push(widgetName);
      }
    }

    // Look for property assignments
    const properties: Record<string, any> = {};
    const propMatches = code.matchAll(/(\w+)\s*=\s*([^;]+);/g);
    for (const propMatch of propMatches) {
      properties[propMatch[1]] = { raw: propMatch[2] };
    }

    return {
      widgetType,
      buildMethodAddress: func.address,
      properties,
      childWidgets,
    };
  }

  /**
   * Detect State pattern (StatefulWidget's State class)
   */
  detectStatePattern(func: PseudoCFunction, allFunctions: PseudoCFunction[]): FlutterStatePattern | null {
    const code = func.rawCode;

    // Check for initState signature
    const initStateMatch = code.match(/(\w+State)_initState/);
    if (!initStateMatch) return null;

    const stateClassName = initStateMatch[1];
    const widgetClassName = stateClassName.replace(/^_?/, '').replace(/State$/, '');

    // Find setState calls
    const setStateCalls: CodeLocation[] = [];
    const setStateMatches = code.matchAll(/_setState\s*\(/g);
    for (const match of setStateMatches) {
      setStateCalls.push({
        functionName: func.name,
        address: func.address,
        lineStart: this.getLineNumber(code, match.index || 0),
      });
    }

    // Find state fields from assignments
    const stateFields: any[] = [];
    const fieldMatches = code.matchAll(/this\.(\w+)\s*=/g);
    for (const match of fieldMatches) {
      stateFields.push({
        name: match[1],
        type: { type: 'dynamic', confidence: 'low', evidence: ['From state field assignment'] },
        isStatic: false,
        isFinal: false,
        isLate: false,
        confidence: 'low',
      });
    }

    return {
      stateClassName,
      widgetClassName,
      stateFields,
      setStateCalls,
    };
  }

  /**
   * Check if a function appears to be a widget build method
   */
  isWidgetBuildMethod(func: PseudoCFunction): boolean {
    return /\w+_build\s*\(\s*\w+\s*,\s*\w+\s*context/.test(func.rawCode);
  }

  /**
   * Check if a function appears to be async
   */
  isAsyncFunction(func: PseudoCFunction): boolean {
    return /_async|_await|Future_/.test(func.rawCode);
  }

  /**
   * Check if a function appears to be a generator (sync* or async*)
   */
  isGeneratorFunction(func: PseudoCFunction): boolean {
    return /_SyncIterator|_AsyncStarStreamController/.test(func.rawCode);
  }

  /**
   * Get the state management approach used
   */
  detectStateManagement(code: string): string | null {
    if (/Provider_of|Consumer_build|_InheritedProvider/.test(code)) return 'Provider';
    if (/Bloc_add|BlocBuilder|BlocProvider|_BlocBase/.test(code)) return 'BLoC';
    if (/GetBuilder|Obx_build|GetxController/.test(code)) return 'GetX';
    if (/Riverpod|ProviderScope|ConsumerWidget/.test(code)) return 'Riverpod';
    if (/MobX|Observer_build|_ObservableValue/.test(code)) return 'MobX';
    return null;
  }

  /**
   * Generate suggested Dart code from pattern match
   */
  private generateSuggestedCode(patternName: string, extractedInfo: Record<string, any>): string {
    switch (patternName) {
      case 'widget_build':
        return `@override\nWidget build(BuildContext context) {\n  // TODO: Implement widget tree\n}`;

      case 'create_state':
        return `@override\n${extractedInfo.stateClass} createState() => ${extractedInfo.stateClass}();`;

      case 'set_state':
        return `setState(() {\n  // TODO: Update state variables\n});`;

      case 'init_state':
        return `@override\nvoid initState() {\n  super.initState();\n  // TODO: Initialize state\n}`;

      case 'dispose':
        return `@override\nvoid dispose() {\n  // TODO: Dispose controllers\n  super.dispose();\n}`;

      case 'async_function':
        return `Future<void> asyncMethod() async {\n  // TODO: Implement async logic\n}`;

      case 'future_then':
        return `${extractedInfo.future}.then((value) {\n  // TODO: Handle result\n});`;

      case 'list_iteration':
        return `for (var item in ${extractedInfo.listVar}) {\n  // TODO: Process item\n}`;

      case 'navigator_push':
        return `Navigator.push(\n  context,\n  MaterialPageRoute(builder: (context) => NextScreen()),\n);`;

      case 'show_dialog':
        return `showDialog(\n  context: context,\n  builder: (context) => AlertDialog(\n    // TODO: Dialog content\n  ),\n);`;

      default:
        return `// Pattern: ${patternName}`;
    }
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }
}

// Export singleton instance
export const patternMatcher = new PatternMatcher();
