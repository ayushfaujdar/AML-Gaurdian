export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'createAlert': IDL.Func(
      [
        IDL.Record({
          'id': IDL.Text,
          'entityId': IDL.Text,
          'timestamp': IDL.Int,
          'type_': IDL.Text,
          'title': IDL.Text,
          'description': IDL.Text,
          'riskScore': IDL.Float64,
          'riskLevel': IDL.Text,
          'status': IDL.Text,
          'transactionId': IDL.Opt(IDL.Text),
          'assignedTo': IDL.Opt(IDL.Text),
          'detectionMethod': IDL.Text,
          'metadata': IDL.Opt(IDL.Text),
        }),
      ],
      [
        IDL.Variant({
          'ok': IDL.Record({
            'id': IDL.Text,
            'entityId': IDL.Text,
            'timestamp': IDL.Int,
            'type_': IDL.Text,
            'title': IDL.Text,
            'description': IDL.Text,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'status': IDL.Text,
            'transactionId': IDL.Opt(IDL.Text),
            'assignedTo': IDL.Opt(IDL.Text),
            'detectionMethod': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          }),
          'err': IDL.Text,
        }),
      ],
      [],
    ),
    'createEntity': IDL.Func(
      [
        IDL.Record({
          'id': IDL.Text,
          'name': IDL.Text,
          'type_': IDL.Text,
          'jurisdiction': IDL.Text,
          'registrationDate': IDL.Int,
          'riskScore': IDL.Float64,
          'riskLevel': IDL.Text,
          'status': IDL.Text,
          'metadata': IDL.Opt(IDL.Text),
        }),
      ],
      [
        IDL.Variant({
          'ok': IDL.Record({
            'id': IDL.Text,
            'name': IDL.Text,
            'type_': IDL.Text,
            'jurisdiction': IDL.Text,
            'registrationDate': IDL.Int,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'status': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          }),
          'err': IDL.Text,
        }),
      ],
      [],
    ),
    'createTransaction': IDL.Func(
      [
        IDL.Record({
          'id': IDL.Text,
          'sourceEntityId': IDL.Text,
          'destinationEntityId': IDL.Text,
          'amount': IDL.Float64,
          'currency': IDL.Text,
          'timestamp': IDL.Int,
          'description': IDL.Opt(IDL.Text),
          'type_': IDL.Text,
          'category': IDL.Text,
          'riskScore': IDL.Float64,
          'riskLevel': IDL.Text,
          'metadata': IDL.Opt(IDL.Text),
        }),
      ],
      [
        IDL.Variant({
          'ok': IDL.Record({
            'id': IDL.Text,
            'sourceEntityId': IDL.Text,
            'destinationEntityId': IDL.Text,
            'amount': IDL.Float64,
            'currency': IDL.Text,
            'timestamp': IDL.Int,
            'description': IDL.Opt(IDL.Text),
            'type_': IDL.Text,
            'category': IDL.Text,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          }),
          'err': IDL.Text,
        }),
      ],
      [],
    ),
    'getAlert': IDL.Func(
      [IDL.Text],
      [
        IDL.Opt(
          IDL.Record({
            'id': IDL.Text,
            'entityId': IDL.Text,
            'timestamp': IDL.Int,
            'type_': IDL.Text,
            'title': IDL.Text,
            'description': IDL.Text,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'status': IDL.Text,
            'transactionId': IDL.Opt(IDL.Text),
            'assignedTo': IDL.Opt(IDL.Text),
            'detectionMethod': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
    'getAllAlerts': IDL.Func(
      [],
      [
        IDL.Vec(
          IDL.Record({
            'id': IDL.Text,
            'entityId': IDL.Text,
            'timestamp': IDL.Int,
            'type_': IDL.Text,
            'title': IDL.Text,
            'description': IDL.Text,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'status': IDL.Text,
            'transactionId': IDL.Opt(IDL.Text),
            'assignedTo': IDL.Opt(IDL.Text),
            'detectionMethod': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
    'getAllEntities': IDL.Func(
      [],
      [
        IDL.Vec(
          IDL.Record({
            'id': IDL.Text,
            'name': IDL.Text,
            'type_': IDL.Text,
            'jurisdiction': IDL.Text,
            'registrationDate': IDL.Int,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'status': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
    'getAllTransactions': IDL.Func(
      [],
      [
        IDL.Vec(
          IDL.Record({
            'id': IDL.Text,
            'sourceEntityId': IDL.Text,
            'destinationEntityId': IDL.Text,
            'amount': IDL.Float64,
            'currency': IDL.Text,
            'timestamp': IDL.Int,
            'description': IDL.Opt(IDL.Text),
            'type_': IDL.Text,
            'category': IDL.Text,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
    'getAlertsByEntity': IDL.Func(
      [IDL.Text],
      [
        IDL.Vec(
          IDL.Record({
            'id': IDL.Text,
            'entityId': IDL.Text,
            'timestamp': IDL.Int,
            'type_': IDL.Text,
            'title': IDL.Text,
            'description': IDL.Text,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'status': IDL.Text,
            'transactionId': IDL.Opt(IDL.Text),
            'assignedTo': IDL.Opt(IDL.Text),
            'detectionMethod': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
    'getDashboardStats': IDL.Func(
      [],
      [
        IDL.Record({
          'alertsCount': IDL.Nat,
          'highRiskEntitiesCount': IDL.Nat,
          'casesCount': IDL.Nat,
          'reportsCount': IDL.Nat,
          'alertsChange': IDL.Int,
          'highRiskEntitiesChange': IDL.Int,
          'casesChange': IDL.Int,
          'reportsChange': IDL.Int,
        }),
      ],
      ['query'],
    ),
    'getEntitiesByRiskLevel': IDL.Func(
      [IDL.Text],
      [
        IDL.Vec(
          IDL.Record({
            'id': IDL.Text,
            'name': IDL.Text,
            'type_': IDL.Text,
            'jurisdiction': IDL.Text,
            'registrationDate': IDL.Int,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'status': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
    'getEntity': IDL.Func(
      [IDL.Text],
      [
        IDL.Opt(
          IDL.Record({
            'id': IDL.Text,
            'name': IDL.Text,
            'type_': IDL.Text,
            'jurisdiction': IDL.Text,
            'registrationDate': IDL.Int,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'status': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
    'getPriorityAlerts': IDL.Func(
      [IDL.Nat],
      [
        IDL.Vec(
          IDL.Record({
            'id': IDL.Text,
            'entityId': IDL.Text,
            'timestamp': IDL.Int,
            'type_': IDL.Text,
            'title': IDL.Text,
            'description': IDL.Text,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'status': IDL.Text,
            'transactionId': IDL.Opt(IDL.Text),
            'assignedTo': IDL.Opt(IDL.Text),
            'detectionMethod': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
    'getRecentActivities': IDL.Func(
      [IDL.Nat],
      [
        IDL.Vec(
          IDL.Record({
            'id': IDL.Text,
            'timestamp': IDL.Int,
            'userId': IDL.Text,
            'actionType': IDL.Text,
            'actionDescription': IDL.Text,
            'entityId': IDL.Opt(IDL.Text),
            'caseId': IDL.Opt(IDL.Text),
            'status': IDL.Opt(IDL.Text),
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
    'getTransaction': IDL.Func(
      [IDL.Text],
      [
        IDL.Opt(
          IDL.Record({
            'id': IDL.Text,
            'sourceEntityId': IDL.Text,
            'destinationEntityId': IDL.Text,
            'amount': IDL.Float64,
            'currency': IDL.Text,
            'timestamp': IDL.Int,
            'description': IDL.Opt(IDL.Text),
            'type_': IDL.Text,
            'category': IDL.Text,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
    'getTransactionsByEntity': IDL.Func(
      [IDL.Text],
      [
        IDL.Vec(
          IDL.Record({
            'id': IDL.Text,
            'sourceEntityId': IDL.Text,
            'destinationEntityId': IDL.Text,
            'amount': IDL.Float64,
            'currency': IDL.Text,
            'timestamp': IDL.Int,
            'description': IDL.Opt(IDL.Text),
            'type_': IDL.Text,
            'category': IDL.Text,
            'riskScore': IDL.Float64,
            'riskLevel': IDL.Text,
            'metadata': IDL.Opt(IDL.Text),
          })
        ),
      ],
      ['query'],
    ),
  });
};

export const init = ({ IDL }) => { return []; };