# Kernel

## 职责与边界

核心只依赖 contracts；不接入 SQLite、Provider、ComfyUI、Electron 或 pi。主要入口 [index.js](../../modules/kernel/index.js) 提供 PluginHost、ServiceRegistry、EventBus。浏览器辅助 [browser.ts](../../modules/kernel/browser.ts) 管理现有 UI 注册表，不在 Window 放置服务对象。

## 接口契约

`ServiceRegistry.register(id, value, owner)` 返回注销函数；重复 ID、undefined 和缺失必需服务分别抛出 contracts 的结构化错误，携带 kernel、service.register/service.get 和 serviceId/owner。get 必需、optional 可缺席，removeOwner 在清理时撤销所属服务。

PluginHost 的 register 校验声明，load/unload 串行化生命周期，start 失败只回滚此次新增激活，stop 按依赖逆序关闭。manifest 的 requires/optional/provides 限制 context.services 的可见服务。凭据必须同时满足插件声明与宿主授权，使用 context.credentials.get。
[plugin.js](../../modules/kernel/plugin.js) 的 definePlugin 将 PluginDefinition 装配为 NakoPlugin：身份必须与 manifest 一致，deactivate 始终可调用；host 注册及 lazy/application 入口沿用此装配。声明配置不是独立运行插件，权限声明和激活回滚仍由宿主执行。

EventBus.on 返回取消订阅函数；emit 把同步与异步监听器异常交给宿主错误处理，不等待消费者。事件负载应是 contracts 数据，不传插件内部对象。

[logger.js](../../modules/kernel/logger.js) 的 createModuleLogger 接收 moduleId 与输出端，提供 info/warn/error。业务通过 PluginContext.logger 或注入 Logger 输出，组合根与无宿主平台入口使用 createModuleLogger；console 仅作为 Logger/安全输出适配器的底层输出端。宿主事件与清理失败也通过同一封装，携带 operation、pluginId 和 error，不阻断既有资源释放。

日志正文使用固定事件描述，上下文至少含 operation，并按需附请求/项目/节点/运行标识。info 表示生命周期与普通诊断，warn 表示可恢复异常，error 表示操作失败。Error 仅记录 name/code、可选 status 和一层脱敏 context，不输出 message、stack、cause 或 errors 列表；Logger 不持久化日志，落盘由桌面输出重定向等平台实现负责。

模块标识最多 128 字符、正文与字符串值最多 1024 字符、每层上下文最多 32 字段、字段名最多 64 字符。敏感字段及 Bearer/sk-、token/API Key 等文本赋值脱敏；嵌套对象、数组与非基本值省略，避免原始 payload 或循环引用展开。允许的标量上下文应由调用者提供，不得传入请求正文、完整响应或凭据。日志脱敏不能代替调用端的数据最小化。

## 数据模型

插件状态依次为 registered、activating、active；激活失败为 failed，正常卸载回到 registered。每次激活独立 AbortController 和 disposer 列表，旧 context 在关闭后失效。资源订阅和服务反向清理，注册表不持久化。

节点注册、版本选择、DAG 运行及批准状态由 `nodeRegistry.*`、`nodeDagScheduler.*`、`nodeRunService.*` 管理。运行持久化由注入存储承担；不在 kernel 读写磁盘。完整运行限制以 contracts/nodeExecution 和执行实现为准。

NodeRegistry 注册失败统一使用 NODE_PACKAGE_ERROR，包含 nodes.register、packageId、owner；SDK 不兼容为 400 并提供版本信息，重复包或节点类型为 409。插件注册、服务/凭据权限和生命周期拒绝同样携带操作及相关身份，懒加载清单不一致携带 plugin.load 上下文。

## 功能结构

lazyPlugin 延迟加载并核对 manifest；application 声明后端路由贡献。browser 提供资源追踪及 localRuntimeUi/generationUi/accountUi/mediaSettings/projectPreferences/promptComposition 类型化服务获取，契约来源均在 contracts；Window 不持有服务实例。

