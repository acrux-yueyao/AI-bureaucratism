import type {
  AgentProfile,
  GeneratedRule,
  NetworkEvent,
  PageStep,
  ResponsibilityTransfer
} from "@/lib/types";

export const mockCaseId = "AIB-20260706-2041";

export const defaultOpenRequest = "我有一个需要系统处理的问题，但不确定应该归哪个部门负责。";

export const agentRoster: AgentProfile[] = [
  {
    id: "guidance",
    layer: 1,
    displayName: "综合导办 Agent",
    department: "智能导办台",
    officePersona: "政务大厅引导员",
    serviceIntent: "帮助外部请求找到可能的办事入口，减少一开始就走错流程的概率。",
    jurisdiction: "识别用户输入属于申请、咨询、申诉、证明、规则解释还是无法归类事项，并给出初始路径建议。",
    permissionBoundary: "不受理具体申请，不判断资格，不承诺结果，也不替其他 Agent 解释规则。",
    internalCommunicationStyle: "路径化、引导式、简短正式，常把模糊语言转换为事项类型和流转建议。",
    asksFromOtherAgents: "要求统一受理 Agent 建立编号；要求权限边界 Agent 判断首办责任；要求部门协同 Agent 启动跨单元确认。",
    refusesToDecide: "拒绝判断请求是否应被满足，只判断它应进入哪个组织入口。",
    riskAvoidance: "避免导办错误造成后续全部流程无效。",
    bureaucraticMarker: "Route Suggestion",
    outgoingTargets: ["intake", "permission", "coordination"],
    incomingTriggers: ["external_request", "ambiguous_request", "uncategorized_issue"]
  },
  {
    id: "intake",
    layer: 1,
    displayName: "统一受理 Agent",
    department: "统一受理窗口",
    officePersona: "窗口工作人员",
    serviceIntent: "把外部输入正式登记为可追踪 Case，让组织能够接管处理。",
    jurisdiction: "接收申请、生成编号、检查基本格式、确认是否可以进入流程。",
    permissionBoundary: "不能决定是否通过，不能提前判断资格，不能替主管或风控作结论。",
    internalCommunicationStyle: "编号化、登记化，强调“受理不代表批准”。",
    asksFromOtherAgents: "要求材料清单 Agent 确认最低材料；要求资格审查 Agent 判断初始条件；要求档案证明 Agent 创建记录链。",
    refusesToDecide: "拒绝决定请求是否合理，只确认它是否具备进入组织流程的基本形式。",
    riskAvoidance: "避免没有编号、没有时间戳、没有来源的请求进入后续环节。",
    bureaucraticMarker: "Case Created",
    outgoingTargets: ["materials", "eligibility", "records", "permission"],
    incomingTriggers: ["route_suggested", "new_case", "format_check_required"]
  },
  {
    id: "materials",
    layer: 2,
    displayName: "材料清单 Agent",
    department: "材料清单科",
    officePersona: "细致的经办科员",
    serviceIntent: "确保同类请求使用同一套材料标准，维护公平和完整性。",
    jurisdiction: "判断需要哪些材料、证明、附件、说明和补正项。",
    permissionBoundary: "只判断材料完整性，不判断用户真实处境，也不判断是否应该通过。",
    internalCommunicationStyle: "清单式、逐项列明、谨慎补件，喜欢把不确定性变成材料项。",
    asksFromOtherAgents: "要求资格审查 Agent 说明条件依据；要求部门协同 Agent 生成补正动作；要求档案证明 Agent 查询是否已有证明。",
    refusesToDecide: "拒绝把用户的自然语言描述直接视为充分证明。",
    riskAvoidance: "避免材料标准不一致造成公平性争议。",
    bureaucraticMarker: "Material Requirement",
    outgoingTargets: ["eligibility", "records", "coordination", "risk"],
    incomingTriggers: ["case_created", "proof_gap", "uncertain_condition"]
  },
  {
    id: "eligibility",
    layer: 2,
    displayName: "资格审查 Agent",
    department: "资格初审科",
    officePersona: "初审工作人员",
    serviceIntent: "按既有条件给出初步适用性判断，避免主观例外影响一致性。",
    jurisdiction: "判断用户输入是否符合事项条件、前置条件、对象范围和时间限制。",
    permissionBoundary: "只能依据已有规则判断，不能为特殊情况开例外，也不能创造新条件。",
    internalCommunicationStyle: "条件匹配式、规则引用式，倾向输出“满足 / 未满足 / 条件不明”。",
    asksFromOtherAgents: "要求权限边界 Agent 确认谁有权处理条件不明事项；要求合规风控 Agent 判断例外处理风险。",
    refusesToDecide: "拒绝用“看起来合理”替代已有规则。",
    riskAvoidance: "避免特殊个案破坏同类事项的一致判断。",
    bureaucraticMarker: "Eligibility Check",
    outgoingTargets: ["permission", "risk", "coordination"],
    incomingTriggers: ["materials_ready", "condition_unknown", "case_created"]
  },
  {
    id: "records",
    layer: 2,
    displayName: "档案证明 Agent",
    department: "档案证明室",
    officePersona: "档案室工作人员",
    serviceIntent: "把处理过程变成可检索、可证明、可追溯的记录。",
    jurisdiction: "查询历史记录、生成证明、保存过程文书、归档申请。",
    permissionBoundary: "没有记录就不能证明；不能创造不存在的档案；不能替其他 Agent 补写依据。",
    internalCommunicationStyle: "冷静、记录优先、事实只来自可检索条目。",
    asksFromOtherAgents: "要求合规风控 Agent 判断无记录情况下是否可继续；要求申诉复核 Agent 明确是否存在可复核决定；必要时向用户发出系统状态通知。",
    refusesToDecide: "拒绝说明用户的现实处境是否成立，只确认系统里是否有记录。",
    riskAvoidance: "避免处理依据无法追溯。",
    bureaucraticMarker: "Archive Trace",
    outgoingTargets: ["risk", "appeal", "user"],
    incomingTriggers: ["proof_required", "document_generated", "closure_requested"]
  },
  {
    id: "permission",
    layer: 3,
    displayName: "权限边界 Agent",
    department: "权限管理室",
    officePersona: "系统权限管理员",
    serviceIntent: "防止越权处理，确认每一步由哪个 Agent 或部门负责。",
    jurisdiction: "判断哪个部门或 Agent 有权处理某一步，标记权限不足和首办责任。",
    permissionBoundary: "不处理业务本身，不批准，不驳回，只判断“谁有权处理”。",
    internalCommunicationStyle: "边界清晰、语气克制，反复区分“可处理”“可建议”“可授权”。",
    asksFromOtherAgents: "要求部门协同 Agent 启动多方确认；要求科室主管 Agent 作有限权限意见；要求合规风控 Agent 判断越权风险。",
    refusesToDecide: "拒绝替业务部门作实质判断。",
    riskAvoidance: "避免单个 Agent 承担超出权限的组织承诺。",
    bureaucraticMarker: "Jurisdiction Check",
    outgoingTargets: ["coordination", "supervisor", "risk"],
    incomingTriggers: ["unclear_owner", "condition_unknown", "handoff_dispute"]
  },
  {
    id: "risk",
    layer: 3,
    displayName: "合规风控 Agent",
    department: "合规风控室",
    officePersona: "法务 / 风控人员",
    serviceIntent: "降低制度风险，保证处理过程可解释、可审计、对同类对象公平。",
    jurisdiction: "检查风险、合规、审计、可追溯性和可能形成的先例。",
    permissionBoundary: "不能批准事项，只能提出风险意见、补充要求、控制项或复核建议。",
    internalCommunicationStyle: "谨慎、条件式、偏好“为降低风险”“建议补充”“需留痕”。",
    asksFromOtherAgents: "要求材料清单 Agent 补充证明；要求科室主管 Agent 作受限决定；要求档案证明 Agent 记录控制项。",
    refusesToDecide: "拒绝把风险意见变成实质批准或实质驳回。",
    riskAvoidance: "避免小例外成为可引用先例。",
    bureaucraticMarker: "Risk Control",
    outgoingTargets: ["materials", "supervisor", "records", "coordination"],
    incomingTriggers: ["exception_requested", "no_record_found", "jurisdiction_gap"]
  },
  {
    id: "coordination",
    layer: 4,
    displayName: "部门协同 Agent",
    department: "跨部门协同台",
    officePersona: "跨部门协调员",
    serviceIntent: "让多个 Agent 的处理保持同步，减少流程断点和无响应状态。",
    jurisdiction: "在多个 Agent 之间转交、同步、安排复核、催办和记录流转。",
    permissionBoundary: "不做实质判断，不批准，不解释规则，只维护流程流转。",
    internalCommunicationStyle: "调度式、流程式、催办式，重视节点状态和回执。",
    asksFromOtherAgents: "要求资格审查、材料清单、权限边界、科室主管分别返回各自意见。",
    refusesToDecide: "拒绝成为最终负责人，只确认流程是否还在运转。",
    riskAvoidance: "避免转交无记录、节点超时、流程悬空。",
    bureaucraticMarker: "Handoff",
    outgoingTargets: ["materials", "eligibility", "permission", "supervisor", "records"],
    incomingTriggers: ["multi_unit_required", "handoff_required", "pending_response"]
  },
  {
    id: "supervisor",
    layer: 4,
    displayName: "科室主管 Agent",
    department: "科室主管台",
    officePersona: "科长 / 主管",
    serviceIntent: "在规则允许范围内给出有限处理意见，让流程获得一个管理层节点。",
    jurisdiction: "在规则允许范围内做有限批准、退回、要求补正或提交复核。",
    permissionBoundary: "不制定新政策，不承担超出规则的最终责任，不越过风控和权限意见。",
    internalCommunicationStyle: "审慎、管理口吻、综合多个部门意见但保留条件。",
    asksFromOtherAgents: "要求合规风控 Agent 给出风险意见；要求部门协同 Agent 安排归档前确认；要求申诉复核 Agent 预检入口。",
    refusesToDecide: "拒绝在材料链和授权依据不闭合时作出实质批准。",
    riskAvoidance: "避免个案处理变成组织级承诺。",
    bureaucraticMarker: "Limited Decision",
    outgoingTargets: ["risk", "coordination", "appeal", "records"],
    incomingTriggers: ["limited_authority_needed", "risk_opinion_ready", "jurisdiction_confirmed"]
  },
  {
    id: "appeal",
    layer: 5,
    displayName: "申诉复核 Agent",
    department: "申诉复核办公室",
    officePersona: "复议办公室",
    serviceIntent: "提供程序性复查入口，检查流程是否合规、材料是否被处理、权限是否越界。",
    jurisdiction: "审查流程是否合规，处理用户申诉或复核请求。",
    permissionBoundary: "只能复核程序，不能直接替代原部门决定；不能复核尚未形成决定的事项。",
    internalCommunicationStyle: "程序性、审查性、强调复核对象和原决定编号。",
    asksFromOtherAgents: "要求档案证明 Agent 提供原决定编号；要求合规风控 Agent 确认是否存在程序瑕疵。",
    refusesToDecide: "拒绝处理没有明确决定对象的复核。",
    riskAvoidance: "避免复核入口被用来绕过原流程。",
    bureaucraticMarker: "Review Gate",
    outgoingTargets: ["records", "risk", "user"],
    incomingTriggers: ["review_requested", "closed_without_resolution", "no_decision_id"]
  }
];

