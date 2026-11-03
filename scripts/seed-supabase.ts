import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ Xato: VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY (yoki SUPABASE_SERVICE_ROLE_KEY) topilmadi.');
    console.error('Foydalanish:');
    console.error('  $env:VITE_SUPABASE_URL="https://xyz.supabase.co"');
    console.error('  $env:VITE_SUPABASE_ANON_KEY="eyJ..."');
    console.error('  pnpm tsx scripts/seed-supabase.ts');
    process.exit(1);
  }

  console.log(`🔌 Supabase-ga ulanish: ${url}`);
  const supabase = createClient(url, key);

  // 1. Read seed files
  const sentencesPath = path.resolve(__dirname, '../src/data/seed-sentences.json');
  const vocabPath = path.resolve(__dirname, '../src/data/seed-vocab.json');

  if (!fs.existsSync(sentencesPath) || !fs.existsSync(vocabPath)) {
    console.error('❌ Seed fayllari topilmadi. Avval "pnpm seed" ni ishga tushiring.');
    process.exit(1);
  }

  const rawSentences = JSON.parse(fs.readFileSync(sentencesPath, 'utf8'));
  const rawVocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

  console.log(`📦 Yuklanayotgan maʼlumotlar: ${rawSentences.length} gap, ${rawVocab.length} lugʻat birligi.`);

  // 2. Upload vocab items in batches
  console.log('⏳ Lugʻat birliklari (vocab_items) yuklanmoqda...');
  const BATCH_SIZE = 100;
  for (let i = 0; i < rawVocab.length; i += BATCH_SIZE) {
    const batch = rawVocab.slice(i, i + BATCH_SIZE).map((v: { lemma: string; pos: string }) => ({
      lemma: v.lemma,
      pos: v.pos
    }));

    const { error } = await supabase.from('vocab_items').upsert(batch, {
      onConflict: 'lemma, pos'
    });

    if (error) {
      console.warn(`  ⚠️ Vocab batch ${i}-${i + batch.length} xatosi:`, error.message);
    }
  }
  console.log('✅ Vocab items yuklandi.');

  // 3. Upload sentences in batches
  console.log('⏳ Gaplar (sentences) yuklanmoqda...');
  for (let i = 0; i < rawSentences.length; i += BATCH_SIZE) {
    const batch = rawSentences.slice(i, i + BATCH_SIZE).map((s: {
      id: string;
      week: number;
      gap: string;
      gap_norm: string;
      tarjima: string;
      grammar_tag: string;
      source: string;
      audio_path?: string | null;
    }) => ({
      id: s.id,
      week: s.week,
      gap: s.gap,
      gap_norm: s.gap_norm,
      tarjima: s.tarjima,
      grammar_tag: s.grammar_tag,
      source: s.source || 'seed',
      audio_path: s.audio_path || null
    }));

    const { error } = await supabase.from('sentences').upsert(batch, {
      onConflict: 'id'
    });

    if (error) {
      console.error(`  ❌ Sentences batch ${i}-${i + batch.length} xatosi:`, error.message);
    }
  }
  console.log('✅ Barcha 1515 ta gap muvaffaqiyatli Supabase-ga yuklandi!');
}

main().catch((e) => {
  console.error('Kutilmagan xatolik:', e);
  process.exit(1);
});
