const routePresets = {
  forest: {
    label: "Spacer po lesie",
    segments: [
      { from: 0, to: 180, label: "Lagodny start", speed: 4, incline: 1 },
      { from: 180, to: 420, label: "Sciezka w lesie", speed: 5, incline: 2 },
      { from: 420, to: 720, label: "Duze drzewa", speed: 5.5, incline: 3 },
      { from: 720, to: 1080, label: "Powrot", speed: 4.5, incline: 1 },
    ],
  },
  mountain: {
    label: "Podejscie w gorach",
    segments: [
      { from: 0, to: 150, label: "Dolina", speed: 4, incline: 1 },
      { from: 150, to: 420, label: "Poczatek podejscia", speed: 4.5, incline: 4 },
      { from: 420, to: 780, label: "Strome podejscie", speed: 4, incline: 7 },
      { from: 780, to: 1080, label: "Grzbiet", speed: 3.8, incline: 10 },
    ],
  },
  mountcook: {
    label: "Mount Cook 25 min",
    segments: [
      { from: 0, to: 240, label: "Start dolina", speed: 3.5, incline: 1 },
      { from: 240, to: 540, label: "Sciezka przy rzece", speed: 4, incline: 2 },
      { from: 540, to: 900, label: "Podejscie szutrowe", speed: 4.5, incline: 4 },
      { from: 900, to: 1200, label: "Gorski odcinek", speed: 4, incline: 6 },
      { from: 1200, to: 1500, label: "Koncowka trasy", speed: 3.5, incline: 3 },
    ],
  },
  intervals: {
    label: "Interwaly cardio",
    segments: [
      { from: 0, to: 120, label: "Rozgrzewka", speed: 4, incline: 1 },
      { from: 120, to: 240, label: "Szybki odcinek", speed: 8, incline: 2 },
      { from: 240, to: 360, label: "Podbieg", speed: 6, incline: 6 },
      { from: 360, to: 480, label: "Odpoczynek", speed: 4, incline: 1 },
    ],
  },
};

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

const defaultCustomSegments = [
  { duration: 5, label: "Start spokojny", speed: 5.5, incline: 1 },
  { duration: 5, label: "Tempo", speed: 6, incline: 2 },
  { duration: 2, label: "Bieg", speed: 8, incline: 2 },
  { duration: 3, label: "Odpoczynek", speed: 4.5, incline: 1 },
];

function loadCustomSegments() {
  try {
    const saved = JSON.parse(localStorage.getItem("bieznia.customSegments") || "[]");
    return Array.isArray(saved) && saved.length > 0 ? saved : defaultCustomSegments;
  } catch {
    return defaultCustomSegments;
  }
}

const state = {
  running: false,
  elapsedSeconds: 0,
  targetMinutes: Number(localStorage.getItem("bieznia.targetMinutes")) || 30,
  speed: Number(localStorage.getItem("bieznia.speed")) || 5,
  incline: Number(localStorage.getItem("bieznia.incline")) || 2,
  routePreset: localStorage.getItem("bieznia.routePreset") || "forest",
  autoIncline: localStorage.getItem("bieznia.autoIncline") !== "false",
  autoSpeed: localStorage.getItem("bieznia.autoSpeed") !== "false",
  customSegments: loadCustomSegments(),
  activeSegmentKey: "",
  audioUrl: null,
  videoUrl: null,
  youtubeVideoId: "",
  youtubeReady: false,
  bluetoothDevice: null,
  bluetoothServer: null,
  bluetoothService: null,
  bluetoothControlPoint: null,
  bluetoothControlGranted: false,
  bluetoothControlEnabled: false,
  startTreadmillWithProgram: localStorage.getItem("bieznia.startTreadmillWithProgram") === "true",
  bluetoothPending: new Map(),
  bluetoothLastCommandKey: "",
  bluetoothCommandInFlight: false,
  bluetoothQueuedTarget: null,
  treadmillActualSpeed: 0,
  targetRetryAt: 0,
};

