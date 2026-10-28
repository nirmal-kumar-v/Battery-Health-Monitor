import React from 'react';
import {
  Usb,
  Play,
  Square,
  Sliders,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  ExternalLink,
  Info,
  Clock,
} from 'lucide-react';
import { TelemetryCards } from './TelemetryCards';
import { ConditionBanner } from './ConditionBanner';
import { DATA_SOURCES } from '../constants/defaults';

export function DashboardTab({
  latestReading,
  settings,
  evaluation,
  loadMetrics,
  nominalEnergyWh,
  ratesOfChange,
  connectionState,
  onConnectUsb,
  onDisconnectUsb,
  isSerialSupported,
  serialError,
  isSimulating,
  onToggleSimulation,
  onOpenManualModal,
  readings,
  onNavigateTab,
}) {
  const recentSlice = readings.slice(-5).reverse();

  return (
    <div className="dashboard-tab">
      {/* 1. Quick Connection & Control Bar */}
      <div className="action-bar">
        <div className="action-bar-left">
          {connectionState === DATA_SOURCES.HARDWARE ? (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={onDisconnectUsb}
            >
              <Usb size={14} />
              <span>Disconnect USB</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onConnectUsb}
              disabled={!isSerialSupported}
              title={
                !isSerialSupported
                  ? 'Chrome Web Serial API requires desktop Chrome or Edge'
                  : 'Connect physical microcontroller via USB'
              }
            >
              <Usb size={14} />
              <span>Connect USB ({settings.baudRate} baud)</span>
            </button>
          )}

          <button
            type="button"
            className={`btn ${isSimulating ? 'btn-secondary' : 'btn-secondary'} btn-sm`}
            onClick={onToggleSimulation}
          >
            {isSimulating ? <Square size={13} /> : <Play size={13} />}
            <span>{isSimulating ? 'Pause Simulation' : 'Start Demo Simulation'}</span>
          </button>
        </div>

        <div className="action-bar-right">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onOpenManualModal}
          >
            <Sliders size={14} />
            <span>Manual Injection</span>
          </button>
        </div>
      </div>

      {/* Serial Error Notice if any */}
      {serialError && (
        <div className="notice-box critical" role="alert">
          <AlertOctagon size={16} className="notice-icon" />
          <div>
            <strong>Hardware Connection Notice: </strong>
            <span>{serialError}</span>
          </div>
        </div>
      )}

      {/* Web Serial Browser Compatibility Note if not supported */}
      {!isSerialSupported && (
        <div className="notice-box neutral">
          <Info size={16} className="notice-icon" />
          <div>
            <strong>Web Serial Browser Capability: </strong>
            The Chrome Web Serial API is currently only available on Chromium-based desktop browsers
            (Chrome, Edge, Opera) and specific Android builds with flags. Mobile devices can use
            <strong> Demo Mode</strong> or <strong>Manual Injection</strong> to test the complete PWA
            experience, limit engine, calculations, and EmailJS alerts.
          </div>
        </div>
      )}

      {/* 2. Primary Estimated Operating Condition Banner with triggering rule explanation */}
      <ConditionBanner evaluation={evaluation} />

      {/* 3. Primary Telemetry Metric Cards */}
      <TelemetryCards
        latestReading={latestReading}
        settings={settings}
        evaluation={evaluation}
        loadMetrics={loadMetrics}
        nominalEnergyWh={nominalEnergyWh}
        ratesOfChange={ratesOfChange}
      />

      {/* 4. Telemetry Source & Quick Snapshot */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <Clock size={16} style={{ color: 'var(--primary-brand)' }} />
            <div>
              <h3 className="card-title" style={{ fontSize: 14 }}>
                Active Telemetry Stream
              </h3>
              <span className="card-subtitle">
                {latestReading
                  ? `Data source: ${latestReading.source.toUpperCase()} (${latestReading.source === 'hardware' ? 'Live physical sensor' : 'Simulated / user injected'})`
                  : 'Awaiting sensor stream'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onNavigateTab('analytics')}
          >
            <BarChart3 size={13} />
            <span>Full Charts</span>
          </button>
        </div>

        {recentSlice.length === 0 ? (
          <div style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: 13 }}>
            No telemetry records in memory. Connect your USB device or click "Start Demo Simulation"
            above to begin monitoring.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentSlice.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`source-tag ${r.source}`}>{r.source}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--primary-brand)' }}>
                    {r.voltage.toFixed(3)} V
                  </span>
                  <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--warning-accent)' }}>
                    {r.temperature.toFixed(1)} °C
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
