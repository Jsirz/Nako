# Generation Core

## 职责与边界

负责模型目录、来源可用性、默认模型、并发、生成调度、任务回执和恢复。业务不能导入具体 Provider；通过 generation.providers 当前注册的 handler 调用。入口 [serverPlugin.js](../../modules/generation-core/serverPlugin.js) 注册 generation.runtime/defaults，registryPlugin 注册 Provider 目录，browser.ts 安装浏览器生成能力。

## 接口契约

GenerationProvider/GenerationHandler/GenerationRequest/GenerationTaskStore 定义于 contracts。generation.providers 发现当前 handler；generation.runtime 的公共形状由 [generationService.d.ts](../../modules/contracts/generationService.d.ts) 定义，发布生成、节点生成/观察、受限协调方法以及只读 get/list 任务视图；不发布内部 Map、journal 写入或文件路径。generation.defaults 管理四类默认模型。本地来源可用性经 LocalRuntimeService.providerConfiguration 查询。

模型配置路由通过 `identity.providerCredentials` 注入 contracts/ProviderCredentialManager，不再构造 DPAPI/钥匙串或读取身份模块内部文件路径。其结构化输入错误携带状态与上下文；配置与模型来源日志使用 context.logger。

[providerDispatch.js](../../modules/generation-core/server/generation/providerDispatch.js) 解析上下文并派发；generationService/generationExecution 共享处理链。/api/generate 等路由接收画布请求，节点能力通过 nodeModelService 复用。生成错误使用 contracts/generationErrors 和 PluginError，保留领域状态及回执；未集中的诊断码见差异记录。

模型贡献由 config/model-plugins.json 明确声明，脚本生成应用组合根 [modelContributions.ts](../../apps/canvas/modelContributions.ts) 和后端 JSON 快照，不再生成业务层 Provider import。[installModelCatalog.ts](../../apps/canvas/installModelCatalog.ts) 在浏览器插件加载前注入，生成核心校验并复制数据、保持四类数组身份和排序；显示名/来源读取当前目录，不缓存注入前空快照。默认模型与来源目录见 [统一默认模型](../统一默认模型说明.md)。

浏览器 `generation.defaults.get` 仅返回仍在候选目录中且已配置的默认模型，失效时返回空值，避免新节点记录已删除的模型；`read` 保留原设置供用户修正，`resolve` 对失效默认值抛出明确错误。并发接口对无法解析的模型返回 400 与 contracts 的 `INVALID_MODEL_CONFIGURATION`，客户端保留该错误码供画布区分配置问题和临时请求失败。

## 数据模型

协调器管理 modelIdKey 并发、lease、nodeId/attemptId、admittedAttemptIds、remoteTask/提交标记、结果及 commit proof。任务状态包含 loading/queued/success/failed/cancelled/unknown；具体转移以协调实现为准。准入查询持久化记录并拒绝重复 attempt，新 attempt 才是显式新请求；保存较新尝试不清除历史准入身份。

任务通过 generation.taskStore 保存于私有 generation 目录；Provider 回执绑定原模型、端点、密钥指纹、项目及媒体类型。浏览器 scheduler 跟踪节点请求与恢复状态，切换页面暂停观察，不代表取消远端任务。默认模型保存在本机偏好服务中，显式选择优先，已有节点不随默认值改变。

## 功能结构

生成：解析默认或指定模型 -> 检查来源与参数/项目 -> 取得并发租约并登记任务 -> 按 kind 调 handler -> 保存媒体/回执 -> 终态及释放租约。远端提交前先登记身份，响应丢失或无法确认结果时为 unknown，避免自动再次扣费。

状态提交先同步写入 GenerationTaskStore，再更新内存、租约与观察控制器；失败抛出 `GENERATION_TASK_PERSISTENCE_FAILED`，不发布成功或释放仍需核对的租约。task-journal 同样先原子替换文件再发布内存记录；有效日志恢复写入失败不会被误判为损坏隔离。此顺序保障本机状态一致，不承诺供应商分布式事务。
同一 nodeId/attemptId 在终态或重启后重放会返回 GENERATION_ATTEMPT_ALREADY_ADMITTED，不新建租约、不再调用 Provider。准入拒绝不是原任务失败，不应替换原回执。插件退出释放协调资源；公共视图不提供 dispose 或底层 journal 对象。
协调器及公共 journal 查询返回独立数据快照，嵌套回执不共享内部引用。reacquireObservation 的 absoluteTimeoutMs 与 adopt 的 absoluteDeadlineMs 按实际方法区分；任务日志为有界记录，attempt 去重范围受记录保留约束，不承诺无限历史重放防护。

