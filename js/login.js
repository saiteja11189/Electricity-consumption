document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const roomNumber = document.getElementById('roomNumber').value.trim();
  const errorMsg = document.getElementById('loginError');
  
  // Validate if room exists in DB
  const roomData = await DB.getRoom(roomNumber);
  
  if (roomData) {
    // Valid room, store session
    sessionStorage.setItem('currentRoom', roomNumber);
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  } else {
    // Show error
    errorMsg.style.display = 'block';
    errorMsg.textContent = `Room ${roomNumber} not found. Try 101.`;
  }
});
