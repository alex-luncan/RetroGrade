import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BuildProgress {
  stage: 'preparing' | 'copying' | 'analyzing' | 'generating' | 'opening' | 'complete' | 'error';
  percent: number;
  message: string;
}

export interface ProjectInfo {
  packageName: string;
  appName: string;
  versionName: string;
  versionCode: string;
  minSdk: string;
  targetSdk: string;
  decompileOutputPath: string;
  targetOutputPath: string;
}

interface ParsedManifest {
  packageName: string;
  appName: string;
  versionName: string;
  versionCode: string;
  minSdk: string;
  targetSdk: string;
  compileSdk: string;
  isFlutterApp: boolean;
  hasGoogleMaps: boolean;
  hasGooglePlayServices: boolean;
  hasFirebase: boolean;
  permissions: string[];
}

interface DetectedFeatures {
  isFlutterApp: boolean;
  isKotlinApp: boolean;
  hasGoogleMaps: boolean;
  hasGooglePlayServices: boolean;
  hasFirebase: boolean;
  hasRoom: boolean;
  hasRetrofit: boolean;
  hasGson: boolean;
}

export class AndroidStudioBuilder {
  async buildProject(
    projectInfo: ProjectInfo,
    onProgress: (progress: BuildProgress) => void
  ): Promise<string> {
    const { targetOutputPath, decompileOutputPath } = projectInfo;

    try {
      onProgress({ stage: 'analyzing', percent: 5, message: 'Analyzing decompiled manifest...' });

      // Parse the decompiled AndroidManifest.xml to get real values
      const parsedManifest = await this.parseDecompiledManifest(decompileOutputPath);

      // Detect features from code
      onProgress({ stage: 'analyzing', percent: 15, message: 'Detecting app features...' });
      const features = await this.detectFeatures(decompileOutputPath, parsedManifest);

      // Use parsed values, falling back to provided values
      const config = {
        packageName: parsedManifest.packageName || projectInfo.packageName || 'com.decompiled.app',
        appName: parsedManifest.appName || projectInfo.appName || 'DecompiledApp',
        versionName: parsedManifest.versionName || projectInfo.versionName || '1.0.0',
        versionCode: parsedManifest.versionCode || projectInfo.versionCode || '1',
        minSdk: parsedManifest.minSdk || projectInfo.minSdk || '21',
        targetSdk: parsedManifest.targetSdk || projectInfo.targetSdk || '34',
        compileSdk: parsedManifest.compileSdk || parsedManifest.targetSdk || '34',
      };

      console.log('Parsed config:', config);
      console.log('Detected features:', features);

      // Create project directory with app name
      const sanitizedName = config.appName.replace(/[^a-zA-Z0-9]/g, '') || 'DecompiledApp';
      const projectDir = path.join(targetOutputPath, sanitizedName);

      onProgress({ stage: 'preparing', percent: 20, message: 'Creating project structure...' });

      // Create directory structure
      await this.createProjectStructure(projectDir, config.packageName);

      onProgress({ stage: 'copying', percent: 30, message: 'Copying source files...' });

      // Copy decompiled sources
      await this.copyDecompiledSources(decompileOutputPath, projectDir);

      onProgress({ stage: 'copying', percent: 45, message: 'Copying native libraries...' });

      // Copy native libraries (.so files)
      await this.copyNativeLibraries(decompileOutputPath, projectDir);

      onProgress({ stage: 'generating', percent: 55, message: 'Generating Gradle files...' });

      // Generate build files with detected features
      await this.generateBuildFiles(projectDir, config, features);

      onProgress({ stage: 'generating', percent: 70, message: 'Creating Gradle wrapper...' });

      // Create Gradle wrapper
      await this.createGradleWrapper(projectDir);

      onProgress({ stage: 'generating', percent: 80, message: 'Creating additional config files...' });

      // Create Flutter-specific files if needed
      if (features.isFlutterApp) {
        await this.createFlutterConfig(projectDir, config);
      }

      onProgress({ stage: 'opening', percent: 85, message: 'Looking for Android Studio...' });

      // Try to open in Android Studio
      const androidStudioPath = await this.findAndroidStudio();

      if (androidStudioPath) {
        onProgress({ stage: 'opening', percent: 95, message: 'Opening in Android Studio...' });
        await this.openInAndroidStudio(androidStudioPath, projectDir);
      }

      onProgress({ stage: 'complete', percent: 100, message: 'Project created successfully!' });

      return projectDir;
    } catch (error) {
      onProgress({
        stage: 'error',
        percent: 0,
        message: `Error: ${(error as Error).message}`
      });
      throw error;
    }
  }

