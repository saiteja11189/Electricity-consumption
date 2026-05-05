document.addEventListener('DOMContentLoaded', async () => {
  const currentRoom = sessionStorage.getItem('currentRoom');
  
  if (!currentRoom) {
    window.location.href = 'index.html';
    return;
  }
  
  document.getElementById('roomTitle').textContent = `Room ${currentRoom}`;
  
  const floorAvgElement = document.getElementById('floorAvg');
  const totalConsumptionElement = document.getElementById('totalConsumption');
  const statusIndicator = document.getElementById('statusIndicator');
  const devicesGrid = document.getElementById('devicesGrid');
  
  const alertBanner = document.getElementById('alertBanner');
  const alertBannerText = document.getElementById('alertTopText');
  const notificationToast = document.getElementById('notificationToast');
  
  // Notification fields
  const alertComparison = document.getElementById('alertComparison');
  const alertCause = document.getElementById('alertCause');
  const alertAction = document.getElementById('alertAction');
  const notifiedList = document.getElementById('notifiedList');
  
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('currentRoom');
    window.location.href = 'index.html';
  });
  
  document.getElementById('closeToast').addEventListener('click', () => {
    notificationToast.classList.remove('show');
  });

  const getDeviceIcon = (name) => {
    switch(name.toLowerCase()) {
      case 'ac': return '❄️';
      case 'fan': return '🚁';
      case 'light': return '💡';
      case 'cooler': return '🧊';
      default: return '🔌';
    }
  };

  const getActionForDevice = (name) => {
    switch(name.toLowerCase()) {
      case 'ac': return 'Reduce AC temperature by 2°C or switch to sleep mode.';
      case 'fan': return 'Turn off the fan if the room is empty.';
      case 'light': return 'Switch off unnecessary lights to save energy.';
      case 'cooler': return 'Turn off the cooler, or lower the fan speed.';
      default: return 'Turn off the device when not in use.';
    }
  };

  // Keep track of previous status to only trigger toast on change
  let previousStatus = 'normal';

  // Read initial floor average
  const floorAverage = await DB.getFloorAverage();
  floorAvgElement.textContent = floorAverage.toFixed(1);

  // Audio Alert System
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3); 
      
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.log("Audio API blocked by browser until user interaction");
    }
  };

  // Live Energy Chart Initialization
  const ctx = document.getElementById('consumptionChart').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Live Load (kWh)',
        data: [],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#06b6d4',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });

  const updateChart = (consumption, status) => {
    const now = new Date();
    const timeLabel = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    if (chart.data.labels.length > 15) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    
    chart.data.labels.push(timeLabel);
    chart.data.datasets[0].data.push(consumption);
    
    if (status === 'critical') {
      chart.data.datasets[0].borderColor = '#ef4444';
      chart.data.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.2)';
      chart.data.datasets[0].pointBackgroundColor = '#ef4444';
    } else if (status === 'warning') {
      chart.data.datasets[0].borderColor = '#f59e0b';
      chart.data.datasets[0].backgroundColor = 'rgba(245, 158, 11, 0.2)';
      chart.data.datasets[0].pointBackgroundColor = '#f59e0b';
    } else {
      chart.data.datasets[0].borderColor = '#06b6d4';
      chart.data.datasets[0].backgroundColor = 'rgba(6, 182, 212, 0.1)';
      chart.data.datasets[0].pointBackgroundColor = '#06b6d4';
    }
    
    chart.update();
  };

  // Monthly History Bar Chart
  const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
  
  const days = [];
  const monthlyData = [];
  const monthlyColors = [];
  
  for (let i = 30; i > 0; i--) {
    days.push(`Day ${31 - i}`);
    const rand = Math.random();
    let dailyVal;
    
    if (rand < 0.7) {
      dailyVal = floorAverage * (0.6 + Math.random() * 0.4);
      monthlyColors.push('rgba(16, 185, 129, 0.6)');
    } else if (rand < 0.9) {
      dailyVal = floorAverage * (1.0 + Math.random() * 0.5);
      monthlyColors.push('rgba(245, 158, 11, 0.6)');
    } else {
      dailyVal = floorAverage * (1.5 + Math.random() * 0.5);
      monthlyColors.push('rgba(239, 68, 68, 0.6)');
    }
    monthlyData.push(dailyVal.toFixed(1));
  }
  
  const todayIndex = 29;

  const mChart = new Chart(monthlyCtx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Daily Consumption (kWh)',
        data: monthlyData,
        backgroundColor: monthlyColors,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', maxTicksLimit: 15 }
        }
      }
    }
  });

  // Set up real-time listener for the room
  DB.listenToRoom(currentRoom, (roomData) => {
    if (!roomData) return;
    
    // Update simple fields
    const consumption = roomData.totalConsumption || 0;
    totalConsumptionElement.textContent = consumption.toFixed(1);
    
    // Calculate and display Estimated Bill (7 Rupees per kWh)
    const estimatedBillElement = document.getElementById('estimatedBill');
    if (estimatedBillElement) {
      estimatedBillElement.textContent = (consumption * 7).toFixed(2);
    }
    
    // Update Devices
    devicesGrid.innerHTML = '';
    let maxHourDevice = null;
    let maxHours = -1;
    let forceLightAlert = false;
    let occupancyAlert = false;
    let occupancyDevices = [];
    
    for (const [key, device] of Object.entries(roomData.devices)) {
      if (device.hours > maxHours) {
        maxHours = device.hours;
        maxHourDevice = device;
      }
      
      if (device.name.toLowerCase() === 'light' && device.hours >= 5) {
        forceLightAlert = true;
      }
      
      if (roomData.isEmpty && device.hours > 0) {
        occupancyAlert = true;
        occupancyDevices.push(device.name);
      }
      
      const isCritical = (roomData.status === 'critical' && device.hours === maxHours) || (device.name.toLowerCase() === 'light' && device.hours >= 5) || (roomData.isEmpty && device.hours > 0);
      
      const progressPercent = Math.min((device.hours / 24) * 100, 100);
      let progressClass = 'fill-safe';
      if (device.hours > 12) progressClass = 'fill-danger';
      else if (device.hours > 8) progressClass = 'fill-warn';

      const deviceEl = document.createElement('div');
      deviceEl.className = `device-card ${isCritical ? 'critical-device' : ''}`;
      deviceEl.innerHTML = `
        <div class="device-icon">${getDeviceIcon(device.name)}</div>
        <div class="device-name">${device.name}</div>
        <div class="device-hours">${device.hours} ${device.hours === 1 ? 'hour' : 'hours'}</div>
        <div class="device-progress-bg">
          <div class="device-progress-fill ${progressClass}" style="width: ${progressPercent}%"></div>
        </div>
      `;
      devicesGrid.appendChild(deviceEl);
    }
    
    // Update Status and Alerts
    let status = roomData.status || 'normal';
    if (occupancyAlert) {
      status = 'critical'; // Max escalation for phantom drain
    } else if (forceLightAlert && status === 'normal') {
      status = 'warning'; // Force escalation for light timeout
    }
    
    // Update Indicator Pill
    statusIndicator.className = 'status-indicator';
    if (status === 'normal') {
      statusIndicator.classList.add('status-normal');
      statusIndicator.textContent = 'NORMAL';
      alertBanner.classList.remove('show');
      notificationToast.classList.remove('show');
      document.body.style.backgroundImage = 'radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)';
    } else if (status === 'warning') {
      statusIndicator.classList.add('status-warning');
      statusIndicator.style.background = 'rgba(251, 191, 36, 0.05)';
      statusIndicator.style.borderColor = 'rgba(251, 191, 36, 0.3)';
      statusIndicator.textContent = 'WARNING';
      document.body.style.backgroundImage = 'radial-gradient(circle at 10% 20%, rgba(245, 158, 11, 0.25) 0%, transparent 80%), radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 60%)';
    } else {
      statusIndicator.classList.add('status-critical');
      statusIndicator.textContent = 'CRITICAL';
      document.body.style.backgroundImage = 'radial-gradient(circle at 10% 20%, rgba(239, 68, 68, 0.35) 0%, transparent 90%), radial-gradient(circle at 90% 80%, rgba(239, 68, 68, 0.2) 0%, transparent 80%)';
    }
    
    // Update live graph
    updateChart(roomData.totalConsumption || 0, status);
    
    // Update Today's Monthly Bar live!
    mChart.data.datasets[0].data[todayIndex] = (roomData.totalConsumption || 0).toFixed(1);
    if (status === 'critical') mChart.data.datasets[0].backgroundColor[todayIndex] = 'rgba(239, 68, 68, 0.6)';
    else if (status === 'warning') mChart.data.datasets[0].backgroundColor[todayIndex] = 'rgba(245, 158, 11, 0.6)';
    else mChart.data.datasets[0].backgroundColor[todayIndex] = 'rgba(16, 185, 129, 0.6)';
    mChart.update();

    // Permanent Insight Logic (calculated on every push)
    let causeText = "";
    let actionText = "";
    
    if (occupancyAlert) {
      causeText = `Room is EMPTY, but the ${occupancyDevices.join(', ')} is running!`;
      actionText = `Turn off idle devices immediately to prevent severe waste.`;
    } else if (forceLightAlert) {
      causeText = `Lights have been left running continuously for 5+ hours!`;
      actionText = `Turn off the lights immediately to avoid penalties.`;
    } else if (maxHourDevice) {
      causeText = `${maxHourDevice.name} has been running for ${maxHourDevice.hours} hours.`;
      actionText = getActionForDevice(maxHourDevice.name);
    } else {
      causeText = `Multiple devices running heavily.`;
      actionText = `Turn off idle devices immediately.`;
    }

    const insightCard = document.getElementById('usageInsightCard');
    const insightTitle = document.getElementById('insightTitle');
    const insightDesc = document.getElementById('insightDesc');

    if (status === 'warning' || status === 'critical') {
      const isCriticalInsight = status === 'critical';
      insightCard.style.display = 'block';
      insightCard.style.borderColor = isCriticalInsight ? 'rgba(239, 68, 68, 0.5)' : 'rgba(251, 191, 36, 0.5)';
      insightTitle.style.color = isCriticalInsight ? 'var(--danger)' : 'var(--warning)';
      insightTitle.innerHTML = isCriticalInsight ? '⚠️ CRITICAL INSIGHT' : '⚡ USAGE INSIGHT';
      insightDesc.textContent = `${causeText} ${actionText}`;
    } else {
      insightCard.style.display = 'none';
    }

    // Trigger Notifications on Anomaly (only if state escalated)
    if ((status === 'warning' || status === 'critical') && previousStatus !== status) {
      const isCritical = status === 'critical';
      const ratio = (roomData.totalConsumption / floorAverage).toFixed(1);
      
      // Fire Audio
      if (isCritical) {
        playAlertSound();
      }
      
      // Update Banner
      alertBannerText.textContent = isCritical ? 'CRITICAL HIGH CONSUMPTION DETECTED' : 'WARNING: ABNORMAL CONSUMPTION';
      alertBanner.className = `alert-banner show ${isCritical ? '' : 'warning'}`;
      
      // Update Toast
      if (occupancyAlert) {
        alertComparison.textContent = `CRITICAL WASTE DETECTED: Empty Room`;
      } else if (forceLightAlert) {
        alertComparison.textContent = `Continuous device operation detected.`;
      } else {
        alertComparison.textContent = `You are consuming ${ratio}× more than the average room right now.`;
      }
      
      alertCause.textContent = causeText;
      alertAction.textContent = actionText;
      
      const studentNames = roomData.students.map(s => s.name).join(', ');
      notifiedList.textContent = studentNames;
      
      notificationToast.className = `notification-toast glass-panel show ${isCritical ? '' : 'warning'}`;

      // Push Desktop Notification (Backend/System Level)
      if (Notification.permission === "granted") {
        new Notification("EnergyIQ Alert", {
          body: `${causeText} ${actionText}`,
          icon: isCritical ? "⚠️" : "⚡"
        });
      }

      // Hackathon Phone Dispatch Logic (WhatsApp + SMS)
      if (status === 'warning' || status === 'critical') {
        const firstStudent = roomData.students[0];
        if (firstStudent && firstStudent.phone) {
          
          const alertMsg = `*EnergyIQ Alert*\nRoom ${currentRoom} is consuming ${ratio}x more than average.\nCause: ${causeText}\nAction: ${actionText}`;
          const encodedMsg = encodeURIComponent(alertMsg);
          const waUrl = `https://api.whatsapp.com/send?phone=91${firstStudent.phone}&text=${encodedMsg}`;
          const smsUrl = `sms:+91${firstStudent.phone}?body=${encodedMsg}`;
          
          // Container for the buttons
          let dispatchContainer = document.getElementById('dispatchContainer');
          if (!dispatchContainer) {
            dispatchContainer = document.createElement('div');
            dispatchContainer.id = 'dispatchContainer';
            dispatchContainer.style.display = 'flex';
            dispatchContainer.style.gap = '0.5rem';
            dispatchContainer.style.marginTop = '1rem';
            document.querySelector('.toast-body').appendChild(dispatchContainer);
          }
          
          // WhatsApp Button
          let waBtn = document.getElementById('waDispatchBtn');
          if (!waBtn) {
            waBtn = document.createElement('a');
            waBtn.id = 'waDispatchBtn';
            waBtn.className = 'btn text-center';
            waBtn.style.padding = '0.5rem 0.5rem';
            waBtn.style.flex = '1';
            waBtn.style.background = '#25D366';
            waBtn.style.color = '#fff';
            waBtn.style.textDecoration = 'none';
            waBtn.style.fontWeight = 'bold';
            waBtn.style.fontSize = '0.85rem';
            waBtn.style.borderRadius = '8px';
            waBtn.textContent = 'WhatsApp  🚀';
            waBtn.target = '_blank';
            dispatchContainer.appendChild(waBtn);
          }
          waBtn.href = waUrl;

           // Normal SMS Text Message Button
           let smsBtn = document.getElementById('smsDispatchBtn');
           if (!smsBtn) {
             smsBtn = document.createElement('a');
             smsBtn.id = 'smsDispatchBtn';
             smsBtn.className = 'btn text-center';
             smsBtn.style.padding = '0.5rem 0.5rem';
             smsBtn.style.flex = '1';
             smsBtn.style.background = '#3b82f6';
             smsBtn.style.color = '#fff';
             smsBtn.style.textDecoration = 'none';
             smsBtn.style.fontWeight = 'bold';
             smsBtn.style.fontSize = '0.85rem';
             smsBtn.style.borderRadius = '8px';
             smsBtn.textContent = 'Text / SMS 💬';
             dispatchContainer.appendChild(smsBtn);
           }
           smsBtn.href = smsUrl;
           
           // AUTOMATIC DISPATCH: Fire it automatically on escalation!
           if (!window.smsAutoFiredStatus || window.smsAutoFiredStatus !== status) {
               window.smsAutoFiredStatus = status;
               console.log("[SYSTEM] Automatically dispatching message overlay to cellular network...");
               
               // For a frontend demo, we automatically trigger the Whatsapp URL
               // Note: Browsers block popups that aren't clicked. You MUST "Allow Popups" for localhost in Chrome.
               setTimeout(() => {
                   window.open(waUrl, '_blank');
               }, 500);
           }
        }
      } else {
        window.smsAutoFiredStatus = null;
        const dContainer = document.getElementById('dispatchContainer');
        if (dContainer) dContainer.remove();
      }
    }
    
    // Auto-hide toast after 10s if warning, keep if critical
    if (status === 'warning' && previousStatus !== 'warning') {
      setTimeout(() => notificationToast.classList.remove('show'), 8000);
    }
    
    previousStatus = status;
  });
});
