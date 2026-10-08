# AGENTS.md 规范收敛记录

本文件记录当前源码与 [AGENTS.md](../../AGENTS.md) 的差异及处理状态。未完成项不是豁免，不得通过删除检查、压缩格式或声明旧实现为合规来消除差异。运行时行为和 Windows/macOS 成品兼容性不以静态扫描替代。

## 已落地的边界调整

| 约束 | 源码证据 | 实现状态与验证范围 |
| --- | --- | --- |
| 生成任务不得重复提交同一尝试 | [generationCoordinator.js](../../modules/generation-core/server/generation/generationCoordinator.js)、[generationAdmission.js](../../modules/contracts/generationAdmission.js) | 准入先查询内存/持久化任务，保存已准入 attempt 集合；同一 attempt 返回拒绝，不再次提交。保留写入失败不发布状态的顺序；新 attempt 表示显式新请求。当前为源码核对，未执行故障注入或测试。 |
| 工作流客户端密钥须经授权接口 | [defineExecutor.js](../../modules/workflow-runtime/defineExecutor.js) | 客户端接收 credentialRef，拒绝外部 apiKey；由插件 context.credentials.get 获取授权凭据。Executor 与 Client 共享安全边界。 |
| 媒体 Router 不操作磁盘目录 | [serverPlugin.js](../../modules/asset-media/serverPlugin.js)、[mediaDeliveryResponse.js](../../modules/asset-media/server/media/mediaDeliveryResponse.js)、[mediaDeliveryStore.js](../../plugins/media/filesystem/mediaDeliveryStore.js) | HTTP 层消费无系统路径的交付协议；适配器打开受限媒体、校验目录与真实路径。响应层负责 Range/HEAD/条件请求和资源关闭。 |
| 外部素材先校验并绑定地址 | [externalUrlPolicy.js](../../modules/identity-account/server/security/externalUrlPolicy.js)、[assetStore.js](../../plugins/media/filesystem/assetStore.js) | identity.externalUrlFetch 用 Node BlockList 拒绝私有/特殊地址，undici dispatcher 的连接 lookup 只返回已验证地址；每次重定向重新验证，响应消费结束关闭连接池。filesystem 有界读取；测试已新增但未执行。 |
| Agent 经生成服务消费模型能力 | [agentTextGeneration.d.ts](../../modules/contracts/agentTextGeneration.d.ts)、[service.js](../../plugins/platform/text-transport/service.js)、[modelAdapter.js](../../modules/agent/server/harness/modelAdapter.js) | 模型连接、密钥及 wire protocol 移入适配插件；Agent 消费中立消息、工具、usage 和结果，不直接构造 Authorization 请求。 |
| 公共节点和调度类型归 contracts | [canvasDocument.ts](../../modules/contracts/canvasDocument.ts)、[generationScheduler.ts](../../modules/contracts/generationScheduler.ts) | 原定义移入公共协议，业务同模块转出指向同一来源；跨模块消费者逐步更正。 |
| 画布设置页通过应用能力服务 | [browserCapabilities.ts](../../modules/contracts/browserCapabilities.ts)、[canvasSettings.tsx](../../modules/canvas-ui/ui/settings/canvasSettings.tsx) | account、generation、media、local-runtime 各自注册能力；设置页通过 kernel 读取，渲染与状态函数拆分。其余画布横向依赖尚需继续收敛。 |
| 公共错误基础层独立 | [errors.js](../../modules/contracts/errors.js)、[errors.d.ts](../../modules/contracts/errors.d.ts) | 错误类和既有错误码从聚合入口抽为叶子模块，保持根入口转出；校验错误含模块、协议及操作上下文，避免反向业务依赖。 |
| 项目 UI 服务与无 React 契约 | [projectWorkflow.ts](../../modules/contracts/projectWorkflow.ts)、[browser.ts](../../modules/canvas-ui/browser.ts)、[browser.ts](../../modules/asset-media/browser.ts) | 画布发布 ui.canvas.project、媒体发布 ui.media.recovery，项目声明 requires；坐标/文档归 contracts，hooks 和组件类型留在业务 UI。 |
| HTTP 安全能力注入 | [httpSecurity.d.ts](../../modules/contracts/httpSecurity.d.ts)、[serverPlugin.js](../../modules/identity-account/serverPlugin.js) | identity.httpSecurity 保留代理与库 Guard，实现仍归身份模块；媒体下载通过认证作用域服务获取目录，不直接导入身份内部函数。 |
| 插件核心接口装配 | [plugin.js](../../modules/kernel/plugin.js)、[lazyPlugin.js](../../modules/kernel/lazyPlugin.js) | kernel 装配 id/version/type/activate/deactivate，浏览器入口区分 PluginDefinition 与 NakoPlugin；懒加载和宿主注册共用入口。 |
| 受限本地与生成运行服务 | [localRuntimeService.d.ts](../../modules/contracts/localRuntimeService.d.ts)、[generationRuntime.js](../../modules/generation-core/server/generation/generationRuntime.js) | 不发布安装器、进程实例、内部 Map 或 journal 写入对象；任务查询及协调返回独立数据快照。 |
| 仓储扩展与当前 schema | [projectRepositoryExtensions.d.ts](../../modules/contracts/projectRepositoryExtensions.d.ts)、[projectRepository.js](../../plugins/storage/sqlite/projectRepository.js)、[workflowStore.js](../../plugins/storage/sqlite/workflowStore.js) | 标准仓储、目录、恢复点、事务和文件能力分离；移除旧列兜底及 schema 升级。未打开或修改真实数据库。 |
| 生成核心不导入 Provider 数据 | [catalog.ts](../../modules/generation-core/models/catalog.ts)、[modelContributions.ts](../../apps/canvas/modelContributions.ts)、[build-model-catalog.mjs](../../scripts/build-model-catalog.mjs) | 应用组合根加载声明式贡献并在插件加载前注入；生成核心复制、校验与排序，生成脚本不再覆盖核心模块。 |
| 约定扫描的职责与错误收敛 | [conventions.mjs](../../scripts/architecture/conventions.mjs)、[nodeExecution.js](../../modules/contracts/nodeExecution.js) | 本轮只读扫描 function-lines/bare-error/direct-console 均为 0；公共 nodeError 使用 PluginError。结果仅覆盖扫描范围，不替代下列真实差异。 |
| Node SDK 校验结构化错误 | [nodeSdk.js](../../modules/contracts/nodeSdk.js) | 原 TypeError 改为 PluginError，保留校验消息，包含 NODE_PACKAGE_ERROR、status、协议、操作及输入路径；消费者不再只得到字符串异常。 |

