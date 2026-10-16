# 开发与验证入口

## 脚本与测试

业务模块目录只记录模块源码；工具和测试集中在下面的独立目录。

| 目录/入口 | 职责与副作用 |
| --- | --- |
| [check-architecture.mjs](../../scripts/check-architecture.mjs) | 只读扫描导入、公共 API、插件目录、源码依赖环和 1000 行限制 |
| [documentation.mjs](../../scripts/architecture/documentation.mjs) | 默认只读检查文档；`--write` 更新模块说明的自动生成文件目录 |
| [sourceInventory.mjs](../../scripts/architecture/sourceInventory.mjs) | 从模块源码列出导出、职责类别和副作用调用；排除 Skill、模型聚合产物和测试 |
| [conventions.mjs](../../scripts/architecture/conventions.mjs) | 只读扫描 apps/modules/plugins 的裸错误、直接日志及超过 200 行函数；不做语法或类型验证 |
| [check-local-only.mjs](../../scripts/check-local-only.mjs) | 官方联网/账号/上报路径边界核查 |
| [scripts/runtime](../../scripts/runtime) | 本仓库 Node/媒体运行库检查、安装及命令启动 |
| [scripts/desktop](../../scripts/desktop) | 本地开发启动、打包、签名、更新元数据与成品验证；会生成文件或启动进程 |
| [build-model-catalog.mjs](../../scripts/build-model-catalog.mjs) | 模型声明校验与聚合输出，属于人工构建入口 |
| [tests](../../tests) | Vitest 单元、DOM、存储及 HTTP 回归，使用隔离数据与模拟外部服务 |
| [tests/fixtures/nodes](../../tests/fixtures/nodes) | Node SDK 隔离测试夹具，不自动安装到用户节点目录；原 examples 目录已移除 |

## 验证范围

逐帧拉片回归集中在 [shot-analysis.test.js](../../tests/shot-analysis.test.js) 和 [shot-analysis-ui.test.js](../../tests/shot-analysis-ui.test.js)：schema/时间范围/声音状态、FFmpeg 参数/缓存/临时文件清理/取消、一次模型分析与零模型重提取、显式授权/重复点击/迟到响应/只读、分组插入去重及项目素材迁移。`work-fisher-video-upload.test.js` 验证分析视频的上传、video_url 和 max_tokens；这些测试模拟上游/FFmpeg，不能证明供应商支持或真机编解码能力。未运行构建、类型或语法检查。

架构门禁检查 import/export、动态 import 和类型引用：业务模块之间禁止横向依赖，必须消费 contracts/kernel 服务；插件只允许 contracts/kernel 与列明的 Provider SDK、WorkflowExecutor SDK 入口。apps 是组合层，可装配模块公开入口。唯一宿主装配例外精确限定为 serverHost → credentialStore；工作流插件只可复用同类 shared 目录，Provider 不得以 shared 为由导入工作流内部实现。声明式模型贡献聚合保留现有限定例外。api 转导出本身不构成跨模块调用豁免。媒体模块全目录禁止 fs/path/os/crypto/child_process/Sharp 导入，防止平台操作移回业务 helper；HTTP 响应流转换仍由业务边界完成。

`npm run check:architecture`、`npm run check:docs`、`npm run check:conventions` 是只读静态门禁；`npm run audit:conventions` 输出约定差异而不因差异退出失败，严格入口 check:conventions 会退出失败。它们不能证明运行时类型安全、界面行为或 Windows/macOS 真机兼容。

约定扫描覆盖应用、模块和插件的 JS/TS 源码（排除 .d.ts、公开转出 api、builtin、依赖与产物）；识别裸 Error/TypeError/RangeError 等内建错误的构造或调用，包括 Promise.reject、Object.assign 和 AbortSignal 原因中的错误，识别 console 点号/方括号方法调用。自定义错误类是否具有完整契约、动态/别名 console、日志语义与全部敏感内容不由此证明；脚本和测试不在生产源码扫描范围。架构及桌面 GitHub 工作流在现有验证步骤中加入文档和严格约定门禁，未改发版版本或打包逻辑。

完整 `npm run check` 包含类型检查、测试、前端/启动器构建与后端冒烟，由用户按 AGENTS.md 自行执行。浏览器插件变更需要重新构建再启动，源码开发命令 desktop:dev 会完成构建；本轮未运行它。平台成品与真实跨版本安装需要在对应平台检查，不以静态配置代替验收。

测试映射以实际 tests 文件为准，不写入容易失真的固定数量。核查失败必须保留错误和影响范围；历史成功记录见 [历史说明](../history/README.md)，不能替代本次结果。

服务化后的独立调用测试在 tests/helpers/serverCapabilities.js、modelCatalog.js、mediaCanvas.js 中显式装配公共能力并在结束时释放；真实宿主测试先释放独立测试的服务，保持后端单宿主约束。客户端边界测试使用最小声明服务，浏览器启动断言同步新增的能力插件数量。原有参考视频时长 mock 改为注入 media.runtime 探测器，不再模拟已移除的横向 import；这些用例尚未执行。

错误与日志回归集中在 tests/module-logging.test.js（诊断上下文、脱敏与容量限制、事件/清理失败）、tests/node-sdk.test.js（注册失败状态）、tests/desktop-startup-errors.test.js（安全启动拒绝）。本轮只补充用例，未执行测试、类型检查或构建。

媒体适配器回归见 [media-adapter-boundaries.test.js](../../tests/media-adapter-boundaries.test.js)：独立基础插件启动、写入与列表、元数据失败传播和残留清理、原记录保留、Windows junction/macOS symlink 目录拒绝。media-runtime 的缺失 FFprobe 用例直接测试处理适配器，独立服务 helper 显式装配 media.probe → media.files → media.runtime；用例未执行。

## 版本与记录

根 VERSION 记录当前版本，需与 package.json、apps/desktop/package.json 及相应 lockfile 一致。新变更写 CHANGELOG.md/Unreleased；本次规范化补齐缺失的 VERSION/CHANGELOG，没有提升版本、提交 Git、打 tag 或发布。

发行按 AGENTS.md 整理 Unreleased、提升版本、提交当前代码并打 tag。桌面发布细节见 [GitHub 发布说明](../GitHub发布说明.md)、[桌面打包](../桌面应用打包说明.md) 与 [自动更新](../自动更新配置说明.md)。本次新增静态入口不改变发布脚本流程。
