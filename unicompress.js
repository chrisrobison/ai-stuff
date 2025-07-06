#!/usr/bin/env node

/**
 * Unicode Compression CLI
 * 
 * A command-line tool to compress files into Unicode characters
 * Usage: 
 *   ./compress-unicode.js compress file1.txt file2.html ...
 *   ./compress-unicode.js decompress file1.uc file2.uc ...
 */

const fs = require('fs');
const path = require('path');

// Constants
const BASE_OFFSET = 0x0100; // Start at Unicode 256 to avoid ASCII conflicts
const BITS_PER_CHAR = 16;   // Most Unicode characters use 16 bits
const VERSION = "1.0.0";

/**
 * Compress text by converting to binary, applying compression, and encoding to Unicode
 */
function compressText(text) {
  // Step 1: Convert text to a binary array
  const textEncoder = new TextEncoder();
  const binaryData = textEncoder.encode(text);
  
  // Step 2: Apply a compression algorithm (simplified implementation of LZ77/DEFLATE)
  const compressedBinary = compressBinary(binaryData);
  
  // Step 3: Encode the compressed binary data using Unicode characters
  return binaryToUnicode(compressedBinary);
}

/**
 * Decompress text by decoding from Unicode, decompressing, and converting back to text
 */
function decompressText(compressedText) {
  // Step 1: Decode the Unicode characters back to binary
  const compressedBinary = unicodeToBinary(compressedText);
  
  // Step 2: Decompress the binary data
  const binaryData = decompressBinary(compressedBinary);
  
  // Step 3: Convert binary back to text
  const textDecoder = new TextDecoder();
  return textDecoder.decode(binaryData);
}

/**
 * Simplified binary compression (similar to LZ77/DEFLATE)
 * In a real implementation, you would use a proper compression library
 */
function compressBinary(data) {
  // This is a simplified placeholder for actual compression
  // Real implementation would use sliding window, dictionary coding, etc.
  
  let compressed = [];
  let i = 0;
  
  while (i < data.length) {
    // Look for repeated sequences (simplified)
    let matchLength = 0;
    let matchDistance = 0;
    
    // Find longest matching sequence within the last 2048 bytes
    const maxLookback = Math.min(2048, i);
    
    for (let dist = 1; dist <= maxLookback; dist++) {
      let len = 0;
      while (i + len < data.length && data[i - dist + len] === data[i + len] && len < 258) {
        len++;
      }
      
      if (len > matchLength) {
        matchLength = len;
        matchDistance = dist;
      }
    }
    
    if (matchLength > 3) {
      // Store as a length-distance pair (only 3 bytes instead of matchLength bytes)
      compressed.push(0); // Flag for length-distance pair
      compressed.push(matchLength);
      compressed.push(matchDistance);
      i += matchLength;
    } else {
      // Store as literal
      compressed.push(1); // Flag for literal
      compressed.push(data[i]);
      i++;
    }
  }
  
  return new Uint8Array(compressed);
}

/**
 * Decompress binary data (matching the simplified compression above)
 */
function decompressBinary(compressed) {
  let decompressed = [];
  let i = 0;
  
  while (i < compressed.length) {
    const flag = compressed[i++];
    
    if (flag === 0) {
      // Length-distance pair
      const length = compressed[i++];
      const distance = compressed[i++];
      
      const start = decompressed.length - distance;
      for (let j = 0; j < length; j++) {
        decompressed.push(decompressed[start + j]);
      }
    } else {
      // Literal
      decompressed.push(compressed[i++]);
    }
  }
  
  return new Uint8Array(decompressed);
}

/**
 * Convert binary data to Unicode characters
 * This packs multiple binary bytes into each Unicode character
 */
function binaryToUnicode(binaryData) {
  const chunks = Math.ceil(binaryData.length / 2);
  let result = '';
  
  // Store binary length in the first character (as metadata)
  result += String.fromCodePoint(BASE_OFFSET + binaryData.length);
  
  // Pack bytes into 16-bit Unicode characters (2 bytes per character)
  for (let i = 0; i < chunks; i++) {
    const byte1 = binaryData[i * 2] || 0;
    const byte2 = (i * 2 + 1 < binaryData.length) ? binaryData[i * 2 + 1] : 0;
    
    // Combine two bytes into a 16-bit value
    const value = (byte1 << 8) | byte2;
    
    // Convert to a Unicode character and add to result
    result += String.fromCodePoint(BASE_OFFSET + value);
  }
  
  return result;
}

/**
 * Convert Unicode characters back to binary data
 */
