# Project

## 职责与边界

管理画布项目、文件夹、修订冲突、恢复点、快照及导入导出。入口 [serverPlugin.js](../../modules/project/serverPlugin.js) 获取标准 project.repository 及独立目录/恢复/事务/文件服务，不依赖 SQLite 类。浏览器入口 browser.ts 管理项目视图及自动保存；具体数据库在 plugins/storage/sqlite。

## 接口契约

contracts 的 ProjectRepository 提供 get/list/save/delete，目录、恢复点和事务协议在 [projectRepositoryExtensions.d.ts](../../modules/contracts/projectRepositoryExtensions.d.ts)，文件/归档能力在 [projectFiles.d.ts](../../modules/contracts/projectFiles.d.ts)。SQLite 插件通过 projectRepository.js 串行化共享连接操作，事务内操作使用同一授权上下文；业务 Router 不获取连接或 SQL 方法。

`project.snapshots` 提供 JSON 快照写入；`media.projectFiles.sanitizeWorkflowNodes` 将项目内联媒体转 URL。`agent.archive` 是可选会话归档服务，含会话的导入缺少该服务时明确拒绝，不静默丢聊天。

[workflowRouter.js](../../modules/project/server/workflow/workflowRouter.js) 挂载 `/api/workflows`；folderRouter 挂载 `/api/folders`；projectTransferRouter 承接项目包、整库包、JSON、复制与只读预览。保存返回 success/id/revision，冲突返回 409/REVISION_CONFLICT/currentRevision，其他结构和限额由归档协议及实现校验。
浏览器项目经 ui.canvas.project 消费图重映射、分组清理、模态和提示能力，经 ui.media.recovery 恢复中断节点；服务由画布/媒体插件提供，project manifest 声明 requires。公共文档和坐标协议不依赖 React，hooks 类型保留在项目 UI。

## 数据模型

项目含 id/title/revision/status/folderId/coverUrl/createdAt/updatedAt、nodes/groups/viewport。数据库保存 payload_json 与摘要字段；workflows.db 位于当前用户 library。folders 维护层级/项目数量；workflow_recovery_points 保存项目版本与快照，workflow_quarantine 隔离损坏记录。

素材位于 `library/media/<projectId>/<类型>/`；项目 JSON 快照与归档不等同数据库事务。包内聊天是展示历史，不含密钥、Skill 正文、运行授权或可重放检查点。`.nako` 最大 2 GiB，聊天归档最大 32 MiB；JSON 只含画布结构。

## 功能结构

`projectDashboardHeader.tsx` 的首页品牌显示“NAKO Agent 纳科画布智能体”，顶部只保留设置入口；创建画布使用最近项目区的新建画布卡片或全部项目中的创建入口。

保存流程：校验文档与 revision -> 仓储写入/内联媒体规范化 -> JSON 快照 -> 同步文件夹计数 -> 返回保存回执。浏览器只有确认当前修改都已保存才导出或切换；revision 冲突不覆盖最新版本。

`canvasWorkflowLoad.resetWorkflowId(defaultTitle?)` 记录新画布的默认标题，仅保存在当前浏览器状态。`canvasWorkflowSave` 在新文档首次保存且标题仍为该默认值时读取当前用户的完整项目列表，选取未占用的原名或 `-1`、`-2` 等后缀；保存后通过已有文档同步流程更新标题。自定义标题、已有项目和导入文档不参与自动编号，切换画布后忽略迟到的列表结果；列表读取失败则终止本次保存，允许重试。

导入先校验归档路径、标识、内容和限额，创建独立项目并重映射媒体/聊天引用。项目保存或聊天导入失败按本次事务与归档回滚清理；重复导入不覆盖已有项目，也不恢复在途生成。SQLite 按当前表结构初始化，旧字段、schema 升级及迁移备份逻辑已移除；本轮未打开或修改真实数据库。

### 作品展示与 OSS 归档

