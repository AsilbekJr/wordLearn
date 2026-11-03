-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. CONTENT TABLES
create table if not exists sentences (
  id uuid primary key,              -- deterministic: uuid v5 of (hafta + '|' + normalized gap)
  week int not null,
  gap text not null,                -- original text, keep typographic apostrophes for display
  gap_norm text not null,           -- normalized for matching (see §3)
  tarjima text not null,
  grammar_tag text not null,
  source text default 'seed',       -- 'seed' | 'user'
  owner uuid references auth.users on delete cascade, -- null for seed, set for user-created
  audio_path text,                  -- Storage path of pre-generated TTS, nullable
  created_at timestamptz default now()
);

create index if not exists idx_sentences_week on sentences (week);
create index if not exists idx_sentences_grammar_tag on sentences (grammar_tag);
create index if not exists idx_sentences_source_owner on sentences (source, owner);

create table if not exists vocab_items (          -- lemma-level words extracted from sentences
  id uuid primary key default gen_random_uuid(),
  lemma text not null,
  pos text,
  deep_card jsonb,                  -- cached AI "deep card" (see §6), nullable
  unique (lemma, pos)
);

create index if not exists idx_vocab_lemma on vocab_items (lemma);

create table if not exists sentence_vocab (
  sentence_id uuid references sentences on delete cascade,
  vocab_id uuid references vocab_items on delete cascade,
  primary key (sentence_id, vocab_id)
);

-- 3. LEARNING STATE
do $$ begin
  create type card_mode as enum
    ('recognition','recall','cloze','dictation','speaking','transform','production');
exception
  when duplicate_object then null;
end $$;

create table if not exists user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  sentence_id uuid not null references sentences on delete cascade,
  mode card_mode not null,
  state smallint not null default 0,          -- FSRS State: 0 New, 1 Learning, 2 Review, 3 Relearning
  due timestamptz not null default now(),
  stability real,
  difficulty real,
  elapsed_days int default 0,
  scheduled_days int default 0,
  reps int default 0,
  lapses int default 0,
  last_review timestamptz,
  suspended boolean default false,
  leech boolean default false,
  unique (user_id, sentence_id, mode)
);

create index if not exists idx_user_cards_due on user_cards (user_id, due) where not suspended;
create index if not exists idx_user_cards_user_sentence on user_cards (user_id, sentence_id);

create table if not exists review_logs (          -- append-only; keep EVERYTHING for later FSRS parameter optimization
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  card_id uuid not null references user_cards on delete cascade,
  rating smallint not null,         -- 1 Again, 2 Hard, 3 Good, 4 Easy
  state smallint,
  due timestamptz,
  stability real,
  difficulty real,
  elapsed_days int,
  scheduled_days int,
  reviewed_at timestamptz default now(),
  duration_ms int,
  answer_text text,
  auto_score real,
  mode card_mode
);

create index if not exists idx_review_logs_user on review_logs (user_id, reviewed_at desc);

create table if not exists production_attempts ( -- free sentences the learner wrote or said
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  sentence_id uuid references sentences on delete set null,
  vocab_id uuid references vocab_items on delete set null,
  channel text check (channel in ('typed','spoken')),
  learner_text text not null,
  ai_verdict jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_production_attempts_user on production_attempts (user_id, created_at desc);

create table if not exists error_log (           -- feeds the "Xatolar daftari"
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  sentence_id uuid references sentences on delete set null,
  grammar_tag text,
  wrong text,
  correct text,
  error_type text,
  created_at timestamptz default now()
);

create index if not exists idx_error_log_user_tag on error_log (user_id, grammar_tag);

create table if not exists user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  desired_retention real default 0.90,
  new_per_day int default 15,
  max_reviews_per_day int default 150,
  day_rollover_hour int default 4,
  timezone text default 'Asia/Tashkent',
  tts_voice text,
  theme text default 'system'
);

-- 4. ROW LEVEL SECURITY (RLS)
alter table sentences enable row level security;
alter table vocab_items enable row level security;
alter table sentence_vocab enable row level security;
alter table user_cards enable row level security;
alter table review_logs enable row level security;
alter table production_attempts enable row level security;
alter table error_log enable row level security;
alter table user_settings enable row level security;

-- Policies for sentences:
-- Seed sentences (owner is null) or user's own sentences are readable
create policy "sentences_select_policy" on sentences
  for select using (owner is null or owner = (select auth.uid()));

create policy "sentences_insert_policy" on sentences
  for insert with check (owner = (select auth.uid()));

create policy "sentences_update_policy" on sentences
  for update using (owner = (select auth.uid()));

-- Vocab & Sentence-Vocab are public / shared read
create policy "vocab_items_select" on vocab_items
  for select using (true);

create policy "sentence_vocab_select" on sentence_vocab
  for select using (true);

