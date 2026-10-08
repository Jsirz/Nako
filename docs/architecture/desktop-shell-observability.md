# Desktop Shell Observability

## 职责与边界

承担平台宿主装配、后端重连、更新控制、节点包加载/隔离进程、节点能力与运行观察。Electron 窗口/IPC 实际入口位于 apps/desktop/src，模块通过公开 api 提供平台能力；kernel 不依赖 Electron 或任何具体平台。

## 接口契约

[serverHost.js](../../modules/desktop-shell-observability/serverHost.js) 创建 PluginHost，装配后端与业务目录、宿主路径、安全凭据和节点注册表。`host.runtime`、`http.routes`、`node.registry`、`node.packages` 由平台宿主注入；业务通过声明服务访问。

[nodeServerPlugin.js](../../modules/desktop-shell-observability/nodeServerPlugin.js) 提供 nodes.runtime；nodeRunRouter 将提交/批准/取消/观察转换到 kernel.NodeRunService。Node SDK 2 的 capability/progress 请求经宿主有限白名单，包代码不接触密钥、任意文件或网络。

节点运行的 `readProject` 与 `project.read` 能力均通过 contracts 的 `ProjectRepository.get(id)` 读取项目；不调用 SQLite 内部方法 `getWorkflowById`。运行准备阶段要求项目已保存并检查 revision；`project.read` 在项目不存在或已删除时返回 `NODE_ERROR.NOT_FOUND`。

桌面更新桥使用 contracts/desktopUpdates.ts，Windows 交接给独立更新程序，macOS 使用 Sparkle 签名 appcast 与原生更新器；更新状态有明确检查、发现、下载和安装阶段。服务注册与跨平台入口来自 desktopPlugin/browser。
异常构造集中到 contracts/desktopErrors，节点仍保留 NODE_ERROR、HTTP status 和 details；隔离进程 IPC 返回结构化 code/status/context。关闭多个资源失败以 DesktopShutdownError 保留 errors 列表。桌面诊断经 kernel Logger，更新下载、交接和退出错误不直接输出 console 或底层敏感内容。

## 数据模型

节点包包含 manifest、受限源码、渲染声明与能力；用户 JavaScript 在独立进程中的 QuickJS 执行，自定义 iframe 使用消息协议与沙箱。运行记录存于 private/node-runs，nodeId/projectId/requestId/stepId 与预算和回执绑定；重启遗留执行为 interrupted，不自动重做付费步骤。

更新信息包含版本、HTTPS 源、下载进度、状态和失败码；下载清单/签名与用户项目数据分离。日志包含模块、运行/节点/执行器身份以及有限子进程错误信息，不把原始错误尾部直接显示前端。应用状态/数据目录见桌面打包说明。

## 功能结构

后端启动：解析配置与 manifest -> 懒加载实现 -> 激活存储/Provider/工作流 -> 宿主与业务 -> 贡献路由。必需依赖被禁用或身份不一致时失败，按 kernel 生命周期清理。

节点运行：校验项目/DAG/schema/能力 -> 批准 -> 固定包和输入快照 -> 隔离执行 -> 宿主能力调用 -> 持久化回执 -> 状态观察。基础生成节点可核对原模型任务并回填；自定义多步图未知状态不自动重跑。

更新控制先等待项目保存；安装失败恢复可恢复后端，不能把下载完成当安装成功。Windows/macOS 打包、签名和部署步骤分别在用户操作文档。静态核查不代替两平台成品、真机更新及重启保留数据验证。