const els = {
  clock: document.getElementById("clockValue"),
  remaining: document.getElementById("remainingValue"),
  targetBadge: document.getElementById("targetBadge"),
  durationValue: document.getElementById("durationValue"),
  startPauseButton: document.getElementById("startPauseButton"),
  startPauseIcon: document.getElementById("startPauseIcon"),
  startPauseLabel: document.getElementById("startPauseLabel"),
  resetButton: document.getElementById("resetButton"),
  speedValue: document.getElementById("speedValue"),
  inclineValue: document.getElementById("inclineValue"),
  distanceValue: document.getElementById("distanceValue"),
  caloriesValue: document.getElementById("caloriesValue"),
  paceValue: document.getElementById("paceValue"),
  progressBar: document.getElementById("progressBar"),
  phaseValue: document.getElementById("phaseValue"),
  phaseGoalValue: document.getElementById("phaseGoalValue"),
  speedGoalValue: document.getElementById("speedGoalValue"),
  inclineGoalValue: document.getElementById("inclineGoalValue"),
  routePreset: document.getElementById("routePreset"),
  routeSyncValue: document.getElementById("routeSyncValue"),
  autoInclineToggle: document.getElementById("autoInclineToggle"),
  autoSpeedToggle: document.getElementById("autoSpeedToggle"),
  routeSegmentValue: document.getElementById("routeSegmentValue"),
  routeInclineValue: document.getElementById("routeInclineValue"),
  routeSpeedValue: document.getElementById("routeSpeedValue"),
  routeTimeline: document.getElementById("routeTimeline"),
  routeNotice: document.getElementById("routeNotice"),
  routeStatus: document.getElementById("routeStatus"),
  programLabelInput: document.getElementById("programLabelInput"),
  programMinutesInput: document.getElementById("programMinutesInput"),
  programSpeedInput: document.getElementById("programSpeedInput"),
  programInclineInput: document.getElementById("programInclineInput"),
  addProgramSegmentButton: document.getElementById("addProgramSegmentButton"),
  useCustomProgramButton: document.getElementById("useCustomProgramButton"),
  clearProgramButton: document.getElementById("clearProgramButton"),
  customProgramList: document.getElementById("customProgramList"),
  programTotalValue: document.getElementById("programTotalValue"),
  dashboardView: document.getElementById("dashboardView"),
  videoView: document.getElementById("videoView"),
  dashboardTab: document.getElementById("dashboardTab"),
  videoTab: document.getElementById("videoTab"),
  audioInput: document.getElementById("audioInput"),
  videoInput: document.getElementById("videoInput"),
  audioName: document.getElementById("audioName"),
  videoName: document.getElementById("videoName"),
  audioStatus: document.getElementById("audioStatus"),
  videoStatus: document.getElementById("videoStatus"),
  audioPlayer: document.getElementById("audioPlayer"),
  previewVideo: document.getElementById("previewVideo"),
  mainVideo: document.getElementById("mainVideo"),
  videoEmpty: document.getElementById("videoEmpty"),
  youtubePlayer: document.getElementById("youtubePlayer"),
  youtubeUrlInput: document.getElementById("youtubeUrlInput"),
  youtubeName: document.getElementById("youtubeName"),
  youtubeStatus: document.getElementById("youtubeStatus"),
  loadYoutubeButton: document.getElementById("loadYoutubeButton"),
  loadMountCookButton: document.getElementById("loadMountCookButton"),
  connectBluetoothButton: document.getElementById("connectBluetoothButton"),
  scanAllBluetoothButton: document.getElementById("scanAllBluetoothButton"),
  clearBluetoothLogButton: document.getElementById("clearBluetoothLogButton"),
  bluetoothName: document.getElementById("bluetoothName"),
  bluetoothMessage: document.getElementById("bluetoothMessage"),
  bluetoothLog: document.getElementById("bluetoothLog"),
  bluetoothStatus: document.getElementById("bluetoothStatus"),
  bluetoothControlToggle: document.getElementById("bluetoothControlToggle"),
  startTreadmillWithProgramToggle: document.getElementById("startTreadmillWithProgramToggle"),
  requestControlButton: document.getElementById("requestControlButton"),
  startTreadmillButton: document.getElementById("startTreadmillButton"),
  sendCurrentTargetButton: document.getElementById("sendCurrentTargetButton"),
  stopTreadmillButton: document.getElementById("stopTreadmillButton"),
  controlStatus: document.getElementById("controlStatus"),
};

let timerId = null;
let routeSyncId = null;
let youtubeApiPromise = null;
let youtubePlayer = null;
let audioContext = null;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatClock(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildCustomRoute() {
  let cursor = 0;
  const segments = state.customSegments.map((segment) => {
    const durationSeconds = Math.max(30, Number(segment.duration) * 60);
    const built = {
      from: cursor,
      to: cursor + durationSeconds,
      label: segment.label || "Odcinek",
      speed: Number(segment.speed) || 0,
      incline: Number(segment.incline) || 0,
    };
    cursor += durationSeconds;
    return built;
  });

  return {
    label: "Wlasny program",
    segments: segments.length > 0 ? segments : [{ from: 0, to: 300, label: "Odcinek", speed: 5, incline: 1 }],
  };
}

function getActiveRoutePreset() {
  if (state.routePreset === "custom") return buildCustomRoute();
  return routePresets[state.routePreset] || routePresets.forest;
}

function getCustomProgramMinutes() {
  return state.customSegments.reduce((total, segment) => total + Number(segment.duration || 0), 0);
}

function getRouteTime() {
  if (youtubePlayer && state.youtubeReady && typeof youtubePlayer.getCurrentTime === "function") {
    const youtubeTime = Number(youtubePlayer.getCurrentTime());
    if (Number.isFinite(youtubeTime) && youtubeTime > 0) return youtubeTime;
  }
  if (!els.mainVideo.hidden && els.mainVideo.src && Number.isFinite(els.mainVideo.currentTime) && els.mainVideo.currentTime > 0) {
    return els.mainVideo.currentTime;
  }
  return state.elapsedSeconds;
}

function getRouteSegment(timeSeconds = getRouteTime()) {
  const preset = getActiveRoutePreset();
  const routeLength = preset.segments[preset.segments.length - 1].to;
  const routedTime = routeLength > 0 ? timeSeconds % routeLength : 0;
  return preset.segments.find((segment) => routedTime >= segment.from && routedTime < segment.to) || preset.segments[0];
}

function saveSettings() {
  localStorage.setItem("bieznia.targetMinutes", String(state.targetMinutes));
  localStorage.setItem("bieznia.speed", String(state.speed));
  localStorage.setItem("bieznia.incline", String(state.incline));
  localStorage.setItem("bieznia.routePreset", state.routePreset);
  localStorage.setItem("bieznia.autoIncline", String(state.autoIncline));
  localStorage.setItem("bieznia.autoSpeed", String(state.autoSpeed));
  localStorage.setItem("bieznia.startTreadmillWithProgram", String(state.startTreadmillWithProgram));
  localStorage.setItem("bieznia.customSegments", JSON.stringify(state.customSegments));
}

function beep() {
  try {
    audioContext = audioContext || new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 740;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.14);
  } catch {
    // Some browsers block audio until the user interacts. The visual notice still updates.
  }
}

