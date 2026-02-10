/* ============================================
   HeartWatcher AI - Main JavaScript
   Advanced Features & Real-time Monitoring
   ============================================ */

// ============================================
// Configuration & Constants
// ============================================

const CONFIG = {
  updateInterval: 5000, // 5 seconds
  chartHistoryLength: 20,
  websocketURL: 'wss://api.heartwatcher.ai/vitals', // Simulated
  apiURL: 'https://api.heartwatcher.ai',
  thresholds: {
    heartRate: { min: 60, max: 100, critical: 120 },
    spo2: { min: 95, max: 100, critical: 90 },
    hrv: { min: 40, max: 70, critical: 30 },
    stress: { low: 30, moderate: 60, high: 80 }
  }
};

// ============================================
// Global State Management
// ============================================

const AppState = {
  user: {
    name: 'John',
    id: 'user-001',
    baseline: {}
  },
  vitals: {
    heartRate: 72,
    spo2: 98,
    hrv: 55,
    activity: 'Light',
    stress: 28
  },
  alerts: [],
  medications: [],
  charts: {},
  websocket: null,
  voiceActive: false
};

// ============================================
// Utility Functions
// ============================================

const Utils = {
  // Format date and time
  formatDate: (date = new Date()) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  },

  formatTime: (date = new Date()) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  },

  // Generate realistic vital signs with variation
  generateVitals: () => {
    const time = new Date().getHours();
    const isNight = time < 6 || time > 22;
    
    return {
      heartRate: Math.floor(68 + Math.random() * 12 + (isNight ? -5 : 0)),
      spo2: Math.floor(96 + Math.random() * 3),
      hrv: Math.floor(50 + Math.random() * 15),
      stress: Math.floor(20 + Math.random() * 20),
      activity: ['Resting', 'Light', 'Moderate'][Math.floor(Math.random() * 3)]
    };
  },

  // Check if vitals are in healthy range
  checkVitalHealth: (vital, value) => {
    const threshold = CONFIG.thresholds[vital];
    if (!threshold) return 'normal';
    
    if (value < threshold.critical || value > threshold.critical) return 'critical';
    if (value < threshold.min || value > threshold.max) return 'warning';
    return 'normal';
  },

  // Speak text using Web Speech API
  speak: (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      speechSynthesis.speak(utterance);
    }
  },

  // Play alert sound
  playAlertSound: (type = 'warning') => {
    // Create audio context for alert sounds
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = type === 'critical' ? 880 : 440;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  },

  // Show notification
  showNotification: (title, message, type = 'info') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/assets/icon-192.png',
        badge: '/assets/badge-72.png',
        tag: type,
        requireInteraction: type === 'critical'
      });
    }
  },

  // Request notification permission
  requestNotificationPermission: async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }
};

// ============================================
// Vitals Monitoring & Update
// ============================================

