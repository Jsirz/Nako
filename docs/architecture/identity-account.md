# Identity Account

## 职责与边界

本机身份与安全边界负责当前用户/工作区、偏好/外观、凭据保护、请求授权、私有目录与外部 URL 策略。当前没有官方云账号登录。入口 serverPlugin 注册 preferences.repository，desktopPlugin 注册 desktop.identity，browser.ts 提供本机资料/外观功能。

## 接口契约

[credentialStore.js](../../modules/identity-account/credentialStore.js) 根据宿主声明返回来源的受限密钥记录，Provider 必须经 context.credentials.get 读取；不得自行读取其他来源密钥。运行凭据保护实现位于 server/credentials，通过公开 api 供平台装配使用。

`identity.providerCredentials` 由 [providerCredentialManager.mjs](../../modules/identity-account/server/credentials/providerCredentialManager.mjs) 装配，implements contracts/ProviderCredentialManager 的 read/update；仅向核心配置路由发布受限方法，不公开文件路径、replace 或保护器。Provider 插件仍使用按来源授权的凭据 getter。

preferences.repository 提供本机键值偏好，默认模型与 UI 设置共用；preferenceRouter 接收限定键和值。网络安全公共 API 包括 safeProxy、externalUrlPolicy、requestContext/publicLibraryGuard/privateLibraryGuard，分别处理认证上下文、请求限额、外部网络及私有内容边界。
identity.httpSecurity 以 contracts/httpSecurity.d.ts 为协议，发布代理 Router、公共库 Guard、私有路径拒绝和 getAuthenticatedScope。媒体 Router 通过服务获取当前请求的下载作用域；不接受客户端提供目录或认证上下文。插件清理时 kernel 撤销服务。

认证作用域解析实现归 [userScopeResolver.js](../../modules/identity-account/server/security/userScopeResolver.js)，公共 opaque user id 校验与共享白名单归 contracts/userIdentity.js；project/runtimePaths 只使用公共校验，不拥有认证实现。AuthenticatedUserScope 包含 opaqueUserId 和当前用户目录，节点路由经身份服务读取该标识，不自行获取业务内部认证对象。用户目录创建仍经宿主注入的适配器执行。

身份异常统一使用 contracts/identityErrors 的错误码及 IdentityError，保留 HTTP status、取消 AbortError 名称和领域 instanceof 语义。凭据解密/读取错误不泄露底层密钥内容；日志经 kernel Logger。Windows 使用 DPAPI，macOS 使用本机 Keychain，保护器保留密钥生成、缓冲区清零和缺失密钥处理。

## 数据模型

工作区身份为 opaque user id，数据与私有目录按用户隔离。偏好、头像/背景与模型凭据的存储位置独立；凭据保存保护后的内容，API 只返回掩码/是否配置，不返回原 Key。用户上传图像受类型、大小及私有路径校验。

`USER_PROVIDER_SECRET_KEYS` 来自 contracts/providerSecrets.js，是来源登记的公共名单。插件凭据授予还有宿主目录独立授权，单纯写 manifest 不取得密钥。安全模块存储与日志不可混入项目归档。

## 功能结构

宿主选定用户域 -> 读取/保护运行凭据 -> 插件激活按双重授权获取来源密钥。HTTP 请求先经过本机安全边界再进入业务 Router；媒体静态请求再经私有目录拒绝与公开素材授权。

启动时，[apps/backend/main.mjs](../../apps/backend/main.mjs) 将同步目录创建适配器传入 `inspectLocalAuthenticationConfiguration`，由它继续注入 `createUserScopeResolver`。`createActiveUserContext` 在插件激活前同步初始化当前用户目录；作用域解析器不直接调用文件系统。缺少适配器时会抛出 `USER_SCOPE_DIRECTORY_SERVICE_MISSING`，后端无法启动。通用脱敏函数归 kernel/redaction.js，身份模块仅转出同一实现。

