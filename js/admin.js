document.addEventListener('DOMContentLoaded', async () => {
  const adminRoomsGrid = document.getElementById('adminRoomsGrid');
  const floorAverage = await DB.getFloorAverage();
  document.getElementById('adminFloorAvg').textContent = floorAverage;
  
  // Create sliders for each internal room state
  let roomsData = {};

  const calculateStatus = (total) => {
    if (total >= floorAverage * 1.5) return 'critical';
    if (total > floorAverage) return 'warning';
    return 'normal';
  };

  const syncToDB = async (roomId) => {
    await DB.updateRoom(roomId, roomsData[roomId]);
  };

  const onSliderChange = (roomId, deviceKey, value) => {
    const room = roomsData[roomId];
    room.devices[deviceKey].hours = parseInt(value);
    
    // Recalculate total consumption
    let total = 0;
    for (const key in room.devices) {
      total += (room.devices[key].hours * room.devices[key].multiplier);
    }
    room.totalConsumption = total;
    room.status = calculateStatus(total);
    
    // Update local UI immediately
    renderRoom(roomId);
    
    // Push update to DB
    syncToDB(roomId);
  };

  const toggleOccupancy = (roomId) => {
    roomsData[roomId].isEmpty = !roomsData[roomId].isEmpty;
    renderRoom(roomId);
    syncToDB(roomId);
  };

  const getBadgeClass = (status) => {
    if (status === 'critical') return 'badge-critical';
    if (status === 'warning') return 'badge-warning';
    if (status === 'elevated') return 'badge-elevated';
    return 'badge-normal';
  };

  const getTotalClass = (status) => {
    if (status === 'critical') return 'highlight-critical';
    if (status === 'warning' || status === 'elevated') return 'highlight-warning';
    return 'text-primary';
  };

  const renderRoom = (roomId) => {
    const room = roomsData[roomId];
    let card = document.getElementById(`room-card-${roomId}`);
    
    if (!card) {
      card = document.createElement('div');
      card.className = 'admin-room-card glass-panel';
      card.id = `room-card-${roomId}`;
      adminRoomsGrid.appendChild(card);
    }
    
    // Check if the card is red / yellow locally to show effect
    if (room.status === 'critical') {
      card.style.borderColor = 'var(--danger)';
      card.style.boxShadow = '0 0 15px var(--danger-glow)';
    } else if (room.status === 'warning') {
      card.style.borderColor = 'var(--warning)';
      card.style.boxShadow = '0 0 15px var(--warning-glow)';
    } else {
      card.style.borderColor = 'var(--panel-border)';
      card.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
    }

    let devicesHtml = '';
    for (const [key, device] of Object.entries(room.devices)) {
      devicesHtml += `
        <div class="device-slider-group">
          <div class="device-slider-header">
            <span>${device.name}</span>
            <span class="val">${device.hours}h</span>
          </div>
          <input type="range" min="0" max="15" value="${device.hours}" class="slider" 
            oninput="window.adminSliderChange('${roomId}', '${key}', this.value)">
        </div>
      `;
    }

    card.innerHTML = `
      <div class="room-header" style="margin-bottom: 0.5rem;">
        <h3 class="room-title">Room ${roomId}</h3>
        <span class="room-status-badge ${getBadgeClass(room.status)}">${room.status}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <span style="font-size: 0.85rem; color: var(--text-secondary);">Occupancy Sensor:</span>
        <button onclick="window.adminToggleOccupancy('${roomId}')" style="background: ${room.isEmpty ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${room.isEmpty ? '#fca5a5' : '#10b981'}; border: 1px solid ${room.isEmpty ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)'}; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">
          ${room.isEmpty ? 'EMPTY' : 'OCCUPIED'}
        </button>
      </div>
      <div>
        ${devicesHtml}
      </div>
      <div class="room-total">
        <span>Total Load</span>
        <span class="room-total-val ${getTotalClass(room.status)}">${room.totalConsumption ? room.totalConsumption.toFixed(1) : "0.0"} <small>kWh</small></span>
      </div>
    `;
  };

  // Expose to window for inline onclick handler
  window.adminSliderChange = onSliderChange;
  window.adminToggleOccupancy = toggleOccupancy;

  // Initialize data
  DB.listenToAllRooms((data) => {
    if (!data) return;
    // For admin, we just want to initially populate, then take over sync.
    // Or we actively listen so multiple admins would sync nicely.
    // To prevent slider jumping while dragging, a robust implementation would debounce or separate UI state.
    // For demo simplicity, we allow overwrite if not dragging.
    const isFirstLoad = Object.keys(roomsData).length === 0;
    
    roomsData = data;
    for (const roomId in data) {
      // Always recalculate on load to ensure logic updates apply over old cache
      let total = 0;
      for (const key in roomsData[roomId].devices) {
        total += (roomsData[roomId].devices[key].hours * roomsData[roomId].devices[key].multiplier);
      }
      roomsData[roomId].totalConsumption = total;
      roomsData[roomId].status = calculateStatus(total);
      
      if (!roomsData[roomId].totalConsumption || isFirstLoad) {
        syncToDB(roomId);
      }
      renderRoom(roomId);
    }
  });

});