const VitalsMonitor = {
  init: () => {
    VitalsMonitor.updateVitals();
    VitalsMonitor.startRealTimeUpdates();
    VitalsMonitor.initializeCharts();
  },

  updateVitals: () => {
    const vitals = Utils.generateVitals();
    AppState.vitals = { ...AppState.vitals, ...vitals };
    
    // Update UI
    VitalsMonitor.updateVitalsDisplay();
    VitalsMonitor.updateCharts();
    VitalsMonitor.checkForAlerts();
  },

  updateVitalsDisplay: () => {
    const { heartRate, spo2, hrv, activity } = AppState.vitals;
    
    // Update heart rate
    const hrElement = document.getElementById('heartRateValue');
    if (hrElement) {
      hrElement.textContent = heartRate;
      VitalsMonitor.animateValueChange(hrElement);
    }
    
    // Update SpO2
    const spo2Element = document.getElementById('spo2Value');
    if (spo2Element) {
      spo2Element.textContent = spo2;
      VitalsMonitor.animateValueChange(spo2Element);
    }
    
    // Update HRV
    const hrvElement = document.getElementById('hrvValue');
    if (hrvElement) {
      hrvElement.textContent = hrv;
      VitalsMonitor.animateValueChange(hrvElement);
    }
    
    // Update activity
    const activityElement = document.getElementById('activityValue');
    if (activityElement) {
      activityElement.textContent = activity;
    }
    
    // Update activity progress bar
    const activityProgress = document.getElementById('activityProgress');
    if (activityProgress) {
      const percentage = activity === 'Resting' ? 20 : activity === 'Light' ? 50 : 80;
      activityProgress.style.width = `${percentage}%`;
    }
    
    // Update overall health status
    VitalsMonitor.updateHealthStatus();
  },

  animateValueChange: (element) => {
    element.style.transform = 'scale(1.1)';
    element.style.color = 'var(--color-primary)';
    setTimeout(() => {
      element.style.transform = 'scale(1)';
      element.style.color = '';
    }, 300);
  },

  updateHealthStatus: () => {
    const { heartRate, spo2, hrv } = AppState.vitals;
    
    const hrStatus = Utils.checkVitalHealth('heartRate', heartRate);
    const spo2Status = Utils.checkVitalHealth('spo2', spo2);
    const hrvStatus = Utils.checkVitalHealth('hrv', hrv);
    
    const statusCard = document.getElementById('overallStatus');
    if (!statusCard) return;
    
    // Determine overall status
    let overallStatus = 'excellent';
    let statusText = 'Excellent';
    let statusDesc = 'All vitals within healthy range';
    
    if (hrStatus === 'critical' || spo2Status === 'critical' || hrvStatus === 'critical') {
      overallStatus = 'critical';
      statusText = 'Critical';
      statusDesc = 'Immediate attention needed';
    } else if (hrStatus === 'warning' || spo2Status === 'warning' || hrvStatus === 'warning') {
      overallStatus = 'warning';
      statusText = 'Concerning';
      statusDesc = 'Some vitals outside normal range';
    } else if (hrStatus === 'normal' && spo2Status === 'normal' && hrvStatus === 'normal') {
      overallStatus = 'excellent';
      statusText = 'Excellent';
      statusDesc = 'All vitals within healthy range';
    }
    
    // Update status card
    statusCard.className = `status-card status-${overallStatus}`;
    statusCard.querySelector('.status-label').textContent = statusText;
    statusCard.querySelector('.status-description').textContent = statusDesc;
  },

  checkForAlerts: () => {
    const { heartRate, spo2, hrv } = AppState.vitals;
    
    // Check heart rate
    if (heartRate > CONFIG.thresholds.heartRate.critical) {
      AlertSystem.createAlert({
        type: 'high',
        title: 'Critical Heart Rate',
        message: `Your heart rate is ${heartRate} BPM, significantly above normal.`,
        vitals: { heartRate, spo2 }
      });
    } else if (heartRate > CONFIG.thresholds.heartRate.max) {
      AlertSystem.createAlert({
        type: 'medium',
        title: 'Elevated Heart Rate',
        message: `Your heart rate is ${heartRate} BPM, above your baseline.`,
        vitals: { heartRate, spo2 }
      });
    }
    
    // Check SpO2
    if (spo2 < CONFIG.thresholds.spo2.critical) {
      AlertSystem.createAlert({
        type: 'high',
        title: 'Low Blood Oxygen',
        message: `Blood oxygen at ${spo2}%. Please check your positioning.`,
        vitals: { heartRate, spo2 }
      });
    }
  },

  startRealTimeUpdates: () => {
    // Simulate real-time updates every 5 seconds
    setInterval(() => {
      VitalsMonitor.updateVitals();
    }, CONFIG.updateInterval);
  },

  initializeCharts: () => {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded');
      return;
    }
    
    // Heart rate chart
    VitalsMonitor.createVitalChart('heartRateChart', 'Heart Rate', 'rgba(244, 67, 54, 0.5)');
    
    // SpO2 chart
    VitalsMonitor.createVitalChart('spo2Chart', 'SpO₂', 'rgba(33, 150, 243, 0.5)');
    
    // HRV chart
    VitalsMonitor.createVitalChart('hrvChart', 'HRV', 'rgba(156, 39, 176, 0.5)');
    
    // Trends chart
    VitalsMonitor.createTrendsChart();
  },

  createVitalChart: (canvasId, label, color) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = Array(CONFIG.chartHistoryLength).fill(0);
    
    AppState.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => ''),
        datasets: [{
          label: label,
          data: data,
          borderColor: color.replace('0.5', '1'),
          backgroundColor: color,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { display: false },
          y: { display: false }
        },
        animation: { duration: 500 }
      }
    });
  },

  createTrendsChart: () => {
    const canvas = document.getElementById('trendsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    AppState.charts.trendsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Heart Rate',
            data: [72, 75, 71, 73, 72, 70, 72],
            borderColor: 'rgba(244, 67, 54, 1)',
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true
          },
          {
            label: 'SpO₂',
            data: [98, 97, 98, 99, 98, 97, 98],
            borderColor: 'rgba(33, 150, 243, 1)',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true
          },
          {
            label: 'HRV',
            data: [55, 53, 56, 54, 55, 57, 55],
            borderColor: 'rgba(156, 39, 176, 1)',
            backgroundColor: 'rgba(156, 39, 176, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#b8b8d1',
              font: { size: 14 },
              usePointStyle: true,
              padding: 20
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(42, 42, 62, 0.5)' },
            ticks: { color: '#b8b8d1', font: { size: 14 } }
          },
          y: {
            grid: { color: 'rgba(42, 42, 62, 0.5)' },
            ticks: { color: '#b8b8d1', font: { size: 14 } }
          }
        }
      }
    });
  },

  updateCharts: () => {
    const { heartRate, spo2, hrv } = AppState.vitals;
    
    // Update individual vital charts
    VitalsMonitor.updateChartData('heartRateChart', heartRate);
    VitalsMonitor.updateChartData('spo2Chart', spo2);
    VitalsMonitor.updateChartData('hrvChart', hrv);
  },

  updateChartData: (chartId, value) => {
    const chart = AppState.charts[chartId];
    if (!chart) return;
    
    const data = chart.data.datasets[0].data;
    data.push(value);
    
    if (data.length > CONFIG.chartHistoryLength) {
      data.shift();
    }
    
    chart.update('none');
  }
};

