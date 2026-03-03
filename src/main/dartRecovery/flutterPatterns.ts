/**
 * Dart Recovery Assistant - Flutter Patterns
 *
 * Contains known Flutter framework patterns, widget signatures,
 * and common code structures for recognition.
 */

import { DartType, Confidence } from './types';

// Flutter Widget hierarchy and signatures
export interface WidgetSignature {
  name: string;
  parent: string;
  isStateful: boolean;
  buildMethodSignature: string;
  knownProperties: Record<string, DartType>;
  knownCallbacks: string[];
}

// Common Flutter widgets with their signatures
export const FLUTTER_WIDGETS: Record<string, WidgetSignature> = {
  // Core Widgets
  StatelessWidget: {
    name: 'StatelessWidget',
    parent: 'Widget',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {},
    knownCallbacks: [],
  },
  StatefulWidget: {
    name: 'StatefulWidget',
    parent: 'Widget',
    isStateful: true,
    buildMethodSignature: 'State createState()',
    knownProperties: {},
    knownCallbacks: [],
  },

  // Layout Widgets
  Container: {
    name: 'Container',
    parent: 'StatelessWidget',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      child: 'Widget',
      color: 'Color',
      width: 'double',
      height: 'double',
      margin: 'EdgeInsets',
      padding: 'EdgeInsets',
      decoration: 'Decoration',
      alignment: 'Alignment',
    },
    knownCallbacks: [],
  },
  Row: {
    name: 'Row',
    parent: 'Flex',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      children: 'List',
      mainAxisAlignment: 'MainAxisAlignment',
      crossAxisAlignment: 'CrossAxisAlignment',
      mainAxisSize: 'MainAxisSize',
    },
    knownCallbacks: [],
  },
  Column: {
    name: 'Column',
    parent: 'Flex',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      children: 'List',
      mainAxisAlignment: 'MainAxisAlignment',
      crossAxisAlignment: 'CrossAxisAlignment',
      mainAxisSize: 'MainAxisSize',
    },
    knownCallbacks: [],
  },
  Stack: {
    name: 'Stack',
    parent: 'MultiChildRenderObjectWidget',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      children: 'List',
      alignment: 'AlignmentGeometry',
      fit: 'StackFit',
      clipBehavior: 'Clip',
    },
    knownCallbacks: [],
  },
  ListView: {
    name: 'ListView',
    parent: 'BoxScrollView',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      children: 'List',
      itemCount: 'int',
      scrollDirection: 'Axis',
      physics: 'ScrollPhysics',
      padding: 'EdgeInsets',
    },
    knownCallbacks: ['itemBuilder'],
  },
  GridView: {
    name: 'GridView',
    parent: 'BoxScrollView',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      children: 'List',
      crossAxisCount: 'int',
      crossAxisSpacing: 'double',
      mainAxisSpacing: 'double',
    },
    knownCallbacks: ['itemBuilder'],
  },

  // Material Widgets
  Scaffold: {
    name: 'Scaffold',
    parent: 'StatefulWidget',
    isStateful: true,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      appBar: 'Widget',
      body: 'Widget',
      floatingActionButton: 'Widget',
      drawer: 'Widget',
      bottomNavigationBar: 'Widget',
      backgroundColor: 'Color',
    },
    knownCallbacks: [],
  },
  AppBar: {
    name: 'AppBar',
    parent: 'StatefulWidget',
    isStateful: true,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      title: 'Widget',
      actions: 'List',
      leading: 'Widget',
      backgroundColor: 'Color',
      elevation: 'double',
    },
    knownCallbacks: [],
  },
  FloatingActionButton: {
    name: 'FloatingActionButton',
    parent: 'StatelessWidget',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      child: 'Widget',
      backgroundColor: 'Color',
      elevation: 'double',
      mini: 'bool',
    },
    knownCallbacks: ['onPressed'],
  },
  ElevatedButton: {
    name: 'ElevatedButton',
    parent: 'ButtonStyleButton',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      child: 'Widget',
      style: 'ButtonStyle',
    },
    knownCallbacks: ['onPressed', 'onLongPress'],
  },
  TextButton: {
    name: 'TextButton',
    parent: 'ButtonStyleButton',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      child: 'Widget',
      style: 'ButtonStyle',
    },
    knownCallbacks: ['onPressed', 'onLongPress'],
  },
  IconButton: {
    name: 'IconButton',
    parent: 'StatelessWidget',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      icon: 'Widget',
      iconSize: 'double',
      color: 'Color',
      padding: 'EdgeInsets',
    },
    knownCallbacks: ['onPressed'],
  },

  // Text & Input
  Text: {
    name: 'Text',
    parent: 'StatelessWidget',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      data: 'String',
      style: 'TextStyle',
      textAlign: 'TextAlign',
      maxLines: 'int',
      overflow: 'TextOverflow',
    },
    knownCallbacks: [],
  },
  TextField: {
    name: 'TextField',
    parent: 'StatefulWidget',
    isStateful: true,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      controller: 'TextEditingController',
      decoration: 'InputDecoration',
      keyboardType: 'TextInputType',
      obscureText: 'bool',
      maxLines: 'int',
    },
    knownCallbacks: ['onChanged', 'onSubmitted', 'onTap'],
  },

  // Images & Icons
  Image: {
    name: 'Image',
    parent: 'StatefulWidget',
    isStateful: true,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      image: 'ImageProvider',
      width: 'double',
      height: 'double',
      fit: 'BoxFit',
      color: 'Color',
    },
    knownCallbacks: ['errorBuilder', 'loadingBuilder'],
  },
  Icon: {
    name: 'Icon',
    parent: 'StatelessWidget',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      icon: 'IconData',
      size: 'double',
      color: 'Color',
    },
    knownCallbacks: [],
  },

  // Gestures
  GestureDetector: {
    name: 'GestureDetector',
    parent: 'StatelessWidget',
    isStateful: false,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      child: 'Widget',
      behavior: 'HitTestBehavior',
    },
    knownCallbacks: ['onTap', 'onDoubleTap', 'onLongPress', 'onPanUpdate'],
  },
  InkWell: {
    name: 'InkWell',
    parent: 'StatefulWidget',
    isStateful: true,
    buildMethodSignature: 'Widget build(BuildContext context)',
    knownProperties: {
      child: 'Widget',
      splashColor: 'Color',
      highlightColor: 'Color',
      borderRadius: 'BorderRadius',
    },
    knownCallbacks: ['onTap', 'onDoubleTap', 'onLongPress'],
  },
};

