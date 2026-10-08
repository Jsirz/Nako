# Contracts

## 职责与边界

公共协议层不依赖业务、Node 内置模块或第三方包。入口为 [index.js](../../modules/contracts/index.js) 和 [index.d.ts](../../modules/contracts/index.d.ts)。浏览器、后端、插件均消费同一份协议；pi 和 React 类型不得进入此层。

## 接口契约

| 定义 | 参数、返回与实现 |
| --- | --- |
| `PluginManifest`、`PluginDefinition`、`NakoPlugin`、`PluginContext` | `index.d.ts`；声明由 kernel/definePlugin 装配为具有 id/version/type/activate/deactivate 的完整插件，manifest 保留权限和依赖；context 服务及凭据受授权限制 |
| `ProjectRepository` | `get(id)`、`list()`、`save(Project)`、`delete(id)`；返回项目或 `{id, revision}`；SQLite 插件适配实现 |
| `MediaStore`、`MediaProcessor`、`ProjectMediaStore` | 存储与处理分离；save/read/remove、crop/trimVideo/compose/thumbnail，以及项目内联媒体转 URL；filesystem 与 ffmpeg-sharp 分别实现 |
| `GenerationProvider`、`GenerationHandler` | 实际为 descriptor + handler；按 kinds 发布 generate 方法，异步恢复必须成对声明 canRecover/recover |
| `WorkflowExecutor` | execute/resume 接收运行或恢复请求；取消经 AbortSignal；有限客户端方法在 [pluginValidation.js](../../modules/contracts/pluginValidation.js) 校验 |
| `LocalRuntimeUiService` | [localRuntimeUi.ts](../../modules/contracts/localRuntimeUi.ts)；工作流客户端、设置挂载、节点渲染及执行请求，由浏览器插件注册 |
| `Logger`、`ErrorCode`、`PluginError` | 错误包含 code/message/context，可带 status/cause；Logger 接收 message + context，由 kernel 输出 |
| `MediaDeliveryStore`、`ExternalMediaFetch` | [mediaDelivery.d.ts](../../modules/contracts/mediaDelivery.d.ts)；open 接收 library URL 或 thumbnail 标识，返回元数据、只读字节流和 close；外部请求返回受安全策略约束的响应，由适配器有界消费 |
| `LocalRuntimeService`、`GenerationService` | [localRuntimeService.d.ts](../../modules/contracts/localRuntimeService.d.ts) 只查询本地来源可用性；[generationService.d.ts](../../modules/contracts/generationService.d.ts) 定义协调方法视图、只读任务记录及生成/节点观察能力 |
| `AgentTextGenerationService` | [agentTextGeneration.d.ts](../../modules/contracts/agentTextGeneration.d.ts)；resolveModel 返回无密钥模型元数据，generate 接收中立消息/工具/参数，返回完整 content/usage；provisional textDelta 不触发部分工具执行 |
| `IdentityHttpSecurity` | [httpSecurity.d.ts](../../modules/contracts/httpSecurity.d.ts)；身份模块发布代理 Router、公共/私有库 Guard 和认证下载作用域；媒体通过服务注入调用，不依赖身份内部对象 |
| `CanvasProjectUiService`、`ProjectMediaRecoveryService` | [projectWorkflow.ts](../../modules/contracts/projectWorkflow.ts)；画布发布图重映射、分组清理及提示/模态能力，媒体发布中断节点恢复；React hooks 和组件类型留在业务 UI |

错误基础定义在 [errors.js](../../modules/contracts/errors.js)，根入口转出保持同一类身份；协议校验直接依赖叶子模块避免初始化环。领域错误定义在 contracts/identityErrors、desktopErrors、providerErrors 等，均携带模块与操作上下文。尚未集中或收敛的具体项见 [规范差异](conformance.md)。

## 数据模型

作品展示归档来源在 [showcaseArchive.js](../../modules/contracts/showcaseArchive.js) 校验，支持本地 `/share/*.nako` 和 HTTPS 对象地址；[showcaseArchive.d.ts](../../modules/contracts/showcaseArchive.d.ts) 定义 `{ archive: string }` 请求。后端还须核对应用案例目录，不能将协议校验视为任意 URL 授权。`ProjectFileStore` 新增 `downloadArchive(url,path,limit)` 和 `move(source,target)`，临时目录可指定父目录；存储适配器负责流式字节限额、超时、写入和原子改名。下载错误及未列出的地址分别使用 projectErrors 中的 `SHOWCASE_DOWNLOAD_FAILED`、`SHOWCASE_ARCHIVE_NOT_LISTED`。

