# Workflow Runtime

## 职责与边界

负责工作流定义/工件、部署、输入输出绑定、预检、运行、观察、恢复与输入清理。业务通过 workflow.executors 获取 WorkflowExecutor，不直接导入 ComfyUI/RunningHub 实现。入口 serverPlugin 注册 workflow.execution，registryPlugin 注册执行器目录，browser.ts 安装工作流界面。

## 接口契约

contracts/index.d.ts 的 WorkflowExecutor 提供 canExecute/execute，可选 resume/cleanup 方法；请求携带 signal。客户端仅暴露 pluginValidation 的方法白名单，不公布 store、密钥或原始客户端。defineExecutor 经注册表注入 factory，插件关闭后旧引用失效。

[registryPlugin.js](../../modules/workflow-runtime/registryPlugin.js) 在完整 workflow.execution 启动前提供 workflow.executors 与 workflow.support，显式依赖媒体能力、身份外部读取服务和 platform.paths。三个 executor 插件依赖该注册阶段，不依赖后续 module.workflow-runtime，避免与 generation 的启动循环。

workflow.support 契约见 [workflowSupport.d.ts](../../modules/contracts/workflowSupport.d.ts)：compileBindings 接收执行计划、绑定、部署、项目、值及素材解析回调，返回编译计划、摘要、种子和素材；historyOutputs/runningHubOutputs 返回中立输出候选；localizeOutputs 接收候选、下载客户端与保存范围，返回 outputs/commit/rollback 事务；validateReceipt 接收受限任务查询及输出配置查询，在发布前核对回执。WebApp 投影、上传压缩、兼容投影、封面与 history 状态也通过明确方法发布。实现仍在 workflow-runtime/server/workflowRuntime；服务不发布内部 store 或插件实例。失败保留领域 code/status/retryable，历史错误上下文差异仍记录于 conformance。

RunningHub 输出归一化实现为 [runningHubOutputs.js](../../modules/workflow-runtime/server/workflowRuntime/runningHubOutputs.js)。WebApp 输出标识及项目媒体身份函数属于 contracts/workflowSupport.js；SeedVR2 与执行器经服务共用归一化规则。客户端白名单增加 uploadBuffer/createWebAppTask/getWebAppTaskOutputs，SeedVR2 只使用 credentialRef 建立客户端，恢复观察原 taskId，不自动再次提交。

[executionWorkflowRuntime.js](../../modules/workflow-runtime/server/workflowRuntime/executionWorkflowRuntime.js) 装配定义、部署、测试运行、资产及路由。编辑 DTO/客户端/画布协议分别在 contracts/workflowEditor、workflowClient、workflowCanvasNodeProtocol。服务调用须使用定义、部署、绑定版本及项目归属，不能由画布覆盖编译后的执行目标。

[workflowRuntimeRouter.js](../../modules/workflow-runtime/server/workflowRuntime/workflowRuntimeRouter.js) 与 workflowLibraryRouter 承接 HTTP 校验；公共错误类型在 contracts/workflowProtocols.js。预检返回检查项和 compiledPromptHash，运行返回 WorkflowRun；参数/绑定变化需要重新核对。

## 数据模型

定义关联 UI/API 工件及版本；部署关联 runtimeKind、服务地址、凭据引用、实例类型及输入清理授权；bindingSet/outputBindingSet 映射稳定参数及输出端口；attestation 绑定已验证版本与成功运行。

运行包含 runId、项目、快照身份、输入暂存账本、远端任务、执行状态、观察状态、输出与清理状态。定义配置和运行存储位于私有 execution-workflows 目录，项目媒体结果位于 library/media。工作流文件不可由静态 library 路由公开。

## 功能结构

`officialWorkflowCatalog.js` 从 contracts 的官方制作目录生成文戏、武戏工作流入口，并提供独立的人物资产入口；高配文戏工作流已随对应官方技能移除。

新执行：格式解析/图投影 -> 参数绑定与预检 -> 固定执行快照/种子 -> 先记暂存账本 -> 上传输入 -> 提交 -> 观察 -> 本地化输出 -> 持久化回执/提交证明 -> 发布。素材归属、大小、请求限制和防重复提交贯穿此链路。

