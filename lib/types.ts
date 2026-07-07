export type AgentProfile = {
  id: string;
  layer: number;
  displayName: string;
  department: string;
  officePersona: string;
  serviceIntent: string;
  jurisdiction: string;
  permissionBoundary: string;
  internalCommunicationStyle: string;
  asksFromOtherAgents: string;
  refusesToDecide: string;
  riskAvoidance: string;
  bureaucraticMarker: string;
  outgoingTargets: string[];
  incomingTriggers: string[];
};

export type PageStep = {
  route: string;
  title: string;
  purpose: string;
  activeUnitId: string;
  internalSignal: string;
  organizationAction: string;
  observerActions: string[];
  bureaucraticLogic: string;
  nextRoute: string;
};

export type InternalOperation = {
  time: string;
  unitId: string;
  operation: string;
  artifact: string;
  responsibility: string;
  marker: string;
};

export type ResponsibilityTransfer = {
  from: string;
  to: string;
  reason: string;
  status: string;
};

export type GeneratedRule = {
  code: string;
  title: string;
  trigger: string;
  effect: string;
};

export type NetworkEventType =
  | "EXTERNAL_TRIGGER"
  | "INTERNAL_MESSAGE"
  | "HANDOFF"
  | "RULE_GENERATED"
  | "DOCUMENT_GENERATED"
  | "RESPONSIBILITY_SHIFT"
  | "ARCHIVE_EVENT"
  | "USER_NOTIFICATION"
  | "USER_ACTION_REQUIRED"
  | "CASE_CLOSED";

export type NetworkEvent = {
  id: string;
  type: NetworkEventType;
  time: string;
  from: string;
  to: string;
  subject: string;
  message: string;
  marker: string;
  statusAfter: string;
  artifact?: string;
};

export type ServicePreview = {
  id: string;
  code: string;
  title: string;
  description: string;
  estimatedPath: string;
};
