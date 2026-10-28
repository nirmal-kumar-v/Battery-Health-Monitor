/**
 * Chrome Web Serial API Manager and Telemetry Stream Parser.
 * Robustly parses both key-value pairs (V=3.78,T=29.1) and JSON ({"voltage":3.78,"temperature":29.1}).
 */

import { DATA_SOURCES } from '../constants/defaults';

class SerialService {
  constructor() {
    this.port = null;
    this.reader = null;
    this.keepReading = false;
    this.buffer = '';
    this.onReadingCallback = null;
    this.onStatusChangeCallback = null;
    this.onErrorCallback = null;
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  setCallbacks({ onReading, onStatusChange, onError }) {
    this.onReadingCallback = onReading;
    this.onStatusChangeCallback = onStatusChange;
    this.onErrorCallback = onError;
  }

  /**
   * Parse a raw serial text line into { voltage, temperature, timestamp, source: 'hardware' }
   */
  parseLine(rawLine) {
    if (!rawLine || typeof rawLine !== 'string') return null;
    const line = rawLine.trim();
    if (!line) return null;

    let voltage = null;
    let temperature = null;

    // 1. Try JSON parsing
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const parsed = JSON.parse(line);
        if (typeof parsed.voltage === 'number') voltage = parsed.voltage;
        else if (typeof parsed.v === 'number') voltage = parsed.v;
        else if (typeof parsed.V === 'number') voltage = parsed.V;

        if (typeof parsed.temperature === 'number') temperature = parsed.temperature;
        else if (typeof parsed.temp === 'number') temperature = parsed.temp;
        else if (typeof parsed.t === 'number') temperature = parsed.t;
        else if (typeof parsed.T === 'number') temperature = parsed.T;
      } catch {
        // Not valid JSON, fall through to regex parsing
      }
    }

    // 2. Try Key-Value token parsing: e.g. "V=3.78,T=29.1" or "VOLT:3.78 TEMP:29.1"
    // Also matches "TEMP:-127.00 C | ADC:1322 | Estimated battery voltage:2.13 V"
    if (voltage === null || temperature === null) {
      // Regex for voltage: V=3.78 or V:3.78 or VOLTAGE=3.78 or Estimated battery voltage:2.13 V
      const vMatch = line.match(/(?:(?:ESTIMATED\s+BATTERY\s+)?VOLTAGE|VOLT|V)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
      if (vMatch) {
        voltage = parseFloat(vMatch[1]);
      }

      // Regex for temperature: T=29.1 or TEMP:29.1 or TEMPERATURE=29.1
      const tMatch = line.match(/(?:TEMPERATURE|TEMP|T)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
      if (tMatch) {
        temperature = parseFloat(tMatch[1]);
      }
    }

    // 3. Fallback: comma-separated two numeric values e.g. "3.78, 29.1"
    if (voltage === null && temperature === null) {
      const parts = line.split(/[,\t]+/).map((s) => s.trim());
      if (parts.length === 2) {
        const p1 = parseFloat(parts[0]);
        const p2 = parseFloat(parts[1]);
        if (!isNaN(p1) && !isNaN(p2)) {
          voltage = p1;
          temperature = p2;
        }
      }
    }

    if (voltage !== null && !isNaN(voltage) && temperature !== null && !isNaN(temperature)) {
      // Sensor fault check: DS18B20 disconnects read as -127°C or 85°C (power-on reset uninitialized)
      const isSensorFault = temperature <= -100 || temperature === 85.0;

      return {
        id: `hw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        voltage: parseFloat(voltage.toFixed(3)),
        temperature: parseFloat(temperature.toFixed(2)),
        timestamp: new Date().toISOString(),
        source: DATA_SOURCES.HARDWARE,
        rawString: line,
        sensorFault: isSensorFault,
        sensorFaultReason: isSensorFault ? `Hardware sensor fault reported: ${temperature.toFixed(1)}°C (DS18B20 comm failure)` : null,
      };
    }

    return null;
  }

  async connect(baudRate = 115200) {
    if (!this.isSupported()) {
      const errorMsg =
        'Web Serial API is not supported in this browser environment. Chrome or Edge on desktop is required. You can use Demo Mode or Manual Input to test all features.';
      if (this.onErrorCallback) this.onErrorCallback(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // Request serial port from user
      this.port = await navigator.serial.requestPort();

      // Open port with selected baud rate
      await this.port.open({ baudRate: parseInt(baudRate, 10) });

      this.keepReading = true;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback({ isConnected: true, port: this.port });
      }

      // Start asynchronous read loop
      this.readLoop();
      return true;
    } catch (err) {
      this.port = null;
      let friendlyError = err.message || 'Failed to open serial port';
      if (err.name === 'NotFoundError') {
        friendlyError = 'No USB device selected. Connection cancelled by user.';
      } else if (err.name === 'InvalidStateError') {
        friendlyError = 'The selected serial port is already open or busy in another application/tab.';
      } else if (err.name === 'SecurityError') {
        friendlyError = 'Permission denied. Ensure serial permissions are allowed in browser site settings.';
      }

      if (this.onErrorCallback) this.onErrorCallback(friendlyError);
      if (this.onStatusChangeCallback) this.onStatusChangeCallback({ isConnected: false });
      throw new Error(friendlyError);
    }
  }

  async readLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done) {
          // Allow reader to be closed
          break;
        }

        if (value) {
          this.buffer += value;
          const lines = this.buffer.split(/\r?\n/);
          // Keep whatever is after the last newline in buffer
          this.buffer = lines.pop();

          for (const line of lines) {
            const parsed = this.parseLine(line);
            if (parsed && this.onReadingCallback) {
              this.onReadingCallback(parsed);
            }
          }
        }
      }
    } catch (err) {
      if (this.keepReading && this.onErrorCallback) {
        this.onErrorCallback(`Serial read error: ${err.message || 'Device disconnected unexpectedly'}`);
      }
    } finally {
      if (this.reader) {
        try {
          await this.reader.cancel();
          this.reader.releaseLock();
        } catch {
          // ignore
        }
        this.reader = null;
      }
      try {
        await readableStreamClosed.catch(() => {});
      } catch {
        // ignore
      }
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback({ isConnected: false });
      }
    }
  }

  async disconnect() {
    this.keepReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
        this.reader.releaseLock();
      } catch {
        // ignore
      }
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // ignore
      }
      this.port = null;
    }

    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({ isConnected: false });
    }
  }
}

export const serialService = new SerialService();
