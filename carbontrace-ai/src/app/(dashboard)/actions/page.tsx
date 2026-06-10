"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { ActionCard } from "../../../components/actions/ActionCard";
import { Skeleton } from "../../../components/ui/Skeleton";
import { Sparkles } from "lucide-react";

import { Action } from "../../../lib/carbon/types";

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Action Plan - CarbonTrace AI";
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const insightsRef = doc(db, "users", user.uid, "insights", "latest");
          const snap = await getDoc(insightsRef);
          if (snap.exists()) {
            setActions(snap.data().actions || []);
          }
        } catch (err) {
          console.error("Failed to fetch actions", err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      <header className="mb-8 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-text mb-2 flex items-center">
          <Sparkles className="mr-3 text-primary" size={28} />
          Your Action Plan
        </h1>
        <p className="text-muted">Personalized recommendations from Gemini based on your profile.</p>
      </header>
      
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        ) : actions.length > 0 ? (
          actions.map((action, i) => (
            <ActionCard key={i} action={action} onAccept={() => {}} onDismiss={() => {}} />
          ))
        ) : (
          <div className="text-center p-8 bg-surface border border-surface-2 rounded-2xl">
            <p className="text-muted">No actions available yet. Complete onboarding or upload a bill to get recommendations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