// ============================================
// Alert System
// ============================================

const AlertSystem = {
  createAlert: (alert) => {
    const alertId = Date.now();
    const newAlert = {
      id: alertId,
      timestamp: new Date(),
      acknowledged: false,
      ...alert
    };
    
    AppState.alerts.push(newAlert);
    
    // Update UI
    AlertSystem.updateAlertBadge();
    
    // Show notification
    Utils.showNotification(alert.title, alert.message, alert.type);
    
    // Play sound
    Utils.playAlertSound(alert.type);
    
    // Speak alert if critical
    if (alert.type === 'high' || alert.type === 'critical') {
      Utils.speak(`Alert: ${alert.title}. ${alert.message}`);
    }
  },

  updateAlertBadge: () => {
    const unacknowledgedAlerts = AppState.alerts.filter(a => !a.acknowledged).length;
    const badges = document.querySelectorAll('.badge, .alert-count-badge, #alert-count');
    
    badges.forEach(badge => {
      if (badge) {
        badge.textContent = unacknowledgedAlerts;
        badge.style.display = unacknowledgedAlerts > 0 ? 'flex' : 'none';
      }
    });
  },

  showEmergencyBanner: (message) => {
    const banner = document.getElementById('emergency-banner');
    if (!banner) return;
    
    const messageElement = document.getElementById('emergency-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
    
    banner.classList.remove('hidden');
    Utils.speak(`Emergency alert: ${message}`);
    Utils.playAlertSound('critical');
  }
};

// ============================================
// Voice Assistant
// ============================================

const VoiceAssistant = {
  recognition: null,
  
  init: () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    VoiceAssistant.recognition = new SpeechRecognition();
    
    VoiceAssistant.recognition.continuous = false;
    VoiceAssistant.recognition.interimResults = false;
    VoiceAssistant.recognition.lang = 'en-US';
    
    VoiceAssistant.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      VoiceAssistant.handleCommand(transcript);
    };
    
    VoiceAssistant.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      AppState.voiceActive = false;
    };
    
    VoiceAssistant.recognition.onend = () => {
      AppState.voiceActive = false;
    };
  },

  start: () => {
    if (!VoiceAssistant.recognition) {
      VoiceAssistant.init();
    }
    
    try {
      VoiceAssistant.recognition.start();
      AppState.voiceActive = true;
      Utils.speak('I\'m listening. How can I help?');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
    }
  },

  handleCommand: (command) => {
    console.log('Voice command:', command);
    
    if (command.includes('how am i') || command.includes('health status')) {
      VoiceAssistant.reportStatus();
    } else if (command.includes('heart rate') || command.includes('vitals')) {
      VoiceAssistant.readVitals();
    } else if (command.includes('call') || command.includes('emergency')) {
      VoiceAssistant.callCaregiver();
    } else if (command.includes('medication') || command.includes('medicine')) {
      VoiceAssistant.listMedications();
    } else {
      Utils.speak('I didn\'t understand that. You can ask about your health status, vitals, medications, or call for help.');
    }
  },

  reportStatus: () => {
    const status = document.querySelector('.status-label')?.textContent || 'good';
    Utils.speak(`Your overall health status is ${status}. All vitals are being monitored.`);
  },

  readVitals: () => {
    const { heartRate, spo2, hrv } = AppState.vitals;
    Utils.speak(`Your heart rate is ${heartRate} beats per minute. Blood oxygen is ${spo2} percent. Heart rate variability is ${hrv} milliseconds.`);
  },

  callCaregiver: () => {
    Utils.speak('Calling your primary caregiver now.');
    // Trigger emergency call
    AlertSystem.showEmergencyBanner('Emergency call initiated');
  },

  listMedications: () => {
    Utils.speak('Your next medication is Metoprolol 25 milligrams, due in 45 minutes.');
  }
};

