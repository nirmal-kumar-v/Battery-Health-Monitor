import React, { useState } from 'react';
import {
  History,
  Download,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { DATA_SOURCES } from '../constants/defaults';

export function HistoryTab({ readings, onClearHistory }) {
  const [filterSource, setFilterSource] = useState('all');

  const filtered = readings.filter((r) => {
    if (filterSource === 'all') return true;
    return r.source === filterSource;
  });

  // Export CSV
  const handleExportCsv = () => {
    if (readings.length === 0) return;

    const headers = ['Timestamp', 'Source', 'Voltage_V', 'Temperature_C', 'Raw_String'];
    const rows = readings.map((r) => [
      `"${r.timestamp}"`,
      `"${r.source}"`,
      r.voltage.toFixed(3),
      r.temperature.toFixed(2),
      `"${(r.rawString || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `battery_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap' }}>
        <div className="card-title-group">
          <History size={18} style={{ color: 'var(--primary-brand)' }} />
          <div>
            <h2 className="card-title">Telemetry Log & History</h2>
            <span className="card-subtitle">
              Stored locally on device ({filtered.length} of {readings.length} records shown)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Source Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
            <select
              className="form-select"
              style={{ width: 'auto', minHeight: 32, padding: '2px 8px', fontSize: 12 }}
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value={DATA_SOURCES.HARDWARE}>Live USB Only</option>
              <option value={DATA_SOURCES.DEMO}>Demo Only</option>
              <option value={DATA_SOURCES.MANUAL}>Manual Only</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCsv}
            disabled={readings.length === 0}
            title="Download CSV log"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClearHistory}
            disabled={readings.length === 0}
            title="Clear stored readings"
            style={{ color: 'var(--critical-alert)' }}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <History className="empty-icon" />
          <div className="empty-title">No Readings in Log</div>
          <div className="empty-desc">
            Connect hardware via USB, start Demo Mode, or inject manual telemetry to record readings.
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Stacked View (< 768px) */}
          <div className="stacked-reading-list" style={{ display: 'flex' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Showing latest readings first:
            </div>
            {filtered
              .slice(-50)
              .reverse()
              .map((reading) => {
                const date = new Date(reading.timestamp);
                const timeStr = date.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const dateStr = date.toLocaleDateString();

                return (
                  <div key={reading.id} className="reading-card">
                    <div className="reading-card-header">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        <span>
                          {dateStr} {timeStr}
                        </span>
                      </span>
                      <span className={`source-tag ${reading.source}`}>{reading.source}</span>
                    </div>

                    <div className="reading-card-metrics">
                      <div className="reading-metric-pair">
                        <span className="reading-metric-title">Voltage</span>
                        <span className="reading-metric-val tabular-nums" style={{ color: 'var(--primary-brand)' }}>
                          {reading.voltage.toFixed(3)} V
                        </span>
                      </div>
                      <div className="reading-metric-pair">
                        <span className="reading-metric-title">Temperature</span>
                        <span className="reading-metric-val tabular-nums" style={{ color: 'var(--warning-accent)' }}>
                          {reading.temperature.toFixed(1)} °C
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
