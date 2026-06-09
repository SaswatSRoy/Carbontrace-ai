"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { motion, useReducedMotion } from "framer-motion";
import { auth } from "../../lib/firebase/client"; // assuming we'll create this

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface({ onComplete }: { onComplete: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "msg-0", role: "assistant", content: "Hello! I am EcoGuide. To calculate your carbon footprint, I'd love to ask you a few quick questions. First, what city and country do you live in?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Progress logic: max ~6 questions
  const assistantMessagesCount = messages.filter(m => m.role === "assistant").length;
  const progressQuestion = Math.min(assistantMessagesCount, 6);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    // Auto-focus latest AI message for screen readers
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "assistant") {
      const el = document.getElementById(lastMessage.id);
      el?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, shouldReduceMotion]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = { id: `msg-${Date.now()}`, role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const idToken = await auth.currentUser?.getIdToken();
      let appCheckTokenStr = "";
      
      // Try to get the App Check token if it's initialized
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
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      };

      if (appCheckTokenStr) {
        headers["X-Firebase-AppCheck"] = appCheckTokenStr;
      }

      const response = await fetch("/api/onboard/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      const aiMessage: Message = { id: `msg-${Date.now()}`, role: "assistant", content: data.reply };
      setMessages(prev => [...prev, aiMessage]);

      if (data.profileExtracted) {
        if (!shouldReduceMotion) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22C55E', '#86EFAC']
          });
        }
        toast.success("Profile fully configured!");
        setTimeout(onComplete, 2000);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message. Please try again.", { icon: <AlertCircle className="text-danger" /> });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setInput("");
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto h-[80vh] bg-surface rounded-xl shadow-subtle border border-surface-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-surface-2 border-b border-bg">
        <div>
          <h2 className="font-bold text-text">EcoGuide</h2>
          <p className="text-xs text-muted">Question {progressQuestion} of 6</p>
        </div>
        <div className="w-1/3 bg-bg h-2 rounded-pill overflow-hidden">
          <motion.div 
            className="bg-primary h-full"
            initial={{ width: 0 }}
            animate={{ width: `${(progressQuestion / 6) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Chat Log */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            id={msg.id}
            tabIndex={-1}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === "user" 
                  ? "bg-primary text-bg rounded-br-none" 
                  : "bg-surface-2 text-text rounded-bl-none"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-2 p-4 rounded-lg rounded-bl-none flex space-x-1" aria-label="EcoGuide is typing">
              <motion.div className="w-2 h-2 bg-muted rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
              <motion.div className="w-2 h-2 bg-muted rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
              <motion.div className="w-2 h-2 bg-muted rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface-2 border-t border-bg">
        <div className="relative flex items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            maxLength={500}
            rows={1}
            disabled={isLoading}
            className="w-full bg-bg text-text rounded-button py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50"
            aria-label="Type your message"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 bg-primary text-bg rounded-button disabled:opacity-50 hover:bg-accent transition-colors"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="text-right mt-1">
          <span className={`text-xs ${input.length >= 490 ? "text-warning" : "text-muted"}`}>
            {input.length} / 500
          </span>
        </div>
      </div>
    </div>
  );
}
