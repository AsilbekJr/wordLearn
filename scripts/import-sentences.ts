import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v5 as uuidv5 } from 'uuid';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { normalizeGap, normalizeUzbek } from '../src/lib/normalize.js';
import { extractVocabFromSentence } from '../src/lib/lemmatizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// UUID v5 Namespace for Linguist AI sentence hashing
const LINGUIST_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

// Schema for raw seed row
const RawSeedSentenceSchema = z.object({
  id: z.union([z.number(), z.string()]),
  hafta: z.union([z.number(), z.string()]).transform((val) => Number(val)),
  gap: z.string().min(1),
  tarjima: z.string().min(1),
  grammatika: z.string().min(1)
});

export interface ProcessedSentence {
  id: string; // uuid v5
  week: number;
  gap: string; // original text for display
  gap_norm: string; // normalized
  tarjima: string;
  grammar_tag: string;
  source: 'seed' | 'user';
  audio_path?: string | null;
  vocab_items: { lemma: string; pos: string }[];
}

export interface ImportSummary {
  totalRaw: number;
  imported: number;
  splitCount: number;
  skipped: number;
  uniqueVocabItems: number;
  perWeekCounts: Record<number, number>;
}

export function generateSentenceId(week: number, gapNorm: string): string {
  const seedString = `${week}|${gapNorm}`;
  return uuidv5(seedString, LINGUIST_NAMESPACE);
}

export function processSeedRow(raw: unknown): { items: ProcessedSentence[]; wasSplit: boolean } {
  const parsed = RawSeedSentenceSchema.parse(raw);
  const rawGap = parsed.gap.trim();
  const rawTarjima = parsed.tarjima.trim();
  const week = parsed.hafta;
  const grammarTag = parsed.grammatika.trim();

  // §3.3: Split paired rows if both gap and tarjima contain " / " with the same number of parts
  if (rawGap.includes(' / ') && rawTarjima.includes(' / ')) {
    const gapParts = rawGap.split(' / ').map((s) => s.trim()).filter(Boolean);
    const tarjimaParts = rawTarjima.split(' / ').map((s) => s.trim()).filter(Boolean);

    if (gapParts.length === tarjimaParts.length && gapParts.length > 1) {
      const items: ProcessedSentence[] = gapParts.map((partGap, index) => {
        const norm = normalizeGap(partGap);
        const normTarjima = normalizeUzbek(tarjimaParts[index]);
        const id = generateSentenceId(week, norm);
        const vocab = extractVocabFromSentence(norm);
        return {
          id,
          week,
          gap: partGap,
          gap_norm: norm,
          tarjima: normTarjima,
          grammar_tag: grammarTag,
          source: 'seed',
          vocab_items: vocab
        };
      });
      return { items, wasSplit: true };
    }
  }

  // Single row
  const norm = normalizeGap(rawGap);
  const normTarjima = normalizeUzbek(rawTarjima);
  const id = generateSentenceId(week, norm);
  const vocab = extractVocabFromSentence(norm);

  return {
    items: [
      {
        id,
        week,
        gap: rawGap,
        gap_norm: norm,
        tarjima: normTarjima,
        grammar_tag: grammarTag,
        source: 'seed',
        vocab_items: vocab
      }
    ],
    wasSplit: false
  };
}

export function importSentences(options: { format?: 'json' | 'csv'; filePath?: string } = {}): {
  sentences: ProcessedSentence[];
  vocabCatalog: Map<string, { id: string; lemma: string; pos: string; occurrences: number }>;
  summary: ImportSummary;
} {
  const format = options.format || 'json';
  const defaultPath =
    format === 'csv'
      ? path.resolve(__dirname, '../data/gaplar_1-15.csv')
      : path.resolve(__dirname, '../data/gaplar_1-15.json');

  const filePath = options.filePath || defaultPath;
  if (!fs.existsSync(filePath)) {
    throw new Error(`Seed file not found at: ${filePath}`);
  }

  let rawList: any[] = [];
  if (format === 'csv' || filePath.endsWith('.csv')) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    rawList = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
  } else {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    rawList = JSON.parse(fileContent);
  }

  const sentenceMap = new Map<string, ProcessedSentence>();
  const vocabMap = new Map<string, { id: string; lemma: string; pos: string; occurrences: number }>();
  const perWeekCounts: Record<number, number> = {};

  let totalRaw = 0;
  let splitCount = 0;
  let skipped = 0;

  for (const raw of rawList) {
    totalRaw++;
    try {
      const { items, wasSplit } = processSeedRow(raw);
      if (wasSplit) splitCount++;
      for (const item of items) {
        // Upsert by deterministic uuid
        sentenceMap.set(item.id, item);
        perWeekCounts[item.week] = (perWeekCounts[item.week] || 0) + 1;

        // Populate vocab catalog
        for (const v of item.vocab_items) {
          const key = `${v.lemma}:${v.pos}`;
          const existing = vocabMap.get(key);
          if (existing) {
            existing.occurrences++;
          } else {
            const vocabId = uuidv5(key, LINGUIST_NAMESPACE);
            vocabMap.set(key, { id: vocabId, lemma: v.lemma, pos: v.pos, occurrences: 1 });
          }
        }
      }
    } catch (err) {
      console.error(`Row ${totalRaw} failed validation:`, err);
      skipped++;
    }
  }

  const sentences = Array.from(sentenceMap.values());
  const summary: ImportSummary = {
    totalRaw,
    imported: sentences.length,
    splitCount,
    skipped,
    uniqueVocabItems: vocabMap.size,
    perWeekCounts
  };

  return { sentences, vocabCatalog: vocabMap, summary };
}

// CLI Execution
if (process.argv[1]?.includes('import-sentences')) {
  const isCsv = process.argv.includes('--format') && process.argv[process.argv.indexOf('--format') + 1] === 'csv';
  console.log(`Starting Linguist AI sentence import (${isCsv ? 'CSV' : 'JSON'})...`);

  const { sentences, vocabCatalog, summary } = importSentences({ format: isCsv ? 'csv' : 'json' });

  // Save deterministic seed data bundle for runtime web app
  const outDir = path.resolve(__dirname, '../src/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outDir, 'seed-sentences.json'),
    JSON.stringify(sentences, null, 2),
    'utf8'
  );

  const vocabList = Array.from(vocabCatalog.values());
  fs.writeFileSync(
    path.join(outDir, 'seed-vocab.json'),
    JSON.stringify(vocabList, null, 2),
    'utf8'
  );

  console.log('\n========================================');
  console.log('       LINGUIST AI IMPORTER SUMMARY     ');
  console.log('========================================');
  console.log(`Total raw seed rows:      ${summary.totalRaw}`);
  console.log(`Paired rows split:        ${summary.splitCount}`);
  console.log(`Total imported sentences: ${summary.imported}`);
  console.log(`Unique vocabulary items:  ${summary.uniqueVocabItems}`);
  console.log(`Skipped rows:             ${summary.skipped}`);
  console.log('----------------------------------------');
  console.log('Per-week sentence distribution:');
  Object.keys(summary.perWeekCounts)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((week) => {
      console.log(`  Week ${week.padStart(2, ' ')}: ${summary.perWeekCounts[Number(week)]} sentences`);
    });
  console.log('========================================\n');
  console.log(`Saved artifacts to src/data/seed-sentences.json and seed-vocab.json.`);
}
