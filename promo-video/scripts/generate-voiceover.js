#!/usr/bin/env node

/**
 * ElevenLabs Voiceover Generator for Data Cube AI Promo
 * Uses direct voice ID to bypass voices_read permission requirement.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  });
}

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY not found in .env.local');
  process.exit(1);
}

// George: warm, captivating British male — perfect for product narration
const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const MODEL_ID = 'eleven_multilingual_v2';

// Character presets (stability, similarity_boost, style)
const PRESETS = {
  literal:        { stability: 0.50, similarity_boost: 0.75, style: 0.00 },
  narrator:       { stability: 0.55, similarity_boost: 0.78, style: 0.15 },
  dramatic:       { stability: 0.40, similarity_boost: 0.80, style: 0.35 },
  expert:         { stability: 0.60, similarity_boost: 0.80, style: 0.10 },
  conversational: { stability: 0.35, similarity_boost: 0.70, style: 0.20 },
  calm:           { stability: 0.65, similarity_boost: 0.75, style: 0.05 },
};

function makeRequest(text, previousRequestIds = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: PRESETS[currentCharacter] || PRESETS.narrator,
      ...(previousRequestIds.length > 0 && { previous_request_ids: previousRequestIds }),
    });

    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${VOICE_ID}`,
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', d => errorData += d);
        res.on('end', () => {
          reject(new Error(`API error ${res.statusCode}: ${errorData}`));
        });
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const requestId = res.headers['request-id'] || '';
        resolve({ audio: Buffer.concat(chunks), requestId });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

let currentCharacter = 'narrator';

async function main() {
  const scenesPath = path.join(__dirname, '..', 'remotion', 'promo-scenes.json');
  const outputDir = path.join(__dirname, '..', 'public', 'audio', 'promo');

  if (!fs.existsSync(scenesPath)) {
    console.error(`Scenes file not found: ${scenesPath}`);
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const scenesData = JSON.parse(fs.readFileSync(scenesPath, 'utf-8'));
  const scenes = scenesData.scenes;

  console.log(`\nGenerating voiceover for "${scenesData.name}"`);
  console.log(`Voice: George (${VOICE_ID})`);
  console.log(`Model: ${MODEL_ID}`);
  console.log(`Scenes: ${scenes.length}\n`);

  const previousRequestIds = [];
  const infoScenes = [];
  let totalChars = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    currentCharacter = scene.character || scenesData.character || 'narrator';

    console.log(`[${i + 1}/${scenes.length}] ${scene.id} (${currentCharacter})`);
    console.log(`  "${scene.text.substring(0, 60)}${scene.text.length > 60 ? '...' : ''}"`);

    try {
      const { audio, requestId } = await makeRequest(
        scene.text,
        previousRequestIds.slice(-3) // Request stitching: last 3 IDs for prosody consistency
      );

      const filename = `${scenesData.name}-${scene.id}.mp3`;
      const outputPath = path.join(outputDir, filename);
      fs.writeFileSync(outputPath, audio);

      if (requestId) previousRequestIds.push(requestId);
      totalChars += scene.text.length;

      // Get audio duration via ffprobe if available
      let actualDuration = null;
      try {
        const result = require('child_process').execSync(
          `ffprobe -v error -show_entries format=duration -of csv=p=0 "${outputPath}"`,
          { encoding: 'utf-8' }
        ).trim();
        actualDuration = parseFloat(result);
      } catch {}

      const durationStr = actualDuration ? `${actualDuration.toFixed(2)}s` : 'unknown';
      console.log(`  -> ${filename} (${(audio.length / 1024).toFixed(1)}KB, ${durationStr})\n`);

      infoScenes.push({
        id: scene.id,
        text: scene.text,
        character: currentCharacter,
        expectedDuration: scene.duration,
        actualDuration,
        file: filename,
      });

      // Small delay between requests to be respectful to API
      if (i < scenes.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}\n`);
      infoScenes.push({
        id: scene.id,
        error: err.message,
      });
    }
  }

  // Write info.json with metadata
  const infoPath = path.join(outputDir, `${scenesData.name}-info.json`);
  fs.writeFileSync(infoPath, JSON.stringify({
    name: scenesData.name,
    voice: 'George',
    voiceId: VOICE_ID,
    model: MODEL_ID,
    totalCharacters: totalChars,
    generatedAt: new Date().toISOString(),
    scenes: infoScenes,
  }, null, 2));

  console.log('='.repeat(50));
  console.log(`Done! ${scenes.length} scenes generated.`);
  console.log(`Total characters: ${totalChars}`);
  console.log(`Output: ${outputDir}/`);
  console.log(`Info: ${infoPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