function setBluetoothMessage(message) {
  els.bluetoothMessage.textContent = message;
  addBluetoothLog(message);
}

function addBluetoothLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const line = `[${timestamp}] ${message}`;
  els.bluetoothLog.textContent = els.bluetoothLog.textContent === "Gotowe do skanowania."
    ? line
    : `${els.bluetoothLog.textContent}\n${line}`;
  els.bluetoothLog.scrollTop = els.bluetoothLog.scrollHeight;
}

function explainBluetoothError(error) {
  const message = error?.message || String(error || "");
  if (message.includes("User cancelled")) return "Anulowano wybór urządzenia.";
  if (message.includes("No Services matching UUID") || message.includes("No Characteristics matching UUID")) {
    return "Wybrane urządzenie nie udostępnia szukanej usługi. Jeśli log pokazuje 0xFD7E, to prywatny protokol FitShow zamiast standardowego FTMS.";
  }
  if (message.includes("GATT Server is disconnected")) return "Urządzenie rozłączyło GATT. Wyłącz FitShow/Kinomap i spróbuj ponownie z bliska.";
  if (message.includes("Bluetooth adapter not available")) return "Bluetooth w komputerze/przeglądarce jest niedostępny.";
  if (message.includes("not found")) return "Nie znaleziono urządzenia. Włącz bieżnię, podejdź bliżej i zamknij FitShow/Kinomap.";
  return message || "Nieznany błąd Bluetooth.";
}

function setBluetoothOnline(online) {
  els.bluetoothStatus.textContent = online ? "Online" : "Offline";
  els.bluetoothName.textContent = online && state.bluetoothDevice
    ? state.bluetoothDevice.name || state.bluetoothDevice.id || "FTMS treadmill"
    : "Nie polaczono";
}

function handleBluetoothDisconnect() {
  state.bluetoothServer = null;
  state.bluetoothService = null;
  state.bluetoothControlPoint = null;
  state.bluetoothControlGranted = false;
  state.bluetoothControlEnabled = false;
  state.bluetoothLastCommandKey = "";
  state.bluetoothPending.forEach((pending) => pending.reject(new Error("Bluetooth disconnected")));
  state.bluetoothPending.clear();
  setBluetoothOnline(false);
  setBluetoothMessage("Rozlaczono Bluetooth.");
  render();
}

function toDataView(bytes) {
  return new DataView(new Uint8Array(bytes).buffer);
}

function parseSupportedRange(value, scale, signed = false) {
  if (!value || value.byteLength < 6) return "";
  const min = signed ? value.getInt16(0, true) : value.getUint16(0, true);
  const max = signed ? value.getInt16(2, true) : value.getUint16(2, true);
  const step = signed ? value.getInt16(4, true) : value.getUint16(4, true);
  return `${min / scale}-${max / scale}, krok ${step / scale}`;
}

function handleControlPointResponse(event) {
  const value = event.target.value;
  if (!value || value.byteLength < 3 || value.getUint8(0) !== 0x80) return;
  const requestOp = value.getUint8(1);
  const resultCode = value.getUint8(2);
  const pending = state.bluetoothPending.get(requestOp);
  if (!pending) return;

  window.clearTimeout(pending.timeoutId);
  state.bluetoothPending.delete(requestOp);

  if (resultCode === 0x01) {
    pending.resolve();
    return;
  }
  pending.reject(new Error(`FTMS odmowil komendy 0x${requestOp.toString(16)} kod ${resultCode}`));
}

async function writeFtmsCommand(opcode, payload = []) {
  if (!state.bluetoothControlPoint) throw new Error("Brak FTMS Control Point.");

  const bytes = [opcode, ...payload];
  const responsePromise = new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      state.bluetoothPending.delete(opcode);
      reject(new Error(`Brak odpowiedzi FTMS dla komendy 0x${opcode.toString(16)}.`));
    }, 4000);
    state.bluetoothPending.set(opcode, { resolve, reject, timeoutId });
  });

  const value = new Uint8Array(bytes);
  if (state.bluetoothControlPoint.writeValueWithResponse) {
    await state.bluetoothControlPoint.writeValueWithResponse(value);
  } else {
    await state.bluetoothControlPoint.writeValue(value);
  }
  return responsePromise;
}

async function requestBluetoothControl() {
  if (!state.bluetoothControlPoint) {
    setBluetoothMessage("Najpierw polacz bieznie przez Bluetooth.");
    return false;
  }
  try {
    await writeFtmsCommand(FTMS_OP.requestControl);
    state.bluetoothControlGranted = true;
    setBluetoothMessage("Kontrola FTMS przyznana. Mozesz wysylac cele predkosci i nachylenia.");
    render();
    return true;
  } catch (error) {
    state.bluetoothControlGranted = false;
    setBluetoothMessage(error.message || "Nie udalo sie przejac kontroli.");
    render();
    return false;
  }
}

