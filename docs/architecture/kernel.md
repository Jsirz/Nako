# Kernel

## 职责与边界

核心只依赖 contracts；不接入 SQLite、Provider、ComfyUI、Electron 或 pi。主要入口 [index.js](../../modules/kernel/index.js) 提供 PluginHost、ServiceRegistry、EventBus。浏览器辅助 [browser.ts](../../modules/kernel/browser.ts) 管理现有 UI 注册表，不在 Window 放置服务对象。

## 接口契约

`ServiceRegistry.register(id, value, owner)` 返回注销函数；重复 ID、undefined 和缺失必需服务分别抛出 contracts 的结构化错误。get 必需、optional 可缺席，removeOwner 在清理时撤销所属服务。

PluginHost 的 register 校验声明，load/unload 串行化生命周期，start 失败只回滚此次新增激活，stop 按依赖逆序关闭。manifest 的 requires/optional/provides 限制 context.services 的可见服务。凭据必须同时满足插件声明与宿主授权，使用 context.credentials.get。
[plugin.js](../../modules/kernel/plugin.js) 的 definePlugin 将 PluginDefinition 装配为 NakoPlugin：身份必须与 manifest 一致，deactivate 始终可调用；host 注册及 lazy/application 入口沿用此装配。声明配置不是独立运行插件，权限声明和激活回滚仍由宿主执行。

EventBus.on 返回取消订阅函数；emit 把同步与异步监听器异常交给宿主错误处理，不等待消费者。事件负载应是 contracts 数据，不传插件内部对象。

[logger.js](../../modules/kernel/logger.js) 的 createModuleLogger 接收 moduleId 与输出端，提供 info/warn/error。输出附模块标识和有限上下文，敏感字段、Bearer/sk- 内容脱敏，Error 上下文只记录名称和错误码。PluginContext.logger 使用同一封装。

## 数据模型

插件状态依次为 registered、activating、active；激活失败为 failed，正常卸载回到 registered。每次激活独立 AbortController 和 disposer 列表，旧 context 在关闭后失效。资源订阅和服务反向清理，注册表不持久化。

节点注册、版本选择、DAG 运行及批准状态由 `nodeRegistry.*`、`nodeDagScheduler.*`、`nodeRunService.*` 管理。运行持久化由注入存储承担；不在 kernel 读写磁盘。完整运行限制以 contracts/nodeExecution 和执行实现为准。

## 功能结构

lazyPlugin 延迟加载并核对 manifest；application 声明后端路由贡献。browser 提供资源追踪及 localRuntimeUi/generationUi/accountUi/mediaSettings/projectPreferences/promptComposition 类型化服务获取，契约来源均在 contracts；Window 不持有服务实例。

`reloadRequired` 或在途调用会拒绝普通卸载。资源清理异常不阻断后续清理。内核权限是可信代码的能力边界，不是 JavaScript 安全沙箱。版本范围目前为精确、^ 和 >= 的受限实现，通用 SemVer 与文档目标的差异列在规范差异中。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/kernel/application.js](../../modules/kernel/application.js) | 模块内部辅助 | `defineApplicationPlugin`, `RouteContributions` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/kernel/browser.ts](../../modules/kernel/browser.ts) | 模块入口或装配 | `browserHost`, `localRuntimeUi`, `generationUi`, `projectPreferences`, `accountUi`, `mediaSettings`, `promptComposition`, `mediaRecovery`, `trackBrowserResource`, `activateBrowserModule`, `browserServices`, `getBrowserServices` | 含 服务注册/生命周期 调用；时机见实现 |
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

<!-- source-inventory:end -->
