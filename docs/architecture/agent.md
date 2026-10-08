# Agent

## 职责与边界

负责对话 Harness、受控工具、会话投影、Skill、Drama 制作、分镜与提示词。pi-agent-core/pi-ai 仅本模块内部使用，不成为公共契约。禁止 Agent 直接导入 fs、SQLite 或 Provider，实现通过 agent.persistence、media.agent、generation.textTransport、节点及业务服务。

核心 [serverPlugin.js](../../modules/agent/serverPlugin.js) 注册会话归档与通用 Router；dramaServerPlugin、storyboardServerPlugin、promptServerPlugin 各有独立 manifest/路由。浏览器 browser.ts 发布 ui.agent.surfaces，promptPlugin 安装独立提示词能力。当前核心显式依赖 Drama，不承诺任意子插件热卸载。

## 接口契约

HTTP 前缀 `/api/agent/v2`、协议版本 2，事件与操作封套在 contracts/agentProtocol.*；会话树、展示活动和归档分别在 agentSession/agentActivity/agentArchive。完整运行流程见 [Agent Harness](agent-harness.md)。

agent.persistence 由 storage.agent-files 提供会话、工作区、计划、预算等 store 工厂；agent.skills 提供技能目录；agent.archive 为项目包提供只读历史导出和独立导入。模型能力经 [AgentTextGenerationService](../../modules/contracts/agentTextGeneration.d.ts) 获取，Agent 只提交中立消息、工具和参数，不获取明文密钥、端点或构造 Authorization。wire 协议和来源参数位于 plugins/platform/text-transport；生成经业务服务或节点运行服务。

工具参数先校验 schema，再绑定项目/会话/操作身份；变更先写执行意图，确认后写回执。nodeTools 直接使用受限节点服务，不通过浏览器猜测节点参数。通用操作错误使用 contracts/agentErrors；保留的字符串诊断码和横向 UI 调用差异见 conformance。

## 数据模型

v2 会话含 id/projectId/revision、树 entries/branches/activeBranch、runs/receipts/metadata。工作区草稿保留选中会话、模型、执行方式与思考设置；技能目录按用户私有域存放，导入文件只作提示上下文。

制作计划和预算有独立 revision、授权和回执，分支或压缩不回滚画布/费用。归档保留聊天显示历史和附件引用，不恢复生成卡片操作、运行检查点、API Key 或 Skill 文件。旧会话不自动加载/转换。

## 功能结构

发送校验 -> 会话锁和唯一 operationId -> pi 工具循环 -> 写会话/意图 -> 执行业务 -> 写回执 -> SSE 投影 -> run_end。断流读取快照，不重发消息；应用退出等待停止及持久化。
模型 stream 的 textDelta 是暂态显示，工具参数必须完整并校验后才进入 pi；截断或非法 JSON 明确拒绝，不自动重发。usage 和 stopReason 经公共结果映射，AbortSignal 覆盖凭据解析、提交及响应消费。

