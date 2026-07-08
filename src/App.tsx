import { useState } from 'react';
import { Dumbbell, History, TrendingUp, Notebook, Settings, Waves } from 'lucide-react';
import { RMModeProvider } from './contexts/RMModeContext';
import { TodayScreen } from './screens/TodayScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { StatsScreen } from './screens/StatsScreen';
import { ManageScreen } from './screens/ManageScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { RowingScreen } from './screens/rowing/RowingScreen';
import { requestNav } from './utils/navGuard';

type TabId = 'lift' | 'rowing' | 'history' | 'stats' | 'manage' | 'settings';

export function isRowingEnabled(): boolean {
  return localStorage.getItem('lift-rowing-enabled') === '1';
}

export function App() {
  const [tab, setTab] = useState<TabId>('lift');
  const [rowingEnabled, setRowingEnabled] = useState(isRowingEnabled);

  const refreshRowing = () => setRowingEnabled(isRowingEnabled());

  const tabs: { id: TabId; icon: typeof Dumbbell; label: string }[] = [
    { id: 'lift', icon: Dumbbell, label: 'Lift' },
    ...(rowingEnabled ? [{ id: 'rowing' as TabId, icon: Waves, label: 'Row' }] : []),
    { id: 'history', icon: History, label: 'History' },
    { id: 'stats', icon: TrendingUp, label: 'Stats' },
    { id: 'manage', icon: Notebook, label: 'Manage' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <RMModeProvider>
    <div className="app">
      {tab === 'lift' && <TodayScreen onNavigateRowing={rowingEnabled ? () => setTab('rowing') : undefined} />}
      {tab === 'rowing' && rowingEnabled && <RowingScreen />}
      {tab === 'history' && <HistoryScreen />}
      {tab === 'stats' && <StatsScreen />}
      {tab === 'manage' && <ManageScreen />}
      {tab === 'settings' && <SettingsScreen onRowingToggle={refreshRowing} />}

      <nav className="tab-bar">
        <div className="tab-bar-inner">
          {tabs.map(t => (
            <a
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => {
                if (t.id === tab) return;
                requestNav(() => setTab(t.id));
              }}
            >
              <t.icon size={18} />
              {t.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
    </RMModeProvider>
  );
}
