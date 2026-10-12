// src/firebase.js
// ─── Paste your Firebase config here ───────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup,
         signInWithEmailAndPassword, createUserWithEmailAndPassword,
         signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyBZNIYwz838DRJLyHCALu-hgZ0OG_ZoBLo",
  authDomain:        "culinary-logic-d08a9.firebaseapp.com",
  projectId:         "culinary-logic-d08a9",
  storageBucket:     "culinary-logic-d08a9.firebasestorage.app",
  messagingSenderId: "293552185488",
  appId:             "1:293552185488:web:9302b07907caa03adef815",
};

const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();

// ── Auth helpers ─────────────────────────────────────────────────
export const signInGoogle = () => signInWithPopup(auth, provider);
export const signInEmail  = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
export const signUpEmail  = (email, pass) => createUserWithEmailAndPassword(auth, email, pass);
export const logOut       = () => signOut(auth);
export const onAuth       = (cb) => onAuthStateChanged(auth, cb);

// ── Get fresh token (call before every API request) ─────────────
export const getToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};