async function ensureBluetoothControl() {
  if (!state.bluetoothControlEnabled) return false;
  if (state.bluetoothControlGranted) return true;
  return requestBluetoothControl();
}

async function sendTargetToTreadmill(speed, incline, force = false) {
  if (!state.bluetoothControlEnabled) return;
  const commandKey = `${Number(speed).toFixed(1)}:${Math.round(Number(incline))}`;
  if (!force && state.bluetoothLastCommandKey === commandKey) return;

  if (state.bluetoothCommandInFlight) {
    state.bluetoothQueuedTarget = { speed, incline, force };
    addBluetoothLog(`Kolejkuje cel: ${Number(speed).toFixed(1)} km/h, ${Math.round(Number(incline))}%.`);
    return;
  }

  const hasControl = await ensureBluetoothControl();
  if (!hasControl) return;

  state.bluetoothCommandInFlight = true;
  try {
    const speedRaw = Math.round(clamp(Number(speed), 0, 20) * 100);
    await writeFtmsCommand(FTMS_OP.setTargetSpeed, [speedRaw & 0xff, (speedRaw >> 8) & 0xff]);

    const inclineRaw = Math.round(clamp(Number(incline), 0, 20) * 10);
    await writeFtmsCommand(FTMS_OP.setTargetInclination, [inclineRaw & 0xff, (inclineRaw >> 8) & 0xff]);

    state.bluetoothLastCommandKey = commandKey;
    setBluetoothMessage(`Wyslano do biezni: ${Number(speed).toFixed(1)} km/h, ${Math.round(Number(incline))}%.`);
  } catch (error) {
    state.bluetoothLastCommandKey = "";
    setBluetoothMessage(error.message || "Nie udalo sie wyslac celu do biezni.");
  } finally {
    state.bluetoothCommandInFlight = false;
  }

  if (state.bluetoothQueuedTarget) {
    const queued = state.bluetoothQueuedTarget;
    state.bluetoothQueuedTarget = null;
    void sendTargetToTreadmill(queued.speed, queued.incline, queued.force);
  }
  render();
}

async function stopTreadmill() {
  const hasControl = await ensureBluetoothControl();
  if (!hasControl) return;
  try {
    await writeFtmsCommand(FTMS_OP.stopPause, [0x01]);
    setBluetoothMessage("Wyslano STOP do biezni.");
  } catch (error) {
    setBluetoothMessage(error.message || "Nie udalo sie zatrzymac biezni przez FTMS.");
  }
}

async function startTreadmill() {
  const hasControl = await ensureBluetoothControl();
  if (!hasControl) return;
  try {
    await writeFtmsCommand(FTMS_OP.startResume);
    state.bluetoothLastCommandKey = "";
    setBluetoothMessage("Wyslano START do biezni. Za chwile wysylam cel programu.");
    await wait(800);
    await sendTargetToTreadmill(state.speed, state.incline, true);
    await wait(1200);
    await sendTargetToTreadmill(state.speed, state.incline, true);
    setBluetoothMessage(`START aktywny: cel ${Number(state.speed).toFixed(1)} km/h, ${Math.round(Number(state.incline))}%.`);
  } catch (error) {
    setBluetoothMessage(error.message || "Nie udalo sie uruchomic biezni przez FTMS.");
  }
}

function handleTreadmillData(event) {
  const value = event.target.value;
  if (!value || value.byteLength < 4) return;
  const instantSpeed = value.getUint16(2, true) / 100;
  if (Number.isFinite(instantSpeed)) {
    state.treadmillActualSpeed = instantSpeed;
    els.bluetoothStatus.textContent = `Online ${instantSpeed.toFixed(1)} km/h`;
  }
}

async function inspectFitshowPrivateService(server) {
  addBluetoothLog("FTMS 0x1826 nie znaleziony. Szukam prywatnej uslugi FitShow 0xFD7E...");
  const privateService = await server.getPrimaryService(FTMS.fitshowPrivateService);
  setBluetoothOnline(true);
  state.bluetoothService = privateService;
  state.bluetoothControlPoint = null;
  state.bluetoothControlGranted = false;
  state.bluetoothControlEnabled = false;

  addBluetoothLog("Znaleziono prywatna usluge FitShow 0xFD7E.");
  try {
    const characteristics = await privateService.getCharacteristics();
    if (characteristics.length === 0) {
      addBluetoothLog("Usluga 0xFD7E nie pokazala charakterystyk.");
    } else {
      characteristics.forEach((characteristic) => {
        const props = characteristic.properties;
        const flags = [
          props.read && "read",
          props.write && "write",
          props.writeWithoutResponse && "writeNoResp",
          props.notify && "notify",
          props.indicate && "indicate",
        ].filter(Boolean).join(",");
        addBluetoothLog(`FD7E characteristic: ${characteristic.uuid} [${flags}]`);
      });
    }
  } catch (error) {
    addBluetoothLog(`Nie moge wylistowac charakterystyk FD7E: ${error?.message || error}`);
  }

  setBluetoothMessage("Polaczono z prywatnym FitShow 0xFD7E, ale to nie jest standard FTMS. Sterowanie wymaga rozpoznania prywatnego protokolu.");
  render();
}

