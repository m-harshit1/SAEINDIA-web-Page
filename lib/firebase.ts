"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/* Firebase web config. These values are public identifiers (not secrets);
   access is controlled by firestore.rules and Firebase Auth. */
const firebaseConfig = {
  apiKey: "AIzaSyAZ3SgtXv-2xa-gUjmKaQIOwFGIGQYqgkA",
  authDomain: "sae-iiitdm-kurnool.firebaseapp.com",
  projectId: "sae-iiitdm-kurnool",
  storageBucket: "sae-iiitdm-kurnool.firebasestorage.app",
  messagingSenderId: "101393985278",
  appId: "1:101393985278:web:d94a7000c8ed6902bdbfaf",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
