import { Home, Plus, ListMusic, Settings } from "lucide-react";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'add', label: 'Add', icon: Plus },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nav-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            <Icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};