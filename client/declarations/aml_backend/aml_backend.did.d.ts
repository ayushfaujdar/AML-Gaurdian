import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

// This is a mock declaration file that will be used until
// the actual Candid interface is generated by dfx

export interface Activity {
  'id': string,
  'timestamp': bigint,
  'userId': string,
  'actionType': string,
  'actionDescription': string,
  'entityId': [] | [string],
  'caseId': [] | [string],
  'status': [] | [string],
  'metadata': [] | [string],
}

export interface Alert {
  'id': string,
  'entityId': string,
  'timestamp': bigint,
  'type_': string,
  'title': string,
  'description': string,
  'riskScore': number,
  'riskLevel': string,
  'status': string,
  'transactionId': [] | [string],
  'assignedTo': [] | [string],
  'detectionMethod': string,
  'metadata': [] | [string],
}

export interface Entity {
  'id': string,
  'name': string,
  'type_': string,
  'jurisdiction': string,
  'registrationDate': bigint,
  'riskScore': number,
  'riskLevel': string,
  'status': string,
  'metadata': [] | [string],
}

export interface Transaction {
  'id': string,
  'sourceEntityId': string,
  'destinationEntityId': string,
  'amount': number,
  'currency': string,
  'timestamp': bigint,
  'description': [] | [string],
  'type_': string,
  'category': string,
  'riskScore': number,
  'riskLevel': string,
  'metadata': [] | [string],
}

export interface _SERVICE {
  'createAlert': ActorMethod<
    [Alert],
    { 'ok': Alert } | { 'err': string }
  >,
  'createEntity': ActorMethod<
    [Entity],
    { 'ok': Entity } | { 'err': string }
  >,
  'createTransaction': ActorMethod<
    [Transaction],
    { 'ok': Transaction } | { 'err': string }
  >,
  'getAlert': ActorMethod<[string], [] | [Alert]>,
  'getAllAlerts': ActorMethod<[], Array<Alert>>,
  'getAllEntities': ActorMethod<[], Array<Entity>>,
  'getAllTransactions': ActorMethod<[], Array<Transaction>>,
  'getAlertsByEntity': ActorMethod<[string], Array<Alert>>,
  'getDashboardStats': ActorMethod<
    [],
    {
      'alertsCount': bigint,
      'highRiskEntitiesCount': bigint,
      'casesCount': bigint,
      'reportsCount': bigint,
      'alertsChange': bigint,
      'highRiskEntitiesChange': bigint,
      'casesChange': bigint,
      'reportsChange': bigint,
    }
  >,
  'getEntitiesByRiskLevel': ActorMethod<[string], Array<Entity>>,
  'getEntity': ActorMethod<[string], [] | [Entity]>,
  'getPriorityAlerts': ActorMethod<[bigint], Array<Alert>>,
  'getRecentActivities': ActorMethod<[bigint], Array<Activity>>,
  'getTransaction': ActorMethod<[string], [] | [Transaction]>,
  'getTransactionsByEntity': ActorMethod<[string], Array<Transaction>>,
}