  private async parseDecompiledManifest(decompileOutputPath: string): Promise<ParsedManifest> {
    const result: ParsedManifest = {
      packageName: '',
      appName: '',
      versionName: '',
      versionCode: '',
      minSdk: '',
      targetSdk: '',
      compileSdk: '',
      isFlutterApp: false,
      hasGoogleMaps: false,
      hasGooglePlayServices: false,
      hasFirebase: false,
      permissions: [],
    };

    // Try to find AndroidManifest.xml in various locations
    const possiblePaths = [
      path.join(decompileOutputPath, 'resources', 'AndroidManifest.xml'),
      path.join(decompileOutputPath, 'AndroidManifest.xml'),
    ];

    let manifestContent = '';
    for (const manifestPath of possiblePaths) {
      if (await this.pathExists(manifestPath)) {
        manifestContent = await fs.promises.readFile(manifestPath, 'utf-8');
        break;
      }
    }

    if (!manifestContent) {
      console.log('No AndroidManifest.xml found');
      return result;
    }

    // Parse package name
    const packageMatch = manifestContent.match(/package="([^"]+)"/);
    if (packageMatch) {
      result.packageName = packageMatch[1];
    }

    // Parse version info
    const versionCodeMatch = manifestContent.match(/android:versionCode="([^"]+)"/);
    if (versionCodeMatch) {
      result.versionCode = versionCodeMatch[1];
    }

    const versionNameMatch = manifestContent.match(/android:versionName="([^"]+)"/);
    if (versionNameMatch) {
      result.versionName = versionNameMatch[1];
    }

    // Parse SDK versions
    const minSdkMatch = manifestContent.match(/android:minSdkVersion="([^"]+)"/);
    if (minSdkMatch) {
      result.minSdk = minSdkMatch[1];
    }

    const targetSdkMatch = manifestContent.match(/android:targetSdkVersion="([^"]+)"/);
    if (targetSdkMatch) {
      result.targetSdk = targetSdkMatch[1];
    }

    const compileSdkMatch = manifestContent.match(/android:compileSdkVersion="([^"]+)"/);
    if (compileSdkMatch) {
      result.compileSdk = compileSdkMatch[1];
    }

    // Parse app name (label)
    const labelMatch = manifestContent.match(/android:label="([^"@]+)"/);
    if (labelMatch) {
      result.appName = labelMatch[1];
    }

    // Detect Flutter
    if (manifestContent.includes('flutterEmbedding') ||
        manifestContent.includes('io.flutter.embedding') ||
        manifestContent.includes('FlutterActivity')) {
      result.isFlutterApp = true;
    }

    // Detect Google Maps
    if (manifestContent.includes('com.google.android.geo.API_KEY') ||
        manifestContent.includes('com.google.android.maps')) {
      result.hasGoogleMaps = true;
    }

    // Detect Google Play Services
    if (manifestContent.includes('com.google.android.gms')) {
      result.hasGooglePlayServices = true;
    }

    // Detect Firebase
    if (manifestContent.includes('com.google.firebase') ||
        manifestContent.includes('firebase')) {
      result.hasFirebase = true;
    }

    // Parse permissions
    const permissionRegex = /android:name="(android\.permission\.[^"]+)"/g;
    let permMatch;
    while ((permMatch = permissionRegex.exec(manifestContent)) !== null) {
      result.permissions.push(permMatch[1]);
    }

    console.log('Parsed manifest:', result);
    return result;
  }

  private async detectFeatures(decompileOutputPath: string, manifest: ParsedManifest): Promise<DetectedFeatures> {
    const features: DetectedFeatures = {
      isFlutterApp: manifest.isFlutterApp,
      isKotlinApp: false,
      hasGoogleMaps: manifest.hasGoogleMaps,
      hasGooglePlayServices: manifest.hasGooglePlayServices,
      hasFirebase: manifest.hasFirebase,
      hasRoom: false,
      hasRetrofit: false,
      hasGson: false,
    };

    // Check for Kotlin files
    const sourcesDir = path.join(decompileOutputPath, 'sources');
    if (await this.pathExists(sourcesDir)) {
      features.isKotlinApp = await this.hasFileWithExtension(sourcesDir, '.kt');
    }

    // Check for common libraries in decompiled code
    const javaDir = path.join(decompileOutputPath, 'sources');
    if (await this.pathExists(javaDir)) {
      // Check for Room
      if (await this.pathExists(path.join(javaDir, 'androidx', 'room'))) {
        features.hasRoom = true;
      }
      // Check for Retrofit
      if (await this.pathExists(path.join(javaDir, 'retrofit2'))) {
        features.hasRetrofit = true;
      }
      // Check for Gson
      if (await this.pathExists(path.join(javaDir, 'com', 'google', 'gson'))) {
        features.hasGson = true;
      }
    }

    return features;
  }

  private async hasFileWithExtension(dir: string, ext: string): Promise<boolean> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(ext)) {
          return true;
        }
        if (entry.isDirectory()) {
          const hasFile = await this.hasFileWithExtension(path.join(dir, entry.name), ext);
          if (hasFile) return true;
        }
      }
    } catch {
      // Ignore errors
    }
    return false;
  }

  private async createProjectStructure(projectDir: string, packageName: string): Promise<void> {
    const packagePath = (packageName || 'com.decompiled.app').replace(/\./g, path.sep);

    const dirs = [
      path.join(projectDir, 'app', 'src', 'main', 'java', packagePath),
      path.join(projectDir, 'app', 'src', 'main', 'res', 'layout'),
      path.join(projectDir, 'app', 'src', 'main', 'res', 'values'),
      path.join(projectDir, 'app', 'src', 'main', 'res', 'drawable'),
      path.join(projectDir, 'app', 'src', 'main', 'res', 'mipmap-hdpi'),
      path.join(projectDir, 'app', 'src', 'main', 'res', 'mipmap-mdpi'),
      path.join(projectDir, 'app', 'src', 'main', 'res', 'mipmap-xhdpi'),
      path.join(projectDir, 'app', 'src', 'main', 'res', 'mipmap-xxhdpi'),
      path.join(projectDir, 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi'),
      path.join(projectDir, 'app', 'src', 'main', 'jniLibs'),
      path.join(projectDir, 'app', 'src', 'test', 'java', packagePath),
      path.join(projectDir, 'app', 'src', 'androidTest', 'java', packagePath),
      path.join(projectDir, 'gradle', 'wrapper'),
    ];

    for (const dir of dirs) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }

  private async copyDecompiledSources(decompileOutputPath: string, projectDir: string): Promise<void> {
    const sourcesDir = path.join(decompileOutputPath, 'sources');
    const resourcesDir = path.join(decompileOutputPath, 'resources');

    // Copy Java/Kotlin sources
    if (await this.pathExists(sourcesDir)) {
      const targetJavaDir = path.join(projectDir, 'app', 'src', 'main', 'java');
      await this.copyDir(sourcesDir, targetJavaDir);
    }

    // Copy resources
    if (await this.pathExists(resourcesDir)) {
      // Copy res folder
      const resSource = path.join(resourcesDir, 'res');
      if (await this.pathExists(resSource)) {
        const targetResDir = path.join(projectDir, 'app', 'src', 'main', 'res');
        await this.copyDir(resSource, targetResDir);
      }

      // Copy AndroidManifest.xml
      const manifestSource = path.join(resourcesDir, 'AndroidManifest.xml');
      if (await this.pathExists(manifestSource)) {
        const targetManifest = path.join(projectDir, 'app', 'src', 'main', 'AndroidManifest.xml');
        await fs.promises.copyFile(manifestSource, targetManifest);
      }

      // Copy assets
      const assetsSource = path.join(resourcesDir, 'assets');
      if (await this.pathExists(assetsSource)) {
        const targetAssetsDir = path.join(projectDir, 'app', 'src', 'main', 'assets');
        await this.copyDir(assetsSource, targetAssetsDir);
      }
    }
  }

  private async copyNativeLibraries(decompileOutputPath: string, projectDir: string): Promise<void> {
    // Look for native libraries in various locations
    const possibleLibDirs = [
      path.join(decompileOutputPath, 'resources', 'lib'),
      path.join(decompileOutputPath, 'lib'),
      path.join(path.dirname(decompileOutputPath), 'extracted', 'lib'),
    ];

    const targetJniLibs = path.join(projectDir, 'app', 'src', 'main', 'jniLibs');

    for (const libDir of possibleLibDirs) {
      if (await this.pathExists(libDir)) {
        console.log('Found native libraries at:', libDir);
        await this.copyDir(libDir, targetJniLibs);
        return;
      }
    }

    console.log('No native libraries found');
  }

  private async generateBuildFiles(
    projectDir: string,
    config: {
      packageName: string;
      appName: string;
      versionName: string;
      versionCode: string;
      minSdk: string;
      targetSdk: string;
      compileSdk: string;
    },
    features: DetectedFeatures
  ): Promise<void> {
    const sanitizedAppName = config.appName.replace(/[^a-zA-Z0-9]/g, '') || 'DecompiledApp';

    // Ensure SDK values are valid numbers
    const minSdk = this.parseSdk(config.minSdk, '21');
    const targetSdk = this.parseSdk(config.targetSdk, '34');
    const compileSdk = this.parseSdk(config.compileSdk, targetSdk);

    // Root build.gradle
    let rootBuildGradle = `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id 'com.android.application' version '8.1.0' apply false
    id 'com.android.library' version '8.1.0' apply false
`;

    if (features.isKotlinApp) {
      rootBuildGradle += `    id 'org.jetbrains.kotlin.android' version '1.9.0' apply false\n`;
    }

    rootBuildGradle += `}
`;

    // Build dependencies list based on detected features
    let dependencies = `    // AndroidX Core
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.10.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'androidx.activity:activity-ktx:1.8.0'
    implementation 'androidx.fragment:fragment-ktx:1.6.2'
`;

    if (features.isFlutterApp) {
      dependencies += `
    // Flutter embedding (for decompiled Flutter apps)
    // Note: Flutter apps require the Flutter SDK to fully rebuild
    // This provides basic compatibility for the decompiled code
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.6.2'
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2'
`;
    }

    if (features.hasGoogleMaps) {
      dependencies += `
    // Google Maps
    implementation 'com.google.android.gms:play-services-maps:18.2.0'
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    implementation 'com.google.maps.android:android-maps-utils:3.8.0'
`;
    }

    if (features.hasGooglePlayServices && !features.hasGoogleMaps) {
      dependencies += `
    // Google Play Services
    implementation 'com.google.android.gms:play-services-base:18.2.0'
`;
    }

    if (features.hasFirebase) {
      dependencies += `
    // Firebase (add specific dependencies as needed)
    implementation platform('com.google.firebase:firebase-bom:32.6.0')
    implementation 'com.google.firebase:firebase-analytics'
`;
    }

    if (features.hasRoom) {
      dependencies += `
    // Room Database
    implementation 'androidx.room:room-runtime:2.6.1'
    annotationProcessor 'androidx.room:room-compiler:2.6.1'
`;
    }

    if (features.hasRetrofit) {
      dependencies += `
    // Retrofit
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
`;
    }

    if (features.hasGson && !features.hasRetrofit) {
      dependencies += `
    // Gson
    implementation 'com.google.code.gson:gson:2.10.1'
`;
    }

    dependencies += `
    // Testing
    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
`;

    // App build.gradle
    let appBuildGradle = `plugins {
    id 'com.android.application'
`;

    if (features.isKotlinApp) {
      appBuildGradle += `    id 'org.jetbrains.kotlin.android'\n`;
    }

    if (features.hasFirebase) {
      appBuildGradle += `    id 'com.google.gms.google-services'\n`;
    }

    appBuildGradle += `}

android {
    namespace '${config.packageName}'
    compileSdk ${compileSdk}

    defaultConfig {
        applicationId "${config.packageName}"
        minSdk ${minSdk}
        targetSdk ${targetSdk}
        versionCode ${config.versionCode}
        versionName "${config.versionName}"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"

        // Support for vector drawables on older devices
        vectorDrawables.useSupportLibrary = true
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            minifyEnabled false
            debuggable true
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
`;

    if (features.isKotlinApp) {
      appBuildGradle += `
    kotlinOptions {
        jvmTarget = '1.8'
    }
`;
    }

    appBuildGradle += `
    // Handle duplicate files from decompilation
    packagingOptions {
        pickFirst '**/*.so'
        pickFirst '**/META-INF/*'
        exclude 'META-INF/NOTICE'
        exclude 'META-INF/NOTICE.txt'
        exclude 'META-INF/LICENSE'
        exclude 'META-INF/LICENSE.txt'
        exclude 'META-INF/DEPENDENCIES'
        exclude 'META-INF/*.kotlin_module'
    }

    // Suppress lint errors for decompiled code
    lint {
        abortOnError false
        checkReleaseBuilds false
        disable 'InvalidPackage', 'MissingTranslation', 'ExtraTranslation'
    }

    // Source sets for native libraries
    sourceSets {
        main {
            jniLibs.srcDirs = ['src/main/jniLibs']
        }
    }
}

dependencies {
${dependencies}
}
`;

    // settings.gradle
    const settingsGradle = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${sanitizedAppName}"
include ':app'
`;

    // gradle.properties
    const gradleProperties = `# Project-wide Gradle settings.
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
android.enableJetifier=true
kotlin.code.style=official
`;

    // local.properties (placeholder)
    const localProperties = `# This file should contain local configuration
# sdk.dir will be set automatically by Android Studio
`;

    // proguard-rules.pro
    const proguardRules = `# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /sdk/tools/proguard/proguard-android.txt

# Keep all classes from decompiled code
-keep class ${config.packageName}.** { *; }
-dontwarn ${config.packageName}.**

# Keep obfuscated classes (common patterns from R8/ProGuard)
-keep class A.** { *; }
-keep class a.** { *; }
-keep class b.** { *; }
-keep class c.** { *; }

# Common Android rules
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes Signature
-keepattributes Exceptions

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# AndroidX
-keep class androidx.** { *; }
-dontwarn androidx.**

# Google Play Services
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
`;

    // .gitignore
    const gitignore = `*.iml
.gradle
/local.properties
/.idea
.DS_Store
/build
/captures
.externalNativeBuild
.cxx
local.properties
`;

    // README.md
    const readme = `# ${config.appName}

This Android Studio project was generated by **RetroGrade APK Decompiler**.

## Project Information
- **Package Name:** ${config.packageName}
- **Version:** ${config.versionName} (${config.versionCode})
- **Min SDK:** ${minSdk}
- **Target SDK:** ${targetSdk}

## Detected Features
${features.isFlutterApp ? '- Flutter App\n' : ''}${features.isKotlinApp ? '- Kotlin\n' : ''}${features.hasGoogleMaps ? '- Google Maps\n' : ''}${features.hasGooglePlayServices ? '- Google Play Services\n' : ''}${features.hasFirebase ? '- Firebase\n' : ''}${features.hasRoom ? '- Room Database\n' : ''}${features.hasRetrofit ? '- Retrofit\n' : ''}

## Notes
- This is a decompiled project and may contain obfuscated code
- Some features may not work without additional configuration
- Native libraries (.so files) have been included in jniLibs
${features.isFlutterApp ? '- Flutter apps require the Flutter SDK to fully rebuild the Dart code\n' : ''}

## Building
1. Open this project in Android Studio
2. Wait for Gradle sync to complete
3. Build > Make Project

---
*Generated by RetroGrade APK Decompiler*
*https://luncanalex.dev/*
`;

    await fs.promises.writeFile(path.join(projectDir, 'build.gradle'), rootBuildGradle);
    await fs.promises.writeFile(path.join(projectDir, 'app', 'build.gradle'), appBuildGradle);
    await fs.promises.writeFile(path.join(projectDir, 'settings.gradle'), settingsGradle);
    await fs.promises.writeFile(path.join(projectDir, 'gradle.properties'), gradleProperties);
    await fs.promises.writeFile(path.join(projectDir, 'local.properties'), localProperties);
    await fs.promises.writeFile(path.join(projectDir, 'app', 'proguard-rules.pro'), proguardRules);
    await fs.promises.writeFile(path.join(projectDir, '.gitignore'), gitignore);
    await fs.promises.writeFile(path.join(projectDir, 'README.md'), readme);
  }

  private parseSdk(sdk: string, defaultValue: string): string {
    const parsed = parseInt(sdk, 10);
    return isNaN(parsed) ? defaultValue : parsed.toString();
  }

  private async createFlutterConfig(projectDir: string, config: { packageName: string; appName: string }): Promise<void> {
    // Create a note about Flutter apps
    const flutterNote = `# Flutter App Notice

This project was originally built with Flutter.

The decompiled code contains:
- Compiled Dart code (cannot be recovered to original Dart source)
- Native Flutter engine libraries
- Android platform code

To fully work with this app, you would need:
1. The original Flutter/Dart source code
2. Flutter SDK installed
3. Proper pubspec.yaml dependencies

The Android portion of the app can be modified, but the core Flutter/Dart
functionality is compiled and cannot be easily modified.

For more information about Flutter: https://flutter.dev/
`;

    await fs.promises.writeFile(path.join(projectDir, 'FLUTTER_NOTICE.md'), flutterNote);
  }

  private async createGradleWrapper(projectDir: string): Promise<void> {
    // gradle-wrapper.properties
    const wrapperProperties = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.0-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;

    await fs.promises.writeFile(
      path.join(projectDir, 'gradle', 'wrapper', 'gradle-wrapper.properties'),
      wrapperProperties
    );

    // Create gradlew scripts
    const gradlewUnix = `#!/bin/sh
# Gradle wrapper script for Unix systems
exec gradle "$@"
`;

    const gradlewBat = `@rem Gradle wrapper script for Windows
@echo off
gradle %*
`;

    await fs.promises.writeFile(path.join(projectDir, 'gradlew'), gradlewUnix);
    await fs.promises.writeFile(path.join(projectDir, 'gradlew.bat'), gradlewBat);

    // Make gradlew executable on Unix
    if (process.platform !== 'win32') {
      await fs.promises.chmod(path.join(projectDir, 'gradlew'), 0o755);
    }
  }

  async findAndroidStudio(): Promise<string | null> {
    const platform = process.platform;

    if (platform === 'win32') {
      const possiblePaths = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Android', 'Android Studio', 'bin', 'studio64.exe'),
        path.join(process.env.PROGRAMFILES || '', 'Android', 'Android Studio', 'bin', 'studio64.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Android', 'Android Studio', 'bin', 'studio64.exe'),
        'C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe',
        'C:\\Program Files (x86)\\Android\\Android Studio\\bin\\studio64.exe',
      ];

      for (const p of possiblePaths) {
        if (await this.pathExists(p)) {
          return p;
        }
      }

      try {
        const { stdout } = await execAsync('where studio64.exe', { windowsHide: true });
        const studioPath = stdout.trim().split('\n')[0];
        if (studioPath && await this.pathExists(studioPath)) {
          return studioPath;
        }
      } catch {
        // Not in PATH
      }
    } else if (platform === 'darwin') {
      const possiblePaths = [
        '/Applications/Android Studio.app/Contents/MacOS/studio',
        path.join(process.env.HOME || '', 'Applications', 'Android Studio.app', 'Contents', 'MacOS', 'studio'),
      ];

      for (const p of possiblePaths) {
        if (await this.pathExists(p)) {
          return p;
        }
      }
    } else {
      const possiblePaths = [
        '/opt/android-studio/bin/studio.sh',
        '/usr/local/android-studio/bin/studio.sh',
        path.join(process.env.HOME || '', 'android-studio', 'bin', 'studio.sh'),
        '/snap/android-studio/current/android-studio/bin/studio.sh',
      ];

      for (const p of possiblePaths) {
        if (await this.pathExists(p)) {
          return p;
        }
      }

      try {
        const { stdout } = await execAsync('which studio.sh');
        const studioPath = stdout.trim();
        if (studioPath && await this.pathExists(studioPath)) {
          return studioPath;
        }
      } catch {
        // Not in PATH
      }
    }

    return null;
  }

  async openInAndroidStudio(studioPath: string, projectDir: string): Promise<void> {
    return new Promise((resolve) => {
      const args = [projectDir];

      if (process.platform === 'win32') {
        const child = spawn('cmd', ['/c', 'start', '', studioPath, ...args], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        child.unref();
        resolve();
      } else if (process.platform === 'darwin') {
        const child = spawn('open', ['-a', 'Android Studio', projectDir], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        resolve();
      } else {
        const child = spawn(studioPath, args, {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        resolve();
      }
    });
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.promises.access(p);
      return true;
    } catch {
      return false;
    }
  }

  private async copyDir(src: string, dest: string): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }
}
