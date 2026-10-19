# Canvas UI

## 职责与边界

负责节点呈现、连线、分组、选择、拖拽、剪贴板、撤销、设置和画布交互。入口 [browser.ts](../../modules/canvas-ui/browser.ts) 安装交互及节点框架；根组件装配和 ui.root 注册归 apps/canvas。禁止导入 Provider、适配器和 local-runtime API；本地工作流能力通过 kernel 的 `ui.local-runtime` 服务获取。

业务模块的横向调用已改为服务或公共协议，公开组件由应用组合根装配。静态边界通过不代表全部运行行为与 AGENTS.md 其它约束均已验证，见 [规范差异](conformance.md)。

## 接口契约

内置 `shot-analysis` 节点由 [canvasShotAnalysisNode.tsx](../../modules/canvas-ui/ui/nodes/canvasShotAnalysisNode.tsx) 渲染；视频上传经 kernel 的 `ui.media.canvas`，运行经既有 node-runs HTTP 客户端。节点只使用 contracts 的拉片数据，不导入 Provider 或本地运行时。[shotAnalysisCanvas.ts](../../modules/canvas-ui/ui/canvas/shotAnalysisCanvas.ts) 先构造并校验完整插入结果，再由 `useCanvasAgentControls` 检查项目、epoch、节点和 resultId，统一提交节点/分组/历史，不连接 JSON 输出到媒体输入。

内置 `video-replica` 由 [canvasVideoReplicaNode.tsx](../../modules/canvas-ui/ui/nodes/canvasVideoReplicaNode.tsx) 渲染，复用 `useShotAnalysisRun` 的保存、批准、观察和取消流程；成功后打开分析详情，不直接生成视频。[useReplicaUpload.ts](../../modules/canvas-ui/ui/nodes/useReplicaUpload.ts) 经 kernel 媒体服务上传源视频及替换图片，切换项目/节点/文档或只读状态中止上传并过滤旧结果。[videoReplicaCanvas.ts](../../modules/canvas-ui/ui/canvas/videoReplicaCanvas.ts) 校验公共计划后构造完整的参考节点、Video 节点和分组，`useCanvasAgentControls` 核对源视频、结果/计划 id、文档 epoch 以及模型视频引用能力，再一次提交历史。

`ui.root.mount(element)` 挂载 React 根并登记卸载；根 manifest 显式依赖 `ui.local-runtime`。`node.registry` 提供节点定义，`nodes.client` 处理节点生成与观察。公开纯函数/组件出口列在 [exports.json](../../modules/canvas-ui/exports.json)。

应用组合根 [canvasRuntime.tsx](../../apps/canvas/canvasRuntime.tsx) 装配 React、项目、生成及媒体 hooks；[canvasComponents.ts](../../apps/canvas/canvasComponents.ts)、[canvasPresentations.ts](../../apps/canvas/canvasPresentations.ts) 装配各模块公开组件。[rootPlugin.tsx](../../apps/canvas/rootPlugin.tsx) 挂载与卸载根视图，[promptVendor.ts](../../apps/canvas/promptVendor.ts) 绑定编辑器依赖，[useRecovery.ts](../../apps/canvas/useRecovery.ts) 绑定恢复观察。上述文件归 apps/canvas，不由画布业务模块横向导入。

`canvasApplicationDependencies.ts` 描述应用注入形状，跨模块 hook 输入和返回值来自 contracts/canvasServiceBindings；节点、文档、媒体 composer 和提示词编辑协议同样归 contracts，React 类型留在 UI 或组合根。画布通过 kernel 读取模型、媒体、Agent 文档及呈现服务，不获取原始客户端、模型密钥或本地进程对象。
ui.canvas.project 发布 contracts/projectWorkflow 的图重映射、分组清理、模态、提示与增强观察能力；ui.media.recovery 由媒体插件提供，预设复制通过 kernel 获取，不静态调用媒体恢复实现。插件声明及磁盘 manifest 的 provides/requires 同步，kernel 负责撤销注册。

## 数据模型

视频复刻的 `pluginResult.analysis` 为 `VideoReplicaResult`。`replicaAssetResultId/replicaReplacements` 将替换图片及描述绑定到分析结果，`replicaRequirements/AspectRatio/Resolution` 保存输出设置，`replicaPlan` 保存可编辑计划；更换源视频、替换资产或输出设置后清除计划，源 URL 变化时禁止使用旧结果生成。复制复刻节点保留成功分析和缓存媒体，清除计划、替换及运行授权；跨项目导入由 project 重定位源视频、分镜素材和替换图片并清除计划。生成节点使用 `replicaSourceNodeId/PlanId/ShotId` 去重，不作为运行授权。

`parameters.video` 保存上传后本地 URL；也可从 video 端口获取上游结果。`pluginResult.analysis` 保留最后成功的 `ShotAnalysisResult`，包括结果 id、源、模型 JSON 和逐镜头素材。`nodeRunId/nodeRequestId` 跟踪当前任务，`nodeAnalysisRunId` 指向最后成功分析缓存，失败/取消不覆盖成功结果。`nodeDirectRunRequestId` 记录用户本次点击开始的 requestId，仅匹配该任务时自动批准并在成功后自动入画布，终态消费该标识；可在节点离开可见区后恢复观察。复制、预设和导入清除该标识。插入节点使用 `shotAnalysisResultId/ShotId/NodeId` 去重；每镜头创建说明和选中的媒体节点并成组，导入结果也可手动插入。

画布文档包含 nodes、groups、连线、viewport、标题、项目 id/revision；持久化由 project 模块承担。节点执行状态与错误提示、结果 URL、参数及端口来自注册表和公共运行协议。编辑交互的悬浮、选择、拖动、菜单、弹窗等状态只属于浏览器视图。

新建画布默认标题由 `canvasEditorHooks.defaultCanvasTitle` 按设备本地日期生成，例如“10月10日”；`useCanvasTitle` 初始化与 `clearCanvas` 重置标题复用该规则。`clearCanvas` 将默认标题传给项目身份重置方法，项目模块首次保存时为同名默认标题追加 `-1`、`-2` 等可用后缀，并同步画布标题。标题可由用户修改，加载已有画布时读取其保存的标题。

持久化节点类型与端口身份不同于数组位置；插件缺席保留缺失节点占位，不悄悄改成其他节点。运行中节点的复制限制、只读画布导航及媒体工具栏沿用当前工作区已有实现，本次不回滚用户修改。

## 功能结构

