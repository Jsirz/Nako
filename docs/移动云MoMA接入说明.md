# 移动云 MoMA 接入说明

本项目通过独立插件 `provider.ecloud` 接入移动云 MoMA。支持画布中的文本、图片、视频、语音生成，以及 Agent 的文本模型选择。无需登录原项目账号；项目、素材、配置继续保存在本机。

## 配置与使用

1. 在移动云 MoMA 控制台订购需要的模型，进入「系统管理 → API Key」，创建拥有相应模型权限的 **非 Token Plan API Key**。Token Plan 使用另一类密钥和接入地址，不能用于本插件。
2. 运行 `npm.cmd run desktop:dev`，进入「设置 → 闭源服务 → 移动云 MoMA」，展开密钥配置，填写并保存 `MoMA API Key`。
3. 新建对应类型的画布节点，选择带「移动云」标识的模型及生成模式。Agent 可选择同一来源的 10 个文本/视觉模型。
4. 输入提示词和需要的素材，主动执行生成。已配置标识只说明本机存在密钥，不代表在线验证通过；首次调用仍受模型订购、密钥权限、额度及限流影响。

后端开发环境也可以设置 `ECLOUD_API_KEY`，参见 [环境变量示例](../.env.example)，修改环境变量后需重启进程。桌面用户建议使用设置页保存，不要把真实密钥提交到源码。

画布模型菜单与生成按钮不显示价格、积分或费用估算。API Key 管理、订购和实际费用以移动云控制台为准。

## 当前能力

| 画布模型 | 能力 | 说明 |
| --- | --- | --- |
| qwen3.8-max、qwen3.7-max、qwen3-max | 文本对话、推理 | 支持流式文本与思考内容，不接受图片/视频 |
| qwen3.7-plus、qwen3.6-plus、qwen3.5-plus、qwen3.6-flash、qwen3.5-flash、qwen3-vl-plus | 文本、图片和视频理解 | 本插件每次最多 10 张图或 1 个视频，另受服务商限制 |
| GLM-5.3-Flash | 文本对话、推理、图片和公网视频理解 | 思考始终开启，最大输出 128K Token；作为文本模型及 Agent 模型 |
| Qwen-Image-2.0-Pro | 文生图、图片编辑 | 编辑输入 1–3 张图，每张不超过 10 MB；单次 1–6 张 PNG；兼容原画布保存的 `Qwen-Image 2.0 Pro · 移动云` 名称 |
| MiniMax-H3 | 文生、首帧、尾帧、首尾帧、多模态参考视频 | 768P 与 2K 均为 5–15 秒；所有模式需要提示词；帧输入比例随原图 |
| HappyHorse 1.1 | 文生视频、首帧生视频、图片参考生视频 | 首帧 1 张图；参考生成 1–9 张图；3–15 秒，720p/1080p |
| HappyHorse 1.0 视频编辑 | 视频编辑及参考图 | 1 个公网视频，可选 0–5 张图；原视频或自动声音 |
| Seedance 2.0 | 文生、首帧、首尾帧、多模态参考 | 移动引擎 REST 接口，公网/asset 素材，详见 [Seedance 接入说明](移动云Seedance2接入说明.md) |
| Qwen3-TTS-Flash | 文本转语音 | Cherry 音色，自动或指定语种，保存 WAV |

共 16 个目录项、4 个处理器。Qwen 和 HappyHorse 的请求模型 ID 带 `qwen/` 前缀；GLM 使用 `zhipu/glm-5.3-flash`，MiniMax 的 768P 与 2K 均使用 `minimax/minimax-h3`，Seedance 使用 `doubao-seedance-2.0`。HappyHorse 1.1 的三种模式分别使用 `qwen/happyhorse-1.1-t2v`、`qwen/happyhorse-1.1-i2v`、`qwen/happyhorse-1.1-r2v`；编辑使用 `qwen/happyhorse-1.0-video-edit`。

### 本次指定的三个模型

