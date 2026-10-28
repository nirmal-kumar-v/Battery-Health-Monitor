import React from 'react';
import { Radio, BarChart3, History, Settings } from 'lucide-react';

export function Navigation({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Radio },
    { id: 'analytics', label: 'Charts & Rates', icon: BarChart3 },
    { id: 'history', label: 'Readings', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-selected={isActive}
            role="tab"
          >
            <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
