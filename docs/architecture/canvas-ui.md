# Canvas UI

## 职责与边界

负责节点呈现、连线、分组、选择、拖拽、剪贴板、撤销、设置和根画布。入口 [browser.ts](../../modules/canvas-ui/browser.ts) 安装交互及节点框架，`rootPlugin.tsx` 注册 ui.root。禁止导入 Provider、适配器和 local-runtime API；本地工作流能力通过 kernel 的 `ui.local-runtime` 服务获取。

现有项目、媒体、生成、身份等 UI 组件仍由公开 api 静态复用；这不是 AGENTS.md 严格服务化目标已全部完成的证明，见 [规范差异](conformance.md)。

## 接口契约

`ui.root.mount(element)` 挂载 React 根并登记卸载；根 manifest 显式依赖 `ui.local-runtime`。`node.registry` 提供节点定义，`nodes.client` 处理节点生成与观察。公开纯函数/组件出口列在 [exports.json](../../modules/canvas-ui/exports.json)。

`canvasRuntime.tsx` 装配画布依赖；`canvasApplicationDependencies.ts` 描述当前根 UI 注入形状。跨模块节点和工作流公共协议来自 contracts，画布不获取原始客户端、模型密钥或本地进程对象。`canvasComponents.ts` 经服务渲染工作流卡，设置经服务挂载本地运行时页，Agent 执行请求经相同服务交给节点当前 owner。
ui.canvas.project 发布 contracts/projectWorkflow 的图重映射、分组清理、模态、提示与增强观察能力；ui.media.recovery 由媒体插件提供，预设复制通过 kernel 获取，不静态调用媒体恢复实现。插件声明及磁盘 manifest 的 provides/requires 同步，kernel 负责撤销注册。

## 数据模型

画布文档包含 nodes、groups、连线、viewport、标题、项目 id/revision；持久化由 project 模块承担。节点执行状态与错误提示、结果 URL、参数及端口来自注册表和公共运行协议。编辑交互的悬浮、选择、拖动、菜单、弹窗等状态只属于浏览器视图。

新建画布默认标题由 `canvasEditorHooks.defaultCanvasTitle` 按设备本地日期生成，例如“10月10日”；`useCanvasTitle` 初始化与 `clearCanvas` 重置标题复用该规则。`clearCanvas` 将默认标题传给项目身份重置方法，项目模块首次保存时为同名默认标题追加 `-1`、`-2` 等可用后缀，并同步画布标题。标题可由用户修改，加载已有画布时读取其保存的标题。

持久化节点类型与端口身份不同于数组位置；插件缺席保留缺失节点占位，不悄悄改成其他节点。运行中节点的复制限制、只读画布导航及媒体工具栏沿用当前工作区已有实现，本次不回滚用户修改。

