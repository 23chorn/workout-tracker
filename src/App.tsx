import { useState } from 'react';
import { Dumbbell, Clock, BarChart3, Settings, Waves } from 'lucide-react';
import { TodayScreen } from './screens/TodayScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { StatsScreen } from './screens/StatsScreen';
import { ManageScreen } from './screens/ManageScreen';
import { RowingScreen } from './screens/rowing/RowingScreen';

type TabId = 'today' | 'history' | 'rowing' | 'stats' | 'manage';

export function isRowingEnabled(): boolean {
  return localStorage.getItem('lift-rowing-enabled') === '1';
}

export function App() {
  const [tab, setTab] = useState<TabId>('today');
  const [rowingEnabled, setRowingEnabled] = useState(isRowingEnabled);

  // Listen for changes from Manage screen
  const refreshRowing = () => setRowingEnabled(isRowingEnabled());

  const tabs: { id: TabId; icon: typeof Dumbbell; label: string }[] = [
    { id: 'today', icon: Dumbbell, label: 'Today' },
    { id: 'history', icon: Clock, label: 'History' },
    ...(rowingEnabled ? [{ id: 'rowing' as TabId, icon: Waves, label: 'Rowing' }] : []),
    { id: 'stats', icon: BarChart3, label: 'Stats' },
    { id: 'manage', icon: Settings, label: 'Manage' },
  ];

  return (
    <div className="app">
      {tab === 'today' && <TodayScreen />}
      {tab === 'history' && <HistoryScreen />}
      {tab === 'rowing' && rowingEnabled && <RowingScreen />}
      {tab === 'stats' && <StatsScreen />}
      {tab === 'manage' && <ManageScreen onRowingToggle={refreshRowing} />}

      <nav className="tab-bar">
        <div className="tab-bar-inner">
          {tabs.map(t => (
            <a
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={20} />
              {t.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
