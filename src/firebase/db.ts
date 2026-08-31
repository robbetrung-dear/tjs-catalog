import { db } from './config';
import { collection, doc, setDoc, getDoc, getDocs, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';
import { Product, CategoryMeta, InfoTrendItem, StoreProfile, SiteSettings, StockNotification } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_INFO_TRENDS, INITIAL_STORE_PROFILE, INITIAL_SITE_SETTINGS, INITIAL_NOTIFICATIONS } from '../data/initialData';
import { sanitizeProductData } from '../utils/csvHelper';

// References
const productsRef = collection(db, 'products');
const storeDataRef = collection(db, 'storeData');

// Safe doc ID helper
export const sanitizeDocId = (id: string | number): string => {
  const str = String(id || '').trim();
  const safe = str.replace(/[\/\\]+/g, '-').replace(/^[\.]+|[\.]+$/g, '');
  return safe || `prd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

// Initial Setup Check & Auto-Healing
export const initializeFirebaseData = async () => {
  try {
    const profileDoc = await getDoc(doc(storeDataRef, 'storeProfile'));
    if (!profileDoc.exists()) {
      const batch = writeBatch(db);
      batch.set(doc(storeDataRef, 'storeProfile'), INITIAL_STORE_PROFILE);
      batch.set(doc(storeDataRef, 'siteSettings'), INITIAL_SITE_SETTINGS);
      batch.set(doc(storeDataRef, 'categories'), { items: INITIAL_CATEGORIES });
      batch.set(doc(storeDataRef, 'infoTrends'), { items: INITIAL_INFO_TRENDS });
      batch.set(doc(storeDataRef, 'notifications'), { items: INITIAL_NOTIFICATIONS });
      await batch.commit();
    } else {
      // Auto-migrate legacy SST branding in Firestore database to TJS
      const profileData = profileDoc.data();
      if (profileData && (
        profileData.namaToko?.includes('SST') ||
        profileData.konteks?.includes('SST') ||
        profileData.waTemplate?.includes('SST') ||
        profileData.email?.includes('megateknik')
      )) {
        const updatedProfile = {
          ...profileData,
          namaToko: profileData.namaToko ? profileData.namaToko.replace(/SST Catalog/g, 'TJS Catalog').replace(/\bSST\b/g, 'TJS') : INITIAL_STORE_PROFILE.namaToko,
          konteks: profileData.konteks ? profileData.konteks.replace(/SST Catalog/g, 'TJS Catalog').replace(/\bSST\b/g, 'TJS') : INITIAL_STORE_PROFILE.konteks,
          waTemplate: profileData.waTemplate ? profileData.waTemplate.replace(/SST Catalog/g, 'TJS Catalog').replace(/\bSST\b/g, 'TJS') : INITIAL_STORE_PROFILE.waTemplate,
          email: profileData.email?.includes('megateknik') ? 'sales@tjs.com' : (profileData.email || 'sales@tjs.com'),
        };
        await setDoc(doc(storeDataRef, 'storeProfile'), updatedProfile);
      }

      const settingsDoc = await getDoc(doc(storeDataRef, 'siteSettings'));
      if (settingsDoc.exists()) {
        const settingsData = settingsDoc.data();
        if (
          settingsData.footerCopyright?.includes('SST') ||
          settingsData.footerText?.includes('SST') ||
          settingsData.heroTitle?.includes('SST')
        ) {
          await setDoc(doc(storeDataRef, 'siteSettings'), {
            ...settingsData,
            footerCopyright: settingsData.footerCopyright ? settingsData.footerCopyright.replace(/SST Catalog/g, 'TJS Catalog').replace(/\bSST\b/g, 'TJS') : INITIAL_SITE_SETTINGS.footerCopyright,
            footerText: settingsData.footerText ? settingsData.footerText.replace(/SST Catalog/g, 'TJS Catalog').replace(/\bSST\b/g, 'TJS') : INITIAL_SITE_SETTINGS.footerText,
          });
        }
      }
    }

    // Check if products collection is empty and seed initial sample if needed
    const productsSnapshot = await getDocs(productsRef);
    if (productsSnapshot.empty) {
      console.log("Firestore products collection is empty. Populating initial catalog...");
      const cleanProducts = INITIAL_PRODUCTS.map((p, idx) => sanitizeProductData(p, idx));
      for (let i = 0; i < cleanProducts.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = cleanProducts.slice(i, i + 400);
        chunk.forEach(product => {
          const pDoc = doc(productsRef, sanitizeDocId(product.id));
          batch.set(pDoc, product);
        });
        await batch.commit();
      }
    }
  } catch (error) {
    console.warn("Firestore initialization notice:", error);
  }
};

// Listeners with explicit error callbacks
export const listenToProducts = (callback: (products: Product[]) => void) => {
  return onSnapshot(
    productsRef,
    (snapshot) => {
      const products = snapshot.docs.map(doc => doc.data() as Product);
      if (products.length > 0) {
        callback(products);
      }
    },
    (error) => {
      console.warn("Firestore products sync notice:", error.message);
    }
  );
};

export const listenToStoreData = <T>(docId: string, callback: (data: T) => void, isArray = false) => {
  return onSnapshot(
    doc(storeDataRef, docId),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let payload: any = isArray ? data.items : data;

        // Runtime sanitization for legacy SST strings in state
        if (docId === 'storeProfile' && payload && typeof payload === 'object') {
          if (payload.namaToko && payload.namaToko.includes('SST')) {
            payload = {
              ...payload,
              namaToko: payload.namaToko.replace(/SST Catalog/g, 'TJS Catalog').replace(/\bSST\b/g, 'TJS'),
              konteks: payload.konteks ? payload.konteks.replace(/SST Catalog/g, 'TJS Catalog').replace(/\bSST\b/g, 'TJS') : INITIAL_STORE_PROFILE.konteks,
              waTemplate: payload.waTemplate ? payload.waTemplate.replace(/SST Catalog/g, 'TJS Catalog').replace(/\bSST\b/g, 'TJS') : INITIAL_STORE_PROFILE.waTemplate,
            };
          }
        } else if (docId === 'siteSettings' && payload && typeof payload === 'object') {
          if (payload.footerCopyright && payload.footerCopyright.includes('SST')) {
            payload = {
              ...payload,
              footerCopyright: payload.footerCopyright.replace(/SST Catalog/g, 'TJS Catalog').replace(/\bSST\b/g, 'TJS'),
            };
          }
        }

        callback(payload as T);
      }
    },
    (error) => {
      console.warn(`Firestore ${docId} sync notice:`, error.message);
    }
  );
};

// Mutations
export const saveProductToDb = async (product: Product) => {
  const clean = sanitizeProductData(product);
  const docId = sanitizeDocId(clean.id);
  await setDoc(doc(productsRef, docId), clean);
};

export const deleteProductFromDb = async (id: string | number) => {
  const docId = sanitizeDocId(id);
  await deleteDoc(doc(productsRef, docId));
};

export const saveProductsBatch = async (products: Product[], replace: boolean) => {
  if (!products || products.length === 0) {
    throw new Error('Tidak ada data produk yang valid untuk disimpan.');
  }

  // Pre-validate and sanitize all products
  const cleanProducts = products.map((p, idx) => sanitizeProductData(p, idx));

  // If replacing existing database
  if (replace) {
    const snapshot = await getDocs(productsRef);
    const existingDocs = snapshot.docs;
    
    // Chunked batch delete (max 400 per batch)
    for (let i = 0; i < existingDocs.length; i += 400) {
      const deleteBatch = writeBatch(db);
      const chunk = existingDocs.slice(i, i + 400);
      chunk.forEach(d => deleteBatch.delete(d.ref));
      await deleteBatch.commit();
    }
  }
  
  // Chunked batch write (max 400 per batch)
  for (let i = 0; i < cleanProducts.length; i += 400) {
    const writeBatchChunk = writeBatch(db);
    const chunk = cleanProducts.slice(i, i + 400);
    chunk.forEach(p => {
      const docId = sanitizeDocId(p.id);
      writeBatchChunk.set(doc(productsRef, docId), p);
    });
    await writeBatchChunk.commit();
  }
};

export const saveStoreDataToDb = async (docId: string, data: any, isArray = false) => {
  const payload = isArray ? { items: data } : data;
  await setDoc(doc(storeDataRef, docId), payload);
};

export const resetDbToDefault = async () => {
  const snapshot = await getDocs(productsRef);
  const existingDocs = snapshot.docs;
  for (let i = 0; i < existingDocs.length; i += 400) {
    const deleteBatch = writeBatch(db);
    const chunk = existingDocs.slice(i, i + 400);
    chunk.forEach(d => deleteBatch.delete(d.ref));
    await deleteBatch.commit();
  }

  const batch = writeBatch(db);
  batch.set(doc(storeDataRef, 'storeProfile'), INITIAL_STORE_PROFILE);
  batch.set(doc(storeDataRef, 'siteSettings'), INITIAL_SITE_SETTINGS);
  batch.set(doc(storeDataRef, 'categories'), { items: INITIAL_CATEGORIES });
  batch.set(doc(storeDataRef, 'infoTrends'), { items: INITIAL_INFO_TRENDS });
  batch.set(doc(storeDataRef, 'notifications'), { items: INITIAL_NOTIFICATIONS });
  await batch.commit();
  
  const cleanProducts = INITIAL_PRODUCTS.map((p, idx) => sanitizeProductData(p, idx));
  for (let i = 0; i < cleanProducts.length; i += 400) {
    const productBatch = writeBatch(db);
    const chunk = cleanProducts.slice(i, i + 400);
    chunk.forEach(product => {
      const pDoc = doc(productsRef, sanitizeDocId(product.id));
      productBatch.set(pDoc, product);
    });
    await productBatch.commit();
  }
};