async function connectBluetooth(scanAll = false) {
  if (!navigator.bluetooth) {
    setBluetoothMessage("Ta przegladarka nie obsluguje Web Bluetooth. Uzyj Chrome albo Edge na komputerze z Bluetooth.");
    return;
  }

  try {
    setBluetoothMessage(scanAll
      ? "Tryb awaryjny: wybierz FS-78D82E albo urzadzenie podobne do ZIPRO, FitShow, FS, RZ."
      : "Wybierz FS-78D82E albo bieznie ZIPRO/FitShow/FTMS w oknie Bluetooth.");

    const requestOptions = scanAll
      ? {
          acceptAllDevices: true,
          optionalServices: [FTMS.service, FTMS.fitshowPrivateService],
        }
      : {
          filters: [
            { services: [FTMS.service] },
            { services: [FTMS.fitshowPrivateService] },
            { name: "FS-78D82E" },
            { namePrefix: "FS-" },
            { namePrefix: "FS_" },
            { namePrefix: "FS" },
            { namePrefix: "RZ" },
            { namePrefix: "FIT" },
            { namePrefix: "Fit" },
            { namePrefix: "FitShow" },
            { namePrefix: "ZIPRO" },
          ],
          optionalServices: [FTMS.service, FTMS.fitshowPrivateService],
        };

    addBluetoothLog(`requestDevice: ${scanAll ? "acceptAllDevices" : "FTMS/name filters"}`);
    const device = await navigator.bluetooth.requestDevice(requestOptions);
    state.bluetoothDevice = device;
    addBluetoothLog(`Wybrano: ${device.name || "(bez nazwy)"} / ${device.id || "no-id"}`);
    device.addEventListener("gattserverdisconnected", handleBluetoothDisconnect);

    addBluetoothLog("Laczenie z GATT...");
    const server = await device.gatt.connect();
    addBluetoothLog("GATT polaczony. Szukam Fitness Machine Service 0x1826...");
    let service = null;
    try {
      service = await server.getPrimaryService(FTMS.service);
    } catch (ftmsError) {
      addBluetoothLog(`FTMS niedostepny: ${ftmsError?.message || ftmsError}`);
      await inspectFitshowPrivateService(server);
      return;
    }
    state.bluetoothServer = server;
    state.bluetoothService = service;
    setBluetoothOnline(true);
    addBluetoothLog("FTMS service znaleziony.");

    try {
      const speedRange = await service.getCharacteristic(FTMS.supportedSpeedRange);
      const speedRangeText = parseSupportedRange(await speedRange.readValue(), 100);
      if (speedRangeText) setBluetoothMessage(`Polaczono. Zakres predkosci: ${speedRangeText}.`);
    } catch {
      setBluetoothMessage("Polaczono. Brak odczytu zakresu predkosci.");
    }

    try {
      const inclineRange = await service.getCharacteristic(FTMS.supportedInclinationRange);
      const inclineText = parseSupportedRange(await inclineRange.readValue(), 10, true);
      if (inclineText) setBluetoothMessage(`${els.bluetoothMessage.textContent} Nachylenie: ${inclineText}.`);
    } catch {
      // Some treadmills expose speed control but no inclination characteristic.
      addBluetoothLog("Brak Supported Inclination Range albo brak uprawnien odczytu.");
    }

    try {
      const treadmillData = await service.getCharacteristic(FTMS.treadmillData);
      await treadmillData.startNotifications();
      treadmillData.addEventListener("characteristicvaluechanged", handleTreadmillData);
    } catch {
      // Diagnostics can still continue without data notifications.
      addBluetoothLog("Brak powiadomien Treadmill Data albo brak uprawnien.");
    }

    try {
      const controlPoint = await service.getCharacteristic(FTMS.controlPoint);
      state.bluetoothControlPoint = controlPoint;
      await controlPoint.startNotifications();
      controlPoint.addEventListener("characteristicvaluechanged", handleControlPointResponse);
      setBluetoothMessage(`${els.bluetoothMessage.textContent} Control Point dostepny.`);
    } catch {
      state.bluetoothControlPoint = null;
      setBluetoothMessage(`${els.bluetoothMessage.textContent} Control Point niedostepny - mozliwy tylko odczyt.`);
    }

    render();
  } catch (error) {
    setBluetoothMessage(explainBluetoothError(error));
    addBluetoothLog(`Raw error: ${error?.name || "Error"} ${error?.message || error}`);
    setBluetoothOnline(false);
    render();
  }
}

function renderRouteTimeline(activeSegment) {
  const preset = getActiveRoutePreset();
  els.routeTimeline.innerHTML = "";
  preset.segments.forEach((segment) => {
    const node = document.createElement("div");
    node.className = `route-step${segment === activeSegment ? " active" : ""}`;
    node.innerHTML = `<span>${formatClock(segment.from)}-${formatClock(segment.to)}</span><strong>${segment.label}</strong><span>${segment.incline}% / ${segment.speed} km/h</span>`;
    els.routeTimeline.appendChild(node);
  });
}

