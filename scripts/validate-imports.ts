#!/usr/bin/env tsx
/**
 * Import Path Validator
 * 
 * Scans all TypeScript files in server/ directory and validates that:
 * 1. All relative imports can be resolved to actual files
 * 2. Import paths match the new directory structure
 * 3. Reports broken imports with suggested fixes
 */

import * as fs from 'fs';
import * as path from 'path';

interface ImportIssue {
  file: string;
  line: number;
  importPath: string;
  error: string;
  suggestion?: string;
}

const issues: ImportIssue[] = [];
let totalFiles = 0;
let totalImports = 0;

// Known directory structure
const SERVER_DIR = path.join(process.cwd(), 'server');
const SUBDIRS = ['routes', 'services', 'middleware', 'core', 'webhooks', 'config', 'lib', 'utils'];

// Regex to match TypeScript import/require statements
const IMPORT_REGEX = /(?:import|export).*?from\s+['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_REGEX = /import\(['"]([^'"]+)['"]\)/g;

/**
 * Recursively get all .ts files in a directory
 */
function getTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules
        if (entry.name === 'node_modules') continue;
        files.push(...getTsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

/**
 * Resolve a relative import path to an absolute file path
 */
function resolveImportPath(fromFile: string, importPath: string): string | null {
  // Skip non-relative imports (npm packages, @shared, etc.)
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return null;
  }
  
  const fromDir = path.dirname(fromFile);
  const resolvedPath = path.resolve(fromDir, importPath);
  
  // Try different file extensions
  const extensions = ['', '.ts', '.tsx', '/index.ts'];
  
  for (const ext of extensions) {
    const fullPath = resolvedPath + ext;
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  return null;
}

/**
 * Suggest a corrected import path based on known directory structure
 */
function suggestFix(fromFile: string, importPath: string): string | null {
  // Get relative position in server directory
  const relativePath = path.relative(SERVER_DIR, fromFile);
  const depth = relativePath.split(path.sep).length;
  
  // Check if the import is trying to access a known subdirectory
  for (const subdir of SUBDIRS) {
    if (importPath.includes(subdir)) {
      // Calculate the correct relative path
      const targetInSubdir = importPath.split(subdir)[1] || '';
      const backSteps = '../'.repeat(depth - 1);
      return `${backSteps}${subdir}${targetInSubdir}`;
    }
  }
  
  // Special case: importing db.ts
  if (importPath.includes('db') && !importPath.includes('db/')) {
    const backSteps = '../'.repeat(depth - 1);
    return `${backSteps}db`;
  }
  
  // Special case: importing storage-client
  if (importPath.includes('storage-client')) {
    const backSteps = '../'.repeat(depth - 1);
    return `${backSteps}core/storage-client`;
  }
  
  return null;
}

/**
 * Validate imports in a file
 */
function validateFile(filePath: string): void {
  totalFiles++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Find all import statements
    const allMatches: Array<{ match: RegExpExecArray; regex: RegExp }> = [];
    
    let match: RegExpExecArray | null;
    while ((match = IMPORT_REGEX.exec(content)) !== null) {
      allMatches.push({ match, regex: IMPORT_REGEX });
    }
    while ((match = DYNAMIC_IMPORT_REGEX.exec(content)) !== null) {
      allMatches.push({ match, regex: DYNAMIC_IMPORT_REGEX });
    }
    
    for (const { match } of allMatches) {
      const importPath = match[1];
      totalImports++;
      
      // Skip non-relative imports
      if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
        continue;
      }
      
      // Try to resolve the import
      const resolved = resolveImportPath(filePath, importPath);
      
      if (!resolved) {
        // Find the line number
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        const issue: ImportIssue = {
          file: path.relative(process.cwd(), filePath),
          line: lineNumber,
          importPath,
          error: 'Cannot resolve import path',
        };
        
        // Try to suggest a fix
        const suggestion = suggestFix(filePath, importPath);
        if (suggestion) {
          issue.suggestion = suggestion;
        }
        
        issues.push(issue);
      }
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Validating import paths in server directory...\n');
  
  // Get all TypeScript files
  const files = getTsFiles(SERVER_DIR);
  
  console.log(`Found ${files.length} TypeScript files\n`);
  
  // Validate each file
  for (const file of files) {
    validateFile(file);
  }
  
  // Report results
  console.log(`\n📊 Validation Summary:`);
  console.log(`   Files scanned: ${totalFiles}`);
  console.log(`   Imports checked: ${totalImports}`);
  console.log(`   Issues found: ${issues.length}\n`);
  
  if (issues.length === 0) {
    console.log('✅ All imports are valid!\n');
    process.exit(0);
  }
  
  // Group issues by file
  const issuesByFile = new Map<string, ImportIssue[]>();
  for (const issue of issues) {
    if (!issuesByFile.has(issue.file)) {
      issuesByFile.set(issue.file, []);
    }
    issuesByFile.get(issue.file)!.push(issue);
  }
  
  // Print issues
  console.log('❌ Broken imports found:\n');
  
  for (const [file, fileIssues] of issuesByFile) {
    console.log(`📄 ${file}`);
    for (const issue of fileIssues) {
      console.log(`   Line ${issue.line}: ${issue.error}`);
      console.log(`      Import: '${issue.importPath}'`);
      if (issue.suggestion) {
        console.log(`      Suggestion: '${issue.suggestion}'`);
      }
      console.log('');
    }
  }
  
  process.exit(1);
}

// Run the validator
main();

