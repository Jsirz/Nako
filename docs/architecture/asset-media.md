# Asset Media

## 职责与边界

媒体业务模块负责浏览器媒体交互、HTTP 转换与服务装配；文件保存由 `media.filesystem`，处理由 `media.ffmpeg-sharp`。入口 [serverPlugin.js](../../modules/asset-media/serverPlugin.js) 已去除 fs/path/Sharp 导入；媒体 Router 不读取目录或启动进程。

## 接口契约

contracts 的 MediaStore 提供 save/read/remove；MediaProcessor 提供 crop/trimVideo/compose/thumbnail，二者分别注入。`media.operations` 的 upload/importFile/list/favorite/deleteAsset/trash/cleanupProject 等返回 `{status, body}`，library/downloads 是受限子服务。`media.agent` 读取、检视及转换项目参考；`media.generation` 保存或下载模型结果。

`media.operations.projectFiles` 实现 contracts/ProjectMediaStore，并由业务模块注册 `media.projectFiles` 供项目及 ComfyUI 消费。saveMediaToFile 同步保存 data URL 并返回 id/url，sanitizeWorkflowNodes 处理四类内联媒体字段；不向调用方暴露目录创建函数。

[mediaAssetRouter.js](../../modules/asset-media/server/media/mediaAssetRouter.js) 转换 HTTP 到操作服务；editing/library/download Router 分别转发处理、素材库和下载配置。缩略图处理返回无路径 reference，Router 通过 media.delivery.open 取得流；[mediaDeliveryResponse.js](../../modules/asset-media/server/media/mediaDeliveryResponse.js) 处理 HEAD、Range、ETag/Last-Modified 条件响应，并在所有结束路径 close。library 文件不再由 Router 挂载本地目录。
HTTP 鉴权能力通过 identity.httpSecurity 注入：代理、公开库 Guard、私有路径拒绝和认证下载作用域仍由身份模块执行，Guard 顺序保持不变。MediaStore.read 缺失资产抛结构化 404；媒体探测细分原因位于 error.context.operationCode，工作流兼容判断消费该字段。

## 数据模型

媒体二进制存于当前用户 `library/media/<projectId>/<images|videos|audios>/`，同 id JSON 记录 filename/nodeId/prompt/model/createdAt 等。素材库位于 library/assets，工作流预设位于 library/workflows；可恢复清理批次与记录由 filesystem 适配器管理。

内联媒体保存使用唯一 UUID、真实媒体扩展名及项目归属校验；metadata 写入失败不会返回成功 URL。视频尾帧按 nodeId + prompt 查询最新已存在文件，复用结果。缩略图按原图路径、尺寸、mtime 与最大边长计算指纹，写临时文件后重命名，重复请求共享任务。

## 功能结构

上传或本地导入先校验类型、扩展名、内容与大小，探测媒体元数据后保存记录。跨项目复制校验当前用户边界；素材“删除记录”与真正二进制清理区分，避免破坏已有画布引用。恢复遇到同名目标明确拒绝，不覆盖。

项目无引用素材清理由 [assetStore.js](../../plugins/media/filesystem/assetStore.js) 通过注入的 `project.repository.get(projectId)` 读取最新项目，再扫描并移动无引用文件到可恢复清理批次；项目不存在时返回 404，不执行清理。不调用 SQLite 内部读取方法。
外部素材通过 identity.externalUrlFetch 检查 HTTP(S)、凭据、地址和各次重定向，再由 filesystem 适配器有界读取；请求超时和大小上限由实际操作定义。下载失败不返回成功资产，存储实现负责目录及真实路径边界。浏览器入口注册 ui.media.settings 和 ui.media.recovery；设置挂载返回释放函数，节点恢复不重新提交生成。

