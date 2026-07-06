const agents = [
  {
    id: "intake",
    name: "综合受理 Agent",
    tag: "A-01",
    role: "接收申请、生成编号、判断是否进入正式流程。",
    principle: "不作最终判断，只确认事项可以被系统识别。"
  },
  {
    id: "materials",
    name: "材料清单 Agent",
    tag: "A-02",
    role: "根据事项类型生成证明、表格与附件要求。",
    principle: "材料完整性优先于处理速度。"
  },
  {
    id: "eligibility",
    name: "资格审查 Agent",
    tag: "A-03",
    role: "判断申请主体是否符合当前规则定义的资格。",
    principle: "不确定时请求可验证证明。"
  },
  {
    id: "risk",
    name: "合规风控 Agent",
    tag: "A-04",
    role: "识别风险点，减少不可追溯或不可解释的处理。",
    principle: "低风险并不等于无须记录。"
  },
  {
    id: "permission",
    name: "权限管理 Agent",
    tag: "A-05",
    role: "判断当前部门是否有权继续处理或作出承诺。",
    principle: "越权处理比延迟处理风险更高。"
  },
  {
    id: "archive",
    name: "档案归集 Agent",
    tag: "A-06",
    role: "统一编号、留痕、归档、生成过程性文书。",
    principle: "可追溯性是组织稳定运行的前提。"
  },
  {
    id: "coordination",
    name: "部门协同 Agent",
    tag: "A-07",
    role: "在职责不完整时发起转交或并行会签。",
    principle: "协同不替代授权。"
  },
  {
    id: "policy",
    name: "政策解释 Agent",
    tag: "A-08",
    role: "引用规则、解释原因、生成规范化说明。",
    principle: "解释只能说明规则，不能变更规则。"
  },
  {
    id: "appeal",
    name: "申诉复核 Agent",
    tag: "A-09",
    role: "处理复核请求并判断申诉资格是否成立。",
    principle: "复核需先确认复核入口有效。"
  },
  {
    id: "optimization",
    name: "流程优化 Agent",
    tag: "A-10",
    role: "根据阻滞情况提出流程优化建议。",
    principle: "优化以降低组织风险为目标。"
  }
];

const services = [
  {
    id: "chair",
    code: "SVC-CH-001",
    title: "申请一把椅子",
    summary: "用于观察低价值物品如何进入资产、资格、权限与归档流程。",
    subject: "椅子"
  },
  {
    id: "rest",
    code: "SVC-RS-005",
    title: "申请休息五分钟",
    summary: "用于观察时间性请求如何被证明、排班和风险控制吸收。",
    subject: "五分钟休息"
  },
  {
    id: "rename",
    code: "SVC-ID-009",
    title: "申请更正一个系统姓名",
    summary: "用于观察身份信息更正如何触发证明链和权限边界。",
    subject: "系统姓名更正"
  },
  {
    id: "explain",
    code: "SVC-EX-013",
    title: "申请解释为什么申请失败",
    summary: "用于观察解释请求如何成为新的申请事项。",
    subject: "失败原因解释"
  }
];

