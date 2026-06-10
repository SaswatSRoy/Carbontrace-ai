"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebase/client";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import dynamic from "next/dynamic";
import { Skeleton } from "../../../components/ui/Skeleton";
import { Activity } from "lucide-react";

const TrendLine = dynamic(() => import("../../../components/dashboard/TrendLine").then(mod => mod.TrendLine), { ssr: false });
const ComparisonBars = dynamic(() => import("../../../components/dashboard/ComparisonBars").then(mod => mod.ComparisonBars), { ssr: false });

export default function ProgressPage() {
  const [history, setHistory] = useState<{ date: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Progress - CarbonTrace AI";
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const logsRef = collection(db, "users", user.uid, "carbon_logs");
          const q = query(logsRef, orderBy("timestamp", "asc"), limit(12));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const parsed = snapshot.docs.map(doc => {
              const data = doc.data();
              // Format timestamp to short date string like "Week 1", "Week 2", or actual dates
              const dateObj = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
              const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return {
                date: dateStr,
                score: data.score.totalKgCO2eYear
              };
            });
            setHistory(parsed);
          }
        } catch (err) {
          console.error("Failed to fetch history", err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const currentScore = history.length > 0 ? history[history.length - 1].score : 0;
  const nationalAvg = 10000;
  const target = 2500;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      <header className="mb-8 max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-text mb-2 flex items-center">
          <Activity className="mr-3 text-primary" size={28} />
          Your Progress
        </h1>
        <p className="text-muted">Track your carbon emissions over time.</p>
      </header>
      
      <div className="flex-1 w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface p-6 rounded-2xl border border-surface-2 shadow-subtle flex flex-col">
          <h2 className="text-xl font-bold text-text mb-6">Historical Trend</h2>
          {loading ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : history.length > 0 ? (
            <TrendLine data={history} />
          ) : (
            <div className="flex-1 flex items-center justify-center h-72">
              <p className="text-muted">No historical data available.</p>
            </div>
          )}
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-surface-2 shadow-subtle flex flex-col">
          <h2 className="text-xl font-bold text-text mb-6">Comparison</h2>
          {loading ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : currentScore > 0 ? (
            <ComparisonBars userScore={currentScore} nationalAverage={nationalAvg} targetScore={target} />
          ) : (
            <div className="flex-1 flex items-center justify-center h-72">
              <p className="text-muted">No score available to compare.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
