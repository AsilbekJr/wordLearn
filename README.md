# Linguist AI — Spaced-Repetition English Engine for Uzbek Speakers

**Linguist AI** is a serious, editorial-notebook-styled English learning web application designed specifically for Uzbek speakers transitioning from A2 to IELTS 7.0+. It is built around four fundamental learning outcomes:
1. **Comprehend** the structure and vocabulary deeply in context.
2. **Retain** knowledge using the Free Spaced Repetition Scheduler (`ts-fsrs`).
3. **Produce spontaneously** in writing and speech with AI-guided corrections in Uzbek.
4. **Reason logically** about English word formation, morphology, affixes, and confusable grammar patterns.

---

## 🚀 Applied Agent Skills & Best Practices

This project incorporates three specialized engineering skills:
- **`frontend-design`**: Calm editorial notebook aesthetic (`#F6F1E7` warm paper, `#1B1A17` ink, `#D9482B` vermilion, `#4F6B4A` moss). Self-hosted typography (`Instrument Serif` for hero sentences, `Inter Tight` for UI, `JetBrains Mono` for tags). Avoids generic AI tells (no purple gradients, no emoji clutter).
- **`vercel-react-best-practices`**: React 19 performance guidelines: eliminated waterfalls, derived states computed in render, memoized derivations, isolated keyboard events, responsive layouts, and zero unnecessary re-renders.
- **`supabase-postgres-best-practices`**: Schema design with UUID v5 deterministic primary keys, `(select auth.uid())` subquery-wrapped Row-Level Security (RLS) policies for single-evaluation performance, atomic RPC review transactions (`submit_card_review`), and partial indexes.

---

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript (strict), Vite, React Router
- **Styling:** Tailwind CSS v4 (CSS-first `@theme` configuration)
- **Scheduling Algorithm:** `ts-fsrs` (Free Spaced Repetition Scheduler) with 04:00 `Asia/Tashkent` rollover
- **State Management:** TanStack React Query (server/catalog state) + Zustand (in-session study state)
- **NLP & Lemmatization:** `compromise` (zero-dependency English tokenization, POS tagging, and root extraction)
- **Validation:** Zod for all importers, payloads, and AI outputs
- **Backend & Database:** Supabase Postgres, Auth, Row-Level Security, and Edge Functions
- **Testing:** Vitest (unit & integration tests)

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Seed Sentences & Vocabulary
Imports the 15-week curriculum (1500 seed rows, 16 paired splits, 1515 sentences, 1342 lemmas):
```bash
pnpm seed
# Or test CSV fallback:
pnpm seed:csv
```

### 3. Generate Audio Mapping
Audits and provisions deterministic audio storage paths:
```bash
pnpm audio:generate
```

### 4. Run Development Server
```bash
pnpm dev
```
Open `http://localhost:5173` in your browser.

### 5. Run Test Suite
Runs all 29 tests across 6 test suites (RLS isolation, FSRS scheduling, answer checker, tag-driven cloze coverage, AI schemas, E2E session loop):
```bash
pnpm test
```

### 6. Production Build & Typecheck
```bash
pnpm lint
pnpm build
```

---

## 📦 Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM Provider for Edge Functions (default: Gemini)
GEMINI_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-1.5-flash
```
*Note: The application includes full offline and local storage support; if Supabase credentials are not provided, it operates seamlessly out-of-the-box using the local catalog.*

---

## 📚 7 Card Modes

| Mode | Description | Verification Method |
|---|---|---|
| `recognition` | English sentence hero display → recall Uzbek translation | Self-grade (1–4) |
| `recall` | Uzbek translation prompt → type English sentence | Contraction & typo-tolerant Levenshtein diff |
| `cloze` | Grammar-critical word hidden based on tag | Cloze generator with alternative acceptance |
| `dictation` | Audio-only prompt → type English sentence | Answer checker against target |
| `speaking` | Uzbek prompt → speak English sentence | Web Speech API STT transcript evaluation |
| `transform` | Grammar variation drill (subject/polarity/tense) | Expected answer matcher |
| `production` | Free sentence creation with target structures | Zod-validated AI feedback in Uzbek |

---

## 🏆 5-Level Mastery Funnel

1. **Tanish:** `recognition` reviewed ≥ 1 time.
2. **Eslash:** `recall` stability ≥ 7 days.
3. **Eshitish:** `dictation` stability ≥ 7 days.
4. **Ishlatish:** ≥ 3 `production_attempts` passed in distinct contexts.
5. **Erkin (Mastered):** Levels 1–4 completed, `recall` interval ≥ 21 days, and spontaneous use within the last 30 days.
