// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

console.log('🔥 Firebase Config Check:');
console.log('Project ID:', firebaseConfig.projectId);
console.log('API Key exists:', !!firebaseConfig.apiKey);
console.log('Auth Domain:', firebaseConfig.authDomain);

// Check for undefined values
const missingKeys = [];
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value || value === 'undefined') {
    console.error(`❌ Missing: ${key}`);
    missingKeys.push(key);
  }
});

if (missingKeys.length > 0) {
  console.error('⚠️ WARNING: Missing Firebase config keys:', missingKeys);
  alert(`⚠️ Firebase configuration incomplete. Missing: ${missingKeys.join(', ')}`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings to prevent hanging
export const db = getFirestore(app);

// Optional: Enable offline persistence (comment out if it causes issues)
// This can sometimes cause conflicts if not properly handled
/*
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('✅ Offline persistence enabled');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Persistence not available in this browser');
    }
  });
*/

console.log('✅ Firebase initialized successfully!');
console.log('📍 Firestore database ready');

// Test function you can call from console
window.testFirestore = async () => {
  try {
    const { collection, addDoc } = await import('firebase/firestore');
    const docRef = await addDoc(collection(db, 'test'), {
      message: 'Console test',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Test successful! Doc ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

console.log('💡 Tip: Run window.testFirestore() in console to test connection');