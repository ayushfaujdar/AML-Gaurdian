import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Option "mo:base/Option";
import Result "mo:base/Result";
import List "mo:base/List";

actor AmlBackend {

  // Types for AML system
  type User = {
    id: Text;
    username: Text;
    name: Text;
    role: Text;
    email: Text;
    status: Text;
  };

  type Entity = {
    id: Text;
    name: Text;
    type_: Text;
    jurisdiction: Text;
    registrationDate: Int;
    riskScore: Float;
    riskLevel: Text;
    status: Text;
    metadata: ?Text;
  };

  type EntityRelationship = {
    id: Text;
    sourceEntityId: Text;
    targetEntityId: Text;
    relationshipType: Text;
    strength: Float;
    startDate: Int;
    endDate: ?Int;
    metadata: ?Text;
  };

  type Transaction = {
    id: Text;
    sourceEntityId: Text;
    destinationEntityId: Text;
    amount: Float;
    currency: Text;
    timestamp: Int;
    description: ?Text;
    type_: Text;
    category: Text;
    riskScore: Float;
    riskLevel: Text;
    metadata: ?Text;
  };

  type Alert = {
    id: Text;
    entityId: Text;
    transactionId: ?Text;
    timestamp: Int;
    type_: Text;
    title: Text;
    description: Text;
    riskScore: Float;
    riskLevel: Text;
    status: Text;
    assignedTo: ?Text;
    detectionMethod: Text;
    metadata: ?Text;
  };

  type Case = {
    id: Text;
    title: Text;
    description: Text;
    status: Text;
    priority: Text;
    entityIds: [Text];
    alertIds: [Text];
    assignedTo: ?Text;
    createdBy: Text;
    createdAt: Int;
    updatedAt: Int;
  };

  type Report = {
    id: Text;
    caseId: Text;
    type_: Text;
    title: Text;
    description: Text;
    status: Text;
    createdBy: Text;
    createdAt: Int;
    submittedAt: ?Int;
    data: ?Text;
  };

  type Activity = {
    id: Text;
    timestamp: Int;
    userId: Text;
    actionType: Text;
    actionDescription: Text;
    entityId: ?Text;
    caseId: ?Text;
    status: ?Text;
    metadata: ?Text;
  };

  type MlModel = {
    id: Text;
    name: Text;
    type_: Text;
    status: Text;
    accuracy: ?Float;
    precision: ?Float;
    recall: ?Float;
    f1Score: ?Float;
    falsePositiveRate: ?Float;
    falseNegativeRate: ?Float;
    lastTrainedDate: ?Int;
    createdAt: Int;
    updatedAt: Int;
    configuration: ?Text;
  };

  // Storage maps for each data type
  private var users = HashMap.HashMap<Text, User>(0, Text.equal, Text.hash);
  private var entities = HashMap.HashMap<Text, Entity>(0, Text.equal, Text.hash);
  private var relationships = HashMap.HashMap<Text, EntityRelationship>(0, Text.equal, Text.hash);
  private var transactions = HashMap.HashMap<Text, Transaction>(0, Text.equal, Text.hash);
  private var alerts = HashMap.HashMap<Text, Alert>(0, Text.equal, Text.hash);
  private var cases = HashMap.HashMap<Text, Case>(0, Text.equal, Text.hash);
  private var reports = HashMap.HashMap<Text, Report>(0, Text.equal, Text.hash);
  private var activities = HashMap.HashMap<Text, Activity>(0, Text.equal, Text.hash);
  private var mlModels = HashMap.HashMap<Text, MlModel>(0, Text.equal, Text.hash);

  // Access control - only admins and compliance officers can access certain functions
  private func isAuthorized(caller : Principal) : Bool {
    // In a production system, this would check the caller's role
    // For now, allow all authenticated users
    not Principal.isAnonymous(caller)
  };

  // CRUD operations for Entities
  public shared(msg) func createEntity(entity : Entity) : async Result.Result<Entity, Text> {
    if (not isAuthorized(msg.caller)) {
      return #err("Unauthorized");
    };

    entities.put(entity.id, entity);
    createActivity({
      id = generateId("ACT");
      timestamp = Time.now();
      userId = Principal.toText(msg.caller);
      actionType = "create";
      actionDescription = "Created entity: " # entity.name;
      entityId = ?entity.id;
      caseId = null;
      status = ?"active";
      metadata = null;
    });
    
    #ok(entity)
  };

  public query func getEntity(id : Text) : async ?Entity {
    entities.get(id)
  };

  public query func getAllEntities() : async [Entity] {
    Iter.toArray(entities.vals())
  };

  public query func getEntitiesByRiskLevel(riskLevel : Text) : async [Entity] {
    let filteredEntities = Iter.filter(
      entities.vals(),
      func (e : Entity) : Bool { e.riskLevel == riskLevel }
    );
    Iter.toArray(filteredEntities)
  };

  // CRUD operations for Transactions
  public shared(msg) func createTransaction(transaction : Transaction) : async Result.Result<Transaction, Text> {
    if (not isAuthorized(msg.caller)) {
      return #err("Unauthorized");
    };

    transactions.put(transaction.id, transaction);
    
    // Generate alert if risk score is high
    if (transaction.riskScore > 70) {
      let alertId = generateId("ALT");
      let alert : Alert = {
        id = alertId;
        entityId = transaction.sourceEntityId;
        transactionId = ?transaction.id;
        timestamp = Time.now();
        type_ = "transaction_pattern";
        title = "High Risk Transaction Detected";
        description = "Transaction with high risk score detected: " # Float.toText(transaction.riskScore);
        riskScore = transaction.riskScore;
        riskLevel = transaction.riskLevel;
        status = "pending";
        assignedTo = null;
        detectionMethod = "automated";
        metadata = null;
      };
      alerts.put(alertId, alert);
    };

    #ok(transaction)
  };

  public query func getTransaction(id : Text) : async ?Transaction {
    transactions.get(id)
  };

  public query func getAllTransactions() : async [Transaction] {
    Iter.toArray(transactions.vals())
  };

  public query func getTransactionsByEntity(entityId : Text) : async [Transaction] {
    let filteredTransactions = Iter.filter(
      transactions.vals(),
      func (t : Transaction) : Bool { 
        t.sourceEntityId == entityId or t.destinationEntityId == entityId 
      }
    );
    Iter.toArray(filteredTransactions)
  };

  // CRUD operations for Alerts
  public shared(msg) func createAlert(alert : Alert) : async Result.Result<Alert, Text> {
    if (not isAuthorized(msg.caller)) {
      return #err("Unauthorized");
    };

    alerts.put(alert.id, alert);
    #ok(alert)
  };

  public query func getAlert(id : Text) : async ?Alert {
    alerts.get(id)
  };

  public query func getAllAlerts() : async [Alert] {
    Iter.toArray(alerts.vals())
  };

  public query func getAlertsByEntity(entityId : Text) : async [Alert] {
    let filteredAlerts = Iter.filter(
      alerts.vals(),
      func (a : Alert) : Bool { a.entityId == entityId }
    );
    Iter.toArray(filteredAlerts)
  };

  // Helper functions
  private func generateId(prefix : Text) : Text {
    prefix # "-" # Int.toText(Time.now())
  };

  private func createActivity(activity : Activity) : () {
    activities.put(activity.id, activity);
  };

  // Dashboard statistics
  public query func getDashboardStats() : async {
    alertsCount : Nat;
    highRiskEntitiesCount : Nat;
    casesCount : Nat;
    reportsCount : Nat;
    alertsChange : Int;
    highRiskEntitiesChange : Int;
    casesChange : Int;
    reportsChange : Int;
  } {
    let highRiskEntities = Iter.filter(
      entities.vals(),
      func (e : Entity) : Bool { e.riskLevel == "high" or e.riskLevel == "critical" }
    );

    {
      alertsCount = alerts.size();
      highRiskEntitiesCount = Iter.size(highRiskEntities);
      casesCount = cases.size();
      reportsCount = reports.size();
      // In a real implementation, these would be calculated based on historical data
      alertsChange = 5;
      highRiskEntitiesChange = 10;
      casesChange = 2;
      reportsChange = -1;
    }
  };

  // Get recent activities
  public query func getRecentActivities(limit : Nat) : async [Activity] {
    let allActivities = Iter.toArray(activities.vals());
    let sortedActivities = Array.sort(
      allActivities,
      func (a : Activity, b : Activity) : { #less; #equal; #greater } {
        if (a.timestamp > b.timestamp) { #less }
        else if (a.timestamp < b.timestamp) { #greater }
        else { #equal }
      }
    );
    let activityCount = if (sortedActivities.size() > limit) { limit } else { sortedActivities.size() };
    Array.subArray(sortedActivities, 0, activityCount)
  };

  // Get priority alerts
  public query func getPriorityAlerts(limit : Nat) : async [Alert] {
    let allAlerts = Iter.toArray(alerts.vals());
    let sortedAlerts = Array.sort(
      allAlerts,
      func (a : Alert, b : Alert) : { #less; #equal; #greater } {
        if (a.riskScore > b.riskScore) { #less }
        else if (a.riskScore < b.riskScore) { #greater }
        else { #equal }
      }
    );
    let alertCount = if (sortedAlerts.size() > limit) { limit } else { sortedAlerts.size() };
    Array.subArray(sortedAlerts, 0, alertCount)
  };
}