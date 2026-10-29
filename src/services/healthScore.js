// src/services/healthScore.js
/**
 * Compute an Estimated Operating Condition (0‑100) from a reading and user settings.
 * Returns an object {score, status, reason, enoughData}.
 * The scoring uses equal weighting for each metric that is present.
 */
export function computeHealth(reading, settings) {
  const contributions = [];
  const add = (weight, score, reason) => contributions.push({ weight, score, reason });

  // Voltage contribution (use warning limits as the usable range)
  if (reading.voltage != null && typeof reading.voltage === 'number') {
    const min = settings.voltageMinWarning ?? 3.0;
    const max = settings.voltageMaxWarning ?? 4.2;
    const range = max - min;
    const norm = (reading.voltage - min) / range; // 0‑1 inside safe window
    const score = Math.max(0, Math.min(1, 1 - Math.abs(0.5 - norm) * 2)); // best at centre
    add(1, score, 'Voltage');
  }

  // Current contribution (use configured safe max as reference)
  if (reading.current != null && typeof reading.current === 'number') {
    const max = settings.currentMaxWarning ?? 2.0; // fallback if not set
    const norm = Math.min(1, Math.abs(reading.current) / max);
    const score = 1 - norm;
    add(1, score, 'Current');
  }

  // Temperature contribution (use warning limits as the range)
  if (reading.temperature != null && typeof reading.temperature === 'number') {
    const min = settings.tempMinWarning ?? 10.0;
    const max = settings.tempMaxWarning ?? 45.0;
    const range = max - min;
    const norm = (reading.temperature - min) / range;
    const score = Math.max(0, Math.min(1, 1 - Math.abs(0.5 - norm) * 2));
    add(1, score, 'Temperature');
  }

  // Power contribution (only if both voltage and current are valid)
  if (reading.voltage != null && reading.current != null) {
    const power = reading.voltage * reading.current;
    const maxPower = settings.powerMaxWarning ?? (settings.voltageMaxWarning * settings.currentMaxWarning);
    if (maxPower) {
      const norm = Math.min(1, power / maxPower);
      const score = 1 - norm;
      add(1, score, 'Power');
    }
  }

  // C‑rate (charging‑rate) contribution – requires rated capacity
  if (reading.current != null && settings.ratedCapacityAh) {
    const cRate = Math.abs(reading.current) / settings.ratedCapacityAh; // A / Ah = 1/h
    const maxCRate = settings.cRateMaxWarning ?? 1; // default 1C
    const norm = Math.min(1, cRate / maxCRate);
    const score = 1 - norm;
    add(1, score, 'C‑rate');
  }

  // Energy contribution – use accumulated Wh if provided
  if (reading.energyWh != null && settings.nominalVoltage && settings.ratedCapacityAh) {
    const fullWh = settings.nominalVoltage * settings.ratedCapacityAh;
    const norm = Math.min(1, reading.energyWh / fullWh);
    const score = norm; // more stored energy = healthier
    add(1, score, 'Energy');
  }

  if (contributions.length === 0) {
    return { enoughData: false };
  }

  const totalWeight = contributions.reduce((s, c) => s + c.weight, 0);
  const weightedScore = contributions.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight;
  const score = Math.round(weightedScore * 100);

  let status = 'Critical';
  if (score >= 90) status = 'Excellent';
  else if (score >= 75) status = 'Good';
  else if (score >= 60) status = 'Fair';
  else if (score >= 40) status = 'Poor';

  const reason = contributions.map(c => c.reason).join(', ');
  return { score, status, reason, enoughData: true };
}

