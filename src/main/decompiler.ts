import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import JSZip from 'jszip';

export interface DecompileProgress {
  stage: 'extracting' | 'decompiling' | 'parsing' | 'complete' | 'error';
  percent: number;
  message: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  extension?: string;
}

export interface DecompileResult {
  appName: string;
  packageName: string;
  versionName: string;
  versionCode: string;
  minSdk: string;
  targetSdk: string;
  permissions: string[];
  fileTree: FileNode;
  outputPath: string;
}

export class DecompilerService {
  private jadxPath: string;
  private jrePath: string;
  private tempDir: string;

  constructor(jadxPath: string, jrePath: string) {
    this.jadxPath = jadxPath;
    this.jrePath = jrePath;
    this.tempDir = path.join(os.tmpdir(), 'retrograde');
  }

  async decompile(
    apkPath: string,
    onProgress: (progress: DecompileProgress) => void
  ): Promise<DecompileResult> {
    // Create temp directory for this decompilation
    const sessionDir = path.join(this.tempDir, `session_${Date.now()}`);
    const outputDir = path.join(sessionDir, 'output');

    try {
      // Stage 1: Extract APK
      onProgress({ stage: 'extracting', percent: 10, message: 'Extracting APK contents...' });

      await fs.promises.mkdir(sessionDir, { recursive: true });
      await fs.promises.mkdir(outputDir, { recursive: true });

      // Read APK as ZIP
      const apkBuffer = await fs.promises.readFile(apkPath);
      const zip = await JSZip.loadAsync(apkBuffer);

      // Extract all files
      const extractDir = path.join(sessionDir, 'extracted');
      await fs.promises.mkdir(extractDir, { recursive: true });

      const files = Object.keys(zip.files);
      let extracted = 0;

      for (const filename of files) {
        const file = zip.files[filename];
        if (!file.dir) {
          const filePath = path.join(extractDir, filename);
          const dir = path.dirname(filePath);
          await fs.promises.mkdir(dir, { recursive: true });
          const content = await file.async('nodebuffer');
          await fs.promises.writeFile(filePath, content);
        }
        extracted++;
        const percent = 10 + Math.floor((extracted / files.length) * 20);
        onProgress({ stage: 'extracting', percent, message: `Extracting: ${filename}` });
      }

      // Stage 2: Parse AndroidManifest.xml
      onProgress({ stage: 'parsing', percent: 35, message: 'Parsing AndroidManifest.xml...' });

      const manifestInfo = await this.parseAndroidManifest(extractDir);

      // Stage 3: Decompile DEX files using jadx or fallback
      onProgress({ stage: 'decompiling', percent: 40, message: 'Decompiling bytecode...' });

      // Check if jadx is available
      const jadxAvailable = await this.checkJadxAvailable();

      if (jadxAvailable) {
        await this.runJadx(apkPath, outputDir, onProgress);
      } else {
        // Fallback: Just copy extracted files and create stub Java files
        await this.fallbackDecompile(extractDir, outputDir, onProgress);
      }

      // Stage 4: Build file tree
      onProgress({ stage: 'parsing', percent: 90, message: 'Building file tree...' });

      const fileTree = await this.buildFileTree(outputDir);

      onProgress({ stage: 'complete', percent: 100, message: 'Decompilation complete!' });

      return {
        appName: manifestInfo.appName || path.basename(apkPath, '.apk'),
        packageName: manifestInfo.packageName || 'unknown',
        versionName: manifestInfo.versionName || '1.0',
        versionCode: manifestInfo.versionCode || '1',
        minSdk: manifestInfo.minSdk || 'unknown',
        targetSdk: manifestInfo.targetSdk || 'unknown',
        permissions: manifestInfo.permissions || [],
        fileTree,
        outputPath: outputDir
      };
    } catch (error) {
      onProgress({
        stage: 'error',
        percent: 0,
        message: `Error: ${(error as Error).message}`
      });
      throw error;
    }
  }

  private async checkJadxAvailable(): Promise<boolean> {
    const jadxBin = process.platform === 'win32'
      ? path.join(this.jadxPath, 'bin', 'jadx.bat')
      : path.join(this.jadxPath, 'bin', 'jadx');

    const javaBin = process.platform === 'win32'
      ? path.join(this.jrePath, 'bin', 'java.exe')
      : path.join(this.jrePath, 'bin', 'java');

    try {
      // Check if jadx binary exists
      await fs.promises.access(jadxBin);
      console.log('jadx found at:', jadxBin);

      // Check if bundled JRE exists
      await fs.promises.access(javaBin);
      console.log('Bundled JRE found at:', javaBin);

      return true;
    } catch (err) {
      console.log('jadx or JRE not available:', err);
      return false;
    }
  }

  private async runJadx(
    apkPath: string,
    outputDir: string,
    onProgress: (progress: DecompileProgress) => void
  ): Promise<void> {
    const jadxBin = process.platform === 'win32'
      ? path.join(this.jadxPath, 'bin', 'jadx.bat')
      : path.join(this.jadxPath, 'bin', 'jadx');

    // Set up environment with bundled JRE
    const env = { ...process.env };
    env.JAVA_HOME = this.jrePath;

    // Add bundled JRE to PATH (prepend so it's used first)
    const jreBinPath = path.join(this.jrePath, 'bin');
    env.PATH = jreBinPath + (process.platform === 'win32' ? ';' : ':') + (env.PATH || '');

    console.log('Running jadx with JAVA_HOME:', env.JAVA_HOME);

    return new Promise((resolve, reject) => {
      const jadx = spawn(jadxBin, [
        '-d', outputDir,
        '--show-bad-code',
        '--no-debug-info',
        apkPath
      ], {
        shell: true,
        windowsHide: true,
        env
      });

      let progress = 40;

      jadx.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('INFO')) {
          progress = Math.min(progress + 5, 85);
          onProgress({
            stage: 'decompiling',
            percent: progress,
            message: output.trim().substring(0, 100)
          });
        }
      });