`Project` 包含 id/title/revision/nodes 和扩展文档字段；`MediaAsset` 标识项目归属、媒体类型和 URL。模型目录字段以 [modelCatalog.d.ts](../../modules/contracts/modelCatalog.d.ts) 为准。Node SDK、端口值、节点迁移、执行状态分别定义在 `nodeSdk.*`、`nodeValues.*`、`nodeMigrations.*`、`nodeExecution.*`。
公共画布节点、分组及坐标定义在 canvasDocument.ts/projectUi.ts；生成 UI 模型、绑定、授权和运行能力定义在 generationUi.ts。生成恢复 reacquireObservation 使用 absoluteTimeoutMs，adopt 使用 absoluteDeadlineMs，含义和返回字段以实现为准。

Agent 的 JSON 事件、会话树与归档由 `agentProtocol.*`、`agentSession.*`、`agentArchive.*` 定义。工作流编辑、客户端、画布投影分别归属 `workflowEditor.ts`、`workflowClient.ts`、`workflowCanvas*.ts`。此层不创建数据库、文件或 HTTP 路由。

## 功能结构

输入先经所属协议校验，再进入服务实现。插件注册时校验 manifest 与 Provider descriptor；Node SDK 校验端口、schema、能力与包归属。统一 PluginError 提供冻结的上下文，并保持 Error 继承关系；cause 不直接进入 HTTP 或日志。
Node SDK 校验使用 NODE_PACKAGE_ERROR/PluginError 并提供协议、操作和输入路径；nodeExecution 的 nodeError 保留 code/details，补充 status/context。领域错误叶子模块直接引用 errors.js，根 JS 与声明出口同步，避免新错误子类依赖聚合初始化。

