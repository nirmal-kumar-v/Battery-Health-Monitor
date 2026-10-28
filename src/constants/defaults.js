/**
 * Default configurations, thresholds, and technical disclosures
 * for the Battery Health Monitoring System.
 */

export const DEFAULT_SETTINGS = {
  // Configurable Voltage Limits (Volts)
  voltageMinCritical: 3.00,
  voltageMinWarning: 3.30,
  voltageMaxWarning: 4.15,
  voltageMaxCritical: 4.25,

  // Configurable Temperature Limits (Degrees Celsius)
  tempMinWarning: 10.0,
  tempMaxWarning: 45.0,
  tempMaxCritical: 55.0,

  // Hardware Serial Settings
  baudRate: 115200,

  // Optional Electrical & Cell Specifications
  nominalVoltage: 3.70, // Standard Li-ion nominal voltage (V)
  ratedCapacityAh: 2.50, // Rated capacity (Ah) (e.g. 2500mAh 18650 cell)
  externalLoadOhms: 10.0, // Known external load resistance (Ohms), set null or number

  // EmailJS Configuration
  emailRecipient: '',
  emailjsPublicKey: '',
  emailjsServiceId: '',
  emailjsTemplateId: '',
  emailAlertCooldownMinutes: 15,
};

export const BAUD_RATES = [9600, 115200];

export const DATA_SOURCES = {
  HARDWARE: 'hardware',
  DEMO: 'demo',
  MANUAL: 'manual',
};

export const OPERATING_CONDITIONS = {
  NEUTRAL: 'neutral',
  NORMAL: 'normal',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

export const SOH_DISCLOSURE = {
  title: 'Engineering Disclaimer: Estimated Operating Condition vs. True State of Health (SoH)',
  description:
    'This system evaluates the instantaneous Operating Condition based strictly on real-time terminal voltage and ambient/surface temperature against user-defined safety limits. It does not measure chemical degradation, internal impedance (AC IR / DC ESR), SEI layer growth, or remaining usable capacity (Ah). True State of Health (SoH) requires full coulomb counting cycles, electrochemical impedance spectroscopy (EIS), or resting open-circuit voltage (OCV) relaxation curves.',
};
