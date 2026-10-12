# Agent

## 职责与边界

负责对话 Harness、受控工具、会话投影、Skill、Drama 制作、分镜与提示词。pi-agent-core/pi-ai 仅本模块内部使用，不成为公共契约。禁止 Agent 直接导入 fs、SQLite 或 Provider，实现通过 agent.persistence、media.agent、generation.textTransport、节点及业务服务。

用户界面的技能标题、操作按钮、输入提示、无障碍标签及错误文案统一使用“技能”；协议字段、代码标识和导入文件名 `SKILL.md` 保留原名。

首页 `skillShowcase.tsx` 的详情按钮通过 kernel 浏览器事件总线发送 `SKILL_NEW_CANVAS_EVENT`；画布保存后发送带项目 id 的 `SKILL_SELECT_EVENT`，`dramaConversationShortcut.ts` 核对当前项目并复用技能选择流程打开 Agent、等待原生会话绑定和历史恢复、保存选择并聚焦输入框。`agentConversation.snapshot().ready` 表示原生会话是否已绑定；事件只选择技能，不提交对话或生成。接口及事件载荷位于 contracts/skillCatalog。

核心 [serverPlugin.js](../../modules/agent/serverPlugin.js) 注册会话归档与通用 Router；dramaServerPlugin、storyboardServerPlugin、promptServerPlugin 各有独立 manifest/路由。浏览器 browser.ts 发布 ui.agent.surfaces，promptPlugin 安装独立提示词能力。当前核心显式依赖 Drama，不承诺任意子插件热卸载。

## 接口契约

HTTP 前缀 `/api/agent/v2`、协议版本 2，事件与操作封套在 contracts/agentProtocol.*；会话树、展示活动和归档分别在 agentSession/agentActivity/agentArchive。完整运行流程见 [Agent Harness](agent-harness.md)。

agent.persistence 由 storage.agent-files 提供会话、工作区、计划、预算等 store 工厂；agent.skills 提供技能目录；agent.archive 为项目包提供只读历史导出和独立导入。模型能力经 [AgentTextGenerationService](../../modules/contracts/agentTextGeneration.d.ts) 获取，Agent 只提交中立消息、工具和参数，不获取明文密钥、端点或构造 Authorization。wire 协议和来源参数位于 plugins/platform/text-transport；生成经业务服务或节点运行服务。

工具参数先校验 schema，再绑定项目/会话/操作身份；变更先写执行意图，确认后写回执。nodeTools 直接使用受限节点服务，不通过浏览器猜测节点参数。通用操作错误使用 contracts/agentErrors；保留的字符串诊断码和横向 UI 调用差异见 conformance。

## 数据模型

v2 会话含 id/projectId/revision、树 entries/branches/activeBranch、runs/receipts/metadata。工作区草稿保留选中会话、模型、执行方式与思考设置；官方技能从安装应用读取，用户导入技能按用户私有域存放，导入文件只作提示上下文。

制作计划和预算有独立 revision、授权和回执，分支或压缩不回滚画布/费用。归档保留聊天显示历史和附件引用，不恢复生成卡片操作、运行检查点、API Key 或 Skill 文件。旧会话不自动加载/转换。

## 功能结构

官方制作技能仅保留“剧本文戏”和“打斗武戏”，身份定义在 `modules/contracts/officialProductionProfiles.js`，指令由存储适配器加载 `builtin/minimax-drama-prompt` 和 `builtin/minimax-fight-assets`。每个技能目录的 `metadata.json` 保存名称、简介、分类、开放状态及文件数；存储侧官方注册表的 `list()` 异步读取展示信息，身份、版本及执行绑定仍来自 contracts，JSON 不能授予官方身份。高配剧本文戏的注册、专用路由与封面已移除，技能服务不再提供该条目。

技能导入支持 PNG、JPEG、WebP 和 GIF 封面，保存原始文件并由封面接口返回对应 MIME 类型，不转码或抽取首帧。官方技能与预设源目录通过存储适配器 `presetSkillCovers.js` 按 `cover.gif`、`cover.webp`、`cover.png`、`cover.jpg`、`cover.jpeg` 顺序查找并返回对应 MIME 类型；用户技能按 `metadata.json` 的 `coverFile` 读取。首页、管理卡片、详情及侧边预览均用原生图片元素显示 GIF 动画；缺失或加载失败时使用现有默认封面。