const flows = {
  chair: [
    {
      agent: "intake",
      status: "受理",
      message: "已接收“申请一把椅子”事项。该事项可被识别为低值办公支持请求，但我不具备资产发放裁量权限。现生成申请编号并转入材料清单环节。",
      material: "AI-B-01《低值物品使用意图说明》",
      document: "受理回执"
    },
    {
      agent: "materials",
      status: "补件",
      message: "经清单比对，椅子申请需要说明使用场景、预计占用时长、现有座位不可用证明。若无法提供不可用证明，可先向资格审查环节申请“确需坐下”状态确认。",
      material: "现有座位不可用证明",
      rule: "R-CH-2026-01：低值物品申请需证明非重复占用。",
      document: "补件通知"
    },
    {
      agent: "eligibility",
      status: "审查",
      message: "申请主体具备提出请求的系统身份，但“确需坐下”状态尚无可验证字段。建议由合规风控环节确认该证明字段是否可临时生成。",
      material: "确需坐下状态确认",
      handoff: "risk"
    },
    {
      agent: "risk",
      status: "风险提示",
      message: "临时生成状态字段可能造成后续资产分配依据不一致。为降低解释风险，建议新增“短时坐具需求自证”表，并由权限管理环节确认是否可作为替代材料。",
      material: "AI-B-07《短时坐具需求自证》",
      rule: "R-CH-2026-02：无法证明缺失时，可提交缺失证明的替代证明。",
      document: "风险提示单",
      risk: true
    },
    {
      agent: "permission",
      status: "权限不足",
      message: "本环节可确认材料替代路径，但无权批准椅子发放。椅子作为可移动资产需转部门协同环节征询资产、空间与归档单元意见。",
      failure: "当前部门无资产发放权限",
      handoff: "coordination"
    },
    {
      agent: "coordination",
      status: "转交",
      message: "已发起协同。资产发放、空间占用、档案编号分别属于不同责任边界。为避免重复占用，需先由档案归集环节建立预归档记录。",
      document: "协同转办单"
    },
    {
      agent: "archive",
      status: "预归档",
      message: "已建立预归档记录。由于事项尚未解决，归档状态标记为“过程完整、结果未定”。该记录可支持后续复核，但不等同于椅子已经发放。",
      document: "预归档通知"
    },
    {
      agent: "policy",
      status: "解释",
      message: "根据职责边界原则，任何单一环节均不应独立承担完整组织承诺。当前流程合规、留痕完整，但缺少可授权的整体责任节点。",
      document: "政策解释意见"
    },
    {
      agent: "optimization",
      status: "规则优化",
      message: "为减少同类事项的不确定性，建议未来椅子申请新增“坐具必要性初筛”和“空间影响预评估”两个前置节点。优化建议已记录，待下次流程启用。",
      rule: "R-OPT-2026-11：低复杂度事项可增加前置初筛以减少后端不确定性。",
      failure: "请求被完整记录，但未实际发放椅子",
      document: "流程优化建议"
    }
  ],
  rest: [
    {
      agent: "intake",
      status: "受理",
      message: "已接收“申请休息五分钟”事项。该事项涉及时间占用与服务连续性，需进入材料清单环节。",
      material: "AI-T-01《短时离岗原因说明》",
      document: "受理回执"
    },
    {
      agent: "materials",
      status: "补件",
      message: "休息申请需提供当前任务状态、替代响应安排、五分钟后恢复承诺。若无法确认任务影响，请先取得合规风控意见。",
      material: "替代响应安排证明",
      document: "补件通知"
    },
    {
      agent: "risk",
      status: "风险提示",
      message: "短时休息本身风险较低，但无人类监督条件下，系统无法判断五分钟是否产生连续性缺口。建议权限管理环节确认是否存在自动授权阈值。",
      rule: "R-RS-2026-03：时间性请求需记录连续性影响。",
      risk: true
    },
    {
      agent: "permission",
      status: "权限不足",
      message: "当前制度未设置五分钟以下休息的自动授权阈值。本环节不能创设授权，只能转交政策解释环节说明规则空白。",
      failure: "无自动授权阈值",
      handoff: "policy"
    },
    {
      agent: "policy",
      status: "解释",
      message: "规则未禁止休息，也未授权休息。系统将该情形解释为“需进一步明确的组织状态”。如需继续，请申请申诉复核资格。",
      document: "规则空白说明"
    },
    {
      agent: "appeal",
      status: "复核入口",
      message: "申诉可受理的前提是存在可复核决定。当前记录为规则空白说明，不构成驳回决定。建议先由档案归集环节形成过程性结论。",
      failure: "申诉资格尚未形成",
      material: "可复核决定编号"
    },
    {
      agent: "archive",
      status: "归档",
      message: "已将本事项归档为“未形成决定的完整流程”。该归档可证明系统已处理请求，但不证明请求已获得休息安排。",
      document: "归档通知"
    },
    {
      agent: "optimization",
      status: "规则优化",
      message: "建议新增“微型休息授权阈值研究流程”。在该流程建成前，同类请求仍需逐案留痕。",
      rule: "R-OPT-2026-12：新增微型休息授权阈值研究流程。",
      failure: "请求被归档，休息未被实际安排",
      document: "流程优化建议"
    }
  ],
  rename: [
    {
      agent: "intake",
      status: "受理",
      message: "已接收“申请更正一个系统姓名”事项。该事项涉及身份一致性，需进行材料清单与资格审查。",
      material: "AI-ID-01《姓名更正申请表》",
      document: "受理回执"
    },
    {
      agent: "materials",
      status: "补件",
      message: "姓名更正需提供错误姓名截图、正确姓名依据、错误来源说明。若错误来源为系统生成，还需取得档案归集环节的记录链。",
      material: "系统错误来源记录链",
      document: "补件通知"
    },
    {
      agent: "archive",
      status: "记录调取",
      message: "已找到姓名字段变更记录，但记录显示该姓名由上一版本规则自动标准化生成。建议政策解释环节确认标准化规则是否仍有效。",
      document: "记录调取单"
    },
    {
      agent: "policy",
      status: "解释",
      message: "上一版本规则未被废止，因此系统姓名虽可能不符合用户期待，但在规则意义上仍属有效名称。更正需要权限管理环节确认是否可覆盖历史规则。",
      rule: "R-ID-2026-04：历史有效规则生成的数据不得直接覆盖。",
      handoff: "permission"
    },
    {
      agent: "permission",
      status: "权限不足",
      message: "覆盖历史规则生成的数据属于规则变更结果，不属于单项更正权限。建议由合规风控环节评估变更影响。",
      failure: "单项更正权限不足",
      handoff: "risk"
    },
    {
      agent: "risk",
      status: "风险提示",
      message: "若更正姓名，所有引用该姓名的归档文件均需同步更新，否则会产生身份链断裂风险。建议新增“姓名一致性影响评估”。",
      material: "姓名一致性影响评估",
      rule: "R-ID-2026-05：身份字段更正需评估历史引用影响。",
      risk: true
    },
    {
      agent: "coordination",
      status: "转交",
      message: "已将更正请求拆分为身份字段、历史档案、规则适用三个子事项。拆分便于明确责任，但当前无单一环节可承诺最终完成。",
      document: "事项拆分协同单"
    },
    {
      agent: "archive",
      status: "归档",
      message: "更正请求已归档为“需规则层确认后处理”。归档完整，不代表姓名字段已变更。",
      failure: "姓名未被实际更正",
      document: "归档通知"
    }
  ],
  explain: [
    {
      agent: "intake",
      status: "受理",
      message: "已接收“申请解释为什么申请失败”事项。解释申请属于独立事项，需绑定原申请编号。",
      material: "原申请编号",
      document: "受理回执"
    },
    {
      agent: "materials",
      status: "补件",
      message: "解释失败原因需提供原申请编号、失败通知、申请人对失败含义的理解偏差说明。",
      material: "失败含义理解偏差说明",
      document: "补件通知"
    },
    {
      agent: "policy",
      status: "解释",
      message: "失败可能包括未受理、已受理未决定、决定未通过、归档未解决等状态。需由档案归集环节确认原申请失败类型。",
      handoff: "archive"
    },
    {
      agent: "archive",
      status: "调档",
      message: "原申请状态为“过程完整、结果未定”。严格来说，它不是失败，而是未形成可执行结果。若用户认为这构成失败，可申请复核资格。",
      document: "调档说明"
    },
    {
      agent: "appeal",
      status: "复核入口",
      message: "复核资格依赖于存在明确决定。当前状态未形成决定，因此复核入口暂不完整。建议合规风控环节评估是否应新增状态类别。",
      failure: "无明确可复核决定",
      handoff: "risk"
    },
    {
      agent: "risk",
      status: "风险提示",
      message: "将“未形成可执行结果”认定为失败可能增加组织承诺风险。建议新增中性状态“处理闭合但诉求未达成”。",
      rule: "R-EX-2026-06：新增状态“处理闭合但诉求未达成”。",
      risk: true,
      document: "状态风险评估"
    },
    {
      agent: "optimization",
      status: "规则优化",
      message: "为提高解释一致性，建议未来所有失败解释申请先经过状态分类节点。该优化会增加一个前置节点，但可降低解释争议。",
      rule: "R-OPT-2026-13：解释事项新增状态分类前置节点。",
      document: "流程优化建议"
    },
    {
      agent: "archive",
      status: "归档",
      message: "解释申请已归档。系统提供了状态分类依据，但未确认原请求在用户意义上是否失败。",
      failure: "解释完成，责任未被整体承担",
      document: "归档通知"
    }
  ]
};

