# Agent Harness 运行与恢复

对话运行使用 `@earendil-works/pi-agent-core` 0.85.1。`@earendil-works/pi-ai` 同版本仅用于 Agent 内部流事件适配。模块职责和文件目录见 [Agent](agent.md)，规则以根 [AGENTS.md](../../AGENTS.md) 为准。

## 职责与边界

| 位置 | 职责 |
| --- | --- |
| `modules/agent/server/harness/runtime.js` | pi Agent 循环、顺序工具执行、运行停止、自动/手动压缩、分支 |
| `modules/agent/server/harness/modelAdapter.js` | 将现有模型目录、流式传输及凭据服务适配成 pi StreamFn；不使用 pi 的环境变量密钥发现与重试 |
| `modules/agent/server/harness/session.js` | 会话树、上下文重建、前端快照与 Drama 业务视图 |
| `modules/agent/server/harness/tools.js` | 五类受控工具、业务工具的执行意图与回执日志 |
| `modules/agent/server/harness/operationBridge.js` | 绑定项目、会话和有效期的操作交付及回执校验 |
| `modules/contracts/agentProtocol.*`、`agentSession.*` | 稳定 JSON 协议、会话封套和插件 Manifest；不引用 pi 或业务实现 |
| `modules/kernel` | 插件宿主、声明式依赖和服务可见性；新增 `services.optional`，不包含 Agent 业务 |
| `plugins/storage/agent-files` | 会话、计划、预算、技能、提示词预设等本地存储适配器 |
| `plugins/media/filesystem` | 项目附件读取、图片格式与路径校验、媒体持久化 |
| `plugins/platform/text-transport` | 现有文本传输和按来源授权的凭据读取 |

pi 的消息、工具定义和类型只在 `modules/agent` 内部使用，不成为 kernel、contracts 或其他业务模块的依赖。架构检查禁止其他模块导入 pi，也禁止 Agent 直接导入文件系统。

提示词助手与分镜文本规划通过同一 pi 模型适配器完成单次业务任务。分镜图像调用 `generation.runtime.generateImage`，与画布 HTTP 入口复用生成调度、Provider 解析、任务记录和媒体保存。提示词预设读写已移至存储适配器；Agent 不再持有文件读写实现。

## 会话存储 v2

目录：当前本地用户私有目录下的 `agent-harness-v2/`。文件名是会话 ID 的 SHA-256，不接受客户端文件路径。

```text
version: 2
id, projectId, revision, createdAt, updatedAt
entries: [{id, parentId, timestamp, kind, ...internalPayload}]
branches: {branchId: {id, tipId, fromBranch?, createdAt}}
activeBranch
runs: {operationId: {id, branchId, kind?, status, startedAt, endedAt?, code?}}
lastRunId
receipts: {operationHash: {runId, toolCallId, tool, action?, state, result?}}
metadata: {topic, selectedSkill, skillProjectId, workflow?, workflowVariants?, messageCount}
```

`entries` 保存内部消息或压缩检查点；前端只接收投影后的 `transcript`，不接收 pi 消息、推理内容或凭据。存储适配器校验版本和树结构，按会话串行写入，使用期望版本进行 CAS 校验，先写临时文件并同步，再重命名。删除会话移入该目录的 `trash/`。

旧 `canvasAgentRunner.js`、旧会话存储实现、旧文本运行器及专用 Drama 流解析器已删除。旧 `/api/chat` 不再挂载。旧会话文件不再读取、写入或自动转换，已有用户文件保留在原目录；新历史列表仅展示 v2 会话。旧画布项目、素材、计划与预算记录不因此删除。

## HTTP 与事件协议

基本前缀为 `/api/agent/v2`。

| 方法与路径 | 行为 |
| --- | --- |
| `POST /runs` | 新运行；需 `protocol:2`、唯一 `operationId`、`sessionId`、`projectId`、模型和消息 |
| `GET /sessions?projectId=...` | 项目内历史摘要 |
| `GET /sessions/:id` | 当前分支消息、版本、分支、运行状态与回执快照 |
| `DELETE /sessions/:id` | 空闲时归档会话 |
| `POST /sessions/:id/stop` | 停止该会话的对话或压缩；已完成操作不会撤销 |
| `POST /sessions/:id/branches` | 用 `expectedRevision`、`projectId` 校验；`entryId` 创建分支，已有 `branchId` 切换分支 |
| `POST /sessions/:id/compact` | 用当前模型生成摘要；请求带唯一操作 ID 和期望版本 |
| `POST /sessions/:id/skill` | 显式选择或取消技能，检查项目与技能版本 |
| `GET/POST /sessions/:id/drama/...` | 查询业务计划、附加剧本与显式审批/执行操作 |
| `POST /operations/:requestId/receipt` | 提交当前项目、当前会话的操作回执 |

SSE 统一使用 `event: agent`，数据格式：

