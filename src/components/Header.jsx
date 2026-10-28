import React from 'react';
import {
  Activity,
  Usb,
  Play,
  Square,
  Download,
  WifiOff,
  Radio,
  Sliders,
  BarChart3,
  History,
  Settings,
} from 'lucide-react';
import { DATA_SOURCES } from '../constants/defaults';

export function Header({
  activeTab,
  setActiveTab,
  connectionState, // 'hardware' | 'demo' | 'disconnected'
  isOffline,
  canInstallPwa,
  onInstallPwa,
  onConnectUsb,
  onDisconnectUsb,
  onOpenManualModal,
  isSerialSupported,
  shareState,
}) {
  const isHosting = shareState?.mode === 'host';
  const isViewing = shareState?.mode === 'viewer';
  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Left: Brand Identity */}
        <div className="brand-section">
          <div className="brand-icon-wrapper" aria-hidden="true">
            <Activity size={20} strokeWidth={2.2} />
          </div>
          <div className="brand-title-group">
            <h1 className="brand-title">Battery Health Monitor</h1>
            <span className="brand-subtitle">Telemetry & Condition Engine</span>
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Radio size={16} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={16} />
            <span>Charts & Rates</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            <span>Readings</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </nav>

        {/* Right: Status Pill & PWA / Quick Connect Action */}
        <div className="header-actions">
          {/* Offline indicator */}
          {isOffline && (
            <div
              className="status-pill disconnected"
              title="Browser is offline. Local cached data is active."
            >
              <WifiOff size={13} />
              <span>Offline</span>
            </div>
          )}

          {/* Connection Mode Pill */}
          {isHosting ? (
            <div className="status-pill connected" title={`Broadcasting telemetry room ${shareState.code}`}>
              <span className="status-dot" />
              <span>Sharing: {shareState.code}</span>
            </div>
          ) : isViewing ? (
            <div className={`status-pill ${shareState.isHostOnline ? 'connected' : 'disconnected'}`} title={`Connected to room ${shareState.code}`}>
              <span className="status-dot" />
              <span>{shareState.isHostOnline ? `Sync: ${shareState.code}` : `Offline: ${shareState.code}`}</span>
            </div>
          ) : connectionState === DATA_SOURCES.HARDWARE ? (
            <div className="status-pill connected" title="Connected to hardware via USB Web Serial">
              <span className="status-dot" />
              <span>Live USB</span>
            </div>
          ) : connectionState === DATA_SOURCES.DEMO ? (
            <div className="status-pill demo" title="Running simulated demo battery discharge data">
              <span className="status-dot" />
              <span>Demo Mode</span>
            </div>
          ) : (
            <div className="status-pill disconnected" title="No live hardware or simulation running">
              <span className="status-dot" />
              <span>Awaiting Data</span>
            </div>
          )}

          {/* PWA Install Button if available */}
          {canInstallPwa && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onInstallPwa}
              title="Install Battery Health Monitor as an app"
              aria-label="Install App"
            >
              <Download size={14} />
              <span>Install</span>
            </button>
          )}

          {/* Manual Input / Test Trigger button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenManualModal}
            title="Inject manual reading or configure simulation"
          >
            <Sliders size={14} />
            <span>Demo Tools</span>
          </button>
        </div>
      </div>
    </header>
  );
}
