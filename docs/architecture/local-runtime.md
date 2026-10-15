# Local Runtime

## 职责与边界

平台适配层负责 ComfyUI 发现/进程/扩展、GPU/模型检测、Dreamina/LibTV CLI，以及本地运行时设置与工作流界面贡献。不得被画布静态导入底层 API。服务器入口 serverPlugin 注册 local.runtime；浏览器入口 [browser.ts](../../modules/local-runtime/browser.ts) 注册 ui.local-runtime。

## 接口契约

local.runtime 实现 [LocalRuntimeService](../../modules/contracts/localRuntimeService.d.ts)，发布 providerConfiguration({waitForFresh}) 来源认证可用性与 selectDirectory 查询，不暴露 ComfyUI 控制器或 CLI 安装器/运行实例。独立 [directoryPlugin.js](../../modules/local-runtime/directoryPlugin.js) 在媒体启动前注册 platform.directories，仅提供 selectDirectory({description?})，返回用户选择路径；取消以 DIRECTORY_PICKER_CANCELLED/409 拒绝，不支持的平台返回 DIRECTORY_PICKER_UNAVAILABLE/501。filesystem 经 kernel 调用，避免依赖完整 local-runtime 与媒体之间形成循环。实际进程与登录操作经 /api/local-runtime、/api/comfy 等受限 HTTP 入口；目录选择和安装由显式用户操作触发。

contracts 的 [LocalRuntimeUiService](../../modules/contracts/localRuntimeUi.ts) 提供 createWorkflowClient/mountSettings/requestWorkflowNodeRun/renderWorkflowNode。画布通过 kernel.localRuntimeUi 获取，根插件声明必需依赖；节点执行请求交给原挂载节点 owner，不创建第二个执行器。公共客户端 DTO 在 contracts/workflowClient、workflowCanvas、workflowCanvasNodeProtocol。

部分旧 localRuntimeClient 类型仍位于模块内部并从 api 导出，需后续收敛；工作流管理 UI 实际位于本模块，不能把目标目录当成已迁移。

## 数据模型

进程状态包含 running/owned/startable、pid、phase、服务地址及诊断；只有本应用拥有的进程才按其生命周期清理。CLI 安装及 OAuth 状态位于当前用户 private/tools，而非全局 HOME。模型目录来自显式配置或宿主路径，扫描结果不包含密钥。

工作流 UI session 记录定义、部署、绑定、上传和观察令牌。mounted 节点的运行回执/种子推进按当前项目和定义身份应用，切换或卸载后迟到响应不能写回。真实工作流持久化及执行属于 workflow-runtime 与 executor 插件。

## 功能结构

ComfyUI 就绪检测以 system_stats 为准，完整 object_info 用于兼容性与模型检查；先发现、再按用户自动启动配置 ensureReady。扩展安装使用应用随附源码和已选目录，CLI 安装维护固定版本及隔离私有路径。

工作流界面由 manager、library/deployment/binding/output 等视图辅助与节点 session 组成。UI 服务挂载返回释放函数，关闭时停止本视图事件与观察。预检、暂存、提交与恢复使用同一 workflow.runtime 服务，不靠前端重复跑任务。FFmpeg/Sharp 媒体处理位于媒体插件，下载/打包引导脚本独立归类。