## 功能结构

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
| [modules/canvas-ui/browser.root.manifest.json](../../modules/canvas-ui/browser.root.manifest.json) | 插件声明 | 声明式配置 | 无业务运行副作用 |
| [modules/canvas-ui/browser.ts](../../modules/canvas-ui/browser.ts) | 模块入口或装配 | `default` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/canvas-ui/exports.json](../../modules/canvas-ui/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/canvas-ui/index.ts](../../modules/canvas-ui/index.ts) | 模块入口或装配 | `CanvasRoot`, `CanvasApplication` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/rootPlugin.tsx](../../modules/canvas-ui/rootPlugin.tsx) | 模块入口或装配 | `default` | 含 DOM/事件、服务注册/生命周期 调用；时机见实现 |
| [modules/canvas-ui/ui/app/canvas.css](../../modules/canvas-ui/ui/app/canvas.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/app/canvasComponentType.ts](../../modules/canvas-ui/ui/app/canvasComponentType.ts) | 浏览器交互与状态辅助 | `CanvasComponent` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/app/canvasComponents.ts](../../modules/canvas-ui/ui/app/canvasComponents.ts) | 浏览器交互与状态辅助 | `ProjectDashboard`, `Settings`, `Header`, `Sidebar`, `Scene`, `ViewportControls`, `SidePanels`, `Overlays`, `ImageAnnotation`, `ImageCrop`, `CropEditor`, `ImageResize`, `ProjectDashboardHeader`, `DashboardFolderCard`, `DashboardProjectCard`, `ProjectDashboardMenu`, `Tooltip`, `Edges`, `SelectionBounds`, `Node`, `Minimap`, `AssetHistory`, `AssetLibrary`, `WorkflowLibrary`, `ContextMenu`, `AssetDialog`, `MediaPreview`, `ComparePreview`, `CompositePreview`, `PanoramaScene`, `TextCard`, `ImageCard`, `VideoCard`, `AudioNode`, `CompareNode`, `CompositeNode`, `WorkflowGenerator`, `MiniMaxNode`, `LegacyWorkflowNode`, `GenericNode`, `SaveDialog`, `NodeFrame`, `NodeHeader`, `MediaToolbar`, `PromptEditor`, `ImagePreview`, `VideoPlayer`, `AudioPlayer`, `ConnectedAssets`, `ModelSelector`, `AdvancedSettings`, `Connectors`, `TextComposerView`, `PromptTag`, `MentionTag`, `PresetList`, `MentionList`, `ImageComposerView`, `VideoComposerView`, `ModelIcon`, `Connector`, `PresetForm`, `PresetCard`, `Dimensions`, `TextComposer`, `ImageComposer`, `VideoComposer` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/app/canvasRuntime.tsx](../../modules/canvas-ui/ui/app/canvasRuntime.tsx) | 运行、调度或服务 | `CanvasRoot` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/app/modelBrandIcons.tsx](../../modules/canvas-ui/ui/app/modelBrandIcons.tsx) | 浏览器交互与状态辅助 | `Gemini`, `OpenAI`, `Jimeng`, `Doubao`, `Kling`, `Aliyun`, `Grok`, `DeepSeek`, `Mureka` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/app/pluginSurfaces.ts](../../modules/canvas-ui/ui/app/pluginSurfaces.ts) | 浏览器交互与状态辅助 | `optionalAgentSurfaces` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/app/presentation.ts](../../modules/canvas-ui/ui/app/presentation.ts) | 浏览器交互与状态辅助 | `bind`, `bindRef` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/app/promptVendor.ts](../../modules/canvas-ui/ui/app/promptVendor.ts) | 浏览器交互与状态辅助 | `createPromptVendor` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/app/useRecovery.ts](../../modules/canvas-ui/ui/app/useRecovery.ts) | 运行、调度或服务 | `RecoveryOptions`, `useRecovery` | 含 DOM/事件 调用；时机见实现 |
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
| [modules/canvas-ui/ui/canvas/useCanvasAgentControls.tsx](../../modules/canvas-ui/ui/canvas/useCanvasAgentControls.tsx) | 浏览器交互与状态辅助 | `useCanvasAgentControls` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasAgentRuntime.tsx](../../modules/canvas-ui/ui/canvas/useCanvasAgentRuntime.tsx) | 运行、调度或服务 | `useCanvasAgentRuntime` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasAssetActions.tsx](../../modules/canvas-ui/ui/canvas/useCanvasAssetActions.tsx) | 浏览器交互与状态辅助 | `useCanvasAssetActions` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/useCanvasConnectionState.tsx](../../modules/canvas-ui/ui/canvas/useCanvasConnectionState.tsx) | 浏览器交互与状态辅助 | `useCanvasConnectionState` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/useCanvasDocumentEffects.tsx](../../modules/canvas-ui/ui/canvas/useCanvasDocumentEffects.tsx) | 浏览器交互与状态辅助 | `useCanvasDocumentEffects` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasDocumentState.tsx](../../modules/canvas-ui/ui/canvas/useCanvasDocumentState.tsx) | 浏览器交互与状态辅助 | `useCanvasDocumentState` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/useCanvasPointerActions.tsx](../../modules/canvas-ui/ui/canvas/useCanvasPointerActions.tsx) | 浏览器交互与状态辅助 | `useCanvasPointerActions` | 含 HTTP/网络 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasProjectNavigation.tsx](../../modules/canvas-ui/ui/canvas/useCanvasProjectNavigation.tsx) | 浏览器交互与状态辅助 | `useCanvasProjectNavigation` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasSaveAndReferences.tsx](../../modules/canvas-ui/ui/canvas/useCanvasSaveAndReferences.tsx) | 浏览器交互与状态辅助 | `useCanvasSaveAndReferences` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/canvas/useCanvasSceneBridge.tsx](../../modules/canvas-ui/ui/canvas/useCanvasSceneBridge.tsx) | 浏览器交互与状态辅助 | `useCanvasSceneBridge` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/canvas/useCanvasWorkspaceState.tsx](../../modules/canvas-ui/ui/canvas/useCanvasWorkspaceState.tsx) | 浏览器交互与状态辅助 | `useCanvasWorkspaceState` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/design/designSystem.ts](../../modules/canvas-ui/ui/design/designSystem.ts) | 浏览器交互与状态辅助 | `DESIGN_TOKENS`, `ButtonVariant`, `ToastTone`, `ConfirmationIntent`, `RUNNINGHUB_PAID_CONFIRMATION_KEY`, `AnchoredConfirmationOptions`, `StableDesignSystemAdapter`, `createButton`, `isConfirmationSuppressed`, `resetConfirmationPreference`, `requestAnchoredConfirmation`, `createInput`, `createSelect`, `createPopover`, `createDialog`, `createDangerousConfirmation`, `createToast`, `createTooltip`, `createTabs`, `createMenu`, `installStableDesignSystem` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/design/designSystemStyles.ts](../../modules/canvas-ui/ui/design/designSystemStyles.ts) | 浏览器交互与状态辅助 | `DESIGN_TOKENS`, `DESIGN_CSS` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/design/dom.ts](../../modules/canvas-ui/ui/design/dom.ts) | 浏览器交互与状态辅助 | `createStableElement`, `createStableTextElement` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/design/modalFocus.ts](../../modules/canvas-ui/ui/design/modalFocus.ts) | 浏览器交互与状态辅助 | `activateModal` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/CanvasProjectSwitcher.tsx](../../modules/canvas-ui/ui/dialogs/CanvasProjectSwitcher.tsx) | 界面呈现与交互 | `CanvasProjectSwitcher` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/CanvasTransferMenu.tsx](../../modules/canvas-ui/ui/dialogs/CanvasTransferMenu.tsx) | 界面呈现与交互 | `CanvasTransferMenu` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/canvasAnchoredPanel.css](../../modules/canvas-ui/ui/dialogs/canvasAnchoredPanel.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/dialogs/canvasAssetHistory.tsx](../../modules/canvas-ui/ui/dialogs/canvasAssetHistory.tsx) | 界面呈现与交互 | `CanvasAssetHistory` | 含 HTTP/网络、DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasComparePreview.tsx](../../modules/canvas-ui/ui/dialogs/canvasComparePreview.tsx) | 界面呈现与交互 | `CanvasComparePreview` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasCompositePreview.tsx](../../modules/canvas-ui/ui/dialogs/canvasCompositePreview.tsx) | 界面呈现与交互 | `CanvasCompositePreview` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasContextMenu.tsx](../../modules/canvas-ui/ui/dialogs/canvasContextMenu.tsx) | 界面呈现与交互 | `ContextMenuIcons`, `CanvasContextMenuProps`, `CanvasContextMenu` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/canvasDialogs.ts](../../modules/canvas-ui/ui/dialogs/canvasDialogs.ts) | 界面呈现与交互 | `CanvasLegacyWorkflowNode`, `CanvasImageResize`, `CanvasImageAnnotation`, `CanvasImageCrop`, `CanvasPanoramaScene`, `CanvasSaveDialog`, `useCanvasPanels`, `CanvasContextMenu`, `CanvasCompositePreview`, `CanvasComparePreview`, `CanvasMediaPreview`, `CanvasAssetDialog`, `CanvasOverlays`, `CanvasCompareNode`, `CanvasCompositeNode`, `CanvasMiniMaxNode`, `CanvasMediaToolbar`, `CanvasHeader`, `ProjectDashboard`, `ProjectDashboardHeader`, `DashboardProjectCard`, `DashboardFolderCard`, `ProjectDashboardMenu`, `CanvasMinimap`, `CanvasSelectionBounds`, `CanvasViewportControls`, `CanvasPromptEditor`, `CanvasPromptTag`, `CanvasMentionTag`, `CanvasMentionList`, `CanvasPresetList`, `CanvasPresetCard`, `CanvasPresetForm`, `CanvasVideoPlayer`, `CanvasImagePreview`, `CanvasTextComposer`, `CanvasImageComposer`, `CanvasVideoComposer`, `CanvasAudioPlayer`, `CanvasAudioNode`, `CanvasTextCard`, `CanvasImageCard`, `CanvasVideoCard`, `CanvasDimensions`, `CanvasAdvancedSettings`, `CanvasModelSelector`, `CanvasConnectedAssets`, `CanvasAssetHistory`, `CanvasTooltip`, `CanvasAssetLibrary`, `CanvasLibraryGrid`, `CanvasWorkflowLibrary`, `CanvasNodeFrame`, `CanvasNodeHeader`, `CanvasConnector`, `CanvasConnectors`, `CanvasNode`, `CanvasGenericNode`, `CanvasSidePanels`, `CanvasEdges`, `CanvasScene`, `equalCanvasNodeProps`, `CanvasSidebar`, `CanvasModelIcon`, `CanvasSettings` | 未检出平台调用；不等于纯函数证明 |
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
| [modules/canvas-ui/ui/dialogs/imageResizeGeometry.ts](../../modules/canvas-ui/ui/dialogs/imageResizeGeometry.ts) | 界面呈现与交互 | `Size`, `Mode`, `resizeDimensions`, `resizeLimit` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/imageStudio.css](../../modules/canvas-ui/ui/dialogs/imageStudio.css) | 界面样式 | 样式 | 无业务运行副作用 |
| [modules/canvas-ui/ui/dialogs/imageToolGenerateButton.tsx](../../modules/canvas-ui/ui/dialogs/imageToolGenerateButton.tsx) | 界面呈现与交互 | `ImageToolGenerateButton` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/minimapGeometry.ts](../../modules/canvas-ui/ui/dialogs/minimapGeometry.ts) | 界面呈现与交互 | `MinimapNode`, `NodeMeasurement`, `minimapScene`, `minimapViewport` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/panoramaGenerate.tsx](../../modules/canvas-ui/ui/dialogs/panoramaGenerate.tsx) | 界面呈现与交互 | `PanoramaGenerate` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/renderAnnotationTools.tsx](../../modules/canvas-ui/ui/dialogs/renderAnnotationTools.tsx) | 界面呈现与交互 | `renderAnnotationTools`, `renderAnnotationBrushSettings` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/renderImageCropStage.tsx](../../modules/canvas-ui/ui/dialogs/renderImageCropStage.tsx) | 界面呈现与交互 | `renderImageCropStage` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/dialogs/renderImageCropToolbar.tsx](../../modules/canvas-ui/ui/dialogs/renderImageCropToolbar.tsx) | 界面呈现与交互 | `renderImageCropToolbar` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/dialogs/useCanvasImageCropState.ts](../../modules/canvas-ui/ui/dialogs/useCanvasImageCropState.ts) | 界面呈现与交互 | `useCanvasImageCropState`, `ImageCropState` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/lifecycle/enhancementLifecycle.ts](../../modules/canvas-ui/ui/lifecycle/enhancementLifecycle.ts) | 浏览器交互与状态辅助 | `observeStableEnhancement` | 未检出平台调用；不等于纯函数证明 |
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
| [modules/canvas-ui/ui/nodes/canvasTextComposer.tsx](../../modules/canvas-ui/ui/nodes/canvasTextComposer.tsx) | 界面呈现与交互 | `CanvasTextComposer` | 未检出平台调用；不等于纯函数证明 |
| [modules/canvas-ui/ui/nodes/canvasVideoComposer.tsx](../../modules/canvas-ui/ui/nodes/canvasVideoComposer.tsx) | 界面呈现与交互 | `CanvasVideoComposer` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/mediaComposer.ts](../../modules/canvas-ui/ui/nodes/mediaComposer.ts) | 界面呈现与交互 | `ComposerRuntime`, `ComposerNode`, `ComposerAsset`, `ComposerModel`, `MediaComposerProps`, `MediaComposerComponents`, `useComposerBusy`, `changeComposerModel` | 未检出平台调用；不等于纯函数证明 |
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
| [modules/canvas-ui/ui/nodes/useCanvasMiniMaxNodeState.ts](../../modules/canvas-ui/ui/nodes/useCanvasMiniMaxNodeState.ts) | 浏览器交互与状态辅助 | `useCanvasMiniMaxNodeState`, `MiniMaxNodeState` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/nodes/useGenerationAvailability.ts](../../modules/canvas-ui/ui/nodes/useGenerationAvailability.ts) | 浏览器交互与状态辅助 | `useGenerationAvailability` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/settings/canvasSettings.tsx](../../modules/canvas-ui/ui/settings/canvasSettings.tsx) | 浏览器交互与状态辅助 | `CanvasSettingsProps`, `CanvasSettings` | 含 DOM/事件 调用；时机见实现 |
| [modules/canvas-ui/ui/settings/settingsOperation.ts](../../modules/canvas-ui/ui/settings/settingsOperation.ts) | 浏览器交互与状态辅助 | `settingsOperation` | 未检出平台调用；不等于纯函数证明 |
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
