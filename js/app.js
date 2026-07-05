const els = {
  btStatus: document.getElementById('btStatusText'),
  btIndicator: document.querySelector('.status-indicator'),
  btnConnect: document.getElementById('btnConnect'),
  
  viewLibrary: document.getElementById('viewLibrary'),
  viewWorkout: document.getElementById('viewWorkout'),
  viewCreator: document.getElementById('viewCreator'),
  routesGrid: document.getElementById('routesGrid'),
  
  valDistance: document.getElementById('valDistance'),
  valTime: document.getElementById('valTime'),
  valCalories: document.getElementById('valCalories'),
  
  valSpeed: document.getElementById('valSpeed'),
  nextTime: document.getElementById('nextTime'),
  nextSpeedLabel: document.getElementById('nextSpeedLabel'),
  
  valIncline: document.getElementById('valIncline'),
  nextInclineLabel: document.getElementById('nextInclineLabel'),
  
  workoutProgressBar: document.getElementById('workoutProgressBar'),
  valStage: document.getElementById('valStage'),
  valStageProgress: document.getElementById('valStageProgress'),
  
  btnStop: document.getElementById('btnStop'),
  btnPause: document.getElementById('btnPause'),

  btnOpenCreator: document.getElementById('btnOpenCreator'),
  btnSaveCustom: document.getElementById('btnSaveCustom'),
  btnCancelCustom: document.getElementById('btnCancelCustom'),
  btnAddStep: document.getElementById('btnAddStep'),
  customStepsList: document.getElementById('customStepsList'),
  customRouteName: document.getElementById('customRouteName'),
  customRouteVideo: document.getElementById('customRouteVideo'),
  customRouteMusic: document.getElementById('customRouteMusic'),
  stepName: document.getElementById('stepName'),
  stepDuration: document.getElementById('stepDuration'),
  stepSpeed: document.getElementById('stepSpeed'),
  stepIncline: document.getElementById('stepIncline'),
  mediaContainer: document.getElementById('mediaContainer'),
  customRouteTargetTime: document.getElementById('customRouteTargetTime'),
  targetTimeDisplay: document.getElementById('targetTimeDisplay'),
  remainingTimeDisplay: document.getElementById('remainingTimeDisplay')
};

const controller = new TreadmillController();
const runner = new TreadmillWorkoutRunner(controller);

let loadedRoutes = [];
let customRoutes = [];
let deletedDefaults = [];
let creatorSteps = [];
let editingRouteId = null;

// YouTube Player
let ytVideoPlayer = null;
let ytMusicPlayer = null;
let ytReady = false;

window.onYouTubeIframeAPIReady = function() {
  ytReady = true;
};

function extractYouTubeId(url) {
  if(!url) return null;
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
  return match ? match[1] : null;
}

function onYouTubeError(event) {
  // Błędy 101 i 150 oznaczają, że właściciel wideo nie pozwala na jego osadzanie (embed).
  if (event.data === 101 || event.data === 150) {
    alert("UWAGA: To wideo ma zablokowaną możliwość odtwarzania poza serwisem YouTube przez autora (prawa autorskie). Wideo może się nie wyświetlić/nie zagrać. Wybierz inny link.");
  }
}

function initYouTubePlayers(videoUrl, musicUrl) {
  if (!ytReady) {
    // Jeśli API YouTube jeszcze się nie załadowało, spróbuj ponownie za pół sekundy
    setTimeout(() => initYouTubePlayers(videoUrl, musicUrl), 500);
    return;
  }
  const videoId = extractYouTubeId(videoUrl);
  const musicId = extractYouTubeId(musicUrl);
  
  if(videoId || musicId) {
    els.mediaContainer.style.background = '#000';
  }

  // --- WIDEO ---
  if (videoId) {
    if (ytVideoPlayer) {
      ytVideoPlayer.loadVideoById(videoId);
      if(musicId) ytVideoPlayer.mute(); else ytVideoPlayer.unMute();
      ytVideoPlayer.playVideo();
    } else {
      ytVideoPlayer = new YT.Player('youtubePlayer', {
        height: '100%', width: '100%', videoId: videoId,
        playerVars: { 'autoplay': 1, 'controls': 0, 'disablekb': 1, 'fs': 0, 'loop': 1, 'modestbranding': 1, 'rel': 0, 'playsinline': 1, 'mute': 1, 'playlist': videoId },
        events: {
          'onReady': (event) => {
            event.target.mute(); // Mobile requires mute for autoplay
            event.target.playVideo();
          },
          'onError': onYouTubeError
        }
      });
    }
  } else if (ytVideoPlayer && typeof ytVideoPlayer.stopVideo === 'function') {
    ytVideoPlayer.stopVideo();
  }

  // --- MUZYKA ---
  if (musicId) {
    if (ytMusicPlayer) {
      ytMusicPlayer.loadVideoById(musicId);
      ytMusicPlayer.unMute();
      ytMusicPlayer.playVideo();
    } else {
      ytMusicPlayer = new YT.Player('youtubeMusicPlayer', {
        height: '100%', width: '100%', videoId: musicId,
        playerVars: { 'autoplay': 1, 'controls': 0, 'loop': 1, 'playsinline': 1, 'playlist': musicId },
        events: { 
          'onReady': (event) => event.target.playVideo(),
          'onError': onYouTubeError
        }
      });
    }
  } else if (ytMusicPlayer && typeof ytMusicPlayer.stopVideo === 'function') {
    ytMusicPlayer.stopVideo();
  }
}