CanvasWorkflowGenerator 保留外壳，canvasWorkflowGeneratorModel 维护会话和展示状态；Field/Inputs/Settings/Chrome/PortsRender 分别负责字段、素材、配置、状态/操作与端口呈现。ComfyClient 与现用本地生成 Router 的日志改用 kernel Logger，记录任务/项目标识，避免输出原始目录与下载地址。
contracts/localRuntimeErrors 集中本地与工作流错误工厂，日志通过 kernel Logger。ComfyUI 进程控制与 CLI 安装以 service/class 分担职责，Dreamina 浏览器启动单独实现；日志面板、进程控制、RunningHub 管理和工作流测试的渲染/绑定辅助已拆分，取消、身份及 owner 校验留在原调用链。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/local-runtime/browser.manifest.json](../../modules/local-runtime/browser.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/local-runtime/browser.ts](../../modules/local-runtime/browser.ts) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/local-runtime/directory.manifest.json](../../modules/local-runtime/directory.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/local-runtime/directoryPlugin.js](../../modules/local-runtime/directoryPlugin.js) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/local-runtime/exports.json](../../modules/local-runtime/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/local-runtime/server.manifest.json](../../modules/local-runtime/server.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/local-runtime/server/comfyui/comfyClient.js](../../modules/local-runtime/server/comfyui/comfyClient.js) | 客户端或传输 | `comfyClient` | 含 文件系统、HTTP/网络 调用；时机见实现 |
| [modules/local-runtime/server/comfyui/comfyOperationReceipts.js](../../modules/local-runtime/server/comfyui/comfyOperationReceipts.js) | 运行、调度或服务 | `createComfyOperationReceipts` | 含 文件系统 调用；时机见实现 |
| [modules/local-runtime/server/comfyui/comfyWorkflowRouter.js](../../modules/local-runtime/server/comfyui/comfyWorkflowRouter.js) | HTTP 转换与校验 | `createComfyWorkflowRouter`, `ComfyWorkflowError` | 含 文件系统、HTTP/网络 调用；时机见实现 |
| [modules/local-runtime/server/comfyui/legacyComfyGenerationRouter.js](../../modules/local-runtime/server/comfyui/legacyComfyGenerationRouter.js) | HTTP 转换与校验 | `createLegacyComfyGenerationRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/local-runtime/server/comfyui/workflowRegistry.js](../../modules/local-runtime/server/comfyui/workflowRegistry.js) | 运行、调度或服务 | `WORKFLOW_REGISTRY` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/server/comfyui/workflowRequirements.js](../../modules/local-runtime/server/comfyui/workflowRequirements.js) | 运行、调度或服务 | `extractWorkflowRequirements`, `loadWorkflowRequirements` | 含 文件系统 调用；时机见实现 |
| [modules/local-runtime/server/comfyui/workflows/MiniMax-H3-T2VA-api.json](../../modules/local-runtime/server/comfyui/workflows/MiniMax-H3-T2VA-api.json) | 类型或数据定义 | 声明式配置 | 无业务运行副作用 |
| [modules/local-runtime/server/comfyui/workflows/MiniMax-H3-T2VA.js](../../modules/local-runtime/server/comfyui/workflows/MiniMax-H3-T2VA.js) | 运行、调度或服务 | `MINIMAX_H3_MODES`, `canonicalizeMiniMaxH3Mentions`, `prepareMiniMaxH3T2VAWorkflow` | 含 文件系统 调用；时机见实现 |
| [modules/local-runtime/server/local/comfyDiscovery.js](../../modules/local-runtime/server/local/comfyDiscovery.js) | 运行、调度或服务 | `discoverComfyInstallations` | 含 文件系统 调用；时机见实现 |
| [modules/local-runtime/server/local/comfyExtensionInstaller.js](../../modules/local-runtime/server/local/comfyExtensionInstaller.js) | 运行、调度或服务 | `ComfyExtensionInstallError`, `createComfyExtensionInstaller`, `COMFY_NODE_ID_EXTENSION_FILES` | 含 文件系统 调用；时机见实现 |
| [modules/local-runtime/server/local/comfyProcess.js](../../modules/local-runtime/server/local/comfyProcess.js) | 运行、调度或服务 | `parseExtraArgs`, `readComfyLaunchConfig`, `resolveComfyAddress`, `detectComfyInstallation`, `buildComfyLaunchArgs`, `buildComfySpawnOptions`, `isProcessAliveDefault`, `inspectProcessDefault`, `openComfyLogTargetsDefault`, `readComfyLogTail`, `isPortFreeDefault`, `terminateProcessDefault`, `openComfyBrowserDefault`, `isOwnedComfyProcess`, `createComfyProcessController` | 含 文件系统、子进程 调用；时机见实现 |
| [modules/local-runtime/server/local/controllerExitGuard.cjs](../../modules/local-runtime/server/local/controllerExitGuard.cjs) | 运行、调度或服务 | 内部实现 | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/server/local/dreaminaBrowser.js](../../modules/local-runtime/server/local/dreaminaBrowser.js) | 运行、调度或服务 | `defaultOpenBrowser` | 含 文件系统、子进程 调用；时机见实现 |
| [modules/local-runtime/server/local/dreaminaCliInstaller.js](../../modules/local-runtime/server/local/dreaminaCliInstaller.js) | 运行、调度或服务 | `DreaminaCliInstallError`, `createDreaminaCliInstaller`, `DREAMINA_CLI_OFFICIAL_INSTALL_COMMAND` | 含 文件系统、子进程、HTTP/网络 调用；时机见实现 |
| [modules/local-runtime/server/local/libTvCliRuntime.js](../../modules/local-runtime/server/local/libTvCliRuntime.js) | 运行、调度或服务 | `libTvError`, `createLibTvCliRuntime`, `createLibTvCliRouter` | 含 文件系统、子进程、HTTP/网络 调用；时机见实现 |
| [modules/local-runtime/server/local/localRuntimeProbes.js](../../modules/local-runtime/server/local/localRuntimeProbes.js) | 运行、调度或服务 | `probeNvidiaGpu`, `probeComfyReady`, `probeComfyServer` | 含 子进程、HTTP/网络 调用；时机见实现 |
| [modules/local-runtime/server/local/localRuntimeRouter.js](../../modules/local-runtime/server/local/localRuntimeRouter.js) | HTTP 转换与校验 | `createLocalRuntimeRouter` | 含 文件系统、HTTP/网络 调用；时机见实现 |
| [modules/local-runtime/server/platform/directoryPicker.js](../../modules/local-runtime/server/platform/directoryPicker.js) | 运行、调度或服务 | `selectDirectoryWithSystemDialog` | 含 子进程 调用；时机见实现 |
| [modules/local-runtime/serverPlugin.js](../../modules/local-runtime/serverPlugin.js) | 模块入口或装配 | `default` | 含 HTTP/网络、服务注册/生命周期 调用；时机见实现 |
| [modules/local-runtime/ui/local/appendWorkflowBindingSection.ts](../../modules/local-runtime/ui/local/appendWorkflowBindingSection.ts) | 运行、调度或服务 | `appendWorkflowBindingSection` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/appendWorkflowCards.ts](../../modules/local-runtime/ui/local/appendWorkflowCards.ts) | 界面呈现与交互 | `appendWorkflowCards` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/appendWorkflowCoverMedia.ts](../../modules/local-runtime/ui/local/appendWorkflowCoverMedia.ts) | 运行、调度或服务 | `appendWorkflowCoverMedia` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/appendWorkflowRunProgress.ts](../../modules/local-runtime/ui/local/appendWorkflowRunProgress.ts) | 运行、调度或服务 | `appendWorkflowRunProgress` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/appendWorkflowTestAssets.ts](../../modules/local-runtime/ui/local/appendWorkflowTestAssets.ts) | 运行、调度或服务 | `appendWorkflowTestAssets` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/appendWorkflowVerificationRecord.ts](../../modules/local-runtime/ui/local/appendWorkflowVerificationRecord.ts) | 运行、调度或服务 | `appendWorkflowVerificationRecord` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/applyWorkflowSnapshot.ts](../../modules/local-runtime/ui/local/applyWorkflowSnapshot.ts) | 运行、调度或服务 | `applyWorkflowSnapshot` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/bindWorkflowAssetLibrary.ts](../../modules/local-runtime/ui/local/bindWorkflowAssetLibrary.ts) | 运行、调度或服务 | `bindWorkflowAssetLibrary` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/bindWorkflowFileInputs.ts](../../modules/local-runtime/ui/local/bindWorkflowFileInputs.ts) | 运行、调度或服务 | `bindWorkflowFileInputs` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/bindWorkflowParameterSave.ts](../../modules/local-runtime/ui/local/bindWorkflowParameterSave.ts) | 运行、调度或服务 | `bindWorkflowParameterSave` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/canvasWorkflowChromeRender.tsx](../../modules/local-runtime/ui/local/canvasWorkflowChromeRender.tsx) | 界面呈现与交互 | `renderWorkflowHeader`, `renderWorkflowPrompt`, `renderWorkflowPrimaryProgress`, `renderWorkflowError`, `renderWorkflowFooter` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/canvasWorkflowFieldRender.tsx](../../modules/local-runtime/ui/local/canvasWorkflowFieldRender.tsx) | 界面呈现与交互 | `renderWorkflowField` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/canvasWorkflowGenerator.tsx](../../modules/local-runtime/ui/local/canvasWorkflowGenerator.tsx) | 运行、调度或服务 | `CanvasWorkflowGenerator` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/canvasWorkflowGeneratorModel.ts](../../modules/local-runtime/ui/local/canvasWorkflowGeneratorModel.ts) | 运行、调度或服务 | `Runtime`, `Parameter`, `Props`, `asRecord`, `isTextParameter`, `connectedNodeText`, `workflowControlStyle`, `useWorkflowGeneratorModel`, `WorkflowGeneratorModel` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/canvasWorkflowInputsRender.tsx](../../modules/local-runtime/ui/local/canvasWorkflowInputsRender.tsx) | 界面呈现与交互 | `renderWorkflowSlotCard`, `renderWorkflowOpenSlot` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/canvasWorkflowPortsRender.tsx](../../modules/local-runtime/ui/local/canvasWorkflowPortsRender.tsx) | 界面呈现与交互 | `renderWorkflowInputPorts`, `renderWorkflowOutputPorts` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/canvasWorkflowSettingsRender.tsx](../../modules/local-runtime/ui/local/canvasWorkflowSettingsRender.tsx) | 界面呈现与交互 | `renderWorkflowSettings` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/comfyDirectoryGuide.ts](../../modules/local-runtime/ui/local/comfyDirectoryGuide.ts) | 运行、调度或服务 | `createComfyDirectoryGuide` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/comfyDiscoveryControls.ts](../../modules/local-runtime/ui/local/comfyDiscoveryControls.ts) | 运行、调度或服务 | `createComfyDiscoveryControls` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/comfyLogPanel.ts](../../modules/local-runtime/ui/local/comfyLogPanel.ts) | 界面呈现与交互 | `ComfyPanelPhase`, `readComfyPhase`, `createComfyLogPanel`, `installComfyLogPanel` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/comfyLogPanelView.ts](../../modules/local-runtime/ui/local/comfyLogPanelView.ts) | 界面呈现与交互 | `createComfyLogPanelView` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/createWorkflowAssetControl.ts](../../modules/local-runtime/ui/local/createWorkflowAssetControl.ts) | 运行、调度或服务 | `createWorkflowAssetControl` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/createWorkflowBindingNameEditor.ts](../../modules/local-runtime/ui/local/createWorkflowBindingNameEditor.ts) | 运行、调度或服务 | `createWorkflowBindingNameEditor` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/createWorkflowCard.ts](../../modules/local-runtime/ui/local/createWorkflowCard.ts) | 界面呈现与交互 | `createWorkflowCard` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/createWorkflowLibraryActions.ts](../../modules/local-runtime/ui/local/createWorkflowLibraryActions.ts) | 运行、调度或服务 | `createWorkflowLibraryActions` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/createWorkflowManagerActions.ts](../../modules/local-runtime/ui/local/createWorkflowManagerActions.ts) | 运行、调度或服务 | `createWorkflowManagerActions` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/createWorkflowManagerView.ts](../../modules/local-runtime/ui/local/createWorkflowManagerView.ts) | 界面呈现与交互 | `createWorkflowManagerView` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/createWorkflowStageRenderers.ts](../../modules/local-runtime/ui/local/createWorkflowStageRenderers.ts) | 界面呈现与交互 | `createWorkflowStageRenderers` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/createWorkflowValueControl.ts](../../modules/local-runtime/ui/local/createWorkflowValueControl.ts) | 运行、调度或服务 | `createWorkflowValueControl` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/firstRunCheck.ts](../../modules/local-runtime/ui/local/firstRunCheck.ts) | 运行、调度或服务 | `createFirstRunPanel`, `installFirstRunCheck` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/hydrateWorkflowDefinition.ts](../../modules/local-runtime/ui/local/hydrateWorkflowDefinition.ts) | 运行、调度或服务 | `hydrateWorkflowDefinition` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/importWorkflowFiles.ts](../../modules/local-runtime/ui/local/importWorkflowFiles.ts) | 运行、调度或服务 | `importWorkflowFiles` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/installWorkflowManager.ts](../../modules/local-runtime/ui/local/installWorkflowManager.ts) | 运行、调度或服务 | `installWorkflowManager` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/loadRequestedWorkflow.ts](../../modules/local-runtime/ui/local/loadRequestedWorkflow.ts) | 运行、调度或服务 | `loadRequestedWorkflow` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/loadWorkflowRecords.ts](../../modules/local-runtime/ui/local/loadWorkflowRecords.ts) | 运行、调度或服务 | `loadWorkflowRecords` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/localRuntimeClient.ts](../../modules/local-runtime/ui/local/localRuntimeClient.ts) | 客户端或传输 | `RuntimeDiagnostic`, `LocalRuntimeStatus`, `ComfyProcessState`, `ComfyDirectorySelectionResult`, `ComfyLogStream`, `ComfyLogs`, `ComfyProcessResult`, `ComfyNodeIdExtensionStatus`, `ComfyNodeIdExtensionInstallResult`, `createLocalRuntimeClient`, `LocalRuntimeClient`, `installLocalRuntimeClient` | 含 HTTP/网络 调用；时机见实现 |
| [modules/local-runtime/ui/local/localRuntimeSettings.ts](../../modules/local-runtime/ui/local/localRuntimeSettings.ts) | 运行、调度或服务 | `mountLocalRuntimeSettings` | 含 DOM/事件、服务注册/生命周期 调用；时机见实现 |
| [modules/local-runtime/ui/local/officialWorkflowGallery.ts](../../modules/local-runtime/ui/local/officialWorkflowGallery.ts) | 运行、调度或服务 | `createOfficialWorkflowGallery`, `officialWorkflowStyles` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/openWorkflowDeleteDialog.ts](../../modules/local-runtime/ui/local/openWorkflowDeleteDialog.ts) | 界面呈现与交互 | `openWorkflowDeleteDialog` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/openWorkflowPresentation.ts](../../modules/local-runtime/ui/local/openWorkflowPresentation.ts) | 运行、调度或服务 | `openWorkflowPresentation` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/persistWorkflowBindingLabels.ts](../../modules/local-runtime/ui/local/persistWorkflowBindingLabels.ts) | 运行、调度或服务 | `persistWorkflowBindingLabels` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/pollWorkflowRun.ts](../../modules/local-runtime/ui/local/pollWorkflowRun.ts) | 运行、调度或服务 | `pollWorkflowRun` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/renderWorkflowBindings.ts](../../modules/local-runtime/ui/local/renderWorkflowBindings.ts) | 界面呈现与交互 | `renderWorkflowBindings` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/renderWorkflowCleanup.ts](../../modules/local-runtime/ui/local/renderWorkflowCleanup.ts) | 界面呈现与交互 | `renderWorkflowCleanup` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/renderWorkflowDeployment.ts](../../modules/local-runtime/ui/local/renderWorkflowDeployment.ts) | 界面呈现与交互 | `renderWorkflowDeployment` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/renderWorkflowLibraryHome.ts](../../modules/local-runtime/ui/local/renderWorkflowLibraryHome.ts) | 界面呈现与交互 | `renderWorkflowLibraryHome` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/renderWorkflowLoadState.ts](../../modules/local-runtime/ui/local/renderWorkflowLoadState.ts) | 界面呈现与交互 | `renderWorkflowLoadState` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/renderWorkflowOutputs.ts](../../modules/local-runtime/ui/local/renderWorkflowOutputs.ts) | 界面呈现与交互 | `renderWorkflowOutputs` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/renderWorkflowSource.ts](../../modules/local-runtime/ui/local/renderWorkflowSource.ts) | 界面呈现与交互 | `renderWorkflowSource` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/renderWorkflowStages.ts](../../modules/local-runtime/ui/local/renderWorkflowStages.ts) | 界面呈现与交互 | `renderWorkflowStages` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/renderWorkflowTest.ts](../../modules/local-runtime/ui/local/renderWorkflowTest.ts) | 界面呈现与交互 | `renderWorkflowTest` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/restoreWorkflowLibrary.ts](../../modules/local-runtime/ui/local/restoreWorkflowLibrary.ts) | 运行、调度或服务 | `restoreWorkflowLibrary` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/runningHubControls.ts](../../modules/local-runtime/ui/local/runningHubControls.ts) | 运行、调度或服务 | `RUNNINGHUB_CN_KEY_URL`, `RUNNINGHUB_GLOBAL_KEY_URL`, `control`, `configureApiTokenInput`, `externalControl`, `message`, `stageHeading` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/runningHubLibraryRender.ts](../../modules/local-runtime/ui/local/runningHubLibraryRender.ts) | 界面呈现与交互 | `createRunningHubLibraryCard`, `renderRunningHubCategories` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/runningHubManagerView.ts](../../modules/local-runtime/ui/local/runningHubManagerView.ts) | 界面呈现与交互 | `createRunningHubManagerView` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/runningHubQuickCredentials.ts](../../modules/local-runtime/ui/local/runningHubQuickCredentials.ts) | 运行、调度或服务 | `appendRunningHubQuickCredentials` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/runningHubWebAppManager.ts](../../modules/local-runtime/ui/local/runningHubWebAppManager.ts) | 运行、调度或服务 | `RUNNINGHUB_WEBAPP_TEST_EVENT`, `parseRunningHubWebAppReference`, `createRunningHubQuickAdd`, `createRunningHubWebAppManager` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/syncWorkflowCanvasNode.ts](../../modules/local-runtime/ui/local/syncWorkflowCanvasNode.ts) | 运行、调度或服务 | `syncWorkflowCanvasNode` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/workflowCanvasNodes.ts](../../modules/local-runtime/ui/local/workflowCanvasNodes.ts) | 运行、调度或服务 | `createWorkflowCanvasNodes`, `installWorkflowCanvasNodes`, `WORKFLOW_CANVAS_INPUT_NODE_EVENT`, `WORKFLOW_CANVAS_INSERTED_EVENT`, `applyWorkflowSeedAdvancements`, `normalizeNumericParameterValues`, `workflowErrorSummary`, `workflowMediaKindLabel`, `expandWorkflowInputSlots`, `expandWorkflowStorageSlots`, `buildWorkflowCanvasValues`, `WorkflowCanvasExampleInsertion`, `WorkflowCanvasInputSlot`, `WorkflowCanvasInsertionResult`, `WorkflowCanvasNodeRecord`, `WorkflowCanvasNodesAdapter`, `WorkflowCanvasOutputValue`, `WorkflowCanvasUploadedInputNode`, `WorkflowVerifiedCanvasInsertion` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowClientTransport.ts](../../modules/local-runtime/ui/local/workflowClientTransport.ts) | 客户端或传输 | `request`, `fileToBase64`, `mediaAssetType`, `mediaContentType` | 含 HTTP/网络 调用；时机见实现 |
| [modules/local-runtime/ui/local/workflowManager.ts](../../modules/local-runtime/ui/local/workflowManager.ts) | 运行、调度或服务 | `createWorkflowManager`, `WORKFLOW_LIBRARY_EVENT`, `WORKFLOW_PARAMETER_EDITOR_EVENT`, `observeWorkflowRun`, `terminalRunNotice`, `workflowRunProgressLabel` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowManagerBindings.ts](../../modules/local-runtime/ui/local/workflowManagerBindings.ts) | 运行、调度或服务 | `currentStage`, `stageReachable`, `safeKey`, `bindingForCandidate`, `needsVariableAssetUpgrade`, `suggestedBindingLabel`, `quickBindingCandidates`, `bindingSource`, `latestBindingDescendant`, `autoPair` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowManagerClient.ts](../../modules/local-runtime/ui/local/workflowManagerClient.ts) | 客户端或传输 | `RunningHubInstanceType`, `WorkflowCanvasBlueprint`, `WorkflowCanvasMediaKind`, `RunningHubWebAppCard`, `RunningHubWebAppCategory`, `RunningHubWebAppClient`, `RunningHubWebAppLibrary`, `WorkflowCanvasClient`, `WorkflowManagerClient`, `BindingCandidate`, `BindingSet`, `OfficialWorkflow`, `OutputCandidate`, `WorkflowAttestation`, `WorkflowDefinition`, `WorkflowDeploymentDto`, `WorkflowEditorSnapshot`, `WorkflowOutputBindingSet`, `WorkflowRun`, `WorkflowSeedAdvancement`, `createWorkflowManagerClient` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowManagerControls.ts](../../modules/local-runtime/ui/local/workflowManagerControls.ts) | 运行、调度或服务 | `button`, `field`, `messageFor`, `assetControlPresentation` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowManagerEvents.ts](../../modules/local-runtime/ui/local/workflowManagerEvents.ts) | 运行、调度或服务 | `HOST_ATTRIBUTE`, `WORKFLOW_PARAMETER_EDITOR_EVENT`, `WORKFLOW_LIBRARY_EVENT`, `STAGES` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowManagerMetadata.ts](../../modules/local-runtime/ui/local/workflowManagerMetadata.ts) | 运行、调度或服务 | `incompleteExportNotice`, `focusInsertedWorkflow`, `isRunningHubRunner`, `isCloudDefinition`, `automaticWorkflowCover`, `enrichVerifiedAssetValues` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowManagerPanelControls.ts](../../modules/local-runtime/ui/local/workflowManagerPanelControls.ts) | 界面呈现与交互 | `panelHeading`, `createWorkflowNodeTitleControl` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowManagerStyles.ts](../../modules/local-runtime/ui/local/workflowManagerStyles.ts) | 运行、调度或服务 | `STYLE_ID`, `injectStyles` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/workflowManagerTypes.ts](../../modules/local-runtime/ui/local/workflowManagerTypes.ts) | 协议、校验或数据规则 | `StageIndex`, `WorkflowManagerOptions`, `DeployedWorkflowRecord`, `ManagerState`, `WorkflowManagerSession` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeComposition.ts](../../modules/local-runtime/ui/local/workflowNodeComposition.ts) | 运行、调度或服务 | `createWorkflowCanvasNodes`, `installWorkflowCanvasNodes` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeContext.ts](../../modules/local-runtime/ui/local/workflowNodeContext.ts) | 运行、调度或服务 | `WorkflowCanvasOperationContext` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeExampleOperations.ts](../../modules/local-runtime/ui/local/workflowNodeExampleOperations.ts) | 运行、调度或服务 | `createWorkflowExampleOperations` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeExamples.ts](../../modules/local-runtime/ui/local/workflowNodeExamples.ts) | 运行、调度或服务 | `WORKFLOW_EXAMPLE_STORAGE_KEY`, `WORKFLOW_EXAMPLE_MAX_BYTES`, `WORKFLOW_EXAMPLE_MAX_NODES`, `WORKFLOW_EXAMPLE_NODE_TYPES`, `WorkflowExampleNodeTemplate`, `WorkflowExampleInputBinding`, `WorkflowExampleBundle`, `safeExampleString`, `safeExampleNumber`, `exampleNodeData`, `loadWorkflowExampleBundles`, `saveWorkflowExampleBundles` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeExecution.ts](../../modules/local-runtime/ui/local/workflowNodeExecution.ts) | 运行、调度或服务 | `createWorkflowNodeObserver`, `createWorkflowRunOperations` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeGeometry.ts](../../modules/local-runtime/ui/local/workflowNodeGeometry.ts) | 运行、调度或服务 | `expandedWorkflowHeight`, `workflowErrorHeight`, `compactWorkflowPortY`, `createWorkflowPortOperations` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeInsertion.ts](../../modules/local-runtime/ui/local/workflowNodeInsertion.ts) | 运行、调度或服务 | `WORKFLOW_CANVAS_INSERT_REQUEST_EVENT`, `WORKFLOW_CANVAS_INSERTED_EVENT`, `WORKFLOW_CANVAS_INPUT_NODE_EVENT`, `createWorkflowCanvasInsertion` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/workflowNodeParameters.ts](../../modules/local-runtime/ui/local/workflowNodeParameters.ts) | 运行、调度或服务 | `normalizeSelectParameterValues`, `finiteNumericValue`, `applyWorkflowSeedAdvancements`, `normalizeNumericParameterValues` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodePresentation.ts](../../modules/local-runtime/ui/local/workflowNodePresentation.ts) | 运行、调度或服务 | `TYPE_MEDIA`, `WORKFLOW_MEDIA_KIND_LABELS`, `workflowMediaKindLabel`, `workflowErrorSummary`, `canvasRunningHubInstanceType`, `finiteNumber`, `inputPorts`, `outputPorts`, `parameterSchema`, `isTextParameter`, `isCloudWorkflowNode`, `mediaKindForNode`, `mediaKindsCompatible` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeReceipts.ts](../../modules/local-runtime/ui/local/workflowNodeReceipts.ts) | 运行、调度或服务 | `TERMINAL_STATUSES`, `publishExternalOutputs`, `publishRunProgress`, `receiptOutputs`, `draftOutputPorts`, `runPatch` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/workflowNodeSession.ts](../../modules/local-runtime/ui/local/workflowNodeSession.ts) | 运行、调度或服务 | `requestWorkflowNodeRun`, `createWorkflowNodeSession`, `useWorkflowNodeSession` | 含 DOM/事件 调用；时机见实现 |
| [modules/local-runtime/ui/local/workflowNodeSlots.ts](../../modules/local-runtime/ui/local/workflowNodeSlots.ts) | 运行、调度或服务 | `workflowInputSlotKey`, `WORKFLOW_MEDIA_ORDER`, `workflowPortOrdinal`, `orderedWorkflowInputPorts`, `compareWorkflowSlots`, `expandWorkflowStorageSlots`, `expandWorkflowInputSlots`, `workflowInputLimitNotice`, `compatibleWorkflowInputSlots`, `resolveAvailableWorkflowInputSlot`, `workflowConnectionLimitNotice` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeStructure.ts](../../modules/local-runtime/ui/local/workflowNodeStructure.ts) | 运行、调度或服务 | `createWorkflowNodeStructure` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeTypes.ts](../../modules/local-runtime/ui/local/workflowNodeTypes.ts) | 协议、校验或数据规则 | `CanvasNode`, `NodePatch` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeUpload.ts](../../modules/local-runtime/ui/local/workflowNodeUpload.ts) | 运行、调度或服务 | `canvasNodeTypeForMedia`, `WorkflowUploadRule`, `WORKFLOW_UPLOAD_RULES`, `workflowUploadRule`, `fileExtension`, `workflowUploadContentType`, `uploadErrorMessage`, `createWorkflowNodeUpload` | 含 HTTP/网络 调用；时机见实现 |
| [modules/local-runtime/ui/local/workflowNodeValues.ts](../../modules/local-runtime/ui/local/workflowNodeValues.ts) | 协议、校验或数据规则 | `localAssetReference`, `outputValue`, `assetFromNode`, `textFromNode`, `buildWorkflowCanvasValues` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowNodeVerifiedInsertion.ts](../../modules/local-runtime/ui/local/workflowNodeVerifiedInsertion.ts) | 运行、调度或服务 | `VerifiedAssetReference`, `verifiedAssetReference`, `verifiedAssetForSlot`, `outputText`, `createWorkflowVerifiedInsertion` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowRunObservation.ts](../../modules/local-runtime/ui/local/workflowRunObservation.ts) | 运行、调度或服务 | `terminalRunNotice`, `workflowRunProgressLabel`, `retryablePollError`, `cleanupObservationPending`, `observeWorkflowRun` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowRunObserver.ts](../../modules/local-runtime/ui/local/workflowRunObserver.ts) | 运行、调度或服务 | `WorkflowRunScope`, `WorkflowViewExpiredError`, `requireWorkflowScope`, `createWorkflowRunObserver` | 未检出平台调用；不等于纯函数证明 |
| [modules/local-runtime/ui/local/workflowRunSession.ts](../../modules/local-runtime/ui/local/workflowRunSession.ts) | 运行、调度或服务 | `RUN_SESSION_KEY`, `persistRunReference`, `readRunReference`, `clearRunReference` | 未检出平台调用；不等于纯函数证明 |

<!-- source-inventory:end -->
