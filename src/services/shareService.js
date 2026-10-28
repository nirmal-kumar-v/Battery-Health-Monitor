/**
 * Cloud Real-Time Sharing Service using Supabase Auth, PostgreSQL, and Realtime.
 * Strictly adheres to room isolation, host heartbeat tracking, and sensor integrity.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DATA_SOURCES } from '../constants/defaults';

// Helper to normalize room code (uppercase, trimmed, alphanumeric and dashes only)
export function normalizeRoomCode(code) {
  if (!code || typeof code !== 'string') return '';
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

// Helper to generate a human-friendly, high-entropy room code e.g. "BATT-7K4P"
export function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 without easily confused 0, 1, I, O
  let part = '';
  for (let i = 0; i < 4; i++) {
    part += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BATT-${part}-${part2}`;
}

class ShareService {
  constructor() {
    this.currentRoom = null;
    this.mode = 'idle'; // 'idle' | 'host' | 'viewer'
    this.channel = null;
    this.heartbeatTimer = null;
    this.staleCheckTimer = null;
    this.onReadingReceived = null;
    this.onRoomStateChanged = null;
    this.onError = null;
    this.lastPublishedTime = 0;
    this.minPublishIntervalMs = 800; // Rate limit remote writes to avoid spamming the DB
    this.hostSessionId = `host-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this._lastPolledTimestamp = null; // tracks last polled reading timestamp to avoid duplicates
  }

  isConfigured() {
    return isSupabaseConfigured && Boolean(supabase);
  }

  setCallbacks({ onReading, onStateChange, onError }) {
    this.onReadingReceived = onReading;
    this.onRoomStateChanged = onStateChange;
    this.onError = onError;
  }

  async ensureAuth() {
    if (!this.isConfigured()) {
      throw new Error('Supabase cloud service is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.');
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.warn('Anonymous auth failed, checking session or retrying:', error);
        // Fallback: try signing up with an anonymous email if anon auth isn't enabled
        throw new Error(`Cloud authentication required: ${error.message}`);
      }
      return data.user?.id;
    }
    return session.user.id;
  }

  /**
   * Start hosting a room with the given access code.
   * Creates or claims the room, updates host_session_id and host_heartbeat.
   */
  async startHosting(rawCode) {
    const code = normalizeRoomCode(rawCode);
    if (!code || code.length < 4) {
      throw new Error('Please enter a valid room code (at least 4 characters).');
    }

    await this.leaveRoom(); // Clean up any active room

    const userId = await this.ensureAuth();
    this.mode = 'host';
    this.currentRoom = code;

    // Call RPC or upsert room record
    const { data: room, error: roomError } = await supabase
      .from('dashboard_rooms')
      .upsert(
        {
          code,
          host_user_id: userId,
          host_session_id: this.hostSessionId,
          last_heartbeat: new Date().toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'code' }
      )
      .select()
      .single();

    if (roomError) {
      this.mode = 'idle';
      this.currentRoom = null;
      throw new Error(`Failed to initialize room: ${roomError.message}`);
    }

    // Start sending heartbeat every 5 seconds
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 5000);

    // Subscribe to realtime changes on this room's readings
    this.subscribeToRoom(code);

    if (this.onRoomStateChanged) {
      this.onRoomStateChanged({
        mode: 'host',
        code,
        status: 'hosting',
        isHostOnline: true,
      });
    }

    return room;
  }

  async sendHeartbeat() {
    if (this.mode !== 'host' || !this.currentRoom || !this.isConfigured()) return;
    try {
      await supabase
        .from('dashboard_rooms')
        .update({
          last_heartbeat: new Date().toISOString(),
          is_active: true,
        })
        .eq('code', this.currentRoom)
        .eq('host_session_id', this.hostSessionId);
    } catch {
      // heartbeats fail silently during transient network hiccups
    }
  }

  /**
   * Publish a live reading from the host laptop to the cloud room.
   */
  async publishReading(reading) {
    if (this.mode !== 'host' || !this.currentRoom || !this.isConfigured()) return;
    if (!reading || typeof reading.voltage !== 'number' || typeof reading.temperature !== 'number') return;

    const now = Date.now();
    // Rate limit DB writes to ~1 reading per second
    if (now - this.lastPublishedTime < this.minPublishIntervalMs) return;
    this.lastPublishedTime = now;

    try {
      const fullPayload = {
        room_code: this.currentRoom,
        voltage: reading.voltage,
        temperature: reading.temperature,
        raw_string: reading.rawString || '',
        sensor_fault: Boolean(reading.sensorFault),
        sensor_fault_reason: reading.sensorFaultReason || null,
        source: reading.source || DATA_SOURCES.HARDWARE,
        measured_at: reading.timestamp || new Date().toISOString(),
      };

      // 1. Update the latest reading state on the room row (stored as JSONB — all fields allowed)
      const { error: updateErr } = await supabase
        .from('dashboard_rooms')
        .update({
          latest_reading: fullPayload,
          last_heartbeat: new Date().toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('code', this.currentRoom)
        .eq('host_session_id', this.hostSessionId);

      if (updateErr) {
        console.warn('[ShareService] Room update failed:', updateErr.message);
      }

      // 2. Insert into telemetry_history (only columns that exist in the table)
      const { error: insertErr } = await supabase
        .from('telemetry_history')
        .insert([{
          room_code: this.currentRoom,
          voltage: reading.voltage,
          temperature: reading.temperature,
          raw_string: reading.rawString || '',
          sensor_fault: Boolean(reading.sensorFault),
          sensor_fault_reason: reading.sensorFaultReason || null,
          source: reading.source || DATA_SOURCES.HARDWARE,
          measured_at: reading.timestamp || new Date().toISOString(),
        }]);

      if (insertErr) {
        console.warn('[ShareService] Telemetry insert failed:', insertErr.message);
      }
    } catch (err) {
      console.warn('[ShareService] Publish failed:', err);
    }
  }

  /**
   * Join a room as a remote viewer (mobile phone, other laptop).
   * Does NOT require Web Serial API.
   */
  async joinRoom(rawCode) {
    const code = normalizeRoomCode(rawCode);
    if (!code || code.length < 4) {
      throw new Error('Please enter a valid room code (at least 4 characters).');
    }

    await this.leaveRoom();

    await this.ensureAuth();
    this.mode = 'viewer';
    this.currentRoom = code;

    // Fetch room status and latest stored reading
    const { data: room, error } = await supabase
      .from('dashboard_rooms')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      this.mode = 'idle';
      this.currentRoom = null;
      throw new Error(`Failed to query room: ${error.message}`);
    }

    const isNewRoom = !room;
    let initialReading = null;
    let isHostOnline = false;

    if (!isNewRoom && room) {
      // Check if host heartbeat is recent (within 15 seconds)
      const lastHeartbeatTime = room.last_heartbeat ? new Date(room.last_heartbeat).getTime() : 0;
      isHostOnline = Date.now() - lastHeartbeatTime < 15000 && Boolean(room.is_active);

      if (room.latest_reading) {
        initialReading = this.formatReading(room.latest_reading);
      }
    } else {
      // Auto-create empty room so host can join later or viewer knows it's waiting
      try {
        await supabase
          .from('dashboard_rooms')
          .insert({
            code,
            is_active: false,
          });
      } catch {
        // ignore if already created
      }
    }

    // Subscribe to realtime updates for this room
    this.subscribeToRoom(code);

    // Fetch initial history (last 50 readings) for charts and logs
    this.fetchRecentHistory(code);

    // Start a periodic check to detect host status AND fetch latest readings (every 2s)
    this.staleCheckTimer = setInterval(() => {
      this.checkHostLiveness();
    }, 2000);

    if (this.onRoomStateChanged) {
      this.onRoomStateChanged({
        mode: 'viewer',
        code,
        status: initialReading ? (isHostOnline ? 'connected' : 'stale') : 'waiting',
        isHostOnline,
        isNewRoom,
      });
    }

    if (initialReading && this.onReadingReceived) {
      this.onReadingReceived(initialReading, { isHistorical: false });
    }

    return { isNewRoom, isHostOnline, latestReading: initialReading };
  }

  async checkHostLiveness() {
    if (this.mode !== 'viewer' || !this.currentRoom || !this.isConfigured()) return;
    try {
      const { data: room } = await supabase
        .from('dashboard_rooms')
        .select('last_heartbeat, is_active, updated_at, latest_reading')
        .eq('code', this.currentRoom)
        .maybeSingle();

      if (room) {
        const lastHb = room.last_heartbeat ? new Date(room.last_heartbeat).getTime() : 0;
        const isOnline = Date.now() - lastHb < 15000 && Boolean(room.is_active);

        // Poll-based reading delivery: push latest_reading to the viewer every cycle.
        // This ensures data arrives even if the Realtime subscription misses events.
        if (room.latest_reading && this.onReadingReceived) {
          const reading = this.formatReading(room.latest_reading);
          // Only push if the reading timestamp has changed since the last poll
          const readingTs = reading.timestamp || '';
          if (readingTs !== this._lastPolledTimestamp) {
            this._lastPolledTimestamp = readingTs;
            this.onReadingReceived(reading, { isHistorical: false });
          }
        }

        if (this.onRoomStateChanged) {
          this.onRoomStateChanged({
            mode: 'viewer',
            code: this.currentRoom,
            status: isOnline ? 'connected' : 'stale',
            isHostOnline: isOnline,
          });
        }
      }
    } catch {
      // silent
    }
  }

  async fetchRecentHistory(code) {
    if (!this.isConfigured()) return;
    try {
      const { data: rows } = await supabase
        .from('telemetry_history')
        .select('*')
        .eq('room_code', code)
        .order('measured_at', { ascending: true })
        .limit(100);

      if (rows && rows.length > 0 && this.onReadingReceived) {
        const formatted = rows.map((r) => this.formatReading(r));
        // Batch ingest
        this.onReadingReceived(formatted, { isBatch: true });
      }
    } catch (err) {
      console.warn('[ShareService] Fetch history error:', err);
    }
  }

  subscribeToRoom(code) {
    if (!this.isConfigured()) return;

    // Disconnect old channel if any
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.channel = supabase
      .channel(`room_${code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dashboard_rooms',
          filter: `code=eq.${code}`,
        },
        (payload) => {
          const room = payload.new;
          if (room && room.latest_reading && this.mode === 'viewer') {
            const formatted = this.formatReading(room.latest_reading);
            if (this.onReadingReceived) {
              this.onReadingReceived(formatted, { isHistorical: false });
            }
          }
          if (this.onRoomStateChanged) {
            const lastHb = room.last_heartbeat ? new Date(room.last_heartbeat).getTime() : 0;
            const isHostOnline = Date.now() - lastHb < 15000 && Boolean(room.is_active);
            this.onRoomStateChanged({
              mode: this.mode,
              code,
              isHostOnline,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry_history',
          filter: `room_code=eq.${code}`,
        },
        (payload) => {
          if (payload.new && this.mode === 'viewer') {
            const formatted = this.formatReading(payload.new);
            if (this.onReadingReceived) {
              this.onReadingReceived(formatted, { isHistorical: false });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connected to realtime stream
        }
      });
  }

  formatReading(dbRow) {
    const isFault = Boolean(dbRow.sensor_fault) || (typeof dbRow.temperature === 'number' && dbRow.temperature <= -100);
    return {
      id: dbRow.id ? `remote-${dbRow.id}` : `remote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      voltage: typeof dbRow.voltage === 'number' ? parseFloat(dbRow.voltage.toFixed(3)) : null,
      temperature: typeof dbRow.temperature === 'number' ? parseFloat(dbRow.temperature.toFixed(2)) : null,
      timestamp: dbRow.measured_at || dbRow.created_at || new Date().toISOString(),
      source: dbRow.source || DATA_SOURCES.SHARED,
      rawString: dbRow.raw_string || '',
      sensorFault: isFault,
      sensorFaultReason: dbRow.sensor_fault_reason || (isFault ? `Hardware sensor fault: ${dbRow.temperature?.toFixed(1)}°C (DS18B20 comms error)` : null),
      isShared: true,
    };
  }

  async stopSharing() {
    if (this.mode === 'host' && this.currentRoom && this.isConfigured()) {
      try {
        await supabase
          .from('dashboard_rooms')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('code', this.currentRoom)
          .eq('host_session_id', this.hostSessionId);
      } catch {
        // ignore
      }
    }
    await this.leaveRoom();
  }

  async leaveRoom() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
    if (this.channel && supabase) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.currentRoom = null;
    this.mode = 'idle';
    this._lastPolledTimestamp = null;

    if (this.onRoomStateChanged) {
      this.onRoomStateChanged({
        mode: 'idle',
        code: null,
        status: 'disconnected',
        isHostOnline: false,
      });
    }
  }
}

export const shareService = new ShareService();