      jadx.stderr.on('data', (data) => {
        console.error(`jadx stderr: ${data}`);
      });

      jadx.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`jadx exited with code ${code}`));
        }
      });

      jadx.on('error', (err) => {
        reject(err);
      });
    });
  }

  private async fallbackDecompile(
    extractDir: string,
    outputDir: string,
    onProgress: (progress: DecompileProgress) => void
  ): Promise<void> {
    // Create source structure
    const srcDir = path.join(outputDir, 'sources');
    const resDir = path.join(outputDir, 'resources');

    await fs.promises.mkdir(srcDir, { recursive: true });
    await fs.promises.mkdir(resDir, { recursive: true });

    // Copy resources (res folder)
    const resSource = path.join(extractDir, 'res');
    if (await this.pathExists(resSource)) {
      await this.copyDir(resSource, path.join(resDir, 'res'));
    }

    // Copy assets
    const assetsSource = path.join(extractDir, 'assets');
    if (await this.pathExists(assetsSource)) {
      await this.copyDir(assetsSource, path.join(resDir, 'assets'));
    }

    // Copy AndroidManifest.xml
    const manifestSource = path.join(extractDir, 'AndroidManifest.xml');
    if (await this.pathExists(manifestSource)) {
      await fs.promises.copyFile(manifestSource, path.join(resDir, 'AndroidManifest.xml'));
    }

    // Create a placeholder note about DEX decompilation
    const readmePath = path.join(srcDir, 'README.txt');
    await fs.promises.writeFile(readmePath,
      `RetroGrade APK Decompiler

This APK was extracted but full DEX decompilation requires Java Runtime Environment (JRE).

To enable full Java source code decompilation:
1. Install Java from: https://adoptium.net/ (Eclipse Temurin recommended)
   Or from: https://www.oracle.com/java/technologies/downloads/
2. Make sure 'java' is in your system PATH
3. Restart RetroGrade and try decompiling again

For now, the following resources have been extracted:
- AndroidManifest.xml
- res/ folder (layouts, strings, drawables)
- assets/ folder

You can view these files in the file tree on the left.
`
    );

    onProgress({
      stage: 'decompiling',
      percent: 85,
      message: 'Extracted resources (Java not installed - install JRE for full decompilation)'
    });
  }

  private async parseAndroidManifest(extractDir: string): Promise<{
    appName?: string;
    packageName?: string;
    versionName?: string;
    versionCode?: string;
    minSdk?: string;
    targetSdk?: string;
    permissions?: string[];
  }> {
    const manifestPath = path.join(extractDir, 'AndroidManifest.xml');

    try {
      // The manifest in APK is in binary XML format
      // For now, return defaults; full parsing requires AXML decoder
      const content = await fs.promises.readFile(manifestPath);

      // Try to extract strings from binary manifest
      const strings = this.extractStringsFromBinaryXml(content);

      // Look for common patterns
      const packageMatch = strings.find(s => s.includes('.') && !s.includes('/') && !s.includes(' '));
      const permissions = strings.filter(s => s.startsWith('android.permission.'));

      return {
        packageName: packageMatch || undefined,
        permissions
      };
    } catch {
      return {};
    }
  }

  private extractStringsFromBinaryXml(buffer: Buffer): string[] {
    const strings: string[] = [];
    let i = 0;

    while (i < buffer.length - 1) {
      // Look for printable ASCII strings
      let str = '';
      while (i < buffer.length && buffer[i] >= 32 && buffer[i] <= 126) {
        str += String.fromCharCode(buffer[i]);
        i++;
      }
      if (str.length > 3) {
        strings.push(str);
      }
      i++;
    }

    return strings;
  }

  private async buildFileTree(dir: string): Promise<FileNode> {
    const name = path.basename(dir);

    const stat = await fs.promises.stat(dir);

    if (!stat.isDirectory()) {
      return {
        name,
        path: dir,
        type: 'file',
        extension: path.extname(name).toLowerCase()
      };
    }

    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const children: FileNode[] = [];

    // Sort: folders first, then files alphabetically
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
      const childPath = path.join(dir, entry.name);
      children.push(await this.buildFileTree(childPath));
    }

    return {
      name,
      path: dir,
      type: 'folder',
      children
    };
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

  async exportProject(outputPath: string, files: FileNode[]): Promise<void> {
    // Create Android Studio project structure
    const srcMainJava = path.join(outputPath, 'app', 'src', 'main', 'java');
    const srcMainRes = path.join(outputPath, 'app', 'src', 'main', 'res');

    await fs.promises.mkdir(srcMainJava, { recursive: true });
    await fs.promises.mkdir(srcMainRes, { recursive: true });

    // Create build.gradle files
    const rootBuildGradle = `// Top-level build file
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.0'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
`;

    const appBuildGradle = `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.example.decompiled'
    compileSdk 34

    defaultConfig {
        applicationId "com.example.decompiled"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.9.0'
}
`;

    const settingsGradle = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
rootProject.name = "DecompiledProject"
include ':app'
`;

    await fs.promises.writeFile(path.join(outputPath, 'build.gradle'), rootBuildGradle);
    await fs.promises.writeFile(path.join(outputPath, 'app', 'build.gradle'), appBuildGradle);
    await fs.promises.writeFile(path.join(outputPath, 'settings.gradle'), settingsGradle);

    // Copy source files from decompiled output
    // This would copy from the temp decompilation directory
  }
}