视频复刻卡片沿用拉片卡片尺寸、拖拽与左右居中连接点；[videoReplicaDialog.tsx](../../modules/canvas-ui/ui/nodes/videoReplicaDialog.tsx) 和 [videoReplicaNode.css](../../modules/canvas-ui/ui/nodes/videoReplicaNode.css) 提供分镜分析、资产替换、复刻计划三个页签。原资产缩略图使用其首个相关分镜的关键帧，不执行主体分割。用户可按角色/场景/元素筛选，上传替换图片或填写描述，并调整整体要求、比例、分辨率及各段提示词。分镜分析页仅展示摘要、素材、镜头详情及关联资产，不提供原始分析 JSON 编辑入口。只读预览允许查看详情与播放素材，禁止上传、编辑、分析和生成。

确认计划可只创建节点供逐个生成，或创建后调用现有生成服务处理全部新视频节点。每段替换图片以 `image` 输出、分镜片段以 `video` 输出连接到 Video 的 `references` 输入，模型固定为 Work-Fisher Seedance 2.5 Standard，`videoMode=multimodal`；每段独立成组并保留现有生成并发限制和错误处理。短分镜按模型最短 4 秒输出，长镜头最多 30 秒一段；当前不自动拼接最终成片。

逐帧拉片卡片使用 [shotAnalysisNode.css](../../modules/canvas-ui/ui/nodes/shotAnalysisNode.css)，默认 440×560，展示图标标题、视频时长/尺寸、16:9 预览、青色拆解维度胶囊及整行开始按钮，不展示模型名称。结果详情默认折叠。仅在播放器、按钮、表单和折叠开关等交互元素上阻止 pointerdown 冒泡；标题、说明及空白区域沿用节点 Frame 的拖拽处理。滚轮事件留在卡片内用于滚动详情，不触发画布缩放。

逐帧拉片复用普通节点的左右居中加号连接点及悬停/选中交互，不使用通用插件从顶部排列的端口按钮。`canvasNodeRules.nodePortY` 与 `canvasEdges` 的拖拽预览均定位到卡片垂直中点；连接仍使用声明的 video 输入和 analysis 输出及既有媒体类型校验。

逐帧拉片点击开始先通过画布现有保存回调保存当前文档；保存失败、保存期间文档继续变化或保存时切换项目时，不准备运行请求。保存确认后准备任务并自动批准本次任务，不显示二次授权卡；内核能力授权、预算和快照校验仍保留。成功回执先通过画布同步节点更新保存结果并消费执行意图，随后自动创建分镜节点及分组，一次写入历史并聚焦；无需再次确认。已有完成结果不会因重新打开而自动插入；未插入的导入结果或插入失败可在折叠详情中手动添加。仅重新提取使用 0 模型预算并复用本地缓存，可编辑 JSON 校准时间戳，新结果同样自动进入画布。

`useShotAnalysisRun` 用同步锁防重复操作，用会话及操作序号过滤切项目/新任务后的旧响应，同一成功回执只处理一次；取消后继续查询原任务。明确 4xx 准备失败可重新开始，传输结果未知则保留 requestId 查询；批准请求失败保留已准备任务，重新查询时恢复同一任务，避免重复调用模型。读取/上传失败显示可重试提示。上传切换项目、节点或只读状态时中止；预览模式可查看和播放结果，隐藏写操作且不观察运行。新任务期间保留上次成功结果，失败/取消后仍可插入；复制或导入清除分析缓存及直接执行标识，不借旧任务授权提取。前端只渲染本地 URL，视频/音频不预加载完整文件，图片延迟加载。

全景图与角度图的 [imageToolGenerateButton.tsx](../../modules/canvas-ui/ui/dialogs/imageToolGenerateButton.tsx) 订阅 `generation.defaults`，通过 `ui.media.canvas.imageToolModel` 读取当前可用的默认图像模型，保持按钮提示与创建节点的选择一致；没有支持图生图的默认模型时禁用生成并提示设置。已有节点的角度参数编辑仍可保存，不依赖默认模型可用性。浏览器插件显式声明默认模型服务依赖。

设置“存储”页保留 `ui.media.settings` 下载设置，并通过 kernel ServiceRegistry 的 `ui.project.cacheSettings` 挂载作品缓存清理卡片；契约为 contracts/browserCapabilities 的 `ProjectCacheSettingsService`，实现及 HTTP 请求归 project 模块所有。切换分类或关闭设置时释放两个页面挂载，不由 canvas-ui 操作文件系统。

`CanvasEmptyState.tsx` 的空画布提示展示标题、操作说明和文本/图像/视频/音频/更多入口，标题上方不显示加号装饰图标及外框；节点创建仍调用原画布操作处理器。

`canvasHeader.tsx` 将项目菜单、名称及保存状态呈现在胶囊区域，下方左对齐的独立“退出画布”按钮复用 `leave`：可编辑画布先保存并核对回执，失败时保留当前画布；只读预览直接返回。菜单保留“保存退出”（退出图标）、“保存”、“导入画布 / 导出画布”及项目切换，不再重复提供“退出项目”。独立退出按钮在保存或传输期间禁用，桌面端设为非窗口拖拽区域。

`canvasApplication.tsx` 组织 hooks 与渲染；`useCanvas*` 分担生命周期、保存、项目切换、交互和运行观察；`renderCanvas*` 负责呈现。`ui/nodes` 包含原生及通用节点、参数编辑、授权与节点请求；`ui/dialogs` 包含图片编辑、裁剪、预览、项目菜单等。

项目切换先核对保存回执；异步结果按项目/epoch 防止迟到响应写入。只读模式禁止修改/生成。模型未配置、节点缺失、服务请求失败保留明确空/错误状态。图像编辑、场景、节点和文本控件已按状态、行为、渲染职责拆分；超时及交互错误使用 contracts/canvasErrors，未改变工具授权或运行协议。

首页使用技能经 kernel 事件总线进入 `useCanvasProjectNavigation`，仅在首页接收有效技能 slug，关闭旧 Agent 面板并复用新建画布流程。`useCanvasDocumentEffects` 复用首次保存，在持久化项目 id 就绪后发布技能选择事件；待选技能按导航序号隔离，切换项目后丢弃。保存失败提示手动保存，保存成功后继续选择技能，不重复新建或保存。

