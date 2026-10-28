/**
 * Condition evaluation rules engine for battery telemetry.
 * Transparently calculates Estimated Operating Condition and details the exact triggering rules.
 */

import { OPERATING_CONDITIONS } from '../constants/defaults';

/**
 * Evaluates current voltage and temperature against configured thresholds.
 * Returns {
 *   condition: 'neutral' | 'normal' | 'warning' | 'critical',
 *   title: string,
 *   primaryReason: string,
 *   details: Array<{ ruleName: string, level: string, message: string }>,
 *   isVoltageCritical: boolean,
 *   isVoltageWarning: boolean,
 *   isTempCritical: boolean,
 *   isTempWarning: boolean
 * }
 */
export function evaluateOperatingCondition(reading, settings) {
  if (!reading || typeof reading.voltage !== 'number' || typeof reading.temperature !== 'number') {
    return {
      condition: OPERATING_CONDITIONS.NEUTRAL,
      title: 'Awaiting Telemetry',
      primaryReason: 'No live sensor readings or manual samples have been received yet.',
      details: [],
      isVoltageCritical: false,
      isVoltageWarning: false,
      isTempCritical: false,
      isTempWarning: false,
    };
  }

  const { voltage, temperature } = reading;
  const {
    voltageMinCritical = 3.00,
    voltageMinWarning = 3.30,
    voltageMaxWarning = 4.15,
    voltageMaxCritical = 4.25,
    tempMinWarning = 10.0,
    tempMaxWarning = 45.0,
    tempMaxCritical = 55.0,
  } = settings || {};

  const violations = [];

  let isVoltageCritical = false;
  let isVoltageWarning = false;
  let isTempCritical = false;
  let isTempWarning = false;

  // 1. Evaluate Critical Voltage Rules
  if (voltage < voltageMinCritical) {
    isVoltageCritical = true;
    violations.push({
      ruleName: 'Under-Voltage Critical Cutoff',
      level: 'critical',
      message: `Terminal voltage (${voltage.toFixed(3)} V) fell below the critical low limit (${voltageMinCritical.toFixed(2)} V). Risk of irreversible copper dissolution / deep discharge damage.`,
    });
  } else if (voltage > voltageMaxCritical) {
    isVoltageCritical = true;
    violations.push({
      ruleName: 'Over-Voltage Critical Cutoff',
      level: 'critical',
      message: `Terminal voltage (${voltage.toFixed(3)} V) exceeded the critical high limit (${voltageMaxCritical.toFixed(2)} V). Severe hazard of electrolyte breakdown and thermal instability.`,
    });
  }

  // 2. Evaluate Critical Temperature Rules
  if (temperature >= tempMaxCritical) {
    isTempCritical = true;
    violations.push({
      ruleName: 'High Temperature Critical Cutoff',
      level: 'critical',
      message: `Cell temperature (${temperature.toFixed(1)} °C) exceeded the critical threshold (${tempMaxCritical.toFixed(1)} °C). Immediate risk of separator deterioration and thermal runaway.`,
    });
  }

  // 3. Evaluate Warning Voltage Rules (only if not already critical)
  if (!isVoltageCritical) {
    if (voltage < voltageMinWarning) {
      isVoltageWarning = true;
      violations.push({
        ruleName: 'Under-Voltage Warning',
        level: 'warning',
        message: `Terminal voltage (${voltage.toFixed(3)} V) is below the warning threshold (${voltageMinWarning.toFixed(2)} V). Approaching low charge depletion.`,
      });
    } else if (voltage > voltageMaxWarning) {
      isVoltageWarning = true;
      violations.push({
        ruleName: 'Over-Voltage Warning',
        level: 'warning',
        message: `Terminal voltage (${voltage.toFixed(3)} V) is above the warning ceiling (${voltageMaxWarning.toFixed(2)} V). Approaching overcharge envelope.`,
      });
    }
  }

  // 4. Evaluate Warning Temperature Rules (only if not already critical)
  if (!isTempCritical) {
    if (temperature > tempMaxWarning) {
      isTempWarning = true;
      violations.push({
        ruleName: 'High Temperature Warning',
        level: 'warning',
        message: `Cell temperature (${temperature.toFixed(1)} °C) is above the warning threshold (${tempMaxWarning.toFixed(1)} °C). Accelerated degradation or heavy thermal dissipation detected.`,
      });
    } else if (temperature < tempMinWarning) {
      isTempWarning = true;
      violations.push({
        ruleName: 'Low Temperature Warning',
        level: 'warning',
        message: `Cell temperature (${temperature.toFixed(1)} °C) is below the minimum warning threshold (${tempMinWarning.toFixed(1)} °C). Lithium plating hazard during high-rate charging; reduced ionic conductivity.`,
      });
    }
  }

  // Determine overall condition
  if (isVoltageCritical || isTempCritical) {
    const criticalRules = violations.filter((v) => v.level === 'critical');
    return {
      condition: OPERATING_CONDITIONS.CRITICAL,
      title: 'Critical Alert',
      primaryReason: criticalRules.map((r) => r.message).join(' | '),
      details: violations,
      isVoltageCritical,
      isVoltageWarning,
      isTempCritical,
      isTempWarning,
    };
  }

  if (isVoltageWarning || isTempWarning) {
    const warningRules = violations.filter((v) => v.level === 'warning');
    return {
      condition: OPERATING_CONDITIONS.WARNING,
      title: 'Warning State',
      primaryReason: warningRules.map((r) => r.message).join(' | '),
      details: violations,
      isVoltageCritical: false,
      isVoltageWarning,
      isTempCritical: false,
      isTempWarning,
    };
  }

  return {
    condition: OPERATING_CONDITIONS.NORMAL,
    title: 'Nominal Operating Condition',
    primaryReason: `Telemetry is within user-configured limits (${voltageMinWarning.toFixed(2)}–${voltageMaxWarning.toFixed(2)} V, ${tempMinWarning.toFixed(1)}–${tempMaxWarning.toFixed(1)} °C).`,
    details: [
      {
        ruleName: 'Safe Operating Envelope',
        level: 'normal',
        message: `Current voltage (${voltage.toFixed(3)} V) and temperature (${temperature.toFixed(1)} °C) comply with all specified limits.`,
      },
    ],
    isVoltageCritical: false,
    isVoltageWarning: false,
    isTempCritical: false,
    isTempWarning: false,
  };
}
