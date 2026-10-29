import React from 'react';
import { computeHealth } from '../services/healthScore';
 // Assuming a Progress component exists; if not, use a simple div bar

export function BatteryHealthCard({ latestReading, settings }) {
  const result = latestReading ? computeHealth(latestReading, settings) : { enoughData: false };

  if (!result.enoughData) {
    return (
      <div className="card health-card">
        <h3>Battery Condition</h3>
        <p>Insufficient data</p>
      </div>
    );
  }

  const { score, status, reason } = result;
  const colorMap = {
    Excellent: 'var(--success)',
    Good: 'var(--info)',
    Fair: 'var(--warning-accent)',
    Poor: 'var(--critical-alert)',
    Critical: 'var(--critical-alert)',
  }[status];

  return (
    <div className="card health-card">
      <h3>Battery Condition</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, backgroundColor: '#e0e0e0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${score}%`, backgroundColor: colorMap, height: '100%' }} />
        </div>
        <span style={{ fontWeight: 600, color: colorMap }}>{score}</span>
      </div>
      <p style={{ marginTop: 4, color: colorMap, textTransform: 'uppercase' }}>{status}</p>
      <small>Reason: {reason}</small>
    </div>
  );
}

