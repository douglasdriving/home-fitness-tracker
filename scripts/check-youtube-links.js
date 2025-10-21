import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const exercisesPath = join(__dirname, '..', 'src', 'data', 'exercises.json');
const exercises = JSON.parse(readFileSync(exercisesPath, 'utf-8'));

async function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, { timeout: 10000 }, (response) => {
      // Follow redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        checkUrl(response.headers.location).then(resolve);
        return;
      }

      resolve({
        valid: response.statusCode === 200,
        status: response.statusCode,
      });
    });

    request.on('error', (error) => {
      resolve({
        valid: false,
        error: error.message,
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({
        valid: false,
        error: 'Request timeout',
      });
    });
  });
}

async function checkYouTubeLinks() {
  console.log('Checking YouTube links in exercises.json...\n');
  console.log('='.repeat(80));
  console.log('\n');

  const results = {
    total: 0,
    valid: 0,
    invalid: 0,
    errors: [],
  };

  for (const exercise of exercises) {
    if (!exercise.videoUrl) {
      console.log(`⚠️  ${exercise.name} (${exercise.id}): No video URL`);
      continue;
    }

    results.total++;

    console.log(`Checking: ${exercise.name}...`);

    const result = await checkUrl(exercise.videoUrl);

    if (result.valid) {
      results.valid++;
      console.log(`  ✓ Valid (Status: ${result.status})`);
    } else {
      results.invalid++;
      console.log(`  ✗ BROKEN (${result.error || 'Status: ' + result.status})`);
      results.errors.push({
        id: exercise.id,
        name: exercise.name,
        url: exercise.videoUrl,
        error: result.error || `HTTP ${result.status}`,
      });
    }

    console.log('');

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('='.repeat(80));
  console.log('\nSUMMARY:');
  console.log(`  Total exercises checked: ${results.total}`);
  console.log(`  ✓ Valid links: ${results.valid}`);
  console.log(`  ✗ Broken links: ${results.invalid}`);

  if (results.errors.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('\nBROKEN LINKS TO FIX:');
    console.log('='.repeat(80));
    console.log('\n');

    results.errors.forEach(({ id, name, url, error }) => {
      console.log(`Exercise: ${name}`);
      console.log(`  ID: ${id}`);
      console.log(`  Current URL: ${url}`);
      console.log(`  Error: ${error}`);
      console.log('');
    });

    console.log('These exercises need their video URLs updated in:');
    console.log('  src/data/exercises.json\n');
  } else {
    console.log('\n✓ All YouTube links are working!\n');
  }
}

checkYouTubeLinks();
