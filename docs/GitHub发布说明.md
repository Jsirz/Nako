# GitHub 测试与桌面发布

源码与 Release 位于私有仓库 `Jsirz/Nako`，仅有读取权限的成员可下载安装文件。
客户端继续使用 `config/desktop-updates.json` 配置的 HTTPS 更新服务，不包含 GitHub Token。

## 自动执行规则

- 推送 main 或手动运行 Desktop packages：三平台执行架构检查、本地边界检查、类型检查、全部单元测试、构建和成品冒烟测试。安装包只在版本标签流程中保存到 Release。
- Pull Request：执行检查与测试，不使用签名 Secrets 打包。
- 推送 v<版本号>：各平台验证成功后将文件上传到同一个草稿 Release；三平台全部成功后，发布任务下载完整资产并校验 SHA-256 与清单，再公开 Release。标签必须与根 package.json 和 package-lock.json 一致；安装包不占用 Actions Artifacts 存储。
- Architecture 工作流另外执行快速检查。

构建使用 package.json 固定的 Node 版本，以及 windows-latest、macos-15-intel、macos-15 runner。
打包任务与最终发布任务拥有 contents: write 权限，用于暂存草稿和完成发布。仓库保持私有。

## 发布版本

```sh
git add -A
git add -f VERSION CHANGELOG.md
git commit -m "chore: release 1.5.8"
git tag v1.5.8
git push origin main
git push origin v1.5.8
```

先整理 CHANGELOG 的 Unreleased 为新版本记录，并同步 VERSION、package.json 和 package-lock.json；标签按实际版本填写。失败工作流可重跑；已发布版本不能覆盖，应递增版本。

## 安装文件与更新服务

| 平台 | 安装文件 | 更新文件 |
| --- | --- | --- |
| Windows x64 | Nako-版本-windows-x64-setup.exe | latest.yml、blockmap、ZIP、SHA256SUMS |
| Mac ARM64 | Nako-版本-mac-arm64.dmg | ZIP、签名 .delta、appcast-mac-arm64.xml、SHA256SUMS |
| Mac x64 | Nako-版本-mac-x64.dmg | ZIP、签名 .delta、appcast-mac-x64.xml、SHA256SUMS |

Mac 使用 electron-sparkle-updater 0.5.2，要求 macOS 12+，不再生成 Squirrel 的 YAML 和 blockmap。
每个 Mac 构建目录中清单原名为 appcast.xml；Release 中按架构重命名，差分文件名也包含架构，避免覆盖。

更新根目录默认为 https://nako.tos-cn-guangzhou.volces.com/nako。
仓库变量 NAKO_UPDATE_URL 可以替换它，空变量仍沿用现有地址。

**GitHub 发布不自动上传到 TOS。** 将构件上传到：

```text
nako/windows-x64/    Windows 安装包、blockmap、latest.yml
nako/mac-arm64/      ARM64 DMG、ZIP、所有 .delta、appcast.xml
nako/mac-x64/        x64 DMG、ZIP、所有 .delta、appcast.xml
```

从 Release 下载时，将 appcast-mac-arm64.xml 和 appcast-mac-x64.xml 分别命名为对应目录的 appcast.xml。
先上传安装包和全部 .delta，再上传清单。appcast 本身有 EdDSA 签名，禁止修改内容；修改后必须重新签名。
私有 GitHub Release 的默认下载地址不能直接作为普通客户端更新源。

## Mac 更新与迁移

客户端保持启动检查、每六小时检查、确认后下载、保存画布后确认安装的行为。
普通检查只读取并验证签名 appcast，用户确认后才启动 Sparkle 原生下载。
只有原生解压和验证完成才显示可安装。安装前允许应用真正退出；安装超时或失败会尝试恢复本机后端。
从 1.5.8 起启用单段差分更新：Actions 使用私有仓库最近两个已发布、同架构的 Sparkle ZIP 作为基线，验证旧清单/ZIP 签名后生成新版本差分包。生成工具只为当前版本输出清单，不重新发布旧 ZIP；每个新 .delta 的 EdDSA 签名和 SHA-256 校验通过后随 Release 发布。客户端选择较小且适用的差分包，无法应用或校验失败时由 Sparkle 回退完整 ZIP；始终保留完整包。SUDeltaChainHistory=0 仅关闭多段差分链，不关闭单段差分，1.5.6/1.5.7 的现有客户端也可使用直接差分。

**1.5.5 及更早的 Mac 用户需要手动安装一次 1.5.6 或更新的 Sparkle 版本。**
服务器清单无法替换旧客户端内的 Squirrel。应用应安装到 Applications，勿直接从只读 DMG 运行。

## 签名

| Secret | 用途 |
| --- | --- |
| SPARKLE_ED_PRIVATE_KEY | Sparkle Ed25519 私钥种子的 base64（解码后 32 字节），两个 Mac 架构共用并长期保持 |
| WIN_CSC_LINK | 可选 Windows 签名证书 PFX/P12 的 base64 |
| WIN_CSC_KEY_PASSWORD | Windows 证书密码 |

Mac 在所有文件复制完成后，依次签署 Mach-O、嵌套 bundle 和整个应用，并执行 codesign 严格验证。
应用使用 ad-hoc 签名，不需要付费 Developer ID；更新 ZIP 与 appcast 使用 EdDSA 签名。
公钥保存在 config/desktop-updates.json，构建时写入 Info.plist 的 SUPublicEDKey。
缺少私钥、公私钥不匹配、ZIP 或清单签名验证失败均阻止发布。
私钥不能提交到仓库或打包进应用。不要每次发布生成新密钥，否则旧客户端无法验证更新。

ad-hoc 不提供 Developer ID 身份或 Apple 公证，首次安装仍可能触发 Gatekeeper 提示。
Windows 未配置证书仍可打包，但可能触发 SmartScreen。GitHub 发布使用内置 GITHUB_TOKEN。

## 验证与排查

每个 Mac 构建会验证 ZIP 和 appcast 的 Ed25519 签名，启动实际 Nako 成品确认 Sparkle 初始化，并运行固定上游版本的原生安装测试。
原生测试使用隔离的 ad-hoc fixture，覆盖跨版本安装、损坏增量回退和取消；不等同于 Nako 完整实机跨版本验收。
正式升级前应在真实 Mac 验证 Nako 更新后的重启与用户数据保留。
成品截图与 result.json 保存在 smoke-平台-架构 诊断构件中（7 天）。
