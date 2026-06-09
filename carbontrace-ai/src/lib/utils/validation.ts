import { z } from "zod";

export const billScanSchema = z.object({
  kwh: z.number().nonnegative(),
  amount: z.number().nonnegative(),
  period: z.string().optional(),
});

export const simulationInputSchema = z.object({
  baseline: z.number().nonnegative(),
  changes: z.object({
    diet: z.string().optional(),
    transportation: z.string().optional(),
    energy: z.string().optional(),
  }).optional(),
});

const sanitizeHtml = (str: string) => {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

export const chatMessageSchema = z.object({
  text: z.string().trim().min(1).max(500).transform(sanitizeHtml),
});

export const userProfileSchema = z.object({
  id: z.string(),
});
