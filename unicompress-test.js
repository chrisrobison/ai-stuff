/**
 * Binary-Based Unicode Compression
 * 
 * This approach converts text to a binary representation,
 * applies compression algorithms, then encodes the compressed
 * binary data using the full Unicode character set.
 */

// Constants
const BASE_OFFSET = 0x0100; // Start at Unicode 256 to avoid ASCII conflicts
const BITS_PER_CHAR = 16;   // Most Unicode characters use 16 bits

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

// Example usage
function demonstrateCompression() {
  const originalText = "This is a sample text that we want to compress. It demonstrates how we can efficiently encode information using the full range of Unicode characters. By converting to binary first and then applying compression algorithms before encoding to Unicode, we can achieve much better compression ratios than with simple substitution.";
  
  console.log("Original text:", originalText);
  console.log("Original length:", originalText.length, "characters");
  
  const compressed = compressText(originalText);
  console.log("Compressed:", compressed);
  console.log("Compressed length:", compressed.length, "characters");
  console.log("Compression ratio:", (originalText.length / compressed.length).toFixed(2));
  
  const decompressed = decompressText(compressed);
  console.log("Decompression successful:", decompressed === originalText);
  
  // HTML example
  const sampleHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sample Page</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #333; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Hello World</h1>
        <p>This is a sample HTML page that we want to compress.</p>
        <ul>
          <li>Item one</li>
          <li>Item two</li>
          <li>Item three</li>
        </ul>
      </div>
    </body>
    </html>
  `;
  
  console.log("Original HTML length:", sampleHTML.length, "characters");
  
  const compressedHTML = compressHTML(sampleHTML);
  console.log("Compressed HTML length:", compressedHTML.length, "characters");
  console.log("HTML Compression ratio:", (sampleHTML.length / compressedHTML.length).toFixed(2));
}

// Run demonstration
demonstrateCompression();