function unicodeToBinary(unicodeText) {
  // Extract the length from the first character
  const length = unicodeText.codePointAt(0) - BASE_OFFSET;
  
  // Allocate binary array
  const binaryData = new Uint8Array(length);
  
  // Extract bytes from Unicode characters (starting from index 1)
  for (let i = 1; i < unicodeText.length; i++) {
    const value = unicodeText.codePointAt(i) - BASE_OFFSET;
    
    const pos = (i - 1) * 2;
    if (pos < length) {
      binaryData[pos] = (value >> 8) & 0xFF;
    }
    
    if (pos + 1 < length) {
      binaryData[pos + 1] = value & 0xFF;
    }
  }
  
  return binaryData;
}

/**
 * Handle HTML-specific compression with additional optimizations
 */
function compressHTML(html) {
  // Pre-process HTML to replace common patterns before general compression
  // For example, replace common tag patterns, attribute structures, etc.

  // Apply minification techniques first (remove whitespace, comments)
  const minified = html
    .replace(/<!--[\s\S]*?-->/g, '')         // Remove comments
    .replace(/\s+/g, ' ')                    // Collapse whitespace
    .replace(/>\s+</g, '><')                 // Remove whitespace between tags
    .replace(/\s+>/g, '>')                   // Remove whitespace before closing bracket
    .replace(/<\s+/g, '<');                  // Remove whitespace after opening bracket

  // Then apply the general compression
  return compressText(minified);
}

/**
 * Detect if a file is HTML based on extension and content
 */
function isHtmlFile(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.html', '.htm'].includes(ext)) {
    return true;
  }
  
  // Check for HTML tags in content
  return /<html|<!doctype html|<body|<div|<span|<p>/i.test(content);
}

/**
 * Process a single file (compress or decompress)
 */
async function processFile(filePath, mode) {
  try {
    console.log(`Processing ${filePath}...`);
    
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    
    let result;
    let outputPath;
    
    if (mode === 'compress') {
      // Compress based on file type
      if (isHtmlFile(filePath, content)) {
        result = compressHTML(content);
        console.log(`Detected HTML file, applying HTML-specific compression.`);
      } else {
        result = compressText(content);
      }
      
      // Add extension for compressed file
      outputPath = `${filePath}.uc`;
      
      // Calculate and show compression stats
      const originalSize = content.length;
      const compressedSize = result.length;
      const ratio = (originalSize / compressedSize).toFixed(2);
      
      console.log(`Original size: ${originalSize} characters`);
      console.log(`Compressed size: ${compressedSize} characters`);
      console.log(`Compression ratio: ${ratio}x`);
      
    } else if (mode === 'decompress') {
      // Decompress the file
      result = decompressText(content);
      
      // Remove .uc extension if present
      outputPath = filePath.endsWith('.uc') 
        ? filePath.slice(0, -3) 
        : `${filePath}.decompressed`;
    } else {
      throw new Error(`Unknown mode: ${mode}`);
    }
    
    // Write the result to a new file
    fs.writeFileSync(outputPath, result);
    console.log(`Output written to ${outputPath}`);
    
    return true;
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Main function to process command-line arguments
 */
async function main() {
  // Check for TextEncoder/TextDecoder polyfill for Node.js versions that need it
  if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = require('util').TextEncoder;
    global.TextDecoder = require('util').TextDecoder;
  }

  const args = process.argv.slice(2);
  
  // Show help if no arguments or --help
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Unicode File Compressor v${VERSION}
Usage:
  ./compress-unicode.js compress file1.txt file2.html ...
  ./compress-unicode.js decompress file1.uc file2.uc ...

Options:
  --help, -h     Show this help
  --version, -v  Show version
    `);
    process.exit(0);
  }
  
  // Show version if --version
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`Unicode File Compressor v${VERSION}`);
    process.exit(0);
  }
  
  const mode = args[0];
  
  if (!['compress', 'decompress'].includes(mode)) {
    console.error(`Unknown mode: ${mode}. Use 'compress' or 'decompress'.`);
    process.exit(1);
  }
  
  const files = args.slice(1);
  
  if (files.length === 0) {
    console.error(`No files specified. Use ./compress-unicode.js ${mode} file1 file2 ...`);
    process.exit(1);
  }
  
  // Process each file
  const results = [];
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`File not found: ${file}`);
      continue;
    }
    
    const result = await processFile(file, mode);
    results.push({ file, success: result });
  }
  
  // Summary
  console.log('\nSummary:');
  for (const { file, success } of results) {
    console.log(`${file}: ${success ? 'Success' : 'Failed'}`);
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\nProcessed ${successCount} of ${results.length} files successfully.`);
}

// Run the main function
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
