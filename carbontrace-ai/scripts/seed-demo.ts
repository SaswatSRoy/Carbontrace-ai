import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

// Initialize Admin SDK
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials in .env.local");
  process.exit(1);
}

const apps = getApps();
const adminApp = apps.length === 0 ? initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
}) : apps[0];

const auth = getAuth(adminApp);
const db = getFirestore(adminApp, "carbontrace-ai");

const DEMO_EMAIL = "demo@carbontrace.app";
const DEMO_PASSWORD = "Demo2026!";

async function seedDemo() {
  console.log("🌱 Starting Demo Data Seeding...");

  let demoUserId = "";

  // 1. Create or get user
  try {
    const user = await auth.getUserByEmail(DEMO_EMAIL);
    demoUserId = user.uid;
    console.log(`User already exists. Updating password. UID: ${demoUserId}`);
    await auth.updateUser(demoUserId, { password: DEMO_PASSWORD });
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      const newUser = await auth.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        displayName: "Demo User",
        emailVerified: true,
      });
      demoUserId = newUser.uid;
      console.log(`Created new demo user. UID: ${demoUserId}`);
    } else {
      throw error;
    }
  }

  // 2. Seed User Profile
  const userProfile = {
    userId: demoUserId,
    location: {
      country: "UK",
      city: "London",
      gridEmissionFactor: 0.233, // UK grid factor
    },
    transport: {
      carKmPerWeek: 150,
      fuelType: "petrol",
      publicTransportTripsPerWeek: 4,
      flightsPerYear: 1,
      avgFlightDurationHours: 3,
      cycleKmPerWeek: 0,
    },
    homeEnergy: {
      electricityKwhPerMonth: 250,
      heatingType: "gas",
      numOccupants: 2,
      renewableEnergyPercent: 20,
    },
    diet: "medium_meat",
    shoppingIntensity: "average",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await db.collection("users").doc(demoUserId).set(userProfile);
  console.log("✅ User profile seeded.");

  // 3. Seed 12 weeks of CarbonLog entries (Downward trend)
  const logsRef = db.collection(`users/${demoUserId}/carbon_logs`);
  const now = new Date();
  
  // Clean existing logs first
  const existingLogs = await logsRef.get();
  const batch = db.batch();
  existingLogs.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  let baseScore = 18000; // Starting high
  for (let i = 11; i >= 0; i--) {
    const logDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    // Gradual reduction with some noise
    const reduction = 200 + Math.random() * 100;
    baseScore = Math.max(12000, baseScore - reduction);
    
    await logsRef.add({
      timestamp: Timestamp.fromDate(logDate),
      score: {
        totalKgCO2eYear: baseScore,
        breakdown: {
          transport: baseScore * 0.35,
          homeEnergy: baseScore * 0.3,
          food: baseScore * 0.15,
          shopping: baseScore * 0.15,
          waste: baseScore * 0.05,
        },
        nationalAverageKg: 10500, // UK average
        targetKg: 2300,
        percentileVsNational: 75 - (11 - i) * 2, // Improving percentile
        equivalences: {
          treesNeededToOffset: Math.round(baseScore / 22),
          kmsDrivenEquivalent: Math.round(baseScore / 0.192),
          flightsEquivalent: Math.round(baseScore / 1000),
        }
      },
      source: "weekly_snapshot",
      metadata: {}
    });
  }
  console.log("✅ 12 weeks of CarbonLog entries seeded.");

  // 4. Seed Actions Tracking
  const actionsRef = db.collection(`users/${demoUserId}/actions`);
  const existingActions = await actionsRef.get();
  const aBatch = db.batch();
  existingActions.docs.forEach((doc) => aBatch.delete(doc.ref));
  await aBatch.commit();

  const actions = [
    { title: "Switch to LED bulbs", status: "completed", savedKg: 150, category: "homeEnergy" },
    { title: "Meatless Mondays", status: "completed", savedKg: 200, category: "food" },
    { title: "Take bus to work twice a week", status: "accepted", category: "transport" },
    { title: "Buy 100% renewable electricity", status: "accepted", category: "homeEnergy" },
    { title: "Compost food waste", status: "accepted", category: "waste" },
  ];

  for (const action of actions) {
    await actionsRef.add({
      actionId: action.title.replace(/\s+/g, "_").toLowerCase(),
      title: action.title,
      status: action.status,
      timestamp: Timestamp.now(),
      ...(action.savedKg && { savedKg: action.savedKg }),
    });
  }
  console.log("✅ Actions tracked (3 accepted, 2 completed).");

  // 5. Seed Cached Insights
  const insightsRef = db.collection(`users/${demoUserId}/insights`);
  const existingInsights = await insightsRef.get();
  const iBatch = db.batch();
  existingInsights.docs.forEach((doc) => iBatch.delete(doc.ref));
  await iBatch.commit();

  await insightsRef.doc("latest").set({
    actions: [
      {
        title: "Lower thermostat by 1°C",
        description: "Reducing your heating temperature slightly can save significant energy over winter.",
        annual_saving_kg: 310,
        difficulty: "easy",
        cost_impact: "saves_money",
        category: "homeEnergy",
        why_this_applies_to_user: "Your gas heating makes up a large portion of your footprint."
      },
      {
        title: "Carpool to work",
        description: "Share rides with colleagues to cut your petrol usage in half.",
        annual_saving_kg: 450,
        difficulty: "medium",
        cost_impact: "saves_money",
        category: "transport",
        why_this_applies_to_user: "You drive 150km per week in a petrol car."
      },
      {
        title: "Try a flexitarian diet",
        description: "Swap out 2-3 meat meals a week for plant-based alternatives.",
        annual_saving_kg: 280,
        difficulty: "medium",
        cost_impact: "free",
        category: "food",
        why_this_applies_to_user: "You currently have a medium meat diet."
      },
      {
        title: "Install a smart thermostat",
        description: "Automate your heating to only be on when you're home.",
        annual_saving_kg: 220,
        difficulty: "medium",
        cost_impact: "investment",
        category: "homeEnergy",
        why_this_applies_to_user: "Optimizing your gas heating can reduce waste."
      },
      {
        title: "Buy second-hand clothes",
        description: "Opt for thrift stores or apps like Vinted instead of fast fashion.",
        annual_saving_kg: 100,
        difficulty: "easy",
        cost_impact: "saves_money",
        category: "shopping",
        why_this_applies_to_user: "An easy way to lower your average shopping footprint."
      }
    ],
    generatedAt: Timestamp.now(),
  });
  console.log("✅ Cached insights seeded (5 actions).");

  console.log("🎉 Demo seeding complete!");
  process.exit(0);
}

seedDemo().catch(console.error);
