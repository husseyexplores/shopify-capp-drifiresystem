import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const app =
  getApps().length > 0 ? getApp() ?? initializeApp() : initializeApp();
export const db = getFirestore(app);
export const C = {
  stores: db.collection("stores"),
};