// Flutter State lifecycle methods
export const STATE_LIFECYCLE_METHODS = [
  { name: 'initState', returnType: 'void', isAsync: false },
  { name: 'didChangeDependencies', returnType: 'void', isAsync: false },
  { name: 'build', returnType: 'Widget', isAsync: false },
  { name: 'didUpdateWidget', returnType: 'void', isAsync: false },
  { name: 'deactivate', returnType: 'void', isAsync: false },
  { name: 'dispose', returnType: 'void', isAsync: false },
];

// Common Flutter runtime function patterns
export const FLUTTER_RUNTIME_PATTERNS: Record<string, { category: string; description: string; confidence: Confidence }> = {
  // Widget creation
  '_createElement': { category: 'widget', description: 'Widget element creation', confidence: 'high' },
  '_createRenderObject': { category: 'widget', description: 'Render object creation', confidence: 'high' },
  '_updateRenderObject': { category: 'widget', description: 'Render object update', confidence: 'high' },

  // State management
  '_setState': { category: 'state', description: 'State update trigger', confidence: 'high' },
  '_markNeedsBuild': { category: 'state', description: 'Widget rebuild trigger', confidence: 'high' },
  '_didChangeDependencies': { category: 'state', description: 'Dependency change', confidence: 'high' },

  // Layout
  '_performLayout': { category: 'layout', description: 'Layout calculation', confidence: 'high' },
  '_computeMinIntrinsicWidth': { category: 'layout', description: 'Min width calculation', confidence: 'medium' },
  '_computeMaxIntrinsicWidth': { category: 'layout', description: 'Max width calculation', confidence: 'medium' },

  // Painting
  '_paint': { category: 'paint', description: 'Paint operation', confidence: 'high' },
  '_drawRect': { category: 'paint', description: 'Rectangle drawing', confidence: 'medium' },
  '_drawPath': { category: 'paint', description: 'Path drawing', confidence: 'medium' },

  // Animation
  '_AnimationController': { category: 'animation', description: 'Animation controller', confidence: 'high' },
  '_Tween_lerp': { category: 'animation', description: 'Tween interpolation', confidence: 'high' },
  '_CurvedAnimation': { category: 'animation', description: 'Curved animation', confidence: 'medium' },

  // Navigation
  '_Navigator_push': { category: 'navigation', description: 'Push route', confidence: 'high' },
  '_Navigator_pop': { category: 'navigation', description: 'Pop route', confidence: 'high' },
  '_Navigator_pushReplacement': { category: 'navigation', description: 'Replace route', confidence: 'high' },
  '_MaterialPageRoute': { category: 'navigation', description: 'Page route', confidence: 'medium' },

  // Gestures
  '_GestureRecognizer': { category: 'gesture', description: 'Gesture recognition', confidence: 'high' },
  '_TapGestureRecognizer': { category: 'gesture', description: 'Tap gesture', confidence: 'high' },
  '_DragGestureRecognizer': { category: 'gesture', description: 'Drag gesture', confidence: 'high' },
};

