// src/services/emailService.js
/**
 * EmailJS Notification Dispatcher.
 * Handles rate‑limited critical alerts, demo alerts and a periodic 10‑hour report.
 * Preserves existing functionality (test email, critical alert) while adding the new
 * requirements without altering any other workflow.
 */

import emailjs from "@emailjs/browser";

class EmailService {
  constructor() {
    this.lastAlertSentTimestamp = 0;
    this.lastAlertState = null;
    this.alertLog = [];
  }

  /** Retrieve EmailJS configuration (public key, service ID, template ID, recipient). */
  getConfig(settings = {}) {
    const publicKey = settings.emailjsPublicKey || import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";
    const serviceId = settings.emailjsServiceId || import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
    const templateId = settings.emailjsTemplateId || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
    const recipient = settings.emailRecipient || "";
    return {
      publicKey: publicKey.trim(),
      serviceId: serviceId.trim(),
      templateId: templateId.trim(),
      recipient: recipient.trim(),
      isConfigured: Boolean(publicKey.trim() && serviceId.trim() && templateId.trim() && recipient.trim()),
    };
  }

  /** Send a test email to verify credentials. */
  async sendTestEmail(settings) {
    const config = this.getConfig(settings);
    if (!config.isConfigured) {
      return { success: false, message: "EmailJS not configured. Provide keys and recipient." };
    }
    const templateParams = {
      to_email: config.recipient,
      recipient_email: config.recipient,
      subject: "Battery Health Monitoring – Test Email",
      alert_type: "TEST",
      message: "This is a test email from your Battery Health Monitoring app.",
      voltage: "3.85 V (test)",
      temperature: "25.0 °C (test)",
      timestamp: new Date().toLocaleString(),
    };
    try {
      await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
      this.logNotification({ type: "TEST", recipient: config.recipient, timestamp: new Date().toISOString(), success: true, reason: "test" });
      return { success: true, message: `Test email sent to ${config.recipient}` };
    } catch (err) {
      const errorMsg = err.text || err.message || "Email dispatch failed";
      this.logNotification({ type: "TEST", recipient: config.recipient, timestamp: new Date().toISOString(), success: false, reason: errorMsg });
      return { success: false, message: `Test failed: ${errorMsg}` };
    }
  }

  /** Critical alert with cooldown (default 15 min). */
  async checkAndSendCriticalAlert(reading, evaluation, settings) {
    const config = this.getConfig(settings);
    if (!config.isConfigured) return { sent: false, reason: "unconfigured" };
    if (evaluation.condition !== "critical") return { sent: false, reason: "not_critical" };
    const cooldownMs = (settings.emailAlertCooldownMinutes || 15) * 60 * 1000;
    const now = Date.now();
    if (this.lastAlertState === "critical" && now - this.lastAlertSentTimestamp < cooldownMs) {
      return { sent: false, reason: "cooldown" };
    }
    const templateParams = {
      to_email: config.recipient,
      recipient_email: config.recipient,
      subject: `CRITICAL ALERT: ${reading.voltage.toFixed(2)}V, ${reading.temperature.toFixed(1)}°C`,
      alert_type: "CRITICAL",
      message: evaluation.primaryReason,
      voltage: `${reading.voltage.toFixed(3)} V`,
      temperature: `${reading.temperature.toFixed(1)} °C`,
      timestamp: new Date(reading.timestamp).toLocaleString(),
      source: reading.source?.toUpperCase() || "UNKNOWN",
    };
    try {
      await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
      this.lastAlertSentTimestamp = now;
      this.lastAlertState = "critical";
      this.logNotification({ type: "CRITICAL", recipient: config.recipient, timestamp: new Date().toISOString(), success: true, reason: evaluation.primaryReason });
      return { sent: true, recipient: config.recipient };
    } catch (err) {
      const errorMsg = err.text || err.message || "Email dispatch failed";
      this.logNotification({ type: "CRITICAL", recipient: config.recipient, timestamp: new Date().toISOString(), success: false, reason: errorMsg });
      return { sent: false, reason: errorMsg };
    }
  }

  /** Demo alert for critical demo scenarios. */
  async sendDemoAlert(reading, evaluation, settings) {
    const config = this.getConfig(settings);
    if (!config.isConfigured) return { sent: false, reason: "unconfigured" };
    if (evaluation.condition !== "critical") return { sent: false, reason: "not_critical" };
    const templateParams = {
      to_email: config.recipient,
      recipient_email: config.recipient,
      subject: `DEMO ALERT: Critical Battery Condition (${reading.voltage.toFixed(2)}V, ${reading.temperature.toFixed(1)}°C)`,
      alert_type: "DEMO_CRITICAL",
      message: evaluation.primaryReason,
      voltage: `${reading.voltage.toFixed(3)} V`,
      temperature: `${reading.temperature.toFixed(1)} °C`,
      timestamp: new Date(reading.timestamp).toLocaleString(),
      source: "DEMO",
    };
    try {
      await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
      this.logNotification({ type: "DEMO", recipient: config.recipient, timestamp: new Date().toISOString(), success: true, reason: evaluation.primaryReason });
      return { sent: true, recipient: config.recipient };
    } catch (err) {
      const errorMsg = err.text || err.message || "Email dispatch failed";
      this.logNotification({ type: "DEMO", recipient: config.recipient, timestamp: new Date().toISOString(), success: false, reason: errorMsg });
      return { sent: false, reason: errorMsg };
    }
  }

  /** 10‑hour periodic report (hardware only). */
  async maybeSendPeriodicReport(reading, evaluation, settings) {
    const config = this.getConfig(settings);
    if (!config.isConfigured) return { sent: false, reason: "unconfigured" };
    if (reading.source !== "hardware") return { sent: false, reason: "non_hardware" };
    const now = Date.now();
    const last = Number(localStorage.getItem("lastPeriodicReport") || "0");
    const tenHoursMs = 10 * 60 * 60 * 1000;
    if (now - last < tenHoursMs) return { sent: false, reason: "cooldown" };
    const templateParams = {
      to_email: config.recipient,
      recipient_email: config.recipient,
      subject: `10‑Hour Battery Report – ${new Date(reading.timestamp).toLocaleString()}`,
      alert_type: "PERIODIC_REPORT",
      message: `Score: ${reading.healthScore ?? "N/A"} | Status: ${evaluation.condition?.toUpperCase() || "N/A"}`,
      voltage: reading.voltage != null ? `${reading.voltage.toFixed(3)} V` : "N/A",
      temperature: reading.temperature != null ? `${reading.temperature.toFixed(1)} °C` : "N/A",
      timestamp: new Date(reading.timestamp).toLocaleString(),
      source: reading.source.toUpperCase(),
    };
    try {
      await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
      localStorage.setItem("lastPeriodicReport", String(now));
      this.logNotification({ type: "PERIODIC", recipient: config.recipient, timestamp: new Date().toISOString(), success: true, reason: "10‑hour report sent" });
      return { sent: true, recipient: config.recipient };
    } catch (err) {
      const errorMsg = err.text || err.message || "Email dispatch failed";
      this.logNotification({ type: "PERIODIC", recipient: config.recipient, timestamp: new Date().toISOString(), success: false, reason: errorMsg });
      return { sent: false, reason: errorMsg };
    }
  }

  /** Simple in‑memory log for debugging / UI display. */
  logNotification(entry) {
    this.alertLog.unshift(entry);
    if (this.alertLog.length > 20) this.alertLog.pop();
  }

  getNotificationLog() {
    return [...this.alertLog];
  }
}

export const emailService = new EmailService();
