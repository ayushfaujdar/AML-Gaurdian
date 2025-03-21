import {
  users, User, InsertUser,
  entities, Entity, InsertEntity,
  entityRelationships, EntityRelationship, InsertEntityRelationship,
  transactions, Transaction, InsertTransaction,
  alerts, Alert, InsertAlert,
  cases, Case, InsertCase,
  reports, Report, InsertReport,
  activities, Activity, InsertActivity,
  mlModels, MlModel, InsertMlModel
} from "@shared/schema";
import { generateId } from "../client/src/lib/utils";

// Interface for all storage operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Entity methods
  getEntity(id: string): Promise<Entity | undefined>;
  getAllEntities(): Promise<Entity[]>;
  getEntitiesByRiskLevel(riskLevel: string): Promise<Entity[]>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: string, update: Partial<Entity>): Promise<Entity | undefined>;
  
  // EntityRelationship methods
  getEntityRelationship(id: string): Promise<EntityRelationship | undefined>;
  getEntityRelationshipsByEntity(entityId: string): Promise<EntityRelationship[]>;
  createEntityRelationship(relationship: InsertEntityRelationship): Promise<EntityRelationship>;
  
  // Transaction methods
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByEntity(entityId: string): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Alert methods
  getAlert(id: string): Promise<Alert | undefined>;
  getAlertsByEntity(entityId: string): Promise<Alert[]>;
  getAllAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: string, update: Partial<Alert>): Promise<Alert | undefined>;
  
  // Case methods
  getCase(id: string): Promise<Case | undefined>;
  getAllCases(): Promise<Case[]>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, update: Partial<Case>): Promise<Case | undefined>;
  
  // Report methods
  getReport(id: string): Promise<Report | undefined>;
  getReportsByCase(caseId: string): Promise<Report[]>;
  getAllReports(): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, update: Partial<Report>): Promise<Report | undefined>;
  
  // Activity methods
  getActivity(id: string): Promise<Activity | undefined>;
  getActivitiesByUser(userId: string): Promise<Activity[]>;
  getActivitiesByEntity(entityId: string): Promise<Activity[]>;
  getActivitiesByCase(caseId: string): Promise<Activity[]>;
  getAllActivities(): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // ML Model methods
  getMlModel(id: string): Promise<MlModel | undefined>;
  getAllMlModels(): Promise<MlModel[]>;
  createMlModel(model: InsertMlModel): Promise<MlModel>;
  updateMlModel(id: string, update: Partial<MlModel>): Promise<MlModel | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private entities: Map<string, Entity>;
  private entityRelationships: Map<string, EntityRelationship>;
  private transactions: Map<string, Transaction>;
  private alerts: Map<string, Alert>;
  private cases: Map<string, Case>;
  private reports: Map<string, Report>;
  private activities: Map<string, Activity>;
  private mlModels: Map<string, MlModel>;
  
  currentUserId: number;

  constructor() {
    this.users = new Map();
    this.entities = new Map();
    this.entityRelationships = new Map();
    this.transactions = new Map();
    this.alerts = new Map();
    this.cases = new Map();
    this.reports = new Map();
    this.activities = new Map();
    this.mlModels = new Map();
    
    this.currentUserId = 1;
    
    // Initialize with an admin user
    this.createUser({
      username: "admin",
      password: "admin123", // In a real app, this would be hashed
      name: "Admin User",
      email: "admin@amlguardian.com",
      role: "admin",
      status: "active"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Entity methods
  async getEntity(id: string): Promise<Entity | undefined> {
    return this.entities.get(id);
  }

  async getAllEntities(): Promise<Entity[]> {
    return Array.from(this.entities.values());
  }
  
  async getEntitiesByRiskLevel(riskLevel: string): Promise<Entity[]> {
    return Array.from(this.entities.values()).filter(entity => 
      entity.riskLevel === riskLevel
    );
  }

  async createEntity(entity: InsertEntity): Promise<Entity> {
    const id = generateId("E");
    const newEntity: Entity = { 
      ...entity, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.entities.set(id, newEntity);
    return newEntity;
  }

  async updateEntity(id: string, update: Partial<Entity>): Promise<Entity | undefined> {
    const entity = await this.getEntity(id);
    if (!entity) return undefined;
    
    const updatedEntity = { 
      ...entity, 
      ...update,
      updatedAt: new Date() 
    };
    this.entities.set(id, updatedEntity);
    return updatedEntity;
  }

  // EntityRelationship methods
  async getEntityRelationship(id: string): Promise<EntityRelationship | undefined> {
    return this.entityRelationships.get(id);
  }

  async getEntityRelationshipsByEntity(entityId: string): Promise<EntityRelationship[]> {
    return Array.from(this.entityRelationships.values()).filter(
      rel => rel.sourceEntityId === entityId || rel.targetEntityId === entityId
    );
  }

  async createEntityRelationship(relationship: InsertEntityRelationship): Promise<EntityRelationship> {
    const id = generateId("R");
    const newRelationship: EntityRelationship = { 
      ...relationship, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.entityRelationships.set(id, newRelationship);
    return newRelationship;
  }

  // Transaction methods
  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      tx => tx.sourceEntityId === entityId || tx.destinationEntityId === entityId
    );
  }
  
  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = generateId("T");
    const newTransaction: Transaction = { 
      ...transaction, 
      id,
      createdAt: new Date()
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  // Alert methods
  async getAlert(id: string): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async getAlertsByEntity(entityId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(
      alert => alert.entityId === entityId
    );
  }
  
  async getAllAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = generateId("ALT");
    const newAlert: Alert = { 
      ...alert, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async updateAlert(id: string, update: Partial<Alert>): Promise<Alert | undefined> {
    const alert = await this.getAlert(id);
    if (!alert) return undefined;
    
    const updatedAlert = { 
      ...alert, 
      ...update,
      updatedAt: new Date() 
    };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  // Case methods
  async getCase(id: string): Promise<Case | undefined> {
    return this.cases.get(id);
  }

  async getAllCases(): Promise<Case[]> {
    return Array.from(this.cases.values());
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const id = generateId("Case");
    const newCase: Case = { 
      ...caseData, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.cases.set(id, newCase);
    return newCase;
  }

  async updateCase(id: string, update: Partial<Case>): Promise<Case | undefined> {
    const caseItem = await this.getCase(id);
    if (!caseItem) return undefined;
    
    const updatedCase = { 
      ...caseItem, 
      ...update,
      updatedAt: new Date() 
    };
    this.cases.set(id, updatedCase);
    return updatedCase;
  }

  // Report methods
  async getReport(id: string): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async getReportsByCase(caseId: string): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(
      report => report.caseId === caseId
    );
  }
  
  async getAllReports(): Promise<Report[]> {
    return Array.from(this.reports.values());
  }

  async createReport(report: InsertReport): Promise<Report> {
    const id = generateId("RPT");
    const newReport: Report = { 
      ...report, 
      id,
      createdAt: new Date()
    };
    this.reports.set(id, newReport);
    return newReport;
  }

  async updateReport(id: string, update: Partial<Report>): Promise<Report | undefined> {
    const report = await this.getReport(id);
    if (!report) return undefined;
    
    const updatedReport = { 
      ...report, 
      ...update 
    };
    this.reports.set(id, updatedReport);
    return updatedReport;
  }

  // Activity methods
  async getActivity(id: string): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async getActivitiesByUser(userId: string): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(
      activity => activity.userId === userId
    );
  }

  async getActivitiesByEntity(entityId: string): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(
      activity => activity.entityId === entityId
    );
  }

  async getActivitiesByCase(caseId: string): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(
      activity => activity.caseId === caseId
    );
  }
  
  async getAllActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = generateId("ACT");
    const newActivity: Activity = { 
      ...activity, 
      id 
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  // ML Model methods
  async getMlModel(id: string): Promise<MlModel | undefined> {
    return this.mlModels.get(id);
  }

  async getAllMlModels(): Promise<MlModel[]> {
    return Array.from(this.mlModels.values());
  }

  async createMlModel(model: InsertMlModel): Promise<MlModel> {
    const id = generateId("ML");
    const newModel: MlModel = { 
      ...model, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mlModels.set(id, newModel);
    return newModel;
  }

  async updateMlModel(id: string, update: Partial<MlModel>): Promise<MlModel | undefined> {
    const model = await this.getMlModel(id);
    if (!model) return undefined;
    
    const updatedModel = { 
      ...model, 
      ...update,
      updatedAt: new Date() 
    };
    this.mlModels.set(id, updatedModel);
    return updatedModel;
  }
}

export const storage = new MemStorage();
