"use client";

import React, { useEffect, useState } from "react";
import { auth } from "../../lib/firebase/client"; // assuming available
import { ScoreRing } from "../../components/dashboard/ScoreRing";
import dynamic from "next/dynamic";
const CategoryBreakdown = dynamic(() => import("../../components/dashboard/CategoryBreakdown").then(mod => mod.CategoryBreakdown), { ssr: false });
import { Camera, Sparkles, Target, Activity } from "lucide-react";
import Link from "next/link";
// Mock data or Firebase fetch logic. For phase 4 we will mock or fetch if available.
import { calculateCarbonScore } from "../../lib/carbon/calculator";

import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase/client";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [scoreData, setScoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard - CarbonTrace AI";
    
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch real data from Firestore
          const logsRef = collection(db, "users", currentUser.uid, "carbon_logs");
          const q = query(logsRef, orderBy("timestamp", "desc"), limit(1));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const latestLog = snapshot.docs[0].data();
            setScoreData(latestLog.score);
          } else {
            // No data yet, maybe show 0 or an empty state
            setScoreData(null); 
            setErrorMsg("No logs found for this user in the database.");
          }
        } catch (error: any) {
          console.error("Failed to fetch score data:", error);
          setErrorMsg(error?.message || "Unknown error fetching from Firestore");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || (!scoreData && !errorMsg)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <ScoreRing />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 max-w-lg text-center">
          <h2 className="font-bold mb-2">Error Loading Dashboard</h2>
          <p className="font-mono text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const name = user?.displayName?.split(" ")[0] || "User";
  const diffNational = scoreData.totalKgCO2eYear - scoreData.nationalAverageKg;
  const target15C = 2500; // IPCC 2030 target approx
  const diffTarget = scoreData.totalKgCO2eYear - target15C;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text">Hi {name}, here&apos;s your carbon footprint</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Main Score */}
        <div className="lg:col-span-1 bg-surface p-6 rounded-2xl shadow-subtle border border-surface-2 flex flex-col items-center justify-center">
          <ScoreRing score={scoreData.totalKgCO2eYear} />
        </div>

        {/* Breakdown */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-2xl shadow-subtle border border-surface-2">
          <h2 className="text-xl font-bold text-text mb-4">Emissions by Category</h2>
          <CategoryBreakdown breakdown={scoreData.breakdown} />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard 
          title="vs National Average" 
          value={`${Math.abs(diffNational)} kg`}
          subtitle={diffNational < 0 ? "Lower than average" : "Higher than average"}
          status={diffNational < 0 ? "good" : "bad"}
        />
        <MetricCard 
          title="1.5°C Climate Target" 
          value={`${Math.abs(diffTarget)} kg`}
          subtitle={diffTarget > 0 ? "Over target" : "Under target"}
          status={diffTarget > 0 ? "bad" : "good"}
        />
        <MetricCard 
          title="Your Percentile" 
          value={`Top ${scoreData.percentile}%`}
          subtitle="Of users in your region"
          status={scoreData.percentile < 50 ? "good" : "neutral"}
        />
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-bold text-text mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <QuickActionLink href="/scan" icon={Camera} title="Scan Utility Bill" desc="Extract energy usage from a photo" />
        <QuickActionLink href="/simulate" icon={Sparkles} title="Simulate Change" desc="See how lifestyle shifts impact score" />
        <QuickActionLink href="/actions" icon={Target} title="Action Plan" desc="View personalised AI recommendations" />
      </div>

      {/* Recent Activity */}
      <h2 className="text-xl font-bold text-text mb-4">Recent Activity</h2>
      <div className="bg-surface rounded-2xl shadow-subtle border border-surface-2 overflow-hidden">
        <div className="divide-y divide-surface-2">
          <ActivityRow title="Logged electricity bill" date="Today" value="+150 kg" />
          <ActivityRow title="Initial profile setup" date="2 days ago" value="8,250 kg base" />
          <ActivityRow title="Accepted action: LED bulbs" date="1 week ago" value="-40 kg/yr" isPositive />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, status }: any) {
  const statusColor = status === "good" ? "text-primary" : status === "bad" ? "text-danger" : "text-text";
  return (
    <div className="bg-surface p-5 rounded-xl border border-surface-2 shadow-subtle">
      <h3 className="text-sm font-medium text-muted mb-2">{title}</h3>
      <p className={`text-2xl font-bold ${statusColor} mb-1`}>{value}</p>
      <p className="text-xs text-muted">{subtitle}</p>
    </div>
  );
}

function QuickActionLink({ href, icon: Icon, title, desc }: any) {
  return (
    <Link href={href} className="flex flex-col p-5 bg-surface-2 rounded-xl border border-transparent hover:border-primary/50 transition-colors group">
      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        <Icon size={20} aria-hidden="true" />
      </div>
      <h3 className="font-bold text-text mb-1">{title}</h3>
      <p className="text-sm text-muted">{desc}</p>
    </Link>
  );
}

function ActivityRow({ title, date, value, isPositive = false }: any) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-surface-2 transition-colors">
      <div className="flex items-center">
        <div className="p-2 bg-surface-2 rounded-full mr-4 text-muted">
          <Activity size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-text">{title}</p>
          <p className="text-xs text-muted">{date}</p>
        </div>
      </div>
      <div className={`text-sm font-semibold ${isPositive ? 'text-primary' : 'text-text'}`}>
        {value}
      </div>
    </div>
  );
}