恢复：只处理可恢复 Provider 的原回执，核对原身份后查询远端并保存结果；不重复提交。超时、取消、观察中断各保留可诊断状态。工作流由 workflow-runtime/executor 处理。来源设置与模型 picker 是展示/配置层，Provider 协议和密钥只在适配器内。

来源设置保留 sourceSettings 的入口；通用 DOM 控件位于 sourceSettingsDom，Dreamina CLI 状态/轮询与渲染分别归属 dreaminaCliSettings、dreaminaCliSettingsRender。
generationAdmission 管理准入与恢复租约，协调器维护同步持久化状态发布；canvasGenerationPreparation 与 canvasGenerationExecution 分担预检/授权和执行生命周期，外层保持 scheduler owner 与释放。公共 UI 模型、绑定、授权和运行类型位于 contracts/generationUi。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/generation-core/browser.manifest.json](../../modules/generation-core/browser.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/generation-core/browser.ts](../../modules/generation-core/browser.ts) | 模块入口或装配 | `default` | 含 DOM/事件、服务注册/生命周期 调用；时机见实现 |
| [modules/generation-core/exports.json](../../modules/generation-core/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/generation-core/index.js](../../modules/generation-core/index.js) | 模块入口或装配 | `GenerationProviderRegistry`, `getGenerationProvider`, `listGenerationProviders`, `createGenerationCoordinator`, `executeGenerationTask`, `GenerationTaskError`, `parseTimeToMs`, `withTimeout` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/manifest.json](../../modules/generation-core/manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/generation-core/models/defaults.ts](../../modules/generation-core/models/defaults.ts) | 模块内部辅助 | `IMAGE_RESOLUTIONS`, `IMAGE_RATIOS`, `VIDEO_RESOLUTIONS`, `VIDEO_ASPECT_RATIOS`, `TEXT_RESOLUTIONS`, `TEXT_ASPECT_RATIOS`, `ModelNodeType` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/models/modelDisplayName.ts](../../modules/generation-core/models/modelDisplayName.ts) | 模块内部辅助 | `modelDisplayName` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/providerRegistry.js](../../modules/generation-core/providerRegistry.js) | 模块内部辅助 | `GenerationProviderRegistry`, `generationProviders`, `getGenerationProvider`, `listGenerationProviders`, `requireProvider` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/registryPlugin.js](../../modules/generation-core/registryPlugin.js) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/generation-core/server.manifest.json](../../modules/generation-core/server.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/generation-core/server/config/environmentConfig.js](../../modules/generation-core/server/config/environmentConfig.js) | 服务端领域实现 | `SECRET_MASK`, `USER_PROVIDER_SECRET_KEYS`, `SECRET_KEYS`, `NETWORK_KEYS`, `LOCAL_ONLY_DISABLED_KEYS`, `isAllowedKey`, `normalizeNetworkConfigValue`, `parseEnvironment`, `safeValue`, `serializeEnvironment` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/config/modelCatalog.js](../../modules/generation-core/server/config/modelCatalog.js) | 服务端领域实现 | `DEFAULT_SNAPSHOT_PATH`, `createModelCatalog`, `loadModelCatalog`, `applyModelIdOverrides`, `loadModelNames`, `normalizeModelDuration` | 含 文件系统 调用；时机见实现 |
| [modules/generation-core/server/config/runninghubEndpointPaths.json](../../modules/generation-core/server/config/runninghubEndpointPaths.json) | 类型或数据定义 | 声明式配置 | 无业务运行副作用 |
| [modules/generation-core/server/generation/defaultModels.js](../../modules/generation-core/server/generation/defaultModels.js) | 服务端领域实现 | `createDefaultModelsService`, `createDefaultModelsRouter` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/generation-core/server/generation/generationAdmission.js](../../modules/generation-core/server/generation/generationAdmission.js) | 服务端领域实现 | `GenerationAdmission` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/generationCoordinator.js](../../modules/generation-core/server/generation/generationCoordinator.js) | 运行、调度或服务 | `createGenerationCoordinator` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/generationErrors.js](../../modules/generation-core/server/generation/generationErrors.js) | 服务端领域实现 | `getUpstreamStatus`, `classifyGenerationError`, `confirmedGenerationFailure` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/generationExecution.js](../../modules/generation-core/server/generation/generationExecution.js) | 运行、调度或服务 | `GenerationTaskError`, `executeGenerationTask` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/generationRecoveryRouter.js](../../modules/generation-core/server/generation/generationRecoveryRouter.js) | HTTP 转换与校验 | `createGenerationRecoveryRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/generation-core/server/generation/generationRecoveryService.js](../../modules/generation-core/server/generation/generationRecoveryService.js) | 运行、调度或服务 | `createGenerationRecoveryService` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/generationRuntime.js](../../modules/generation-core/server/generation/generationRuntime.js) | 运行、调度或服务 | `createGenerationRuntime`, `publicGenerationTasks` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/generationService.js](../../modules/generation-core/server/generation/generationService.js) | 运行、调度或服务 | `createGenerationService`, `createImageGenerationService` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/generationTaskRecovery.js](../../modules/generation-core/server/generation/generationTaskRecovery.js) | 运行、调度或服务 | `remoteTaskReference`, `sanitizeRemoteTaskReference`, `matchesRemoteTask`, `remoteTaskReferences`, `isRecoverableProvider`, `canRecoverGenerationTask`, `createGenerationTaskRecovery` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/liveSmokeGuard.js](../../modules/generation-core/server/generation/liveSmokeGuard.js) | 服务端领域实现 | `validateLiveSmokeRequest` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/modelAvailability.js](../../modules/generation-core/server/generation/modelAvailability.js) | 服务端领域实现 | `SOURCE_LABELS`, `SOURCE_ORDER`, `DEFERRED_PRICE_NOTE`, `MODE_REQUIRED_PRICE_NOTE`, `MODE_UNVERIFIED_PRICE_NOTE`, `RESOLUTION_UNVERIFIED_PRICE_NOTE`, `MODE_UNSUPPORTED_PRICE_NOTE`, `sourceLabelFor`, `costAt`, `mediaKindOf`, `brandOf`, `capabilitiesOf`, `buildSourceSettings`, `buildModelAvailability` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/modelSourceRouter.js](../../modules/generation-core/server/generation/modelSourceRouter.js) | HTTP 转换与校验 | `createModelSourceRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/generation-core/server/generation/nodeModelService.js](../../modules/generation-core/server/generation/nodeModelService.js) | 运行、调度或服务 | `nodeModelAttemptId`, `createNodeModelObserver`, `createNodeModelService` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/providerDispatch.js](../../modules/generation-core/server/generation/providerDispatch.js) | 服务端领域实现 | `resolveFinalExecutionContext`, `PROVIDERS` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/generation/sourceMetadata.js](../../modules/generation-core/server/generation/sourceMetadata.js) | 服务端领域实现 | `SOURCE_LABELS`, `SOURCE_ORDER` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/server/routes/config.js](../../modules/generation-core/server/routes/config.js) | 服务端领域实现 | `SECRET_MASK`, `USER_PROVIDER_SECRET_KEYS`, `createConfigRouter`, `default` | 含 文件系统、HTTP/网络 调用；时机见实现 |
| [modules/generation-core/server/routes/generation.js](../../modules/generation-core/server/routes/generation.js) | 服务端领域实现 | `createImageGenerationService`, `createGenerationRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/generation-core/server/routes/local-models.js](../../modules/generation-core/server/routes/local-models.js) | 服务端领域实现 | `default` | 含 文件系统、子进程、HTTP/网络 调用；时机见实现 |
| [modules/generation-core/serverPlugin.js](../../modules/generation-core/serverPlugin.js) | 模块入口或装配 | `default` | 含 HTTP/网络、服务注册/生命周期 调用；时机见实现 |
| [modules/generation-core/timing.js](../../modules/generation-core/timing.js) | 模块内部辅助 | `parseTimeToMs`, `withTimeout` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/agentModelAvailability.ts](../../modules/generation-core/ui/generation/agentModelAvailability.ts) | 浏览器交互与状态辅助 | `AgentModelAvailabilityBridge`, `installAgentModelAvailability` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/canvasGeneration.ts](../../modules/generation-core/ui/generation/canvasGeneration.ts) | 浏览器交互与状态辅助 | `useCanvasLocalWorkflows`, `observeWithin`, `prepareCanvasGenerationRequest`, `generateAudio`, `generateText`, `getGenerationConcurrency`, `inspectImage`, `extractVideoLastFrame`, `GenerationBinding`, `GenerationRuntime`, `GenerationAuthorization`, `createCanvasGeneration`, `useCanvasGeneration` | 含 DOM/事件 调用；时机见实现 |
| [modules/generation-core/ui/generation/canvasGenerationExecution.ts](../../modules/generation-core/ui/generation/canvasGenerationExecution.ts) | 运行、调度或服务 | `runCanvasGeneration` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/canvasGenerationPreparation.ts](../../modules/generation-core/ui/generation/canvasGenerationPreparation.ts) | 浏览器交互与状态辅助 | `timeoutFor`, `observeWithin`, `withTimestamp`, `prepareCanvasGenerationRequest`, `authorizeGeneration` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/canvasGenerationRequests.ts](../../modules/generation-core/ui/generation/canvasGenerationRequests.ts) | 浏览器交互与状态辅助 | `GenerationModel`, `GenerationModels`, `generationUnitPrice`, `videoUnitPrice`, `text`, `finite`, `inputMedia`, `connectedMedia`, `externalReferenceMedia`, `imageReferences`, `effectiveVideoMode`, `buildImageRequest`, `buildVideoRequest`, `buildTextRequest`, `buildAudioRequest` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/canvasLocalWorkflows.ts](../../modules/generation-core/ui/generation/canvasLocalWorkflows.ts) | 浏览器交互与状态辅助 | `createCanvasLocalWorkflows`, `useCanvasLocalWorkflows` | 含 DOM/事件 调用；时机见实现 |
| [modules/generation-core/ui/generation/canvasModelCatalogPolicy.ts](../../modules/generation-core/ui/generation/canvasModelCatalogPolicy.ts) | 协议、校验或数据规则 | `ModelGroupFilter`, `filterCanvasModelGroups` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/defaultModelsClient.ts](../../modules/generation-core/ui/generation/defaultModelsClient.ts) | 客户端或传输 | `createDefaultModelsClient` | 含 HTTP/网络 调用；时机见实现 |
| [modules/generation-core/ui/generation/defaultModelsSettings.ts](../../modules/generation-core/ui/generation/defaultModelsSettings.ts) | 浏览器交互与状态辅助 | `mountDefaultModelsSettings` | 含 DOM/事件 调用；时机见实现 |
| [modules/generation-core/ui/generation/dreaminaCliSettings.ts](../../modules/generation-core/ui/generation/dreaminaCliSettings.ts) | 浏览器交互与状态辅助 | `dreaminaCliVendor` | 含 DOM/事件、服务注册/生命周期 调用；时机见实现 |
| [modules/generation-core/ui/generation/dreaminaCliSettingsRender.ts](../../modules/generation-core/ui/generation/dreaminaCliSettingsRender.ts) | 界面呈现与交互 | `createDreaminaCliSettingsView` | 含 DOM/事件 调用；时机见实现 |
| [modules/generation-core/ui/generation/dreaminaLoginUrl.ts](../../modules/generation-core/ui/generation/dreaminaLoginUrl.ts) | 浏览器交互与状态辅助 | `isOfficialDreaminaLoginUrl` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/generationClient.ts](../../modules/generation-core/ui/generation/generationClient.ts) | 客户端或传输 | `generateImage`, `generateVideo`, `generateAudio`, `generateText`, `getGenerationConcurrency` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/generation-core/ui/generation/generationRecovery.ts](../../modules/generation-core/ui/generation/generationRecovery.ts) | 运行、调度或服务 | `RecoverableNode`, `GenerationRecoveryBinding`, `GenerationRecoverySession`, `interruptedGenerationPatch`, `mountGenerationRecovery`, `mountVideoFrameRecovery`, `installGenerationRecovery` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/generation-core/ui/generation/generationScheduler.ts](../../modules/generation-core/ui/generation/generationScheduler.ts) | 运行、调度或服务 | `GenerationTaskStatus`, `GenerationTaskEvent`, `GenerationTaskState`, `GenerationPromptNode`, `GenerationSchedulerAdapter`, `createGenerationScheduler`, `installGenerationScheduler` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/hiddenProviderPolicy.ts](../../modules/generation-core/ui/generation/hiddenProviderPolicy.ts) | 协议、校验或数据规则 | `isHiddenGenerationSource`, `isModelVisible`, `visibleSourceBlocks` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/imageMode.ts](../../modules/generation-core/ui/generation/imageMode.ts) | 浏览器交互与状态辅助 | `ImageModeDefinition`, `ImageModeAdapter`, `isAutomaticImageMode`, `resolveImageGenerationMode`, `supportsImageGenerationMode`, `installImageModeAdapter` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/imageResultHistory.ts](../../modules/generation-core/ui/generation/imageResultHistory.ts) | 浏览器交互与状态辅助 | `ImageResultHistoryNode`, `ImageResultHistoryUpdate`, `ImageResultHistoryAdapter`, `mergeImageResultHistory`, `installImageResultHistory` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/libTvCliSettings.ts](../../modules/generation-core/ui/generation/libTvCliSettings.ts) | 浏览器交互与状态辅助 | `libTvCliVendor` | 含 DOM/事件、服务注册/生命周期 调用；时机见实现 |
| [modules/generation-core/ui/generation/midjourneyReferences.ts](../../modules/generation-core/ui/generation/midjourneyReferences.ts) | 浏览器交互与状态辅助 | `MidjourneyReferenceRole`, `MidjourneyReferenceRoleDefinition`, `MidjourneyReferenceNode`, `MidjourneyReferenceAssignments`, `MidjourneyReferencePayload`, `MIDJOURNEY_REFERENCE_ROLES`, `sanitizeMidjourneyReferenceAssignments`, `assignMidjourneyReference`, `resolveMidjourneyReferencePayload`, `MidjourneyReferenceAdapter`, `installMidjourneyReferenceAdapter` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/modelPicker.ts](../../modules/generation-core/ui/generation/modelPicker.ts) | 浏览器交互与状态辅助 | `installStableModelPricingBridge`, `currentResolution`, `currentGenerationMode`, `currentAspectRatio`, `currentDuration`, `currentSpeed`, `ModelPickerBinding`, `mountModelPicker`, `installModelPricing` | 含 DOM/事件 调用；时机见实现 |
| [modules/generation-core/ui/generation/sourceSettings.ts](../../modules/generation-core/ui/generation/sourceSettings.ts) | 浏览器交互与状态辅助 | `mountSourceSettings` | 含 DOM/事件、服务注册/生命周期 调用；时机见实现 |
| [modules/generation-core/ui/generation/sourceSettingsClient.ts](../../modules/generation-core/ui/generation/sourceSettingsClient.ts) | 客户端或传输 | `MediaKind`, `SourceSecret`, `SourceModel`, `SourceMedia`, `SourceBlock`, `ModelVariant`, `ModelGroup`, `ModelPricingContext`, `DreaminaLoginOptions`, `LibTvCliStatus`, `DreaminaCliStatus`, `DreaminaLoginStatus`, `createSourceSettingsClient`, `SourceSettingsClient`, `scopeSourceSettingsClient` | 含 HTTP/网络 调用；时机见实现 |
| [modules/generation-core/ui/generation/sourceSettingsDom.ts](../../modules/generation-core/ui/generation/sourceSettingsDom.ts) | 浏览器交互与状态辅助 | `vendorLink`, `badge`, `disclosureButton` | 含 DOM/事件 调用；时机见实现 |
| [modules/generation-core/ui/generation/sourceSettingsRequests.ts](../../modules/generation-core/ui/generation/sourceSettingsRequests.ts) | 浏览器交互与状态辅助 | `SettingsRequestOptions`, `requestSettingsJson` | 含 HTTP/网络 调用；时机见实现 |
| [modules/generation-core/ui/generation/sourceSettingsScope.ts](../../modules/generation-core/ui/generation/sourceSettingsScope.ts) | 浏览器交互与状态辅助 | `createSettingsScope`, `SettingsScope` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/generation-core/ui/generation/videoMode.ts](../../modules/generation-core/ui/generation/videoMode.ts) | 浏览器交互与状态辅助 | `VideoMediaInput`, `VideoModeDefinition`, `VideoInputCounts`, `VideoModeAdapter`, `isAutomaticVideoMode`, `isVideoGenerationModeAllowed`, `resolveVideoGenerationMode`, `supportsVideoGenerationMode`, `getVideoGenerationModeLabel`, `installVideoModeAdapter` | 未检出平台调用；不等于纯函数证明 |
| [modules/generation-core/ui/generation/workflowRecoveryBoundary.ts](../../modules/generation-core/ui/generation/workflowRecoveryBoundary.ts) | 运行、调度或服务 | `registerWorkflowRecoveryOwner`, `isWorkflowRecoveryRequest`, `createWorkflowRecoveryFetch`, `installWorkflowRecoveryFetch`, `clearWorkflowRecoveryOwnersForTests` | 含 HTTP/网络 调用；时机见实现 |

<!-- source-inventory:end -->
