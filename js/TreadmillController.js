// TreadmillController.js
// Wraps Web Bluetooth FTMS API logic.

const FTMS = {
  service: "00001826-0000-1000-8000-00805f9b34fb",
  fitshowPrivateService: "0000fd7e-0000-1000-8000-00805f9b34fb",
  treadmillData: "00002acd-0000-1000-8000-00805f9b34fb",
  supportedSpeedRange: "00002ad4-0000-1000-8000-00805f9b34fb",
  supportedInclinationRange: "00002ad5-0000-1000-8000-00805f9b34fb",
  controlPoint: "00002ad9-0000-1000-8000-00805f9b34fb",
  status: "00002ada-0000-1000-8000-00805f9b34fb",
};

const FTMS_OP = {
  requestControl: 0x00,
  reset: 0x01,
  setTargetSpeed: 0x02,
  setTargetInclination: 0x03,
  startResume: 0x07,
  stopPause: 0x08,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

class TreadmillController {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.controlPoint = null;
    
    this.controlGranted = false;
    this.actualSpeed = 0;
    this.actualIncline = 0; // if available
    this.connected = false;
    
    this.pendingCommands = new Map();
    this.writeQueue = Promise.resolve();
    this.onStatusChange = null;
    this.onDataUpdate = null;
    this.onLog = null;
    
    this._handleDisconnect = this._handleDisconnect.bind(this);
    this._handleControlPointResponse = this._handleControlPointResponse.bind(this);
    this._handleTreadmillData = this._handleTreadmillData.bind(this);
  }

  log(message) {
    if (this.onLog) this.onLog(message);
    console.log(`[Treadmill] ${message}`);
  }

  setStatus(connected, msg) {
    this.connected = connected;
    if (this.onStatusChange) this.onStatusChange(connected, msg);
  }

  _handleDisconnect() {
    this.log("Bluetooth disconnected.");
    this.server = null;
    this.service = null;
    this.controlPoint = null;
    this.controlGranted = false;
    this.pendingCommands.forEach((pending) => pending.reject(new Error("Bluetooth disconnected")));
    this.pendingCommands.clear();
    this.setStatus(false, "Rozłączono Bluetooth.");
  }

  _handleControlPointResponse(event) {
    const value = event.target.value;
    if (!value || value.byteLength < 3 || value.getUint8(0) !== 0x80) return;
    const requestOp = value.getUint8(1);
    const resultCode = value.getUint8(2);
    const pending = this.pendingCommands.get(requestOp);
    if (!pending) return;

    window.clearTimeout(pending.timeoutId);
    this.pendingCommands.delete(requestOp);

    if (resultCode === 0x01) {
      pending.resolve();
    } else {
      pending.reject(new Error(`FTMS odmówił komendy 0x${requestOp.toString(16)} kod ${resultCode}`));
    }
  }

  _handleTreadmillData(event) {
    const value = event.target.value;
    if (!value || value.byteLength < 4) return;
    const instantSpeed = value.getUint16(2, true) / 100;
    if (Number.isFinite(instantSpeed)) {
      this.actualSpeed = instantSpeed;
      if (this.onDataUpdate) this.onDataUpdate({ speed: this.actualSpeed });
    }
  }

  async _writeCommand(opcode, payload = []) {
    const execute = async () => {
      if (!this.controlPoint) {
        this.log("Brak FTMS Control Point.");
        return false;
      }

      const bytes = [opcode, ...payload];
      const value = new Uint8Array(bytes);
      
      try {
        if (this.controlPoint.writeValueWithResponse) {
          await this.controlPoint.writeValueWithResponse(value);
        } else {
          await this.controlPoint.writeValue(value);
        }
      } catch(e) {
        this.log(`Błąd zapisu BLE dla 0x${opcode.toString(16)}: ${e.message}`);
        return false;
      }

      return new Promise((resolve) => {
        let isDone = false;
        const timeoutId = window.setTimeout(() => {
          if (!isDone) {
            this.pendingCommands.delete(opcode);
            this.log(`Brak potw. FTMS dla komendy 0x${opcode.toString(16)}. Ignoruję i jadę dalej.`);
            resolve(true);
          }
        }, 500);
        
        this.pendingCommands.set(opcode, { 
          resolve: () => { isDone = true; window.clearTimeout(timeoutId); resolve(true); }, 
          reject: (err) => { isDone = true; window.clearTimeout(timeoutId); this.log(`Odmowa FTMS: ${err.message}`); resolve(false); }
        });
      });
    };

    return new Promise((resolve) => {
      this.writeQueue = this.writeQueue.then(async () => {
        const res = await execute();
        await new Promise(r => setTimeout(r, 1000)); // 1 sekunda opóźnienia
        resolve(res);
      }).catch(async () => {
        const res = await execute();
        await new Promise(r => setTimeout(r, 1000));
        resolve(res);
      });
    });
  }

  async connect() {
    if (!navigator.bluetooth) {
      throw new Error("Twoja przeglądarka nie obsługuje Web Bluetooth.");
    }
    
    this.log("Żądanie połączenia...");
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [FTMS.service] },
        { services: [FTMS.fitshowPrivateService] },
        { namePrefix: "FS-" },
        { namePrefix: "FS_" },
        { namePrefix: "ZIPRO" },
        { namePrefix: "FitShow" }
      ],
      optionalServices: [FTMS.service, FTMS.fitshowPrivateService],
    });
    
    this.device = device;
    this.log(`Wybrano urządzenie: ${device.name}`);
    device.addEventListener("gattserverdisconnected", this._handleDisconnect);

    const server = await device.gatt.connect();
    this.server = server;
    this.log("GATT połączony. Szukam FTMS...");

    try {
      this.service = await server.getPrimaryService(FTMS.service);
      this.log("FTMS service znaleziony.");
    } catch (e) {
      this.log(`FTMS niedostępny. Szukam prywatnej usługi FitShow...`);
      this.service = await server.getPrimaryService(FTMS.fitshowPrivateService);
      this.log("Prywatna usługa FitShow połączona. Brak gwarancji pełnego sterowania.");
      this.setStatus(true, "Połączono (FitShow)");
      return;
    }

    try {
      const treadmillData = await this.service.getCharacteristic(FTMS.treadmillData);
      await treadmillData.startNotifications();
      treadmillData.addEventListener("characteristicvaluechanged", this._handleTreadmillData);
    } catch (e) {
      this.log("Brak powiadomień Treadmill Data.");
    }

    try {
      this.controlPoint = await this.service.getCharacteristic(FTMS.controlPoint);
      await this.controlPoint.startNotifications();
      this.controlPoint.addEventListener("characteristicvaluechanged", this._handleControlPointResponse);
      this.log("Control Point dostepny.");
    } catch (e) {
      this.controlPoint = null;
      this.log("Control Point niedostępny - możliwy tylko odczyt.");
    }

    this.setStatus(true, "Połączono (Pełne sterowanie)");
  }

  async requestControl() {
    if (!this.controlPoint) return false;
    if (this.controlGranted) return true;
    
    await this._writeCommand(FTMS_OP.requestControl);
    this.controlGranted = true; // Zawsze zakładamy sukces dla opornych bieżni
    this.log("Wysłano żądanie kontroli.");
    return true;
  }

  async startTreadmill() {
    if (!await this.requestControl()) return;
    await this._writeCommand(FTMS_OP.startResume);
    this.log("Wysłano START.");
  }

  async stopTreadmill() {
    if (!await this.requestControl()) return;
    await this._writeCommand(FTMS_OP.stopPause, [0x01]);
    this.log("Wysłano STOP.");
  }

  async setTargetSpeed(speed) {
    if (!await this.requestControl()) return;
    const speedRaw = Math.round(clamp(Number(speed), 0, 20) * 100);
    await this._writeCommand(FTMS_OP.setTargetSpeed, [speedRaw & 0xff, (speedRaw >> 8) & 0xff]);
    this.log(`Wysłano docelową prędkość: ${speed} km/h`);
  }

  async setTargetIncline(incline) {
    await this.requestControl(); // Wymuś request przed nachyleniem
    this.log(`Wysyłanie nachylenia: ${incline}%`);
    
    const val = Math.round(incline * 10);
    // FTMS setTargetInclination requires SINT16. We send it as little-endian bytes.
    const payload1 = val & 0xff;
    const payload2 = (val >> 8) & 0xff;
    
    const success = await this._writeCommand(FTMS_OP.setTargetInclination, [payload1, payload2]);
    
    // Fallback dla niektórych tanich bieżni (wysyłka wartości bez mnożnika x10)
    if (success && incline > 0) {
      await new Promise(r => setTimeout(r, 500));
      const fallbackVal = Math.round(incline);
      const f1 = fallbackVal & 0xff;
      const f2 = (fallbackVal >> 8) & 0xff;
      await this._writeCommand(FTMS_OP.setTargetInclination, [f1, f2]);
    }
  }
}
