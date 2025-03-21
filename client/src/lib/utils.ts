import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function classifyRisk(score: number): "low" | "medium" | "high" | "critical" {
  if (score < 30) return "low";
  if (score < 60) return "medium";
  if (score < 85) return "high";
  return "critical";
}

export function getRiskColor(risk: "low" | "medium" | "high" | "critical" | number): string {
  if (typeof risk === "number") {
    risk = classifyRisk(risk);
  }
  
  switch (risk) {
    case "low": return "text-green-600 bg-green-100";
    case "medium": return "text-yellow-700 bg-yellow-100";
    case "high": return "text-orange-700 bg-orange-100";
    case "critical": return "text-red-700 bg-red-100";
    default: return "text-blue-700 bg-blue-100";
  }
}

export function getRiskLabel(risk: "low" | "medium" | "high" | "critical" | number): string {
  if (typeof risk === "number") {
    risk = classifyRisk(risk);
  }
  
  switch (risk) {
    case "low": return "Low";
    case "medium": return "Medium";
    case "high": return "High";
    case "critical": return "Critical";
    default: return "Unknown";
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "in progress":
    case "under investigation":
      return "text-blue-800 bg-blue-100";
    case "completed":
    case "resolved":
      return "text-green-800 bg-green-100";
    case "high risk":
      return "text-red-800 bg-red-100";
    case "medium risk":
    case "needs review":
      return "text-orange-800 bg-orange-100";
    default:
      return "text-gray-800 bg-gray-100";
  }
}

export function truncateString(str: string, len = 50): string {
  if (str.length <= len) return str;
  return str.substring(0, len) + "...";
}

export function generateId(prefix: string): string {
  return `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}