恢复只观察原远端任务，不重新上传或提交。观察暂停保留资源；输入清理需原账本、目录授权和远端停止证明，失败保留 pending/orphaned 等状态并可显式重试。取消经 AbortSignal，不能承诺撤回远端已扣费任务。三个具体 executor 在 plugins/workflows；浏览器管理界面目前位于 local-runtime，归属差异见规范差异。
workflowOutputPublication 负责输出 manifest 与提交/回滚，workflowOutputLocalizer 负责本地化编排。格式探测的 MEDIA_STREAM_NOT_FOUND 位于公共媒体错误 context.operationCode；领域错误保留路由 instanceof，通用错误使用 contracts/localRuntimeErrors，日志通过 kernel Logger。客户端接收 credentialRef、拒绝外部 apiKey，由执行器插件授权上下文读取凭据。

local-comfyui 与 RunningHub 执行器未注入日志时使用带插件标识的 kernel Logger。RunningHub 请求超时的 AbortSignal 原因使用 PluginError 并附 request.timeout/timeoutMs；客户端现有失败转换仍返回 RUNNINGHUB_REQUEST_TIMEOUT 和 504，取消与重试策略不变。工作流历史领域错误的上下文与集中错误码尚需收敛，详见 conformance。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/workflow-runtime/browser.manifest.json](../../modules/workflow-runtime/browser.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/workflow-runtime/browser.ts](../../modules/workflow-runtime/browser.ts) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/workflow-runtime/defineExecutor.js](../../modules/workflow-runtime/defineExecutor.js) | 运行、调度或服务 | `defineExecutorPlugin` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/workflow-runtime/exports.json](../../modules/workflow-runtime/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/workflow-runtime/index.js](../../modules/workflow-runtime/index.js) | 模块入口或装配 | `WorkflowExecutorRegistry` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/manifest.json](../../modules/workflow-runtime/manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/workflow-runtime/registryPlugin.js](../../modules/workflow-runtime/registryPlugin.js) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/workflow-runtime/server.manifest.json](../../modules/workflow-runtime/server.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/workflow-runtime/server/workflowRuntime/cloudMediaInputs.js](../../modules/workflow-runtime/server/workflowRuntime/cloudMediaInputs.js) | 运行、调度或服务 | `decodeFieldData`, `fieldDataSettings`, `uploadMediaKind`, `mediaEmptyContract`, `isCloudDeployment`, `cloudMediaEmptyValue`, `isAbsentMediaInput` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/comfySavedOutputs.js](../../modules/workflow-runtime/server/workflowRuntime/comfySavedOutputs.js) | 运行、调度或服务 | `isComfyPreviewNode`, `isSavedComfyFile`, `createComfyOutputPlan` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/directoryGrantStore.js](../../modules/workflow-runtime/server/workflowRuntime/directoryGrantStore.js) | 存储访问或状态管理 | `DirectoryGrantError`, `DirectoryGrantStore` | 含 文件系统 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/executionWorkflowRuntime.js](../../modules/workflow-runtime/server/workflowRuntime/executionWorkflowRuntime.js) | 运行、调度或服务 | `createExecutionWorkflowRuntime` | 含 HTTP/网络 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/fixtures/api.json](../../modules/workflow-runtime/server/workflowRuntime/fixtures/api.json) | 类型或数据定义 | 声明式配置 | 无业务运行副作用 |
| [modules/workflow-runtime/server/workflowRuntime/fixtures/ui-v0.4.json](../../modules/workflow-runtime/server/workflowRuntime/fixtures/ui-v0.4.json) | 类型或数据定义 | 声明式配置 | 无业务运行副作用 |
| [modules/workflow-runtime/server/workflowRuntime/fixtures/ui-v1.0.json](../../modules/workflow-runtime/server/workflowRuntime/fixtures/ui-v1.0.json) | 类型或数据定义 | 声明式配置 | 无业务运行副作用 |
| [modules/workflow-runtime/server/workflowRuntime/nodeWorkflowService.js](../../modules/workflow-runtime/server/workflowRuntime/nodeWorkflowService.js) | 运行、调度或服务 | `createNodeWorkflowService` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/officialWorkflowCatalog.js](../../modules/workflow-runtime/server/workflowRuntime/officialWorkflowCatalog.js) | 运行、调度或服务 | `OFFICIAL_WORKFLOWS` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/privateRecoveryDirectory.js](../../modules/workflow-runtime/server/workflowRuntime/privateRecoveryDirectory.js) | 运行、调度或服务 | `PrivateRecoveryDirectoryError`, `preparePrivateRecoveryRoot`, `quarantinePrivateRecoveryEntry`, `removeQuarantinedFlatDirectory` | 含 文件系统 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/runningHubCover.js](../../modules/workflow-runtime/server/workflowRuntime/runningHubCover.js) | 运行、调度或服务 | `coverUrlFromInfo`, `downloadRunningHubCover`, `readRunningHubPageCover` | 含 文件系统、HTTP/网络 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/runningHubOutputs.js](../../modules/workflow-runtime/server/workflowRuntime/runningHubOutputs.js) | 运行、调度或服务 | `normalizeRunningHubOutputs` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/runningHubUploadAdapter.js](../../modules/workflow-runtime/server/workflowRuntime/runningHubUploadAdapter.js) | 运行、调度或服务 | `RUNNINGHUB_UPLOAD_MAX_BYTES`, `RUNNINGHUB_UPLOAD_TARGET_BYTES`, `RunningHubUploadAdapterError`, `prepareRunningHubUploadAsset` | 含 文件系统、子进程 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/runningHubWebApp.js](../../modules/workflow-runtime/server/workflowRuntime/runningHubWebApp.js) | 运行、调度或服务 | `RUNNINGHUB_WEBAPP_OUTPUT_NODE_ID`, `RunningHubWebAppError`, `inferRunningHubWebAppCategory`, `createRunningHubWebAppProjection` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/runningHubWebAppCompatibility.js](../../modules/workflow-runtime/server/workflowRuntime/runningHubWebAppCompatibility.js) | 运行、调度或服务 | `adaptLegacyAnimaWebAppWorkflow`, `prepareRunningHubWebAppCompatibility` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/runningHubWebAppLibraryService.js](../../modules/workflow-runtime/server/workflowRuntime/runningHubWebAppLibraryService.js) | 运行、调度或服务 | `RunningHubWebAppLibraryError`, `RunningHubWebAppLibraryService` | 含 文件系统 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/runningHubWebAppRouter.js](../../modules/workflow-runtime/server/workflowRuntime/runningHubWebAppRouter.js) | HTTP 转换与校验 | `createRunningHubWebAppRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowAnalysis.js](../../modules/workflow-runtime/server/workflowRuntime/workflowAnalysis.js) | 运行、调度或服务 | `analyzeWorkflow` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowApiAnalysis.js](../../modules/workflow-runtime/server/workflowRuntime/workflowApiAnalysis.js) | 运行、调度或服务 | `apiRequirements`, `createCapabilityProjection`, `analyzeApiWorkflow` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowArtifactParser.js](../../modules/workflow-runtime/server/workflowRuntime/workflowArtifactParser.js) | 运行、调度或服务 | `looksLikeApiWorkflow`, `hasApiClassType`, `detectWorkflowFormat`, `validateUiWorkflow`, `validateUnknownUiWorkflow`, `validateApiWorkflow`, `parseWorkflowArtifact`, `normalizeApiWorkflow` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowAssetIdentity.js](../../modules/workflow-runtime/server/workflowRuntime/workflowAssetIdentity.js) | 运行、调度或服务 | `workflowAssetKey` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowAssetResolver.js](../../modules/workflow-runtime/server/workflowRuntime/workflowAssetResolver.js) | 运行、调度或服务 | `WorkflowAssetError`, `recoverWorkflowAssetSnapshots`, `WorkflowAssetResolver` | 含 文件系统 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowAttestationService.js](../../modules/workflow-runtime/server/workflowRuntime/workflowAttestationService.js) | 运行、调度或服务 | `WorkflowAttestationError`, `classifyReceiptOutput`, `toOutputBindingSetDto`, `toAttestationDto`, `WorkflowAttestationService` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowBindingCandidates.js](../../modules/workflow-runtime/server/workflowRuntime/workflowBindingCandidates.js) | 运行、调度或服务 | `CONTROL_KINDS`, `candidateId`, `defaultControl`, `compatibleControlKinds`, `bindingDefault`, `deriveBindingCandidates`, `deriveBindingSetBindings` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowBindingCompilation.js](../../modules/workflow-runtime/server/workflowRuntime/workflowBindingCompilation.js) | 运行、调度或服务 | `compileWorkflowBindings` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowBindingCompiler.js](../../modules/workflow-runtime/server/workflowRuntime/workflowBindingCompiler.js) | 运行、调度或服务 | `deriveBindingCandidates`, `deriveBindingSetBindings`, `compileWorkflowBindings`, `resolvePublicBindingValues`, `toBindingCandidateDto`, `toBindingSetDto`, `WorkflowBindingError`, `isBindingRequiredForDeployment`, `BINDING_VALUE_LIMITS` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowBindingDto.js](../../modules/workflow-runtime/server/workflowRuntime/workflowBindingDto.js) | 运行、调度或服务 | `toBindingCandidateDto`, `publicOptionId`, `looksSensitiveString`, `safePublicText`, `safeOptionLabel`, `toBindingSetDto`, `resolvePublicBindingValues` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowBindingValidation.js](../../modules/workflow-runtime/server/workflowRuntime/workflowBindingValidation.js) | 协议、校验或数据规则 | `DANGEROUS_KEYS`, `KEY_PATTERN`, `REQUEST_LIMITS`, `WorkflowBindingError`, `isPlainObject`, `define`, `cloneNullPrototype`, `assertSafeKey`, `assertSafeText`, `assertNoDangerousKeys`, `assertRequestBudgets`, `isConnection`, `validateNumber`, `validateAssetReference`, `validateScalarValue`, `assertReferences`, `isBindingRequiredForDeployment` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowCanvasNodeService.js](../../modules/workflow-runtime/server/workflowRuntime/workflowCanvasNodeService.js) | 运行、调度或服务 | `WorkflowCanvasNodeError`, `WorkflowCanvasNodeService` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowComparison.js](../../modules/workflow-runtime/server/workflowRuntime/workflowComparison.js) | 运行、调度或服务 | `compareUiAndApiWorkflows` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowConfigurationStore.js](../../modules/workflow-runtime/server/workflowRuntime/workflowConfigurationStore.js) | 存储访问或状态管理 | `WorkflowConfigurationError`, `WorkflowConfigurationStore`, `toDeploymentDto` | 含 文件系统 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowDefinitionStore.js](../../modules/workflow-runtime/server/workflowRuntime/workflowDefinitionStore.js) | 存储访问或状态管理 | `WorkflowDefinitionStoreError`, `WorkflowDefinitionStore` | 含 文件系统 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowDeploymentService.js](../../modules/workflow-runtime/server/workflowRuntime/workflowDeploymentService.js) | 运行、调度或服务 | `WorkflowDeploymentError`, `createStableCapabilityProjection`, `createPortableWorkflowProjection`, `WorkflowDeploymentService`, `isWorkflowRuntimeDomainError` | 含 文件系统 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowEditorSnapshotService.js](../../modules/workflow-runtime/server/workflowRuntime/workflowEditorSnapshotService.js) | 运行、调度或服务 | `WorkflowEditorSnapshotService` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowFormat.js](../../modules/workflow-runtime/server/workflowRuntime/workflowFormat.js) | 协议、校验或数据规则 | `analyzeWorkflow`, `createCapabilityProjection`, `detectWorkflowFormat`, `normalizeApiWorkflow`, `parseWorkflowArtifact`, `compareUiAndApiWorkflows`, `WORKFLOW_LIMITS`, `WorkflowFormatError`, `canonicalJson`, `sha256Bytes`, `sha256Json` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowGraphShape.js](../../modules/workflow-runtime/server/workflowRuntime/workflowGraphShape.js) | 运行、调度或服务 | `UI_ONLY_NODE_TYPES`, `UI_REROUTE_NODE_TYPES`, `UI_PRIMITIVE_NODE_TYPES`, `OUTPUT_NODE_TYPES`, `linkId`, `linkEndpoints`, `connectionTarget`, `positionPair`, `groupBounds`, `uiGroups`, `groupForNode`, `slotAt`, `linkType`, `normalizedConnectionType`, `concreteConnectionTypesMatch`, `primitiveWidgetValue` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowJson.js](../../modules/workflow-runtime/server/workflowRuntime/workflowJson.js) | 运行、调度或服务 | `WORKFLOW_LIMITS`, `WorkflowFormatError`, `isPlainObject`, `assertJsonDepth`, `sha256Bytes`, `canonicalValue`, `canonicalJson`, `sha256Json` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowLibraryRouter.js](../../modules/workflow-runtime/server/workflowRuntime/workflowLibraryRouter.js) | HTTP 转换与校验 | `WORKFLOW_IMPORT_REQUEST_LIMIT`, `readResponseTextWithLimit`, `fetchObjectInfo`, `createWorkflowLibraryRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowMediaCompatibility.js](../../modules/workflow-runtime/server/workflowRuntime/workflowMediaCompatibility.js) | 运行、调度或服务 | `inspectWorkflowMedia`, `convertedIntegrity`, `runWorkflowConversion`, `prepareWorkflowCompatibility` | 含 文件系统、子进程 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowNodeSchema.js](../../modules/workflow-runtime/server/workflowRuntime/workflowNodeSchema.js) | 协议、校验或数据规则 | `MODEL_FIELDS`, `directSchemaInput`, `conditionalSchemaInput`, `autogrowSchemaInput`, `schemaInput`, `schemaOptions`, `schemaType`, `mediaKindFor`, `controlFor`, `candidateBinding`, `definitionFieldOrder`, `acceptsWidgetValue`, `explicitSchemaDefault` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowOutputLocalizer.js](../../modules/workflow-runtime/server/workflowRuntime/workflowOutputLocalizer.js) | 运行、调度或服务 | `optimizeMp4ForStreaming`, `localizeWorkflowOutputs`, `recoverWorkflowOutputStaging` | 含 文件系统、子进程 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowOutputPublication.js](../../modules/workflow-runtime/server/workflowRuntime/workflowOutputPublication.js) | 运行、调度或服务 | `publishWorkflowOutputs`, `workflowPublicationResult` | 含 文件系统 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowOutputs.js](../../modules/workflow-runtime/server/workflowRuntime/workflowOutputs.js) | 运行、调度或服务 | `WorkflowOutputError`, `classifyHistoryState`, `normalizeHistoryOutputs`, `normalizeAvailableHistoryOutputs`, `toOutputCandidateDto` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowRunResult.js](../../modules/workflow-runtime/server/workflowRuntime/workflowRunResult.js) | 运行、调度或服务 | `WorkflowRunResultError`, `projectWorkflowRunReceipt`, `validateWorkflowRunReceipt` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowRunStore.js](../../modules/workflow-runtime/server/workflowRuntime/workflowRunStore.js) | 存储访问或状态管理 | `WorkflowRunStoreError`, `WorkflowRunStore` | 含 文件系统 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowRuntimeRouter.js](../../modules/workflow-runtime/server/workflowRuntime/workflowRuntimeRouter.js) | HTTP 转换与校验 | `createWorkflowRuntimeRouter`, `WORKFLOW_RUNTIME_ERRORS` | 含 HTTP/网络 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowSeedPolicy.js](../../modules/workflow-runtime/server/workflowRuntime/workflowSeedPolicy.js) | 协议、校验或数据规则 | `randomInteger`, `resolveSeedValue` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowStoragePaths.js](../../modules/workflow-runtime/server/workflowRuntime/workflowStoragePaths.js) | 运行、调度或服务 | `resolveWorkflowStorageDirectory`, `assertWorkflowStorageIsPrivate` | 含 文件系统 调用；时机见实现 |
| [modules/workflow-runtime/server/workflowRuntime/workflowTestRunService.js](../../modules/workflow-runtime/server/workflowRuntime/workflowTestRunService.js) | 运行、调度或服务 | `WorkflowTestRunError`, `WorkflowTestRunService` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowUiCompiler.js](../../modules/workflow-runtime/server/workflowRuntime/workflowUiCompiler.js) | 运行、调度或服务 | `compileUiWorkflow`, `analyzeUiWorkflow` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowUiLinks.js](../../modules/workflow-runtime/server/workflowRuntime/workflowUiLinks.js) | 运行、调度或服务 | `validateUiLinkSemantics`, `validateUiLinkRuntimeSemantics` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowUiProjection.js](../../modules/workflow-runtime/server/workflowRuntime/workflowUiProjection.js) | 运行、调度或服务 | `projectUiExecutionGraph` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowVariableAssetCompiler.js](../../modules/workflow-runtime/server/workflowRuntime/workflowVariableAssetCompiler.js) | 运行、调度或服务 | `nextNumericNodeId`, `assertVariableGroupIntegrity`, `compileVariableAssetGroup`, `objectInfoWithAssetValues` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/server/workflowRuntime/workflowVariableAssetGroups.js](../../modules/workflow-runtime/server/workflowRuntime/workflowVariableAssetGroups.js) | 运行、调度或服务 | `DYNAMIC_ASSET_LOADER_CLASSES`, `deriveVariableAssetGroupCandidates` | 未检出平台调用；不等于纯函数证明 |
| [modules/workflow-runtime/serverPlugin.js](../../modules/workflow-runtime/serverPlugin.js) | 模块入口或装配 | `default` | 含 HTTP/网络、服务注册/生命周期 调用；时机见实现 |

<!-- source-inventory:end -->
