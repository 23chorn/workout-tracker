import { useState } from 'react';
import { Dumbbell, Clock, BarChart3, Layers, Settings, Waves } from 'lucide-react';
import { TodayScreen } from './screens/TodayScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { StatsScreen } from './screens/StatsScreen';
import { ManageScreen } from './screens/ManageScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { RowingScreen } from './screens/rowing/RowingScreen';

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
    { id: 'history', icon: Clock, label: 'History' },
    { id: 'stats', icon: BarChart3, label: 'Stats' },
    { id: 'manage', icon: Layers, label: 'Manage' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="app">
      {tab === 'lift' && <TodayScreen />}
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
              onClick={() => setTab(t.id)}
            >
              <t.icon size={18} />
              {t.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