## 仍需收敛与复核的项目

| 项目 | 源码证据 | 处理要求 |
| --- | --- | --- |
| 画布横向静态调用与组件装配 | [canvasRuntime.tsx](../../modules/canvas-ui/ui/app/canvasRuntime.tsx)、[canvasDialogs.ts](../../modules/canvas-ui/ui/dialogs/canvasDialogs.ts)、[useCanvasAgentControls.tsx](../../modules/canvas-ui/ui/canvas/useCanvasAgentControls.tsx) | 服务由所属模块发布、公共协议归 contracts；画布不得再直接调用业务实现。api 转导出不是服务化证明。 |
| Provider 与 WorkflowExecutor 结果契约 | [index.d.ts](../../modules/contracts/index.d.ts)、[defineExecutor.js](../../modules/workflow-runtime/defineExecutor.js) | 明确统一生成方法、能力及不支持方法的结构化拒绝；execute 结果与取消语义以实际实现收敛，不仅改类型。 |
| 横向公共 API 与未迁移平台 helper | [canvasBudgetControl.ts](../../modules/agent/ui/agent/canvasBudgetControl.ts)、[imageHelpers.js](../../modules/asset-media/server/adapters/imageHelpers.js)、[implementation.js](../../plugins/providers/seedvr2/implementation.js) | Agent/画布/媒体仍静态消费其他业务模块 API；SeedVR2 仍消费工作流实现入口。公开转导出不能替代服务注入，平台 I/O 不能仅移动目录后称为完成。 |
| 诊断码集中与校验上下文 | [pluginValidation.js](../../modules/contracts/pluginValidation.js)、[session.js](../../modules/agent/server/harness/session.js) | Node SDK 和 nodeError 已使用结构化错误；部分历史返回 code 和字符串诊断码仍未集中到 contracts 常量，不能以裸错误扫描清零认定该项已全部完成。 |
| 有界日志的幂等保留范围 | [taskJournal.js](../../plugins/storage/task-journal/taskJournal.js) | 同一记录的历史 attempt 保留，但终态日志容量有限；重启后已被日志淘汰的 nodeId 不能宣称永久去重。需要确定业务要求的保留周期及准入凭证存储。 |

## 检查与验收

只读检查入口为 `node scripts/check-architecture.mjs`、`node scripts/architecture/documentation.mjs`、`node scripts/architecture/conventions.mjs --json`。它们覆盖各自静态规则，不能证明所有运行时行为。文件目录生成器的写入选项只用于同步模块文档的自动生成区。
本轮只读扫描的架构入口通过；文档覆盖 12 个模块、源码目录和本地链接已同步；约定三项均无命中。目录注入、URL 地址绑定、Node SDK 错误和生成快照测试已增加/调整但未执行。两个专项报告受中断/额度错误影响未返回，主代理依据磁盘源码核对和全仓静态扫描完成集成，不将缺失报告当作运行验证。

本轮遵循 AGENTS.md，未执行语法、类型检查、测试或构建。测试与成品运行验证由用户执行；未运行的检查不得写成通过。完整验证入口见 [tooling.md](tooling.md)。