封面、说明及案例列表仍由 `public/share/index.json` 提供。`archive` 支持 `/share/*.nako` 和 HTTPS OSS 对象地址（可带签名查询参数），由 contracts/showcaseArchive.js 统一校验。前端仅发送 `{ archive }`：预览使用 `POST /api/workflows/preview`，导入使用 `POST /api/workflows/restore?copy=true`，不读取完整归档为 Blob。上传文件的二进制预览/恢复接口保留。

案例可配置独立 `video` 字段，填写 `/share/*.mp4`、`/share/*.webm` 或 HTTPS/OSS 地址（保留签名查询参数，拒绝含凭据的地址），校验由 [showcaseVideo.js](../../modules/contracts/showcaseVideo.js) 在前后端共用。[shareShowcase.tsx](../../modules/project/ui/navigation/shareShowcase.tsx) 仅在详情顶部渲染原生播放器，提供播放、进度、音量和全屏控制；卡片继续使用 `cover`，播放器将其作为播放前的封面。未配置有效视频时显示封面，不从 `.nako` 中提取视频；编码须受客户端支持，推荐 H.264/AAC MP4。

[shareShowcaseVideo.ts](../../modules/project/ui/navigation/shareShowcaseVideo.ts) 在打开详情后发送 `POST /api/showcase/videos`，请求为 `{video}`，完成后接收 `{url}`。首次下载期间显示居中的转圈加载动画，无可见缓存文字，保留“视频加载中”的无障碍状态标签；成功后才把本地接口地址交给播放器；`preload="none"` 且不自动播放，前端不读取视频为 Blob。下载或播放失败显示封面并提供重试；关闭或切换详情会中止前端等待、停止播放、释放播放器来源，已启动的后端共享下载继续完成并供下次复用。

[showcaseVideoCache.js](../../modules/project/server/project/showcaseVideoCache.js) 只接受应用案例目录中列出的 `video`，按完整来源地址的 SHA-256 在当前用户 `cache/showcase-videos/<hash>/` 保存 `video.bin` 与 `video.json`（来源、MIME、大小）。同源并发请求共用任务，先下载到 `.download-*` 临时目录，成功后原子改名；失败清理本次临时目录。重启后核对元数据和大小再复用，不完整缓存重新下载；用户缓存目录互相独立，不自动过期。更新成片须更换 `video` 地址或删除该用户对应缓存，同地址不会主动查询远端版本。

下载和文件读写均通过 [ProjectFileStore](../../modules/contracts/projectFiles.d.ts)，平台适配器 [showcaseVideoDownload.js](../../plugins/storage/sqlite/showcaseVideoDownload.js) 由 `projectFileStore.js` 装配，流式写入并核对 MIME、实际字节数和声明大小；最大 2 GiB、超时 10 分钟，不跟随重定向。源须能被后端直接 GET，无需前端跨域读取。[showcaseVideoRouter.js](../../modules/project/server/project/showcaseVideoRouter.js) 只调用注入缓存服务；`GET/HEAD /api/showcase/videos/:key` 重新核对目录，再以相对文件名和缓存根目录发送完成文件，提供正确视频 MIME、Range/206、缓存重验证和当前用户隔离，不将本地磁盘路径返回前端。无效来源返回 400/INVALID_SHOWCASE_VIDEO，未列出的来源或标识返回 404/SHOWCASE_VIDEO_NOT_LISTED，大小超限返回 413/SHOWCASE_VIDEO_TOO_LARGE，远端下载错误返回 502/SHOWCASE_VIDEO_DOWNLOAD_FAILED，其它缓存错误返回 500。

当前“首尔来了个顺德大小姐”的 `video` 临时使用 MDN 的公开 CC0 花朵示例视频，仅用于测试播放器；可在 `public/share/index.json` 将该字段替换为作品成片地址。