```json
{"protocol":2,"sessionId":"session-id","runId":"operation-id","sequence":1,"type":"run_start","payload":{"branchId":"main"}}
```

事件包括运行、轮次、消息、工具开始/更新/结束，授权需求、压缩状态，以及操作交付/回执。前端严格验证协议版本、会话、运行 ID 和连续序号。正常或失败运行均以 `run_end` 结束；进入运行前的流式拒绝使用 `request_error`，响应头发出前的校验错误使用 HTTP JSON 错误。

`tool_start` 包含本次工具的 `action`，前端把活动关联到当前助手消息。快照中的每条消息可携带 `tools: AgentActivity[]`，只提供工具标识、操作名称、状态及卡片引用；类型定义在 `modules/contracts/agentActivity.d.ts`。后端按 `runId + toolCallId` 从会话树和回执恢复关联，`knownCards` 标记所有分支中的已有引用。生成与授权卡片按消息顺序穿插显示，完成状态原位更新；其他分支卡片不会落入当前分支，因流中断暂未关联消息的操作回执保留在独立折叠入口。

断线后读取会话快照核对状态，不重新提交原消息。重复运行 ID 被拒绝。进程重启遗留的 `running` 标记为 `interrupted`。未配对的工具调用按日志补成已确认回执或 `UNCONFIRMED` 上下文，不重新执行。

### 面板、项目与运行生命周期

- 关闭对话面板只取消前端 SSE/轮询，不取消后端 `harness.run`。后端按原会话写入消息、工具回执和最终状态，与 HTTP 连接是否存在无关。
- 重新打开面板自动读取已选会话；若仍为 `running`，每 800ms 顺序同步持久化快照，恢复运行中状态和停止按钮，完成后停止轮询。不会重新发送用户消息，也不会重新调用模型。同步失败显示连接错误并重试，关闭面板取消重试。
- 退出或切换项目时，前端调用 `POST /api/agent/v2/projects/:projectId/stop`（keepalive），取消该项目的运行和手动压缩；页面退出也发出停止请求。关闭应用时插件 disposer 取消全部运行并等待状态持久化，再关闭存储。此处“停止”针对 Agent 运行，不代表能够撤回已经提交到第三方的生成任务。
- 面板关闭期间需要浏览器执行的工具保留原请求及原有效期。重新打开通过 `POST /api/agent/v2/sessions/:id/operations/claim` 只领取尚未投递的请求，使用原授权、版本检查和回执接口执行；已投递但未确认的请求绝不重放，超时保留 `UNCONFIRMED`。关闭面板不会替用户批准预算或付费生成。
- 运行所有权由 `server/harness/runLifetime.js` 管理；前端快照同步位于 `ui/agent/agentRunSync.ts`，待投递工具领取位于 `agentPendingOperations.ts`。pi 实现仍限制在 Agent 内部，持久化仍经会话存储适配器。

## 受控工具与授权

| 工具 | 能力与执行接口 |
| --- | --- |
| `canvas_control` | 读取/编辑/撤销/定位、模型查询，经现有画布控制器执行 |
| `project_control` | 项目查询和项目操作，经项目服务与操作确认卡执行 |
| `generation_control` | 计划准备、任务查询/取消、预算申请/撤销、凭授权运行，经现有生成与预算接口执行 |
| `media_control` | 项目素材查询/导入、查看、分析与媒体编辑，经媒体服务执行 |
| `workflow_control` | 工作流查询、配置和产品操作，经工作流服务执行 |
| `drama_plan` | 校验并保存完整制作草稿；不批准预算或启动生成 |

所有参数先经过 Schema 和现有操作协议校验。工具不能调用任意文件、任意 URL 或任意 Provider。画布变更沿用 revision，生成仍需计划 ID 和授权 ID；准备操作只产生确认卡。技能文字、剧本或模型回复不能代替用户授权。

模型工具 Schema 仅保留所属工具的字段，编辑操作同时展示公共字段和每种操作的精确约束。`tools.js` 使用 pi 的 `prepareArguments` 在 Schema 校验前检查操作协议，失败时返回 `canvasApiTool.js` 定义的静态字段纠错提示，不交付操作。参考图通过 `connect(sourceId,targetId)` 连接，可在同批次使用新节点 ref；已有画布生成节点使用 `generation_control.prepareGeneration(revision,nodeIds)`，`runNode` 仅按类型和实际输入运行独立实例。本轮累计 6 次工具失败后，`runtime.js` 在轮次结束时停止继续调用模型，记录 `AGENT_TOOL_FAILURE_LIMIT`，保留已完成操作与回执；成功读取或修改不会清空失败计数。

工具执行前先持久化意图，再交付操作；变更按规范化命令指纹去重。已确认命令返回原回执，待确认/未知命令拒绝重放。若磁盘提交失败则不交付操作；若操作完成后回执写入失败，后续按未确认处理。没有跨文件系统、浏览器和模型供应商的分布式事务，因此未知状态需要先核对原任务；实现不承诺远端的 exactly-once。

