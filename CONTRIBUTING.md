# 参与贡献

请先阅读 [AGENTS.md](AGENTS.md)、[架构索引](docs/architecture/README.md) 与 [LICENSE](LICENSE)。MIT 授权仅覆盖有权授权的 Nako 原创贡献；继承源码、素材和第三方内容按 [来源声明](SOURCE-ORIGIN.md)、[上游许可](LICENSE.upstream) 与各自声明执行，不得将整个分发包描述为 MIT。

修改前读取现有实现，保留无关工作区改动；代码放入所属模块或适配器，公共类型放 contracts，有生命周期的调用通过 kernel 服务/事件。接口、数据、依赖与文件职责变化同步模块文档；单文件不超过 1000 行、函数不超过 200 行，不新增旧数据兼容分支。

静态核查使用 `npm run check:architecture`、`npm run check:docs` 和 `npm run audit:conventions`。完整人工验证使用 `npm run check`；自动化开发遵循 AGENTS.md，不自行执行语法、编译或构建。测试使用隔离数据与模拟服务，不触发真实付费生成。

新增变更记入 [CHANGELOG.md](CHANGELOG.md) 的 Unreleased。发行时再整理版本记录、提升 [VERSION](VERSION)，同步现有 package.json 版本源，并按 AGENTS.md 执行提交与 tag；普通开发不自行发版。贡献说明应列出实际验证和未验证范围。