`serverPlugin.js` 将缓存配置为当前用户根目录的 `cache/showcase/`；`showcaseArchiveCache.js` 只接受应用目录中 index.json 已列出的归档地址。以完整源地址的 SHA-256 区分缓存，同源并发请求共享任务。下载和文件 I/O 通过 ProjectFileStore，由存储适配器执行；下载超时为 10 分钟，最大 2 GiB，不跟随重定向。先下载至 `.download-*` 临时目录，解压并验证包后原子改名为 `<hash>/project.nako` 与 `extracted/`；失败删除本次临时目录，后续可重试，未完成的下载不会命中缓存。

已缓存归档跨应用重启复用；预览直接读取缓存解压目录的 workflow/manifest JSON，并通过现有预览素材接口发送媒体文件，不写项目数据库。复制复用缓存归档执行原有导入、引用重映射及事务流程，始终作为新副本导入。缓存不会按时间自动过期；案例文件更新需修改 archive 地址或清除该用户对应缓存，避免同一地址继续命中旧内容。OSS 地址必须能被后端直接 GET（公开读取或有效的签名 URL），无需前端 CORS；首次下载时地址失效会返回 SHOWCASE_DOWNLOAD_FAILED，非目录地址返回 SHOWCASE_ARCHIVE_NOT_LISTED。

示例：保持其他字段不变，将 `archive` 填为 `https://<bucket>.oss-cn-hangzhou.aliyuncs.com/showcase/<case>-v2.nako`。

预览素材接口校验路径及目录边界后，通过 `sendFile(relativePath, { root: mediaDirectory })` 发送文件。Express 的隐藏文件检查仅作用于素材相对路径，避免应用父目录 `.desktop-dev` 导致所有素材被拒绝；素材目录内的隐藏文件仍不可读取，图片 MIME 和视频 Range 由 Express 处理。