function stopYouTubePlayers() {
  if (ytVideoPlayer && typeof ytVideoPlayer.stopVideo === 'function') ytVideoPlayer.stopVideo();
  if (ytMusicPlayer && typeof ytMusicPlayer.stopVideo === 'function') ytMusicPlayer.stopVideo();
  els.mediaContainer.style.background = '#0b0c10'; 
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateCreatorSummary() {
  const target = parseFloat(els.customRouteTargetTime.value) || 0;
  els.targetTimeDisplay.textContent = target;

  const totalSec = creatorSteps.reduce((acc, st) => acc + st.duration_sec, 0);
  const totalMin = totalSec / 60;
  const remaining = target - totalMin;

  els.remainingTimeDisplay.textContent = remaining.toFixed(1);
  if (remaining < 0) {
    els.remainingTimeDisplay.style.color = 'var(--danger)';
  } else {
    els.remainingTimeDisplay.style.color = 'var(--accent)';
  }
}

async function init() {
  // Wczytywanie z localStorage
  const savedCustom = localStorage.getItem('bieznia.customRoutes');
  if (savedCustom) {
    try { customRoutes = JSON.parse(savedCustom); } catch(e) {}
  }

  const savedDeleted = localStorage.getItem('bieznia.deletedDefaults');
  if (savedDeleted) {
    try { deletedDefaults = JSON.parse(savedDeleted); } catch(e){}
  }

  // Wczytywanie z wbudowanego pliku JS zamiast fetch() (omija problemy z CORS)
  loadedRoutes = defaultRoutes;
  renderLibrary();

  els.btnConnect.addEventListener('click', async () => {
    try {
      await controller.connect();
    } catch(e) {
      alert("Błąd połączenia: " + e.message);
    }
  });

  controller.onStatusChange = (connected, msg) => {
    els.btStatus.textContent = msg;
    if (connected) {
      els.btIndicator.classList.add('online');
      els.btnConnect.style.display = 'none';
    } else {
      els.btIndicator.classList.remove('online');
      els.btnConnect.style.display = 'inline-block';
    }
  };

  runner.onTick = updateDashboard;
  runner.onWorkoutComplete = () => {
    stopYouTubePlayers();
    alert("Trening zakończony! Dobra robota!");
    showLibrary();
  };

  els.btnStop.addEventListener('click', () => {
    runner.stop();
    stopYouTubePlayers();
    showLibrary();
  });

  els.btnPause.addEventListener('click', () => {
    if (runner.isRunning) {
      runner.pause();
      els.btnPause.textContent = "WZNÓW";
      if (ytVideoPlayer && typeof ytVideoPlayer.pauseVideo === 'function') ytVideoPlayer.pauseVideo();
      if (ytMusicPlayer && typeof ytMusicPlayer.pauseVideo === 'function') ytMusicPlayer.pauseVideo();
    } else {
      runner.resume();
      els.btnPause.textContent = "PAUZA";
      if (ytVideoPlayer && typeof ytVideoPlayer.playVideo === 'function') ytVideoPlayer.playVideo();
      if (ytMusicPlayer && typeof ytMusicPlayer.playVideo === 'function') ytMusicPlayer.playVideo();
    }
  });

  // Creator Events
  els.customRouteTargetTime.addEventListener('input', updateCreatorSummary);

  els.btnOpenCreator.addEventListener('click', () => {
    els.viewLibrary.classList.remove('active');
    els.viewLibrary.classList.add('hidden');
    els.viewCreator.classList.remove('hidden');
    els.viewCreator.classList.add('active');
    creatorSteps = [];
    editingRouteId = null;
    els.customRouteTargetTime.value = 30;
    els.customRouteName.value = '';
    els.customRouteVideo.value = '';
    els.customRouteMusic.value = '';
    renderCreatorSteps();
  });

  els.btnCancelCustom.addEventListener('click', showLibrary);

  els.btnAddStep.addEventListener('click', () => {
    const dMin = parseFloat(els.stepDuration.value);
    const s = parseFloat(els.stepSpeed.value);
    const i = parseInt(els.stepIncline.value) || 0;
    const n = els.stepName.value.trim();
    
    if (!dMin || !s) { alert("Podaj czas (minuty) i prędkość!"); return; }
    
    creatorSteps.push({
      duration_sec: Math.round(dMin * 60),
      speed_kmh: s,
      incline: i,
      label: n || ("Etap " + (creatorSteps.length + 1))
    });
    
    els.stepName.value = '';
    els.stepDuration.value = '';
    renderCreatorSteps();
  });

  function saveCustomRoute() {
    const name = els.customRouteName.value.trim();
    if (!name || creatorSteps.length === 0) {
      alert("Podaj nazwę i dodaj przynajmniej jeden etap!");
      return null;
    }

    const totalDur = creatorSteps.reduce((acc, st) => acc + st.duration_sec, 0);

    const newRoute = {
      id: editingRouteId || ("custom_" + Date.now()),
      name: name,
      description: "Twój własny program treningowy.",
      type: "custom",
      level: "medium",
      duration_min: Math.round(totalDur / 60),
      video_url: els.customRouteVideo.value.trim(),
      music_url: els.customRouteMusic.value.trim(),
      steps: creatorSteps
    };

    if (editingRouteId) {
      const customIdx = customRoutes.findIndex(r => r.id === editingRouteId);
      if (customIdx >= 0) {
        customRoutes[customIdx] = newRoute;
      } else {
        // Edytowano trasę domyślną - zapisz jako custom i usuń oryginał
        customRoutes.push(newRoute);
        deletedDefaults.push(editingRouteId);
        localStorage.setItem('bieznia.deletedDefaults', JSON.stringify(deletedDefaults));
      }
    } else {
      customRoutes.push(newRoute);
    }

    localStorage.setItem('bieznia.customRoutes', JSON.stringify(customRoutes));
    
    // Zresetuj formularz
    els.customRouteName.value = '';
    els.customRouteVideo.value = '';
    els.customRouteMusic.value = '';
    creatorSteps = [];
    
    renderLibrary();
    return newRoute;
  }

  const btnSaveCustom = document.getElementById('btnSaveCustom');
  const btnSaveAndPlayCustom = document.getElementById('btnSaveAndPlayCustom');

  btnSaveCustom.addEventListener('click', () => {
    if (saveCustomRoute()) {
      showLibrary();
    }
  });

  btnSaveAndPlayCustom.addEventListener('click', () => {
    const route = saveCustomRoute();
    if (route) {
      startWorkout(route);
    }
  });
}

function renderCreatorSteps() {
  els.customStepsList.innerHTML = '';
  creatorSteps.forEach((st, idx) => {
    const dMin = (st.duration_sec / 60).toFixed(1);
    const div = document.createElement('div');
    div.className = 'step-item';
    div.innerHTML = `
      <span>${st.label}: ${dMin} min | ${st.speed_kmh} km/h | Wznios: ${st.incline}%</span>
      <button class="btn-remove-step" data-index="${idx}">X</button>
    `;
    div.querySelector('button').addEventListener('click', (e) => {
      creatorSteps.splice(e.target.dataset.index, 1);
      renderCreatorSteps();
    });
    els.customStepsList.appendChild(div);
  });
  updateCreatorSummary();
}

function renderLibrary() {
  els.routesGrid.innerHTML = '';
  const allRoutes = [...loadedRoutes.filter(r => !deletedDefaults.includes(r.id)), ...customRoutes];
  
  allRoutes.forEach(route => {
    const isCustom = route.id.startsWith('custom_') || customRoutes.find(r => r.id === route.id);
    const card = document.createElement('div');
    card.className = 'route-card glass-panel';
    card.innerHTML = `
      <h3>${route.name} ${isCustom ? '⭐' : ''}</h3>
      <p>${route.description || 'Własny program'}</p>
      <div class="route-meta">
        <span class="level-badge ${route.level || 'medium'}">${(route.level || 'medium').toUpperCase()}</span>
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${route.duration_min} min</span>
      </div>
      <button class="btn-neon btn-start-route" style="margin-top: 1rem; width: 100%;">START TRENINGU</button>
      <div style="display:flex; gap: 10px; margin-top: 10px;">
        <button class="btn-edit-route" data-id="${route.id}" data-custom="${isCustom}" style="flex:1; padding: 5px; background:rgba(255,255,255,0.1); border:none; color: white; border-radius: 4px; cursor: pointer;">Edytuj</button>
        <button class="btn-delete-route" data-id="${route.id}" data-custom="${isCustom}" style="flex:1; padding: 5px; background:rgba(255,42,42,0.2); border:none; color: var(--danger); border-radius: 4px; cursor: pointer;">Usuń</button>
      </div>
    `;
    
    card.querySelector('.btn-start-route').addEventListener('click', () => {
      startWorkout(route);
    });

    card.querySelector('.btn-delete-route').addEventListener('click', (e) => {
      if(confirm("Czy na pewno chcesz usunąć ten program?")) {
        const id = e.target.dataset.id;
        const customFlag = e.target.dataset.custom === 'true';
        if (customFlag) {
          customRoutes = customRoutes.filter(r => r.id !== id);
          localStorage.setItem('bieznia.customRoutes', JSON.stringify(customRoutes));
        } else {
          deletedDefaults.push(id);
          localStorage.setItem('bieznia.deletedDefaults', JSON.stringify(deletedDefaults));
        }
        renderLibrary();
      }
    });

    card.querySelector('.btn-edit-route').addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const customFlag = e.target.dataset.custom === 'true';
      const routeToEdit = customFlag ? customRoutes.find(r => r.id === id) : loadedRoutes.find(r => r.id === id);
      if (routeToEdit) {
        editingRouteId = id;
        
        // Wczytaj do formularza
        els.customRouteTargetTime.value = routeToEdit.duration_min || 30;
        els.customRouteName.value = routeToEdit.name;
        els.customRouteVideo.value = routeToEdit.video_url || '';
        els.customRouteMusic.value = routeToEdit.music_url || '';
        creatorSteps = [...routeToEdit.steps];
        
        els.viewLibrary.classList.remove('active');
        els.viewLibrary.classList.add('hidden');
        els.viewCreator.classList.remove('hidden');
        els.viewCreator.classList.add('active');
        renderCreatorSteps();
      }
    });
    
    els.routesGrid.appendChild(card);
  });
}