- **文本 GLM-5.3-Flash**：调用 `POST https://moma.cmecloud.cn/v1/chat/completions`，请求设置 `thinking: {type: "enabled", clear_thinking: false}`，`reasoning_effort` 支持 `low`、`high`、`max`，默认 `max`；流式输出设置 `tool_stream: true`。按文档 100484 的说明，文本参数与 GLM-5.3 一致。对话输入区可选择思考强度，开关显示为模型要求开启；不发送 Qwen 专用的 `enable_thinking` 开关。支持文本、图片和公网视频输入；当前画布尚未接入官方文档中的文件输入。
- **图像 Qwen-Image-2.0-Pro**：沿用已有独立图片协议，使用 `qwen/qwen-image-2.0-pro`、`input.messages`、`parameters.size/n`，保留文生图和图片编辑。没有创建重复目录项，原有项目可继续使用。
- **视频 MiniMax-H3**：调用 `POST https://moma.cmecloud.cn/v1/videos`，读取顶层 `task_id`；查询使用 `GET /v1/videos/{task_id}`，两档均使用 Bearer 认证及 `X-Model-Name: minimax/minimax-h3`；从 `task.status` 和 `task.content.url` 读取结果。不使用 DashScope 异步请求头。

MiniMax 的 [专门视频 API 文档 101389](https://ecloud.10086.cn/op-help-center/doc/article/101389) 给出 `MiniMax-H3`、768P、4–15 秒；本项目现统一采用 [多模态文档 100738](https://ecloud.10086.cn/op-help-center/doc/article/100738)：其规格包含 768P 和 2K，均为 5–15 秒，可执行示例使用 `minimax/minimax-h3` 及 GET 查询。两档均提交 `aigc_watermark: false`。768P 仍为默认选项，遗留的 4 秒参数会调整为 5 秒。

### 模型改名后的端点错误

仅将生成目录的 `endpoint.model` 改为 `minimax/minimax-h3` 时，原插件仍只按 `MiniMax-H3` 分流，导致正确的 `/v1/videos` 请求误入 HappyHorse 校验并提示“移动云模型端点与官方 MoMA 接口不匹配”。现已从 `protocol.js` 源定义修正模型 ID，并统一提交、查询、恢复分流；重新生成目录也会保留正确 ID。不要只手改 `modelCatalog.generated.json`。

界面名称仍为 `MiniMax-H3 · 移动云`。旧输入名称 `MiniMax-H3` 和文档中的 `minimax/MiniMax-H3` 会规范化为小写带前缀 ID。新任务两档使用相同模型指纹；旧版无前缀任务保留原模型指纹与 `X-Model-Name: minimax-h3` 查询头，仅查询原任务。恢复仍校验密钥、端点和任务编号，不会自动重提。

100738 的参数表也出现 `minimax/MiniMax-H3`（大小写不同）和查询 POST 的不一致描述；当前采用其 cURL 示例中的小写模型 ID 和 GET 方法。该示例还遗漏实际网关所需的查询路由头，详见下节。

### 已提交视频一直显示“正在继续核对”

2026-09-16 对用户已有的首帧视频任务进行只读查询，确认任务已生成成功。实际网关行为是：不带 `X-Model-Name` 返回空响应 HTTP 404；使用无前缀 `minimax-h3` 返回 HTTP 400、`invalid task_id (2013)`；使用 `minimax/minimax-h3` 返回 HTTP 200 和 `task.status: succeeded`。因此带前缀提交的新任务查询必须添加 `X-Model-Name: minimax/minimax-h3`，不能照抄文档遗漏请求头的 GET 示例。

已修正正常轮询及恢复查询，并用修正后的处理器成功查询、下载该原任务的 MP4。没有新建或重复提交生成任务。更新后重启项目并打开原画布，已有任务会通过原任务编号继续恢复。

### HTTP 402 排查

HTTP 402 表示上游支付/额度相关拒绝；请核对**所选视频模型**的订购或资源包、账户状态、API Key 额度。文本和图片调用成功不代表该视频模型具备可用额度。当前错误处理会根据上游明确的余额不足、额度不足、未订购信息显示对应提示；没有详情时不会断言具体原因，也不会自动重试。

本次截图对应本地 2026-09-16 15:29:02（北京时间）的 MiniMax 视频失败记录：提交阶段返回 402，未保存远端任务编号。旧实现只保留通用 `ECLOUD_API_ERROR`，没有保存上游原始原因，因此无法从历史记录进一步确定是余额、资源包还是订购限制。官方 [API 错误码文档](https://ecloud.10086.cn/op-help-center/doc/article/99161) 也未单列 402。添加 2K 选项不会解除账户限制。

MiniMax 文生视频提供 21:9、16:9、4:3、1:1、3:4、9:16；首帧、尾帧和首尾帧提交 `ratio: "adaptive"`。多模态至少需要图片或视频，不能仅输入音频。可连接当前项目保存的图片、MP4 视频和音频，也可在高级设置填写公网参考地址；本地素材在主动生成时编码到请求体，不另行上传到对象存储。当前未接入 `mm_file://` 平台文件管理。

MiniMax 本项目保守限制为最多 9 张图、3 个视频、3 段音频；本地图片/音频每项不超过 20 MB、视频每项不超过 40 MB，序列化请求体不超过 64 MB。这是本项目输入限制，不代表官方保证的数量上限；远端素材规格仍由服务商校验。

图片提供 1K/2K 档和 1:1、16:9、9:16、4:3、3:4 比例；2K 对应官方推荐的 2048×2048、2688×1536、1536×2688、2368×1728、1728×2368，1K 将相应宽高减半。图片高级参数支持生成数量和提示词优化。Qwen 文本高级参数支持思考模式开关，GLM 思考模式始终开启。

HappyHorse 参考图支持 JPEG、PNG、WebP，每张不超过 20 MB；具体尺寸、宽高比等仍须符合官方模型要求。首帧视频比例随图片，编辑视频比例随原视频，这两种模式不向上游提交比例参数。视频编辑不提交时长参数；输出最长 15 秒，超过 15 秒的输入由服务商截取前 15 秒。TTS 官方输入上限为 512 Token，建议使用短文本。

**视频编辑需要移动云能够读取的公网视频 URL。** 本地上传的 `/library/...` 视频、回环/内网地址和视频 Base64 不能用于该编辑接口。插件不将本地视频自动上传到其他云服务；需要通过保留公网地址的素材或 API 输入提供视频。图片输入和视觉理解的本地媒体可由插件读取当前项目素材并编码提交。

## 接口与任务处理

所有模型请求使用 `Authorization: Bearer <API Key>`。Qwen、GLM、MiniMax、HappyHorse 主机为 `https://moma.cmecloud.cn`；Seedance 使用 `https://zhenze-huhehaote.cmecloud.cn`。各产品路径按文档分别配置，不能统一拼成同一个 OpenAI Base URL。

| 用途 | 方法与路径 |
| --- | --- |
| 文本/视觉 | `POST /v1/chat/completions` |
| 图片生成/编辑 | `POST /v1/aigc/multimodal-generation/generation` |
| MiniMax-H3 视频提交/查询 | `POST /v1/videos`、`GET /v1/videos/{task_id}` |
| HappyHorse 视频提交 | `POST /api/v1/services/aigc/video-generation/video-synthesis` |
| HappyHorse 视频查询 | `GET /api/v1/tasks/{task_id}` |
| Seedance 视频提交/查询（呼和浩特网关） | `POST /api/v3/contents/generations/tasks`、`GET /api/v3/contents/generations/tasks/{id}` |
| 语音合成 | `POST /api/v1/services/aigc/multimodal-generation/generation` |

HappyHorse 视频提交带 `X-DashScope-Async: enable`，每 5 秒查询一次，单次等待最多约 10 分钟。Seedance 和 MiniMax 不带该请求头，每 10 秒查询一次、最长约 20 分钟。这些轮询间隔是客户端策略。三者保存任务编号后只查询原任务，不重新创建任务；恢复引用校验模型、端点及密钥指纹。取消本地等待不会调用服务商取消 API，也不表示远端停止计费。

HappyHorse 文档规定任务查询及媒体 URL 有 24 小时有效期；Seedance 按其任务状态和 URL 有效期处理。成功后立即下载并交给本地媒体服务保存。下载请求不携带模型密钥。网络中断导致提交结果不明，或同步图片/语音结果下载失败时，会保留不确定状态并提示核对服务商记录，不自动重提；没有远端任务编号的同步调用无法自动找回结果。

启动、列出模型和查看配置不会访问 MoMA。仅主动生成、已提交视频的恢复查询及关联结果下载会联网。未增加账号同步、设备注册、模型调用统计或诊断上报。

## 插件结构

- [manifest.json](../plugins/providers/ecloud/manifest.json)：能力、处理器和凭据声明。
- [implementation.js](../plugins/providers/ecloud/implementation.js)：文本、图片、视频、语音协议与恢复实现。
- [minimax.js](../plugins/providers/ecloud/minimax.js)：MiniMax-H3 独立视频请求、轮询与恢复。
- [media.js](../plugins/providers/ecloud/media.js)：当前项目素材读取、URL 和大小检查。
- [protocol.js](../plugins/providers/ecloud/protocol.js)、[models.ts](../plugins/providers/ecloud/models.ts)：端点、受支持的模型和画布参数。
- [后端插件目录](../config/backend-plugins.json)、[模型贡献目录](../config/model-plugins.json)：声明式装配。

在 `config/plugins.json` 的 `disabled` 中添加 `provider.ecloud` 并重启即可禁用。空闲时也支持现有插件 API 启停，禁用后处理器卸载、模型变为不可用。插件只获授权读取 `ECLOUD_API_KEY`，不会借用 OpenAI 或其他来源的密钥。

## 官方文档依据

2026-09-16 阅读以下移动云文档并据此实现：

- 用户指定模型广场：[GLM-5.3-Flash](https://ecloud.10086.cn/api/page/maas/moma/modelSquare/modelSquareDetails?modelName=GLM-5.3-Flash)、[Qwen-Image-2.0-Pro](https://ecloud.10086.cn/api/page/maas/moma/modelSquare/modelSquareDetails?modelName=Qwen-Image-2.0-Pro)、[MiniMax-H3](https://ecloud.10086.cn/api/page/maas/moma/modelSquare/modelSquareDetails?modelName=MiniMax-H3)。未登录访问返回登录应用页面，接口依据以下无需登录的官方帮助文档核对。
- [GLM-5.3-Flash API](https://ecloud.10086.cn/op-help-center/doc/article/100484)、[MiniMax-H3 视频 API](https://ecloud.10086.cn/op-help-center/doc/article/101389)、[MiniMax-H3 多模态文档（参数差异见上文）](https://ecloud.10086.cn/op-help-center/doc/article/100738)

- [闭源模型 API 调用概述（用户指定页面）](https://ecloud.10086.cn/op-help-center/doc/article/99314)
- [API Key 管理](https://ecloud.10086.cn/op-help-center/doc/article/95476)
- [OpenAI Chat API](https://ecloud.10086.cn/op-help-center/doc/article/99330)、[文本模型](https://ecloud.10086.cn/op-help-center/doc/article/99317)、[视觉理解](https://ecloud.10086.cn/op-help-center/doc/article/99325)
- [图片生成](https://ecloud.10086.cn/op-help-center/doc/article/99932)、[图片编辑](https://ecloud.10086.cn/op-help-center/doc/article/100963)
- [文生视频](https://ecloud.10086.cn/op-help-center/doc/article/100407)、[首帧生视频](https://ecloud.10086.cn/op-help-center/doc/article/100409)、[参考生视频](https://ecloud.10086.cn/op-help-center/doc/article/100408)、[视频编辑](https://ecloud.10086.cn/op-help-center/doc/article/100410)
- [非实时语音合成 API（本插件使用非流式 HTTP 调用）](https://ecloud.10086.cn/op-help-center/doc/article/100771)

本轮没有接入移动云旧版开源模型端点、Token Plan、实时语音 WebSocket、Omni 音频输出、向量化/重排序或全部模型广场产品。上述已实现接口使用协议模拟测试验证；MiniMax 查询修复另通过用户已有任务的实际 GET 查询与结果下载验证，没有新发起付费生成。测试与构建结果见 [验证记录](验证记录.md)。
