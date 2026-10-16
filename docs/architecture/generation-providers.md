# Generation Providers

## 职责与边界

本模块维护 Provider 插件定义、受限 handler 与公共恢复适配；具体模型协议位于 `plugins/providers/<来源>/`。业务模块不得直接导入这些实现；插件不得访问其他插件内部对象。公共入口为 [index.js](../../modules/generation-providers/index.js)，出口见 exports.json。

## 接口契约

[index.js](../../modules/generation-providers/index.js) 的 defineProviderPlugin 依据 manifest/descriptor 延迟加载实现，向 generation.providers 注册受限 handler。公开形状是 contracts 的 descriptor + handler；kinds 中每种媒体须有相应 generate 方法，canRecover/recover 必须成对。

handler 只发布 id/capabilities/generate*/canRecover*/recover*。来源配置由宿主 config 获取；密钥仅经 context.credentials.get(manifest.id)，需 manifest.credentials 与宿主 credentialGrants 双重授权。关闭后保留的 handler 也失效；有在途调用时拒绝普通卸载。

Provider 经 kernel 服务使用 media.runtime 和 generation.receipts，manifest 明确声明对应 requires，媒体调用方依赖早期 module.media-capabilities。SeedVR2 依赖 workflow.runninghub-webapp，从 workflow.executors 获取受限客户端；提交只传 RunningHub 凭据引用，恢复继续查询原任务。

基础 Provider 辅助在 server/providers/baseProvider.js，模型请求上下文、恢复身份与错误协议由公共 contracts 和模块 API 定义。来源名、模型能力、密钥键登记必须一致，否则激活或模型构建失败。
contracts/providerErrors.js 定义错误码、分类工厂及边界包装；context 包含 moduleId/providerId/operation，上游 HTTP 状态、transportCode 与提交不确定/恢复标记保留。已有 PluginError 保持对象和子类身份，非结构化异常在公开 handler 边界包装；日志通过 kernel Logger 输出。

## 数据模型

manifest 包含插件 id/version/apiVersion、services、providers、credentials 与能力；descriptor 包含 name/kinds/execution/requiredSecrets。模型定义记录 name、provider、kind、参数、模式和执行能力，由独立声明式目录聚合，不是运行时客户端。

远端异步回执记录供应商任务身份及请求指纹；各来源实现 canRecover 判断后才查询原任务。密钥不写到画布、会话或公共 handler。此模块不持有项目数据库或用户媒体目录。

## 功能结构

Work-Fisher 的 [text-2.json](../../plugins/providers/work-fisher/catalog/text-2.json) 声明 `Qwen 3.8 Max · Work-Fisher`，固定模型 ID `qwen/qwen3.8-max`、模式 `multimodal-chat`、最多一个视频，提交到 `/v1/chat/completions`。文本 handler 先通过 `/v1/files/upload` 上传本地素材，再将返回地址放到 user content 的 `video_url.video_url.url`，`maxTokens` 在 1～32768 时映射到 `max_tokens`。本地上传使用文件 Blob 流式读取，保留 50 MiB 上传限制，不整文件 readFile；代理视频由媒体适配器限制到 45 MiB。模型实际支持视频/声音、请求耗时和稳定性尚需真实上游验证；mock 只证明请求构造及上传顺序。

新增来源按 [插件开发说明](../插件开发说明.md) 登记入口与 manifest、配置凭据授权、声明模型，再使用数据构建入口生成目录。Provider 处理协议解析、请求校验、提交/轮询/取消信号和结果下载语义；generation-core 负责统一调度。

RunningHub 大型实现及模型目录按职责拆分；Work-Fisher 数据目录按 config 显式 data 清单加载。第三方服务的现用协议分支与本项目旧数据兼容不同，不能按 legacy 关键词批量删除。移动云、Work-Fisher 和 Seedance 的用户接入说明独立保留。

RunningHub 的 standardRequestHelpers 维护纯请求构造，implementation 保留提交/上传/轮询/恢复；models 与 protocol 共同承载声明式模型数据，protocol.d.ts 仅补齐数据类型。数据聚合顺序保留，不产生新 Provider 或第三方协议分支。
Ecloud 的 settings、transport、text 分别负责参数/上游诊断、HTTP 与下载边界、文本协议，implementation 仅组合各媒体工厂。SeedVR2 原有工作流内部 API 依赖仍待公共服务化，不因错误与函数规范扫描通过而认定已消除。

<!-- source-inventory:start -->
## 文件目录

此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。

| 源码 | 职责 | 主要导出 | 副作用 |
| --- | --- | --- | --- |
| [modules/generation-providers/exports.json](../../modules/generation-providers/exports.json) | 公开 API 清单 | 声明式配置 | 无业务运行副作用 |
| [modules/generation-providers/index.js](../../modules/generation-providers/index.js) | 模块入口或装配 | `defineProviderPlugin` | 含 服务注册/生命周期 调用；时机见实现 |
| [modules/generation-providers/server/providers/baseProvider.js](../../modules/generation-providers/server/providers/baseProvider.js) | 服务端领域实现 | `BaseProvider` | 含 文件系统、HTTP/网络 调用；时机见实现 |
| [modules/generation-providers/server/providers/cliMediaInputs.js](../../modules/generation-providers/server/providers/cliMediaInputs.js) | 服务端领域实现 | `materializeInputs` | 含 文件系统 调用；时机见实现 |
| [modules/generation-providers/server/providers/providerKit.js](../../modules/generation-providers/server/providers/providerKit.js) | 服务端领域实现 | `assertRequiredConfig`, `buildJsonFetchOptions`, `submitJsonWithLogs`, `submitOpenAiChatWithLogs`, `pollJsonTask` | 含 HTTP/网络 调用；时机见实现 |

<!-- source-inventory:end -->