-- User-scoped tables:
create policy "user_cards_all" on user_cards
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "review_logs_all" on review_logs
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "production_attempts_all" on production_attempts
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "error_log_all" on error_log
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "user_settings_all" on user_settings
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 5. VIEWS

-- v_mastery computes 5-level mastery per sentence per user:
-- Level 1 (Tanish): recognition reviewed >= 1 time
-- Level 2 (Eslash): recall stability >= 7 days
-- Level 3 (Eshitish): dictation stability >= 7 days
-- Level 4 (Ishlatish): >= 3 production attempts judged passed in >= 3 different contexts
-- Level 5 (Erkin): levels 1-4 done, recall interval (scheduled_days) >= 21 days, AND >=1 spontaneous pass in last 30 days
create or replace view v_mastery as
select
  s.id as sentence_id,
  uc_recog.user_id,
  case
    when coalesce(uc_recog.reps, 0) = 0 then 0
    when coalesce(uc_recog.reps, 0) >= 1 and coalesce(uc_recall.stability, 0) < 7 then 1
    when coalesce(uc_recall.stability, 0) >= 7 and coalesce(uc_dict.stability, 0) < 7 then 2
    when coalesce(uc_dict.stability, 0) >= 7 and coalesce(prod.correct_attempts, 0) < 3 then 3
    when coalesce(prod.correct_attempts, 0) >= 3 and (
      coalesce(uc_recall.scheduled_days, 0) < 21 or coalesce(recent_prod.recent_correct, 0) = 0
    ) then 4
    when coalesce(prod.correct_attempts, 0) >= 3
      and coalesce(uc_recall.scheduled_days, 0) >= 21
      and coalesce(recent_prod.recent_correct, 0) >= 1
    then 5
    else 1
  end as mastery_level
from sentences s
left join user_cards uc_recog on s.id = uc_recog.sentence_id and uc_recog.mode = 'recognition'
left join user_cards uc_recall on s.id = uc_recall.sentence_id and uc_recall.mode = 'recall' and uc_recall.user_id = uc_recog.user_id
left join user_cards uc_dict on s.id = uc_dict.sentence_id and uc_dict.mode = 'dictation' and uc_dict.user_id = uc_recog.user_id
left join (
  select user_id, sentence_id, count(*) as correct_attempts
  from production_attempts
  where (ai_verdict->>'passed')::boolean = true
  group by user_id, sentence_id
) prod on prod.sentence_id = s.id and prod.user_id = uc_recog.user_id
left join (
  select user_id, sentence_id, count(*) as recent_correct
  from production_attempts
  where (ai_verdict->>'passed')::boolean = true
    and created_at >= (now() - interval '30 days')
  group by user_id, sentence_id
) recent_prod on recent_prod.sentence_id = s.id and recent_prod.user_id = uc_recog.user_id;

-- 6. RPC: Atomic review submission with log
create or replace function submit_card_review(
  p_card_id uuid,
  p_rating smallint,
  p_state smallint,
  p_due timestamptz,
  p_stability real,
  p_difficulty real,
  p_elapsed_days int,
  p_scheduled_days int,
  p_duration_ms int,
  p_answer_text text,
  p_auto_score real
) returns jsonb as $$
declare
  v_user_id uuid;
  v_mode card_mode;
  v_reps int;
  v_lapses int;
  v_is_leech boolean;
begin
  select user_id, mode, reps, lapses into v_user_id, v_mode, v_reps, v_lapses
  from user_cards where id = p_card_id;

  if v_user_id is null or v_user_id <> auth.uid() then
    raise exception 'Not authorized or card not found';
  end if;

  v_reps := v_reps + 1;
  if p_rating = 1 then
    v_lapses := v_lapses + 1;
  end if;
  v_is_leech := (v_lapses >= 8);

  update user_cards set
    state = p_state,
    due = p_due,
    stability = p_stability,
    difficulty = p_difficulty,
    elapsed_days = p_elapsed_days,
    scheduled_days = p_scheduled_days,
    reps = v_reps,
    lapses = v_lapses,
    last_review = now(),
    leech = v_is_leech,
    suspended = case when v_is_leech then true else suspended end
  where id = p_card_id;

  insert into review_logs (
    user_id, card_id, rating, state, due, stability, difficulty,
    elapsed_days, scheduled_days, duration_ms, answer_text, auto_score, mode
  ) values (
    v_user_id, p_card_id, p_rating, p_state, p_due, p_stability, p_difficulty,
    p_elapsed_days, p_scheduled_days, p_duration_ms, p_answer_text, p_auto_score, v_mode
  );

  return jsonb_build_object(
    'card_id', p_card_id,
    'reps', v_reps,
    'lapses', v_lapses,
    'leech', v_is_leech
  );
end;
$$ language plpgsql security invoker;
