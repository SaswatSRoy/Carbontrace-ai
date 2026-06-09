"use client";

import React, { useEffect, useState } from "react";
import { WhatIfPanel } from "../../../components/simulate/WhatIfPanel";
import { auth, db } from "../../../lib/firebase/client";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Skeleton } from "../../../components/ui/Skeleton";

export default function SimulatePage() {
  const [profile, setProfile] = useState<any>(null);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const profileSnap = await getDoc(doc(db, "users", user.uid, "profile", "data"));
          if (profileSnap.exists()) {
            setProfile(profileSnap.data());
          }
          
          const logsRef = collection(db, "users", user.uid, "carbon_logs");
          const q = query(logsRef, orderBy("timestamp", "desc"), limit(1));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setScore(snapshot.docs[0].data().score.totalKgCO2eYear);
          }
        } catch (err) {
          console.error("Failed to load simulate data", err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      <header className="mb-8 max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-text mb-2">Simulate Changes</h1>
        <p className="text-muted">Adjust lifestyle factors to see how they impact your footprint in real-time.</p>
      </header>
      <div className="flex-1 w-full max-w-5xl mx-auto">
        {loading ? (
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        ) : profile && score ? (
          <WhatIfPanel baseProfile={profile} baseScoreKg={score} />
        ) : (
          <div className="flex-1 flex items-center justify-center h-64 bg-surface rounded-2xl border border-surface-2">
            <p className="text-muted">Please complete your profile to use the simulator.</p>
          </div>
        )}
      </div>
    </div>
  );
}
