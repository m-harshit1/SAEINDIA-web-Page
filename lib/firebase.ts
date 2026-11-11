"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

/* Firebase web config with Google Analytics measurementId */
const firebaseConfig = {
  apiKey: "AIzaSyAZ3SgtXv-2xa-gUjmKaQIOwFGIGQYqgkA",
  authDomain: "sae-iiitdm-kurnool.firebaseapp.com",
  projectId: "sae-iiitdm-kurnool",
  storageBucket: "sae-iiitdm-kurnool.firebasestorage.app",
  messagingSenderId: "101393985278",
  appId: "1:101393985278:web:d94a7000c8ed6902bdbfaf",
  measurementId: "G-3NVZZZGFEF",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

export let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