各技能的展示描述包含适用场景、输入、处理步骤、交付内容与执行边界，保存在对应 `metadata.json` 的 `description` 中，可使用换行分段。描述长度上限统一使用 contracts/skillCatalog 的 `SKILL_DESCRIPTION_MAX_LENGTH`（4000 字符），导入表单、元数据校验和用户技能读取共用该限制。紧凑列表和卡片保留摘要布局，详情弹窗显示完整描述与分段。

官方预设直接从安装应用的 `builtin` 读取，不再复制到用户目录。普通预设位于 `builtin/presets`，由存储适配器 `userSkillPresets.js` 的 `createBundledSkillPresets` 列目录、加载指令和封面；受控制作技能由存储侧 `officialSkillRegistry.js` 读取。更新应用后，官方名称、简介、分类、正文、显式参考及封面均使用新包内容，官方新增或移除也同步生效。普通预设使用稳定的 `preset-` 调用标识，中文目录以目录名哈希生成；修改正文或展示名称不改变身份。普通官方预设不获得受控文戏或武戏执行权限，专用流程仍核对 contracts 的制作身份。

普通导入优先读取同目录的 `metadata.json`，缺少时从 `SKILL.md` frontmatter 提取名称、简介；导入弹窗将用户填写的展示信息写入独立 `metadata.json`，保留指令 frontmatter。用户技能保存于 `private/agent-skills`，始终为 `source: 'local'`，不按名称继承官方文案、封面或身份；同名导入分配独立标识，`preset-` 前缀保留给官方。官方分类修改与删除由 `skillCatalogState.js` 拒绝，HTTP 返回 403；用户自定义仍可通过现有接口管理。过去自动复制且含 `presetId` 的副本不再进入目录，文件本身不删除；旧官方隐藏和分类记录不控制发布目录。前端技能标签及制作组合说明使用技能服务或会话选择的名称，不从执行配置推导文案。Agent 模块中的通用官方注册表仅接收显式注入的条目，不读取文件系统。

欢迎页 `AgentInspirationNavigator.tsx` 按“文字/图片/视频/音频来源 → 提供输入 → 选择任务”导航，输入复用现有编辑框、文档及媒体附件；文件选择器按来源限制类型，画布选择通过 `onLocateNode` 及现有选择引用机制提供上下文。来源、步骤和已整理任务只保存在组件内，切换画布随面板实例重置；输入仍由现有工作区草稿管理。无对应输入、上传未完成或助手运行中时不允许选任务。

任务名称明确区分图像描述、提示词提取、视频生成计划、要素/分镜、技能草稿和音频转写；选择任务只追加可编辑请求并将生成执行方式切为手动确认，不发送消息、不调用模型、不创建或运行工作流。用户显式发送后由现有 Agent 流程分析并预览结果，媒体能力不足时请求说明限制。`AgentMessageExport.tsx` 可编辑单条回复的导出草稿，再显式创建文本节点并复制编辑后文本；草稿不改写已归档的助手回复，创建后的节点沿用画布编辑和连接流程。媒体生成仍经既有授权卡确认。

空会话副标题显示“纳科画布智能体”，面板收起按钮沿用减号图标；输入框上方不显示左侧“技能”标题，保留右侧“选择技能”入口，编辑框保留“调用技能”。文本模型选择 AUTO 时，`useCanvasAgentPanelState.ts` 优先使用已配置且可用的默认文本模型；没有可用默认模型时，按可选列表顺序使用第一个已连接的文本模型，不写回默认设置或工作区模型选择。手动指定模型仍优先，发送给后端的是解析后的具体模型。`agentPanelActions.ts` 在无模型时拦截发送并弹出提示，区分模型读取中、读取失败和没有可用模型，保留输入与附件；用户可在设置中连接服务后重试。

`CanvasAgentLauncher` 在面板收起时显示，入口按钮为 72px、机器人图标为 36px，固定距窗口右侧 80px、底部 76px，尺寸及位置由 `agentWorkspace.css` 管理。

`dramaConversationShortcut.ts` 的技能选择区以输入框上方浮层展示紧凑单列列表，名称和简介各占一行；分类与搜索并排，底部“查看更多”打开现有技能管理面板。`AgentSkillPicker.ts` 复用技能封面及默认封面，在悬停或键盘聚焦时于列表侧边展示预览；空间不足时保留“详情”入口，滚动、收起、切换会话和面板卸载会清理预览。点击条目沿用技能选择动作，“详情”打开现有详情弹窗，只有点击条目或“使用技能”才选择技能，不自动发送对话或生成。

`canvasAgentPanel.tsx` 不挂载顶部 `renderAgentHarnessControls` 工具栏，因此不显示“对话分支”、分支选择、“压缩上下文”和“刷新运行状态”，也不占用工具栏空间；`renderAgentPanelConversation.tsx` 不显示回复下方的“从此处分支”按钮。聊天控制器中的相关能力仍保留。

