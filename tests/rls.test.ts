import { describe, it, expect } from 'vitest';

interface StorageRow {
  id: string;
  user_id?: string;
  owner?: string | null;
  [key: string]: any;
}

class MockSupabaseEnvironment {
  tables: Record<string, StorageRow[]> = {
    sentences: [],
    user_cards: [],
    review_logs: [],
    production_attempts: [],
    error_log: [],
    user_settings: []
  };

  createClient(currentUserId: string | null) {
    return {
      from: (tableName: string) => {
        return {
          select: async (filter?: (row: StorageRow) => boolean) => {
            const table = this.tables[tableName] || [];
            // Apply RLS policy simulation
            const rows = table.filter((row) => {
              if (tableName === 'sentences') {
                return row.owner === null || row.owner === undefined || row.owner === currentUserId;
              }
              if (tableName === 'vocab_items' || tableName === 'sentence_vocab') {
                return true;
              }
              // User-owned tables:
              return currentUserId !== null && row.user_id === currentUserId;
            });
            return { data: filter ? rows.filter(filter) : rows, error: null };
          },
          insert: async (row: StorageRow) => {
            if (tableName === 'sentences') {
              if (row.owner !== currentUserId) {
                return { data: null, error: new Error('RLS check violated for sentences insert') };
              }
            } else if (['user_cards', 'review_logs', 'production_attempts', 'error_log', 'user_settings'].includes(tableName)) {
              if (row.user_id !== currentUserId) {
                return { data: null, error: new Error('RLS check violated for user-owned table insert') };
              }
            }
            this.tables[tableName].push({ ...row });
            return { data: row, error: null };
          }
        };
      }
    };
  }
}

describe('Row Level Security (RLS) Isolation Verification', () => {
  const env = new MockSupabaseEnvironment();

  // Populate seed sentences (owner null)
  env.tables.sentences.push({
    id: 'seed-sentence-1',
    week: 1,
    gap: 'Hello world.',
    tarjima: 'Salom dunyo.',
    owner: null
  });

  const userAId = '11111111-1111-4111-a111-111111111111';
  const userBId = '22222222-2222-4222-b222-222222222222';

  const clientA = env.createClient(userAId);
  const clientB = env.createClient(userBId);

  it('allows both users to read seed sentences', async () => {
    const resA = await clientA.from('sentences').select();
    const resB = await clientB.from('sentences').select();

    expect(resA.data?.length).toBe(1);
    expect(resB.data?.length).toBe(1);
    expect(resA.data?.[0].id).toBe('seed-sentence-1');
  });

  it('prevents User B from seeing User A cards and review logs', async () => {
    // User A creates a card and a review log
    await clientA.from('user_cards').insert({
      id: 'card-a1',
      user_id: userAId,
      sentence_id: 'seed-sentence-1',
      mode: 'recall',
      stability: 10
    });

    await clientA.from('review_logs').insert({
      id: 'log-a1',
      user_id: userAId,
      card_id: 'card-a1',
      rating: 3
    });

    // User A reads their cards
    const userACards = await clientA.from('user_cards').select();
    expect(userACards.data?.length).toBe(1);

    // User B reads cards
    const userBCards = await clientB.from('user_cards').select();
    expect(userBCards.data?.length).toBe(0);

    // User B reads review logs
    const userBLogs = await clientB.from('review_logs').select();
    expect(userBLogs.data?.length).toBe(0);
  });

  it('blocks User B from inserting data with User A user_id', async () => {
    const maliciousInsert = await clientB.from('user_cards').insert({
      id: 'card-hack',
      user_id: userAId, // spoofing User A
      sentence_id: 'seed-sentence-1',
      mode: 'recall'
    });

    expect(maliciousInsert.error).not.toBeNull();
    expect(maliciousInsert.error?.message).toContain('RLS check violated');
  });
});
