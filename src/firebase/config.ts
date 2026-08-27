import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import configJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: configJson.projectId,
  appId: configJson.appId,
  apiKey: configJson.apiKey,
  authDomain: configJson.authDomain,
  storageBucket: configJson.storageBucket,
  messagingSenderId: configJson.messagingSenderId,
  measurementId: configJson.measurementId
};

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
}, configJson.firestoreDatabaseId);
