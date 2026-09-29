# GitHub 测试与桌面发布

源码与 Release 位于私有仓库 `Jsirz/Nako`，仅有仓库读取权限的成员可下载安装文件。
客户端仍使用 `config/desktop-updates.json` 中现有的 HTTPS 更新服务；不会把私有 GitHub Release 地址或 GitHub Token 写入客户端。

## 自动执行规则

- 推送 `main`：Windows x64、macOS Intel x64、macOS Apple Silicon arm64 分别执行架构检查、本地边界检查、类型检查和全部单元测试，随后构建并启动成品进行冒烟验证。安装包保存在 Actions Artifacts，保留 14 天。
- Pull Request：在以上三种平台执行检查与测试，不使用签名 Secrets 打包。
- Actions → **Desktop packages** → **Run workflow**：手动运行三平台测试与打包，不自动创建 Release。
- 推送 `v<版本号>` 标签：完成三平台测试、构建和成品验证后发布 GitHub Release。标签必须与根 `package.json`、`package-lock.json` 的稳定版本完全一致；不接受预发行版本。
- **Architecture** 工作流额外执行快速检查，使用项目支持的 Windows runner。

工作流使用 Node.js 的 `package.json` 固定版本。Windows、Mac Intel、Mac ARM 分别使用 `windows-latest`、`macos-15-intel`、`macos-15`。
只有发布任务拥有 `contents: write` 权限，构建和测试任务只读。先创建草稿并上传完整资产，再公开为仓库成员可见的 Release，避免不完整发布。

## 发布新版本

修改版本会同时更新根 `package.json` 与 `package-lock.json`：

```sh
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump release version"
git tag v1.5.6
git push origin main
git push origin v1.5.6
```

示例假设当前版本为 1.5.5；以后必须按实际版本修改标签。首次发布现有版本可直接创建 `v1.5.5` 标签。
失败的工作流可重跑；上传失败保留的草稿会继续上传。已发布的同版本 Release 不会被覆盖，应提高版本号重新发布。

## 安装文件与更新文件

| 平台 | 安装文件 | 附加文件 |
| --- | --- | --- |
| Windows x64 | `Nako-<版本>-windows-x64-setup.exe` | `Nako-<版本>-win-x64.zip`、`latest.yml`、blockmap、SHA256SUMS |
| macOS ARM64 | `Nako-<版本>-mac-arm64.dmg` | ZIP、`latest-mac-arm64.yml`、blockmap、SHA256SUMS |
| macOS x64 | `Nako-<版本>-mac-x64.dmg` | ZIP、`latest-mac-x64.yml`、blockmap、SHA256SUMS |

Release 中的两份 Mac 更新清单按架构重命名，避免同名覆盖。Actions 中 `Nako-mac-arm64` 和 `Nako-mac-x64` 构件内仍保留原始 `latest-mac.yml`。

客户端当前更新根目录是 `https://nako.tos-cn-guangzhou.volces.com/nako`。
未配置仓库变量 `NAKO_UPDATE_URL` 时沿用该地址；空变量也不会关闭更新。有意替换更新服务时才设置该变量。

**GitHub 发布不会自动上传到现有更新服务器。** 要让已安装客户端收到版本，将三个 Actions 构件中的文件分别上传到现有服务的以下目录：

```text
nako/windows-x64/    Windows 安装包、blockmap、latest.yml
nako/mac-arm64/      ARM64 DMG、ZIP、blockmap、latest-mac.yml
nako/mac-x64/        x64 DMG、ZIP、blockmap、latest-mac.yml
```

如果从 Release 下载，上传前将 `latest-mac-arm64.yml` 和 `latest-mac-x64.yml` 分别恢复为所在平台目录中的 `latest-mac.yml`。先上传安装包和 blockmap，再上传更新清单；不要修改清单中的文件名、大小和哈希。现有更新逻辑、地址、检查频率及安装确认行为保持不变。

## 签名 Secrets

在仓库 Settings → Secrets and variables → Actions 中按需要配置：

| Secret | 用途 |
| --- | --- |
| `MAC_CSC_LINK` | Developer ID Application 证书的 base64 编码 P12，供两个 Mac 构建使用 |
| `MAC_CSC_KEY_PASSWORD` | Mac 证书密码 |
| `APPLE_ID` | Apple 公证账号 |
| `APPLE_APP_SPECIFIC_PASSWORD` | Apple 公证专用密码 |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `WIN_CSC_LINK` | Windows 签名证书的 base64 编码 PFX/P12 |
| `WIN_CSC_KEY_PASSWORD` | Windows 证书密码 |

Secrets 未设置时仍可生成内部测试包，但不代表完成可信签名。macOS 自动安装更新需要有效签名，正式分发还应完成公证；无证书的包可能被 Gatekeeper/SmartScreen 拦截。
GitHub 发布使用内置 `GITHUB_TOKEN`，无需另外配置 PAT，不改变仓库私有状态。

## 排查

Actions 失败时查看具体步骤。打包成品的截图及 `result.json` 保存在 `smoke-<平台>-<架构>` 诊断构件中，保留 7 天。
未通过任一平台检查不会发布 Release；版本号不匹配、缺少平台文件或 SHA-256 校验失败也会阻止发布。