[projectMediaStore.js](../../plugins/media/filesystem/projectMediaStore.js) 在适配器校验项目标识、媒体类型、大小、内容和真实目录边界。缩略图限制本地 library 图片并校验真实路径，保留 Windows 长路径与并发去重处理。文件/进程实现集中在 server/adapters，原 server/media 和 server/utils 入口转发；下载 helper 要求注入媒体本地化能力，不再直接 fetch。平台能力仍经公开业务 API 被外部模块消费，该依赖尚需迁移，见 [规范差异](conformance.md)。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/asset-media/browser.manifest.json](../../modules/asset-media/browser.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/asset-media/browser.ts](../../modules/asset-media/browser.ts) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/asset-media/exports.json](../../modules/asset-media/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/asset-media/index.js](../../modules/asset-media/index.js) | 模块入口或装配 | `createMediaAssetRouter`, `createMediaEditingRouter`, `createMediaService` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/server.manifest.json](../../modules/asset-media/server.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/asset-media/server/adapters/imageHelpers.js](../../modules/asset-media/server/adapters/imageHelpers.js) | 服务端领域实现 | `resolveLocalPath`, `resolveImageToBase64`, `extractRawBase64`, `mapAspectRatio`, `generateAssetId`, `saveAssetMetadata`, `saveMediaBufferToFile`, `downloadAndSaveAsset` | 含 文件系统 调用；时机见实现 |
| [modules/asset-media/server/adapters/mediaArtifact.js](../../modules/asset-media/server/adapters/mediaArtifact.js) | 服务端领域实现 | `MediaArtifactError`, `resolveMediaArtifact`, `inspectMediaArtifact` | 含 文件系统 调用；时机见实现 |
| [modules/asset-media/server/adapters/mediaAssetListing.js](../../modules/asset-media/server/adapters/mediaAssetListing.js) | 服务端领域实现 | `buildAssetUrl`, `normalizeAsset`, `listMediaAssets` | 含 文件系统 调用；时机见实现 |
| [modules/asset-media/server/adapters/mediaMetadataProbe.js](../../modules/asset-media/server/adapters/mediaMetadataProbe.js) | 服务端领域实现 | `MediaProbeError`, `createMediaMetadataProbe` | 含 子进程 调用；时机见实现 |
| [modules/asset-media/server/adapters/recoveredVideo.js](../../modules/asset-media/server/adapters/recoveredVideo.js) | 服务端领域实现 | `validateRecoveredVideo` | 含 文件系统 调用；时机见实现 |
| [modules/asset-media/server/media/mediaArtifact.js](../../modules/asset-media/server/media/mediaArtifact.js) | 服务端领域实现 | `重导出 ../adapters/mediaArtifact.js` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/server/media/mediaAssetListing.js](../../modules/asset-media/server/media/mediaAssetListing.js) | 服务端领域实现 | `重导出 ../adapters/mediaAssetListing.js` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/server/media/mediaAssetRouter.js](../../modules/asset-media/server/media/mediaAssetRouter.js) | HTTP 转换与校验 | `createMediaAssetRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/asset-media/server/media/mediaDeliveryResponse.js](../../modules/asset-media/server/media/mediaDeliveryResponse.js) | 服务端领域实现 | `sendMediaDelivery` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/server/media/mediaDownloadRouter.js](../../modules/asset-media/server/media/mediaDownloadRouter.js) | HTTP 转换与校验 | `createMediaDownloadRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/asset-media/server/media/mediaEditingRouter.js](../../modules/asset-media/server/media/mediaEditingRouter.js) | HTTP 转换与校验 | `createMediaEditingRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/asset-media/server/media/mediaLibraryRouter.js](../../modules/asset-media/server/media/mediaLibraryRouter.js) | HTTP 转换与校验 | `createMediaLibraryRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/asset-media/server/media/mediaMetadataProbe.js](../../modules/asset-media/server/media/mediaMetadataProbe.js) | 服务端领域实现 | `重导出 ../adapters/mediaMetadataProbe.js` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/server/media/recoveredVideo.js](../../modules/asset-media/server/media/recoveredVideo.js) | 服务端领域实现 | `重导出 ../adapters/recoveredVideo.js` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/server/storage/tosRouter.js](../../modules/asset-media/server/storage/tosRouter.js) | HTTP 转换与校验 | `createTosRouter` | 含 HTTP/网络 调用；时机见实现 |
| [modules/asset-media/server/utils/imageHelpers.js](../../modules/asset-media/server/utils/imageHelpers.js) | 服务端领域实现 | `重导出 ../adapters/imageHelpers.js` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/server/utils/resolutionMapper.js](../../modules/asset-media/server/utils/resolutionMapper.js) | 服务端领域实现 | `SEEDREAM_V5_PRO_ASPECT_RATIOS`, `getSeedreamV5ProDimensions`, `MODEL_RESOLUTION_MAP`, `getModelDimensions` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/server/utils/tosSigner.js](../../modules/asset-media/server/utils/tosSigner.js) | 服务端领域实现 | `signTOSV4` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/serverPlugin.js](../../modules/asset-media/serverPlugin.js) | 模块入口或装配 | `default` | 含 HTTP/网络、服务注册/生命周期 调用；时机见实现 |
| [modules/asset-media/ui/media/GenerationWaiting.tsx](../../modules/asset-media/ui/media/GenerationWaiting.tsx) | 浏览器交互与状态辅助 | `GenerationWaiting` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/ui/media/assetOrganization.ts](../../modules/asset-media/ui/media/assetOrganization.ts) | 浏览器交互与状态辅助 | `ASSET_CATEGORIES`, `assetCategory`, `assetDefaultName` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/ui/media/audioWaveform.ts](../../modules/asset-media/ui/media/audioWaveform.ts) | 浏览器交互与状态辅助 | `AudioRange`, `AudioWaveformEvents`, `AudioWaveform`, `createAudioWaveform` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/ui/media/canvasAudioPlayer.tsx](../../modules/asset-media/ui/media/canvasAudioPlayer.tsx) | 浏览器交互与状态辅助 | `CanvasAudioPlayer` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/canvasImagePreview.tsx](../../modules/asset-media/ui/media/canvasImagePreview.tsx) | 界面呈现与交互 | `CanvasImagePreview` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/canvasImageUpscale.ts](../../modules/asset-media/ui/media/canvasImageUpscale.ts) | 浏览器交互与状态辅助 | `createCanvasImageUpscale`, `useCanvasImageUpscale` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/canvasMediaOperations.ts](../../modules/asset-media/ui/media/canvasMediaOperations.ts) | 浏览器交互与状态辅助 | `uploadMediaFile`, `uploadMediaData`, `inspectImage`, `nearestAspectRatio`, `videoOrientation`, `MediaRuntime`, `createCanvasMedia`, `useCanvasSnapshots`, `useCanvasAudioTrim`, `useCanvasAssets`, `useCanvasCompositeSave`, `useCanvasImageEditSave`, `useCanvasCropSave`, `useCanvasCollage` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/canvasMediaTransport.ts](../../modules/asset-media/ui/media/canvasMediaTransport.ts) | 客户端或传输 | `MediaKind`, `classifyMedia`, `readMediaResponse`, `mediaResultUrl`, `uploadMediaFile`, `uploadMediaData` | 含 HTTP/网络 调用；时机见实现 |
| [modules/asset-media/ui/media/canvasVideoPlayer.tsx](../../modules/asset-media/ui/media/canvasVideoPlayer.tsx) | 浏览器交互与状态辅助 | `CanvasVideoPlayer` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/generationMediaMetadata.ts](../../modules/asset-media/ui/media/generationMediaMetadata.ts) | 浏览器交互与状态辅助 | `MediaMetadata`, `nearestAspectRatio`, `readableMediaUrl`, `inspectImage`, `inspectVideo`, `extractVideoLastFrame` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/generationWaiting.css](../../modules/asset-media/ui/media/generationWaiting.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/asset-media/ui/media/imageAngleDraft.ts](../../modules/asset-media/ui/media/imageAngleDraft.ts) | 浏览器交互与状态辅助 | `imageToolModel`, `panoramaPrompt`, `createImageAngleDraft` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/ui/media/imageCollage.ts](../../modules/asset-media/ui/media/imageCollage.ts) | 浏览器交互与状态辅助 | `CollageItem`, `layoutImageCollage`, `loadCollageImage`, `renderImageCollage` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/mediaDownloadFileName.ts](../../modules/asset-media/ui/media/mediaDownloadFileName.ts) | 浏览器交互与状态辅助 | `DownloadableMediaNode`, `MediaDownloadFileNameAdapter`, `MediaDownloadOpenResult`, `MediaDownloadSettings`, `MediaDownloadResult`, `buildMediaDownloadFileName`, `createMediaDownloadAdapter`, `installMediaDownloadFileName` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/mediaDownloadSettings.ts](../../modules/asset-media/ui/media/mediaDownloadSettings.ts) | 浏览器交互与状态辅助 | `mountMediaDownloadSettings` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/mediaEditing.ts](../../modules/asset-media/ui/media/mediaEditing.ts) | 浏览器交互与状态辅助 | `CompareConfig`, `MediaEditState`, `normalizeCompareConfig`, `createMediaEditingClient`, `MediaEditingClient`, `installMediaEditing` | 含 HTTP/网络 调用；时机见实现 |
| [modules/asset-media/ui/media/mediaNodeSizing.ts](../../modules/asset-media/ui/media/mediaNodeSizing.ts) | 浏览器交互与状态辅助 | `AdaptiveMediaNode`, `MediaNodeSizingAdapter`, `isResizableMediaNode`, `videoDisplayAspectRatio`, `adaptiveMediaNodeSize`, `installMediaNodeSizing` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/ui/media/mediaOperationRecovery.ts](../../modules/asset-media/ui/media/mediaOperationRecovery.ts) | 运行、调度或服务 | `interruptedMediaNode` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/ui/media/minimaxH3.ts](../../modules/asset-media/ui/media/minimaxH3.ts) | 浏览器交互与状态辅助 | `MiniMaxH3Mode`, `MiniMaxH3CanvasNode`, `MiniMaxH3VisualPort`, `MINIMAX_H3_INPUT_COUNT`, `TEXT_PORT_Y`, `MINIMAX_H3_DURATION`, `alignMiniMaxH3Frames`, `MiniMaxH3DurationInfo`, `describeMiniMaxH3Duration`, `MINIMAX_H3_MODE_OPTIONS`, `getMiniMaxH3VisualPorts`, `MiniMaxH3Media`, `getMiniMaxH3Media`, `getMiniMaxH3ModeMedia`, `isMiniMaxH3ConnectionAllowed`, `getMiniMaxH3RejectionMessage`, `getMiniMaxH3PortY`, `MINIMAX_H3_REJECTED_PORT`, `resolveMiniMaxH3PortIndex`, `getMiniMaxH3ModeLabel`, `remapMiniMaxH3ParentIds`, `buildMiniMaxH3Request`, `MiniMaxH3CanvasAdapter`, `showMiniMaxH3RejectionHint`, `installMiniMaxH3CanvasAdapter` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/minimaxPromptScroll.ts](../../modules/asset-media/ui/media/minimaxPromptScroll.ts) | 浏览器交互与状态辅助 | `MINIMAX_PROMPT_SCROLL_CSS`, `installMiniMaxPromptScroll` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/ui/media/nativeStableMediaRenderer.ts](../../modules/asset-media/ui/media/nativeStableMediaRenderer.ts) | 界面呈现与交互 | `NativeStableMediaRenderer` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/ui/media/stableMediaDomAdapter.ts](../../modules/asset-media/ui/media/stableMediaDomAdapter.ts) | 浏览器交互与状态辅助 | `StableMediaTarget`, `StableMediaMode`, `isStableMediaManagedSource`, `scanStableMediaTargets`, `applyStableMediaMode` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/ui/media/stableMediaEnhancement.ts](../../modules/asset-media/ui/media/stableMediaEnhancement.ts) | 浏览器交互与状态辅助 | `StableMediaRenderer`, `StableMediaEnhancement`, `startStableMediaEnhancement` | 未检出平台调用；不等于纯函数证明 |
| [modules/asset-media/ui/media/useCanvasVideoPlayback.ts](../../modules/asset-media/ui/media/useCanvasVideoPlayback.ts) | 浏览器交互与状态辅助 | `VideoRuntime`, `VideoNode`, `useCanvasVideoPlayback` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/videoPlayback.ts](../../modules/asset-media/ui/media/videoPlayback.ts) | 浏览器交互与状态辅助 | `VideoSoundState`, `createStableVideoPlayback`, `StableVideoPlayback`, `installStableVideoPlayback` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/videoSnapshots.ts](../../modules/asset-media/ui/media/videoSnapshots.ts) | 浏览器交互与状态辅助 | `currentVideoFrame`, `firstLastVideoFrames` | 含 DOM/事件 调用；时机见实现 |
| [modules/asset-media/ui/media/videoWorkflows.ts](../../modules/asset-media/ui/media/videoWorkflows.ts) | 浏览器交互与状态辅助 | `VideoWorkflowType`, `MiniMaxH3Mode`, `VideoWorkflowRequest`, `VideoCapability`, `VideoWorkflowResult`, `createVideoWorkflowClient`, `VideoWorkflowClient`, `installVideoWorkflows` | 含 HTTP/网络 调用；时机见实现 |

<!-- source-inventory:end -->
