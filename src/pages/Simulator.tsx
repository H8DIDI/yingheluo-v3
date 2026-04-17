import { useState } from 'react';
import { MainWorkbench } from '../components/layout/MainWorkbench';
import { FireworkManagerPage } from '../components/manager/FireworkManagerPage';
import { AdminPage } from '../components/admin/AdminPage';
import { AIAssistantPage } from '../components/assistant/AIAssistantPage';

export default function Simulator() {
  const [page, setPage] = useState<'workbench' | 'manager' | 'admin' | 'assistant'>('workbench');

  if (page === 'manager') {
    return <FireworkManagerPage onBack={() => setPage('workbench')} />;
  }

  if (page === 'admin') {
    return <AdminPage onBack={() => setPage('workbench')} />;
  }

  if (page === 'assistant') {
    return <AIAssistantPage onBack={() => setPage('workbench')} />;
  }

  return (
    <MainWorkbench
      onOpenManager={() => setPage('manager')}
      onOpenAdmin={() => setPage('admin')}
      onOpenAssistant={() => setPage('assistant')}
    />
  );
}