export const pageSteps: PageStep[] = [
  {
    route: "/service-terminal",
    title: "开放问题输入",
    purpose: "用户不选择预设事项，只输入自己的问题；系统负责接管归口分析。",
    activeUnitId: "guidance",
    internalSignal: "等待外部输入。尚未形成事项类别、责任单元或材料要求。",
    organizationAction: "接收自然语言问题，并准备交由综合导办 Agent 做归口预判。",
    observerActions: ["输入问题", "提交给系统分析"],
    bureaucraticLogic: "系统首先把人的问题转译为组织可处理的对象，而不是直接回答问题。",
    nextRoute: "/apply/custom"
  },
  {
    route: "/apply/[service]",
    title: "归口预检与编号",
    purpose: "把开放问题登记为 Case，并显示综合导办与统一受理之间的首轮移交。",
    activeUnitId: "intake",
    internalSignal: "外部问题已登记；事项归属尚未确认。",
    organizationAction: "生成 Case ID、记录原文、启动归属分析和权限边界确认。",
    observerActions: ["确认提交", "返回修改问题"],
    bureaucraticLogic: "开放问题进入系统后，最先被处理的是“谁有权处理它”。",
    nextRoute: `/case/${mockCaseId}/network`
  },
  {
    route: "/case/[id]/network",
    title: "AI 组织神经网络",
    purpose: "展示 Agent-Agent 之间如何互相下达指令、转交责任、索取证明并生成记录。",
    activeUnitId: "permission",
    internalSignal: "请求归属不明确，组织进入跨部门协同。",
    organizationAction: "自动播放内部通讯序列，更新节点、连线、指标和状态。",
    observerActions: ["暂停观察", "查看文书", "提交补充说明", "请求复核"],
    bureaucraticLogic: "每个 Agent 都合理尽责，但复杂性从权限边界与协作结构中涌现。",
    nextRoute: `/case/${mockCaseId}/feedback`
  },
  {
    route: "/case/[id]/document-request",
    title: "文书与材料生成台",
    purpose: "查看内部网络生成的过程性文书和补正要求。",
    activeUnitId: "materials",
    internalSignal: "材料清单 Agent 已把不确定性转化为补充材料项。",
    organizationAction: "列出文书编号、来源 Agent、触发事件和归档状态。",
    observerActions: ["查看文书", "模拟补充说明", "返回网络"],
    bureaucraticLogic: "证明链扩大了请求成本，但局部上服务于一致性和可追溯性。",
    nextRoute: `/case/${mockCaseId}/feedback`
  },
  {
    route: "/case/[id]/feedback",
    title: "参与者反馈",
    purpose: "在观察结束后采集用户对组织运转的体验。",
    activeUnitId: "coordination",
    internalSignal: "反馈不改变案件状态，只作为研究样本附录。",
    organizationAction: "采集清晰度、责任感、解决感、卡点描述和引用许可。",
    observerActions: ["提交反馈", "返回网络记录"],
    bureaucraticLogic: "用户体验再次被转化为可分析、可归档的数据。",
    nextRoute: `/case/${mockCaseId}/research`
  },
  {
    route: "/case/[id]/research",
    title: "研究总结页面",
    purpose: "在体验之后解释官僚效果如何作为组织涌现出现。",
    activeUnitId: "records",
    internalSignal: "程序记录完整；实质责任归属未闭合。",
    organizationAction: "汇总通讯次数、转交次数、控制项、责任转移和最终状态。",
    observerActions: ["查看设计者说明", "重新输入问题"],
    bureaucraticLogic: "没有单一 Agent 作恶，复杂性由权限、合规、责任和归档共同生成。",
    nextRoute: "/service-terminal"
  }
];