// Common Flutter packages and their identifiers
export const FLUTTER_PACKAGES: Record<string, { description: string; patterns: string[] }> = {
  'provider': {
    description: 'State management with InheritedWidget',
    patterns: ['Provider_of', 'Consumer_build', 'ChangeNotifierProvider', '_InheritedProvider'],
  },
  'bloc': {
    description: 'BLoC state management',
    patterns: ['Bloc_add', 'BlocBuilder', 'BlocProvider', '_BlocBase', 'Cubit_emit'],
  },
  'getx': {
    description: 'GetX state management',
    patterns: ['GetBuilder', 'Obx_build', 'GetxController', '_GetXState'],
  },
  'riverpod': {
    description: 'Riverpod state management',
    patterns: ['ProviderScope', 'ConsumerWidget', '_ProviderContainer', 'ref_watch'],
  },
  'dio': {
    description: 'HTTP client',
    patterns: ['Dio_get', 'Dio_post', '_DioMixin', 'RequestOptions'],
  },
  'http': {
    description: 'Basic HTTP client',
    patterns: ['http_get', 'http_post', '_HttpClient', 'Response_body'],
  },
  'shared_preferences': {
    description: 'Local storage',
    patterns: ['SharedPreferences_get', '_SharedPreferencesPlugin', 'getString', 'setString'],
  },
  'sqflite': {
    description: 'SQLite database',
    patterns: ['Database_query', '_SqflitePlugin', 'openDatabase', 'rawQuery'],
  },
  'firebase_core': {
    description: 'Firebase core',
    patterns: ['Firebase_initializeApp', '_FirebaseCore', 'FirebaseApp'],
  },
  'firebase_auth': {
    description: 'Firebase authentication',
    patterns: ['FirebaseAuth_signIn', '_FirebaseAuthPlugin', 'UserCredential'],
  },
  'cloud_firestore': {
    description: 'Cloud Firestore',
    patterns: ['FirebaseFirestore', 'CollectionReference', 'DocumentSnapshot'],
  },
};

// Common Dart/Flutter error patterns
export const ERROR_PATTERNS = [
  { pattern: '_throwExpression', description: 'throw expression' },
  { pattern: '_AssertionError', description: 'Assertion failed' },
  { pattern: '_TypeError', description: 'Type error' },
  { pattern: '_CastError', description: 'Cast error' },
  { pattern: '_RangeError', description: 'Range error' },
  { pattern: '_ArgumentError', description: 'Argument error' },
  { pattern: '_StateError', description: 'State error' },
  { pattern: '_NoSuchMethodError', description: 'No such method' },
];

// Dart built-in type method patterns
export const DART_TYPE_METHODS: Record<string, Record<string, DartType>> = {
  String: {
    length: 'int',
    isEmpty: 'bool',
    isNotEmpty: 'bool',
    contains: 'bool',
    startsWith: 'bool',
    endsWith: 'bool',
    indexOf: 'int',
    substring: 'String',
    toLowerCase: 'String',
    toUpperCase: 'String',
    trim: 'String',
    split: 'List',
    replaceAll: 'String',
  },
  List: {
    length: 'int',
    isEmpty: 'bool',
    isNotEmpty: 'bool',
    first: 'dynamic',
    last: 'dynamic',
    add: 'void',
    addAll: 'void',
    remove: 'bool',
    removeAt: 'dynamic',
    clear: 'void',
    contains: 'bool',
    indexOf: 'int',
    map: 'Iterable',
    where: 'Iterable',
    forEach: 'void',
  },
  Map: {
    length: 'int',
    isEmpty: 'bool',
    isNotEmpty: 'bool',
    keys: 'Iterable',
    values: 'Iterable',
    containsKey: 'bool',
    containsValue: 'bool',
    remove: 'dynamic',
    clear: 'void',
    forEach: 'void',
  },
  int: {
    isEven: 'bool',
    isOdd: 'bool',
    isNegative: 'bool',
    abs: 'int',
    toString: 'String',
    toDouble: 'double',
    compareTo: 'int',
  },
  double: {
    isNaN: 'bool',
    isInfinite: 'bool',
    isNegative: 'bool',
    abs: 'double',
    ceil: 'int',
    floor: 'int',
    round: 'int',
    toInt: 'int',
    toString: 'String',
  },
  DateTime: {
    year: 'int',
    month: 'int',
    day: 'int',
    hour: 'int',
    minute: 'int',
    second: 'int',
    millisecond: 'int',
    weekday: 'int',
    difference: 'Duration',
    add: 'DateTime',
    subtract: 'DateTime',
    isAfter: 'bool',
    isBefore: 'bool',
    toIso8601String: 'String',
  },
  Duration: {
    inDays: 'int',
    inHours: 'int',
    inMinutes: 'int',
    inSeconds: 'int',
    inMilliseconds: 'int',
    inMicroseconds: 'int',
    isNegative: 'bool',
    abs: 'Duration',
  },
};

/**
 * Detect which Flutter packages are likely used in the code
 */
export function detectUsedPackages(code: string): string[] {
  const usedPackages: string[] = [];

  for (const [packageName, info] of Object.entries(FLUTTER_PACKAGES)) {
    for (const pattern of info.patterns) {
      if (code.includes(pattern)) {
        usedPackages.push(packageName);
        break;
      }
    }
  }

  return usedPackages;
}

/**
 * Get widget signature if it exists
 */
export function getWidgetSignature(widgetName: string): WidgetSignature | undefined {
  return FLUTTER_WIDGETS[widgetName];
}

/**
 * Check if a method name is a Flutter lifecycle method
 */
export function isLifecycleMethod(methodName: string): boolean {
  return STATE_LIFECYCLE_METHODS.some((m) => m.name === methodName);
}
