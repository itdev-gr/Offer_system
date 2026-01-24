import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

async function initializeAdmin() {
  if (app && adminAuth && adminDb) {
    return { app, adminAuth, adminDb };
  }

  if (getApps().length > 0) {
    app = getApps()[0];
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
    return { app, adminAuth, adminDb };
  }

  // Try service account JSON first (works well in Vercel env vars)
  const serviceAccountJson = import.meta.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = import.meta.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      app = initializeApp({
        credential: cert(parsed),
      });
    } catch (error) {
      console.error('Error parsing service account JSON:', error);
      throw error;
    }
  } else if (serviceAccountPath) {
    try {
      // Use Node.js fs to read the service account file
      const fs = await import('node:fs');
      const path = await import('node:path');
      const filePath = path.resolve(process.cwd(), serviceAccountPath);
      const serviceAccountFileJson = JSON.parse(
        fs.readFileSync(filePath, 'utf8')
      );
      app = initializeApp({
        credential: cert(serviceAccountFileJson),
      });
    } catch (error) {
      console.error('Error loading service account file:', error);
      throw error;
    }
  } else {
    // Use individual environment variables
    const projectId = import.meta.env.FIREBASE_PROJECT_ID;
    const clientEmail = import.meta.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = import.meta.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin configuration missing. Provide either FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY'
      );
    }

    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
  return { app, adminAuth, adminDb };
}

export async function getAdminAuth() {
  const { adminAuth } = await initializeAdmin();
  return adminAuth!;
}

export async function getAdminDb() {
  const { adminDb } = await initializeAdmin();
  return adminDb!;
}

export { app, adminAuth, adminDb };