async function startWorkout(route) {
  if (!controller.connected) {
    try {
      await controller.connect();
    } catch(e) {
      alert("Błąd połączenia: " + e.message);
      return;
    }
  }
  
  // Przełącz widok
  els.viewLibrary.classList.remove('active');
  els.viewLibrary.classList.add('hidden');
  els.viewCreator.classList.remove('active');
  els.viewCreator.classList.add('hidden');
  
  els.viewWorkout.classList.remove('hidden');
  els.viewWorkout.classList.add('active');
  
  // Wideo i Muzyka YouTube
  initYouTubePlayers(route.video_url, route.music_url);
  
  runner.loadRoute(route);
  runner.start();
}

function showLibrary() {
  els.viewWorkout.classList.remove('active');
  els.viewWorkout.classList.add('hidden');
  els.viewCreator.classList.remove('active');
  els.viewCreator.classList.add('hidden');
  
  els.viewLibrary.classList.remove('hidden');
  els.viewLibrary.classList.add('active');
}

function updateDashboard(data) {
  els.valDistance.textContent = data.distanceKm.toFixed(2);
  els.valTime.textContent = formatTime(data.elapsedSeconds);
  els.valCalories.textContent = Math.round(data.calories);
  
  els.valSpeed.textContent = data.currentSpeed.toFixed(1);
  els.valIncline.textContent = Math.round(data.currentIncline);
  
  els.valStage.textContent = data.currentStep.label || "Etap";
  
  const stepTotal = data.currentStep.duration_sec;
  let passed = 0;
  for(let i=0; i < data.activeStepIndex; i++) {
    passed += runner.route.steps[i].duration_sec;
  }
  const stepElapsed = data.elapsedSeconds - passed;
  const stepRemaining = stepTotal - stepElapsed;
  
  els.valStageProgress.textContent = formatTime(stepRemaining);
  
  const pct = stepElapsed / stepTotal;
  const offset = 283 - (283 * pct);
  els.workoutProgressBar.style.strokeDashoffset = offset;
  
  if (data.activeStepIndex + 1 < runner.route.steps.length) {
    const nextStep = runner.route.steps[data.activeStepIndex + 1];
    if (stepRemaining <= (data.currentStep.warning_before_sec || 10)) {
      els.nextTime.textContent = stepRemaining;
      els.nextSpeedLabel.style.background = 'rgba(255, 42, 42, 0.2)'; 
      els.nextSpeedLabel.innerHTML = `Uwaga! Za <span style="font-weight:bold">${stepRemaining}</span>s: ${nextStep.speed_kmh} km/h`;
      els.nextInclineLabel.textContent = `Kolejny etap: ${nextStep.incline}%`;
    } else {
      els.nextSpeedLabel.style.background = 'rgba(255, 75, 0, 0.1)';
      els.nextSpeedLabel.textContent = `Kolejny etap: ${nextStep.speed_kmh} km/h`;
      els.nextInclineLabel.textContent = `Kolejny etap: ${nextStep.incline}%`;
    }
  } else {
    els.nextSpeedLabel.style.background = 'rgba(255, 75, 0, 0.1)';
    els.nextSpeedLabel.textContent = "To już ostatni etap!";
    els.nextInclineLabel.textContent = "";
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
