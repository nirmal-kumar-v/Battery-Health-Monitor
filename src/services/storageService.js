/**
 * Local Storage Persistence Service for Settings and Readings.
 */

import { DEFAULT_SETTINGS } from '../constants/defaults';

const SETTINGS_KEY = 'bhm_settings_v1';
const READINGS_KEY = 'bhm_readings_v1';
const MAX_STORED_READINGS = 150;

export const storageService = {
  loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.warn('Failed to parse stored settings:', err);
    }
    return { ...DEFAULT_SETTINGS };
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (err) {
      console.error('Failed to save settings to localStorage:', err);
      return false;
    }
  },

  loadReadings() {
    try {
      const stored = localStorage.getItem(READINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.slice(-MAX_STORED_READINGS);
        }
      }
    } catch (err) {
      console.warn('Failed to parse stored readings:', err);
    }
    return [];
  },

  saveReadings(readings) {
    try {
      const trimmed = readings.slice(-MAX_STORED_READINGS);
      localStorage.setItem(READINGS_KEY, JSON.stringify(trimmed));
      return true;
    } catch (err) {
      console.error('Failed to save readings to localStorage:', err);
      return false;
    }
  },

  clearAllData() {
    try {
      localStorage.removeItem(READINGS_KEY);
      return true;
    } catch {
      return false;
    }
  },
};
