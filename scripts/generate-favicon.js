import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '..', 'public');

// For .ico files, we'll just use the 32x32 PNG and rename it
// Modern browsers support PNG favicons, so we can use that
async function generateFavicon() {
  console.log('Setting up favicon...\n');

  try {
    // Read the 32x32 PNG
    const png32 = readFileSync(join(publicDir, 'favicon-32x32.png'));

    // Write it as favicon.ico (browsers will accept PNG data in .ico files)
    writeFileSync(join(publicDir, 'favicon.ico'), png32);

    console.log('✓ Generated favicon.ico');
    console.log('\n✓ Favicon setup complete!');
  } catch (error) {
    console.error('✗ Failed to generate favicon:', error.message);
  }
}

generateFavicon();