[server.js](../../modules/kernel/server.js) 提供单个后端进程使用的 ServiceRegistry，由桌面宿主注入同一注册表；platformPaths/mediaRuntime/mediaFiles/httpSecurity/externalMediaFetch/localPlatform/directoryPicker/generationReceipts/workflowExecutors/workflowSupport 只读取所属模块或适配器发布的公共能力。mediaFiles 返回 contracts 的 MediaFileService，存储适配器直接获取文件服务，不依赖媒体业务装配。模块不得在文件加载时获取尚未激活的服务。缺失服务以 SERVICE_NOT_FOUND 明确拒绝，不回退到业务静态导入；独立调用者必须装配注册表。当前不支持在同一进程创建多个隔离后端宿主。

通用 UI 样式、DOM、模态焦点、侧栏与设置导航位于 kernel/ui，业务只消费平台无关辅助或事件。浏览器服务包括 ui.agent.canvas、ui.canvas.editing、ui.project.catalog、ui.media.canvas、ui.desktop.capabilities、ui.account.preferences、ui.generation.interaction、ui.canvas.presentation、ui.agent.documents，参数与返回值见 contracts 对应声明。浏览器旧适配器名称由 kernel 映射到注册表，业务不通过 Window 获取服务。

`reloadRequired` 或在途调用会拒绝普通卸载。资源清理异常不阻断后续清理。内核权限是可信代码的能力边界，不是 JavaScript 安全沙箱。版本范围目前为精确、^ 和 >= 的受限实现，通用 SemVer 与文档目标的差异列在规范差异中。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/kernel/application.js](../../modules/kernel/application.js) | 模块内部辅助 | `defineApplicationPlugin`, `RouteContributions` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/kernel/browser.ts](../../modules/kernel/browser.ts) | 模块入口或装配 | `browserHost`, `localRuntimeUi`, `generationUi`, `projectPreferences`, `accountUi`, `mediaSettings`, `promptComposition`, `mediaRecovery`, `modelCatalog`, `generationPreparation`, `nodeRuns`, `agentCanvas`, `canvasEditing`, `projectCatalog`, `mediaCanvas`, `accountPreferences`, `desktopBrowser`, `generationInteraction`, `canvasPresentation`, `agentDocuments`, `trackBrowserResource`, `activateBrowserModule`, `browserServices`, `getBrowserServices` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/kernel/index.d.ts](../../modules/kernel/index.d.ts) | 类型或数据定义 | `ServiceRegistry`, `EventBus`, `PluginHost`, `satisfiesVersion`, `重导出 ./nodeRegistry.js`, `重导出 ./nodeDagScheduler.js` | 无业务运行副作用 |
| [modules/kernel/index.js](../../modules/kernel/index.js) | 模块入口或装配 | `satisfiesVersion`, `ServiceRegistry`, `EventBus`, `PluginHost` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/kernel/lazyPlugin.d.ts](../../modules/kernel/lazyPlugin.d.ts) | 类型或数据定义 | `lazyPlugin` | 无业务运行副作用 |
| [modules/kernel/lazyPlugin.js](../../modules/kernel/lazyPlugin.js) | 模块入口或装配 | `lazyPlugin` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/logger.d.ts](../../modules/kernel/logger.d.ts) | 类型或数据定义 | `createModuleLogger` | 无业务运行副作用 |
| [modules/kernel/logger.js](../../modules/kernel/logger.js) | 模块内部辅助 | `createModuleLogger` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/nodeDagScheduler.d.ts](../../modules/kernel/nodeDagScheduler.d.ts) | 类型或数据定义 | `NodeDagSchedulerOptions`, `NodeDagRunOptions`, `NodeDagScheduler`, `createNodeDagScheduler` | 无业务运行副作用 |
| [modules/kernel/nodeDagScheduler.js](../../modules/kernel/nodeDagScheduler.js) | 运行、调度或服务 | `NodeDagScheduler`, `createNodeDagScheduler` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/nodeRegistry.d.ts](../../modules/kernel/nodeRegistry.d.ts) | 类型或数据定义 | `NodeRegistryOptions`, `NodeResolution`, `NodeRegistry`, `createNodeRegistry` | 无业务运行副作用 |
| [modules/kernel/nodeRegistry.js](../../modules/kernel/nodeRegistry.js) | 模块内部辅助 | `NodeRegistry`, `createNodeRegistry` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/nodeRunCapabilities.js](../../modules/kernel/nodeRunCapabilities.js) | 模块内部辅助 | `createNodeCapabilityContext` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/nodeRunObservation.js](../../modules/kernel/nodeRunObservation.js) | 模块内部辅助 | `createNodeRunObservation` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/nodeRunPreparation.js](../../modules/kernel/nodeRunPreparation.js) | 模块内部辅助 | `createNodeRunPreparation` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/nodeRunService.d.ts](../../modules/kernel/nodeRunService.d.ts) | 类型或数据定义 | `createNodeRunService` | 无业务运行副作用 |
| [modules/kernel/nodeRunService.js](../../modules/kernel/nodeRunService.js) | 运行、调度或服务 | `createNodeRunService` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/plugin.d.ts](../../modules/kernel/plugin.d.ts) | 类型或数据定义 | `definePlugin` | 无业务运行副作用 |
| [modules/kernel/plugin.js](../../modules/kernel/plugin.js) | 模块内部辅助 | `definePlugin` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/redaction.js](../../modules/kernel/redaction.js) | 模块内部辅助 | `redactSensitive`, `redactSecretsOnly`, `redactString` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/server.js](../../modules/kernel/server.js) | 模块内部辅助 | `serverServices`, `platformPaths`, `mediaRuntime`, `mediaFiles`, `httpSecurity`, `externalMediaFetch`, `localPlatform`, `directoryPicker`, `generationReceipts`, `workflowExecutors`, `workflowSupport` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/ui/designSystem.ts](../../modules/kernel/ui/designSystem.ts) | 浏览器交互与状态辅助 | `DESIGN_TOKENS`, `ButtonVariant`, `ToastTone`, `ConfirmationIntent`, `RUNNINGHUB_PAID_CONFIRMATION_KEY`, `AnchoredConfirmationOptions`, `StableDesignSystemAdapter`, `createButton`, `isConfirmationSuppressed`, `resetConfirmationPreference`, `requestAnchoredConfirmation`, `createInput`, `createSelect`, `createPopover`, `createDialog`, `createDangerousConfirmation`, `createToast`, `createTooltip`, `createTabs`, `createMenu`, `installStableDesignSystem` | 含 DOM/事件 调用；时机见实现 |
| [modules/kernel/ui/designSystemStyles.ts](../../modules/kernel/ui/designSystemStyles.ts) | 浏览器交互与状态辅助 | `DESIGN_TOKENS`, `DESIGN_CSS` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/ui/dom.ts](../../modules/kernel/ui/dom.ts) | 浏览器交互与状态辅助 | `createStableElement`, `createStableTextElement` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/ui/enhancementLifecycle.ts](../../modules/kernel/ui/enhancementLifecycle.ts) | 浏览器交互与状态辅助 | `observeStableEnhancement` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/ui/modalFocus.ts](../../modules/kernel/ui/modalFocus.ts) | 浏览器交互与状态辅助 | `activateModal` | 含 DOM/事件 调用；时机见实现 |
| [modules/kernel/ui/settingsNavigation.ts](../../modules/kernel/ui/settingsNavigation.ts) | 浏览器交互与状态辅助 | `SettingsSection`, `openSettings` | 含 DOM/事件 调用；时机见实现 |
| [modules/kernel/ui/settingsOperation.ts](../../modules/kernel/ui/settingsOperation.ts) | 浏览器交互与状态辅助 | `settingsOperation` | 未检出平台调用；不等于纯函数证明 |
| [modules/kernel/ui/settingsScope.ts](../../modules/kernel/ui/settingsScope.ts) | 浏览器交互与状态辅助 | `createSettingsScope`, `SettingsScope` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/kernel/ui/sidePanel.ts](../../modules/kernel/ui/sidePanel.ts) | 界面呈现与交互 | `activateSidePanel` | 含 DOM/事件 调用；时机见实现 |

<!-- source-inventory:end -->
