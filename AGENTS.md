
# AGENTS.md

本文档用于约束本项目中的 AI / 自动化开发行为。开发时优先遵循本文件，其次遵循用户当前消息。

## 基本原则

- 先读现有代码，再动手修改，优先沿用项目已有结构和写法。
- 写代码保持最少行数，能简单实现就不要引入复杂抽象。
- 标准格式、协议、解析、压缩、加密、日期等通用能力优先使用成熟稳定的库，不要手写底层实现，除非用户明确要求或项目已有实现必须沿用。
- 不要为了“兼容更多场景”写大量分支，只实现当前明确需要的功能。
- 项目尚未上线，不需要兼容旧数据；表结构或字段调整时直接按新设计修改，不写旧字段兼容、数据迁移兜底或删除旧表的清理逻辑，除非用户明确要求。
- 每次写完代码，不需要检查语法，不需要执行构建，用户会自己做。
- 不要改无关文件，不要顺手重构。
- 任何文件编辑、改动、删除或格式化前，必须先询问用户是否允许；只有得到明确同意后才能修改。
- 用户已明确授权当前任务或要求连续推进时，该授权覆盖任务内必要修改，不要逐文件、逐步骤重复确认；持续推进到完成或遇到真实外部阻塞。
- 如果工作区已有用户改动，不要回滚，不要覆盖；只在必要范围内追加修改。

## 反复提醒沉淀

- 如果开发过程中总是遇到某个问题，或者用户反复提醒同一个注意事项，需要把该注意事项补充到本文件。
- 补充时写成明确、可执行的规则，避免只写模糊描述。
- 新规则应放到最相关的章节；找不到合适章节时放到“项目注意事项”。

## 模块职责与边界字典 (Module Dictionary)
当你被要求写代码时，必须将代码写在正确的模块路径下：

*   **`contracts` (公共协议层)**: 存放节点类型、生成请求/结果、工作流格式、错误码等。**绝对不依赖任何业务模块。**
*   **`kernel` (核心运行时)**: 插件注册、生命周期、服务注册表、事件总线。**只依赖 `contracts`，不依赖具体 Provider、SQLite 或 ComfyUI。**
*   **`canvas-ui` (画布UI层)**: 渲染、拖拽、面板、用户交互。**只调用 kernel 的应用服务和 contracts 的数据结构。**
*   **`project` (项目工作流)**: 项目增删改查、版本冲突、导入导出。**通过 `ProjectRepository` 接口操作数据，不得直接依赖 SQLite 类。**
*   **`asset-media` (媒体资源)**: 图片/视频处理。**必须拆分为 `MediaStore` 和 `MediaProcessor` 接口，不得在 Router 中直接操作 fs 或目录结构。**
*   **`generation-core` (生成核心)**: 任务调度、并发控制、计费。**只依赖 `GenerationProvider`、`GenerationTaskStore` 等接口，不得直接知道 OpenAI 等具体实现。**
*   **`generation-providers` (插件层)**: 各模型服务商（openai, doubao, kling等）。**必须实现统一的 `GenerationProvider` 接口。**
*   **`workflow-runtime` (工作流插件)**: 执行工作流。必须实现 `WorkflowExecutor` 接口（如 `LocalComfyExecutor`, `RunningHubExecutor`）。
*   **`agent` (智能体)**: 对话、Skill、工具调用。**不得直接调用 SQLite、Provider 或文件系统，必须通过 `ProjectService`、`GenerationService` 等抽象层操作。**
*   **`local-runtime` (本地运行时)**: ComfyUI发现、FFmpeg、CLI。**属于平台适配层，不得被 canvas 组件直接 import。**
*   **`identity-account` (身份与安全)**: 登录、API Key、DPAPI加密。**作为安全边界，第三方插件只能通过 `credentialStore.get(providerId)` 获取授权密钥。**
*   **`desktop-shell-observability` (桌面壳与诊断)**: Electron 窗口、IPC、更新、日志、崩溃恢复。

## 绝对禁止的硬性规则 (Hard Constraints - MUST NOT DO)
在生成代码时，一旦你试图突破以下规则，必须立刻停止并提醒我：
1.  `canvas-ui` **不得** `import` 具体 Provider（如 OpenAI、豆包）。
2.  `generation-core` **不得** `import` OpenAI、豆包等具体实现。
3.  `project` **不得**直接依赖 SQLite 类（必须使用 Repository 接口）。
4.  `media` **不得**直接在 Router 中操作文件系统（必须使用 MediaStore 接口）。
5.  插件**不得**直接访问其他插件的内部对象。
6.  插件之间**必须**通过事件和公共协议（contracts）通信。
7.  业务模块**不得**通过 `window.__NAKO_*` 或 `app.locals` 获取核心服务。
8.  禁止在 `canvas-ui` 中直接调用底层 `local-runtime` 的 API。

## 必须遵循的依赖流向 (Dependency Flow)
生成代码时，必须符合以下依赖方向（箭头代表依赖）：
```text
desktop-shell
      |
      v
   kernel
      |
      v
  contracts

业务模块 (canvas-ui, project, asset-media, generation-core, agent, workflow-runtime)
      |
      v
   kernel -> contracts
```

