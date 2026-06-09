"use client";

import React, { useState } from "react";
import { auth } from "../../../lib/firebase/client"; // Ensure googleProvider is exported if needed or we use signInWithPopup
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Leaf, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      // Mint the session cookie on the server
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        throw new Error("Failed to create session");
      }

      toast.success("Successfully logged in!");
      router.push("/");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 relative">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-primary focus:text-bg focus:px-4 focus:py-2 focus:rounded-button focus:z-50"
      >
        Skip to main content
      </a>

      <main id="main-content" className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-subtle border border-surface-2 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6">
          <Leaf size={32} aria-hidden="true" />
        </div>
        
        <h1 className="text-3xl font-bold text-text mb-3">CarbonTrace AI</h1>
        <p className="text-muted mb-8 leading-relaxed">
          Understand your carbon footprint. Then shrink it.
        </p>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          role="button"
          aria-label="Continue with Google to sign in or create an account"
          className="w-full py-3 px-4 mb-4 bg-surface-2 hover:bg-surface border border-surface-2 hover:border-muted rounded-button text-text font-semibold flex justify-center items-center transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="animate-spin mr-2" size={20} />
          ) : (
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Continue with Google
        </button>

        <div className="relative w-full mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-surface-2"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-muted">Or</span>
          </div>
        </div>

        <button
          onClick={async () => {
            setIsLoading(true);
            try {
              const { signInWithEmailAndPassword } = await import("firebase/auth");
              const userCredential = await signInWithEmailAndPassword(auth, "demo@carbontrace.app", "Demo2026!");
              const idToken = await userCredential.user.getIdToken();
              const res = await fetch("/api/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
              });
              if (!res.ok) throw new Error("Failed to create session");
              toast.success("Successfully logged into Demo Account!");
              router.push("/");
            } catch (error: any) {
              console.error(error);
              toast.error(error.message || "Failed to sign in to demo");
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-primary hover:bg-accent rounded-button text-bg font-semibold flex justify-center items-center transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
          View Live Demo Data
        </button>
      </main>
    </div>
  );
}