关闭面板只断前端观察；退出或切换项目停止相应 Agent 运行。Skill 导入、分类、封面、中文展示、删除及初始化由同一存储服务维护；预设删除后不重建，脚本不执行。面板展示与时间线渲染分担职责，保留工具确认原位置和焦点恢复。
聊天控制器分为历史、会话动作、单轮请求和生命周期职责，仍按 active/epoch/项目身份拒绝迟到结果，断流只读回执不重放。Skill 快捷选择分为状态、选择动作、DOM 挂载及绑定；面板状态、操作与会话/编辑区/外壳渲染独立维护。模型传输文件已迁至 plugins/platform/text-transport，源码目录不再列旧 Agent 路径。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/agent/browser.manifest.json](../../modules/agent/browser.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/agent/browser.prompt.manifest.json](../../modules/agent/browser.prompt.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/agent/browser.ts](../../modules/agent/browser.ts) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/agent/dramaServerPlugin.js](../../modules/agent/dramaServerPlugin.js) | 模块入口或装配 | `default` | 含 HTTP/网络、服务注册/生命周期 调用；时机见实现 |
| [modules/agent/exports.json](../../modules/agent/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/agent/index.js](../../modules/agent/index.js) | 模块入口或装配 | `createAgentRouter`, `createDramaPlanRouter`, `createDramaExecutionService`, `createOfficialSkillRegistry` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/promptPlugin.ts](../../modules/agent/promptPlugin.ts) | 模块入口或装配 | `default` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/promptServerPlugin.js](../../modules/agent/promptServerPlugin.js) | 模块入口或装配 | `default` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/server.drama.manifest.json](../../modules/agent/server.drama.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/agent/server.manifest.json](../../modules/agent/server.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/agent/server.prompt.manifest.json](../../modules/agent/server.prompt.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/agent/server.storyboard.manifest.json](../../modules/agent/server.storyboard.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/agent/server/agent/agentRouter.js](../../modules/agent/server/agent/agentRouter.js) | HTTP 转换与校验 | `createAgentRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/server/agent/agentSkillRouter.js](../../modules/agent/server/agent/agentSkillRouter.js) | HTTP 转换与校验 | `createAgentSkillRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/server/agent/canvasApiTool.js](../../modules/agent/server/agent/canvasApiTool.js) | 服务端领域实现 | `canvasApiTool`, `invalidCanvasArguments` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/agent/canvasControlInstructions.js](../../modules/agent/server/agent/canvasControlInstructions.js) | 服务端领域实现 | `controlInstructions` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/agent/drama/dramaConversation.js](../../modules/agent/server/agent/drama/dramaConversation.js) | 服务端领域实现 | `requireDramaSession`, `createDramaConversationMessages`, `parseDramaConversationReply`, `createDramaConversationService` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/agent/drama/dramaExecutionService.js](../../modules/agent/server/agent/drama/dramaExecutionService.js) | 运行、调度或服务 | `DramaExecutionError`, `createDramaExecutionService` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/agent/drama/dramaModelGenerator.js](../../modules/agent/server/agent/drama/dramaModelGenerator.js) | 服务端领域实现 | `createDramaModelGenerator` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/agent/drama/dramaPlan.js](../../modules/agent/server/agent/drama/dramaPlan.js) | 服务端领域实现 | `DRAMA_PLAN_LIMITS`, `DRAMA_FIXED_TAIL`, `DramaPlanError`, `assertDramaObject`, `requireDramaProjectId`, `requireDramaPlanId`, `requireDramaRevision`, `normalizeDramaScript`, `countDramaDialogue`, `validateDramaPlan`, `assertDramaPlanReviewable`, `parseGeneratedDramaPlan`, `createFightAssetPlanningPrompt`, `createDramaPlanningPrompt`, `compileDramaSegment` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/agent/drama/dramaPlanRouter.js](../../modules/agent/server/agent/drama/dramaPlanRouter.js) | HTTP 转换与校验 | `createDramaPlanRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/server/agent/drama/dramaScriptImport.js](../../modules/agent/server/agent/drama/dramaScriptImport.js) | 服务端领域实现 | `DramaScriptImportError`, `importDramaScript`, `createDramaScriptImportRouter` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/agent/server/agent/drama/dramaTurn.js](../../modules/agent/server/agent/drama/dramaTurn.js) | 服务端领域实现 | `prepareDramaTurn` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/agent/drama/officialDramaBundle.js](../../modules/agent/server/agent/drama/officialDramaBundle.js) | 服务端领域实现 | `OFFICIAL_DRAMA_BUNDLE`, `OFFICIAL_DRAMA_SKILL_METADATA`, `officialProductionBundle`, `OFFICIAL_PRODUCTION_SKILLS`, `SKILL_INSTRUCTION_LIMITS` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/agent/officialSkillRegistry.js](../../modules/agent/server/agent/officialSkillRegistry.js) | 服务端领域实现 | `DEFAULT_OFFICIAL_SKILL_SLUG`, `createOfficialSkillRegistry` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/agent/prompts/system.js](../../modules/agent/server/agent/prompts/system.js) | 服务端领域实现 | `CHAT_AGENT_SYSTEM_PROMPT` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/agent/tools/canvasTools.js](../../modules/agent/server/agent/tools/canvasTools.js) | 服务端领域实现 | `searchCanvasNodes` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/harness/archive.js](../../modules/agent/server/harness/archive.js) | 服务端领域实现 | `createAgentArchiveService` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/harness/modelAdapter.js](../../modules/agent/server/harness/modelAdapter.js) | 服务端领域实现 | `textContent`, `assistantMessage`, `createModelAdapter`, `imageBlocks` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/harness/nodeTools.js](../../modules/agent/server/harness/nodeTools.js) | 服务端领域实现 | `createNodeToolDispatch` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/harness/operationBridge.js](../../modules/agent/server/harness/operationBridge.js) | 服务端领域实现 | `createCanvasControlBridge` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/harness/runLifetime.js](../../modules/agent/server/harness/runLifetime.js) | 服务端领域实现 | `createRunLifetime` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/harness/runtime.js](../../modules/agent/server/harness/runtime.js) | 运行、调度或服务 | `createPiAgentHarness` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/harness/session.js](../../modules/agent/server/harness/session.js) | 服务端领域实现 | `harnessError`, `branchEntries`, `contextMessages`, `sessionView`, `createSessionService` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/harness/tools.js](../../modules/agent/server/harness/tools.js) | 服务端领域实现 | `mutates`, `journalBusinessTool`, `controlledTools` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/server/prompt/promptAssistantRouter.js](../../modules/agent/server/prompt/promptAssistantRouter.js) | HTTP 转换与校验 | `createPromptAssistantRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/server/prompt/promptPresetRouter.js](../../modules/agent/server/prompt/promptPresetRouter.js) | HTTP 转换与校验 | `createPromptPresetRouter`, `PromptPresetError` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/server/storyboard/storyboardRouter.js](../../modules/agent/server/storyboard/storyboardRouter.js) | HTTP 转换与校验 | `createStoryboardRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/serverPlugin.js](../../modules/agent/serverPlugin.js) | 模块入口或装配 | `default` | 含 HTTP/网络、服务注册/生命周期 调用；时机见实现 |
| [modules/agent/storyboardServerPlugin.js](../../modules/agent/storyboardServerPlugin.js) | 模块入口或装配 | `default` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/agent/AgentAttachmentPreview.tsx](../../modules/agent/ui/agent/AgentAttachmentPreview.tsx) | 界面呈现与交互 | `AgentAttachmentPreview` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentBudgets.tsx](../../modules/agent/ui/agent/AgentBudgets.tsx) | 浏览器交互与状态辅助 | `AgentBudgets` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentCanvasActions.tsx](../../modules/agent/ui/agent/AgentCanvasActions.tsx) | 浏览器交互与状态辅助 | `AgentCanvasActions` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentConversationOptions.tsx](../../modules/agent/ui/agent/AgentConversationOptions.tsx) | 浏览器交互与状态辅助 | `AgentConversationOptions` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentDocumentCard.tsx](../../modules/agent/ui/agent/AgentDocumentCard.tsx) | 界面呈现与交互 | `AgentDocumentCard` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/AgentGenerationBatches.tsx](../../modules/agent/ui/agent/AgentGenerationBatches.tsx) | 浏览器交互与状态辅助 | `AgentGenerationBatches` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentMarkdown.tsx](../../modules/agent/ui/agent/AgentMarkdown.tsx) | 浏览器交互与状态辅助 | `AgentMarkdown` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentMessageExport.tsx](../../modules/agent/ui/agent/AgentMessageExport.tsx) | 浏览器交互与状态辅助 | `AgentMessageExport` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentModelMenu.tsx](../../modules/agent/ui/agent/AgentModelMenu.tsx) | 浏览器交互与状态辅助 | `AgentModelMenu` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentNodeRunCard.tsx](../../modules/agent/ui/agent/AgentNodeRunCard.tsx) | 界面呈现与交互 | `AgentNodeRunCard` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/AgentOptionPopover.tsx](../../modules/agent/ui/agent/AgentOptionPopover.tsx) | 浏览器交互与状态辅助 | `AgentOptionPopover` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/AgentProductRequests.tsx](../../modules/agent/ui/agent/AgentProductRequests.tsx) | 浏览器交互与状态辅助 | `AgentProductRequests` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentProjectRequests.tsx](../../modules/agent/ui/agent/AgentProjectRequests.tsx) | 浏览器交互与状态辅助 | `AgentProjectRequests` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentTimelineActivity.tsx](../../modules/agent/ui/agent/AgentTimelineActivity.tsx) | 浏览器交互与状态辅助 | `AgentCardControllers`, `timelineActivities`, `AgentTimelineActivity`, `AgentUnlinkedActivity` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/agentActivity.css](../../modules/agent/ui/agent/agentActivity.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/agent/ui/agent/agentClient.ts](../../modules/agent/ui/agent/agentClient.ts) | 客户端或传输 | `AgentNode`, `AgentMessageInput`, `AgentSelectedSkill`, `AgentSession`, `DramaConversationState`, `DramaConversationAction`, `AgentStreamResult`, `AgentClientError`, `createAgentClient`, `AgentClient`, `installAgentClient` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/agent/agentComposerOptions.css](../../modules/agent/ui/agent/agentComposerOptions.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/agent/ui/agent/agentConversation.ts](../../modules/agent/ui/agent/agentConversation.ts) | 浏览器交互与状态辅助 | `DEFAULT_AGENT_SKILL`, `ConversationSnapshot`, `ConversationTools`, `createAgentConversation`, `AgentConversation` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/agentDocuments.ts](../../modules/agent/ui/agent/agentDocuments.ts) | 浏览器交互与状态辅助 | `AgentDocument`, `readAgentDocument`, `agentMessageWithDocuments`, `splitAgentDocumentMessage` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/agentGenerationApproval.ts](../../modules/agent/ui/agent/agentGenerationApproval.ts) | 浏览器交互与状态辅助 | `withGenerationApproval` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/agentPanelActions.ts](../../modules/agent/ui/agent/agentPanelActions.ts) | 界面呈现与交互 | `agentPanelActions`, `AgentPanelActions` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/agentPanelWidth.ts](../../modules/agent/ui/agent/agentPanelWidth.ts) | 界面呈现与交互 | `agentPanelWidthLimits`, `clampAgentPanelWidth` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/agentPendingOperations.ts](../../modules/agent/ui/agent/agentPendingOperations.ts) | 浏览器交互与状态辅助 | `resumeAgentOperations` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/agent/agentRunSync.ts](../../modules/agent/ui/agent/agentRunSync.ts) | 浏览器交互与状态辅助 | `createAgentRunSync` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/agentTextBuffer.ts](../../modules/agent/ui/agent/agentTextBuffer.ts) | 浏览器交互与状态辅助 | `createAgentTextBuffer` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/agentThinking.ts](../../modules/agent/ui/agent/agentThinking.ts) | 浏览器交互与状态辅助 | `ThinkingParameter`, `isThinkingParameter`, `agentThinking` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/agentVision.ts](../../modules/agent/ui/agent/agentVision.ts) | 浏览器交互与状态辅助 | `AgentVision`, `agentVisionLabels`, `agentVisionHints` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/agentWorkspace.css](../../modules/agent/ui/agent/agentWorkspace.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/agent/ui/agent/agentWorkspace.ts](../../modules/agent/ui/agent/agentWorkspace.ts) | 浏览器交互与状态辅助 | `AgentWorkspace`, `createAgentWorkspace`, `useAgentWorkspace` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/canvasAgentAttachments.ts](../../modules/agent/ui/agent/canvasAgentAttachments.ts) | 浏览器交互与状态辅助 | `AgentReference`, `readAgentImage`, `mergeAgentReferences` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/agent/canvasAgentChat.ts](../../modules/agent/ui/agent/canvasAgentChat.ts) | 浏览器交互与状态辅助 | `ChatMessage`, `createCanvasAgentChat`, `useCanvasAgentChat` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/canvasAgentChrome.tsx](../../modules/agent/ui/agent/canvasAgentChrome.tsx) | 浏览器交互与状态辅助 | `CanvasAgentMessage`, `CanvasAgentLauncher` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/canvasAgentModels.ts](../../modules/agent/ui/agent/canvasAgentModels.ts) | 浏览器交互与状态辅助 | `canvasAgentModels` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/canvasAgentPanel.tsx](../../modules/agent/ui/agent/canvasAgentPanel.tsx) | 界面呈现与交互 | `CanvasAgentPanel` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/canvasAgentPanelTypes.ts](../../modules/agent/ui/agent/canvasAgentPanelTypes.ts) | 界面呈现与交互 | `Runtime`, `Parameter`, `AgentModel`, `Props`, `Icons`, `EMPTY_NODES`, `EMPTY_REFERENCES` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/canvasAgentReferenceState.ts](../../modules/agent/ui/agent/canvasAgentReferenceState.ts) | 浏览器交互与状态辅助 | `useCanvasAgentReferences` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/canvasAssetControl.ts](../../modules/agent/ui/agent/canvasAssetControl.ts) | 浏览器交互与状态辅助 | `createCanvasAssetControl` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/canvasBudgetControl.ts](../../modules/agent/ui/agent/canvasBudgetControl.ts) | 浏览器交互与状态辅助 | `GenerationBudget`, `createCanvasBudgetControl`, `CanvasBudgetControl` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/agent/canvasControlExecutor.ts](../../modules/agent/ui/agent/canvasControlExecutor.ts) | 浏览器交互与状态辅助 | `createCanvasControlExecutor` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/canvasCreationControl.ts](../../modules/agent/ui/agent/canvasCreationControl.ts) | 浏览器交互与状态辅助 | `GenerationBatch`, `createCanvasCreationControl`, `CanvasCreationControl` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/canvasMediaControl.ts](../../modules/agent/ui/agent/canvasMediaControl.ts) | 浏览器交互与状态辅助 | `canvasImagePreview`, `createCanvasMediaControl` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/canvasModelControl.ts](../../modules/agent/ui/agent/canvasModelControl.ts) | 浏览器交互与状态辅助 | `modeKey`, `modelKey`, `canvasModels`, `modelParameters`, `configureCanvasModel` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/canvasProductControl.ts](../../modules/agent/ui/agent/canvasProductControl.ts) | 浏览器交互与状态辅助 | `productOperations`, `ProductOperation`, `createCanvasProductControl`, `CanvasProductControl` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/canvasProjectControl.ts](../../modules/agent/ui/agent/canvasProjectControl.ts) | 浏览器交互与状态辅助 | `ProjectRequest`, `createCanvasProjectControl`, `CanvasProjectControl` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/agent/canvasTaskControl.ts](../../modules/agent/ui/agent/canvasTaskControl.ts) | 浏览器交互与状态辅助 | `createCanvasTaskControl` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/agent/canvasWorkflowControl.ts](../../modules/agent/ui/agent/canvasWorkflowControl.ts) | 浏览器交互与状态辅助 | `createCanvasWorkflowControl` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/chatToolEvents.ts](../../modules/agent/ui/agent/chatToolEvents.ts) | 浏览器交互与状态辅助 | `applyChatToolEvent` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/dramaCanvas.ts](../../modules/agent/ui/agent/dramaCanvas.ts) | 浏览器交互与状态辅助 | `DramaAssetOutput`, `DramaAssetExecution`, `DramaExecutionSnapshot`, `DramaCanvasComposition`, `DramaCanvasNode`, `dramaAssetNodeId`, `buildDramaAssetNodes`, `buildDramaCanvasNodes`, `mergeDramaCanvasNodes` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/dramaCanvasBridge.ts](../../modules/agent/ui/agent/dramaCanvasBridge.ts) | 浏览器交互与状态辅助 | `DramaCanvasRecord`, `DramaCanvasBridge`, `createDramaCanvasBridge`, `installDramaCanvasBridge` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/dramaClient.ts](../../modules/agent/ui/agent/dramaClient.ts) | 客户端或传输 | `DramaAsset`, `DramaSegment`, `DramaPlan`, `DramaAssetExecution`, `DramaExecution`, `DramaComposition`, `DramaClientError`, `createDramaClient`, `DramaClient` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/agent/dramaConversationShortcut.ts](../../modules/agent/ui/agent/dramaConversationShortcut.ts) | 浏览器交互与状态辅助 | `DRAMA_SHORTCUT_LABEL`, `SELECT_AGENT_SKILL_EVENT`, `installDramaConversationShortcut` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/dramaConversationTools.ts](../../modules/agent/ui/agent/dramaConversationTools.ts) | 浏览器交互与状态辅助 | `installDramaConversationTools` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/generationPlanClient.ts](../../modules/agent/ui/agent/generationPlanClient.ts) | 客户端或传输 | `GenerationPlanRecord`, `createGenerationPlanClient`, `GenerationPlanClient` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/agent/nodeTaskObservation.ts](../../modules/agent/ui/agent/nodeTaskObservation.ts) | 浏览器交互与状态辅助 | `observeNodeTask` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/agent/renderAgentPanelComposer.tsx](../../modules/agent/ui/agent/renderAgentPanelComposer.tsx) | 界面呈现与交互 | `renderAgentPanelComposer` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/renderAgentPanelConversation.tsx](../../modules/agent/ui/agent/renderAgentPanelConversation.tsx) | 界面呈现与交互 | `renderAgentPanelConversation`, `renderAgentPanelAttachments` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/renderAgentPanelShell.tsx](../../modules/agent/ui/agent/renderAgentPanelShell.tsx) | 界面呈现与交互 | `renderAgentPanelHistory`, `renderAgentPanelHeader`, `renderAgentHarnessControls` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/surfaces.ts](../../modules/agent/ui/agent/surfaces.ts) | 浏览器交互与状态辅助 | `agentSurfaces` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/useAgentScroll.ts](../../modules/agent/ui/agent/useAgentScroll.ts) | 浏览器交互与状态辅助 | `useAgentScroll` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/useCanvasAgentPanelState.ts](../../modules/agent/ui/agent/useCanvasAgentPanelState.ts) | 界面呈现与交互 | `useCanvasAgentPanelState`, `AgentPanelState` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/CreativeLibrary.css](../../modules/agent/ui/prompt/CreativeLibrary.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/agent/ui/prompt/CreativeLibrary.tsx](../../modules/agent/ui/prompt/CreativeLibrary.tsx) | 浏览器交互与状态辅助 | `MjStyleStatus`, `CreativePromptTokens`, `CreativeLibraryTools` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/ImageAngleControl.tsx](../../modules/agent/ui/prompt/ImageAngleControl.tsx) | 浏览器交互与状态辅助 | `ImageAngleControl` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/MjStyleLibrary.css](../../modules/agent/ui/prompt/MjStyleLibrary.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/agent/ui/prompt/MjStyleLibrary.tsx](../../modules/agent/ui/prompt/MjStyleLibrary.tsx) | 浏览器交互与状态辅助 | `MjStyleLibrary` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/canvasMentionList.tsx](../../modules/agent/ui/prompt/canvasMentionList.tsx) | 浏览器交互与状态辅助 | `CanvasMentionList` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/canvasPresetCard.tsx](../../modules/agent/ui/prompt/canvasPresetCard.tsx) | 界面呈现与交互 | `CanvasPresetCard` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/canvasPresetForm.tsx](../../modules/agent/ui/prompt/canvasPresetForm.tsx) | 浏览器交互与状态辅助 | `CanvasPresetForm` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/canvasPresetList.tsx](../../modules/agent/ui/prompt/canvasPresetList.tsx) | 浏览器交互与状态辅助 | `CanvasPresetList` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/canvasPromptEditor.tsx](../../modules/agent/ui/prompt/canvasPromptEditor.tsx) | 浏览器交互与状态辅助 | `CanvasPromptEditor` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/canvasPromptTags.tsx](../../modules/agent/ui/prompt/canvasPromptTags.tsx) | 浏览器交互与状态辅助 | `CanvasPromptTag`, `CanvasMentionTag` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/prompt/creativeCatalog.json](../../modules/agent/ui/prompt/creativeCatalog.json) | 类型或数据定义 | 声明式配置 | 无业务运行副作用 |
| [modules/agent/ui/prompt/creativePresets.ts](../../modules/agent/ui/prompt/creativePresets.ts) | 浏览器交互与状态辅助 | `CreativeKind`, `CreativePreset`, `CreativeSelection`, `validCreativePreset`, `creativeSelection`, `composeCreativePrompt` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/prompt/imageAngle.ts](../../modules/agent/ui/prompt/imageAngle.ts) | 浏览器交互与状态辅助 | `ImageAngle`, `defaultImageAngle`, `angleDirections`, `normalizeImageAngle`, `imageAngleDescription`, `imageAnglePrompt` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/prompt/mjStyleCatalog.json](../../modules/agent/ui/prompt/mjStyleCatalog.json) | 类型或数据定义 | 声明式配置 | 无业务运行副作用 |
| [modules/agent/ui/prompt/mjStyles.ts](../../modules/agent/ui/prompt/mjStyles.ts) | 浏览器交互与状态辅助 | `mjCategoryGroups`, `MjStyle`, `MjInsertMode`, `mjStyleText`, `mjStylePreset`, `filterMjStyles` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/prompt/nodeSidePanel.ts](../../modules/agent/ui/prompt/nodeSidePanel.ts) | 界面呈现与交互 | `nodeSidePanelPosition`, `activateSidePanel`, `useNodeSidePanel` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/promptAssistant.ts](../../modules/agent/ui/prompt/promptAssistant.ts) | 浏览器交互与状态辅助 | `DescribeImageInput`, `PromptAssistantClientError`, `createPromptAssistantClient`, `PromptAssistantClient`, `installPromptAssistant` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/prompt/promptComponents.ts](../../modules/agent/ui/prompt/promptComponents.ts) | 浏览器交互与状态辅助 | `PromptRuntime`, `PromptIcon`, `PromptIcons`, `PromptKeyHandle`, `PromptPresetItem`, `PresetListProps`, `PresetFormProps`, `PresetCardProps`, `presetText`, `promptPreviewIsVideo`, `isolatePromptMenuKeyboard` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/prompt/promptDocument.ts](../../modules/agent/ui/prompt/promptDocument.ts) | 浏览器交互与状态辅助 | `PromptAsset`, `PromptDocumentNode`, `promptAssetType`, `promptAssetIndex`, `promptAssetLabel`, `promptToDocument`, `documentToPrompt` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/prompt/promptExpand.ts](../../modules/agent/ui/prompt/promptExpand.ts) | 浏览器交互与状态辅助 | `PROMPT_CONTAINER_SELECTOR`, `PROMPT_EXPAND_TARGET_SELECTOR`, `PROMPT_EXPAND_CSS`, `closePromptExpand`, `installPromptExpand` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/promptPresets.ts](../../modules/agent/ui/prompt/promptPresets.ts) | 浏览器交互与状态辅助 | `PromptPresetType`, `PromptPreset`, `PromptPresetCategory`, `PromptPresetConfig`, `CreatePromptPresetInput`, `ParsedPromptTag`, `serializePromptTag`, `parsePromptTags`, `displayPromptTags`, `expandPromptTags`, `serializedTagsToHtml`, `createPromptPresetClient`, `PromptPresetClient`, `installPromptPresets` | 含 HTTP/网络 调用；时机见实现 |
| [modules/agent/ui/prompt/promptSuggestions.ts](../../modules/agent/ui/prompt/promptSuggestions.ts) | 浏览器交互与状态辅助 | `SuggestionProps`, `SuggestionUI`, `createPromptSuggestions` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/prompt/renderPresetPreview.tsx](../../modules/agent/ui/prompt/renderPresetPreview.tsx) | 界面呈现与交互 | `renderPresetPreview` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/prompt/usePromptMutation.ts](../../modules/agent/ui/prompt/usePromptMutation.ts) | 浏览器交互与状态辅助 | `usePromptMutation` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/skills/officialSkillCovers.ts](../../modules/agent/ui/skills/officialSkillCovers.ts) | 浏览器交互与状态辅助 | `officialSkillCover` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/skills/skillClient.ts](../../modules/agent/ui/skills/skillClient.ts) | 客户端或传输 | `AgentSkill`, `extractSkillMentions`, `createAgentSkillClient`, `AgentSkillClient`, `installAgentSkillClient` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/agent/ui/skills/skillCommunity.ts](../../modules/agent/ui/skills/skillCommunity.ts) | 浏览器交互与状态辅助 | `installSkillCommunity` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/skills/skillCommunityStyles.ts](../../modules/agent/ui/skills/skillCommunityStyles.ts) | 浏览器交互与状态辅助 | `installSkillStyles` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/skills/skillDetailView.ts](../../modules/agent/ui/skills/skillDetailView.ts) | 界面呈现与交互 | `openSkillDetailView` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/skills/skillImportDialog.ts](../../modules/agent/ui/skills/skillImportDialog.ts) | 界面呈现与交互 | `openSkillImportDialog` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/skills/skillManager.ts](../../modules/agent/ui/skills/skillManager.ts) | 浏览器交互与状态辅助 | `openSkillManager` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/skills/skillManagerCards.ts](../../modules/agent/ui/skills/skillManagerCards.ts) | 界面呈现与交互 | `element`, `button`, `skillManagerCard` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/skills/skillManagerFocus.ts](../../modules/agent/ui/skills/skillManagerFocus.ts) | 浏览器交互与状态辅助 | `restoreSkillManagerFocus` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/skills/skillShowcase.css](../../modules/agent/ui/skills/skillShowcase.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/agent/ui/skills/skillShowcase.tsx](../../modules/agent/ui/skills/skillShowcase.tsx) | 浏览器交互与状态辅助 | `SkillShowcase` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/skills/skillSlashMenu.ts](../../modules/agent/ui/skills/skillSlashMenu.ts) | 浏览器交互与状态辅助 | `SkillSlashMenu` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/storyboard/storyboardClient.ts](../../modules/agent/ui/storyboard/storyboardClient.ts) | 客户端或传输 | `StoryboardCharacter`, `StoryboardReference`, `StoryboardScene`, `BrainstormRequest`, `OptimizeStoryRequest`, `GenerateScriptsRequest`, `GenerateCompositeRequest`, `GenerateScriptsResult`, `StoryboardClientError`, `createStoryboardClient`, `StoryboardClient`, `installStoryboardClient` | 含 HTTP/网络 调用；时机见实现 |

<!-- source-inventory:end -->
