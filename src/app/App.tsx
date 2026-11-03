import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './Layout';
import { TodayScreen } from '../features/today/TodayScreen';
import { StudyScreen } from '../features/study/StudyScreen';
import { LibraryScreen } from '../features/library/LibraryScreen';
import { SentenceDetailScreen } from '../features/sentences/SentenceDetailScreen';
import { ProductionLabScreen } from '../features/production/ProductionLabScreen';
import { GrammarScreen } from '../features/grammar/GrammarScreen';
import { ErrorLogScreen } from '../features/errors/ErrorLogScreen';
import { StatsScreen } from '../features/stats/StatsScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5 // 5 minutes
    }
  }
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<TodayScreen />} />
            <Route path="study" element={<StudyScreen />} />
            <Route path="library" element={<LibraryScreen />} />
            <Route path="sentences/:id" element={<SentenceDetailScreen />} />
            <Route path="lab" element={<ProductionLabScreen />} />
            <Route path="grammar" element={<GrammarScreen />} />
            <Route path="errors" element={<ErrorLogScreen />} />
            <Route path="stats" element={<StatsScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
