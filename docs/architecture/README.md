# 架构与业务文档

# 架构与业务文档
规则唯一来源是根 ../../AGENTS.md。本目录描述当前源码，不把设计目标、历史测试或目录存在当成合规证明。接口参数以 contracts 源码为准。

## 模块索引

| 模块 | 职责 |
| --- | --- |
| [contracts](contracts.md) | 平台无关的公共协议、数据结构、校验和错误 |
| [kernel](kernel.md) | 插件宿主、注册表、事件、生命周期、日志 |
| [canvas-ui](canvas-ui.md) | 画布渲染、节点编辑、交互、根视图 |
| [project](project.md) | 项目文档、版本冲突、导入导出、快照 |
| [asset-media](asset-media.md) | 媒体服务、HTTP 转换及浏览器媒体操作 |
| [generation-core](generation-core.md) | 模型目录、默认模型、调度、生成与恢复 |
| [generation-providers](generation-providers.md) | Provider 注册适配、调用权限和公共 handler |
| [workflow-runtime](workflow-runtime.md) | 定义、部署、绑定、运行、观察及清理 |
| [agent](agent.md) | 对话、受控工具、Skill、Drama、分镜与提示词 |
| [local-runtime](local-runtime.md) | 本地进程、CLI、ComfyUI 与其界面贡献 |
| [identity-account](identity-account.md) | 本机身份、偏好、凭据与网络安全边界 |
| [desktop-shell-observability](desktop-shell-observability.md) | 平台装配、更新、节点隔离与运行观察 |

## 装配与依赖

基础方向是业务模块依赖 kernel/contracts，kernel 只依赖 contracts。存储、Provider、媒体处理及工作流执行器的具体实现由 `plugins/` 注入。模块 `api/` 与 `exports.json` 是现有公开静态接口；它们不自动满足“只能通过服务通信”的全部目标，现存差异单列记录。

后端入口为 [apps/backend/main.mjs](../../apps/backend/main.mjs)，插件宿主为 [serverHost.js](../../modules/desktop-shell-observability/serverHost.js)。浏览器由 [apps/canvas/bootstrap.ts](../../apps/canvas/bootstrap.ts) 加载插件，根插件注册 `ui.root`。Electron 入口为 [apps/desktop/src/main.mjs](../../apps/desktop/src/main.mjs)。

| 目录 | 用途与解析基准 |
| --- | --- |
| [backend-plugins.json](../../config/backend-plugins.json) | 适配器与注册表，相对目录文件 |
| [application-plugins.json](../../config/application-plugins.json) | 后端业务插件，相对目录文件 |
| [browser-plugins.json](../../config/browser-plugins.json) | 浏览器贡献，相对 `apps/canvas` |
| [desktop-plugins.json](../../config/desktop-plugins.json) | 桌面平台插件，相对目录文件 |
| [model-plugins.json](../../config/model-plugins.json) | 模型数据贡献，相对目录文件 |
| [plugins.json](../../config/plugins.json) | 禁用项与插件选项 |

依赖版本与服务访问在激活时校验；缺失必需插件明确拒绝启动。关闭、激活失败与应用退出释放登记的资源。业务与 UI 多数要求重启，不承诺任意热卸载。插件体系为受信任进程内代码；用户节点的 QuickJS 隔离是另一条执行路径，不代表所有插件都沙箱化。

## 维护与核查

- 每个模块只维护一份职责及目录说明；复杂 [Agent Harness](agent-harness.md) 单独记录。
- 文件目录由 `node scripts/architecture/documentation.mjs --write` 更新，不覆盖手写流程说明；新增公共出口同步 `exports.json`。
- `npm run check:architecture` 核对依赖、目录、公开 API、源码环及 1000 行限制；`npm run check:docs` 核对模块文档、目录和本地链接。
- `npm run audit:conventions` 输出裸错误、直接 console 日志、超过 200 行函数等静态差异，不把扫描结果当成行为验证。
- 遵循 AGENTS.md，本次自动化整理不执行语法、类型检查、测试或构建。完整人工验证入口为 `npm run check`。
- [开发与验证入口](tooling.md) 将脚本、测试和业务源码分开分类；历史记录位于 `docs/history/`，不作为当前验证结论。
