import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import fallbackConfig from '../../firebase-applet-config.json';

export interface FirebaseCustomConfig {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

// 1. Check if user configured local storage override in browser
let localSavedConfig: FirebaseCustomConfig | null = null;
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('tjs_firebase_custom_config');
    if (raw) {
      localSavedConfig = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to parse local custom Firebase config:', err);
  }
}

// 2. Read Vite environment variables
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const envApiKey = env.VITE_FIREBASE_API_KEY as string | undefined;
const envProjectId = env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const envAppId = env.VITE_FIREBASE_APP_ID as string | undefined;
const envAuthDomain = env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
const envStorageBucket = env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;
const envMessagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined;
const envMeasurementId = env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined;
const envDatabaseId = env.VITE_FIREBASE_DATABASE_ID as string | undefined;

const hasEnvOverride = Boolean(envApiKey || envProjectId);
const hasLocalOverride = Boolean(localSavedConfig && (localSavedConfig.projectId || localSavedConfig.apiKey));

export const isUsingCustomFirebase = Boolean(hasLocalOverride || hasEnvOverride);

const resolvedProjectId = localSavedConfig?.projectId || envProjectId || fallbackConfig.projectId;
const resolvedApiKey = localSavedConfig?.apiKey || envApiKey || fallbackConfig.apiKey;
const resolvedAppId = localSavedConfig?.appId || envAppId || fallbackConfig.appId;
const resolvedAuthDomain = localSavedConfig?.authDomain || envAuthDomain || (resolvedProjectId ? `${resolvedProjectId}.firebaseapp.com` : fallbackConfig.authDomain);
const resolvedStorageBucket = localSavedConfig?.storageBucket || envStorageBucket || (resolvedProjectId ? `${resolvedProjectId}.firebasestorage.app` : fallbackConfig.storageBucket);
const resolvedMessagingSenderId = localSavedConfig?.messagingSenderId || envMessagingSenderId || fallbackConfig.messagingSenderId;
const resolvedMeasurementId = localSavedConfig?.measurementId || envMeasurementId || fallbackConfig.measurementId || '';

export const firebaseConfig = {
  projectId: resolvedProjectId,
  appId: resolvedAppId,
  apiKey: resolvedApiKey,
  authDomain: resolvedAuthDomain,
  storageBucket: resolvedStorageBucket,
  messagingSenderId: resolvedMessagingSenderId,
  measurementId: resolvedMeasurementId
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// If custom project ID is provided (e.g. tjs-catalog from env or localStorage), use default database unless explicitly specified.
// Only use applet's custom named database ID if using fallback config.
const customDbId = localSavedConfig?.firestoreDatabaseId || envDatabaseId;
const resolvedDatabaseId = customDbId 
  ? customDbId 
  : (isUsingCustomFirebase ? undefined : (fallbackConfig.firestoreDatabaseId || undefined));

let firestoreInstance: Firestore;
try {
  firestoreInstance = resolvedDatabaseId
    ? initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
      }, resolvedDatabaseId)
    : initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
      });
} catch (err) {
  console.warn('initializeFirestore fallback to getFirestore:', err);
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const currentFirebaseProjectId = resolvedProjectId;
export const currentDatabaseId = resolvedDatabaseId || '(default)';
export const activeConfigOrigin = hasLocalOverride ? 'LocalStorage / Admin Panel' : (hasEnvOverride ? 'Environment Variable (.env)' : 'Default Applet Config');