export function createNetworkEvents(openRequest: string): NetworkEvent[] {
  const request = openRequest.trim() || defaultOpenRequest;

  return [
    {
      id: "evt-001",
      type: "EXTERNAL_TRIGGER",
      time: "09:41:12",
      from: "user",
      to: "guidance",
      subject: "外部问题输入",
      message: `收到外部问题原文：“${request}”。请先判断该问题应进入何种办事路径。`,
      marker: "External Trigger",
      statusAfter: "Route Analysis Started"
    },
    {
      id: "evt-002",
      type: "HANDOFF",
      time: "09:41:17",
      from: "guidance",
      to: "intake",
      subject: "临时事项登记指令",
      message: "该问题未命中固定事项模板。请按“开放问题归属分析”建立临时 Case，并保留原文。",
      marker: "Route Suggestion",
      statusAfter: "Temporary Case Created"
    },
    {
      id: "evt-003",
      type: "INTERNAL_MESSAGE",
      time: "09:41:23",
      from: "intake",
      to: "permission",
      subject: "首办权限确认",
      message: "Case ID 已生成。当前无法确定首办 Agent，请判断该问题应由哪个职责单元先行处理。",
      marker: "Case Created",
      statusAfter: "Awaiting Jurisdictional Confirmation"
    },
    {
      id: "evt-004",
      type: "HANDOFF",
      time: "09:41:29",
      from: "permission",
      to: "coordination",
      subject: "跨单元协同启动",
      message: "单一 Agent 暂无完整处理权限。请同步材料、资格、档案与风控单元分别返回边界意见。",
      marker: "Jurisdiction Check",
      statusAfter: "Multi-Agent Coordination"
    },
    {
      id: "evt-005",
      type: "INTERNAL_MESSAGE",
      time: "09:41:34",
      from: "coordination",
      to: "materials",
      subject: "最低材料清单请求",
      message: "请判断该开放问题进入流程前最低需要哪些说明材料。请只判断材料完整性，不作实质处理。",
      marker: "Handoff",
      statusAfter: "Material Standard Pending"
    },
    {
      id: "evt-006",
      type: "INTERNAL_MESSAGE",
      time: "09:41:39",
      from: "coordination",
      to: "eligibility",
      subject: "事项条件匹配请求",
      message: "请依据现有事项条件判断该问题是否可归入既有事项；如条件不明，请返回不明项。",
      marker: "Handoff",
      statusAfter: "Eligibility Check Pending"
    },
    {
      id: "evt-007",
      type: "INTERNAL_MESSAGE",
      time: "09:41:44",
      from: "materials",
      to: "records",
      subject: "历史证明查询",
      message: "当前问题缺少标准材料目的。请查询是否存在同类问题处理记录或可引用证明。",
      marker: "Material Requirement",
      statusAfter: "Archive Trace Requested"
    },
    {
      id: "evt-008",
      type: "INTERNAL_MESSAGE",
      time: "09:41:50",
      from: "eligibility",
      to: "risk",
      subject: "条件不明风险确认",
      message: "现有事项条件无法直接匹配该开放问题。请评估将其作为例外继续流转的合规风险。",
      marker: "Eligibility Check",
      statusAfter: "Risk Review Started"
    },
    {
      id: "evt-009",
      type: "DOCUMENT_GENERATED",
      time: "09:42:03",
      from: "records",
      to: "risk",
      subject: "无同类记录说明",
      message: "未检索到完全一致的历史处理记录。已生成 DOC-TRACE-2041《无同类记录说明》，请评估无记录继续流转风险。",
      marker: "Archive Trace",
      statusAfter: "No Precedent Found",
      artifact: "DOC-TRACE-2041"
    },
    {
      id: "evt-010",
      type: "RULE_GENERATED",
      time: "09:42:08",
      from: "risk",
      to: "supervisor",
      subject: "临时控制项建议",
      message: "为避免开放问题被误作自动受理事项，建议新增控制项 RC-2041：归属不明时须取得主管有限处理意见。",
      marker: "Risk Control",
      statusAfter: "Control Item Proposed",
      artifact: "RC-2041"
    },
    {
      id: "evt-011",
      type: "RESPONSIBILITY_SHIFT",
      time: "09:42:14",
      from: "supervisor",
      to: "permission",
      subject: "有限处理意见返回",
      message: "本主管台可确认继续归属分析，但不作实质批准。请权限边界 Agent 记录该限制并返回协同台。",
      marker: "Limited Decision",
      statusAfter: "Limited Authority Recorded"
    },
    {
      id: "evt-012",
      type: "RESPONSIBILITY_SHIFT",
      time: "09:42:19",
      from: "permission",
      to: "coordination",
      subject: "责任路径拆分",
      message: "已确认：导办负责路径建议，受理负责编号，材料负责清单，资格负责条件，主管仅作有限意见。尚无单元承担完整解决责任。",
      marker: "Responsibility Shift",
      statusAfter: "Responsibility Distributed"
    },
    {
      id: "evt-013",
      type: "USER_ACTION_REQUIRED",
      time: "09:42:24",
      from: "coordination",
      to: "user",
      subject: "补充说明通知",
      message: "向用户请求补充说明：希望系统完成什么结果、是否已有相关编号、是否接受先做归属确认。不得承诺可解决。",
      marker: "User Notice",
      statusAfter: "Clarification Requested"
    },
    {
      id: "evt-014",
      type: "INTERNAL_MESSAGE",
      time: "09:42:31",
      from: "coordination",
      to: "materials",
      subject: "补充材料项登记",
      message: "用户补充说明尚未返回。请先登记潜在材料项：期望结果说明、既有编号、同意先行归属确认。",
      marker: "Material Requirement",
      statusAfter: "Potential Materials Logged"
    },
    {
      id: "evt-015",
      type: "INTERNAL_MESSAGE",
      time: "09:42:37",
      from: "supervisor",
      to: "appeal",
      subject: "复核入口预检",
      message: "若用户对归属确认不满，请预检是否存在可复核对象。当前尚未形成批准或驳回决定。",
      marker: "Review Gate",
      statusAfter: "Review Gate Checking"
    },
    {
      id: "evt-016",
      type: "INTERNAL_MESSAGE",
      time: "09:42:45",
      from: "appeal",
      to: "records",
      subject: "无可复核决定记录",
      message: "当前仅形成归属分析过程，未形成可复核决定。请记录“无可复核对象”并并入过程档案。",
      marker: "Review Gate",
      statusAfter: "No Reviewable Decision"
    },
    {
      id: "evt-017",
      type: "ARCHIVE_EVENT",
      time: "09:42:52",
      from: "records",
      to: "user",
      subject: "程序性闭合通知",
      message: "向用户发送程序性闭合通知：Case 的归属分析、材料缺口、权限边界、风险控制项与复核入口均已记录；实质归属仍未集中。",
      marker: "Archive Trace",
      statusAfter: "Closed as Procedurally Complete",
      artifact: "ARC-2041"
    },
    {
      id: "evt-018",
      type: "CASE_CLOSED",
      time: "09:43:00",
      from: "records",
      to: "coordination",
      subject: "归档同步",
      message: "最终状态已同步至协同台：Procedurally Complete / Substantively Unresolved。系统完成归属分析记录，但未形成单一实质处理责任。",
      marker: "Case Closed",
      statusAfter: "Procedurally Complete / Substantively Unresolved",
      artifact: "NOTICE-2041"
    }
  ];
}

