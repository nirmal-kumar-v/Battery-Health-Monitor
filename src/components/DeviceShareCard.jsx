import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Radio,
  Eye,
  RefreshCw,
  LogOut,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { generateRoomCode, normalizeRoomCode } from '../services/shareService';

export function DeviceShareCard({
  shareState,
  isConfigured,
  onStartHosting,
  onJoinRoom,
  onStopSharing,
}) {
  const [activeMode, setActiveMode] = useState('host'); // 'host' | 'viewer'
  const [hostCodeInput, setHostCodeInput] = useState(() => generateRoomCode());
  const [viewerCodeInput, setViewerCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  const { mode, code, isHostOnline } = shareState;
  const isJoined = mode === 'host' || mode === 'viewer';

  const handleCopyCode = async () => {
    const textToCopy = code || hostCodeInput;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleRegenerateCode = () => {
    setHostCodeInput(generateRoomCode());
  };

  const handleHostSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackNotice(null);
    setIsSubmitting(true);
    try {
      await onStartHosting(hostCodeInput);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewerSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackNotice(null);
    setIsSubmitting(true);
    try {
      const result = await onJoinRoom(viewerCodeInput);
      if (result?.isNewRoom) {
        setFeedbackNotice(`Connected to new room "${normalizeRoomCode(viewerCodeInput)}". Waiting for host laptop to start publishing.`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to join room');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card share-dashboard-card">
      <div className="card-header" style={{ paddingBottom: 'var(--space-2)' }}>
        <div className="card-title-group">
          <Share2 size={18} style={{ color: 'var(--primary-brand)' }} />
          <div>
            <h2 className="card-title" style={{ fontSize: 15 }}>
              Cross-Device Dashboard Sharing
            </h2>
            <span className="card-subtitle">
              Synchronize live battery telemetry in real-time across laptops and mobile phones
            </span>
          </div>
        </div>

        {/* Status indicator badge when active */}
        {isJoined && (
          <div
            className={`status-pill ${mode === 'host' ? 'connected' : isHostOnline ? 'connected' : 'disconnected'}`}
            style={{ fontSize: 11 }}
          >
            {isHostOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>
              {mode === 'host'
                ? 'Publishing Live'
                : isHostOnline
                ? 'Sync Live'
                : 'Host Offline'}
            </span>
          </div>
        )}
      </div>

      {/* Cloud Configuration Warning if Supabase env vars are missing */}
      {!isConfigured && (
        <div className="notice-box neutral" style={{ margin: 'var(--space-2) 0' }}>
          <AlertCircle size={16} className="notice-icon" />
          <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
            <strong>Real-time Cloud Sync Setup Required: </strong>
            To synchronize across separate devices over the internet, provide your free Supabase URL
            and Anon Key in your environment variables (<code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>).
            Local USB hardware monitoring, demo mode, and calculations remain fully operational.
          </div>
        </div>
      )}

      {/* Feedback Message */}
      {feedbackNotice && (
        <div className="notice-box info" style={{ margin: 'var(--space-2) 0' }}>
          <AlertCircle size={15} className="notice-icon" />
          <span style={{ fontSize: 12.5 }}>{feedbackNotice}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="notice-box critical" style={{ margin: 'var(--space-2) 0' }}>
          <AlertCircle size={15} className="notice-icon" />
          <span style={{ fontSize: 12.5 }}>{errorMsg}</span>
        </div>
      )}

      {/* Active Session Display */}
      {isJoined ? (
        <div className="active-share-session" style={{ marginTop: 'var(--space-2)' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Active Room Code
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <code
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--primary-brand)',
                      letterSpacing: '0.05em',
                      backgroundColor: 'var(--surface-card)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {code}
                  </code>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopyCode}
                    title="Copy access code to clipboard"
                    style={{ minHeight: 32, padding: '4px 10px' }}
                  >
                    {copied ? <Check size={13} style={{ color: 'var(--primary-brand)' }} /> : <Copy size={13} />}
                    <span style={{ fontSize: 12 }}>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className={`source-tag ${mode === 'host' ? 'hardware' : 'shared'}`}
                  style={{ textTransform: 'uppercase' }}
                >
                  Role: {mode === 'host' ? 'Host (ESP32 Publisher)' : 'Remote Viewer'}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={onStopSharing}
                  style={{ color: 'var(--critical-alert)' }}
                  title="Disconnect from sharing room"
                >
                  <LogOut size={13} />
                  <span>Leave Room</span>
                </button>
              </div>
            </div>

            {/* Role-specific status notice */}
            {mode === 'host' ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                <strong>Host Instructions: </strong> Connect your USB microcontroller via the button above.
                Any readings received from hardware will automatically stream to phones or devices entering <strong>{code}</strong>.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                {isHostOnline ? (
                  <span>
                    <strong>Connected to host laptop. </strong> Receiving live real-time battery telemetry over cloud sync. Read-only mode active.
                  </span>
                ) : (
                  <span>
                    <strong>Waiting for host or host offline: </strong> The host laptop for room <strong>{code}</strong> has not published readings in the last 15 seconds. Displaying last synchronized telemetry.
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Inactive Mode Selection & Setup Form */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          {/* Mode Switch Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-main)',
              borderRadius: 'var(--radius-sm)',
              padding: 3,
              gap: 4,
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${activeMode === 'host' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, minHeight: 34, fontSize: 12.5 }}
              onClick={() => setActiveMode('host')}
            >
              <Radio size={13} />
              <span>Share from this device (Host)</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeMode === 'viewer' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, minHeight: 34, fontSize: 12.5 }}
              onClick={() => setActiveMode('viewer')}
            >
              <Eye size={13} />
              <span>View a shared dashboard</span>
            </button>
          </div>

          {/* Option A: Host Mode */}
          {activeMode === 'host' && (
            <form onSubmit={handleHostSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                Use this option on the <strong>laptop connected to the ESP32</strong>. Share the generated code with your phone or colleagues to stream live readings in real-time.
              </p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 200, display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={hostCodeInput}
                    onChange={(e) => setHostCodeInput(e.target.value)}
                    placeholder="e.g. BATT-7K4P"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: 13,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--surface-card)',
                      color: 'var(--text-main)',
                      textTransform: 'uppercase',
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleRegenerateCode}
                    title="Generate new random room code"
                    style={{ padding: '0 10px' }}
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!isConfigured || isSubmitting}
                  style={{ minHeight: 38 }}
                >
                  <Radio size={13} />
                  <span>{isSubmitting ? 'Starting...' : 'Start Sharing Room'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Option B: Viewer Mode */}
          {activeMode === 'viewer' && (
            <form onSubmit={handleViewerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                Use this option on your <strong>phone or remote device</strong>. Enter the access code generated on the host laptop to monitor battery health without connecting USB.
              </p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input
                    type="text"
                    value={viewerCodeInput}
                    onChange={(e) => setViewerCodeInput(e.target.value)}
                    placeholder="Enter access code (e.g. BATT-7K4P)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--surface-card)',
                      color: 'var(--text-main)',
                      textTransform: 'uppercase',
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!isConfigured || isSubmitting}
                  style={{ minHeight: 38 }}
                >
                  <Eye size={13} />
                  <span>{isSubmitting ? 'Joining...' : 'Connect to Dashboard'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