外部 URL 策略限制协议、地址解析/重定向和本机网络范围；安全代理与媒体远端读取复用此边界。偏好保存保留版本冲突语义，头像取消/失败不覆写新状态。当前旧工作区状态和个别兼容读取仍存在，按规范差异记录，不宣称已清理所有旧数据分支。
identity.externalUrlFetch 通过受限服务复用外部 URL 策略；每次重定向重新验证，丢弃的响应体释放。地址范围交给 Node BlockList，IPv6 映射/转换和非公网范围拒绝；undici dispatcher 的 lookup 绑定已验证地址，不再次解析到未校验目标，TLS/Host 保留原域名。整条重定向链共用超时信号；响应消费结束关闭连接池，传输失败销毁连接池。自定义 fetchImpl 是可信注入点，必须遵循 dispatcher。浏览器 ui.account 提供头像操作和外观挂载/卸载，不暴露偏好存储实现。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/identity-account/browser.manifest.json](../../modules/identity-account/browser.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/identity-account/browser.ts](../../modules/identity-account/browser.ts) | 模块入口或装配 | `default` | 含 DOM/事件、服务注册/生命周期 调用；时机见实现 |
| [modules/identity-account/credentialStore.js](../../modules/identity-account/credentialStore.js) | 存储访问或状态管理 | `createCredentialStore` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/desktop.manifest.json](../../modules/identity-account/desktop.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/identity-account/desktop/atomicFile.mjs](../../modules/identity-account/desktop/atomicFile.mjs) | 桌面平台适配 | `writeFileAtomically` | 含 文件系统 调用；时机见实现 |
| [modules/identity-account/desktop/localWorkspace.mjs](../../modules/identity-account/desktop/localWorkspace.mjs) | 桌面平台适配 | `chooseLocalWorkspace`, `createLocalWorkspace` | 含 文件系统 调用；时机见实现 |
| [modules/identity-account/desktopPlugin.mjs](../../modules/identity-account/desktopPlugin.mjs) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/identity-account/exports.json](../../modules/identity-account/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/identity-account/index.js](../../modules/identity-account/index.js) | 模块入口或装配 | `createCredentialStore`, `createActiveUserContext`, `attachActiveUserContext`, `getAuthenticatedRequest` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/server.manifest.json](../../modules/identity-account/server.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/identity-account/server/appearance/backgroundImage.js](../../modules/identity-account/server/appearance/backgroundImage.js) | 服务端领域实现 | `MAX_BACKGROUND_BYTES`, `MAX_BACKGROUND_PIXELS`, `MAX_BACKGROUND_EDGE`, `BackgroundError`, `normalizeBackgroundImage` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/server/appearance/backgroundRouter.js](../../modules/identity-account/server/appearance/backgroundRouter.js) | HTTP 转换与校验 | `createBackgroundRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/identity-account/server/appearance/backgroundStore.js](../../modules/identity-account/server/appearance/backgroundStore.js) | 存储访问或状态管理 | `createBackgroundStore` | 含 文件系统 调用；时机见实现 |
| [modules/identity-account/server/credentials/macosCredentialProtector.mjs](../../modules/identity-account/server/credentials/macosCredentialProtector.mjs) | 服务端领域实现 | `createMacosKeychainProtector` | 含 子进程 调用；时机见实现 |
| [modules/identity-account/server/credentials/providerCredentialManager.mjs](../../modules/identity-account/server/credentials/providerCredentialManager.mjs) | 服务端领域实现 | `createProviderCredentialManager` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/server/credentials/providerCredentialStore.mjs](../../modules/identity-account/server/credentials/providerCredentialStore.mjs) | 存储访问或状态管理 | `PROVIDER_CREDENTIAL_FILE_NAME`, `createPlatformCredentialProtector`, `createWindowsDpapiProtector`, `createProviderCredentialStore` | 含 文件系统、子进程 调用；时机见实现 |
| [modules/identity-account/server/preferences/preferenceStore.js](../../modules/identity-account/server/preferences/preferenceStore.js) | 存储访问或状态管理 | `createPreferenceStore`, `createPreferenceRouter` | 含 文件系统、HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/identity-account/server/security/externalUrlPolicy.js](../../modules/identity-account/server/security/externalUrlPolicy.js) | 协议、校验或数据规则 | `ExternalUrlPolicyError`, `isPrivateNetworkAddress`, `validateExternalUrl`, `fetchExternalUrl` | 含 HTTP/网络 调用；时机见实现 |
| [modules/identity-account/server/security/localAuthentication.js](../../modules/identity-account/server/security/localAuthentication.js) | 服务端领域实现 | `createExactLocalBoundary`, `createActiveUserContext`, `attachActiveUserContext`, `getAuthenticatedRequest` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/server/security/localAuthenticationRuntime.js](../../modules/identity-account/server/security/localAuthenticationRuntime.js) | 运行、调度或服务 | `inspectLocalAuthenticationConfiguration` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/server/security/privateLibraryGuard.js](../../modules/identity-account/server/security/privateLibraryGuard.js) | 服务端领域实现 | `denyPrivateLibraryPath` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/server/security/publicLibraryGuard.js](../../modules/identity-account/server/security/publicLibraryGuard.js) | 服务端领域实现 | `createPublicLibraryGuard` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/server/security/redaction.js](../../modules/identity-account/server/security/redaction.js) | 服务端领域实现 | `redactSensitive`, `redactSecretsOnly`, `redactString` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/server/security/requestContext.js](../../modules/identity-account/server/security/requestContext.js) | 服务端领域实现 | `getRequestContext`, `createSecureLogger`, `createRequestContextMiddleware`, `installSecureConsole` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/server/security/safeProxyRouter.js](../../modules/identity-account/server/security/safeProxyRouter.js) | HTTP 转换与校验 | `createSafeProxyRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/identity-account/server/security/userScopeResolver.js](../../modules/identity-account/server/security/userScopeResolver.js) | 服务端领域实现 | `UserScopeError`, `createServerAuthenticationContext`, `createActiveUserAuthenticationContext`, `resolveServerAuthenticationIdentity`, `createUserScopeResolver` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/serverPlugin.js](../../modules/identity-account/serverPlugin.js) | 模块入口或装配 | `default` | 含 HTTP/网络、服务注册/生命周期 调用；时机见实现 |
| [modules/identity-account/ui/appearance/CanvasAppearanceSettings.tsx](../../modules/identity-account/ui/appearance/CanvasAppearanceSettings.tsx) | 浏览器交互与状态辅助 | `CanvasAppearanceSettings` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/ui/appearance/CanvasWallpaper.tsx](../../modules/identity-account/ui/appearance/CanvasWallpaper.tsx) | 浏览器交互与状态辅助 | `WallpaperLayers`, `CanvasWallpaper` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/ui/appearance/appearance.css](../../modules/identity-account/ui/appearance/appearance.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/identity-account/ui/appearance/canvasAppearance.ts](../../modules/identity-account/ui/appearance/canvasAppearance.ts) | 浏览器交互与状态辅助 | `APPEARANCE_KEY`, `BACKGROUND_ENDPOINT`, `MAX_BACKGROUND_BYTES`, `BackgroundImage`, `AppearancePreferences`, `CanvasAppearance`, `DEFAULT_APPEARANCE`, `parseAppearance`, `parseBackgroundImage`, `createCanvasAppearanceStore`, `CanvasAppearanceStore`, `installCanvasAppearance`, `useCanvasAppearance` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/identity-account/ui/appearance/themeTokens.ts](../../modules/identity-account/ui/appearance/themeTokens.ts) | 浏览器交互与状态辅助 | `CANVAS_THEMES`, `CanvasTheme`, `themeTokenCss`, `applyCanvasTheme` | 含 DOM/事件 调用；时机见实现 |
| [modules/identity-account/ui/profile/accountUiService.ts](../../modules/identity-account/ui/profile/accountUiService.ts) | 运行、调度或服务 | `createAccountUiService` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/ui/profile/canvasAvatar.ts](../../modules/identity-account/ui/profile/canvasAvatar.ts) | 浏览器交互与状态辅助 | `avatarColor`, `avatarText`, `avatarClass` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/ui/profile/localProfile.ts](../../modules/identity-account/ui/profile/localProfile.ts) | 浏览器交互与状态辅助 | `StableLocalProfileAdapter`, `applyStoredAvatar`, `installLocalProfile`, `uninstallLocalProfileForTests` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/ui/profile/localUser.ts](../../modules/identity-account/ui/profile/localUser.ts) | 浏览器交互与状态辅助 | `LocalUser`, `readLocalUser`, `useLocalUser` | 未检出平台调用；不等于纯函数证明 |
| [modules/identity-account/ui/profile/preferenceStore.ts](../../modules/identity-account/ui/profile/preferenceStore.ts) | 存储访问或状态管理 | `PreferenceStorage`, `PreferenceStoreOptions`, `createPreferenceStore`, `installPreferenceStore`, `preferenceStorage`, `uninstallPreferenceStoreForTests` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |

<!-- source-inventory:end -->