## Skill 与 Drama

官方预设由存储插件直接读取安装应用的 `builtin`，普通技能在 `builtin/presets`，受控制作技能由官方注册表提供；不再初始化用户副本。官方更新、新增和删除随应用升级生效，分类修改及删除接口拒绝用户更改官方技能。用户导入保存在私有目录并独立管理，见 [官方预设与用户自定义技能](../用户级Skill预设说明.md)。

Skill 管理页、首页与对话选择器共用目录和中文展示元数据，首页只展示官方预设，用户自定义保留在管理页和对话选择器。支持导入 SKILL.md/文件夹，用户自定义技能保留分类修改和删除接口；主题封面分别从用户包或当前官方目录读取，见 [封面来源](../Skill封面说明.md)。普通导入无法获得受信任业务流程权限；Router 不直接操作文件系统。

用户自定义的分类覆盖记录保存在私有技能目录的 `catalog.json`，删除接口移除对应用户目录；旧官方移除记录不再控制官方列表。发布删除官方技能或用户删除自定义技能后，列表和后续指令加载均不再包含该技能，已有对话保留；当前运行使用已加载上下文继续完成，空闲前端会取消失效选择，且后台取消不主动聚焦输入框。分类更新、删除接口为 `PATCH/DELETE /api/agent-skills/:slug`，对官方条目返回 403。管理卡片不显示分类编辑或删除控件，用户详情在“使用技能”左侧提供“编辑技能”，可修改元数据、封面及文件并确认删除；官方详情保留“使用技能”。编辑读取和保存使用 `GET /api/agent-skills/:slug/edit` 与 `PUT /api/agent-skills/:slug`，时间戳冲突返回 409，具体校验与存储流程见 [Agent](agent.md)。窗口关闭时释放模态焦点约束。

Skill 是 Harness 的提示上下文，显式选择后固定来源、项目与版本；默认新会话不隐式启用 Drama。Drama 的剧本和计划状态作为数据上下文，草稿写入作为受控业务工具，审批与付费执行仍沿用现有业务服务、计划 revision 和确认规则。独立规划接口也使用 pi 适配器，不保留另一套对话运行循环。

Codex Agent、CLI/MCP 配对、外部连接服务及其会话协议已删除。前端只使用 Harness 的会话与运行事件；模型来源统一通过现有凭据和文本传输服务接入。不提供旧连接或会话的兼容入口，也不自动转换旧会话文件。

## 前端与上下文

消息使用服务端 entry ID，按新消息事件分别更新；工具进度独立显示，原有预算/生成/项目确认卡继续负责授权。对话结束读取持久化快照，提供运行状态刷新、从完整回复处分支、分支切换和压缩按钮。

分支只改变对话上下文，不回滚画布、预算或已生成素材；操作账本及业务计划保留在会话级。压缩保留最近两个完整用户轮次与工具结果配对，原消息仍保留供展示和分支。摘要调用不带工具，输出上限 4096 Token；失败保留旧上下文。自动压缩使用约 70% 上下文阈值；模型目录未给出窗口时采用保守的 65536 Token。手动压缩同样登记运行 ID，可停止，不自动重试。

## 验证

执行 `npm.cmd run check`：架构、本地边界、TypeScript、单元/集成、画布与启动器构建、完整后端和禁用 Agent 两种后端冒烟。

新增测试覆盖 pi 工具循环、凭据来源、残缺 SSE、版本冲突、执行前持久化、操作去重、中断配对修复、分支/压缩、停止、HTTP 锁竞争、前端序号拒绝、多轮消息、授权参数、已删除连接路由不可访问、提示词持久化和共享图像生成服务。测试使用模拟模型响应与隔离存储，不产生真实付费模型调用。

## 2026-09-18 后端子插件边界

核心入口 `serverPlugin.js` 保留 Harness、会话、Skill 和通用解析器；`dramaServerPlugin.js` 管理规划/执行服务及 Drama 路由；`storyboardServerPlugin.js` 管理分镜路由及模型服务适配。三个入口各有 manifest，并列登记在 application-plugins.json。

核心通过声明的 `agent.drama` 服务创建会话业务接口，服务协议位于 contracts/agentDrama.d.ts。Drama 的上下文准备、drama_plan schema 与草稿工具执行代码归入子插件内部，不在通用对话 Router 展开；pi 的运行循环仍只有一套。核心对 Drama 是显式依赖，Storyboard 不依赖核心入口；三者声明 reloadRequired，不承诺运行期间无损热卸载。

Drama 规划路由自带 JSON 解析器；phase 10/order 20 早于通用解析器 order 30 不会丢失请求体。HTTP 回归已验证此顺序，以及非法 JSON 400、超过 32 MB 的 JSON 413 和路由撤销后 404。Skill 导入的独立解析器顺序保持不变。
