import { Actor, ActorSubclass, HttpAgent, Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { idlFactory as amlBackendIdl } from '../../declarations/aml_backend/aml_backend.did.js';
import { _SERVICE as AmlBackendService } from '../../declarations/aml_backend/aml_backend.did';
import { storage } from '../../../server/storage';
import { Entity, Transaction, Alert, Case, Report, Activity, MlModel, EntityRelationship } from '../types';

// Types for ICP data mapping
export interface IcpEntity {
  id: string;
  name: string;
  type_: string;
  jurisdiction: string;
  registrationDate: bigint;
  riskScore: number;
  riskLevel: string;
  status: string;
  metadata: [] | [string];
}

export interface IcpTransaction {
  id: string;
  sourceEntityId: string;
  destinationEntityId: string;
  amount: number;
  currency: string;
  timestamp: bigint;
  description: [] | [string];
  type_: string;
  category: string;
  riskScore: number;
  riskLevel: string;
  metadata: [] | [string];
}

export interface IcpAlert {
  id: string;
  entityId: string;
  transactionId: [] | [string];
  timestamp: bigint;
  type_: string;
  title: string;
  description: string;
  riskScore: number;
  riskLevel: string;
  status: string;
  assignedTo: [] | [string];
  detectionMethod: string;
  metadata: [] | [string];
}

// Interface for blockchain adapter
export interface BlockchainAdapter {
  isAuthenticated: () => Promise<boolean>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getUserPrincipal: () => Promise<Principal | undefined>;
  
  // Entity operations
  getEntity: (id: string) => Promise<Entity | undefined>;
  getAllEntities: () => Promise<Entity[]>;
  getEntitiesByRiskLevel: (riskLevel: string) => Promise<Entity[]>;
  createEntity: (entity: Entity) => Promise<Entity>;
  
  // Transaction operations
  getTransaction: (id: string) => Promise<Transaction | undefined>;
  getAllTransactions: () => Promise<Transaction[]>;
  getTransactionsByEntity: (entityId: string) => Promise<Transaction[]>;
  createTransaction: (transaction: Transaction) => Promise<Transaction>;
  
  // Alert operations
  getAlert: (id: string) => Promise<Alert | undefined>;
  getAllAlerts: () => Promise<Alert[]>;
  getAlertsByEntity: (entityId: string) => Promise<Alert[]>;
  createAlert: (alert: Alert) => Promise<Alert>;
  
  // Dashboard operations
  getDashboardStats: () => Promise<{
    alertsCount: number;
    highRiskEntitiesCount: number;
    casesCount: number;
    reportsCount: number;
    alertsChange: number;
    highRiskEntitiesChange: number;
    casesChange: number;
    reportsChange: number;
  }>;
  
  getRecentActivities: (limit: number) => Promise<Activity[]>;
  getPriorityAlerts: (limit: number) => Promise<Alert[]>;
}

export class IcpAdapter implements BlockchainAdapter {
  private agent: HttpAgent | null = null;
  private authClient: AuthClient | null = null;
  private amlBackendActor: ActorSubclass<AmlBackendService> | null = null;
  private identity: Identity | null = null;
  
  constructor() {
    this.initializeAuthClient();
  }
  
  private async initializeAuthClient() {
    try {
      this.authClient = await AuthClient.create();
      const isAuthenticated = await this.authClient.isAuthenticated();
      
      if (isAuthenticated) {
        this.identity = this.authClient.getIdentity();
        await this.initializeAgent();
      }
    } catch (error) {
      console.error("Error initializing auth client:", error);
    }
  }
  
  private async initializeAgent() {
    if (!this.identity) return;
    
    try {
      // For local development with dfx
      const canisterId = process.env.AML_BACKEND_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai';
      
      this.agent = new HttpAgent({
        identity: this.identity,
        host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:8000',
      });
      
      // Only needed for local development
      if (process.env.DFX_NETWORK !== 'ic') {
        await this.agent.fetchRootKey();
      }
      
      this.amlBackendActor = Actor.createActor<AmlBackendService>(amlBackendIdl, {
        agent: this.agent,
        canisterId,
      });
    } catch (error) {
      console.error("Error initializing agent:", error);
    }
  }
  
  async isAuthenticated(): Promise<boolean> {
    if (!this.authClient) await this.initializeAuthClient();
    return this.authClient?.isAuthenticated() || false;
  }
  
  async login(): Promise<void> {
    if (!this.authClient) await this.initializeAuthClient();
    
    if (this.authClient) {
      const identityProvider = process.env.DFX_NETWORK === 'ic' 
        ? 'https://identity.ic0.app'
        : `http://localhost:8000?canisterId=${process.env.INTERNET_IDENTITY_CANISTER_ID}`;
      
      await this.authClient.login({
        identityProvider,
        onSuccess: async () => {
          this.identity = this.authClient!.getIdentity();
          await this.initializeAgent();
        },
      });
    }
  }
  
  async logout(): Promise<void> {
    if (this.authClient) {
      await this.authClient.logout();
      this.identity = null;
      this.agent = null;
      this.amlBackendActor = null;
    }
  }
  
  async getUserPrincipal(): Promise<Principal | undefined> {
    if (!this.identity) return undefined;
    return this.identity.getPrincipal();
  }
  
  // Map ICP entity to local Entity type
  private mapIcpEntity(icpEntity: IcpEntity): Entity {
    return {
      id: icpEntity.id,
      name: icpEntity.name,
      type: icpEntity.type_,
      jurisdiction: icpEntity.jurisdiction,
      registrationDate: new Date(Number(icpEntity.registrationDate) / 1000000).toISOString(),
      riskScore: icpEntity.riskScore,
      riskLevel: icpEntity.riskLevel as "low" | "medium" | "high" | "critical",
      status: icpEntity.status as "pending" | "in progress" | "under investigation" | "completed" | "resolved" | "needs review",
    };
  }
  
  // Map local Entity type to ICP entity
  private mapToIcpEntity(entity: Entity): IcpEntity {
    return {
      id: entity.id,
      name: entity.name,
      type_: entity.type,
      jurisdiction: entity.jurisdiction,
      registrationDate: BigInt(new Date(entity.registrationDate).getTime() * 1000000),
      riskScore: entity.riskScore,
      riskLevel: entity.riskLevel,
      status: entity.status,
      metadata: [],
    };
  }
  
  // Map ICP transaction to local Transaction type
  private mapIcpTransaction(icpTransaction: IcpTransaction): Transaction {
    return {
      id: icpTransaction.id,
      sourceEntityId: icpTransaction.sourceEntityId,
      destinationEntityId: icpTransaction.destinationEntityId,
      amount: icpTransaction.amount,
      currency: icpTransaction.currency,
      timestamp: new Date(Number(icpTransaction.timestamp) / 1000000).toISOString(),
      description: icpTransaction.description[0] || "",
      type: icpTransaction.type_ as "deposit" | "withdrawal" | "transfer" | "exchange" | "payment",
      category: icpTransaction.category as "fiat" | "crypto" | "cross_border",
      riskScore: icpTransaction.riskScore,
      riskLevel: icpTransaction.riskLevel as "low" | "medium" | "high" | "critical",
    };
  }
  
  // Map local Transaction type to ICP transaction
  private mapToIcpTransaction(transaction: Transaction): IcpTransaction {
    return {
      id: transaction.id,
      sourceEntityId: transaction.sourceEntityId,
      destinationEntityId: transaction.destinationEntityId,
      amount: transaction.amount,
      currency: transaction.currency,
      timestamp: BigInt(new Date(transaction.timestamp).getTime() * 1000000),
      description: transaction.description ? [transaction.description] : [],
      type_: transaction.type,
      category: transaction.category,
      riskScore: transaction.riskScore,
      riskLevel: transaction.riskLevel,
      metadata: [],
    };
  }
  
  // Map ICP alert to local Alert type
  private mapIcpAlert(icpAlert: IcpAlert): Alert {
    return {
      id: icpAlert.id,
      entityId: icpAlert.entityId,
      transactionId: icpAlert.transactionId[0] || undefined,
      timestamp: new Date(Number(icpAlert.timestamp) / 1000000).toISOString(),
      type: icpAlert.type_ as "transaction_pattern" | "entity_risk" | "network_activity" | "jurisdictional" | "behavioral",
      title: icpAlert.title,
      description: icpAlert.description,
      riskScore: icpAlert.riskScore,
      riskLevel: icpAlert.riskLevel as "low" | "medium" | "high" | "critical",
      status: icpAlert.status as "pending" | "in progress" | "under investigation" | "completed" | "resolved" | "needs review",
      assignedTo: icpAlert.assignedTo[0] || undefined,
      detectionMethod: icpAlert.detectionMethod,
    };
  }
  
  // Entity operations
  async getEntity(id: string): Promise<Entity | undefined> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.getEntity(id);
    }
    
    try {
      const icpEntity = await this.amlBackendActor.getEntity(id);
      if ('None' in icpEntity) return undefined;
      return this.mapIcpEntity(icpEntity['Some']);
    } catch (error) {
      console.error("Error getting entity from ICP:", error);
      // Fallback to local storage
      return storage.getEntity(id);
    }
  }
  
  async getAllEntities(): Promise<Entity[]> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.getAllEntities();
    }
    
    try {
      const icpEntities = await this.amlBackendActor.getAllEntities();
      return icpEntities.map(this.mapIcpEntity);
    } catch (error) {
      console.error("Error getting all entities from ICP:", error);
      // Fallback to local storage
      return storage.getAllEntities();
    }
  }
  
  async getEntitiesByRiskLevel(riskLevel: string): Promise<Entity[]> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.getEntitiesByRiskLevel(riskLevel);
    }
    
    try {
      const icpEntities = await this.amlBackendActor.getEntitiesByRiskLevel(riskLevel);
      return icpEntities.map(this.mapIcpEntity);
    } catch (error) {
      console.error(`Error getting entities by risk level ${riskLevel} from ICP:`, error);
      // Fallback to local storage
      return storage.getEntitiesByRiskLevel(riskLevel);
    }
  }
  
  async createEntity(entity: Entity): Promise<Entity> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.createEntity(entity);
    }
    
    try {
      const icpEntity = this.mapToIcpEntity(entity);
      const result = await this.amlBackendActor.createEntity(icpEntity);
      
      if ('ok' in result) {
        return this.mapIcpEntity(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error creating entity on ICP:", error);
      // Fallback to local storage
      return storage.createEntity(entity);
    }
  }
  
  // Transaction operations
  async getTransaction(id: string): Promise<Transaction | undefined> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.getTransaction(id);
    }
    
    try {
      const icpTransaction = await this.amlBackendActor.getTransaction(id);
      if ('None' in icpTransaction) return undefined;
      return this.mapIcpTransaction(icpTransaction['Some']);
    } catch (error) {
      console.error("Error getting transaction from ICP:", error);
      // Fallback to local storage
      return storage.getTransaction(id);
    }
  }
  
  async getAllTransactions(): Promise<Transaction[]> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.getAllTransactions();
    }
    
    try {
      const icpTransactions = await this.amlBackendActor.getAllTransactions();
      return icpTransactions.map(this.mapIcpTransaction);
    } catch (error) {
      console.error("Error getting all transactions from ICP:", error);
      // Fallback to local storage
      return storage.getAllTransactions();
    }
  }
  
  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.getTransactionsByEntity(entityId);
    }
    
    try {
      const icpTransactions = await this.amlBackendActor.getTransactionsByEntity(entityId);
      return icpTransactions.map(this.mapIcpTransaction);
    } catch (error) {
      console.error(`Error getting transactions by entity ${entityId} from ICP:`, error);
      // Fallback to local storage
      return storage.getTransactionsByEntity(entityId);
    }
  }
  
  async createTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.createTransaction(transaction);
    }
    
    try {
      const icpTransaction = this.mapToIcpTransaction(transaction);
      const result = await this.amlBackendActor.createTransaction(icpTransaction);
      
      if ('ok' in result) {
        return this.mapIcpTransaction(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error creating transaction on ICP:", error);
      // Fallback to local storage
      return storage.createTransaction(transaction);
    }
  }
  
  // Alert operations
  async getAlert(id: string): Promise<Alert | undefined> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.getAlert(id);
    }
    
    try {
      const icpAlert = await this.amlBackendActor.getAlert(id);
      if ('None' in icpAlert) return undefined;
      return this.mapIcpAlert(icpAlert['Some']);
    } catch (error) {
      console.error("Error getting alert from ICP:", error);
      // Fallback to local storage
      return storage.getAlert(id);
    }
  }
  
  async getAllAlerts(): Promise<Alert[]> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.getAllAlerts();
    }
    
    try {
      const icpAlerts = await this.amlBackendActor.getAllAlerts();
      return icpAlerts.map(this.mapIcpAlert);
    } catch (error) {
      console.error("Error getting all alerts from ICP:", error);
      // Fallback to local storage
      return storage.getAllAlerts();
    }
  }
  
  async getAlertsByEntity(entityId: string): Promise<Alert[]> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      return storage.getAlertsByEntity(entityId);
    }
    
    try {
      const icpAlerts = await this.amlBackendActor.getAlertsByEntity(entityId);
      return icpAlerts.map(this.mapIcpAlert);
    } catch (error) {
      console.error(`Error getting alerts by entity ${entityId} from ICP:`, error);
      // Fallback to local storage
      return storage.getAlertsByEntity(entityId);
    }
  }
  
  async createAlert(alert: Alert): Promise<Alert> {
    // For now, use local storage as we haven't implemented this method in the canister
    return storage.createAlert(alert);
  }
  
  // Dashboard operations
  async getDashboardStats(): Promise<{
    alertsCount: number;
    highRiskEntitiesCount: number;
    casesCount: number;
    reportsCount: number;
    alertsChange: number;
    highRiskEntitiesChange: number;
    casesChange: number;
    reportsChange: number;
  }> {
    if (!this.amlBackendActor) {
      // Create stats from local storage
      const alerts = await storage.getAllAlerts();
      const highRiskEntities = await storage.getEntitiesByRiskLevel("high");
      const criticalRiskEntities = await storage.getEntitiesByRiskLevel("critical");
      const cases = await storage.getAllCases();
      const reports = await storage.getAllReports();
      
      return {
        alertsCount: alerts.length,
        highRiskEntitiesCount: highRiskEntities.length + criticalRiskEntities.length,
        casesCount: cases.length,
        reportsCount: reports.length,
        alertsChange: 5,
        highRiskEntitiesChange: 10,
        casesChange: 2,
        reportsChange: -1
      };
    }
    
    try {
      return await this.amlBackendActor.getDashboardStats();
    } catch (error) {
      console.error("Error getting dashboard stats from ICP:", error);
      
      // Fallback to local storage
      const alerts = await storage.getAllAlerts();
      const highRiskEntities = await storage.getEntitiesByRiskLevel("high");
      const criticalRiskEntities = await storage.getEntitiesByRiskLevel("critical");
      const cases = await storage.getAllCases();
      const reports = await storage.getAllReports();
      
      return {
        alertsCount: alerts.length,
        highRiskEntitiesCount: highRiskEntities.length + criticalRiskEntities.length,
        casesCount: cases.length,
        reportsCount: reports.length,
        alertsChange: 5,
        highRiskEntitiesChange: 10,
        casesChange: 2,
        reportsChange: -1
      };
    }
  }
  
  async getRecentActivities(limit: number): Promise<Activity[]> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      const activities = await storage.getAllActivities();
      return activities.slice(0, limit);
    }
    
    try {
      const icpActivities = await this.amlBackendActor.getRecentActivities(limit);
      // Mapping would be done here, but for simplicity we'll use a simplified implementation
      return icpActivities.map(a => ({
        id: a.id,
        timestamp: new Date(Number(a.timestamp) / 1000000).toISOString(),
        user: a.userId,
        actionType: a.actionType as any,
        actionDescription: a.actionDescription,
        entityId: a.entityId[0] || undefined,
        caseId: a.caseId[0] || undefined,
        status: a.status[0] || "",
      }));
    } catch (error) {
      console.error(`Error getting recent activities from ICP:`, error);
      // Fallback to local storage
      const activities = await storage.getAllActivities();
      return activities.slice(0, limit);
    }
  }
  
  async getPriorityAlerts(limit: number): Promise<Alert[]> {
    if (!this.amlBackendActor) {
      // Fallback to local storage
      const alerts = await storage.getAllAlerts();
      // Sort by risk score descending
      const sortedAlerts = [...alerts].sort((a, b) => b.riskScore - a.riskScore);
      return sortedAlerts.slice(0, limit);
    }
    
    try {
      const icpAlerts = await this.amlBackendActor.getPriorityAlerts(limit);
      return icpAlerts.map(this.mapIcpAlert);
    } catch (error) {
      console.error(`Error getting priority alerts from ICP:`, error);
      // Fallback to local storage
      const alerts = await storage.getAllAlerts();
      // Sort by risk score descending
      const sortedAlerts = [...alerts].sort((a, b) => b.riskScore - a.riskScore);
      return sortedAlerts.slice(0, limit);
    }
  }
}

// Create and export a singleton instance of the ICP adapter
export const icpAdapter = new IcpAdapter();