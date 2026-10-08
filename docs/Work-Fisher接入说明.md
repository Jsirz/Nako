# Work-Fisher 模型接入说明

## 使用方式

Nako 通过独立插件 `provider.work-fisher` 接入 `https://api.work-fisher.com`。模型目录依据 [Work-Fisher/AIFISHER](https://github.com/Work-Fisher/AIFISHER) 提交 `bdcf3bec054594fcab591952a8c5acef858d6de4` 整理为固定配置，不再请求 `/v1/models`，也不再提供模型发现、添加或删除界面。

1. 打开「设置 → 闭源服务 → Work-Fisher」。
2. 保存 Work-Fisher API Key。
3. 在画布节点、默认模型或 Agent 中直接选择 `· Work-Fisher` 模型。

Work-Fisher 设置只展示固定目录，不提供自定义模型 ID 覆盖输入；运行目录同样保持插件声明的模型 ID，防止设置值与具体协议不匹配。

目录包含 55 项模型：9 项文本、17 项图像、24 项视频、5 项音频或音乐。上游的 DeepSeek V4 Flash、DeepSeek V4 Pro、Kimi K3 三项文本条目标记为不可选，本项目保持该状态，因此当前可选 52 项。模型 ID、生成模式、参考素材数量、分辨率、比例和高级参数来自固定目录及 Work-Fisher 当前公开文档；服务端实际权限仍取决于用户的 Key。

新增的 `workfisher/gm-3.8-flash`、`workfisher/g6-astra`、`workfisher/g6-sol`、`workfisher/g6-luna` 均作为视觉文本模型提供，走 `POST /v1/chat/completions`，接受文本及一张图片输入。界面不读取或显示其价格页价格。

## 支持的协议

| 能力 | 提交接口 | 查询接口 |
| --- | --- | --- |
| 文本与视觉对话 | `POST /v1/chat/completions` | 流式或普通响应 |
| 图像生成与编辑 | `POST /v1/image/generations` | `GET /v1/image/generations/{task_id}` |
| Midjourney Imagine | `POST /v1/midjourney/generations` | `GET /v1/midjourney/tasks/{task_id}` |
| 视频生成与编辑 | `POST /v1/videos` | `GET /v1/videos/{task_id}` |
| 语音与声音克隆 | `POST /v1/audio/generations` | `GET /v1/audio/generations/{task_id}` |
| Suno 音乐与分轨 | `POST /v1/music/generations[/stems]` | `GET /v1/music/tasks/{task_id}` |
| 参考素材上传 | `POST /v1/files/upload` | 返回临时素材 URL |

MiniMax H3 使用仓库中的 `minimax-h3-ow-t2v-fast`、`minimax-h3-ow-i2v-fast`、`minimax-h3-ow-r2v-fast`，走 `/v1/videos`。已删除此前自选协议中的 MiniMax V2 路径。移动云 MiniMax 插件独立运行，不受此变更影响。

异步提交不自动重发；取得任务 ID 后只查询原任务。提交响应中断但提供 `X-Task-Id` 时同样只查询该任务。图像和视频接入现有任务恢复；音频和音乐本轮支持当前运行中的轮询与下载，不宣称支持应用重启后的自动恢复。结果媒体下载到本机，不把临时签名地址当作项目素材保存。

Work-Fisher 模型不设置本地单并发限制（`maxConcurrent: 0`），同模型的多个节点可以同时提交；实际并发能力受服务商账户限额约束。单节点防重复提交与预算授权仍然有效。

## 结构与边界

- Key 由宿主凭据存储管理，插件只读取授权的 `WORK_FISHER_API_KEY`，不接受调用方伪造密钥。
- 模型数据位于插件内部 `catalog/*.json`，由 `models.ts` 贡献，经 `build:model-catalog` 聚合；每份数据文件均不超过 500 行。
- 构建器只接受 `config/model-plugins.json` 中显式声明的本插件 JSON 数据路径，不开放 Provider 实现或外部运行库导入。
- 本机素材经过项目目录、类型和大小校验后上传；媒体下载不携带 API Key。
- 本项目不包含该服务的登录、账号运营、价格展示、统计上报、反馈或推广入口。
- 动态模型存储和接口已删除，不提供旧 `custom-*` 标识兼容；如曾建立临时节点，请重新选择固定模型。用户数据不自动改写或删除。

模型数据的来源与许可见 [第三方声明](../THIRD-PARTY-NOTICES.md)。验证使用模拟响应，没有读取真实 Key 或发起付费请求。

## Image G 参数约束

Flare / Sunburst 默认输出 PNG，提交时必须省略 `output_compression`；只有 JPEG/WebP 发送该字段，值为 0–100 的整数。模型目录中的压缩滑块默认值不能直接用于 PNG 请求。JPEG 不支持透明背景。以上规则已在插件请求构造层落实，切换回 PNG 后不会携带之前保存的压缩参数。

Work-Fisher 请求失败保留上游 HTTP 状态及本地安全提示，参数、密钥、额度和限流拒绝不再统一误报为网络故障。诊断只记录提交/上传/查询阶段、HTTP 状态和安全请求标识，不记录原始响应正文。提交结果不确定时仍禁止自动重提。

## 本地视频编辑与全能参考

按 [素材上传文档](https://api.work-fisher.com/docs/#upload) 接入：将已上传到当前项目的视频素材节点连接到视频生成节点，选择支持视频输入的模型，例如“谷歌OMNI Flash · Work-Fisher”的视频编辑模式，或“Seedance 2.0 Standard · Work-Fisher”的全能参考模式。连接时会按模型声明选择可用模式，仍遵守素材类型和数量限制。

点击生成后，后端读取项目内的视频文件，以 multipart/form-data 的 file 字段上传至 POST /v1/files/upload，再将返回 URL 填入视频编辑的 metadata.video_url 或全能参考的 metadata.content[].video_url.url，然后提交生成任务。连线阶段无需先有公网 networkUrl；本地保存的视频优先于旧 networkUrl，避免复用已经过期的签名链接。上传失败不会继续提交生成任务。

上传支持视频 MP4/AVI/MOV/MKV，单文件不超过 50 MB；图片支持 JPG/JPEG/PNG/WEBP，音频支持 MP3/WAV/FLAC。临时链接有效期 24 小时，只用于本次请求，不替换项目的本地素材地址。模型可能另有限制，并非所有视频模型都支持视频编辑。谷歌 OMNI Flash 不接受指定时长，提交时省略 seconds。

## Seedance 2.5 视频编辑

当提示词要求替换原视频中的角色、场景等，上游可能将全能参考请求识别为视频编辑。该场景不能沿用普通生成的固定比例和时长，否则会返回 `ratio=adaptive`、`duration=-1` 的参数错误。

在“Seedance 2.5 Standard · Work-Fisher”（含宽审核版本）中连接一个视频，按需连接角色图片，然后选择 **视频编辑**。界面显示“原视频比例 / 原视频时长”，自动发送 `metadata.ratio: "adaptive"`、`metadata.duration: -1`，省略 `seconds`。仍使用对应的 `seedance-2.5-*-multi` 模型；视频、图片及音频通过 `metadata.content` 一起传入。

本地参考视频在上传前由媒体探测器检查，时长须为 **4～30 秒（含边界）**；不满足时须先裁剪或更换素材。已有公网 URL 的视频时长由上游校验，本机不额外下载。原有上传格式和 50 MB 限制仍然适用。

普通 **全能参考** 保留自选比例和时长，用于以视频为参考创作新片；切换到编辑模式不会覆盖节点原先保存的普通生成参数。失败任务不会自动重新提交；若遇到编辑分类提示，请切换模式、检查素材后手动重新生成。