function renderCustomProgram() {
  const totalMinutes = getCustomProgramMinutes();
  els.programTotalValue.textContent = `${totalMinutes.toFixed(totalMinutes % 1 ? 1 : 0)} min`;
  els.customProgramList.innerHTML = "";

  if (state.customSegments.length === 0) {
    const empty = document.createElement("div");
    empty.className = "custom-program-item";
    empty.innerHTML = "<span>0</span><strong>Dodaj pierwszy odcinek programu</strong><span></span>";
    els.customProgramList.appendChild(empty);
    return;
  }

  state.customSegments.forEach((segment, index) => {
    const node = document.createElement("div");
    node.className = "custom-program-item";
    node.innerHTML = `
      <span>${index + 1}</span>
      <strong>${escapeHtml(segment.label)} - ${segment.duration} min / ${segment.speed} km/h / ${segment.incline}%</strong>
      <button class="remove-program-segment" type="button" data-remove-segment="${index}" aria-label="Usun odcinek">x</button>
    `;
    els.customProgramList.appendChild(node);
  });

  els.customProgramList.querySelectorAll("[data-remove-segment]").forEach((button) => {
    button.addEventListener("click", () => {
      state.customSegments.splice(Number(button.dataset.removeSegment), 1);
      if (state.customSegments.length === 0) state.customSegments = [...defaultCustomSegments];
      saveSettings();
      render();
    });
  });
}

function syncRoute() {
  const segment = getRouteSegment();
  const segmentKey = `${state.routePreset}:${segment.from}:${segment.speed}:${segment.incline}`;
  const changed = state.activeSegmentKey && state.activeSegmentKey !== segmentKey;
  state.activeSegmentKey = segmentKey;

  if (state.autoSpeed) {
    state.speed = segment.speed;
  }
  if (state.autoIncline) {
    state.incline = segment.incline;
  }

  els.routeSegmentValue.textContent = segment.label;
  els.routeInclineValue.textContent = `${segment.incline}%`;
  els.routeSpeedValue.textContent = `${segment.speed} km/h`;
  els.phaseValue.textContent = segment.label;
  els.phaseGoalValue.textContent = segment.label;
  els.speedGoalValue.textContent = `${segment.speed} km/h`;
  els.inclineGoalValue.textContent = `${segment.incline}%`;
  els.routeNotice.textContent = changed
    ? `Zmien odcinek: ustaw ${segment.speed} km/h i nachylenie ${segment.incline}% na panelu biezni.`
    : "Aplikacja nie steruje silnikiem. Zmieniaj realna predkosc i nachylenie przyciskami biezni.";
  els.routeSyncValue.textContent = state.youtubeReady ? "YouTube" : els.mainVideo.src ? "Wideo" : "Timer";
  els.routeStatus.textContent = state.autoSpeed || state.autoIncline ? "Auto" : "Podpowiedz";
  renderRouteTimeline(segment);
  renderCustomProgram();

  if (changed) {
    beep();
    void sendTargetToTreadmill(segment.speed, segment.incline);
  }
  if (state.running && state.bluetoothControlEnabled) {
    void sendTargetToTreadmill(segment.speed, segment.incline);
    const speedDiff = Math.abs(Number(state.treadmillActualSpeed || 0) - Number(segment.speed));
    const canRetry = Date.now() > state.targetRetryAt;
    if (state.treadmillActualSpeed > 0 && speedDiff > 0.3 && canRetry) {
      state.targetRetryAt = Date.now() + 5000;
      addBluetoothLog(`Korekta celu: biezna pokazuje ${state.treadmillActualSpeed.toFixed(1)} km/h, program chce ${Number(segment.speed).toFixed(1)} km/h.`);
      void sendTargetToTreadmill(segment.speed, segment.incline, true);
    }
  }
}

function render() {
  syncRoute();

  const targetSeconds = state.targetMinutes * 60;
  const remainingSeconds = Math.max(targetSeconds - state.elapsedSeconds, 0);
  const distance = (state.speed * state.elapsedSeconds) / 3600;
  const calories = Math.round((state.speed * 8.5 + state.incline * 3.8) * (state.elapsedSeconds / 3600) * 8);
  const pace = state.speed > 0 ? 60 / state.speed : 0;
  const progress = clamp((state.elapsedSeconds / targetSeconds) * 100, 0, 100);

  els.clock.value = formatClock(state.elapsedSeconds);
  els.remaining.textContent = formatClock(remainingSeconds);
  els.targetBadge.textContent = `Cel ${state.targetMinutes} min`;
  els.durationValue.textContent = `${state.targetMinutes} min`;
  els.speedValue.value = state.speed.toFixed(1);
  els.inclineValue.value = String(state.incline);
  els.distanceValue.textContent = `${distance.toFixed(2)} km`;
  els.caloriesValue.textContent = `${calories} kcal`;
  els.paceValue.textContent = pace ? `${pace.toFixed(1)} min/km` : "--";
  els.progressBar.style.width = `${progress}%`;
  els.startPauseIcon.textContent = state.running ? "||" : ">";
  els.startPauseLabel.textContent = state.running
    ? "Pauza"
    : state.startTreadmillWithProgram
      ? "Start trasy"
      : "Start";
  els.autoInclineToggle.checked = state.autoIncline;
  els.autoSpeedToggle.checked = state.autoSpeed;
  els.bluetoothControlToggle.checked = state.bluetoothControlEnabled;
  els.startTreadmillWithProgramToggle.checked = state.startTreadmillWithProgram;
  els.routePreset.value = state.routePreset;
  els.controlStatus.textContent = state.bluetoothControlEnabled
    ? state.bluetoothControlGranted
      ? "FTMS aktywne"
      : "Czeka"
    : "Wylaczone";

  document.querySelectorAll("[data-speed]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.speed) === state.speed);
  });
  document.querySelectorAll("[data-incline]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.incline) === state.incline);
  });
  document.querySelectorAll("[data-duration]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.duration) === state.targetMinutes);
  });
}