AGENTS.md 的接口示意与当前 manifest、descriptor/handler、AbortSignal 取消形状存在差异，具体处理状态见 [规范差异](conformance.md)，实际调用必须以源码为准。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/contracts/agentActivity.d.ts](../../modules/contracts/agentActivity.d.ts) | 类型或数据定义 | `AgentCardReference`, `AgentActivity`, `agentActivity` | 无业务运行副作用 |
| [modules/contracts/agentActivity.js](../../modules/contracts/agentActivity.js) | 模块内部辅助 | `agentActivity` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/agentArchive.d.ts](../../modules/contracts/agentArchive.d.ts) | 类型或数据定义 | `AgentHistoryEntry`, `AgentHistoryArchive`, `AgentArchiveService`, `AGENT_ARCHIVE_FORMAT`, `agentArchiveError`, `validateAgentArchive` | 无业务运行副作用 |
| [modules/contracts/agentArchive.js](../../modules/contracts/agentArchive.js) | 模块内部辅助 | `AGENT_ARCHIVE_FORMAT`, `agentArchiveError`, `validateAgentArchive` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/agentDrama.d.ts](../../modules/contracts/agentDrama.d.ts) | 类型或数据定义 | `DramaSession`, `DramaSessionAccess`, `DramaSnapshot`, `DramaTurnInput`, `DramaBusinessTool`, `DramaConversation`, `AgentDramaService` | 无业务运行副作用 |
| [modules/contracts/agentErrors.d.ts](../../modules/contracts/agentErrors.d.ts) | 类型或数据定义 | `AGENT_ERROR_CODES`, `AgentOperationError` | 无业务运行副作用 |
| [modules/contracts/agentErrors.js](../../modules/contracts/agentErrors.js) | 模块内部辅助 | `AGENT_ERROR_CODES`, `AgentOperationError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/agentProtocol.d.ts](../../modules/contracts/agentProtocol.d.ts) | 类型或数据定义 | `AGENT_PROTOCOL_VERSION`, `AgentEventType`, `AgentEvent`, `AGENT_EVENT_TYPES`, `isAgentEvent`, `agentEvent`, `AgentOperation`, `AgentRunStatus`, `AgentMediaReference`, `AgentProjectStopResult`, `AgentPendingOperations`, `AgentRunRequest`, `AgentBranchRequest`, `AgentSessionSnapshot`, `AgentSessionRepository` | 无业务运行副作用 |
| [modules/contracts/agentProtocol.js](../../modules/contracts/agentProtocol.js) | 协议、校验或数据规则 | `AGENT_PROTOCOL_VERSION`, `AGENT_EVENT_TYPES`, `agentEvent`, `isAgentEvent` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/agentSession.d.ts](../../modules/contracts/agentSession.d.ts) | 类型或数据定义 | `AGENT_SESSION_VERSION`, `isAgentSession` | 无业务运行副作用 |
| [modules/contracts/agentSession.js](../../modules/contracts/agentSession.js) | 模块内部辅助 | `AGENT_SESSION_VERSION`, `isAgentSession` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/agentSkillError.d.ts](../../modules/contracts/agentSkillError.d.ts) | 类型或数据定义 | `AgentSkillError` | 无业务运行副作用 |
| [modules/contracts/agentSkillError.js](../../modules/contracts/agentSkillError.js) | 模块内部辅助 | `AgentSkillError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/agentTextGeneration.d.ts](../../modules/contracts/agentTextGeneration.d.ts) | 类型或数据定义 | `AGENT_TEXT_GENERATION_SERVICE`, `AgentTextGenerationError`, `AgentTextModelReference`, `AgentTextModel`, `AgentTextContent`, `AgentTextMessage`, `AgentTextParameters`, `AgentTextGenerationRequest`, `AgentTextGenerationResult`, `AgentTextGenerationService` | 无业务运行副作用 |
| [modules/contracts/agentTextGeneration.js](../../modules/contracts/agentTextGeneration.js) | 模块内部辅助 | `AGENT_TEXT_GENERATION_SERVICE`, `AgentTextGenerationError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/browserCapabilities.ts](../../modules/contracts/browserCapabilities.ts) | 模块内部辅助 | `GenerationAvailability`, `GenerationUiService`, `ProjectPreferencesService`, `AccountUiService`, `MediaSettingsService`, `PromptCompositionService`, `ImageAngle` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/canvasBudgetProtocol.js](../../modules/contracts/canvasBudgetProtocol.js) | 协议、校验或数据规则 | `validBudgetControl`, `projectBudgetResult`, `budgetControlSchema` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/canvasControlProtocol.d.ts](../../modules/contracts/canvasControlProtocol.d.ts) | 类型或数据定义 | `CanvasActionLog`, `CanvasEdit`, `ProjectCommand`, `CanvasControl`, `CanvasResult`, `CanvasActionRequest`, `CanvasActionHandler`, `validCanvasControl`, `projectCanvasResult`, `canvasControlTool` | 无业务运行副作用 |
| [modules/contracts/canvasControlProtocol.js](../../modules/contracts/canvasControlProtocol.js) | 协议、校验或数据规则 | `validCanvasControl`, `projectCanvasResult`, `canvasControlTool` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/canvasDocument.ts](../../modules/contracts/canvasDocument.ts) | 模块内部辅助 | `CanvasConnectionNode`, `CanvasNode`, `CanvasGroup` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/canvasErrors.d.ts](../../modules/contracts/canvasErrors.d.ts) | 类型或数据定义 | `canvasError` | 无业务运行副作用 |
| [modules/contracts/canvasErrors.js](../../modules/contracts/canvasErrors.js) | 模块内部辅助 | `canvasError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/canvasMediaProtocol.js](../../modules/contracts/canvasMediaProtocol.js) | 协议、校验或数据规则 | `validMediaControl`, `projectMediaResult`, `mediaControlSchema` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/canvasProjectProtocol.js](../../modules/contracts/canvasProjectProtocol.js) | 协议、校验或数据规则 | `validProjectControl`, `projectProjectResult`, `projectControlSchema` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/canvasTaskProtocol.js](../../modules/contracts/canvasTaskProtocol.js) | 协议、校验或数据规则 | `validTaskControl`, `projectTaskResult` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/canvasWorkflowProtocol.js](../../modules/contracts/canvasWorkflowProtocol.js) | 协议、校验或数据规则 | `workflowParameterSchema`, `validWorkflowControl`, `projectWorkflowResult` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/chatStream.js](../../modules/contracts/chatStream.js) | 模块内部辅助 | `chatPayloads` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/comfyServerAddress.d.ts](../../modules/contracts/comfyServerAddress.d.ts) | 类型或数据定义 | `NON_LOCAL_COMFY_SERVER`, `normalizeLocalComfyServer` | 无业务运行副作用 |
| [modules/contracts/comfyServerAddress.js](../../modules/contracts/comfyServerAddress.js) | 模块内部辅助 | `NON_LOCAL_COMFY_SERVER`, `normalizeLocalComfyServer` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/controllerGuardErrors.cjs](../../modules/contracts/controllerGuardErrors.cjs) | 模块内部辅助 | 内部实现 | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/defaultModels.d.ts](../../modules/contracts/defaultModels.d.ts) | 类型或数据定义 | `ModelKind`, `DefaultModelValues`, `declaredModel`, `DefaultModelsSnapshot`, `DefaultModelsService`, `DefaultModelsClient`, `PreferenceRepository` | 无业务运行副作用 |
| [modules/contracts/defaultModels.js](../../modules/contracts/defaultModels.js) | 模块内部辅助 | `declaredModel` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/desktopErrors.d.ts](../../modules/contracts/desktopErrors.d.ts) | 类型或数据定义 | `DESKTOP_ERRORS`, `DesktopErrorCode`, `DesktopError`, `desktopError`, `desktopFailure`, `desktopNodeError`, `DesktopShutdownError` | 无业务运行副作用 |
| [modules/contracts/desktopErrors.js](../../modules/contracts/desktopErrors.js) | 模块内部辅助 | `DESKTOP_ERRORS`, `desktopError`, `desktopFailure`, `desktopNodeError`, `DesktopShutdownError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/desktopUpdates.ts](../../modules/contracts/desktopUpdates.ts) | 模块内部辅助 | `DesktopUpdatePhase`, `DesktopUpdateState`, `DesktopUpdateBridge`, `PREPARE_DESKTOP_RESTART`, `PrepareDesktopRestart` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/directoryGrantError.js](../../modules/contracts/directoryGrantError.js) | 模块内部辅助 | `DirectoryGrantError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/dramaExecutionError.js](../../modules/contracts/dramaExecutionError.js) | 运行、调度或服务 | `DramaExecutionError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/errors.d.ts](../../modules/contracts/errors.d.ts) | 类型或数据定义 | `ERRORS`, `ErrorCode`, `ErrorOptions`, `PluginError`, `protocolError` | 无业务运行副作用 |
| [modules/contracts/errors.js](../../modules/contracts/errors.js) | 模块内部辅助 | `ERRORS`, `PluginError`, `protocolError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/generationAdmission.d.ts](../../modules/contracts/generationAdmission.d.ts) | 类型或数据定义 | `GENERATION_ADMISSION_CODES`, `GenerationAdmissionCode`, `GenerationAdmissionHistory`, `DuplicateGenerationAdmission` | 无业务运行副作用 |
| [modules/contracts/generationAdmission.js](../../modules/contracts/generationAdmission.js) | 模块内部辅助 | `GENERATION_ADMISSION_CODES` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/generationErrors.d.ts](../../modules/contracts/generationErrors.d.ts) | 类型或数据定义 | `GENERATION_ERROR_CODES` | 无业务运行副作用 |
| [modules/contracts/generationErrors.js](../../modules/contracts/generationErrors.js) | 模块内部辅助 | `GENERATION_ERROR_CODES` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/generationScheduler.ts](../../modules/contracts/generationScheduler.ts) | 运行、调度或服务 | `GenerationTaskStatus`, `GenerationTaskState`, `GenerationTaskEvent`, `GenerationPromptNode`, `GenerationSchedulerAdapter` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/generationService.d.ts](../../modules/contracts/generationService.d.ts) | 类型或数据定义 | `GenerationTaskRecord`, `GenerationAdmissionRequest`, `GenerationLeaseResult`, `GenerationTaskRecords`, `GenerationTaskCoordination`, `GenerationService`, `GENERATION_COORDINATION_METHODS` | 无业务运行副作用 |
| [modules/contracts/generationService.js](../../modules/contracts/generationService.js) | 运行、调度或服务 | `GENERATION_COORDINATION_METHODS` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/generationUi.ts](../../modules/contracts/generationUi.ts) | 模块内部辅助 | `VideoMediaInput`, `VideoModeDefinition`, `GenerationModel`, `GenerationModels`, `GenerationBinding`, `GenerationAuthorization`, `GenerationMediaMetadata`, `GenerationRuntime` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/httpSecurity.d.ts](../../modules/contracts/httpSecurity.d.ts) | 类型或数据定义 | `HttpMiddleware`, `IdentityHttpSecurity` | 无业务运行副作用 |
| [modules/contracts/identityErrors.d.ts](../../modules/contracts/identityErrors.d.ts) | 类型或数据定义 | `IDENTITY_ERRORS`, `IdentityErrorCode`, `IdentityError`, `identityError`, `identityFailure`, `avatarCancelled` | 无业务运行副作用 |
| [modules/contracts/identityErrors.js](../../modules/contracts/identityErrors.js) | 模块内部辅助 | `IDENTITY_ERRORS`, `IdentityError`, `identityError`, `identityFailure`, `avatarCancelled` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/index.d.ts](../../modules/contracts/index.d.ts) | 类型或数据定义 | `PluginType`, `PluginManifest`, `ServiceRegistry`, `Logger`, `ProviderCredentialManager`, `PluginContext`, `PluginDefinition`, `NakoPlugin`, `MediaAsset`, `MediaInput`, `MediaStore`, `MediaOperationInput`, `MediaOperationResult`, `MediaLibraryOperation`, `MediaLibraryOperations`, `MediaDownloadScope`, `MediaDownloadOperation`, `MediaDownloadOperations`, `CropInput`, `TrimInput`, `MediaProcessor`, `ProjectMediaStore`, `Project`, `SaveResult`, `ProjectRepository`, `GenerationKind`, `GenerationRequest`, `GenerationResult`, `ModelCapability`, `ProviderContext`, `ProviderDescriptor`, `RecoveryReceipt`, `RecoveryPredicate`, `RecoveryHandler`, `GenerationHandler`, `GenerationProvider`, `GenerationTaskStore`, `WorkflowDefinition`, `WorkflowRunRequest`, `WorkflowRunResult`, `WorkflowResumeRequest`, `WorkflowInputCleanup`, `WorkflowExecutor`, `WorkflowClientMethod`, `WorkflowClient`, `WorkflowExecutors`, `GENERATION_KINDS`, `WORKFLOW_CLIENT_METHODS`, `WORKFLOW_EXECUTOR_METHODS`, `validatePluginManifest`, `validateProviderDescriptor`, `PLUGIN_API_VERSION`, `重导出 ./agentProtocol.js`, `重导出 ./agentSession.js`, `重导出 ./agentDrama`, `重导出 ./browserCapabilities`, `重导出 ./nodeSdk.js`, `重导出 ./canvasDocument`, `重导出 ./generationScheduler`, `重导出 ./mediaDelivery.js`, `重导出 ./localRuntimeService`, `重导出 ./generationAdmission.js`, `重导出 ./agentTextGeneration.js`, `重导出 ./generationService.js`, `重导出 ./generationUi`, `重导出 ./httpSecurity`, `重导出 ./projectUi`, `重导出 ./projectWorkflow`, `重导出 ./projectRepositoryExtensions`, `PLUGIN_TYPES`, `SERVICES`, `ERRORS`, `PluginError`, `ErrorCode`, `ErrorOptions`, `重导出 ./identityErrors.js`, `重导出 ./desktopErrors.js`, `重导出 ./providerErrors.js`, `重导出 ./generationErrors.js`, `重导出 ./localRuntimeErrors.js`, `重导出 ./agentErrors.js`, `重导出 ./canvasErrors.js`, `重导出 ./projectErrors.js`, `重导出 ./storageErrors.js` | 无业务运行副作用 |
| [modules/contracts/index.js](../../modules/contracts/index.js) | 模块入口或装配 | `PLUGIN_API_VERSION`, `PLUGIN_TYPES`, `SERVICES`, `ERRORS`, `PluginError`, `重导出 ./agentProtocol.js`, `重导出 ./agentSession.js`, `重导出 ./pluginValidation.js`, `重导出 ./nodeSdk.js`, `重导出 ./generationAdmission.js`, `重导出 ./agentTextGeneration.js`, `重导出 ./generationService.js`, `重导出 ./mediaDelivery.js`, `重导出 ./identityErrors.js`, `重导出 ./desktopErrors.js`, `重导出 ./providerErrors.js`, `重导出 ./generationErrors.js`, `重导出 ./localRuntimeErrors.js`, `重导出 ./agentErrors.js`, `重导出 ./canvasErrors.js`, `重导出 ./projectErrors.js`, `重导出 ./storageErrors.js` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/localRuntimeErrors.d.ts](../../modules/contracts/localRuntimeErrors.d.ts) | 类型或数据定义 | `LOCAL_RUNTIME_ERRORS`, `workflowRuntimeError`, `localRuntimeError` | 无业务运行副作用 |
| [modules/contracts/localRuntimeErrors.js](../../modules/contracts/localRuntimeErrors.js) | 运行、调度或服务 | `LOCAL_RUNTIME_ERRORS`, `workflowRuntimeError`, `localRuntimeError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/localRuntimeService.d.ts](../../modules/contracts/localRuntimeService.d.ts) | 类型或数据定义 | `LocalProviderConfiguration`, `LocalRuntimeService` | 无业务运行副作用 |
| [modules/contracts/localRuntimeUi.ts](../../modules/contracts/localRuntimeUi.ts) | 运行、调度或服务 | `LocalRuntimeUiService` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/mediaDelivery.d.ts](../../modules/contracts/mediaDelivery.d.ts) | 类型或数据定义 | `MediaDeliveryReference`, `MediaByteRange`, `MediaDelivery`, `MediaDeliveryStore`, `ExternalMediaFetch`, `mediaError`, `MediaArtifactError`, `MediaProbeError` | 无业务运行副作用 |
| [modules/contracts/mediaDelivery.js](../../modules/contracts/mediaDelivery.js) | 模块内部辅助 | `mediaError`, `MediaArtifactError`, `MediaProbeError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/modelCatalog.d.ts](../../modules/contracts/modelCatalog.d.ts) | 类型或数据定义 | `CatalogParameter`, `CatalogMode`, `CatalogModel` | 无业务运行副作用 |
| [modules/contracts/nodeExecution.d.ts](../../modules/contracts/nodeExecution.d.ts) | 类型或数据定义 | `NODE_CAPABILITIES`, `NODE_ERROR`, `nodeError`, `jsonClone`, `isNodeRecord`, `validateNodeSchema`, `validateNodeValue`, `validatePortValue`, `NodeRunRequest`, `NodeRunReceipt`, `NodeBusinessContext`, `NodeGenerationClient`, `NodeGenerationObservation`, `NodeRunRuntime`, `NodeRunStore`, `NodeCapabilityContext`, `NodeCapabilityHandlers`, `NodeRunRecoveryRequest`, `NodeRunRecoveryResult`, `NodeRunRecovery`, `NodeModelObservation`, `NodeModelObserver` | 无业务运行副作用 |
| [modules/contracts/nodeExecution.js](../../modules/contracts/nodeExecution.js) | 运行、调度或服务 | `NODE_CAPABILITIES`, `NODE_ERROR`, `nodeError`, `jsonClone`, `isNodeRecord`, `validateNodeSchema`, `validateNodeValue`, `validatePortValue` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/nodeMigrations.d.ts](../../modules/contracts/nodeMigrations.d.ts) | 类型或数据定义 | `migrateNodeRecord` | 无业务运行副作用 |
| [modules/contracts/nodeMigrations.js](../../modules/contracts/nodeMigrations.js) | 模块内部辅助 | `migrateNodeRecord` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/nodeProjectSnapshot.js](../../modules/contracts/nodeProjectSnapshot.js) | 模块内部辅助 | `nodeProjectSnapshot` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/nodeSdk.d.ts](../../modules/contracts/nodeSdk.d.ts) | 类型或数据定义 | `NodeMediaType`, `NodeCategory`, `NodeRendererKind`, `NodeAgentSideEffect`, `NodePort`, `NodeExecutorDeclaration`, `NodeAgentDeclaration`, `NodeDefinition`, `NodeMigration`, `NodePackageManifest`, `NodePackage`, `NodeEndpoint`, `NodeEdge`, `NODE_SDK_VERSION`, `NODE_MEDIA_TYPES`, `NODE_CATEGORIES`, `NODE_RENDERERS`, `NODE_AGENT_SIDE_EFFECTS`, `validateNodeDefinition`, `validateNodePackageManifest`, `createMissingNodeDefinition`, `cloneNodeDefinition` | 无业务运行副作用 |
| [modules/contracts/nodeSdk.js](../../modules/contracts/nodeSdk.js) | 模块内部辅助 | `NODE_SDK_VERSION`, `NODE_MEDIA_TYPES`, `NODE_CATEGORIES`, `NODE_RENDERERS`, `NODE_AGENT_SIDE_EFFECTS`, `validateNodeDefinition`, `validateNodePackageManifest`, `createMissingNodeDefinition`, `cloneNodeDefinition` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/nodeValues.d.ts](../../modules/contracts/nodeValues.d.ts) | 类型或数据定义 | `declaredNodeOutput` | 无业务运行副作用 |
| [modules/contracts/nodeValues.js](../../modules/contracts/nodeValues.js) | 协议、校验或数据规则 | `declaredNodeOutput` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/officialDramaBundle.js](../../modules/contracts/officialDramaBundle.js) | 模块内部辅助 | `OFFICIAL_DRAMA_BUNDLE`, `OFFICIAL_DRAMA_SKILL_METADATA`, `officialProductionBundle`, `OFFICIAL_PRODUCTION_SKILLS`, `SKILL_INSTRUCTION_LIMITS` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/officialProductionProfiles.d.ts](../../modules/contracts/officialProductionProfiles.d.ts) | 类型或数据定义 | `OfficialProductionProfile`, `OFFICIAL_PRODUCTION_PROFILES`, `productionProfileForSkill`, `productionProfileForBundle` | 无业务运行副作用 |
| [modules/contracts/officialProductionProfiles.js](../../modules/contracts/officialProductionProfiles.js) | 模块内部辅助 | `OFFICIAL_PRODUCTION_PROFILES`, `productionProfileForSkill`, `productionProfileForBundle` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/pluginValidation.js](../../modules/contracts/pluginValidation.js) | 协议、校验或数据规则 | `GENERATION_KINDS`, `WORKFLOW_EXECUTOR_METHODS`, `WORKFLOW_CLIENT_METHODS`, `validateProviderDescriptor`, `validatePluginManifest` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/presentationAssets.d.ts](../../modules/contracts/presentationAssets.d.ts) | 类型或数据定义 | `CARD_PLACEHOLDER_IMAGE` | 无业务运行副作用 |
| [modules/contracts/presentationAssets.js](../../modules/contracts/presentationAssets.js) | 模块内部辅助 | `CARD_PLACEHOLDER_IMAGE` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/projectErrors.d.ts](../../modules/contracts/projectErrors.d.ts) | 类型或数据定义 | `PROJECT_ERRORS`, `PROJECT_TRANSFER_ERRORS`, `USER_SCOPE_ERRORS`, `ProjectTransferErrorCode`, `UserScopeErrorCode`, `ProjectErrorCode`, `ProjectError`, `ProjectTransferError`, `UserScopeError` | 无业务运行副作用 |
| [modules/contracts/projectErrors.js](../../modules/contracts/projectErrors.js) | 模块内部辅助 | `PROJECT_ERRORS`, `PROJECT_TRANSFER_ERRORS`, `USER_SCOPE_ERRORS`, `ProjectError`, `ProjectTransferError`, `UserScopeError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/projectFiles.d.ts](../../modules/contracts/projectFiles.d.ts) | 类型或数据定义 | `ProjectArchiveEntry`, `ProjectArchiveRequest`, `ProjectFileCopyOptions`, `ProjectArchiveCreateOptions`, `ProjectArchiveExtractOptions`, `ProjectArchiveValidation`, `ProjectFileStore` | 无业务运行副作用 |
| [modules/contracts/showcaseArchive.d.ts](../../modules/contracts/showcaseArchive.d.ts) | 类型或数据定义 | `ShowcaseArchiveRequest`, `showcaseArchiveSource` | 无业务运行副作用 |
| [modules/contracts/showcaseArchive.js](../../modules/contracts/showcaseArchive.js) | 协议、校验或数据规则 | `showcaseArchiveSource` | 无 I/O |
| [modules/contracts/projectRepositoryExtensions.d.ts](../../modules/contracts/projectRepositoryExtensions.d.ts) | 类型或数据定义 | `ProjectSummary`, `ProjectFolder`, `ProjectFolderInput`, `ProjectDirectoryRepository`, `ProjectRecoveryPoint`, `ProjectQuarantineEntry`, `ProjectStartupRecovery`, `ProjectRecoveryRepository`, `ProjectCatalogTransaction`, `ProjectCatalog`, `ProjectNodeSanitizer`, `ProjectStorageServices` | 无业务运行副作用 |
| [modules/contracts/projectUi.ts](../../modules/contracts/projectUi.ts) | 模块内部辅助 | `CanvasPoint`, `CanvasViewport`, `STABLE_MIN_ZOOM`, `STABLE_MAX_ZOOM` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/projectWorkflow.ts](../../modules/contracts/projectWorkflow.ts) | 模块内部辅助 | `WorkflowRecord`, `ProjectDocument`, `CanvasWorkflowProps`, `WorkflowSaveOptions`, `CanvasProjectUiService`, `ProjectMediaRecoveryService` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/providerErrors.d.ts](../../modules/contracts/providerErrors.d.ts) | 类型或数据定义 | `PROVIDER_ERRORS`, `ProviderErrorCode`, `ProviderErrorOptions`, `ProviderError`, `providerError`, `wrapProviderError`, `ProviderErrorFactories`, `providerErrorsFor` | 无业务运行副作用 |
| [modules/contracts/providerErrors.js](../../modules/contracts/providerErrors.js) | 模块内部辅助 | `PROVIDER_ERRORS`, `ProviderError`, `providerError`, `wrapProviderError`, `providerErrorsFor` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/providerSecrets.js](../../modules/contracts/providerSecrets.js) | 模块内部辅助 | `USER_PROVIDER_SECRET_KEYS` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/shared/agentDocumentFormats.d.ts](../../modules/contracts/shared/agentDocumentFormats.d.ts) | 类型或数据定义 | `agentDocumentExtensions`, `agentDocumentAccept`, `isAgentDocument` | 无业务运行副作用 |
| [modules/contracts/shared/agentDocumentFormats.js](../../modules/contracts/shared/agentDocumentFormats.js) | 协议、校验或数据规则 | `agentDocumentExtensions`, `agentDocumentAccept`, `isAgentDocument` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/shared/fileDrop.ts](../../modules/contracts/shared/fileDrop.ts) | 模块内部辅助 | `preventFileDropNavigation` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/shared/generationBudgetProfile.js](../../modules/contracts/shared/generationBudgetProfile.js) | 模块内部辅助 | `generationBudgetProfile` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/shared/midjourneyPrompt.d.ts](../../modules/contracts/shared/midjourneyPrompt.d.ts) | 类型或数据定义 | `normalizeMidjourneyPrompt`, `removeMidjourneyPreview` | 无业务运行副作用 |
| [modules/contracts/shared/midjourneyPrompt.js](../../modules/contracts/shared/midjourneyPrompt.js) | 模块内部辅助 | `normalizeMidjourneyPrompt`, `removeMidjourneyPreview` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/shared/modelOverrideKey.d.ts](../../modules/contracts/shared/modelOverrideKey.d.ts) | 类型或数据定义 | `modelOverrideKey`, `isLikelyProviderApiKey` | 无业务运行副作用 |
| [modules/contracts/shared/modelOverrideKey.js](../../modules/contracts/shared/modelOverrideKey.js) | 模块内部辅助 | `modelOverrideKey`, `isLikelyProviderApiKey` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/skillCatalog.d.ts](../../modules/contracts/skillCatalog.d.ts) | 类型或数据定义 | `SKILL_CATEGORIES`, `SKILL_CATALOG_CHANGED`, `SKILL_PREVIEW_EVENT`, `skillCategory`, `AgentSkill` | 无业务运行副作用 |
| [modules/contracts/skillCatalog.js](../../modules/contracts/skillCatalog.js) | 模块内部辅助 | `SKILL_CATEGORIES`, `SKILL_CATALOG_CHANGED`, `SKILL_PREVIEW_EVENT`, `skillCategory` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/storageDramaPlan.d.ts](../../modules/contracts/storageDramaPlan.d.ts) | 类型或数据定义 | `StoredDramaAsset`, `StoredDramaSegment`, `StoredDramaPlan`, `DramaPlanValidation` | 无业务运行副作用 |
| [modules/contracts/storageErrors.d.ts](../../modules/contracts/storageErrors.d.ts) | 类型或数据定义 | `STORAGE_ERRORS`, `StorageErrorCode`, `WorkspaceError`, `PlanError`, `PromptPresetError` | 无业务运行副作用 |
| [modules/contracts/storageErrors.js](../../modules/contracts/storageErrors.js) | 模块内部辅助 | `STORAGE_ERRORS`, `WorkspaceError`, `PlanError`, `PromptPresetError` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/thinkingParameters.js](../../modules/contracts/thinkingParameters.js) | 模块内部辅助 | `doubaoThinkingParameters` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/types/index.ts](../../modules/contracts/types/index.ts) | 模块入口或装配 | `NodeType`, `CanvasNode`, `CanvasGroup`, `WorkflowSummary`, `Workflow`, `Folder`, `AssetKind`, `AssetRecord`, `GenerationStatus`, `GenerationTask`, `AppSettings` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/uiFeatures.ts](../../modules/contracts/uiFeatures.ts) | 模块内部辅助 | `UI_FEATURES`, `isGenerationSourceVisible` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/workflowCanvas.ts](../../modules/contracts/workflowCanvas.ts) | 模块内部辅助 | `WorkflowCanvasMediaKind`, `RunningHubInstanceType`, `WorkflowCanvasBlueprint` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/workflowCanvasNodeProtocol.ts](../../modules/contracts/workflowCanvasNodeProtocol.ts) | 协议、校验或数据规则 | `WorkflowSourceCanvasNode`, `WorkflowCanvasNodePatch`, `WorkflowRunScope`, `WorkflowCanvasOutputValue`, `WorkflowCanvasNodeRecord`, `WorkflowCanvasInputSlot`, `WorkflowCanvasExampleInsertion`, `WorkflowVerifiedCanvasInsertion`, `WorkflowCanvasInsertionResult`, `WorkflowCanvasUploadedInputNode`, `WorkflowCanvasNodesAdapter` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/workflowClient.ts](../../modules/contracts/workflowClient.ts) | 客户端或传输 | `WorkflowManagerClient`, `WorkflowCanvasClient`, `RunningHubWebAppClient`, `RunningHubWebAppCategory`, `RunningHubWebAppCard`, `RunningHubWebAppLibrary` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/workflowEditor.ts](../../modules/contracts/workflowEditor.ts) | 模块内部辅助 | `OfficialWorkflow`, `WorkflowDefinition`, `BindingCandidate`, `BindingSet`, `WorkflowRun`, `WorkflowSeedAdvancement`, `WorkflowDeploymentDto`, `OutputCandidate`, `WorkflowOutputBindingSet`, `WorkflowAttestation`, `WorkflowEditorSnapshot` | 未检出平台调用；不等于纯函数证明 |
| [modules/contracts/workflowProtocols.js](../../modules/contracts/workflowProtocols.js) | 协议、校验或数据规则 | `LocalComfyClientError`, `projectRuntimeProtocol`, `LocalComfyExecutorError`, `RunningHubWorkflowExecutorError`, `RunningHubWorkflowClientError`, `normalizeRunningHubBaseUrl`, `assertRunningHubRemoteId`, `normalizeRunningHubInstanceType` | 未检出平台调用；不等于纯函数证明 |

<!-- source-inventory:end -->
