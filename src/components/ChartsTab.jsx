import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';

export function ChartsTab({ readings, settings, ratesOfChange }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const [viewCount, setViewCount] = useState(30);

  const displayedReadings = readings.slice(-viewCount);
  const hasData = displayedReadings.length >= 2;

  // Compute domain ranges
  const voltages = displayedReadings.map((r) => r.voltage);
  const temperatures = displayedReadings.map((r) => r.temperature);

  const minV = hasData ? Math.min(...voltages) : 3.0;
  const maxV = hasData ? Math.max(...voltages) : 4.2;
  const vPadding = Math.max(0.05, (maxV - minV) * 0.15);
  const chartMinV = Math.max(0, minV - vPadding);
  const chartMaxV = maxV + vPadding;

  const minT = hasData ? Math.min(...temperatures) : 20.0;
  const maxT = hasData ? Math.max(...temperatures) : 45.0;
  const tPadding = Math.max(2.0, (maxT - minT) * 0.15);
  const chartMinT = Math.max(0, minT - tPadding);
  const chartMaxT = maxT + tPadding;

  // Chart Dimensions for SVG
  const width = 800;
  const height = 300;
  const padLeft = 55;
  const padRight = 55;
  const padTop = 30;
  const padBottom = 40;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Coordinate mapping
  const getX = (index) => {
    if (displayedReadings.length <= 1) return padLeft;
    return padLeft + (index / (displayedReadings.length - 1)) * plotWidth;
  };

  const getYVoltage = (v) => {
    if (chartMaxV === chartMinV) return padTop + plotHeight / 2;
    const ratio = (v - chartMinV) / (chartMaxV - chartMinV);
    return padTop + plotHeight - ratio * plotHeight;
  };

  const getYTemp = (t) => {
    if (chartMaxT === chartMinT) return padTop + plotHeight / 2;
    const ratio = (t - chartMinT) / (chartMaxT - chartMinT);
    return padTop + plotHeight - ratio * plotHeight;
  };

  // Build SVG path strings
  const voltagePoints = displayedReadings.map((r, i) => `${getX(i)},${getYVoltage(r.voltage)}`);
  const voltagePath = voltagePoints.length > 0 ? `M ${voltagePoints.join(' L ')}` : '';

  const tempPoints = displayedReadings.map((r, i) => `${getX(i)},${getYTemp(r.temperature)}`);
  const tempPath = tempPoints.length > 0 ? `M ${tempPoints.join(' L ')}` : '';

  // Stats calculation
  const avgV = hasData ? (voltages.reduce((a, b) => a + b, 0) / voltages.length).toFixed(3) : '--';
  const avgT = hasData ? (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1) : '--';

  return (
    <div className="charts-tab-wrapper">
      {/* Overview Card */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="card-header">
          <div className="card-title-group">
            <BarChart3 size={18} style={{ color: 'var(--primary-brand)' }} />
            <div>
              <h2 className="card-title">Dual-Axis Telemetry Dynamics</h2>
              <span className="card-subtitle">
                Independent scaling for Voltage (V) and Temperature (°C)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Show:</span>
            <select
              className="form-select"
              style={{ width: 'auto', minHeight: 32, padding: '2px 8px', fontSize: 12 }}
              value={viewCount}
              onChange={(e) => setViewCount(Number(e.target.value))}
            >
              <option value={15}>Last 15 readings</option>
              <option value={30}>Last 30 readings</option>
              <option value={60}>Last 60 readings</option>
              <option value={120}>Last 120 readings</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
            marginBottom: 'var(--space-3)',
            padding: '8px 12px',
            backgroundColor: 'var(--bg-main)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 3,
                backgroundColor: 'var(--primary-brand)',
                borderRadius: 2,
              }}
            />
            <strong>Terminal Voltage (V) — Left Axis</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 3,
                backgroundColor: 'var(--warning-accent)',
                borderRadius: 2,
              }}
            />
            <strong>Cell Temperature (°C) — Right Axis</strong>
          </div>
        </div>

        {/* Responsive Chart Container */}
        <div
          style={{
            width: '100%',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {!hasData ? (
            <div className="empty-state" style={{ minHeight: 260 }}>
              <BarChart3 className="empty-icon" />
              <div className="empty-title">Insufficient Telemetry Data</div>
              <div className="empty-desc">
                At least 2 live sensor readings, manual samples, or simulation points are required
                to render trends.
              </div>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const y = padTop + plotHeight * pct;
                const vVal = (chartMaxV - pct * (chartMaxV - chartMinV)).toFixed(2);
                const tVal = (chartMaxT - pct * (chartMaxT - chartMinT)).toFixed(0);
                return (
                  <g key={pct}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeWidth={1}
                      strokeDasharray={pct === 0 || pct === 1 ? 'none' : '3 3'}
                    />
                    {/* Left Axis label (Voltage) */}
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      fill="var(--primary-brand)"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      {vVal} V
                    </text>
                    {/* Right Axis label (Temperature) */}
                    <text
                      x={width - padRight + 8}
                      y={y + 4}
                      fill="var(--warning-accent)"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="start"
                    >
                      {tVal} °C
                    </text>
                  </g>
                );
              })}

              {/* Temperature Trend Line */}
              <path
                d={tempPath}
                fill="none"
                stroke="var(--warning-accent)"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />

              {/* Voltage Trend Line */}
              <path
                d={voltagePath}
                fill="none"
                stroke="var(--primary-brand)"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {displayedReadings.map((r, i) => {
                const cx = getX(i);
                const cyV = getYVoltage(r.voltage);
                const cyT = getYTemp(r.temperature);
                const isHovered = hoverIndex === i;

                return (
                  <g key={r.id || i}>
                    {/* Voltage Point */}
                    <circle
                      cx={cx}
                      cy={cyV}
                      r={isHovered ? 5 : 3}
                      fill="#FFFFFF"
                      stroke="var(--primary-brand)"
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoverIndex(i)}
                      onMouseLeave={() => setHoverIndex(null)}
                    />
                    {/* Temperature Point */}
                    <circle
                      cx={cx}
                      cy={cyT}
                      r={isHovered ? 5 : 2.5}
                      fill="#FFFFFF"
                      stroke="var(--warning-accent)"
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoverIndex(i)}
                      onMouseLeave={() => setHoverIndex(null)}
                    />
                  </g>
                );
              })}

              {/* Hover guide line */}
              {hoverIndex !== null && displayedReadings[hoverIndex] && (
                <line
                  x1={getX(hoverIndex)}
                  y1={padTop}
                  x2={getX(hoverIndex)}
                  y2={padTop + plotHeight}
                  stroke="var(--text-secondary)"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              )}

              {/* Time stamps at bottom */}
              <text
                x={padLeft}
                y={height - 12}
                fill="var(--text-secondary)"
                fontSize="10"
                textAnchor="start"
              >
                {new Date(displayedReadings[0].timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </text>
              <text
                x={width - padRight}
                y={height - 12}
                fill="var(--text-secondary)"
                fontSize="10"
                textAnchor="end"
              >
                {new Date(
                  displayedReadings[displayedReadings.length - 1].timestamp
                ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </text>
            </svg>
          )}
        </div>

        {/* Hover Tooltip Details */}
        {hoverIndex !== null && displayedReadings[hoverIndex] && (
          <div
            style={{
              marginTop: 'var(--space-3)',
              padding: '8px 12px',
              backgroundColor: 'var(--sage-surface)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              fontSize: 12,
            }}
          >
            <span>
              <strong>Sample Time: </strong>
              {new Date(displayedReadings[hoverIndex].timestamp).toLocaleTimeString()}
            </span>
            <span>
              <strong style={{ color: 'var(--primary-brand)' }}>Voltage: </strong>
              <span className="tabular-nums">
                {displayedReadings[hoverIndex].voltage.toFixed(3)} V
              </span>
            </span>
            <span>
              <strong style={{ color: 'var(--warning-accent)' }}>Temperature: </strong>
              <span className="tabular-nums">
                {displayedReadings[hoverIndex].temperature.toFixed(1)} °C
              </span>
            </span>
            <span className={`source-tag ${displayedReadings[hoverIndex].source}`}>
              {displayedReadings[hoverIndex].source}
            </span>
          </div>
        )}
      </div>

      {/* Summary Statistics Card */}
      <div className="form-grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: 14 }}>
              Voltage Dynamics
            </h3>
            <span className="metric-badge" style={{ backgroundColor: 'var(--sage-surface)', color: 'var(--primary-brand)' }}>
              Statistics
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
            <div style={{ padding: 8, backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Min V</div>
              <div style={{ fontSize: 15, fontWeight: 700 }} className="tabular-nums">
                {hasData ? minV.toFixed(3) : '--'} V
              </div>
            </div>
            <div style={{ padding: 8, backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Avg V</div>
              <div style={{ fontSize: 15, fontWeight: 700 }} className="tabular-nums">
                {avgV} V
              </div>
            </div>
            <div style={{ padding: 8, backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Max V</div>
              <div style={{ fontSize: 15, fontWeight: 700 }} className="tabular-nums">
                {hasData ? maxV.toFixed(3) : '--'} V
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong>Voltage Rate (dV/dt): </strong>
            <span className="tabular-nums">
              {ratesOfChange.hasEnoughData && ratesOfChange.voltageRateMvPerMin !== null
                ? `${ratesOfChange.voltageRateMvPerMin.toFixed(1)} mV/min`
                : 'Accumulating samples...'}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: 14 }}>
              Thermal Dynamics
            </h3>
            <span className="metric-badge" style={{ backgroundColor: 'var(--warning-surface)', color: 'var(--warning-accent)' }}>
              Statistics
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
            <div style={{ padding: 8, backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Min T</div>
              <div style={{ fontSize: 15, fontWeight: 700 }} className="tabular-nums">
                {hasData ? minT.toFixed(1) : '--'} °C
              </div>
            </div>
            <div style={{ padding: 8, backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Avg T</div>
              <div style={{ fontSize: 15, fontWeight: 700 }} className="tabular-nums">
                {avgT} °C
              </div>
            </div>
            <div style={{ padding: 8, backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Max T</div>
              <div style={{ fontSize: 15, fontWeight: 700 }} className="tabular-nums">
                {hasData ? maxT.toFixed(1) : '--'} °C
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong>Thermal Rise Rate (dT/dt): </strong>
            <span className="tabular-nums">
              {ratesOfChange.hasEnoughData && ratesOfChange.tempRateDegPerMin !== null
                ? `${ratesOfChange.tempRateDegPerMin.toFixed(2)} °C/min`
                : 'Accumulating samples...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