function startTimer() {
  if (!timerId) {
    timerId = window.setInterval(() => {
      state.elapsedSeconds += 1;
      render();
    }, 1000);
  }
  if (!routeSyncId) {
    routeSyncId = window.setInterval(render, 1000);
  }
}

function stopTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
  if (routeSyncId) {
    window.clearInterval(routeSyncId);
    routeSyncId = null;
  }
}

function setView(view) {
  const showVideo = view === "video";
  els.dashboardView.hidden = showVideo;
  els.videoView.hidden = !showVideo;
  els.dashboardTab.classList.toggle("active", !showVideo);
  els.videoTab.classList.toggle("active", showVideo);
}

function showLocalVideo() {
  els.mainVideo.hidden = false;
  els.youtubePlayer.classList.remove("active");
  els.videoEmpty.hidden = true;
}

function showYoutube() {
  els.mainVideo.hidden = true;
  els.youtubePlayer.classList.add("active");
  els.videoEmpty.hidden = true;
}

function extractYoutubeId(input) {
  const value = input.trim();
  if (!value) return "";
  const direct = value.match(/^[a-zA-Z0-9_-]{11}$/);
  if (direct) return value;

  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.replace("/", "").slice(0, 11);
    if (url.searchParams.get("v")) return url.searchParams.get("v").slice(0, 11);
    const embedMatch = url.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[2];
  } catch {
    return "";
  }
  return "";
}

function loadYoutubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === "function") previousReady();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

async function loadYoutubeVideo() {
  const videoId = extractYoutubeId(els.youtubeUrlInput.value);
  if (!videoId) {
    els.youtubeName.textContent = "Nieprawidlowy link";
    els.youtubeStatus.textContent = "Blad";
    return;
  }

  state.youtubeVideoId = videoId;
  state.youtubeReady = false;
  els.youtubeName.textContent = `YouTube: ${videoId}`;
  els.youtubeStatus.textContent = "Ladowanie";
  showYoutube();
  setView("video");

  const YT = await loadYoutubeApi();
  if (youtubePlayer) {
    youtubePlayer.loadVideoById(videoId);
  } else {
    youtubePlayer = new YT.Player("youtubePlayer", {
      videoId,
      playerVars: {
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => {
          state.youtubeReady = true;
          els.youtubeStatus.textContent = "Gotowy";
          render();
        },
        onStateChange: () => render(),
      },
    });
  }
}

els.startPauseButton.addEventListener("click", () => {
  state.running = !state.running;
  if (state.running) {
    startTimer();
    if (youtubePlayer && state.youtubeReady && youtubePlayer.playVideo) youtubePlayer.playVideo();
    if (!els.mainVideo.hidden && els.mainVideo.src) els.mainVideo.play().catch(() => {});
    if (state.startTreadmillWithProgram) {
      state.bluetoothControlEnabled = true;
      void startTreadmill();
    } else {
      void sendTargetToTreadmill(state.speed, state.incline, true);
    }
  } else {
    stopTimer();
    if (youtubePlayer && state.youtubeReady && youtubePlayer.pauseVideo) youtubePlayer.pauseVideo();
    if (!els.mainVideo.hidden && els.mainVideo.src) els.mainVideo.pause();
    if (state.bluetoothControlEnabled && state.bluetoothControlGranted) void stopTreadmill();
  }
  render();
});

els.resetButton.addEventListener("click", () => {
  state.running = false;
  state.elapsedSeconds = 0;
  stopTimer();
  if (youtubePlayer && state.youtubeReady && youtubePlayer.seekTo) youtubePlayer.seekTo(0, true);
  if (els.mainVideo.src) els.mainVideo.currentTime = 0;
  state.activeSegmentKey = "";
  render();
});

document.querySelectorAll("[data-speed-step]").forEach((button) => {
  button.addEventListener("click", () => {
    state.speed = clamp(Number((state.speed + Number(button.dataset.speedStep)).toFixed(1)), 0, 16);
    state.autoSpeed = false;
    saveSettings();
    render();
    void sendTargetToTreadmill(state.speed, state.incline, true);
  });
});

document.querySelectorAll("[data-incline-step]").forEach((button) => {
  button.addEventListener("click", () => {
    state.incline = clamp(state.incline + Number(button.dataset.inclineStep), 0, 12);
    state.autoIncline = false;
    saveSettings();
    render();
    void sendTargetToTreadmill(state.speed, state.incline, true);
  });
});

document.querySelectorAll("[data-speed]").forEach((button) => {
  button.addEventListener("click", () => {
    state.speed = Number(button.dataset.speed);
    state.autoSpeed = false;
    saveSettings();
    render();
    void sendTargetToTreadmill(state.speed, state.incline, true);
  });
});

document.querySelectorAll("[data-incline]").forEach((button) => {
  button.addEventListener("click", () => {
    state.incline = Number(button.dataset.incline);
    state.autoIncline = false;
    saveSettings();
    render();
    void sendTargetToTreadmill(state.speed, state.incline, true);
  });
});

document.querySelectorAll("[data-duration]").forEach((button) => {
  button.addEventListener("click", () => {
    state.targetMinutes = Number(button.dataset.duration);
    saveSettings();
    render();
  });
});

els.routePreset.addEventListener("change", () => {
  state.routePreset = els.routePreset.value;
  state.activeSegmentKey = "";
  if (state.routePreset === "custom") {
    const totalMinutes = getCustomProgramMinutes();
    if (totalMinutes > 0) state.targetMinutes = totalMinutes;
  }
  saveSettings();
  render();
});