发送校验 -> 会话锁和唯一 operationId -> pi 工具循环 -> 写会话/意图 -> 执行业务 -> 写回执 -> SSE 投影 -> run_end。断流读取快照，不重发消息；应用退出等待停止及持久化。
模型 stream 的 textDelta 是暂态显示，工具参数必须完整并校验后才进入 pi；截断或非法 JSON 明确拒绝，不自动重发。usage 和 stopReason 经公共结果映射，AbortSignal 覆盖凭据解析、提交及响应消费。

关闭面板只断前端观察；退出或切换项目停止相应 Agent 运行。Skill 导入、分类、封面、中文展示及删除由同一存储服务维护，脚本不执行。技能管理由 `skillManager.ts` 提供“官方预设”和“用户自定义”来源页签，默认官方，切换来源重置分类与搜索，导入成功转到用户自定义。卡片只展示封面、名称和简介，点击查看详情；卡片不提供分类输入、保存分类或删除控件，保留分类筛选、搜索和导入。详情显示来源，底部仅显示“使用技能”按钮，关闭通过右上角按钮、Escape 或点击遮罩完成。面板展示与时间线渲染分担职责，保留工具确认原位置和焦点恢复。
`renderAgentPanelConversation` 将连续的无正文、无附件且无分支入口的助手操作消息合并到默认折叠的操作记录组，摘要显示记录总数及执行中/需核对状态，展开后按原消息顺序查看。画布操作详情也默认折叠；`AgentTimelineCards` 将生成及授权等操作卡独立呈现于折叠记录外，不改动消息、回执或执行流程。
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
| [modules/agent/server/agent/drama/officialDramaBundle.js](../../modules/agent/server/agent/drama/officialDramaBundle.js) | 服务端领域实现 | `OFFICIAL_DRAMA_BUNDLE`, `officialProductionBundle`, `SKILL_INSTRUCTION_LIMITS` | 未检出平台调用；不等于纯函数证明 |
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
| [modules/agent/ui/agent/AgentInspirationNavigator.tsx](../../modules/agent/ui/agent/AgentInspirationNavigator.tsx) | 浏览器交互与状态辅助 | `AgentInspirationNavigator` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentMarkdown.tsx](../../modules/agent/ui/agent/AgentMarkdown.tsx) | 浏览器交互与状态辅助 | `AgentMarkdown` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentMessageExport.tsx](../../modules/agent/ui/agent/AgentMessageExport.tsx) | 浏览器交互与状态辅助 | `AgentMessageExport` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentModelMenu.tsx](../../modules/agent/ui/agent/AgentModelMenu.tsx) | 浏览器交互与状态辅助 | `AgentModelMenu` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentNodeRunCard.tsx](../../modules/agent/ui/agent/AgentNodeRunCard.tsx) | 界面呈现与交互 | `AgentNodeRunCard` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/AgentOptionPopover.tsx](../../modules/agent/ui/agent/AgentOptionPopover.tsx) | 浏览器交互与状态辅助 | `AgentOptionPopover` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/AgentProductRequests.tsx](../../modules/agent/ui/agent/AgentProductRequests.tsx) | 浏览器交互与状态辅助 | `AgentProductRequests` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentProjectRequests.tsx](../../modules/agent/ui/agent/AgentProjectRequests.tsx) | 浏览器交互与状态辅助 | `AgentProjectRequests` | 未检出平台调用；不等于纯函数证明 |
| [modules/agent/ui/agent/AgentSkillPicker.ts](../../modules/agent/ui/agent/AgentSkillPicker.ts) | 浏览器交互与状态辅助 | `createAgentSkillPicker` | 含 DOM/事件 调用；时机见实现 |
| [modules/agent/ui/agent/AgentTimelineActivity.tsx](../../modules/agent/ui/agent/AgentTimelineActivity.tsx) | 浏览器交互与状态辅助 | `AgentCardControllers`, `timelineActivities`, `AgentTimelineActivity`, `AgentTimelineCards`, `AgentUnlinkedActivity` | 未检出平台调用；不等于纯函数证明 |
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
| [modules/agent/ui/agent/dramaConversationShortcut.ts](../../modules/agent/ui/agent/dramaConversationShortcut.ts) | 浏览器交互与状态辅助 | `SELECT_AGENT_SKILL_EVENT`, `installDramaConversationShortcut` | 含 DOM/事件 调用；时机见实现 |
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
