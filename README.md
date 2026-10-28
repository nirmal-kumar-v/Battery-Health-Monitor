# Battery Health Monitoring System — Engineering Telemetry Dashboard

A mobile-first, light engineering Progressive Web Application (PWA) built with **React**, **Vite**, **Vanilla CSS**, and **Lucide React**. Designed with a warm off-white, muted sage, and deep forest green palette for real-time battery telemetry, Chrome Web Serial USB connectivity, threshold-based operating condition estimation, and rate-of-change dynamics.

---

## 1. Quick Start & Local Execution

### Prerequisites
- Node.js (v18 or higher recommended)
- Google Chrome or Microsoft Edge (for Chrome Web Serial API support)

### Setup & Run Commands

```bash
# 1. Install dependencies
npm install

# 2. Build production bundle (verifies zero compilation or syntax errors)
npm run build

# 3. Start development server
npm run dev
```

The application will be served at:
**[http://127.0.0.1:5173/](http://127.0.0.1:5173/)** (or `http://localhost:5173/`)

---

## 2. Hardware Connection Guide (Chrome Web Serial API)

This dashboard communicates directly with microcontrollers (Arduino, ESP32, STM32, Raspberry Pi Pico) connected via USB using the standard **W3C Web Serial API** in Chromium browsers.

### Requirements:
- Desktop **Google Chrome** (v89+) or **Microsoft Edge** (v89+).
- *Mobile Note:* Web Serial API is currently experimental or unavailable in standard mobile browsers. On mobile, use **Demo Mode** or **Manual Injection** in the dashboard.

### Steps to Connect:
1. Connect your microcontroller to a computer USB port.
2. Open the dashboard at `http://127.0.0.1:5173/`.
3. In the header or action bar, select your microcontroller's baud rate (**9600** or **115200** baud in the Settings tab).
4. Click **Connect USB**.
5. A browser prompt will list the available serial/COM ports. Select your microcontroller and click **Connect**.
6. The dashboard will automatically transition to **Live USB** mode and parse incoming telemetry.

### Microcontroller Data Formats

The parser automatically detects and reads either of the following serial formats printed via `Serial.println()`:

#### Format A: Key-Value Tags (Recommended)
```text
V=3.82,T=28.4
```
*(Alternative syntax supported: `VOLT=3.82 TEMP=28.4` or `V: 3.82, T: 28.4`)*

#### Format B: Standard JSON
```json
{"voltage": 3.82, "temperature": 28.4}
```

### Example Arduino / ESP32 Firmware Sketch

```cpp
// Example Arduino/ESP32 Telemetry Sender
void setup() {
  Serial.begin(115200);
}

void loop() {
  // Read voltage via ADC with appropriate voltage divider
  float rawAdc = analogRead(A0);
  float voltage = (rawAdc / 1023.0) * 5.0; // Adjust for your divider ratio

  // Read temperature from analog thermistor or digital NTC/DS18B20 sensor
  float temperature = 26.5; 

  // Emit standard serial stream
  Serial.print("V=");
  Serial.print(voltage, 3);
  Serial.print(",T=");
  Serial.println(temperature, 1);

  delay(1000); // 1 Hz sample rate
}
```

---

## 3. Estimated Operating Condition vs. True State of Health (SoH)

> **Critical Engineering Disclosure:**
> The status displayed in this dashboard is strictly labeled as **Estimated Operating Condition** based on instantaneous terminal voltage ($V$) and cell temperature ($T$) evaluated against user-configurable limits.
>
> It **does not claim or represent true battery State of Health (SoH)** or remaining chemical capacity. True battery State of Health requires:
> - Full coulometric charge/discharge cycle integration (Coulomb counting).
> - Electrochemical Impedance Spectroscopy (EIS) to detect SEI layer growth and internal resistance ($R_{int}$).
> - Open-Circuit Voltage (OCV) relaxation curves evaluated after substantial resting periods.

### Configurable Operating Limit Rules

| Rule Name | Default Limit | Condition Triggered | Technical Explanation |
| :--- | :--- | :--- | :--- |
| **Under-Voltage Critical** | `< 3.00 V` | **Critical Alert** | Risk of copper dissolution and permanent cathode damage from deep discharge. |
| **Under-Voltage Warning** | `< 3.30 V` | **Warning State** | Cell approaching lower depth-of-discharge knee. |
| **Over-Voltage Warning** | `> 4.15 V` | **Warning State** | Approaching standard constant-voltage charging ceiling. |
| **Over-Voltage Critical** | `> 4.25 V` | **Critical Alert** | Hazard of electrolyte decomposition, plating, and thermal instability. |
| **Low Temperature Warning** | `< 10.0 °C` | **Warning State** | Reduced ionic conductivity; lithium plating risk if charged at high C-rates. |
| **High Temperature Warning** | `> 45.0 °C` | **Warning State** | Elevated heat dissipation; accelerated calendar aging. |
| **High Temperature Critical** | `> 55.0 °C` | **Critical Alert** | Extreme thermal hazard; risks separator integrity and thermal runaway. |

*All limits are user-configurable in the Settings tab to accommodate various cell chemistries (LiFePO4, NMC, LCO, LTO).*

---

## 4. Electrical Calculations & Dynamics

1. **Load Current & Power ($I = V / R, P = V \times I$):**
   - Active only when a known external ohmic load resistance $R$ ($\Omega$) is configured.
   - *Assumptions:* Assumes a purely resistive static load across terminal voltage. Lead wire drop and battery internal resistance ($R_{int}$) are neglected.
2. **Nominal Cell Energy ($E_{nom} = V_{nom} \times Ah$):**
   - Calculates the nominal energy storage in Watt-hours (Wh) from rated capacity.
3. **Rates of Change Dynamics ($dV/dt, dT/dt$):**
   - Computes rolling voltage drop rate ($\text{mV/min}$) and thermal rise rate ($^\circ\text{C/min}$) whenever two or more timestamped readings are recorded.

---

## 5. EmailJS Automated Critical Notifications

Critical threshold violations can trigger an automated email alert to a specified technician address.

### EmailJS Setup Steps:
1. Create a free account at [EmailJS](https://www.emailjs.com/).
2. Add an Email Service (e.g. Gmail or Outlook).
3. Create an Email Template containing the following template variables:
   - `{{to_email}}`
   - `{{subject}}`
   - `{{message}}`
   - `{{voltage}}`
   - `{{temperature}}`
   - `{{timestamp}}`
4. Set the credentials in a `.env` file or directly in the dashboard's **Settings tab**:
   ```env
   VITE_EMAILJS_PUBLIC_KEY="your_public_key"
   VITE_EMAILJS_SERVICE_ID="your_service_id"
   VITE_EMAILJS_TEMPLATE_ID="your_template_id"
   ```
5. Click **Send Test Verification Email** to verify delivery.
6. **Alert Throttling:** A configurable cooldown interval (default 15 minutes) ensures that ongoing critical alarms do not flood the inbox with duplicate emails.

---

## 6. Progressive Web App (PWA) & Offline Capabilities

- **Installation:** Click the **Install** button in the header (or browser address bar prompt) to install the app locally on Windows, macOS, Android, or iOS.
- **Service Worker (`sw.js`):** Caches the static application shell and icons for instant offline launches.
- **Offline Indicator:** When network connectivity is lost, an **Offline** badge appears. Previously recorded readings and user configurations remain accessible from local storage, while clearly indicating that live data streams require active connection.

---

## 7. Color Palette Reference

- **Main Background:** `#F5F7F2`
- **Surface / Card Background:** `#FFFFFF`
- **Primary Brand:** `#315C48`
- **Secondary Muted Green:** `#759582`
- **Soft Sage Surface:** `#E8EFE7`
- **Main Text:** `#25342C`
- **Secondary Text:** `#68776D`
- **Borders & Dividers:** `#DEE5DC`
- **Warning Accent:** `#B7792E`
- **Critical Alert:** `#B84F4F`
- **Information Accent:** `#527D85`