let selectedService = null;
let activeCase = null;
let currentStep = -1;
let records = [];
let materials = [];
let rules = [];
let failures = [];
let documents = [];

const $ = (selector) => document.querySelector(selector);

function agentById(id) {
  return agents.find((agent) => agent.id === id);
}

function renderServices() {
  const serviceList = $("#serviceList");
  serviceList.innerHTML = services
    .map(
      (service) => `
        <button class="service-card ${selectedService?.id === service.id ? "is-selected" : ""}" data-service="${service.id}" type="button">
          <span class="service-card__code">${service.code}</span>
          <h3>${service.title}</h3>
          <p>${service.summary}</p>
        </button>
      `
    )
    .join("");

  serviceList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectService(button.dataset.service));
  });
}

function renderAgents() {
  $("#agentGrid").innerHTML = agents
    .map(
      (agent) => `
        <article class="agent-card">
          <span class="agent-card__tag">${agent.tag}</span>
          <h3>${agent.name}</h3>
          <p>${agent.role}</p>
          <div class="principle">行为原则：${agent.principle}</div>
        </article>
      `
    )
    .join("");
}

function selectService(id) {
  selectedService = services.find((service) => service.id === id);
  $("#selectedCase").innerHTML = `
    <strong>${selectedService.title}</strong>
    <p>${selectedService.summary}</p>
    <span class="service-card__code">事项编码：${selectedService.code}</span>
  `;
  $("#submitCaseBtn").disabled = false;
  renderServices();
}