具体实现通过插件注入：
*   `generation-provider plugins` -> 实现 `GenerationProvider` contract
*   `workflow plugins` -> 实现 `WorkflowExecutor` contract
*   `storage adapters` -> 实现 `Repository` contract
*   `media adapters` -> 实现 `MediaStore` contract

## 核心接口契约 (Core Interfaces)
当要求实现具体功能时，必须实现以下接口（从 `contracts` 中引入）：

```typescript
// 插件核心接口
interface NakoPlugin {
  id: string;
  version: string;
  type: PluginType;
  activate(context: PluginContext): Promise<void> | void;
  deactivate(): Promise<void> | void;
}

// 项目仓储接口 (SQLite 只是实现之一)
interface ProjectRepository {
  get(id: string): Promise<Project | null>;
  save(project: Project): Promise<SaveResult>;
  delete(id: string): Promise<void>;
}

// 媒体接口 (必须拆分)
interface MediaStore {
  save(input: MediaInput): Promise<MediaAsset>;
  read(id: string): Promise<MediaAsset>;
  remove(id: string): Promise<void>;
}
interface MediaProcessor {
  crop(input: CropInput): Promise<MediaResult>;
  trimVideo(input: TrimInput): Promise<MediaResult>;
}

// 生成服务商接口
interface GenerationProvider {
  id: string;
  capabilities(): ModelCapability[];
  generateImage(request: ImageRequest, ctx: ProviderContext): Promise<Result>;
  generateVideo?(request: VideoRequest, ctx: ProviderContext): Promise<Result>;
  generateText?(request: TextRequest, ctx: ProviderContext): Promise<Result>;
}

// 工作流执行器接口
interface WorkflowExecutor {
  id: string;
  canExecute(definition: WorkflowDefinition): boolean;
  execute(request: WorkflowRunRequest): Promise<WorkflowRunResult>;
  cancel?(runId: string): Promise<void>;
}
```

## 架构与业务文档

- 在 `docs/architecture/` 中维护架构文档，记录当前代码的真实实现，不得将未实现的设计写成已完成功能。
- 文档必须覆盖以下内容：
  - **接口契约**：定义位置、参数、返回值、错误码、实现者及关键调用语义。
  - **数据模型**：字段、约束、关联关系、存储位置及状态转换。
  - **模块依赖**：模块职责、公共入口、服务注入、事件通信及依赖方向。
  - **功能结构**：核心功能入口、调用流程、数据读写及异常处理。
  - **文件职责**：按模块列出业务文件，记录路径、职责、主要导出及副作用。
- 每个模块维护一份职责与文件目录文档；仅复杂核心流程单独成文，避免逐文件建文档和重复描述。
- 文档引用源码路径；接口和字段以源码为准，不重复复制大段代码。
- 修改接口、数据模型、模块依赖、核心流程或文件职责时，必须同步更新对应文档。
- 发现实现与约束不一致时，单独记录差异、源码证据和处理状态，不得隐瞒或直接认定已修复。
- 不记录第三方依赖、构建产物或临时文件；测试和脚本与业务源码分开分类。


## Vibe Coding 工作流指令 (Workflow Instructions)
*   **生成代码前**：先说明即将修改哪个模块，并确认不会违反“硬性规则”。
*   **重构建议**：如果发现现有代码有耦合（如 `mediaAssetRouter` 直接操作 fs），请主动提出使用适配器模式重构，并输出使用 `MediaStore` 接口的代码。
*   **跨模块通信**：如果需要跨模块调用，优先使用 `kernel` 提供的 `EventBus` 或 `ServiceRegistry`，而不是直接 `import`。
*   **类型定义**：所有公共类型必须在 `contracts` 中定义，不得在业务模块中私自定义跨模块的接口。
*   **错误处理**:必须使用 contracts 中定义的错误码（ErrorCode）。禁止随意 throw new Error('something wrong')，必须抛出带有明确上下文的结构化错误。
*   **日志规范**:禁止随意使用 console.log。日志必须通过 kernel 提供的 Logger 服务输出，并附带模块ID和上下文信息。
*   **单一职责**：一个文件不应超过 1000 行，一个函数不应超过 200 行。逻辑复杂时必须抽离成 Helper 或 Service。


## 发版本流程

- 发版本时，先把 `CHANGELOG.md` 的 `Unreleased` 变更整理成新的版本记录，并保留空的 `Unreleased` 标题。
- 按当前版本号提升一个版本，更新根目录 `VERSION`。
- 将当前未提交的代码全部提交到 Git。
- 提交完成后，给当前提交打最新版本号对应的 tag，例如 `v0.0.5`。
- 发版本流程中不要执行编译、测试或构建，仅做代码检查。除非用户明确要求。

##  异常与边界情况处理 (Edge Cases & Fallbacks)
*   **空状态与错误状态**：当编写 UI 或数据处理逻辑时，必须考虑网络中断、API 超时、数据为空、格式错误等异常情况，并给出友好的降级方案。

*   **并发与竞态**：涉及生成任务调度（generation-core）时，必须保证状态变更的原子性，避免出现重复提交或状态回退。

*   **安全兜底**：任何用户输入在进入业务逻辑前必须进行校验，防止注入攻击或非法参数导致崩溃。

##  兼容开发
- 本项目是macos，win端开发，开发时要做到双端兼容性开发。