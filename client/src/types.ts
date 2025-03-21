// Common Types
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Status = "pending" | "in progress" | "under investigation" | "completed" | "resolved" | "needs review";

// Entity Types
export interface Entity {
  id: string;
  name: string;
  type: "individual" | "corporate" | "financial_institution" | "government";
  jurisdiction: string;
  registrationDate: string;
  riskScore: number;
  riskLevel: RiskLevel;
  status: Status;
}

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: "owner" | "beneficiary" | "affiliate" | "intermediary" | "customer" | "supplier";
  strength: number;
  startDate: string;
  endDate?: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  sourceEntityId: string;
  destinationEntityId: string;
  amount: number;
  currency: string;
  timestamp: string;
  description: string;
  type: "deposit" | "withdrawal" | "transfer" | "exchange" | "payment";
  category: "fiat" | "crypto" | "cross_border";
  riskScore: number;
  riskLevel: RiskLevel;
}

// Alert Types
export interface Alert {
  id: string;
  entityId: string;
  transactionId?: string;
  timestamp: string;
  type: "transaction_pattern" | "entity_risk" | "network_activity" | "jurisdictional" | "behavioral";
  title: string;
  description: string;
  riskScore: number;
  riskLevel: RiskLevel;
  status: Status;
  assignedTo?: string;
  detectionMethod: string;
}

// Case Types
export interface Case {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: "low" | "medium" | "high" | "critical";
  entityIds: string[];
  alertIds: string[];
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Report Types
export interface Report {
  id: string;
  caseId: string;
  type: "sar" | "ctr" | "aml" | "kyc";
  title: string;
  description: string;
  status: "draft" | "submitted" | "accepted" | "rejected";
  createdBy: string;
  createdAt: string;
  submittedAt?: string;
}

// Activity Types
export interface Activity {
  id: string;
  timestamp: string;
  user: string;
  actionType: "create" | "update" | "delete" | "review" | "assign" | "report";
  actionDescription: string;
  entityId?: string;
  caseId?: string;
  status: string;
}

// User Types
export interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "investigator" | "analyst" | "compliance_officer";
  email: string;
  status: "active" | "inactive";
}

// ML Model Types
export interface ModelPerformance {
  id: string;
  name: string;
  type: "transaction_pattern" | "entity_relationship" | "anomaly_detection" | "risk_scoring";
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  lastTrainedDate: string;
  status: "training" | "active" | "inactive";
}

// Dashboard Types
export interface KpiData {
  alertsCount: number;
  highRiskEntitiesCount: number;
  casesCount: number;
  reportsCount: number;
  alertsChange: number;
  highRiskEntitiesChange: number;
  casesChange: number;
  reportsChange: number;
}

export interface FilterOptions {
  timeRange: "24h" | "7d" | "30d" | "custom";
  riskLevel: RiskLevel | "all";
  transactionType: "all" | "fiat" | "crypto" | "cross_border";
  customDateRange?: {
    start: Date;
    end: Date;
  };
}

export interface RiskHeatMapCell {
  x: number;
  y: number;
  risk: number;
}

export interface DetectedPattern {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  entityIds: string[];
  transactionIds: string[];
}

export interface TransactionTimelineEvent {
  id: string;
  transactionId: string;
  amount: number;
  direction: "incoming" | "outgoing";
  timestamp: string;
  entity: string;
  entityId: string;
  description: string;
  isFlagged: boolean;
  flagReason?: string;
}
