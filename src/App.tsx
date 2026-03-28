import { useState } from 'react';
import { Dumbbell, Clock, BarChart3, Settings } from 'lucide-react';
import { TodayScreen } from './screens/TodayScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { StatsScreen } from './screens/StatsScreen';
import { ManageScreen } from './screens/ManageScreen';

type TabId = 'today' | 'history' | 'stats' | 'manage';

export function App() {
  const [tab, setTab] = useState<TabId>('today');

  return (
    <div className="app">
      {tab === 'today' && <TodayScreen />}
      {tab === 'history' && <HistoryScreen />}
      {tab === 'stats' && <StatsScreen />}
      {tab === 'manage' && <ManageScreen />}

      <nav className="tab-bar">
        <div className="tab-bar-inner">
          {([
            { id: 'today' as TabId, icon: Dumbbell, label: 'Today' },
            { id: 'history' as TabId, icon: Clock, label: 'History' },
            { id: 'stats' as TabId, icon: BarChart3, label: 'Stats' },
            { id: 'manage' as TabId, icon: Settings, label: 'Manage' },
          ]).map(t => (
            <a
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={22} />
              {t.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
