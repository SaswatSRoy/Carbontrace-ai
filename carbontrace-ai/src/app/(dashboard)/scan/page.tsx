import React from "react";
import { BillUploader } from "../../../components/scan/BillUploader";

export default function ScanPage() {
  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      <header className="mb-8 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-text mb-2">Scan Utility Bill</h1>
        <p className="text-muted">Extract your energy usage automatically using Gemini OCR.</p>
      </header>
      <div className="flex-1 w-full max-w-4xl mx-auto">
        <BillUploader />
      </div>
    </div>
  );
}
