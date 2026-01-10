// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TODO: Replace the following with your app's adding the Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDxo6vzJhCxvA1aNb-5WMGhEx5ftebN4F8",
  authDomain: "manimagic-d5833.firebaseapp.com",
  projectId: "manimagic-d5833",
  storageBucket: "manimagic-d5833.firebasestorage.app",
  messagingSenderId: "74063745371",
  appId: "1:74063745371:web:80122ffa81a2be12d48a7e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
