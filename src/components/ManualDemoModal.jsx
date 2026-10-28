import React, { useState } from 'react';
import {
  Sliders,
  Play,
  Square,
  X,
  Zap,
  Thermometer,
  Send,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { DATA_SOURCES } from '../constants/defaults';

export function ManualDemoModal({
  isOpen,
  onClose,
  isSimulating,
  onToggleSimulation,
  onInjectManualReading,
  currentVoltage,
  currentTemperature,
}) {
  const [manualV, setManualV] = useState(currentVoltage ? currentVoltage.toFixed(2) : '3.80');
  const [manualT, setManualT] = useState(currentTemperature ? currentTemperature.toFixed(1) : '28.0');

  if (!isOpen) return null;

  const handleApply = (e) => {
    e.preventDefault();
    const v = parseFloat(manualV);
    const t = parseFloat(manualT);
    if (!isNaN(v) && !isNaN(t)) {
      onInjectManualReading(v, t);
      onClose();
    }
  };

  const handlePreset = (v, t) => {
    setManualV(v.toString());
    setManualT(t.toString());
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} style={{ color: 'var(--primary-brand)' }} />
            <h2 className="card-title" style={{ fontSize: 16 }}>
              Demonstration & Manual Telemetry
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Continuous Simulation Control */}
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--sage-surface)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>
                Automated Discharge Simulation
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Simulates real-time Li-ion battery discharge kinetics and thermal drift
              </div>
            </div>

            <button
              type="button"
              className={`btn ${isSimulating ? 'btn-danger' : 'btn-primary'} btn-sm`}
              onClick={onToggleSimulation}
            >
              {isSimulating ? (
                <>
                  <Square size={13} />
                  <span>Stop Demo</span>
                </>
              ) : (
                <>
                  <Play size={13} />
                  <span>Start Demo</span>
                </>
              )}
            </button>
          </div>

          {/* Manual Telemetry Injection */}
          <form onSubmit={handleApply}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text-main)' }}>
              Inject Specific Voltage & Temperature
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Quickly test and demonstrate how the Operating Condition rules and alerts react:
            </div>

            {/* Quick Test Presets */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                marginBottom: 'var(--space-3)',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handlePreset(3.85, 25.0)}
              >
                Nominal (3.85V, 25°C)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handlePreset(3.20, 31.0)}
              >
                Low Voltage Warning (3.20V)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handlePreset(2.88, 33.0)}
              >
                Critical Under-V (2.88V)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handlePreset(3.80, 58.0)}
              >
                Critical Temp (58°C)
              </button>
            </div>

            {/* Manual Voltage Input & Slider */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Terminal Voltage
                </label>
                <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--primary-brand)' }}>
                  {manualV} V
                </span>
              </div>
              <input
                type="range"
                min="2.50"
                max="4.50"
                step="0.01"
                value={manualV}
                onChange={(e) => setManualV(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--primary-brand)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>2.50 V</span>
                <span>3.70 V (Nominal)</span>
                <span>4.50 V</span>
              </div>
            </div>

            {/* Manual Temperature Input & Slider */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Cell Temperature
                </label>
                <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--warning-accent)' }}>
                  {manualT} °C
                </span>
              </div>
              <input
                type="range"
                min="-10.0"
                max="70.0"
                step="0.5"
                value={manualT}
                onChange={(e) => setManualT(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--warning-accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>-10 °C</span>
                <span>25 °C (Ambient)</span>
                <span>70 °C</span>
              </div>
            </div>

            <div className="modal-footer" style={{ margin: 'var(--space-3) -var(--space-4) -var(--space-4)' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Send size={13} />
                <span>Apply Reading</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