// ============================================
// Stress Page Functions
// ============================================

const StressMonitor = {
  init: () => {
    StressMonitor.updateStressGauge();
    StressMonitor.initializeCharts();
  },

  updateStressGauge: () => {
    const stressScore = AppState.vitals.stress;
    const needle = document.getElementById('stressNeedle');
    const scoreElement = document.getElementById('stressScore');
    
    if (needle) {
      // Convert stress score (0-100) to rotation angle (-90 to 90 degrees)
      const rotation = -90 + (stressScore * 1.8);
      needle.style.transform = `rotate(${rotation}deg)`;
    }
    
    if (scoreElement) {
      scoreElement.textContent = stressScore;
    }
  },

  initializeCharts: () => {
    if (typeof Chart === 'undefined') return;
    
    // Stress timeline chart
    const timelineCanvas = document.getElementById('stressTimelineChart');
    if (timelineCanvas) {
      const ctx = timelineCanvas.getContext('2d');
      const hours = Array.from({ length: 12 }, (_, i) => `${i + 8}:00`);
      const stressData = [25, 28, 35, 40, 32, 28, 30, 45, 38, 35, 30, 28];
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: hours,
          datasets: [{
            label: 'Stress Level',
            data: stressData,
            borderColor: 'rgba(255, 193, 7, 1)',
            backgroundColor: 'rgba(255, 193, 7, 0.2)',
            borderWidth: 3,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { color: 'rgba(42, 42, 62, 0.5)' },
              ticks: { color: '#b8b8d1', font: { size: 14 } }
            },
            y: {
              min: 0,
              max: 100,
              grid: { color: 'rgba(42, 42, 62, 0.5)' },
              ticks: { color: '#b8b8d1', font: { size: 14 } }
            }
          }
        }
      });
    }
    
    // Weekly comparison chart
    const comparisonCanvas = document.getElementById('weeklyComparisonChart');
    if (comparisonCanvas) {
      const ctx = comparisonCanvas.getContext('2d');
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: days,
          datasets: [
            {
              label: 'This Week',
              data: [35, 30, 28, 32, 29, 33, 28],
              backgroundColor: 'rgba(79, 209, 197, 0.6)',
              borderColor: 'rgba(79, 209, 197, 1)',
              borderWidth: 2
            },
            {
              label: 'Last Week',
              data: [42, 38, 40, 35, 37, 39, 36],
              backgroundColor: 'rgba(118, 118, 168, 0.4)',
              borderColor: 'rgba(118, 118, 168, 1)',
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#b8b8d1',
                font: { size: 14 }
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(42, 42, 62, 0.5)' },
              ticks: { color: '#b8b8d1', font: { size: 14 } }
            },
            y: {
              min: 0,
              max: 50,
              grid: { color: 'rgba(42, 42, 62, 0.5)' },
              ticks: { color: '#b8b8d1', font: { size: 14 } }
            }
          }
        }
      });
    }
  }
};

// ============================================
// Breathing Exercise
// ============================================