新节点只采用有效默认模型，失效默认值显示选择模型的空状态，不自动替换为其他模型。`useGenerationAvailability` 对已删除的明确模型显示后端配置错误并禁用生成、停止轮询；选择其他模型后重新查询，临时网络故障仍每两秒重试。已有节点的明确模型选择不被改写。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/canvas-ui/browser.manifest.json](../../modules/canvas-ui/browser.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/canvas-ui/browser.ts](../../modules/canvas-ui/browser.ts) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/canvas-ui/exports.json](../../modules/canvas-ui/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/canvas-ui/index.ts](../../modules/canvas-ui/index.ts) | 模块入口或装配 | `CanvasApplication` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/app/canvas.css](../../modules/canvas-ui/ui/app/canvas.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/app/canvasComponentType.ts](../../modules/canvas-ui/ui/app/canvasComponentType.ts) | 浏览器交互与状态辅助 | `CanvasComponent` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/app/modelBrandIcons.tsx](../../modules/canvas-ui/ui/app/modelBrandIcons.tsx) | 浏览器交互与状态辅助 | `Gemini`, `OpenAI`, `Jimeng`, `Doubao`, `Kling`, `Aliyun`, `Grok`, `DeepSeek`, `Mureka` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/app/pluginSurfaces.ts](../../modules/canvas-ui/ui/app/pluginSurfaces.ts) | 浏览器交互与状态辅助 | `optionalAgentSurfaces` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/app/presentation.ts](../../modules/canvas-ui/ui/app/presentation.ts) | 浏览器交互与状态辅助 | `bind`, `bindRef` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/CanvasEmptyState.tsx](../../modules/canvas-ui/ui/canvas/CanvasEmptyState.tsx) | 浏览器交互与状态辅助 | `CanvasEmptyState` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasAlignment.ts](../../modules/canvas-ui/ui/canvas/canvasAlignment.ts) | 浏览器交互与状态辅助 | `AlignmentGuide`, `alignCanvasDrag` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasApplication.tsx](../../modules/canvas-ui/ui/canvas/canvasApplication.tsx) | 浏览器交互与状态辅助 | `CanvasApplication` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasApplicationDependencies.ts](../../modules/canvas-ui/ui/canvas/canvasApplicationDependencies.ts) | 浏览器交互与状态辅助 | `Runtime`, `Dependencies` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasApplicationEvents.ts](../../modules/canvas-ui/ui/canvas/canvasApplicationEvents.ts) | 浏览器交互与状态辅助 | `useCanvasDeferredFrame`, `useCanvasSurfaceSize`, `useCanvasPageEvents` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasAssetInsertion.ts](../../modules/canvas-ui/ui/canvas/canvasAssetInsertion.ts) | 浏览器交互与状态辅助 | `assetNode`, `createCanvasAssetInsertion`, `useCanvasAssetInsertion` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasClipboard.ts](../../modules/canvas-ui/ui/canvas/canvasClipboard.ts) | 浏览器交互与状态辅助 | `CanvasClipboardNode`, `CloneCanvasNodesOptions`, `CanvasClipboardViewport`, `CanvasClipboardBounds`, `InsertClonedCanvasNodesOptions`, `ClonedCanvasNodes`, `StableCanvasClipboardAdapter`, `GENERATING_COPY_MESSAGE`, `hasGeneratingCanvasNodes`, `cloneCanvasNodes`, `pointerToCanvasPoint`, `insertClonedCanvasNodes`, `deleteCanvasNodes`, `installStableCanvasClipboard` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasCommands.ts](../../modules/canvas-ui/ui/canvas/canvasCommands.ts) | 浏览器交互与状态辅助 | `CanvasCommandOptions`, `useCanvasCommands` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasConnectionHitTesting.ts](../../modules/canvas-ui/ui/canvas/canvasConnectionHitTesting.ts) | 浏览器交互与状态辅助 | `createConnectionHitTesting` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasConnectionHooks.ts](../../modules/canvas-ui/ui/canvas/canvasConnectionHooks.ts) | 浏览器交互与状态辅助 | `ConnectionNode`, `ConnectionDragState`, `ConnectionRuntime`, `useCanvasConnections` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasConnections.ts](../../modules/canvas-ui/ui/canvas/canvasConnections.ts) | 浏览器交互与状态辅助 | `CanvasConnectionNode`, `ConnectCanvasNodesOptions`, `CanvasConnectionIdentity`, `StableCanvasConnectionsAdapter`, `connectCanvasNodes`, `disconnectCanvasNodes`, `installStableCanvasConnections` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasContextActions.ts](../../modules/canvas-ui/ui/canvas/canvasContextActions.ts) | 浏览器交互与状态辅助 | `CanvasContextMenuType`, `CanvasConnectorSide`, `CanvasContextMenuState`, `CanvasContextActionEligibility`, `StableCanvasContextActionsAdapter`, `createStableCanvasContextActions`, `installStableCanvasContextActions` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasContextHooks.ts](../../modules/canvas-ui/ui/canvas/canvasContextHooks.ts) | 浏览器交互与状态辅助 | `useCanvasContextMenu` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasEdgeGeometry.ts](../../modules/canvas-ui/ui/canvas/canvasEdgeGeometry.ts) | 浏览器交互与状态辅助 | `Point`, `Curve`, `edgePath`, `edgePoint`, `edgeLength`, `edgePhase`, `edgeFlowSegments` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasEdges.tsx](../../modules/canvas-ui/ui/canvas/canvasEdges.tsx) | 浏览器交互与状态辅助 | `EdgeNode`, `CanvasEdges` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasEditing.ts](../../modules/canvas-ui/ui/canvas/canvasEditing.ts) | 浏览器交互与状态辅助 | `CanvasPositionedNode`, `MoveCanvasNodesOptions`, `SelectionResizeHandle`, `CanvasNodeFrame`, `ResizeCanvasSelectionOptions`, `CanvasHistory`, `StableCanvasEditingAdapter`, `moveCanvasNodes`, `resizeCanvasSelection`, `getMovableNodeIds`, `createCanvasHistory`, `commitCanvasHistory`, `undoCanvasHistory`, `redoCanvasHistory`, `installStableCanvasEditing` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasEditorHooks.ts](../../modules/canvas-ui/ui/canvas/canvasEditorHooks.ts) | 浏览器交互与状态辅助 | `useCanvasConnections`, `useCanvasHistory`, `defaultCanvasTitle`, `useCanvasTitle`, `useCanvasGroups`, `useCanvasMarquee`, `useCanvasLayout`, `useCanvasDrag`, `useCanvasResize`, `useCanvasEdgePan` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasGroups.ts](../../modules/canvas-ui/ui/canvas/canvasGroups.ts) | 浏览器交互与状态辅助 | `CanvasGroupableNode`, `CanvasGroup`, `CanvasGroupState`, `GroupCanvasNodesOptions`, `StableCanvasGroupsAdapter`, `groupCanvasNodes`, `ungroupCanvasNodes`, `cleanupCanvasGroups`, `renameCanvasGroup`, `getCanvasGroupByNodeId`, `getCanvasGroupById`, `getCommonCanvasGroup`, `installStableCanvasGroups` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasImageClipboard.ts](../../modules/canvas-ui/ui/canvas/canvasImageClipboard.ts) | 浏览器交互与状态辅助 | `ImageClipboardRuntime`, `copyCanvasImageToSystemClipboard` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasLayout.ts](../../modules/canvas-ui/ui/canvas/canvasLayout.ts) | 浏览器交互与状态辅助 | `CanvasLayoutNode`, `CanvasNodeMeasurer`, `StableCanvasLayoutAdapter`, `autoAlignCanvasNodes`, `gridLayoutCanvasNodes`, `installStableCanvasLayout` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasNavigation.ts](../../modules/canvas-ui/ui/canvas/canvasNavigation.ts) | 浏览器交互与状态辅助 | `CanvasPoint`, `CanvasViewport`, `WheelModifiers`, `WheelDelta`, `StableWheelSample`, `CanvasElementBounds`, `WheelMode`, `STABLE_MIN_ZOOM`, `STABLE_MAX_ZOOM`, `STABLE_WHEEL_ZOOM_SENSITIVITY`, `shouldKeepWheelInsideControl`, `shouldPreventBrowserZoom`, `installCanvasLocalBrowserZoomGuard`, `getWheelMode`, `canvasToScreen`, `screenToCanvas`, `panViewport`, `zoomViewportAtPoint`, `StableCanvasNavigationAdapter`, `installStableCanvasCompositingPolicy`, `installStableCanvasNavigation` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasNodeReferences.ts](../../modules/canvas-ui/ui/canvas/canvasNodeReferences.ts) | 浏览器交互与状态辅助 | `remapCanvasNodeReferences` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasScene.tsx](../../modules/canvas-ui/ui/canvas/canvasScene.tsx) | 浏览器交互与状态辅助 | `CanvasScene` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasSceneData.ts](../../modules/canvas-ui/ui/canvas/canvasSceneData.ts) | 浏览器交互与状态辅助 | `canvasSceneData`, `canvasVisibleScene`, `createCanvasSceneProjector` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasSelection.ts](../../modules/canvas-ui/ui/canvas/canvasSelection.ts) | 浏览器交互与状态辅助 | `SelectNodeOptions`, `CanvasBounds`, `ScreenMarquee`, `SelectGroupOptions`, `SelectionModifiers`, `StableCanvasSelectionAdapter`, `selectNode`, `intersectsMarquee`, `selectGroup`, `installStableCanvasSelection` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasTextActions.ts](../../modules/canvas-ui/ui/canvas/canvasTextActions.ts) | 浏览器交互与状态辅助 | `createCanvasTextActions` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/canvasViewport.ts](../../modules/canvas-ui/ui/canvas/canvasViewport.ts) | 界面呈现与交互 | `STABLE_MIN_ZOOM`, `STABLE_MAX_ZOOM`, `sliderViewport`, `focusedViewport`, `useCanvasViewport` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasWorkflowPresets.ts](../../modules/canvas-ui/ui/canvas/canvasWorkflowPresets.ts) | 浏览器交互与状态辅助 | `instantiateWorkflowPreset`, `useCanvasWorkflowPresets` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/canvasWorkspace.css](../../modules/canvas-ui/ui/canvas/canvasWorkspace.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/canvas/readOnlyBanner.tsx](../../modules/canvas-ui/ui/canvas/readOnlyBanner.tsx) | 浏览器交互与状态辅助 | `ReadOnlyBanner` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasAnnotation.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasAnnotation.tsx) | 界面呈现与交互 | `renderCanvasAnnotation` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasContextOverlays.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasContextOverlays.tsx) | 界面呈现与交互 | `renderCanvasContextOverlays` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasControls.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasControls.tsx) | 界面呈现与交互 | `renderCanvasControls` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasEmptyState.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasEmptyState.tsx) | 界面呈现与交互 | `renderCanvasEmptyState` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasHeader.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasHeader.tsx) | 界面呈现与交互 | `renderCanvasHeader` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasImageEditor.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasImageEditor.tsx) | 界面呈现与交互 | `renderCanvasImageEditor` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasImportInput.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasImportInput.tsx) | 界面呈现与交互 | `renderCanvasImportInput` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/renderCanvasMergeInput.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasMergeInput.tsx) | 界面呈现与交互 | `renderCanvasMergeInput` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasResize.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasResize.tsx) | 界面呈现与交互 | `renderCanvasResize` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasScene.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasScene.tsx) | 界面呈现与交互 | `renderCanvasScene` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasSelectionBox.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasSelectionBox.tsx) | 界面呈现与交互 | `renderCanvasSelectionBox` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasSettings.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasSettings.tsx) | 界面呈现与交互 | `renderCanvasSettings` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasSidePanels.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasSidePanels.tsx) | 界面呈现与交互 | `renderCanvasSidePanels` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/renderCanvasSidebar.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasSidebar.tsx) | 界面呈现与交互 | `renderCanvasSidebar` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/renderCanvasWorkspace.tsx](../../modules/canvas-ui/ui/canvas/renderCanvasWorkspace.tsx) | 界面呈现与交互 | `renderCanvasWorkspace` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/shotAnalysisCanvas.ts](../../modules/canvas-ui/ui/canvas/shotAnalysisCanvas.ts) | 浏览器交互与状态辅助 | `shotAnalysisCanvas` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/useCanvasAgentControls.tsx](../../modules/canvas-ui/ui/canvas/useCanvasAgentControls.tsx) | 浏览器交互与状态辅助 | `useCanvasAgentControls` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasAgentRuntime.tsx](../../modules/canvas-ui/ui/canvas/useCanvasAgentRuntime.tsx) | 运行、调度或服务 | `useCanvasAgentRuntime` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasAssetActions.tsx](../../modules/canvas-ui/ui/canvas/useCanvasAssetActions.tsx) | 浏览器交互与状态辅助 | `useCanvasAssetActions` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/useCanvasConnectionState.tsx](../../modules/canvas-ui/ui/canvas/useCanvasConnectionState.tsx) | 浏览器交互与状态辅助 | `useCanvasConnectionState` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/useCanvasDocumentEffects.tsx](../../modules/canvas-ui/ui/canvas/useCanvasDocumentEffects.tsx) | 浏览器交互与状态辅助 | `useCanvasDocumentEffects` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasDocumentState.tsx](../../modules/canvas-ui/ui/canvas/useCanvasDocumentState.tsx) | 浏览器交互与状态辅助 | `useCanvasDocumentState` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/useCanvasImageUpscale.ts](../../modules/canvas-ui/ui/canvas/useCanvasImageUpscale.ts) | 浏览器交互与状态辅助 | `useCanvasImageUpscale` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasPointerActions.tsx](../../modules/canvas-ui/ui/canvas/useCanvasPointerActions.tsx) | 浏览器交互与状态辅助 | `useCanvasPointerActions` | 含 HTTP/网络 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasProjectNavigation.tsx](../../modules/canvas-ui/ui/canvas/useCanvasProjectNavigation.tsx) | 浏览器交互与状态辅助 | `useCanvasProjectNavigation` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasSaveAndReferences.tsx](../../modules/canvas-ui/ui/canvas/useCanvasSaveAndReferences.tsx) | 浏览器交互与状态辅助 | `useCanvasSaveAndReferences` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/useCanvasSceneBridge.tsx](../../modules/canvas-ui/ui/canvas/useCanvasSceneBridge.tsx) | 浏览器交互与状态辅助 | `useCanvasSceneBridge` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasWorkspaceState.tsx](../../modules/canvas-ui/ui/canvas/useCanvasWorkspaceState.tsx) | 浏览器交互与状态辅助 | `useCanvasWorkspaceState` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/videoReplicaCanvas.ts](../../modules/canvas-ui/ui/canvas/videoReplicaCanvas.ts) | 浏览器交互与状态辅助 | `videoReplicaCanvas` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/design/designSystem.ts](../../modules/canvas-ui/ui/design/designSystem.ts) | 浏览器交互与状态辅助 | `重导出 ../../../kernel/ui/designSystem` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/design/designSystemStyles.ts](../../modules/canvas-ui/ui/design/designSystemStyles.ts) | 浏览器交互与状态辅助 | `重导出 ../../../kernel/ui/designSystemStyles` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/design/dom.ts](../../modules/canvas-ui/ui/design/dom.ts) | 浏览器交互与状态辅助 | `重导出 ../../../kernel/ui/dom` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/design/modalFocus.ts](../../modules/canvas-ui/ui/design/modalFocus.ts) | 浏览器交互与状态辅助 | `重导出 ../../../kernel/ui/modalFocus` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/CanvasProjectSwitcher.tsx](../../modules/canvas-ui/ui/dialogs/CanvasProjectSwitcher.tsx) | 界面呈现与交互 | `CanvasProjectSwitcher` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/CanvasTransferMenu.tsx](../../modules/canvas-ui/ui/dialogs/CanvasTransferMenu.tsx) | 界面呈现与交互 | `CanvasTransferMenu` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/canvasAnchoredPanel.css](../../modules/canvas-ui/ui/dialogs/canvasAnchoredPanel.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/dialogs/canvasAssetHistory.tsx](../../modules/canvas-ui/ui/dialogs/canvasAssetHistory.tsx) | 界面呈现与交互 | `CanvasAssetHistory` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasComparePreview.tsx](../../modules/canvas-ui/ui/dialogs/canvasComparePreview.tsx) | 界面呈现与交互 | `CanvasComparePreview` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasCompositePreview.tsx](../../modules/canvas-ui/ui/dialogs/canvasCompositePreview.tsx) | 界面呈现与交互 | `CanvasCompositePreview` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasContextMenu.tsx](../../modules/canvas-ui/ui/dialogs/canvasContextMenu.tsx) | 界面呈现与交互 | `ContextMenuIcons`, `CanvasContextMenuProps`, `CanvasContextMenu` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasDialogs.ts](../../modules/canvas-ui/ui/dialogs/canvasDialogs.ts) | 界面呈现与交互 | `CanvasLegacyWorkflowNode`, `CanvasImageResize`, `CanvasImageAnnotation`, `CanvasImageCrop`, `CanvasPanoramaScene`, `CanvasSaveDialog`, `useCanvasPanels`, `CanvasContextMenu`, `CanvasCompositePreview`, `CanvasComparePreview`, `CanvasMediaPreview`, `CanvasAssetDialog`, `CanvasOverlays`, `CanvasCompareNode`, `CanvasCompositeNode`, `CanvasMiniMaxNode`, `CanvasMediaToolbar`, `CanvasHeader`, `CanvasMinimap`, `CanvasSelectionBounds`, `CanvasViewportControls`, `CanvasTextComposer`, `CanvasImageComposer`, `CanvasVideoComposer`, `CanvasAudioNode`, `CanvasTextCard`, `CanvasImageCard`, `CanvasVideoCard`, `CanvasDimensions`, `CanvasAdvancedSettings`, `CanvasModelSelector`, `CanvasConnectedAssets`, `CanvasAssetHistory`, `CanvasTooltip`, `CanvasAssetLibrary`, `CanvasLibraryGrid`, `CanvasWorkflowLibrary`, `CanvasNodeFrame`, `CanvasNodeHeader`, `CanvasConnector`, `CanvasConnectors`, `CanvasNode`, `CanvasGenericNode`, `CanvasSidePanels`, `CanvasEdges`, `CanvasScene`, `equalCanvasNodeProps`, `CanvasSidebar`, `CanvasModelIcon`, `CanvasSettings` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/canvasHeader.tsx](../../modules/canvas-ui/ui/dialogs/canvasHeader.tsx) | 界面呈现与交互 | `CanvasHeader` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasImageAngle.tsx](../../modules/canvas-ui/ui/dialogs/canvasImageAngle.tsx) | 界面呈现与交互 | `CanvasImageAngle` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasImageAnnotation.tsx](../../modules/canvas-ui/ui/dialogs/canvasImageAnnotation.tsx) | 界面呈现与交互 | `CanvasImageAnnotation` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasImageCrop.tsx](../../modules/canvas-ui/ui/dialogs/canvasImageCrop.tsx) | 界面呈现与交互 | `CanvasImageCrop` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/canvasImageCropTypes.ts](../../modules/canvas-ui/ui/dialogs/canvasImageCropTypes.ts) | 界面呈现与交互 | `Runtime`, `Props`, `Dependencies`, `CropGesture` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/canvasImageResize.tsx](../../modules/canvas-ui/ui/dialogs/canvasImageResize.tsx) | 界面呈现与交互 | `CanvasImageResize` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasImageStudio.tsx](../../modules/canvas-ui/ui/dialogs/canvasImageStudio.tsx) | 界面呈现与交互 | `CanvasImageStudio` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasLibrary.css](../../modules/canvas-ui/ui/dialogs/canvasLibrary.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/dialogs/canvasLibrary.tsx](../../modules/canvas-ui/ui/dialogs/canvasLibrary.tsx) | 界面呈现与交互 | `CanvasLibraryGrid`, `Runtime`, `LibraryItem`, `Icons`, `AssetFields`, `GridProps`, `CanvasAssetLibrary`, `CanvasWorkflowLibrary` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasLibraryGrid.tsx](../../modules/canvas-ui/ui/dialogs/canvasLibraryGrid.tsx) | 界面呈现与交互 | `CanvasLibraryGrid` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasMediaPreview.tsx](../../modules/canvas-ui/ui/dialogs/canvasMediaPreview.tsx) | 界面呈现与交互 | `CanvasMediaPreview` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasMinimap.tsx](../../modules/canvas-ui/ui/dialogs/canvasMinimap.tsx) | 界面呈现与交互 | `CanvasMinimap` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasPanels.ts](../../modules/canvas-ui/ui/dialogs/canvasPanels.ts) | 界面呈现与交互 | `useCanvasPanels` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/canvasPanoramaScene.tsx](../../modules/canvas-ui/ui/dialogs/canvasPanoramaScene.tsx) | 界面呈现与交互 | `PanoramaRenderer`, `CanvasPanoramaScene` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasSaveDialog.css](../../modules/canvas-ui/ui/dialogs/canvasSaveDialog.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/dialogs/canvasSaveDialog.tsx](../../modules/canvas-ui/ui/dialogs/canvasSaveDialog.tsx) | 界面呈现与交互 | `CanvasSaveDialogProps`, `CanvasSaveDialog` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasSaveWrappers.ts](../../modules/canvas-ui/ui/dialogs/canvasSaveWrappers.ts) | 界面呈现与交互 | `CanvasAssetDialog` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/canvasSelectionBounds.tsx](../../modules/canvas-ui/ui/dialogs/canvasSelectionBounds.tsx) | 界面呈现与交互 | `CanvasSelectionBounds` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasSidePanels.ts](../../modules/canvas-ui/ui/dialogs/canvasSidePanels.ts) | 界面呈现与交互 | `CanvasSidePanels` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/canvasSidebar.tsx](../../modules/canvas-ui/ui/dialogs/canvasSidebar.tsx) | 界面呈现与交互 | `CanvasSidebar` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/canvasTooltip.tsx](../../modules/canvas-ui/ui/dialogs/canvasTooltip.tsx) | 界面呈现与交互 | `CanvasTooltip` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasViewportControls.tsx](../../modules/canvas-ui/ui/dialogs/canvasViewportControls.tsx) | 界面呈现与交互 | `CanvasViewportControls` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/compareGeometry.ts](../../modules/canvas-ui/ui/dialogs/compareGeometry.ts) | 界面呈现与交互 | `comparePosition`, `compareGeometry` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/compositeScene.ts](../../modules/canvas-ui/ui/dialogs/compositeScene.ts) | 界面呈现与交互 | `LayerTransform`, `CompositeLayer`, `CompositeScene`, `defaultTransform`, `cloneScene`, `initialCompositeScene`, `hitCompositeLayer`, `scaleCompositeLayer`, `drawComposite`, `compositeDimensions`, `hitCompositeCorner`, `resizeCompositeCorner`, `createCompositeHistory`, `serializedCompositeLayout` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/gridExport.ts](../../modules/canvas-ui/ui/dialogs/gridExport.ts) | 界面呈现与交互 | `GridOrder`, `gridExportIndices` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/imageAngle.css](../../modules/canvas-ui/ui/dialogs/imageAngle.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/dialogs/imageAnnotationDrawing.ts](../../modules/canvas-ui/ui/dialogs/imageAnnotationDrawing.ts) | 界面呈现与交互 | `AnnotationPoint`, `AnnotationTool`, `AnnotationStroke`, `drawAnnotationStroke`, `renderAnnotations` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/imageCropGeometry.ts](../../modules/canvas-ui/ui/dialogs/imageCropGeometry.ts) | 界面呈现与交互 | `CropSize`, `CropPoint`, `CropRect`, `CropHandle`, `cropMargin`, `cropRatios`, `equalCuts`, `cropRatio`, `centeredCrop`, `cropHandles`, `hitCrop`, `createCrop`, `resizeCrop`, `moveCrop`, `moveCropCut`, `cropSegments`, `CropOutput`, `cropOutputRects` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/imageCropGestures.ts](../../modules/canvas-ui/ui/dialogs/imageCropGestures.ts) | 界面呈现与交互 | `imageCropGestures`, `ImageCropGestures` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/imageCropOverlay.ts](../../modules/canvas-ui/ui/dialogs/imageCropOverlay.ts) | 界面呈现与交互 | `useImageCropOverlay` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/imageCropSave.ts](../../modules/canvas-ui/ui/dialogs/imageCropSave.ts) | 界面呈现与交互 | `imageCropSave`, `ImageCropSave` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/imageResizeGeometry.ts](../../modules/canvas-ui/ui/dialogs/imageResizeGeometry.ts) | 界面呈现与交互 | `重导出 ../../../contracts/imageResizeGeometry` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/imageStudio.css](../../modules/canvas-ui/ui/dialogs/imageStudio.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/dialogs/imageToolGenerateButton.tsx](../../modules/canvas-ui/ui/dialogs/imageToolGenerateButton.tsx) | 界面呈现与交互 | `ImageToolGenerateButton` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/minimapGeometry.ts](../../modules/canvas-ui/ui/dialogs/minimapGeometry.ts) | 界面呈现与交互 | `MinimapNode`, `NodeMeasurement`, `minimapScene`, `minimapViewport` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/panoramaGenerate.tsx](../../modules/canvas-ui/ui/dialogs/panoramaGenerate.tsx) | 界面呈现与交互 | `PanoramaGenerate` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/renderAnnotationTools.tsx](../../modules/canvas-ui/ui/dialogs/renderAnnotationTools.tsx) | 界面呈现与交互 | `renderAnnotationTools`, `renderAnnotationBrushSettings` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/renderImageCropStage.tsx](../../modules/canvas-ui/ui/dialogs/renderImageCropStage.tsx) | 界面呈现与交互 | `renderImageCropStage` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/renderImageCropToolbar.tsx](../../modules/canvas-ui/ui/dialogs/renderImageCropToolbar.tsx) | 界面呈现与交互 | `renderImageCropToolbar` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/useCanvasImageCropState.ts](../../modules/canvas-ui/ui/dialogs/useCanvasImageCropState.ts) | 界面呈现与交互 | `useCanvasImageCropState`, `ImageCropState` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/lifecycle/enhancementLifecycle.ts](../../modules/canvas-ui/ui/lifecycle/enhancementLifecycle.ts) | 浏览器交互与状态辅助 | `重导出 ../../../kernel/ui/enhancementLifecycle` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasAudioNode.tsx](../../modules/canvas-ui/ui/nodes/canvasAudioNode.tsx) | 浏览器交互与状态辅助 | `CanvasAudioNode` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasConnectedAssets.tsx](../../modules/canvas-ui/ui/nodes/canvasConnectedAssets.tsx) | 浏览器交互与状态辅助 | `ConnectedAsset`, `ConnectedAssetsProps`, `CanvasConnectedAssets` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasImageComposer.tsx](../../modules/canvas-ui/ui/nodes/canvasImageComposer.tsx) | 界面呈现与交互 | `CanvasImageComposer` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasImageNodes.tsx](../../modules/canvas-ui/ui/nodes/canvasImageNodes.tsx) | 浏览器交互与状态辅助 | `CanvasCompareNode`, `CanvasCompositeNode` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasLegacyWorkflowNode.tsx](../../modules/canvas-ui/ui/nodes/canvasLegacyWorkflowNode.tsx) | 浏览器交互与状态辅助 | `CanvasLegacyWorkflowNode` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasMediaCards.tsx](../../modules/canvas-ui/ui/nodes/canvasMediaCards.tsx) | 界面呈现与交互 | `CanvasImageCard`, `CanvasVideoCard`, `CanvasTextCard` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasMediaToolbar.tsx](../../modules/canvas-ui/ui/nodes/canvasMediaToolbar.tsx) | 浏览器交互与状态辅助 | `CanvasMediaToolbar` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasMiniMaxNode.tsx](../../modules/canvas-ui/ui/nodes/canvasMiniMaxNode.tsx) | 浏览器交互与状态辅助 | `CanvasMiniMaxNode` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasMiniMaxNodeStyles.ts](../../modules/canvas-ui/ui/nodes/canvasMiniMaxNodeStyles.ts) | 浏览器交互与状态辅助 | `triggerStyle`, `inputStyle`, `settingLabelStyle`, `settingControlStyle` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasMiniMaxNodeTypes.ts](../../modules/canvas-ui/ui/nodes/canvasMiniMaxNodeTypes.ts) | 协议、校验或数据规则 | `Runtime`, `NodeData`, `Props`, `Components`, `Menu` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasModelIcon.tsx](../../modules/canvas-ui/ui/nodes/canvasModelIcon.tsx) | 浏览器交互与状态辅助 | `CanvasModelIcon` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasModelSelector.tsx](../../modules/canvas-ui/ui/nodes/canvasModelSelector.tsx) | 浏览器交互与状态辅助 | `CanvasModelSelector` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasNodeControls.tsx](../../modules/canvas-ui/ui/nodes/canvasNodeControls.tsx) | 浏览器交互与状态辅助 | `CanvasAdvancedSettings`, `CanvasDimensions` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasNodeFrame.tsx](../../modules/canvas-ui/ui/nodes/canvasNodeFrame.tsx) | 浏览器交互与状态辅助 | `CanvasConnector`, `CanvasConnectors`, `CanvasNodeFrame`, `CanvasNodeHeader`, `CanvasNode`, `CanvasGenericNode` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasNodeOperations.ts](../../modules/canvas-ui/ui/nodes/canvasNodeOperations.ts) | 浏览器交互与状态辅助 | `CanvasNode`, `NodeRuntime`, `NodeOperationsOptions`, `NodeMenu`, `createCanvasNode`, `updateCanvasNode`, `createNodeOperations`, `connectNewCanvasNode`, `createNodeMenuOperations` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasNodeProps.ts](../../modules/canvas-ui/ui/nodes/canvasNodeProps.ts) | 浏览器交互与状态辅助 | `equalCanvasNodeProps` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasNodeRules.ts](../../modules/canvas-ui/ui/nodes/canvasNodeRules.ts) | 浏览器交互与状态辅助 | `nodeTypes`, `nodeStatuses`, `portHeight`, `portGap`, `legacyWorkflowWidth`, `legacyWorkflowPortTop`, `WorkflowTemplate`, `workflowTemplates`, `nodeAspectRatio`, `workflowParameterHeight`, `legacyWorkflowHeight`, `nodeWidth`, `nodeHeight`, `legacyPortY`, `nodePortX`, `nodePortY`, `MediaKind`, `nodeMediaKind`, `ModelCatalog`, `validateConnection`, `chooseConnectionMode` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasNodeState.ts](../../modules/canvas-ui/ui/nodes/canvasNodeState.ts) | 浏览器交互与状态辅助 | `createNodeOperations`, `createNodeMenuOperations`, `useCanvasContextMenu`, `createCanvasTextActions`, `attachWorkflowNodeEvents`, `useCanvasNodes` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasPluginNode.ts](../../modules/canvas-ui/ui/nodes/canvasPluginNode.ts) | 浏览器交互与状态辅助 | `CanvasPluginNode` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasShotAnalysisNode.tsx](../../modules/canvas-ui/ui/nodes/canvasShotAnalysisNode.tsx) | 浏览器交互与状态辅助 | `CanvasShotAnalysisNode` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasTextComposer.tsx](../../modules/canvas-ui/ui/nodes/canvasTextComposer.tsx) | 界面呈现与交互 | `CanvasTextComposer` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasVideoComposer.tsx](../../modules/canvas-ui/ui/nodes/canvasVideoComposer.tsx) | 界面呈现与交互 | `CanvasVideoComposer` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/canvasVideoReplicaNode.tsx](../../modules/canvas-ui/ui/nodes/canvasVideoReplicaNode.tsx) | 浏览器交互与状态辅助 | `CanvasVideoReplicaNode` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/mediaComposer.ts](../../modules/canvas-ui/ui/nodes/mediaComposer.ts) | 界面呈现与交互 | `ComposerNode`, `ComposerAsset`, `ComposerModel`, `MediaComposerProps`, `ComposerRuntime`, `MediaComposerComponents`, `useComposerBusy`, `changeComposerModel` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/migrateCanvasNodes.ts](../../modules/canvas-ui/ui/nodes/migrateCanvasNodes.ts) | 浏览器交互与状态辅助 | `migrateCanvasNodes` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/nodeApproval.ts](../../modules/canvas-ui/ui/nodes/nodeApproval.ts) | 浏览器交互与状态辅助 | `confirmNodeRun` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/nodeConnectionPorts.ts](../../modules/canvas-ui/ui/nodes/nodeConnectionPorts.ts) | 浏览器交互与状态辅助 | `packagePortY`, `packageDefinition`, `canConnectPackage`, `connectPackage` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/nodeCreationDimensions.ts](../../modules/canvas-ui/ui/nodes/nodeCreationDimensions.ts) | 浏览器交互与状态辅助 | `rememberNodeDimensions`, `newNodeDimensions` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/nodeCustomUi.tsx](../../modules/canvas-ui/ui/nodes/nodeCustomUi.tsx) | 浏览器交互与状态辅助 | `NodeCustomUi` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/nodeDirectoryClient.ts](../../modules/canvas-ui/ui/nodes/nodeDirectoryClient.ts) | 客户端或传输 | `loadNodeDirectoryPackages` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/nodeFramework.ts](../../modules/canvas-ui/ui/nodes/nodeFramework.ts) | 浏览器交互与状态辅助 | `重导出 ./nodeFrameworkTypes`, `createNodeFramework`, `installNodeFramework` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/nodeFrameworkTypes.ts](../../modules/canvas-ui/ui/nodes/nodeFrameworkTypes.ts) | 协议、校验或数据规则 | `NodeMediaType`, `NodeCategory`, `NodeLifecycleStatus`, `PortDefinition`, `NodeDefinition`, `NodeResult`, `NodeResultRecord`, `NodeParameterOption`, `ModelAdvancedParameter`, `NodeModelCapability`, `NodeInputReference`, `NodeInputIssue`, `NodeInputValidation`, `NodeParameterField`, `StableNodeRecord`, `NodeState`, `NodePresentation`, `NodeGenerationUpdate`, `NodeFrameworkAdapter` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/nodeGenerationClient.ts](../../modules/canvas-ui/ui/nodes/nodeGenerationClient.ts) | 客户端或传输 | `nodeGenerationClient` | 含 HTTP/网络 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/nodeGraphClient.ts](../../modules/canvas-ui/ui/nodes/nodeGraphClient.ts) | 客户端或传输 | `NodeRunReceipt`, `NodeRunRequest`, `prepareNodeGraph`, `getNodeRun`, `findNodeRun`, `waitForNodeRequest`, `listNodeRuns`, `approveNodeRun`, `cancelNodeRun`, `stopProjectNodeRuns`, `waitNodeRun`, `executeNodeGraph` | 含 HTTP/网络 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/nodeGraphSnapshot.ts](../../modules/canvas-ui/ui/nodes/nodeGraphSnapshot.ts) | 浏览器交互与状态辅助 | `NodeValue`, `nodeOutput`, `nodeLinks`, `buildNodeGraph` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/nodeSchemaFields.tsx](../../modules/canvas-ui/ui/nodes/nodeSchemaFields.tsx) | 协议、校验或数据规则 | `NodeSchemaFields` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/packageNodeConnectors.tsx](../../modules/canvas-ui/ui/nodes/packageNodeConnectors.tsx) | 浏览器交互与状态辅助 | `PackageNodeConnectors` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/renderMiniMaxNodeBody.tsx](../../modules/canvas-ui/ui/nodes/renderMiniMaxNodeBody.tsx) | 界面呈现与交互 | `renderMiniMaxPreview`, `renderMiniMaxDeck` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/renderMiniMaxQuickMenu.tsx](../../modules/canvas-ui/ui/nodes/renderMiniMaxQuickMenu.tsx) | 界面呈现与交互 | `renderMiniMaxQuickMenu` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/renderMiniMaxToolbar.tsx](../../modules/canvas-ui/ui/nodes/renderMiniMaxToolbar.tsx) | 界面呈现与交互 | `renderMiniMaxToolbar` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/shotAnalysisNode.css](../../modules/canvas-ui/ui/nodes/shotAnalysisNode.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/nodes/shotAnalysisResults.tsx](../../modules/canvas-ui/ui/nodes/shotAnalysisResults.tsx) | 浏览器交互与状态辅助 | `ShotAnalysisResults` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/useCanvasMiniMaxNodeState.ts](../../modules/canvas-ui/ui/nodes/useCanvasMiniMaxNodeState.ts) | 浏览器交互与状态辅助 | `useCanvasMiniMaxNodeState`, `MiniMaxNodeState` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/useGenerationAvailability.ts](../../modules/canvas-ui/ui/nodes/useGenerationAvailability.ts) | 浏览器交互与状态辅助 | `useGenerationAvailability` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/useReplicaUpload.ts](../../modules/canvas-ui/ui/nodes/useReplicaUpload.ts) | 浏览器交互与状态辅助 | `useReplicaUpload` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/useShotAnalysisRun.ts](../../modules/canvas-ui/ui/nodes/useShotAnalysisRun.ts) | 浏览器交互与状态辅助 | `useShotAnalysisRun` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/videoReplicaDialog.tsx](../../modules/canvas-ui/ui/nodes/videoReplicaDialog.tsx) | 界面呈现与交互 | `VideoReplicaDialog` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/videoReplicaNode.css](../../modules/canvas-ui/ui/nodes/videoReplicaNode.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/settings/canvasSettings.tsx](../../modules/canvas-ui/ui/settings/canvasSettings.tsx) | 浏览器交互与状态辅助 | `CanvasSettingsProps`, `CanvasSettings` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/settings/settingsOperation.ts](../../modules/canvas-ui/ui/settings/settingsOperation.ts) | 浏览器交互与状态辅助 | `重导出 ../../../kernel/ui/settingsOperation` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/text/CanvasTextEditor.tsx](../../modules/canvas-ui/ui/text/CanvasTextEditor.tsx) | 浏览器交互与状态辅助 | `CanvasTextEditorHandle`, `CanvasTextEditorProps`, `CanvasTextEditor` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/text/CanvasTextNodeContent.tsx](../../modules/canvas-ui/ui/text/CanvasTextNodeContent.tsx) | 浏览器交互与状态辅助 | `CanvasTextNodeContentProps`, `CanvasTextNodeContent` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/text/CanvasTextTags.tsx](../../modules/canvas-ui/ui/text/CanvasTextTags.tsx) | 浏览器交互与状态辅助 | `CanvasTextTagsProps`, `CanvasTextTags` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/text/textDocument.ts](../../modules/canvas-ui/ui/text/textDocument.ts) | 浏览器交互与状态辅助 | `TextDocumentNode`, `TextRichContent`, `textDocumentFromPlainText`, `textDocumentToPlainText`, `resolveTextDocument`, `createTextDocumentPatch` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/text/textEditor.css](../../modules/canvas-ui/ui/text/textEditor.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/text/textEditorExtensions.ts](../../modules/canvas-ui/ui/text/textEditorExtensions.ts) | 浏览器交互与状态辅助 | `MAX_TEXT_TABLE_SIZE`, `textEditorExtensions`, `textTableSize`, `insertTextTable`, `TextTableAction`, `runTextTableAction`, `copyTextEditorDocument` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/text/textNodeContent.css](../../modules/canvas-ui/ui/text/textNodeContent.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/text/textNodeImport.ts](../../modules/canvas-ui/ui/text/textNodeImport.ts) | 浏览器交互与状态辅助 | `TEXT_NODE_FILE_ACCEPT`, `readTextNodeFile` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/text/textNodeTags.css](../../modules/canvas-ui/ui/text/textNodeTags.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/text/textNodeTags.ts](../../modules/canvas-ui/ui/text/textNodeTags.ts) | 浏览器交互与状态辅助 | `TEXT_TAG_COLORS`, `TextTagColor`, `TextNodeTag`, `MAX_TEXT_NODE_TAGS`, `MAX_TEXT_TAG_LABEL_LENGTH`, `TEXT_NODE_TAG_PRESETS`, `TEXT_TAG_COLOR_LABELS`, `textTagLabelError`, `textTagLabelKey`, `normalizeTextNodeTags`, `textNodeTagsReadError` | 未检出平台调用；不等于纯函数证明 |

<!-- source-inventory:end -->
