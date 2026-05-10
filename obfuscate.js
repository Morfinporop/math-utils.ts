/*
 * ╔══════════════════════════════════════════╗
 * ║ LLB :: JAVASCRIPT OBFUSCATOR             ║
 * ║ High-Entropy Flow Transformation         ║
 * ╚══════════════════════════════════════════╝
 */

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const targetFile = 'server.js';
const outputFile = 'server_secure.js';

if (!fs.existsSync(targetFile)) {
    process.exit(1);
}

const code = fs.readFileSync(targetFile, 'utf8');

const result = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    numbersToExpressions: true,
    simplify: true,
    stringArrayShuffle: true,
    splitStrings: true,
    stringArrayThreshold: 1,
    transformObjectKeys: true,
    unicodeEscapeSequence: true,
    // Add some random noise
    identifierNamesGenerator: 'hexadecimal'
});

fs.writeFileSync(outputFile, result.getObfuscatedCode());
console.log(`\n[LLB] SYSTEM: ${targetFile} -> ${outputFile} (OBFUSCATED)\n`);
