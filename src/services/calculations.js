/**
 * Electrical calculations, rate-of-change telemetry, and assumptions.
 */

/**
 * Calculates current (I) and power (P) given terminal voltage and external load resistance.
 * Formula: I = V / R, P = V * I = V^2 / R
 */
export function calculateLoadMetrics(voltage, externalLoadOhms) {
  if (
    typeof voltage !== 'number' ||
    isNaN(voltage) ||
    typeof externalLoadOhms !== 'number' ||
    isNaN(externalLoadOhms) ||
    externalLoadOhms <= 0
  ) {
    return {
      currentA: null,
      powerW: null,
      isActive: false,
      assumptions: 'External load resistance not specified or non-positive. Load calculations disabled.',
    };
  }

  const currentA = voltage / externalLoadOhms;
  const powerW = voltage * currentA;

  return {
    currentA: parseFloat(currentA.toFixed(4)),
    powerW: parseFloat(powerW.toFixed(4)),
    isActive: true,
    assumptions: `Calculated assuming an external static ohmic load of ${externalLoadOhms.toFixed(2)} Ω across terminal voltage. Internal cell resistance (ESR) and lead wire drops are neglected.`,
  };
}

/**
 * Calculates nominal energy based on nominal voltage and rated capacity (Ah).
 * Formula: E = V_nominal * Capacity_Ah (Wh)
 */
export function calculateNominalEnergy(nominalVoltage, ratedCapacityAh) {
  if (
    typeof nominalVoltage !== 'number' ||
    isNaN(nominalVoltage) ||
    nominalVoltage <= 0 ||
    typeof ratedCapacityAh !== 'number' ||
    isNaN(ratedCapacityAh) ||
    ratedCapacityAh <= 0
  ) {
    return null;
  }

  const energyWh = nominalVoltage * ratedCapacityAh;
  return parseFloat(energyWh.toFixed(2));
}

/**
 * Calculates the rate of change for voltage and temperature over recent readings.
 * Rate = (Latest - Previous) / Time_Delta
 * Returns rate per minute.
 */
export function calculateRatesOfChange(readings, windowSize = 5) {
  if (!readings || readings.length < 2) {
    return {
      voltageRateMvPerMin: null,
      tempRateDegPerMin: null,
      sampleSpanSeconds: 0,
      hasEnoughData: false,
    };
  }

  // Use the newest subset within the window
  const slice = readings.slice(-windowSize);
  const oldest = slice[0];
  const newest = slice[slice.length - 1];

  const tOld = new Date(oldest.timestamp).getTime();
  const tNew = new Date(newest.timestamp).getTime();
  const deltaSeconds = (tNew - tOld) / 1000;

  // We require at least 3 seconds between oldest and newest to prevent division by near-zero jitter
  if (deltaSeconds < 2) {
    return {
      voltageRateMvPerMin: null,
      tempRateDegPerMin: null,
      sampleSpanSeconds: Math.round(deltaSeconds),
      hasEnoughData: false,
    };
  }

  const deltaMinutes = deltaSeconds / 60;
  const deltaVoltageVolts = newest.voltage - oldest.voltage;
  const deltaVoltageMv = deltaVoltageVolts * 1000;
  const deltaTemp = newest.temperature - oldest.temperature;

  const voltageRateMvPerMin = deltaVoltageMv / deltaMinutes;
  const tempRateDegPerMin = deltaTemp / deltaMinutes;

  return {
    voltageRateMvPerMin: parseFloat(voltageRateMvPerMin.toFixed(2)),
    tempRateDegPerMin: parseFloat(tempRateDegPerMin.toFixed(2)),
    sampleSpanSeconds: Math.round(deltaSeconds),
    hasEnoughData: true,
  };
}
