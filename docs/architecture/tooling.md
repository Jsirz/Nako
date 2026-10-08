# 开发与验证入口

## 脚本与测试

业务模块目录只记录模块源码；工具和测试集中在下面的独立目录。

| 目录/入口 | 职责与副作用 |
| --- | --- |
| [check-architecture.mjs](../../scripts/check-architecture.mjs) | 只读扫描导入、公共 API、插件目录、源码依赖环和 1000 行限制 |
| [documentation.mjs](../../scripts/architecture/documentation.mjs) | 默认只读检查文档；`--write` 更新模块说明的自动生成文件目录 |
| [sourceInventory.mjs](../../scripts/architecture/sourceInventory.mjs) | 从模块源码列出导出、职责类别和副作用调用；排除 Skill、模型聚合产物和测试 |
| [conventions.mjs](../../scripts/architecture/conventions.mjs) | 只读报告裸错误、直接日志及超过 200 行函数；不做语法或类型验证 |
| [check-local-only.mjs](../../scripts/check-local-only.mjs) | 官方联网/账号/上报路径边界核查 |
| [scripts/runtime](../../scripts/runtime) | 本仓库 Node/媒体运行库检查、安装及命令启动 |
| [scripts/desktop](../../scripts/desktop) | 本地开发启动、打包、签名、更新元数据与成品验证；会生成文件或启动进程 |
| [build-model-catalog.mjs](../../scripts/build-model-catalog.mjs) | 模型声明校验与聚合输出，属于人工构建入口 |
| [tests](../../tests) | Vitest 单元、DOM、存储及 HTTP 回归，使用隔离数据与模拟外部服务 |
| [examples/nodes](../../examples/nodes) | Node SDK 开发示例，不自动安装到用户节点目录 |

## 验证范围

`npm run check:architecture`、`npm run check:docs` 是只读静态门禁；`npm run audit:conventions` 输出尚未收敛的约定差异。它们不能证明运行时类型安全、界面行为或 Windows/macOS 真机兼容。

完整 `npm run check` 包含类型检查、测试、前端/启动器构建与后端冒烟，由用户按 AGENTS.md 自行执行。浏览器插件变更需要重新构建再启动，源码开发命令 desktop:dev 会完成构建；本轮未运行它。平台成品与真实跨版本安装需要在对应平台检查，不以静态配置代替验收。

测试映射以实际 tests 文件为准，不写入容易失真的固定数量。核查失败必须保留错误和影响范围；历史成功记录见 [历史说明](../history/README.md)，不能替代本次结果。

## 版本与记录

根 VERSION 记录当前版本，需与 package.json、apps/desktop/package.json 及相应 lockfile 一致。新变更写 CHANGELOG.md/Unreleased；本次规范化补齐缺失的 VERSION/CHANGELOG，没有提升版本、提交 Git、打 tag 或发布。

发行按 AGENTS.md 整理 Unreleased、提升版本、提交当前代码并打 tag。桌面发布细节见 [GitHub 发布说明](../GitHub发布说明.md)、[桌面打包](../桌面应用打包说明.md) 与 [自动更新](../自动更新配置说明.md)。本次新增静态入口不改变发布脚本流程。