macOS 从 1.5.8 发布单段 Sparkle 差分，客户端仍使用原有检查/确认/下载/安装接口，SUDeltaChainHistory=0 表示不启用多段链。发布脚本 generateSparkleAppcast.mjs 从 GitHub 取得最近两个同架构、已签名的稳定 ZIP，校验基线签名，使用 Sparkle generate_appcast 只为当前版本生成差分，再校验新 ZIP、清单及 .delta 签名。releaseAssets.mjs 校验安装包和差分的 SHA-256，stageRelease.mjs 将验证后的单平台文件暂存到草稿 Release，publishRelease.mjs 在所有平台成功后下载并重新校验完整文件再发布，避免依赖 Actions 产物存储额度；HTTPS 更新源仍需部署同架构完整 ZIP、全部差分和签名清单，最后更新清单。原生 Sparkle 对不适用或失败的差分回退完整包。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/desktop-shell-observability/browser.manifest.json](../../modules/desktop-shell-observability/browser.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/desktop-shell-observability/browser.ts](../../modules/desktop-shell-observability/browser.ts) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/desktop-shell-observability/desktop.manifest.json](../../modules/desktop-shell-observability/desktop.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/desktop-shell-observability/desktop/sparkleAppcast.mjs](../../modules/desktop-shell-observability/desktop/sparkleAppcast.mjs) | 桌面平台适配 | `readSparkleAppcast` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/desktop/sparkleUpdater.mjs](../../modules/desktop-shell-observability/desktop/sparkleUpdater.mjs) | 桌面平台适配 | `createSparkleUpdater` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/desktop/updateController.mjs](../../modules/desktop-shell-observability/desktop/updateController.mjs) | 桌面平台适配 | `createUpdateController` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/desktop/windowsUpdateHandoff.mjs](../../modules/desktop-shell-observability/desktop/windowsUpdateHandoff.mjs) | 桌面平台适配 | `validateInstaller`, `launchWindowsUpdate`, `acknowledgeUpdatedApplication` | 含 文件系统、子进程 调用；时机见实现 |
| [modules/desktop-shell-observability/desktopPlugin.mjs](../../modules/desktop-shell-observability/desktopPlugin.mjs) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/desktop-shell-observability/exports.json](../../modules/desktop-shell-observability/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/desktop-shell-observability/index.js](../../modules/desktop-shell-observability/index.js) | 模块入口或装配 | `createServerPluginHost`, `createPluginRouter`, `createLocalRuntimeLifecycle` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/node.server.manifest.json](../../modules/desktop-shell-observability/node.server.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/desktop-shell-observability/nodeCapabilities.js](../../modules/desktop-shell-observability/nodeCapabilities.js) | 模块内部辅助 | `createNodeCapabilities` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/nodeGenerationRecovery.js](../../modules/desktop-shell-observability/nodeGenerationRecovery.js) | 运行、调度或服务 | `createNodeGenerationRecovery` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/nodePackageFiles.js](../../modules/desktop-shell-observability/nodePackageFiles.js) | 模块内部辅助 | `readNodePackageFile`, `readNodeSources` | 含 文件系统 调用；时机见实现 |
| [modules/desktop-shell-observability/nodeRunRouter.js](../../modules/desktop-shell-observability/nodeRunRouter.js) | HTTP 转换与校验 | `createNodeRunRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/desktop-shell-observability/nodeSandbox.js](../../modules/desktop-shell-observability/nodeSandbox.js) | 模块内部辅助 | `executeIsolatedNode` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/nodeSandboxChild.mjs](../../modules/desktop-shell-observability/nodeSandboxChild.mjs) | 模块内部辅助 | 内部实现 | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/nodeSandboxProcess.js](../../modules/desktop-shell-observability/nodeSandboxProcess.js) | 模块内部辅助 | `launchNodeSandbox` | 含 子进程 调用；时机见实现 |
| [modules/desktop-shell-observability/nodeServerPlugin.js](../../modules/desktop-shell-observability/nodeServerPlugin.js) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/desktop-shell-observability/pluginRouter.js](../../modules/desktop-shell-observability/pluginRouter.js) | HTTP 转换与校验 | `createPluginRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/desktop-shell-observability/server/runtime/backendLifecycleDiagnostics.js](../../modules/desktop-shell-observability/server/runtime/backendLifecycleDiagnostics.js) | 运行、调度或服务 | `installBackendLifecycleDiagnostics` | 含 文件系统 调用；时机见实现 |
| [modules/desktop-shell-observability/server/runtime/localRuntimeLifecycle.js](../../modules/desktop-shell-observability/server/runtime/localRuntimeLifecycle.js) | 运行、调度或服务 | `resolveListenTarget`, `describeListenTarget`, `createLocalRuntimeLifecycle` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/server/runtime/parentChannel.js](../../modules/desktop-shell-observability/server/runtime/parentChannel.js) | 运行、调度或服务 | `createParentChannel` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/server/runtime/serveCanvas.js](../../modules/desktop-shell-observability/server/runtime/serveCanvas.js) | 运行、调度或服务 | `serveCanvas` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/server/telemetry/providerDiagnostics.js](../../modules/desktop-shell-observability/server/telemetry/providerDiagnostics.js) | 服务端领域实现 | `safeDiagnosticId`, `safeUpstreamMessage`, `annotateProviderError` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/serverHost.js](../../modules/desktop-shell-observability/serverHost.js) | 模块内部辅助 | `createServerPluginHost` | 含 文件系统、服务注册/生命周期 调用；时机见实现 |
| [modules/desktop-shell-observability/serverNodeDirectory.d.ts](../../modules/desktop-shell-observability/serverNodeDirectory.d.ts) | 类型或数据定义 | `NodeDirectoryState`, `NodeDirectoryLoader`, `createNodeDirectoryLoader` | 无业务运行副作用 |
| [modules/desktop-shell-observability/serverNodeDirectory.js](../../modules/desktop-shell-observability/serverNodeDirectory.js) | 模块内部辅助 | `createNodeDirectoryLoader` | 含 文件系统 调用；时机见实现 |
| [modules/desktop-shell-observability/shared/canvasEntry.ts](../../modules/desktop-shell-observability/shared/canvasEntry.ts) | 模块内部辅助 | `PrepareCanvasResult`, `OpenCanvasResult`, `createCanvasEntry` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/shared/desktopShell.ts](../../modules/desktop-shell-observability/shared/desktopShell.ts) | 模块内部辅助 | `WorkspaceView`, `NakoShell`, `desktopShell` | 含 DOM/事件 调用；时机见实现 |
| [modules/desktop-shell-observability/ui/desktop/backendReconnectNotice.ts](../../modules/desktop-shell-observability/ui/desktop/backendReconnectNotice.ts) | 浏览器交互与状态辅助 | `installBackendReconnectNotice` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/ui/desktop/desktopBridge.ts](../../modules/desktop-shell-observability/ui/desktop/desktopBridge.ts) | 浏览器交互与状态辅助 | `NakoDesktopBridge`, `desktopBridge` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/ui/desktop/localFileUpload.ts](../../modules/desktop-shell-observability/ui/desktop/localFileUpload.ts) | 浏览器交互与状态辅助 | `UploadRequestInit`, `localFilePath`, `fileUploadBody`, `projectArchiveRestoreRequest` | 未检出平台调用；不等于纯函数证明 |
| [modules/desktop-shell-observability/ui/desktop/updateSettings.css](../../modules/desktop-shell-observability/ui/desktop/updateSettings.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/desktop-shell-observability/ui/desktop/updateSettings.tsx](../../modules/desktop-shell-observability/ui/desktop/updateSettings.tsx) | 浏览器交互与状态辅助 | `UpdateSettings`, `UpdateModal`, `installUpdateSettings` | 含 DOM/事件 调用；时机见实现 |

<!-- source-inventory:end -->
