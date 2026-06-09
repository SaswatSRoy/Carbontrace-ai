"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Camera, FileImage, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { auth } from "../../lib/firebase/client"; // assuming available
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Image from "next/image";

type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

interface ExtractedData {
  billing_period_start: string | null;
  billing_period_end: string | null;
  electricity_kwh: number | null;
  gas_units: number | null;
  gas_unit_type: string | null;
  total_amount: number | null;
  currency: string | null;
  provider_name: string | null;
  fuel_type: string | null;
  carbonKgThisPeriod?: number;
}

export function BillUploader() {
  const [state, setState] = useState<UploadState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    
    // File size check (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File is too large (max 5MB)");
      setState("error");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setState("uploading");
    
    try {
      const idToken = await auth.currentUser?.getIdToken();
      let appCheckTokenStr = "";
      
      if (typeof window !== "undefined") {
        try {
          const { appCheck } = await import("../../lib/firebase/client");
          if (appCheck) {
            const { getToken } = await import("firebase/app-check");
            const tokenResult = await getToken(appCheck, false);
            appCheckTokenStr = tokenResult.token;
          }
        } catch (e) {
          console.warn("App check token fetch failed", e);
        }
      }

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${idToken}`
      };

      if (appCheckTokenStr) {
        headers["X-Firebase-AppCheck"] = appCheckTokenStr;
      }

      const formData = new FormData();
      formData.append("file", file);

      setState("processing");
      const response = await fetch("/api/scan/bill", {
        method: "POST",
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      if (data.extracted?.error === "not_a_utility_bill") {
        setErrorMessage("Image doesn't look like a utility bill.");
        setState("error");
      } else {
        setExtractedData({ ...data.extracted, carbonKgThisPeriod: data.carbonKgThisPeriod });
        setState("success");
      }

    } catch (e: any) {
      console.error(e);
      setErrorMessage("Failed to process bill. Please try again.");
      setState("error");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic']
    },
    maxFiles: 1,
    disabled: state === "uploading" || state === "processing"
  });

  const reset = () => {
    setState("idle");
    setPreviewUrl(null);
    setExtractedData(null);
    setErrorMessage("");
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-surface rounded-xl p-6 shadow-subtle border border-surface-2">
      {/* Screen Reader Status Announcements */}
      <div aria-live="polite" className="sr-only">
        {state === "idle" && "Ready to upload bill."}
        {state === "uploading" && "Uploading your bill image."}
        {state === "processing" && "AI is analyzing your bill."}
        {state === "success" && "Bill successfully analyzed."}
        {state === "error" && `Error: ${errorMessage}`}
      </div>

      <h2 className="text-xl font-bold text-text mb-4">Scan Utility Bill</h2>

      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isDragActive ? "border-primary bg-primary/10" : "border-surface-2 hover:border-muted"
              }`}
            >
              <input {...getInputProps()} aria-label="Upload utility bill image" />
              <UploadCloud className="mx-auto text-muted mb-4" size={48} />
              <p className="text-text font-semibold mb-1">Drag & drop your bill here</p>
              <p className="text-sm text-muted mb-4">JPEG, PNG, WEBP up to 5MB</p>
              
              <div className="flex justify-center gap-3 mt-4">
                <span className="px-4 py-2 bg-surface-2 text-text font-medium rounded-button flex items-center hover:bg-surface transition-colors">
                  <FileImage size={18} className="mr-2" /> Browse Files
                </span>
                <span className="px-4 py-2 bg-primary text-bg font-medium rounded-button flex items-center hover:bg-primary/90 transition-colors">
                  <Camera size={18} className="mr-2" /> Take Photo
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {(state === "uploading" || state === "processing") && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-8 border border-surface-2 rounded-xl"
          >
            {previewUrl && (
              <div className="relative w-32 h-32 mb-6 rounded-lg overflow-hidden border border-surface-2 opacity-50">
                <Image src={previewUrl} alt="Bill preview" fill className="object-cover" unoptimized />
              </div>
            )}
            <Loader2 className="animate-spin text-primary mb-4" size={40} />
            <h3 className="text-lg font-bold text-text mb-1">
              {state === "uploading" ? "Uploading image..." : "AI is analyzing..."}
            </h3>
            <p className="text-sm text-muted text-center max-w-xs">
              {state === "processing" ? "Extracting kilowatt-hours, gas units, and billing periods..." : "Securing your file."}
            </p>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center p-8 border border-danger/30 bg-danger/10 rounded-xl"
          >
            <AlertCircle className="text-danger mb-4" size={48} />
            <h3 className="text-lg font-bold text-text mb-2">Analysis Failed</h3>
            <p className="text-sm text-muted mb-6">{errorMessage}</p>
            <button onClick={reset} className="px-6 py-2 bg-surface-2 text-text font-medium rounded-button hover:bg-surface border border-surface">
              Try Another Image
            </button>
          </motion.div>
        )}

        {state === "success" && extractedData && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col border border-primary/30 bg-primary/5 rounded-xl p-6"
          >
            <div className="flex items-center text-primary mb-6">
              <CheckCircle className="mr-2" size={24} />
              <h3 className="text-lg font-bold text-text">Extraction Complete</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <DataRow label="Provider" value={extractedData.provider_name || "Unknown"} />
              <DataRow 
                label="Billing Period" 
                value={`${extractedData.billing_period_start || '?'} to ${extractedData.billing_period_end || '?'}`} 
              />
              <DataRow 
                label="Total Amount" 
                value={extractedData.total_amount ? `${extractedData.total_amount} ${extractedData.currency || ''}` : "Not found"} 
              />
              {extractedData.electricity_kwh !== null && (
                <DataRow 
                  label="Electricity Used" 
                  value={`${extractedData.electricity_kwh} kWh`} 
                  highlight
                />
              )}
              {extractedData.gas_units !== null && (
                <DataRow 
                  label="Gas Used" 
                  value={`${extractedData.gas_units} ${extractedData.gas_unit_type || 'units'}`} 
                  highlight
                />
              )}
              
              {extractedData.carbonKgThisPeriod ? (
                <div className="mt-4 p-4 bg-surface-2 rounded-lg border border-accent/20">
                  <p className="text-sm text-muted mb-1">Estimated Carbon Footprint</p>
                  <p className="text-2xl font-bold text-text">{Math.round(extractedData.carbonKgThisPeriod)} <span className="text-sm font-medium text-muted">kg CO₂e</span></p>
                </div>
              ) : null}
            </div>

            <button onClick={reset} className="w-full py-3 bg-surface-2 hover:bg-surface border border-surface rounded-button text-text font-medium transition-colors">
              Scan Another Bill
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DataRow({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-surface-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-accent' : 'text-text'}`}>{value}</span>
    </div>
  );
}
