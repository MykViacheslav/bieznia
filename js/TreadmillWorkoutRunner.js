// TreadmillWorkoutRunner.js
// Zarządza logiką aktywnego treningu, ograniczeniami bezpieczeństwa i krokami trasy.

class TreadmillWorkoutRunner {
  constructor(controller) {
    this.controller = controller;
    
    // Limits
    this.MAX_SPEED_STEP_KMH = 1.0;
    this.SPEED_STEP_INTERVAL_MS = 4000; // 4s między krokami prędkości – daje czas na nachylenie
    
    // State
    this.route = null;
    this.activeStepIndex = 0;
    this.elapsedSeconds = 0;
    this.isRunning = false;
    
    this.timerId = null;
    this.stepTimerId = null;
    
    this.currentSpeed = 0;
    this.currentIncline = 0;
    
    this.targetSpeed = 0;
    this.targetIncline = 0;
    
    this.distanceKm = 0;
    this.calories = 0;
    
    // Callbacks
    this.onTick = null;
    this.onStepChange = null;
    this.onWorkoutComplete = null;
    
    // Odświeżanie nachylenia co 5 sekund
    this._inclineRefreshTimer = null;
  }
  
  loadRoute(routeData) {
    this.route = routeData;
    this.activeStepIndex = 0;
    this.elapsedSeconds = 0;
    this.distanceKm = 0;
    this.calories = 0;
    this.currentSpeed = 0;
    this.currentIncline = 0;
    this.targetSpeed = 0;
    this.targetIncline = 0;
  }
  
  async start() {
    if (!this.route || this.route.steps.length === 0) return;
    
    this.isRunning = true;
    await this.controller.startTreadmill();
    
    this._applyStep(0);
    
    if (!this.timerId) {
      this.timerId = setInterval(() => this._tick(), 1000);
    }
  }
  
  async stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.stepTimerId) {
      clearTimeout(this.stepTimerId);
      this.stepTimerId = null;
    }
    if (this._inclineRefreshTimer) {
      clearInterval(this._inclineRefreshTimer);
      this._inclineRefreshTimer = null;
    }
    await this.controller.stopTreadmill();
  }
  
  async pause() {
    this.isRunning = false;
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    if (this.stepTimerId) clearTimeout(this.stepTimerId);
    this.stepTimerId = null;
    if (this._inclineRefreshTimer) {
      clearInterval(this._inclineRefreshTimer);
      this._inclineRefreshTimer = null;
    }
    await this.controller.setTargetSpeed(0);
  }
  
  async resume() {
    this.isRunning = true;
    if (!this.timerId) {
      this.timerId = setInterval(() => this._tick(), 1000);
    }
    this._applyTarget(this.targetSpeed, this.targetIncline);
  }
  
  _applyStep(index) {
    if (index >= this.route.steps.length) {
      this._completeWorkout();
      return;
    }
    this.activeStepIndex = index;
    const step = this.route.steps[index];
    
    if (this.onStepChange) this.onStepChange(step, index);
    
    let speed = Math.min(step.speed_kmh, this.route.max_speed_kmh || 20);
    let incline = Math.min(step.incline, this.route.max_incline || 15);
    
    this._applyTarget(speed, incline);
  }
  
  _applyTarget(targetSpeed, targetIncline) {
    this.targetSpeed = targetSpeed;
    this.targetIncline = targetIncline;
    
    // Bezpieczne, stopniowe zmienianie prędkości
    this._stepSpeedTowardsTarget();
    
    // Nachylenie zmieniamy od razu i ustawiamy cykliczne odświeżanie co 5 sekund
    this.currentIncline = targetIncline;
    this.controller.setTargetIncline(targetIncline);
    
    if (this._inclineRefreshTimer) clearInterval(this._inclineRefreshTimer);
    this._inclineRefreshTimer = setInterval(() => {
      if (this.isRunning) {
        this.controller.setTargetIncline(this.currentIncline);
      }
    }, 5000);
  }
  
  _stepSpeedTowardsTarget() {
    if (this.stepTimerId) clearTimeout(this.stepTimerId);
    
    const diff = this.targetSpeed - this.currentSpeed;
    if (Math.abs(diff) < 0.1) {
      this.currentSpeed = this.targetSpeed;
      this.controller.setTargetSpeed(this.currentSpeed);
      // Ta bieżnia resetuje nachylenie po każdej komendzie prędkości – wyślij je ponownie
      this._resendInclineAfterSpeed();
      return;
    }
    
    const stepAmount = Math.min(Math.abs(diff), this.MAX_SPEED_STEP_KMH);
    const direction = diff > 0 ? 1 : -1;
    
    this.currentSpeed += (stepAmount * direction);
    this.controller.setTargetSpeed(this.currentSpeed);
    // Ta bieżnia resetuje nachylenie po każdej komendzie prędkości – wyślij je ponownie
    this._resendInclineAfterSpeed();
    
    if (Math.abs(this.targetSpeed - this.currentSpeed) > 0.1) {
      this.stepTimerId = setTimeout(() => this._stepSpeedTowardsTarget(), this.SPEED_STEP_INTERVAL_MS);
    }
  }
  
  _resendInclineAfterSpeed() {
    // Krótkie opóźnienie po prędkości, potem wyślij nachylenie
    setTimeout(() => {
      if (this.isRunning && this.currentIncline > 0) {
        this.controller.setTargetIncline(this.currentIncline);
      }
    }, 400);
  }
  
  _tick() {
    this.elapsedSeconds++;
    
    // Obliczenia dystansu i kalorii
    this.distanceKm += (this.currentSpeed / 3600); // speed is km/h, adding per second
    // Prosty estymator kalorii: kcal/h = speed * 8.5 + incline * 3.8
    const calPerSecond = (this.currentSpeed * 8.5 + this.currentIncline * 3.8) * 8 / 3600;
    this.calories += calPerSecond;
    
    // Logika etapów
    const currentStep = this.route.steps[this.activeStepIndex];
    let timeInStep = this._calculateTimeInCurrentStep();
    
    if (timeInStep >= currentStep.duration_sec) {
      this._applyStep(this.activeStepIndex + 1);
    }
    
    if (this.onTick) {
      this.onTick({
        elapsedSeconds: this.elapsedSeconds,
        currentSpeed: this.currentSpeed,
        currentIncline: this.currentIncline,
        distanceKm: this.distanceKm,
        calories: this.calories,
        activeStepIndex: this.activeStepIndex,
        currentStep: currentStep
      });
    }
  }
  
  _calculateTimeInCurrentStep() {
    let passed = 0;
    for(let i=0; i < this.activeStepIndex; i++){
      passed += this.route.steps[i].duration_sec;
    }
    return this.elapsedSeconds - passed;
  }
  
  _completeWorkout() {
    this.stop();
    if (this.onWorkoutComplete) this.onWorkoutComplete();
  }
}
