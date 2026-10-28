import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardTab } from './components/DashboardTab';
import { ChartsTab } from './components/ChartsTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { ManualDemoModal } from './components/ManualDemoModal';

import { serialService } from './services/serialService';
import { simulatorService } from './services/simulatorService';
import { storageService } from './services/storageService';
import { emailService } from './services/emailService';
import { evaluateOperatingCondition } from './services/conditionService';
import {
  calculateLoadMetrics,
  calculateNominalEnergy,
  calculateRatesOfChange,
} from './services/calculations';
import { DATA_SOURCES, DEFAULT_SETTINGS } from './constants/defaults';
import { shareService } from './services/shareService';

import './App.css';

export function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Persistence State
  const [settings, setSettings] = useState(() => storageService.loadSettings());
  const [readings, setReadings] = useState(() => storageService.loadReadings());

  // Connection & Telemetry State
  const [connectionState, setConnectionState] = useState(DATA_SOURCES.DISCONNECTED || 'disconnected');
  const [isSimulating, setIsSimulating] = useState(false);
  const [serialError, setSerialError] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Sharing State
  const [shareState, setShareState] = useState({
    mode: 'idle', // 'idle' | 'host' | 'viewer'
    code: null,
    status: 'disconnected',
    isHostOnline: false,
    isNewRoom: false,
  });

  // Network & PWA State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);

  const isSerialSupported = useMemo(() => serialService.isSupported(), []);

  // Most recent reading
  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;

  // Evaluate Operating Condition
  const evaluation = useMemo(() => {
    return evaluateOperatingCondition(latestReading, settings);
  }, [latestReading, settings]);

  // Electrical Load Calculations (I = V / R, P = V * I)
  const loadMetrics = useMemo(() => {
    if (!latestReading) return { currentA: null, powerW: null, isActive: false };
    return calculateLoadMetrics(latestReading.voltage, settings.externalLoadOhms);
  }, [latestReading, settings.externalLoadOhms]);

  // Nominal Energy Calculation (V_nom * Capacity_Ah)
  const nominalEnergyWh = useMemo(() => {
    return calculateNominalEnergy(settings.nominalVoltage, settings.ratedCapacityAh);
  }, [settings.nominalVoltage, settings.ratedCapacityAh]);

  // Rate of Change Telemetry (dV/dt, dT/dt)
  const ratesOfChange = useMemo(() => {
    return calculateRatesOfChange(readings, 6);
  }, [readings]);

  // Ingest reading callback
  const handleNewReading = useCallback(
    (reading) => {
      setReadings((prev) => {
        const next = [...prev, reading].slice(-150); // retain last 150 readings in memory
        storageService.saveReadings(next);
        return next;
      });

      // If we are actively hosting a share room and this is a hardware reading, broadcast it to cloud
      if (shareService.mode === 'host' && reading.source === DATA_SOURCES.HARDWARE) {
        shareService.publishReading(reading);
      }

      // Check critical limits for throttled EmailJS notification
      const evalResult = evaluateOperatingCondition(reading, settings);
      if (evalResult.condition === 'critical') {
        emailService.checkAndSendCriticalAlert(reading, evalResult, settings);
      }
    },
    [settings]
  );

    // Setup Serial Callbacks
  useEffect(() => {
    serialService.setCallbacks({
      onReading: (reading) => {
        setConnectionState(DATA_SOURCES.HARDWARE);
        setSerialError(null);
        handleNewReading(reading);
      },
      onStatusChange: ({ isConnected }) => {
        if (isConnected) {
          setConnectionState(DATA_SOURCES.HARDWARE);
          // If demo was running, stop it to prioritize real hardware
          if (simulatorService.isRunning) {
            simulatorService.stop();
            setIsSimulating(false);
          }
        } else {
          setConnectionState((prev) =>
            prev === DATA_SOURCES.HARDWARE ? 'disconnected' : prev
          );
        }
      },
      onError: (errMsg) => {
        setSerialError(errMsg);
      },
    });

    // Setup Share Service Callbacks
    shareService.setCallbacks({
      onReading: (remoteData, options = {}) => {
        if (options.isBatch && Array.isArray(remoteData)) {
          setReadings(remoteData.slice(-150));
        } else if (remoteData) {
          setReadings((prev) => {
            const next = [...prev, remoteData].slice(-150);
            return next;
          });
        }
      },
      onStateChange: (stateUpdate) => {
        setShareState((prev) => ({
          ...prev,
          ...stateUpdate,
        }));
      },
      onError: (err) => {
        console.warn('[Share] Error:', err);
      },
    });

    // Cleanup on unmount
    return () => {
      serialService.disconnect();
      simulatorService.stop();
      shareService.leaveRoom();
    };
  }, [handleNewReading]);

  // Network Online/Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // PWA Install Trigger
  const handleInstallPwa = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredInstallPrompt(null);
    }
  };

  // Cross-Device Sharing Handlers
  const handleStartHosting = async (roomCode) => {
    // If simulator was active, stop it so only real hardware is shared
    if (isSimulating) {
      simulatorService.stop();
      setIsSimulating(false);
    }
    await shareService.startHosting(roomCode);
  };

  const handleJoinRoom = async (roomCode) => {
    // Stop local simulations and hardware connections when entering remote viewer mode
    if (isSimulating) {
      simulatorService.stop();
      setIsSimulating(false);
    }
    if (connectionState === DATA_SOURCES.HARDWARE) {
      await serialService.disconnect();
    }
    // Clear local readings buffer so we immediately and cleanly display remote room data
    setReadings([]);
    setConnectionState(DATA_SOURCES.SHARED);
    return await shareService.joinRoom(roomCode);
  };

  const handleStopSharing = async () => {
    await shareService.stopSharing();
    if (connectionState === DATA_SOURCES.SHARED) {
      setConnectionState('disconnected');
    }
    // Reload local stored readings if any
    setReadings(storageService.loadReadings());
  };

  // Hardware USB Connection
  const handleConnectUsb = async () => {
    setSerialError(null);
    try {
      await serialService.connect(settings.baudRate);
    } catch (err) {
      setSerialError(err.message);
    }
  };

  const handleDisconnectUsb = async () => {
    await serialService.disconnect();
    setConnectionState('disconnected');
  };

  // Toggle Automated Demo Simulation
  const handleToggleSimulation = () => {
    if (isSimulating) {
      simulatorService.stop();
      setIsSimulating(false);
      if (connectionState === DATA_SOURCES.DEMO) {
        setConnectionState('disconnected');
      }
    } else {
      // If hardware was connected, disconnect to give priority to demo
      if (connectionState === DATA_SOURCES.HARDWARE) {
        serialService.disconnect();
      }
      setIsSimulating(true);
      setConnectionState(DATA_SOURCES.DEMO);
      simulatorService.start((reading) => {
        handleNewReading(reading);
      }, 2000);
    }
  };

  // Manual Reading Injection
  const handleInjectManualReading = (voltage, temperature) => {
    const reading = simulatorService.createManualReading(voltage, temperature);
    if (reading) {
      handleNewReading(reading);
      // If disconnected, set state to demo/manual for clarity
      if (connectionState !== DATA_SOURCES.HARDWARE && connectionState !== DATA_SOURCES.DEMO) {
        setConnectionState(DATA_SOURCES.DEMO);
      }
    }
  };

  // Settings Save & Reset Handlers
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  const handleResetSettings = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    storageService.saveSettings({ ...DEFAULT_SETTINGS });
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all stored telemetry readings from device memory?')) {
      setReadings([]);
      storageService.clearAllData();
    }
  };

  return (
    <div className="app-shell">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connectionState={connectionState}
        isOffline={isOffline}
        canInstallPwa={Boolean(deferredInstallPrompt)}
        onInstallPwa={handleInstallPwa}
        onConnectUsb={handleConnectUsb}
        onDisconnectUsb={handleDisconnectUsb}
        onOpenManualModal={() => setIsManualModalOpen(true)}
        isSerialSupported={isSerialSupported}
        shareState={shareState}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardTab
            latestReading={latestReading}
            settings={settings}
            evaluation={evaluation}
            loadMetrics={loadMetrics}
            nominalEnergyWh={nominalEnergyWh}
            ratesOfChange={ratesOfChange}
            connectionState={connectionState}
            onConnectUsb={handleConnectUsb}
            onDisconnectUsb={handleDisconnectUsb}
            isSerialSupported={isSerialSupported}
            serialError={serialError}
            isSimulating={isSimulating}
            onToggleSimulation={handleToggleSimulation}
            onOpenManualModal={() => setIsManualModalOpen(true)}
            readings={readings}
            onNavigateTab={setActiveTab}
            shareState={shareState}
            isShareConfigured={shareService.isConfigured()}
            onStartHosting={handleStartHosting}
            onJoinRoom={handleJoinRoom}
            onStopSharing={handleStopSharing}
          />
        )}

        {activeTab === 'analytics' && (
          <ChartsTab
            readings={readings}
            settings={settings}
            ratesOfChange={ratesOfChange}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            readings={readings}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onResetSettings={handleResetSettings}
          />
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Demonstration & Manual Injection Modal */}
      <ManualDemoModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulation}
        onInjectManualReading={handleInjectManualReading}
        currentVoltage={latestReading?.voltage}
        currentTemperature={latestReading?.temperature}
      />
    </div>
  );
}

export default App;
