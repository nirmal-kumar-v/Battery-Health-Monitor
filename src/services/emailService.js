/**
 * EmailJS Notification Dispatcher.
 * Handles rate-limited critical alert dispatches without duplicate flood emails.
 */

import emailjs from '@emailjs/browser';

class EmailService {
  constructor() {
    this.lastAlertSentTimestamp = 0;
    this.lastAlertState = null;
    this.alertLog = [];
  }

  getConfig(settings = {}) {
    const publicKey =
      settings.emailjsPublicKey ||
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY ||
      '';
    const serviceId =
      settings.emailjsServiceId ||
      import.meta.env.VITE_EMAILJS_SERVICE_ID ||
      '';
    const templateId =
      settings.emailjsTemplateId ||
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID ||
      '';
    const recipient = settings.emailRecipient || '';

    return {
      publicKey: publicKey.trim(),
      serviceId: serviceId.trim(),
      templateId: templateId.trim(),
      recipient: recipient.trim(),
      isConfigured: Boolean(
        publicKey.trim() && serviceId.trim() && templateId.trim() && recipient.trim()
      ),
    };
  }

  /**
   * Send a test email to verify credentials
   */
  async sendTestEmail(settings) {
    const config = this.getConfig(settings);

    if (!config.isConfigured) {
      return {
        success: false,
        message:
          'EmailJS is not fully configured. Please provide Service ID, Template ID, Public Key, and Recipient Email in Settings or .env file before testing.',
      };
    }

    const templateParams = {
      to_email: config.recipient,
      recipient_email: config.recipient,
      subject: 'Battery Health Monitoring System — Test Alert',
      alert_type: 'Test Verification',
      message:
        'This is a test notification from your Battery Health Monitoring System confirming that email alerts are properly configured and operational.',
      voltage: '3.85 V (Simulated Test)',
      temperature: '25.0 °C (Simulated Test)',
      timestamp: new Date().toLocaleString(),
    };

    try {
      await emailjs.send(
        config.serviceId,
        config.templateId,
        templateParams,
        config.publicKey
      );

      this.logNotification({
        type: 'TEST',
        recipient: config.recipient,
        timestamp: new Date().toISOString(),
        success: true,
        reason: 'Manual test verification',
      });

      return {
        success: true,
        message: `Test email successfully dispatched to ${config.recipient}!`,
      };
    } catch (err) {
      const errorMsg = err.text || err.message || 'EmailJS dispatch failed';
      this.logNotification({
        type: 'TEST',
        recipient: config.recipient,
        timestamp: new Date().toISOString(),
        success: false,
        reason: errorMsg,
      });

      return {
        success: false,
        message: `Email dispatch failed: ${errorMsg}. Check your EmailJS Service ID, Template ID, and Public Key.`,
      };
    }
  }

  /**
   * Dispatches critical alert notification if criteria and cooldown permit.
   * Prevents spamming repeated notifications for the same ongoing condition.
   */
  async checkAndSendCriticalAlert(reading, evaluation, settings) {
    const config = this.getConfig(settings);
    if (!config.isConfigured) {
      // Do not pretend emails were sent
      return { sent: false, reason: 'unconfigured' };
    }

    if (evaluation.condition !== 'critical') {
      // If condition returned to normal/warning, reset state so future critical events can re-trigger
      if (this.lastAlertState === 'critical') {
        this.lastAlertState = evaluation.condition;
      }
      return { sent: false, reason: 'not_critical' };
    }

    const cooldownMinutes = settings.emailAlertCooldownMinutes || 15;
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const now = Date.now();

    // Check if in cooldown
    if (this.lastAlertState === 'critical' && now - this.lastAlertSentTimestamp < cooldownMs) {
      const remainingMin = Math.ceil((cooldownMs - (now - this.lastAlertSentTimestamp)) / 60000);
      return {
        sent: false,
        reason: `Suppressed by cooldown (${remainingMin}m remaining to avoid repeated notification flood)`,
      };
    }

    // Prepare template params
    const templateParams = {
      to_email: config.recipient,
      recipient_email: config.recipient,
      subject: `CRITICAL ALERT: Battery Limit Exceeded (${reading.voltage.toFixed(2)}V, ${reading.temperature.toFixed(1)}°C)`,
      alert_type: 'CRITICAL SAFETY LIMIT VIOLATION',
      message: evaluation.primaryReason,
      voltage: `${reading.voltage.toFixed(3)} V`,
      temperature: `${reading.temperature.toFixed(1)} °C`,
      timestamp: new Date(reading.timestamp).toLocaleString(),
      source: reading.source.toUpperCase(),
    };

    try {
      await emailjs.send(
        config.serviceId,
        config.templateId,
        templateParams,
        config.publicKey
      );

      this.lastAlertSentTimestamp = now;
      this.lastAlertState = 'critical';

      this.logNotification({
        type: 'CRITICAL',
        recipient: config.recipient,
        timestamp: new Date().toISOString(),
        success: true,
        reason: evaluation.primaryReason,
      });

      return {
        sent: true,
        recipient: config.recipient,
      };
    } catch (err) {
      const errorMsg = err.text || err.message || 'Email dispatch failed';
      this.logNotification({
        type: 'CRITICAL',
        recipient: config.recipient,
        timestamp: new Date().toISOString(),
        success: false,
        reason: errorMsg,
      });

      return {
        sent: false,
        reason: errorMsg,
      };
    }
  }

  logNotification(entry) {
    this.alertLog.unshift(entry);
    if (this.alertLog.length > 20) {
      this.alertLog.pop();
    }
  }

  getNotificationLog() {
    return [...this.alertLog];
  }
}

export const emailService = new EmailService();
