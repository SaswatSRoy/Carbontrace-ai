"use client";

import React from "react";
import { ChatInterface } from "../../../components/onboard/ChatInterface";

export default function OnboardPage() {
  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatInterface onComplete={() => window.location.href = "/"} />
    </div>
  );
}
