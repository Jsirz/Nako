# 第三方声明

本仓库 LICENSE 仅适用于有权以该条款授权的自有代码，不改变第三方代码的原有授权。

- 改编自 T8-penguin-canvas 的提示词片段保留 [MIT 声明](public/notices/T8-penguin-canvas.txt)。
- npm 依赖各自遵循其发布包中的 LICENSE、版权声明及锁文件标识，不能用本项目或上游许可替换它们。
- Nako 自有贡献适用 [MIT 许可证](LICENSE)；继承的上游代码仍适用 [原非商业许可证](LICENSE.upstream)。
- 桌面自动更新使用 electron-updater（MIT），随生产依赖保留其许可文件。
- 节点执行隔离使用 quickjs-emscripten 0.31.0、quickjs-emscripten-core 与 @jitl QuickJS WASM 包（MIT）。生产依赖保留各包的 LICENSE，QuickJS 引擎及编译产物继续适用包内原始声明。
- Agent 使用 `@earendil-works/pi-agent-core` 和 `@earendil-works/pi-ai` 0.85.1；上游为 [earendil-works/pi](https://github.com/earendil-works/pi)，保留 [MIT 许可与版权声明](public/notices/pi-MIT.txt)。
- Work-Fisher 固定模型目录依据 [Work-Fisher/AIFISHER](https://github.com/Work-Fisher/AIFISHER) 提交 `bdcf3bec054594fcab591952a8c5acef858d6de4` 的声明式模型数据整理，保留模型 ID、能力模式和参数限制，未引入其账号、价格、统计或运营代码。上游原始材料受 `AIFISHER Noncommercial Source License 1.0` 约束，本项目中的改编数据继续遵守该许可及署名要求。
- Electron 及其 Chromium、Node.js 等组件按各自许可证分发。安装后的组件目录保留上游许可文件。
- 本仓库不提交 FFmpeg 二进制、模型权重或作者保留的闭源 SKILL。`media:setup` 从 [Gyan Windows builds](https://www.gyan.dev/ffmpeg/builds/) 的 GitHub 发布下载固定版本 FFmpeg 9.0.1 essentials（GPL v3），校验 SHA-256 后安装至本项目 `bin/`，同时保留 `FFmpeg-LICENSE.txt` 与包含源码链接和编译配置的 `FFmpeg-README.txt`。源码版本为 [FFmpeg bf1b838f2a](https://github.com/FFmpeg/FFmpeg/commit/bf1b838f2a)。如将这些组件加入安装包或另行分发，须履行其许可证及对应源码提供义务；本项目许可证不覆盖或替换这些条款。

品牌素材仅用于标明本软件来源，不构成对衍生产品的官方背书。

Skill 主题封面来自 Wikimedia Commons，分别适用 CC0、公共领域或 CC BY / CC BY-SA 授权，详见 [Skill 封面作者与授权](public/notices/skill-covers.txt)。每个技能目录的 `COVER-SOURCE.md` 保留原图来源、作者、许可链接和裁切说明；这些图片不改用本项目 MIT 许可。

桌面构建另外使用 electron-builder（MIT，仅构建期）。macOS 媒体组件固定使用 `@ffmpeg-installer/darwin-arm64@4.1.5`、`@ffmpeg-installer/darwin-x64@4.1.0`、`@ffprobe-installer/darwin-arm64@5.0.1`、`@ffprobe-installer/darwin-x64@5.1.0`，仅按目标 CPU 选取一组，下载包校验 SHA-512。各包说明及许可文件复制到安装包 `bin/`；上游二进制分别来自 [OSX Experts](https://www.osxexperts.net/)、[Evermeet](https://evermeet.cx/ffmpeg/) 和包内标明的 Homebrew 来源。FFmpeg 的实际许可取决于各二进制的编译选项，不能以 npm 包装脚本的许可替代；对应源码、外部库与构建说明须按所选分发版本向上述来源获取，并在对外再分发时满足其 GPL/LGPL 要求。详见 [FFmpeg 许可说明](https://ffmpeg.org/legal.html)。

风格预览图库与 MJ 码图素材经维护者确认自有或已获公开再分发授权。素材中的第三方品牌与人物等权利不因本仓库发布而转移。
