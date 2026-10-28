import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Zap,
  Sliders,
  Mail,
  Send,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { BAUD_RATES, DEFAULT_SETTINGS } from '../constants/defaults';
import { emailService } from '../services/emailService';

export function SettingsTab({ settings, onSaveSettings, onResetSettings }) {
  const [formData, setFormData] = useState({ ...settings });
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveFeedback('Configuration successfully saved and active.');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Reset all thresholds and configuration to system defaults?')) {
      onResetSettings();
      setFormData({ ...DEFAULT_SETTINGS });
      setSaveFeedback('Reset to default engineering thresholds.');
      setTimeout(() => setSaveFeedback(null), 3000);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus({ type: 'info', message: 'Dispatching test email via EmailJS...' });
    try {
      const result = await emailService.sendTestEmail(formData);
      if (result.success) {
        setEmailStatus({ type: 'success', message: result.message });
      } else {
        setEmailStatus({ type: 'error', message: result.message });
      }
    } catch (err) {
      setEmailStatus({ type: 'error', message: err.message || 'Email dispatch failed' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="settings-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Feedback Alert */}
      {saveFeedback && (
        <div className="notice-box info" style={{ marginBottom: 0 }}>
          <CheckCircle2 size={16} className="notice-icon" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Group 1: Voltage and Temperature Limits */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <Shield size={18} style={{ color: 'var(--primary-brand)' }} />
            <div>
              <h2 className="card-title">Configurable Safety & Operating Limits</h2>
              <span className="card-subtitle">
                Illustrative cell limits used to calculate Estimated Operating Condition
              </span>
            </div>
          </div>
        </div>

        <div className="form-grid-2">
          {/* Under-Voltage Critical */}
          <div className="form-group">
            <label className="form-label">Under-Voltage Critical Cutoff (V)</label>
            <div className="input-with-unit">
              <input
                type="number"
                step="0.01"
                className="form-input tabular-nums"
                value={formData.voltageMinCritical}
                onChange={(e) => handleChange('voltageMinCritical', parseFloat(e.target.value) || 0)}
                required
              />
              <span className="input-unit-badge">V</span>
            </div>
            <div className="form-helper">Below this triggers Critical Under-voltage alert. Default 3.00 V.</div>
          </div>

          {/* Under-Voltage Warning */}
          <div className="form-group">
            <label className="form-label">Under-Voltage Warning (V)</label>
            <div className="input-with-unit">
              <input
                type="number"
                step="0.01"
                className="form-input tabular-nums"
                value={formData.voltageMinWarning}
                onChange={(e) => handleChange('voltageMinWarning', parseFloat(e.target.value) || 0)}
                required
              />
              <span className="input-unit-badge">V</span>
            </div>
            <div className="form-helper">Below this triggers low battery warning. Default 3.30 V.</div>
          </div>

          {/* Over-Voltage Warning */}
          <div className="form-group">
            <label className="form-label">Over-Voltage Warning (V)</label>
            <div className="input-with-unit">
              <input
                type="number"
                step="0.01"
                className="form-input tabular-nums"
                value={formData.voltageMaxWarning}
                onChange={(e) => handleChange('voltageMaxWarning', parseFloat(e.target.value) || 0)}
                required
              />
              <span className="input-unit-badge">V</span>
            </div>
            <div className="form-helper">Above this triggers charge ceiling warning. Default 4.15 V.</div>
          </div>

          {/* Over-Voltage Critical */}
          <div className="form-group">
            <label className="form-label">Over-Voltage Critical Cutoff (V)</label>
            <div className="input-with-unit">
              <input
                type="number"
                step="0.01"
                className="form-input tabular-nums"
                value={formData.voltageMaxCritical}
                onChange={(e) => handleChange('voltageMaxCritical', parseFloat(e.target.value) || 0)}
                required
              />
              <span className="input-unit-badge">V</span>
            </div>
            <div className="form-helper">Above this triggers Critical Over-voltage alert. Default 4.25 V.</div>
          </div>

          {/* Cold Temperature Warning */}
          <div className="form-group">
            <label className="form-label">Minimum Temperature Warning (°C)</label>
            <div className="input-with-unit">
              <input
                type="number"
                step="0.5"
                className="form-input tabular-nums"
                value={formData.tempMinWarning}
                onChange={(e) => handleChange('tempMinWarning', parseFloat(e.target.value) || 0)}
                required
              />
              <span className="input-unit-badge">°C</span>
            </div>
            <div className="form-helper">Below this triggers cold warning (lithium plating risk during charge). Default 10.0 °C.</div>
          </div>

          {/* High Temperature Warning */}
          <div className="form-group">
            <label className="form-label">Maximum Temperature Warning (°C)</label>
            <div className="input-with-unit">
              <input
                type="number"
                step="0.5"
                className="form-input tabular-nums"
                value={formData.tempMaxWarning}
                onChange={(e) => handleChange('tempMaxWarning', parseFloat(e.target.value) || 0)}
                required
              />
              <span className="input-unit-badge">°C</span>
            </div>
            <div className="form-helper">Above this triggers elevated temperature warning. Default 45.0 °C.</div>
          </div>

          {/* Critical Temperature Alert */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Critical High Temperature Cutoff (°C)</label>
            <div className="input-with-unit">
              <input
                type="number"
                step="0.5"
                className="form-input tabular-nums"
                value={formData.tempMaxCritical}
                onChange={(e) => handleChange('tempMaxCritical', parseFloat(e.target.value) || 0)}
                required
              />
              <span className="input-unit-badge">°C</span>
            </div>
            <div className="form-helper">Above this triggers Critical Thermal Alert & optional email dispatch. Default 55.0 °C.</div>
          </div>
        </div>
      </div>

      {/* Group 2: Hardware Serial & Load Calculations */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <Zap size={18} style={{ color: 'var(--primary-brand)' }} />
            <div>
              <h2 className="card-title">Serial Hardware & Electrical Parameters</h2>
              <span className="card-subtitle">
                Baud rate selection, load resistance, and nominal cell energy
              </span>
            </div>
          </div>
        </div>

        <div className="form-grid-3">
          {/* Baud Rate */}
          <div className="form-group">
            <label className="form-label">USB Serial Baud Rate</label>
            <select
              className="form-select"
              value={formData.baudRate}
              onChange={(e) => handleChange('baudRate', parseInt(e.target.value, 10))}
            >
              {BAUD_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate} baud
                </option>
              ))}
            </select>
            <div className="form-helper">Standard Arduino/ESP32 baud rates (9600 or 115200).</div>
          </div>

          {/* External Load Resistance */}
          <div className="form-group">
            <label className="form-label">Known External Load (Ω)</label>
            <div className="input-with-unit">
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="form-input tabular-nums"
                value={formData.externalLoadOhms ?? ''}
                onChange={(e) =>
                  handleChange('externalLoadOhms', e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 10.0"
              />
              <span className="input-unit-badge">Ω</span>
            </div>
            <div className="form-helper">Enables I = V / R and P = V × I calculations across ohmic load.</div>
          </div>

          {/* Rated Capacity */}
          <div className="form-group">
            <label className="form-label">Rated Cell Capacity (Ah)</label>
            <div className="input-with-unit">
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="form-input tabular-nums"
                value={formData.ratedCapacityAh ?? ''}
                onChange={(e) =>
                  handleChange('ratedCapacityAh', e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 2.50"
              />
              <span className="input-unit-badge">Ah</span>
            </div>
            <div className="form-helper">Calculates Nominal Energy = V_nom × Ah (Wh).</div>
          </div>
        </div>
      </div>

      {/* Group 3: EmailJS Notifications */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <Mail size={18} style={{ color: 'var(--primary-brand)' }} />
            <div>
              <h2 className="card-title">EmailJS Notification Settings (Optional)</h2>
              <span className="card-subtitle">
                Automated critical safety limit dispatch with flood throttling
              </span>
            </div>
          </div>
        </div>

        <div className="notice-box neutral" style={{ marginBottom: 'var(--space-3)' }}>
          <Info size={16} className="notice-icon" />
          <div>
            <strong>EmailJS Setup Guide: </strong>
            To enable real email alerts on critical events, sign up for a free EmailJS account at{' '}
            <a href="https://www.emailjs.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-brand)', textDecoration: 'underline' }}>
              emailjs.com
            </a>
            , create an Email Service and Template with parameters <code>to_email</code>, <code>message</code>, <code>voltage</code>, <code>temperature</code>, and input your keys below. If not configured, alerts remain on-screen and emails are not dispatched.
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Recipient Email Address</label>
            <input
              type="email"
              className="form-input"
              value={formData.emailRecipient || ''}
              onChange={(e) => handleChange('emailRecipient', e.target.value)}
              placeholder="technician@example.com"
            />
            <div className="form-helper">Where critical alarm notifications will be delivered.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Cooldown Interval (Minutes)</label>
            <div className="input-with-unit">
              <input
                type="number"
                min="1"
                max="120"
                className="form-input tabular-nums"
                value={formData.emailAlertCooldownMinutes || 15}
                onChange={(e) => handleChange('emailAlertCooldownMinutes', parseInt(e.target.value, 10) || 15)}
              />
              <span className="input-unit-badge">min</span>
            </div>
            <div className="form-helper">Prevents repeated email flood for continuous ongoing alerts.</div>
          </div>

          <div className="form-group">
            <label className="form-label">EmailJS Service ID</label>
            <input
              type="text"
              className="form-input tabular-nums"
              value={formData.emailjsServiceId || ''}
              onChange={(e) => handleChange('emailjsServiceId', e.target.value)}
              placeholder="e.g. service_xxxxxxx"
            />
          </div>

          <div className="form-group">
            <label className="form-label">EmailJS Template ID</label>
            <input
              type="text"
              className="form-input tabular-nums"
              value={formData.emailjsTemplateId || ''}
              onChange={(e) => handleChange('emailjsTemplateId', e.target.value)}
              placeholder="e.g. template_xxxxxxx"
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">EmailJS Public Key</label>
            <input
              type="text"
              className="form-input tabular-nums"
              value={formData.emailjsPublicKey || ''}
              onChange={(e) => handleChange('emailjsPublicKey', e.target.value)}
              placeholder="e.g. user_xxxxxxxxxxxxxx"
            />
          </div>
        </div>

        {/* Email Test Status Box */}
        {emailStatus && (
          <div
            className={`notice-box ${
              emailStatus.type === 'success'
                ? 'info'
                : emailStatus.type === 'error'
                ? 'critical'
                : 'neutral'
            }`}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {emailStatus.type === 'success' ? (
              <CheckCircle2 size={16} className="notice-icon" />
            ) : (
              <AlertTriangle size={16} className="notice-icon" />
            )}
            <span>{emailStatus.message}</span>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-3)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSendTestEmail}
            disabled={isSendingEmail}
          >
            <Send size={13} />
            <span>{isSendingEmail ? 'Dispatching...' : 'Send Test Verification Email'}</span>
          </button>
        </div>
      </div>

      {/* Save & Reset Actions Bar */}
      <div className="action-bar">
        <button type="button" className="btn btn-ghost" onClick={handleReset}>
          <RotateCcw size={14} />
          <span>Reset Defaults</span>
        </button>

        <button type="submit" className="btn btn-primary">
          <Save size={14} />
          <span>Save Configuration</span>
        </button>
      </div>
    </form>
  );
}
