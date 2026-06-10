import { adminDb } from "./admin";
import { UserProfile, CarbonLog, Action, ActionStatus } from "../carbon/types";
import { DocumentData, QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";

/**
 * Generic Firestore data converter helper.
 */
const converter = <T extends object>() => ({
  toFirestore: (data: T): DocumentData => {
    // Convert Dates to Timestamps for Firestore
    const converted: Record<string, unknown> = { ...data } as Record<string, unknown>;
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Date) {
        converted[key] = Timestamp.fromDate(converted[key]);
      }
    });
    return converted;
  },
  fromFirestore: (snap: QueryDocumentSnapshot): T => {
    const data = snap.data();
    // Convert Timestamps back to Dates
    Object.keys(data).forEach(key => {
      if (data[key] instanceof Timestamp) {
        data[key] = data[key].toDate();
      }
    });
    return data as T;
  }
});

// -- User Profiles --

/**
 * Retrieves the user's profile.
 * @param uid - The unique user ID
 * @returns UserProfile or null if not found
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = adminDb.collection("users").doc(uid).collection("profile").doc("main").withConverter(converter<UserProfile>());
  const snapshot = await docRef.get();
  return snapshot.exists ? snapshot.data() ?? null : null;
}

/**
 * Saves or updates a user's profile.
 * @param uid - The unique user ID
 * @param profile - The profile fields to update
 */
export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  const docRef = adminDb.collection("users").doc(uid).collection("profile").doc("main").withConverter(converter<Partial<UserProfile>>());
  
  const updateData = { ...profile, updatedAt: new Date() };
  if (!profile.createdAt) {
    // We assume if createdAt is not provided, this might be an initial save. 
    // Usually handled securely, but we'll use set with merge.
    await docRef.set(updateData, { merge: true });
  } else {
    await docRef.set(updateData, { merge: true });
  }
}

// -- Carbon Logs --

/**
 * Adds a new carbon footprint log.
 * @param uid - The unique user ID
 * @param log - The CarbonLog data
 * @returns The newly created document ID
 */
export async function addCarbonLog(uid: string, log: CarbonLog): Promise<string> {
  const collRef = adminDb.collection("users").doc(uid).collection("logs").withConverter(converter<CarbonLog>());
  const docRef = await collRef.add({ ...log, createdAt: new Date() });
  return docRef.id;
}

/**
 * Retrieves recent carbon logs.
 * @param uid - The unique user ID
 * @param limitCount - The maximum number of logs to return (default: 50)
 * @returns Array of CarbonLogs
 */
export async function getCarbonLogs(uid: string, limitCount: number = 50): Promise<CarbonLog[]> {
  const collRef = adminDb.collection("users").doc(uid).collection("logs").withConverter(converter<CarbonLog>());
  const snapshot = await collRef.orderBy("date", "desc").limit(limitCount).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Retrieves carbon logs within a specific date range.
 * @param uid - The unique user ID
 * @param from - The start date
 * @param to - The end date
 * @returns Array of CarbonLogs
 */
export async function getLogsByDateRange(uid: string, from: Date, to: Date): Promise<CarbonLog[]> {
  const collRef = adminDb.collection("users").doc(uid).collection("logs").withConverter(converter<CarbonLog>());
  const snapshot = await collRef
    .where("date", ">=", from)
    .where("date", "<=", to)
    .orderBy("date", "asc")
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// -- Actions --

/**
 * Saves multiple actions in a single batch write.
 * @param uid - The unique user ID
 * @param actions - An array of Action objects
 */
export async function saveActions(uid: string, actions: Action[]): Promise<void> {
  const batch = adminDb.batch();
  const collRef = adminDb.collection("users").doc(uid).collection("actions").withConverter(converter<Action>());

  actions.forEach(action => {
    const docRef = action.id ? collRef.doc(action.id) : collRef.doc();
    batch.set(docRef, { ...action, status: action.status || "pending", createdAt: action.createdAt || new Date() }, { merge: true });
  });

  await batch.commit();
}

/**
 * Retrieves the user's action plan.
 * @param uid - The unique user ID
 * @returns Array of Actions
 */
export async function getActions(uid: string): Promise<Action[]> {
  const collRef = adminDb.collection("users").doc(uid).collection("actions").withConverter(converter<Action>());
  const snapshot = await collRef.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Updates the status of an existing action.
 * @param uid - The unique user ID
 * @param actionId - The ID of the action to update
 * @param status - The new status
 */
export async function updateActionStatus(uid: string, actionId: string, status: ActionStatus): Promise<void> {
  const docRef = adminDb.collection("users").doc(uid).collection("actions").doc(actionId).withConverter(converter<Action>());
  await docRef.update({ status, updatedAt: new Date() });
}

// -- Insights Cache --

interface InsightsCache {
  insights: Action[];
  cachedAt: Date;
}

/**
 * Retrieves cached LLM insights to reduce API calls.
 * @param uid - The unique user ID
 * @returns Cached insights or null if not found
 */
export async function getCachedInsights(uid: string): Promise<{ insights: Action[], cachedAt: Date } | null> {
  const docRef = adminDb.collection("users").doc(uid).collection("insights").doc("cache").withConverter(converter<InsightsCache>());
  const snapshot = await docRef.get();
  return snapshot.exists ? snapshot.data() ?? null : null;
}

/**
 * Caches newly generated LLM insights.
 * @param uid - The unique user ID
 * @param insights - The actions/insights to cache
 */
export async function setCachedInsights(uid: string, insights: Action[]): Promise<void> {
  const docRef = adminDb.collection("users").doc(uid).collection("insights").doc("cache").withConverter(converter<InsightsCache>());
  await docRef.set({ insights, cachedAt: new Date() });
}
