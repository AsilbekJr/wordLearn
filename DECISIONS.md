# Architecture & Engineering Decisions — Linguist AI

## 1. Lemmatizer Selection
- **Choice:** `compromise` (Pure TypeScript/JavaScript NLP).
- **Rationale:** We need client-side and edge-compatible tokenization, POS tagging, and lemmatization that runs without Python runtimes or heavy native binary compilation. `compromise` provides zero-dependency, ultra-fast English parsing, accurately identifying noun roots, verb infinitives, adjective/adverb classes, and detecting proper nouns/stopwords to accurately isolate vocabulary items for mastery calculation.

## 2. TTS (Text-to-Speech) Hierarchy
- **Choice:** Multi-tier `TTSProvider`:
  1. Pre-generated audio files in Supabase Storage (`sentences.audio_path`).
  2. Free edge synthesis batch script (`pnpm audio:generate`).
  3. Client-side fallback via standard `window.speechSynthesis` (Web Speech API) using localized English Natural voices at rate 0.95.
- **Rationale:** Sentences are static across the 15-week curriculum. Offline pre-generation prevents runtime latency and API bill spikes, while browser speech synthesis guarantees immediate playback even completely offline.

## 3. CSV / JSON Importer & Paired Sentence Splitting
- **Choice:** Deterministic UUID v5 hashing using a fixed namespace (`6ba7b811-9dad-11d1-80b4-00c04fd430c8`) combined with Unicode NFKC normalization and BOM (`\uFEFF`) handling for CSV files.
- **Rationale:** Rows containing `" / "` on both the English gap and Uzbek translation represent distinct contrastive pairs (e.g., Simple vs Continuous, or statement vs question). Splitting them into distinct sentences ensures each card has a single unambiguous target and review interval. Running the importer over JSON and CSV produces identical deterministic outputs and 0 duplicates across repeated executions.

## 4. Tag-to-Cloze Blanking Rules
- **Choice:** Multi-stage hierarchical grammar extractor in `src/lib/cloze.ts`:
  1. Semantic grammar rules based on `grammatika` tags: Conditionals (0/1/2/3-tur shart, wish, unless), Present/Past Perfect & Continuous (`have been`, `had + V3`, `was/were -ing`), Future (`going to`, `will`), Modals (`must`, `have to`, `should`, `can`), Passive Voice (`be + V3`), Comparatives/Superlatives, and Phrasal Verbs.
  2. Syntactic NLP fallback: If no explicit tag pattern matches, `compromise` POS tagging identifies the finite verb or auxiliary to blank out.
  3. Non-trivial guarantee: Every blank is guaranteed to have `length >= 2` and never generates empty brackets. Tested and verified across all 1515 sentences and 217 distinct grammar tags with 100% coverage.

## 5. Calm Editorial Notebook Design System
- **Choice:** Warm paper (`#F6F1E7`), ink (`#1B1A17`), accent vermilion (`#D9482B`), and secondary moss (`#4F6B4A`) with self-hosted `Instrument Serif` (for hero sentences) and `Inter Tight` (for UI typography).
- **Rationale:** Avoids generic gradient AI templates and distractions, delivering a calm, focused reading environment optimized for deep acquisition and spaced repetition.
