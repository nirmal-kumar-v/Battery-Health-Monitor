/**
 * Battery Simulator and Manual Telemetry Generator.
 * Simulates realistic Li-ion cell discharge and thermal kinetics for demonstration.
 */

import { DATA_SOURCES } from '../constants/defaults';

class SimulatorService {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.voltage = 3.82;
    this.temperature = 28.5;
    this.trend = -0.002; // slow discharge
    this.tempTrend = 0.05; // slight warming under load
    this.onReadingCallback = null;
  }

  start(onReading, intervalMs = 2000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.onReadingCallback = onReading;

    // Emit initial reading right away
    this.emitReading();

    this.timer = setInterval(() => {
      this.step();
      this.emitReading();
    }, intervalMs);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  step() {
    // Small random walk with slight discharge trend
    const vJitter = (Math.random() - 0.5) * 0.006;
    this.voltage += this.trend + vJitter;

    // Bound voltage to a realistic demonstration cycle
    if (this.voltage < 3.25) {
      this.voltage = 4.18; // reset to full charge to keep demonstration lively
      this.temperature = 24.0;
    } else if (this.voltage > 4.22) {
      this.voltage = 4.20;
    }

    // Temperature kinetics with subtle fluctuations
    const tJitter = (Math.random() - 0.5) * 0.15;
    this.temperature += this.tempTrend + tJitter;
    if (this.temperature > 42.0) {
      this.tempTrend = -0.08; // cooling down
    } else if (this.temperature < 26.0) {
      this.tempTrend = 0.06; // warming up
    }
  }

  emitReading() {
    if (!this.onReadingCallback) return;

    const reading = {
      id: `demo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      voltage: parseFloat(this.voltage.toFixed(3)),
      temperature: parseFloat(this.temperature.toFixed(2)),
      timestamp: new Date().toISOString(),
      source: DATA_SOURCES.DEMO,
      isSimulated: true,
    };

    this.onReadingCallback(reading);
  }

  /**
   * Manually inject a custom reading for instant threshold/alert testing
   */
  createManualReading(voltage, temperature) {
    const v = parseFloat(voltage);
    const t = parseFloat(temperature);

    if (isNaN(v) || isNaN(t)) return null;

    // Update current simulation baseline so subsequent steps continue smoothly
    this.voltage = v;
    this.temperature = t;

    return {
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      voltage: parseFloat(v.toFixed(3)),
      temperature: parseFloat(t.toFixed(2)),
      timestamp: new Date().toISOString(),
      source: DATA_SOURCES.MANUAL,
      isManual: true,
    };
  }
}

export const simulatorService = new SimulatorService();
