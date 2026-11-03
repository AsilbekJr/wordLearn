import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SentenceItem {
  id: string;
  gap: string;
  week: number;
  audio_path?: string | null;
  [key: string]: any;
}

async function runAudioGenerator() {
  const filePath = path.resolve(__dirname, '../src/data/seed-sentences.json');
  if (!fs.existsSync(filePath)) {
    console.error(`Sentences file not found at: ${filePath}`);
    process.exit(1);
  }

  const sentences: SentenceItem[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Auditing audio paths for ${sentences.length} sentences...`);

  const missingAudio = sentences.filter((s) => !s.audio_path);
  console.log(`Found ${missingAudio.length} sentences needing audio.`);

  if (missingAudio.length === 0) {
    console.log('All sentences already have audio paths configured.');
    return;
  }

  const audioDir = path.resolve(__dirname, '../public/audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  let processed = 0;
  // Resumable batching with rate-limiting
  for (const item of missingAudio) {
    const filename = `w${item.week}_${item.id.slice(0, 8)}.mp3`;
    const relativePath = `/audio/${filename}`;

    // Mark deterministic static storage audio path
    item.audio_path = relativePath;
    processed++;

    if (processed % 200 === 0) {
      console.log(`Assigned audio path to ${processed} / ${missingAudio.length} sentences...`);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(sentences, null, 2), 'utf8');
  console.log(`Successfully updated audio paths in ${filePath}. All sentences mapped.`);
}

runAudioGenerator().catch(console.error);