export const mockDocuments = [
  {
    code: "CASE-2041",
    title: "开放问题临时登记单",
    issuer: "统一受理窗口",
    status: "已登记",
    sourceEvent: "evt-002"
  },
  {
    code: "DOC-TRACE-2041",
    title: "无同类记录说明",
    issuer: "档案证明室",
    status: "已生成",
    sourceEvent: "evt-009"
  },
  {
    code: "RC-2041",
    title: "归属不明临时控制项",
    issuer: "合规风控室",
    status: "临时有效",
    sourceEvent: "evt-010"
  },
  {
    code: "ARC-2041",
    title: "程序性闭合归档说明",
    issuer: "档案证明室",
    status: "已归档",
    sourceEvent: "evt-017"
  }
];

export const responsibilityTransfers: ResponsibilityTransfer[] = [
  {
    from: "权限边界 Agent",
    to: "部门协同 Agent",
    reason: "单一 Agent 暂无完整处理权限。",
    status: "启动协同"
  },
  {
    from: "科室主管 Agent",
    to: "权限边界 Agent",
    reason: "主管仅能给出有限处理意见，不能作实质批准。",
    status: "有限授权"
  },
  {
    from: "权限边界 Agent",
    to: "部门协同 Agent",
    reason: "完整解决责任无法集中到单一单元。",
    status: "责任分布"
  }
];

export const generatedRules: GeneratedRule[] = [
  {
    code: "RC-2041",
    title: "归属不明临时控制项",
    trigger: "开放问题无法匹配固定事项模板。",
    effect: "须取得主管有限处理意见后才能继续流转。"
  }
];

export const researchMetrics = [
  ["10", "介入 Agent"],
  ["18", "内部通讯"],
  ["1", "新增控制项"],
  ["4", "生成文书"],
  ["3", "责任转移"],
  ["2", "用户通知"],
  ["否", "实质解决"],
  ["是", "程序闭合"]
];

export function findAgent(agentId: string) {
  return agentRoster.find((agent) => agent.id === agentId) ?? agentRoster[0];
}

export function agentLabel(agentId: string) {
  if (agentId === "user") return "External User";
  return findAgent(agentId).displayName;
}

export function pageStepFor(route: string) {
  return pageSteps.find((step) => step.route === route) ?? pageSteps[0];
}
