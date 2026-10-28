import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { OPERATING_CONDITIONS, SOH_DISCLOSURE } from '../constants/defaults';

export function ConditionBanner({ evaluation }) {
  const [showDisclosure, setShowDisclosure] = useState(false);

  const { condition, title, primaryReason, details } = evaluation;

  let Icon = ShieldCheck;
  let statusClass = 'normal';

  if (condition === OPERATING_CONDITIONS.CRITICAL) {
    Icon = ShieldAlert;
    statusClass = 'critical';
  } else if (condition === OPERATING_CONDITIONS.WARNING) {
    Icon = AlertTriangle;
    statusClass = 'warning';
  } else if (condition === OPERATING_CONDITIONS.NEUTRAL) {
    Icon = Info;
    statusClass = 'neutral';
  }

  return (
    <section className={`condition-card ${statusClass}`} aria-live="polite">
      <div className="condition-header">
        <div className="condition-title-wrap">
          <Icon
            size={22}
            strokeWidth={2.2}
            style={{
              color:
                condition === OPERATING_CONDITIONS.CRITICAL
                  ? 'var(--critical-alert)'
                  : condition === OPERATING_CONDITIONS.WARNING
                  ? 'var(--warning-accent)'
                  : condition === OPERATING_CONDITIONS.NORMAL
                  ? 'var(--primary-brand)'
                  : 'var(--text-muted)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong className="card-title" style={{ fontSize: 16 }}>
                Estimated Operating Condition
              </strong>
              <span className={`condition-tag ${statusClass}`}>{title}</span>
            </div>
            <div className="card-subtitle">
              Evaluated strictly against configurable voltage and thermal bounds
            </div>
          </div>
        </div>
      </div>

      <div className="condition-reason">
        <strong>Status Rule Explanation: </strong>
        <span>{primaryReason}</span>
      </div>

      {/* Triggered rule details if any violations exist */}
      {details && details.length > 0 && condition !== OPERATING_CONDITIONS.NORMAL && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          {details.map((violation, idx) => (
            <div
              key={idx}
              className={`notice-box ${violation.level}`}
              style={{ marginBottom: 6, padding: '6px 12px' }}
            >
              <div>
                <strong>{violation.ruleName}: </strong>
                <span>{violation.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Engineering Disclosure Accordion */}
      <div className="disclosure-box">
        <button
          type="button"
          className="disclosure-summary"
          onClick={() => setShowDisclosure(!showDisclosure)}
          aria-expanded={showDisclosure}
        >
          <Info size={14} />
          <span>{SOH_DISCLOSURE.title}</span>
          {showDisclosure ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showDisclosure && (
          <div className="disclosure-body">
            <p>{SOH_DISCLOSURE.description}</p>
          </div>
        )}
      </div>
    </section>
  );
}