const BreathingExercise = {
  timer: null,
  startTime: null,
  duration: 300, // 5 minutes in seconds
  
  start: () => {
    const exercise = document.getElementById('breathingExercise');
    if (exercise) {
      exercise.classList.remove('hidden');
      BreathingExercise.startTime = Date.now();
      BreathingExercise.updateTimer();
    }
  },

  stop: () => {
    const exercise = document.getElementById('breathingExercise');
    if (exercise) {
      exercise.classList.add('hidden');
    }
    if (BreathingExercise.timer) {
      clearInterval(BreathingExercise.timer);
    }
  },

  updateTimer: () => {
    BreathingExercise.timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - BreathingExercise.startTime) / 1000);
      const remaining = BreathingExercise.duration - elapsed;
      
      if (remaining <= 0) {
        BreathingExercise.stop();
        Utils.speak('Breathing exercise complete. Great job!');
        return;
      }
      
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const timeElement = document.getElementById('breathingTime');
      
      if (timeElement) {
        timeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }
};

// ============================================
// Medication Management
// ============================================

const MedicationManager = {
  init: () => {
    // Initialize medication adherence chart
    MedicationManager.createAdherenceChart();
  },

  createAdherenceChart: () => {
    const canvas = document.getElementById('adherenceChart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const ctx = canvas.getContext('2d');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Taken',
          data: [3, 3, 2, 3, 3, 3, 3],
          backgroundColor: 'rgba(76, 175, 80, 0.8)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 2
        }, {
          label: 'Missed',
          data: [0, 0, 1, 0, 0, 0, 1],
          backgroundColor: 'rgba(244, 67, 54, 0.8)',
          borderColor: 'rgba(244, 67, 54, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#b8b8d1',
              font: { size: 14 }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: 'rgba(42, 42, 62, 0.5)' },
            ticks: { color: '#b8b8d1', font: { size: 14 } }
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(42, 42, 62, 0.5)' },
            ticks: { color: '#b8b8d1', font: { size: 14 } }
          }
        }
      }
    });
  },

  openModal: () => {
    const modal = document.getElementById('medicationModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  },

  closeModal: () => {
    const modal = document.getElementById('medicationModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Update date and time
  const updateDateTime = () => {
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTime');
    
    if (dateElement) dateElement.textContent = Utils.formatDate();
    if (timeElement) timeElement.textContent = Utils.formatTime();
  };
  
  updateDateTime();
  setInterval(updateDateTime, 60000); // Update every minute
  
  // Request notification permission
  Utils.requestNotificationPermission();
  
  // Initialize based on current page
  const currentPage = window.location.pathname;
  
  if (currentPage.includes('index.html') || currentPage === '/') {
    VitalsMonitor.init();
  } else if (currentPage.includes('stress.html')) {
    StressMonitor.init();
  } else if (currentPage.includes('alerts.html')) {
    MedicationManager.init();
  }
  
  // Initialize voice assistant
  VoiceAssistant.init();
  
  // Event Listeners
  const voiceBtn = document.getElementById('voiceAssistant');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', VoiceAssistant.start);
  }
  
  const emergencyBtn = document.getElementById('emergencyBtn');
  if (emergencyBtn) {
    emergencyBtn.addEventListener('click', () => {
      AlertSystem.showEmergencyBanner('Emergency assistance requested. Contacting caregiver...');
    });
  }
  
  const emergencyDismiss = document.querySelector('.emergency-dismiss');
  if (emergencyDismiss) {
    emergencyDismiss.addEventListener('click', () => {
      document.getElementById('emergency-banner')?.classList.add('hidden');
    });
  }
  
  const addMedicationBtn = document.getElementById('addMedicationBtn');
  if (addMedicationBtn) {
    addMedicationBtn.addEventListener('click', MedicationManager.openModal);
  }
  
  const modalClose = document.querySelector('.modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', MedicationManager.closeModal);
  }
  
  const cancelMedication = document.getElementById('cancelMedication');
  if (cancelMedication) {
    cancelMedication.addEventListener('click', MedicationManager.closeModal);
  }
  
  // Breathing exercise controls
  const startBreathing = document.getElementById('startBreathing');
  if (startBreathing) {
    startBreathing.addEventListener('click', BreathingExercise.start);
  }
  
  const stopBreathing = document.getElementById('stopBreathing');
  if (stopBreathing) {
    stopBreathing.addEventListener('click', BreathingExercise.stop);
  }
  
  const breathingClose = document.querySelector('.breathing-close');
  if (breathingClose) {
    breathingClose.addEventListener('click', BreathingExercise.stop);
  }
  
  // Simulate WebSocket connection
  setTimeout(() => {
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
      connectionStatus.querySelector('span').textContent = 'Connected';
    }
  }, 1000);
  
  console.log('HeartWatcher AI initialized successfully');
});

// ============================================
// Service Worker Registration (PWA)
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}
