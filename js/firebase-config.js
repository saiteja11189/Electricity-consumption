// Replace this configuration with your actual Firebase project config
// 1. Go to console.firebase.google.com
// 2. Create a project
// 3. Add a Web App to get this config object
// 4. Create a Realtime Database and set rules to public for testing:
//    { "rules": { ".read": true, ".write": true } }

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
let database = null;
let isFirebaseConfigured = false;

try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    isFirebaseConfigured = true;
    console.log("Firebase initialized successfully");
  } else {
    console.warn("⚠️ FIREBASE NOT CONFIGURED: Please update js/firebase-config.js with your credentials.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// ============================================
// LOCAL MOCK DATABASE (For testing without Firebase)
// Fallback mechanism that uses BroadcastChannel/LocalStorage 
// to simulate real-time sync between tabs temporarily.
// ============================================
const sysChannel = new BroadcastChannel('energy_iq_sync');
const DB_VERSION = 2; // Bump version to force cache update

const INITIAL_DATA = {
  system: { floorAverage: 15 },
  rooms: {
    "101": {
      students: [{name: "K SAI TEJA", phone: "7661017992"}],
      devices: {
        "ac": { hours: 2, name: "AC", multiplier: 1.5, isOn: true },
        "fan": { hours: 5, name: "Fan", multiplier: 0.1, isOn: true },
        "light": { hours: 6, name: "Light", multiplier: 0.05, isOn: true },
        "cooler": { hours: 0, name: "Cooler", multiplier: 0.5, isOn: false }
      },
      status: "normal",
      alertMessage: ""
    },
    "102": {
      students: [{name: "SAI", phone: "8885600608"}],
      devices: {
        "ac": { hours: 2, name: "AC", multiplier: 1.5, isOn: true },
        "fan": { hours: 5, name: "Fan", multiplier: 0.1, isOn: true },
        "light": { hours: 6, name: "Light", multiplier: 0.05, isOn: true },
        "cooler": { hours: 0, name: "Cooler", multiplier: 0.5, isOn: false }
      },
      status: "normal",
      alertMessage: ""
    },
    "103": {
      students: [{name: "ARAVIND NAIDU", phone: "9703259106"}],
      devices: { "ac": { hours: 2, name: "AC", multiplier: 1.5, isOn: true }, "fan": { hours: 5, name: "Fan", multiplier: 0.1, isOn: true }, "light": { hours: 6, name: "Light", multiplier: 0.05, isOn: true }, "cooler": { hours: 0, name: "Cooler", multiplier: 0.5, isOn: false } },
      status: "normal"
    },
    "104": {
      students: [{name: "SHYAMAL RAO", phone: "6309620800"}],
      devices: { "ac": { hours: 2, name: "AC", multiplier: 1.5, isOn: true }, "fan": { hours: 5, name: "Fan", multiplier: 0.1, isOn: true }, "light": { hours: 6, name: "Light", multiplier: 0.05, isOn: true }, "cooler": { hours: 0, name: "Cooler", multiplier: 0.5, isOn: false } },
      status: "normal"
    },
    "105": {
      students: [{name: "VAMSI", phone: "9392092331"}],
      devices: { "ac": { hours: 2, name: "AC", multiplier: 1.5, isOn: true }, "fan": { hours: 5, name: "Fan", multiplier: 0.1, isOn: true }, "light": { hours: 6, name: "Light", multiplier: 0.05, isOn: true }, "cooler": { hours: 0, name: "Cooler", multiplier: 0.5, isOn: false } },
      status: "normal"
    }
  }
};

const CURRENT_VERSION = "4";
// If using local storage, populate it and check version
if (localStorage.getItem('energyIqVersion') !== CURRENT_VERSION && !isFirebaseConfigured) {
  localStorage.removeItem('energyIqDb');
  localStorage.setItem('energyIqDb', JSON.stringify(INITIAL_DATA));
  localStorage.setItem('energyIqVersion', CURRENT_VERSION);
}

function getLocalData() {
  return JSON.parse(localStorage.getItem('energyIqDb')) || INITIAL_DATA;
}

function saveLocalData(data) {
  localStorage.setItem('energyIqDb', JSON.stringify(data));
  sysChannel.postMessage('sync');
}

// Wrapper to standardise DB operations across real/mock Firebase
const DB = {
  getRoom: async (roomId) => {
    if (isFirebaseConfigured) {
      const snapshot = await database.ref('rooms/' + roomId).once('value');
      return snapshot.val();
    } else {
      return getLocalData().rooms[roomId];
    }
  },
  
  getAllRooms: async () => {
    if (isFirebaseConfigured) {
      const snapshot = await database.ref('rooms').once('value');
      return snapshot.val();
    } else {
      return getLocalData().rooms;
    }
  },

  updateRoom: async (roomId, updates) => {
    if (isFirebaseConfigured) {
      await database.ref('rooms/' + roomId).update(updates);
    } else {
      const data = getLocalData();
      data.rooms[roomId] = { ...data.rooms[roomId], ...updates };
      saveLocalData(data);
    }
  },

  listenToRoom: (roomId, callback) => {
    if (isFirebaseConfigured) {
      database.ref('rooms/' + roomId).on('value', (snapshot) => {
        callback(snapshot.val());
      });
    } else {
      // Intial call
      callback(getLocalData().rooms[roomId]);
      
      // Listen to channel and storage for other tab updates
      sysChannel.onmessage = () => {
        callback(getLocalData().rooms[roomId]);
      };
      window.addEventListener('storage', (e) => {
        if(e.key === 'energyIqDb') callback(getLocalData().rooms[roomId]);
      });
    }
  },

  listenToAllRooms: (callback) => {
    if (isFirebaseConfigured) {
      database.ref('rooms').on('value', (snapshot) => {
        callback(snapshot.val());
      });
    } else {
      callback(getLocalData().rooms);
      sysChannel.onmessage = () => {
        callback(getLocalData().rooms);
      };
      window.addEventListener('storage', (e) => {
        if(e.key === 'energyIqDb') callback(getLocalData().rooms);
      });
    }
  },

  getFloorAverage: async () => {
    if (isFirebaseConfigured) {
      const snap = await database.ref('system/floorAverage').once('value');
      return snap.val() || 15;
    }
    return getLocalData().system.floorAverage;
  }
};