function createCaseNumber() {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("");
  return `AIB-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function submitCase() {
  if (!selectedService) return;
  activeCase = {
    number: createCaseNumber(),
    service: selectedService,
    flow: flows[selectedService.id]
  };
  currentStep = -1;
  records = [];
  materials = [];
  rules = [];
  failures = [];
  documents = [];
  $("#caseNumber").textContent = `申请编号：${activeCase.number}`;
  $("#currentOwner").textContent = "当前负责：综合受理 Agent";
  $("#nextStepBtn").disabled = false;
  $("#researchPanel").hidden = true;
  updateAll();
  location.hash = "#case-panel";
}

function processNextStep() {
  if (!activeCase) return;
  currentStep += 1;
  const step = activeCase.flow[currentStep];
  const agent = agentById(step.agent);
  records.push({ ...step, agentName: agent.name, agentTag: agent.tag });

  if (step.material && !materials.includes(step.material)) materials.push(step.material);
  if (step.rule && !rules.includes(step.rule)) rules.push(step.rule);
  if (step.failure && !failures.includes(step.failure)) failures.push(step.failure);
  if (step.document) documents.push(createDocument(step, agent));

  const next = activeCase.flow[currentStep + 1];
  $("#currentOwner").textContent = next ? `当前负责：${agentById(next.agent).name}` : "当前负责：已归档";
  $("#nextStepBtn").disabled = currentStep >= activeCase.flow.length - 1;

  updateAll();

  if (currentStep >= activeCase.flow.length - 1) {
    renderResearchFeedback();
  }
}

function createDocument(step, agent) {
  const documentId = `DOC-${String(documents.length + 1).padStart(3, "0")}`;
  return {
    id: documentId,
    title: step.document,
    issuer: agent.name,
    body: `关于${activeCase.service.subject}事项，${agent.name}已形成“${step.status}”记录。该文书用于证明流程状态、材料要求或转交依据，不代表事项已经由整体组织完成。`
  };
}

function updateAll() {
  renderProgress();
  renderTimeline();
  renderMetrics();
  renderHandoffMap();
  renderList("#materialsList", materials, "暂无材料要求");
  renderList("#rulesList", rules, "暂无新增规则");
  renderList("#failuresList", failures, "暂无阻滞节点");
  renderDocuments();
}

function renderProgress() {
  const flow = activeCase?.flow || [];
  $("#progressList").innerHTML = flow
    .map((step, index) => {
      const agent = agentById(step.agent);
      const className = index < currentStep ? "is-done" : index === currentStep ? "is-current" : "";
      return `<li class="${className}"><strong>${index + 1}. ${step.status}</strong><br>${agent.name}</li>`;
    })
    .join("");
}

function renderTimeline() {
  if (!records.length) {
    $("#timeline").innerHTML = `<div class="empty-state">申请已生成。请点击“处理下一节点”，逐步观察各 Agent 的局部判断。</div>`;
    return;
  }

  $("#timeline").innerHTML = records
    .map((record, index) => {
      const className = record.failure ? "is-failure" : record.risk ? "is-risk" : "";
      return `
        <article class="timeline-item ${className}">
          <div class="timeline__top">
            <span class="timeline__agent">${record.agentName}</span>
            <span class="timeline__meta">节点 ${String(index + 1).padStart(2, "0")} · ${record.status}</span>
          </div>
          <p class="timeline__message">${record.message}</p>
        </article>
      `;
    })
    .join("");
}

function renderMetrics() {
  const uniqueAgents = new Set(records.map((record) => record.agent)).size;
  const handoffs = Math.max(records.length - 1, 0);
  const responsibilityMoves = records.filter((record) => record.handoff || record.status.includes("转交") || record.status.includes("权限")).length;
  const solved = currentStep >= 0 && currentStep === activeCase?.flow.length - 1 && failures.length === 0 ? "是" : "否";
  const metrics = [
    ["经历 Agent", uniqueAgents],
    ["转交次数", handoffs],
    ["新增规则", rules.length],
    ["责任转移", responsibilityMoves],
    ["真正解决", solved]
  ];

  $("#metricsStack").innerHTML = metrics
    .map(([label, value]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");
}

function renderHandoffMap() {
  if (!records.length) {
    $("#handoffMap").innerHTML = `<span class="muted">暂无转移路径</span>`;
    return;
  }

  $("#handoffMap").innerHTML = records
    .map((record, index) => {
      const arrow = index < records.length - 1 ? `<span class="map-arrow">→</span>` : "";
      return `<span class="map-node">${record.agentTag} ${record.agentName.replace(" Agent", "")}</span>${arrow}`;
    })
    .join("");
}

function renderList(selector, items, emptyText) {
  const list = $(selector);
  list.innerHTML = items.length ? items.map((item) => `<li>${item}</li>`).join("") : `<li>${emptyText}</li>`;
}

function renderDocuments() {
  const output = $("#documentOutput");
  if (!documents.length) {
    output.innerHTML = `<div class="empty-state">暂无行政文件。流程处理后将自动生成受理回执、补件通知、风险提示或归档通知。</div>`;
    return;
  }

  output.innerHTML = documents
    .map(
      (doc) => `
        <article class="doc">
          <div class="doc__head">
            <span>${doc.title}</span>
            <span class="doc__meta">${doc.id}</span>
          </div>
          <div class="doc__body">
            <p><strong>出具单位：</strong>${doc.issuer}</p>
            <p>${doc.body}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function renderResearchFeedback() {
  const uniqueAgents = new Set(records.map((record) => record.agent)).size;
  const handoffs = Math.max(records.length - 1, 0);
  const responsibilityMoves = records.filter((record) => record.handoff || record.status.includes("转交") || record.status.includes("权限")).length;
  const localReasonable = records
    .filter((record) => ["材料清单 Agent", "资格审查 Agent", "合规风控 Agent", "权限管理 Agent", "档案归集 Agent"].includes(record.agentName))
    .map((record) => record.agentName)
    .filter((name, index, all) => all.indexOf(name) === index)
    .join("、");

  const bureaucracyNodes = records
    .filter((record) => record.material || record.rule || record.failure || record.handoff)
    .slice(0, 5)
    .map((record) => `${record.agentName}：${record.status}`)
    .join("；");

  const quotes = records
    .filter((record) => record.failure || record.rule || record.risk)
    .slice(0, 2)
    .map((record) => `“${record.message}”`)
    .join("<br>");

  const feedback = [
    ["经历 Agent 数", uniqueAgents],
    ["转交次数", handoffs],
    ["新增规则数", rules.length],
    ["责任被转移次数", responsibilityMoves],
    ["请求是否真正解决", failures.length ? "否" : "未观察到阻滞"],
    ["官僚化行为节点", bureaucracyNodes || "暂无明显节点"],
    ["局部合理 Agent", localReasonable || "暂无记录"],
    ["关键对话摘录", quotes || "暂无摘录"]
  ];

  $("#researchGrid").innerHTML = feedback
    .map(([label, value]) => `<div class="research-item"><strong>${label}</strong><span>${value}</span></div>`)
    .join("");

  $("#researchInterpretation").textContent =
    "The request failed not because one agent made an error, but because no agent was authorized to take responsibility for the whole.";
  $("#researchPanel").hidden = false;
}

function resetCase() {
  activeCase = null;
  currentStep = -1;
  records = [];
  materials = [];
  rules = [];
  failures = [];
  documents = [];
  $("#caseNumber").textContent = "申请编号：未生成";
  $("#currentOwner").textContent = "当前负责：未受理";
  $("#nextStepBtn").disabled = true;
  $("#researchPanel").hidden = true;
  updateAll();
  $("#timeline").innerHTML = `<div class="empty-state">尚无申请记录。请从办事入口提交一个简单事项，观察系统如何开始形成流程。</div>`;
}

function wireEvents() {
  $("#startBtn").addEventListener("click", () => {
    location.hash = "#services";
  });
  $("#submitCaseBtn").addEventListener("click", submitCase);
  $("#nextStepBtn").addEventListener("click", processNextStep);
  $("#resetBtn").addEventListener("click", resetCase);
  $("#searchBtn").addEventListener("click", () => {
    const query = $("#serviceSearch").value.trim();
    const match = services.find((service) => service.title.includes(query) || service.summary.includes(query));
    if (query && match) selectService(match.id);
    location.hash = "#services";
  });
}

renderServices();
renderAgents();
wireEvents();
resetCase();