els.autoSpeedToggle.addEventListener("change", () => {
  state.autoSpeed = els.autoSpeedToggle.checked;
  saveSettings();
  render();
});

els.autoInclineToggle.addEventListener("change", () => {
  state.autoIncline = els.autoInclineToggle.checked;
  saveSettings();
  render();
});

els.connectBluetoothButton.addEventListener("click", () => connectBluetooth(false));
els.scanAllBluetoothButton.addEventListener("click", () => connectBluetooth(true));
els.clearBluetoothLogButton.addEventListener("click", () => {
  els.bluetoothLog.textContent = "Gotowe do skanowania.";
});

els.bluetoothControlToggle.addEventListener("change", () => {
  state.bluetoothControlEnabled = els.bluetoothControlToggle.checked;
  if (!state.bluetoothControlEnabled) {
    state.bluetoothControlGranted = false;
    state.bluetoothLastCommandKey = "";
    setBluetoothMessage("Sterowanie FTMS wylaczone. Polaczenie moze pozostac aktywne do odczytu.");
  } else {
    setBluetoothMessage("Sterowanie FTMS wlaczone. Kliknij Przejmij kontrolę albo Wyślij cel.");
  }
  render();
});

els.startTreadmillWithProgramToggle.addEventListener("change", () => {
  state.startTreadmillWithProgram = els.startTreadmillWithProgramToggle.checked;
  if (state.startTreadmillWithProgram) {
    state.bluetoothControlEnabled = true;
    setBluetoothMessage("Pelny tryb wlaczony: Start aplikacji uruchomi media, program i bieznie.");
  } else {
    setBluetoothMessage("Start aplikacji uruchamia media i program. Bieznie startujesz osobnym przyciskiem.");
  }
  saveSettings();
  render();
});

els.requestControlButton.addEventListener("click", () => {
  state.bluetoothControlEnabled = true;
  void requestBluetoothControl();
  render();
});

els.startTreadmillButton.addEventListener("click", () => {
  state.bluetoothControlEnabled = true;
  void startTreadmill();
  render();
});

els.sendCurrentTargetButton.addEventListener("click", () => {
  state.bluetoothControlEnabled = true;
  void sendTargetToTreadmill(state.speed, state.incline, true);
  render();
});

els.stopTreadmillButton.addEventListener("click", () => {
  state.bluetoothControlEnabled = true;
  void stopTreadmill();
  render();
});

els.addProgramSegmentButton.addEventListener("click", () => {
  const duration = clamp(Number(els.programMinutesInput.value) || 5, 0.5, 180);
  const speed = clamp(Number(els.programSpeedInput.value) || 5, 0, 16);
  const incline = clamp(Number(els.programInclineInput.value) || 0, 0, 12);
  const label = els.programLabelInput.value.trim() || `Odcinek ${state.customSegments.length + 1}`;
  state.customSegments.push({
    duration: Number(duration.toFixed(1)),
    label,
    speed: Number(speed.toFixed(1)),
    incline: Math.round(incline),
  });
  state.routePreset = "custom";
  state.targetMinutes = getCustomProgramMinutes();
  state.activeSegmentKey = "";
  saveSettings();
  render();
});

els.useCustomProgramButton.addEventListener("click", () => {
  if (state.customSegments.length === 0) return;
  state.routePreset = "custom";
  state.targetMinutes = getCustomProgramMinutes();
  state.activeSegmentKey = "";
  saveSettings();
  render();
});

els.clearProgramButton.addEventListener("click", () => {
  state.customSegments = [];
  state.activeSegmentKey = "";
  saveSettings();
  render();
});

els.dashboardTab.addEventListener("click", () => setView("dashboard"));
els.videoTab.addEventListener("click", () => setView("video"));
els.loadYoutubeButton.addEventListener("click", loadYoutubeVideo);
els.loadMountCookButton.addEventListener("click", () => {
  els.youtubeUrlInput.value = "https://www.youtube.com/watch?v=DQBCdbV2Enc";
  state.routePreset = "mountcook";
  state.targetMinutes = 25;
  state.activeSegmentKey = "";
  saveSettings();
  render();
  void loadYoutubeVideo();
});
els.youtubeUrlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadYoutubeVideo();
});

els.audioInput.addEventListener("change", () => {
  const file = els.audioInput.files[0];
  if (!file) return;
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioUrl = URL.createObjectURL(file);
  els.audioPlayer.src = state.audioUrl;
  els.audioName.textContent = file.name;
  els.audioStatus.textContent = "Gotowa";
});

els.videoInput.addEventListener("change", () => {
  const file = els.videoInput.files[0];
  if (!file) return;
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl = URL.createObjectURL(file);
  state.youtubeReady = false;
  els.previewVideo.src = state.videoUrl;
  els.mainVideo.src = state.videoUrl;
  els.videoName.textContent = file.name;
  els.videoStatus.textContent = "Gotowe";
  showLocalVideo();
  setView("video");
  render();
});

els.mainVideo.addEventListener("timeupdate", render);

window.addEventListener("beforeunload", () => {
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
});

render();

if (typeof navigator === "undefined" || !navigator.bluetooth) {
  setBluetoothMessage("Web Bluetooth nie jest dostepny w tej przegladarce. Do sterowania uzyj Chrome albo Edge przez START_BIEZNIA.bat.");
}
