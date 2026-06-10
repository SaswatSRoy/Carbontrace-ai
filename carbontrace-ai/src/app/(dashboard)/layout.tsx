"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase/client"; // assuming available
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { LayoutDashboard, MessageSquare, Camera, Sparkles, Target, Activity, LogOut, Leaf } from "lucide-react";
import Link from "next/link";
import { AxeCoreDev } from "@/components/AxeCoreDev"; // optional
import Image from "next/image";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Onboard", href: "/onboard", icon: MessageSquare },
  { name: "Scan Bill", href: "/scan", icon: Camera },
  { name: "Simulate", href: "/simulate", icon: Sparkles },
  { name: "Actions", href: "/actions", icon: Target },
  { name: "Progress", href: "/progress", icon: Activity },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex md:flex-row">
        <div className="hidden md:flex flex-col w-64 border-r border-surface-2 bg-surface p-4">
          <div className="h-8 w-36 bg-surface-2 animate-pulse rounded-md mb-8" />
          {[...Array(6)].map((_, i) => <div key={i} className="h-11 bg-surface-2 animate-pulse rounded-button mb-2" />)}
        </div>
        <main className="flex-1 p-6 md:p-10 flex flex-col gap-6">
          <div className="h-10 w-64 bg-surface-2 animate-pulse rounded-md" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 h-80 bg-surface-2 animate-pulse rounded-2xl" />
            <div className="lg:col-span-8 h-80 bg-surface-2 animate-pulse rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null; // will redirect

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      <AxeCoreDev />
      
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-primary focus:text-bg focus:px-4 focus:py-2 focus:rounded-button focus:z-50"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-surface-2 bg-surface p-4">
        <div className="flex items-center text-primary mb-8 px-2">
          <Leaf size={28} className="mr-2" aria-hidden="true" />
          <span className="text-xl font-bold text-text">CarbonTrace</span>
        </div>
        
        <nav className="flex-1 space-y-2" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-button font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted hover:bg-surface-2 hover:text-text"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon size={20} className="mr-3" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-surface-2 pt-4 px-2">
          <div className="flex items-center mb-4">
            <Image 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || "User"}&background=1A2E1F&color=86EFAC`} 
              alt="User Avatar" 
              width={40}
              height={40}
              className="rounded-full mr-3"
              unoptimized
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text truncate">{user.displayName || "User"}</p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-2 text-sm text-danger font-medium hover:bg-danger/10 rounded-button transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={16} className="mr-3" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main id="main-content" className="flex-1 flex flex-col h-screen overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-2 flex justify-around p-2 pb-safe z-40" aria-label="Mobile Navigation">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon size={24} className="mb-1" aria-hidden="true" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