缓存测试位于 `tests/showcase-archive-cache.test.js` 与 `tests/showcase-video-cache.test.js`，覆盖分块下载、并发合并、重启后离线复用、本地源、来源限定、用户隔离、大小限制、失败清理及缓存目录中的 Range/HEAD；`tests/home-showcase.test.js` 验证前端只发送 JSON、使用本地播放地址、等待/错误/重试和关闭期间迟到结果处理。测试与源码目录分开维护。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/project/browser.manifest.json](../../modules/project/browser.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/project/browser.ts](../../modules/project/browser.ts) | 模块入口或装配 | `default` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/exports.json](../../modules/project/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/project/index.js](../../modules/project/index.js) | 模块入口或装配 | `createProjectRepository` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server.manifest.json](../../modules/project/server.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/project/server/project/archiveCommon.js](../../modules/project/server/project/archiveCommon.js) | 服务端领域实现 | `ProjectTransferError`, `ARCHIVE_FORMAT`, `LIBRARY_ARCHIVE_FORMAT`, `ARCHIVE_VERSION`, `DEFAULT_MAX_ARCHIVE_BYTES`, `DEFAULT_MAX_ARCHIVE_ENTRIES`, `sanitizeDownloadName`, `normalizeArchivePath`, `isAllowedArchiveEntry`, `isAllowedLibraryArchiveEntry`, `isAllowedArchiveType`, `isSafePathSegment`, `validateLibraryCatalog`, `copyNewTree`, `removeCreatedPaths`, `rewriteProjectMediaReferences`, `receiveArchive`, `statLocalArchive`, `validateArchive` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/project/archiveHistory.js](../../modules/project/server/project/archiveHistory.js) | 服务端领域实现 | `writeAgentHistories`, `readAgentHistories` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/project/folderRouter.js](../../modules/project/server/project/folderRouter.js) | HTTP 转换与校验 | `createFolderRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/project/server/project/libraryArchive.js](../../modules/project/server/project/libraryArchive.js) | 服务端领域实现 | `createLibraryArchive`, `readLibraryArchive`, `restoreLibraryArchive` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/project/projectArchive.js](../../modules/project/server/project/projectArchive.js) | 服务端领域实现 | `createProjectArchive`, `readProjectArchive`, `readProjectArchiveDocument`, `restoreProjectArchive` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/project/projectTransferRouter.js](../../modules/project/server/project/projectTransferRouter.js) | HTTP 转换与校验 | `createProjectTransferRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/project/server/project/sharedProject.js](../../modules/project/server/project/sharedProject.js) | 服务端领域实现 | `validateSharedProject`, `resetSharedProject` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/project/showcaseArchiveCache.js](../../modules/project/server/project/showcaseArchiveCache.js) | 服务端领域实现 | `createShowcaseArchiveCache` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/project/showcaseVideoCache.js](../../modules/project/server/project/showcaseVideoCache.js) | 服务端领域实现 | `createShowcaseVideoCache` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/project/showcaseVideoRouter.js](../../modules/project/server/project/showcaseVideoRouter.js) | HTTP 转换与校验 | `createShowcaseVideoRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/project/server/workflow/workflowRouter.js](../../modules/project/server/workflow/workflowRouter.js) | HTTP 转换与校验 | `normalizeWorkflowCoverUrl`, `createWorkflowRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/project/server/workflow/workflowSnapshot.js](../../modules/project/server/workflow/workflowSnapshot.js) | 服务端领域实现 | `createWorkflowSnapshotWriter` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/workspace/resourceOwnership.js](../../modules/project/server/workspace/resourceOwnership.js) | 服务端领域实现 | `DEFAULT_SHARED_RESOURCE_ALLOWLIST`, `listResourceOwnership`, `getResourceOwnership`, `assertResourceOwnershipCoverage` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/workspace/runtimePaths.js](../../modules/project/server/workspace/runtimePaths.js) | 运行、调度或服务 | `resolveRuntimePaths`, `RUNTIME_PATHS` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/workspace/userScopeResolver.js](../../modules/project/server/workspace/userScopeResolver.js) | 服务端领域实现 | `UserScopeError`, `assertCanonicalOpaqueUserId`, `createServerAuthenticationContext`, `createActiveUserAuthenticationContext`, `resolveServerAuthenticationIdentity`, `createUserScopeResolver` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/server/workspace/workspacePaths.js](../../modules/project/server/workspace/workspacePaths.js) | 服务端领域实现 | `BASE_LIBRARY_DIR`, `getWorkspacePaths`, `getUrlPrefix` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/serverPlugin.js](../../modules/project/serverPlugin.js) | 模块入口或装配 | `default` | 含 HTTP/网络、服务注册/生命周期 调用；时机见实现 |
| [modules/project/ui/navigation/dashboardBrowserHeader.css](../../modules/project/ui/navigation/dashboardBrowserHeader.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/project/ui/navigation/dashboardBrowserHeader.tsx](../../modules/project/ui/navigation/dashboardBrowserHeader.tsx) | 浏览器交互与状态辅助 | `DashboardBrowserHeader` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/navigation/dashboardCollection.css](../../modules/project/ui/navigation/dashboardCollection.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/project/ui/navigation/dashboardCollection.tsx](../../modules/project/ui/navigation/dashboardCollection.tsx) | 浏览器交互与状态辅助 | `DashboardCollection` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/navigation/dashboardCover.tsx](../../modules/project/ui/navigation/dashboardCover.tsx) | 浏览器交互与状态辅助 | `DashboardCover` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/navigation/dashboardDeleteConfirmation.tsx](../../modules/project/ui/navigation/dashboardDeleteConfirmation.tsx) | 浏览器交互与状态辅助 | `DashboardDeleteConfirmation` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/navigation/dashboardFolderAction.tsx](../../modules/project/ui/navigation/dashboardFolderAction.tsx) | 浏览器交互与状态辅助 | `DashboardFolderAction` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/navigation/dashboardParts.tsx](../../modules/project/ui/navigation/dashboardParts.tsx) | 浏览器交互与状态辅助 | `DashboardErrorStatus`, `ModalProps`, `DashboardModal`, `DashboardBreadcrumbs`, `DashboardCleanupStatus` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/navigation/dashboardRename.tsx](../../modules/project/ui/navigation/dashboardRename.tsx) | 浏览器交互与状态辅助 | `useDashboardRename` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/navigation/dashboardRuntime.ts](../../modules/project/ui/navigation/dashboardRuntime.ts) | 运行、调度或服务 | `DashboardRuntime`, `DashboardIcon` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/navigation/openSettings.ts](../../modules/project/ui/navigation/openSettings.ts) | 浏览器交互与状态辅助 | `SettingsSection`, `openSettings` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/navigation/projectDashboard.tsx](../../modules/project/ui/navigation/projectDashboard.tsx) | 浏览器交互与状态辅助 | `ProjectDashboardProps`, `ProjectDashboard` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/navigation/projectDashboardCards.tsx](../../modules/project/ui/navigation/projectDashboardCards.tsx) | 界面呈现与交互 | `DashboardCardProps`, `DashboardProjectCard`, `DashboardFolderCard` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/navigation/projectDashboardChrome.ts](../../modules/project/ui/navigation/projectDashboardChrome.ts) | 浏览器交互与状态辅助 | `projectCoverPreviewUrl` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/navigation/projectDashboardData.ts](../../modules/project/ui/navigation/projectDashboardData.ts) | 浏览器交互与状态辅助 | `DashboardProject`, `DashboardFolder`, `DashboardData`, `DashboardFilter`, `DashboardSort`, `DashboardOrder`, `dashboardBreadcrumb`, `visibleDashboard`, `createDashboardClient` | 含 HTTP/网络 调用；时机见实现 |
| [modules/project/ui/navigation/projectDashboardHeader.tsx](../../modules/project/ui/navigation/projectDashboardHeader.tsx) | 浏览器交互与状态辅助 | `DashboardHeaderProps`, `DashboardHeaderIcons`, `ProjectDashboardHeader` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/navigation/projectDashboardHome.css](../../modules/project/ui/navigation/projectDashboardHome.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/project/ui/navigation/projectDashboardHome.tsx](../../modules/project/ui/navigation/projectDashboardHome.tsx) | 浏览器交互与状态辅助 | `ProjectDashboardHome` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/navigation/projectDashboardMenu.tsx](../../modules/project/ui/navigation/projectDashboardMenu.tsx) | 浏览器交互与状态辅助 | `DashboardMenuProps`, `ProjectDashboardMenu` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/navigation/shareShowcase.css](../../modules/project/ui/navigation/shareShowcase.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/project/ui/navigation/shareShowcase.tsx](../../modules/project/ui/navigation/shareShowcase.tsx) | 浏览器交互与状态辅助 | `ShareShowcase` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/project/ui/navigation/shareShowcaseImport.ts](../../modules/project/ui/navigation/shareShowcaseImport.ts) | 浏览器交互与状态辅助 | `restoreShowcaseArchive`, `previewShowcaseArchive` | 含 HTTP/网络 调用；时机见实现 |
| [modules/project/ui/navigation/shareShowcaseVideo.ts](../../modules/project/ui/navigation/shareShowcaseVideo.ts) | 浏览器交互与状态辅助 | `useShowcaseVideo` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/project/ui/navigation/useProjectDashboard.ts](../../modules/project/ui/navigation/useProjectDashboard.ts) | 浏览器交互与状态辅助 | `useProjectDashboard` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/canvasAutoSave.ts](../../modules/project/ui/persistence/canvasAutoSave.ts) | 浏览器交互与状态辅助 | `AutoSaveReason`, `AutoSaveResult`, `AutoSaveDocumentState`, `CanvasAutoSaveController`, `CanvasAutoSaveOptions`, `CanvasAutoSaveAdapter`, `createCanvasAutoSaveController`, `installCanvasAutoSave` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/persistence/canvasAutoSaveLifecycle.ts](../../modules/project/ui/persistence/canvasAutoSaveLifecycle.ts) | 浏览器交互与状态辅助 | `CanvasAutoSaveProps`, `useCanvasAutoSave` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/canvasProjectDocument.ts](../../modules/project/ui/persistence/canvasProjectDocument.ts) | 浏览器交互与状态辅助 | `ProjectDocument`, `parseProjectDocument`, `copyProjectGraph`, `freshProjectDocument` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/persistence/canvasProjectFiles.ts](../../modules/project/ui/persistence/canvasProjectFiles.ts) | 浏览器交互与状态辅助 | `useCanvasProjectFiles` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/canvasProjectTransfer.ts](../../modules/project/ui/persistence/canvasProjectTransfer.ts) | 浏览器交互与状态辅助 | `useCanvasProjectTransfer` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/canvasSaveFeedback.ts](../../modules/project/ui/persistence/canvasSaveFeedback.ts) | 浏览器交互与状态辅助 | `projectCover`, `useCanvasSaveFeedback` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/canvasSession.ts](../../modules/project/ui/persistence/canvasSession.ts) | 浏览器交互与状态辅助 | `CANVAS_SESSION_STORAGE_KEY`, `CanvasResumeState`, `CanvasSessionAdapter`, `parseCanvasResumeState`, `createCanvasSession`, `installCanvasSession` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/canvasWorkflow.ts](../../modules/project/ui/persistence/canvasWorkflow.ts) | 浏览器交互与状态辅助 | `CanvasWorkflowProps`, `useCanvasWorkflow` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/persistence/canvasWorkflowDocument.ts](../../modules/project/ui/persistence/canvasWorkflowDocument.ts) | 浏览器交互与状态辅助 | `copy`, `content`, `stale`, `validateDocument`, `request` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/canvasWorkflowHooks.ts](../../modules/project/ui/persistence/canvasWorkflowHooks.ts) | 浏览器交互与状态辅助 | `ProjectHooks` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/persistence/canvasWorkflowLoad.ts](../../modules/project/ui/persistence/canvasWorkflowLoad.ts) | 浏览器交互与状态辅助 | `useWorkflowLoad` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/canvasWorkflowSave.ts](../../modules/project/ui/persistence/canvasWorkflowSave.ts) | 浏览器交互与状态辅助 | `useWorkflowSave` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/persistence/canvasWorkflowState.ts](../../modules/project/ui/persistence/canvasWorkflowState.ts) | 浏览器交互与状态辅助 | `useWorkflowState`, `WorkflowState` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/canvasWorkflowView.ts](../../modules/project/ui/persistence/canvasWorkflowView.ts) | 界面呈现与交互 | `useWorkflowView`, `WorkflowView` | 含 DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/preferenceStore.ts](../../modules/project/ui/persistence/preferenceStore.ts) | 存储访问或状态管理 | `PreferenceStorage`, `PreferenceStoreOptions`, `createPreferenceStore`, `installPreferenceStore`, `preferenceStorage`, `uninstallPreferenceStoreForTests` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/projectMediaImport.ts](../../modules/project/ui/persistence/projectMediaImport.ts) | 浏览器交互与状态辅助 | `prepareProjectMedia` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/project/ui/persistence/workflowMerge.ts](../../modules/project/ui/persistence/workflowMerge.ts) | 浏览器交互与状态辅助 | `WorkflowRecord`, `WorkflowConflictError`, `sameWorkflowValue`, `mergeWorkflow` | 未检出平台调用；不等于纯函数证明 |
| [modules/project/ui/projectUiServices.ts](../../modules/project/ui/projectUiServices.ts) | 运行、调度或服务 | `canvasProjectUi`, `projectMediaRecovery` | 未检出平台调用；不等于纯函数证明 |

<!-- source-inventory:end -->
