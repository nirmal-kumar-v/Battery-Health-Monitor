import React from 'react';
import {
  Zap,
  Thermometer,
  Gauge,
  TrendingDown,
  TrendingUp,
  Clock,
  BatteryMedium,
} from 'lucide-react';
import { DATA_SOURCES } from '../constants/defaults';

export function TelemetryCards({
  latestReading,
  settings,
  evaluation,
  loadMetrics,
  nominalEnergyWh,
  ratesOfChange,
}) {
  const hasReading = Boolean(latestReading);
  const voltage = hasReading ? latestReading.voltage : null;
  const temperature = hasReading ? latestReading.temperature : null;

  // Compute voltage range meter fill percentage based on min critical and max critical
  const vMin = settings.voltageMinCritical || 3.0;
  const vMax = settings.voltageMaxCritical || 4.25;
  let voltageFillPct = 0;
  if (voltage !== null) {
    voltageFillPct = Math.max(0, Math.min(100, ((voltage - (vMin - 0.2)) / (vMax + 0.1 - (vMin - 0.2))) * 100));
  }

  // Compute temperature meter fill percentage (0 to 65 °C scale)
  let tempFillPct = 0;
  if (temperature !== null) {
    tempFillPct = Math.max(0, Math.min(100, ((temperature - 0) / 65) * 100));
  }

  const formatTimestamp = (ts) => {
    if (!ts) return 'No timestamp';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="telemetry-grid">
      {/* 1. Terminal Voltage Card */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-label-group">
            <Zap size={16} strokeWidth={2} style={{ color: 'var(--primary-brand)' }} />
            <span>Terminal Voltage</span>
          </div>
          {hasReading && (
            <span
              className={`metric-badge ${
                evaluation.isVoltageCritical
                  ? 'source-tag'
                  : evaluation.isVoltageWarning
                  ? 'source-tag'
                  : 'source-tag hardware'
              }`}
              style={{
                backgroundColor: evaluation.isVoltageCritical
                  ? 'var(--critical-surface)'
                  : evaluation.isVoltageWarning
                  ? 'var(--warning-surface)'
                  : 'var(--sage-surface)',
                color: evaluation.isVoltageCritical
                  ? 'var(--critical-alert)'
                  : evaluation.isVoltageWarning
                  ? 'var(--warning-accent)'
                  : 'var(--primary-brand)',
              }}
            >
              {evaluation.isVoltageCritical
                ? 'Critical'
                : evaluation.isVoltageWarning
                ? 'Warning'
                : 'Nominal'}
            </span>
          )}
        </div>

        <div className="metric-value-row">
          <span className="metric-value tabular-nums">
            {voltage !== null ? voltage.toFixed(3) : '--.---'}
          </span>
          <span className="metric-unit">V</span>
        </div>

        <div className="range-meter-wrapper">
          <div className="range-meter-track">
            <div
              className="range-meter-fill"
              style={{
                width: `${voltageFillPct}%`,
                backgroundColor: evaluation.isVoltageCritical
                  ? 'var(--critical-alert)'
                  : evaluation.isVoltageWarning
                  ? 'var(--warning-accent)'
                  : 'var(--primary-brand)',
              }}
            />
          </div>
          <div className="range-meter-bounds">
            <span>Cutoff: {settings.voltageMinCritical.toFixed(2)}V</span>
            <span>Ceiling: {settings.voltageMaxCritical.toFixed(2)}V</span>
          </div>
        </div>

        <div className="metric-subtext">
          {hasReading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} />
              <span>{formatTimestamp(latestReading.timestamp)}</span>
            </span>
          ) : (
            'Waiting for telemetry stream'
          )}
        </div>
      </div>

      {/* 2. Cell Temperature Card */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-label-group">
            <Thermometer size={16} strokeWidth={2} style={{ color: 'var(--warning-accent)' }} />
            <span>Cell Temperature</span>
          </div>
          {hasReading && (
            <span
              className="metric-badge"
              style={{
                backgroundColor: evaluation.isTempCritical
                  ? 'var(--critical-surface)'
                  : evaluation.isTempWarning
                  ? 'var(--warning-surface)'
                  : 'var(--sage-surface)',
                color: evaluation.isTempCritical
                  ? 'var(--critical-alert)'
                  : evaluation.isTempWarning
                  ? 'var(--warning-accent)'
                  : 'var(--primary-brand)',
              }}
            >
              {evaluation.isTempCritical
                ? 'Critical'
                : evaluation.isTempWarning
                ? 'Warning'
                : 'Nominal'}
            </span>
          )}
        </div>

        <div className="metric-value-row">
          <span className="metric-value tabular-nums">
            {temperature !== null ? temperature.toFixed(1) : '--.-'}
          </span>
          <span className="metric-unit">°C</span>
        </div>

        <div className="range-meter-wrapper">
          <div className="range-meter-track">
            <div
              className="range-meter-fill"
              style={{
                width: `${tempFillPct}%`,
                backgroundColor: evaluation.isTempCritical
                  ? 'var(--critical-alert)'
                  : evaluation.isTempWarning
                  ? 'var(--warning-accent)'
                  : 'var(--secondary-green)',
              }}
            />
          </div>
          <div className="range-meter-bounds">
            <span>Min: {settings.tempMinWarning.toFixed(0)}°C</span>
            <span>Max: {settings.tempMaxCritical.toFixed(0)}°C</span>
          </div>
        </div>

        <div className="metric-subtext">
          {ratesOfChange.hasEnoughData && ratesOfChange.tempRateDegPerMin !== null ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {ratesOfChange.tempRateDegPerMin >= 0 ? (
                <TrendingUp size={12} color="var(--warning-accent)" />
              ) : (
                <TrendingDown size={12} color="var(--secondary-green)" />
              )}
              <span className="tabular-nums">
                {ratesOfChange.tempRateDegPerMin > 0 ? '+' : ''}
                {ratesOfChange.tempRateDegPerMin.toFixed(2)} °C/min
              </span>
            </span>
          ) : (
            'Thermal trend calculates with ≥ 2 readings'
          )}
        </div>
      </div>

      {/* 3. Load Current & Power Card (Calculated with known external resistance) */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-label-group">
            <Gauge size={16} strokeWidth={2} style={{ color: 'var(--info-accent)' }} />
            <span>Load Current & Power</span>
          </div>
          <span
            className="metric-badge"
            style={{
              backgroundColor: loadMetrics.isActive ? 'var(--info-surface)' : '#F1F4EE',
              color: loadMetrics.isActive ? 'var(--info-accent)' : 'var(--text-secondary)',
            }}
          >
            {loadMetrics.isActive ? `R = ${settings.externalLoadOhms} Ω` : 'No Load Set'}
          </span>
        </div>

        <div className="metric-value-row">
          <span className="metric-value tabular-nums">
            {loadMetrics.currentA !== null ? loadMetrics.currentA.toFixed(3) : '--.---'}
          </span>
          <span className="metric-unit">A</span>
        </div>

        <div className="metric-subtext" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
          {loadMetrics.powerW !== null ? (
            <span className="tabular-nums">{loadMetrics.powerW.toFixed(3)} W</span>
          ) : (
            'Power requires load R'
          )}
        </div>

        <div className="metric-subtext" style={{ fontSize: 11 }}>
          {loadMetrics.isActive
            ? 'I = V / R and P = V × I'
            : 'Configure external resistance R in Settings to enable'}
        </div>
      </div>

      {/* 4. Rates of Change & Energy Card */}
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-label-group">
            <BatteryMedium size={16} strokeWidth={2} style={{ color: 'var(--primary-brand)' }} />
            <span>Rate of Change & Energy</span>
          </div>
          {nominalEnergyWh !== null && (
            <span
              className="metric-badge"
              style={{ backgroundColor: 'var(--sage-surface)', color: 'var(--primary-brand)' }}
            >
              Nominal
            </span>
          )}
        </div>

        <div className="metric-value-row">
          <span className="metric-value tabular-nums">
            {ratesOfChange.hasEnoughData && ratesOfChange.voltageRateMvPerMin !== null
              ? (ratesOfChange.voltageRateMvPerMin > 0 ? '+' : '') +
                ratesOfChange.voltageRateMvPerMin.toFixed(1)
              : '--.-'}
          </span>
          <span className="metric-unit">mV/min</span>
        </div>

        <div className="metric-subtext" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
          {nominalEnergyWh !== null ? (
            <span className="tabular-nums">
              {nominalEnergyWh.toFixed(2)} Wh ({settings.ratedCapacityAh} Ah @ {settings.nominalVoltage} V)
            </span>
          ) : (
            'Energy requires rated Ah'
          )}
        </div>

        <div className="metric-subtext" style={{ fontSize: 11 }}>
          {ratesOfChange.hasEnoughData
            ? `Rolling over ${ratesOfChange.sampleSpanSeconds}s window`
            : 'Needs ≥ 2 readings spaced over time'}
        </div>
      </div>
    </div>
  );
}
