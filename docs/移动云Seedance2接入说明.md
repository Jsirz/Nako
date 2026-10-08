# 移动云 Seedance 2.0 接入说明

本项目在 `provider.ecloud` 内增加 **Seedance 2.0 · 移动云**，复用 `ECLOUD_API_KEY` 和视频任务恢复服务。依据用户指定的 [调用方式及 API 参考目录](https://ecloud.10086.cn/op-help-center/doc/outline/110521)，采用官方非加密 REST 接口，通过 HTTPS 传输；没有安装加密 SDK 或管理 RSA 视频解密密钥。

## 使用

1. 在移动云控制台开通「移动引擎机密模型服务」的 `doubao-seedance-2.0` 按量服务或有效资源包。已有其他 MoMA 模型的调用权限不代表已经开通 Seedance。
2. 启动或重启项目，在「设置 → 闭源服务 → 移动云 MoMA」保存有该模型权限的非 Token Plan API Key。
3. 新建视频节点，选择「Seedance 2.0 · 移动云」，填写提示词，设置时长、分辨率、比例及是否生成音频。
4. 使用参考素材时，展开视频高级设置，在对应图片、视频、音频地址字段输入公网 URL 或已审核素材的 `asset://asset-...` 地址，多个地址用空格分隔。也可连接保留公网素材地址的节点；连接素材在前，手填地址在后，不会静默覆盖或截断素材。
5. 一张图片自动匹配首帧，两张图片自动匹配首尾帧；三张以上图片或加入视频/音频时使用多模态模式。可手动切换多模态模式，把两张图用作普通参考图。执行前请核对模式与图片顺序。

| 模式 | 输入及用途 |
| --- | --- |
| 文生视频 | 提示词，不带参考媒体 |
| 首帧生视频 | 1 张图，角色为 `first_frame` |
| 首尾帧生视频 | 2 张图，依次为 `first_frame`、`last_frame` |
| 多模态参考 / 编辑延长 | 最多 9 张图、3 个视频、3 段音频；至少有图或视频。通过提示词描述编辑、延长或组合意图 |

**本轮 REST 接入使用公网素材地址或已审核素材 ID。** 本地路径、`/library/...`、内网 URL、Base64 会在提交前拒绝，不自动上传到其他存储服务。素材资产库创建、真人认证、资产删除属于另外的 AccessKey 签名接口，本轮没有增加这些云端管理功能；已有资产可直接引用。

支持输出 480p、720p、1080p；画布提供 4–15 秒，默认 5 秒；Provider API 也接受文档中的 `duration: -1` 智能时长。比例按非加密 REST 表列出的 16:9、9:16、1:1 提供。声音默认开启、水印默认关闭；高级设置可设置随机种子（-1 至 4294967295）。不启用文档明确不支持的 `draft` 或 `camera_fixed`。

提示词按同类素材的顺序引用，例如“图片 1”“视频 1”“音频 1”，不要在提示词中用 Asset ID 指代素材。编辑与延长使用 `reference_video` 和自然语言指令，不使用 HappyHorse 的 `video-edit` 参数结构。

## 请求与恢复

| 项目 | 配置 |
| --- | --- |
| 网关 | `https://zhenze-huhehaote.cmecloud.cn` |
| 创建 | `POST /api/v3/contents/generations/tasks` |
| 查询 | `GET /api/v3/contents/generations/tasks/{id}` |
| 认证 | `Authorization: Bearer <ECLOUD_API_KEY>` |
| 请求模型别名 | `doubao-seedance-2.0` |
| 文档当前响应模型 | `doubao-seedance-2-0-260128` |

请求使用顶层 `content` 数组，素材角色放在数组元素的 `role` 字段；`resolution`、`ratio`、`duration`、`generate_audio`、`watermark`、`seed` 同样为顶层字段。REST 网关自行识别视频输入，无需 SDK 的 `Input-Has-Video` 或 HappyHorse 的 `X-DashScope-Async` 请求头。

创建成功读取顶层 `id`，立即保存任务引用。`queued/running` 继续等待；`succeeded` 读取 `content.video_url` 并下载 MP4；`failed/cancelled/expired` 作为明确的终态处理。查询中附带的失败 `error` 对象不会被误判成提交阶段错误。

常规轮询间隔 10 秒，单次观察最长约 20 分钟，HTTP 创建超时为 5 分钟。超时、断线和下载失败不会再发起付费 POST：有任务 ID 时查询原任务，提交响应丢失时保留不确定状态并提示核对服务商记录。恢复校验任务 ID、模型、端点及密钥指纹，只发送 GET。下载媒体不携带模型密钥。

取消本地等待不会发送远端 DELETE。官方 DELETE 对排队任务表示取消，对已结束任务则表示删除记录；为保留恢复能力，插件不把两者混为同一个本地取消操作。任务列表和云端记录管理也未加入应用。

结果 URL 有时效性（文档通常为 24 小时），成功后立即保存本地；`execution_expires_after` 与任务状态以服务端为准，不套用 HappyHorse 的任务结构或保留时间。

## 素材限制和计费

官方通用模型规范规定：图片格式 JPEG/PNG/WebP/BMP/TIFF/GIF，单张小于 30 MB，宽高在 (300, 6000) 像素、宽高比在 (0.4, 2.5)；参考视频 MP4/MOV，每个 2–15 秒、不超过 50 MB、24–60 fps，最多 3 个且总时长不超过 15 秒；音频 WAV/MP3，每段 2–15 秒、不超过 15 MB，最多 3 段且总时长不超过 15 秒。

本地代码校验输入数量、模式、URL 类型及生成参数；不会为了校验而下载用户的远端素材。远端文件的实际尺寸、时长、大小和审核状态由服务商校验。真人图像/视频须遵循移动云素材资产要求，不能将普通公网地址当作已审核资产。

非加密 REST 文档要求公网 URL；SDK 通用参数页还提到图片/音频 Base64 及更多比例。本实现采用 REST 文档较窄的输入和比例范围，已审核 `asset://` 的用法由官方常见问题和 SDK 参数页补充。未声称完成加密 SDK 的端到端保护能力。

费用依输入是否含视频、输出分辨率、Token 用量和订购资费决定。界面显示“以移动云 MoMA 实际账单为准”，不把静态目录占位值 0 当作免费报价。服务端返回的 `usage` 不会上报到原项目服务。

## 官方依据与验证

阅读日期：2026-09-16。

- [调用方式目录](https://ecloud.10086.cn/op-help-center/doc/outline/110521)
- [非加密 REST API](https://ecloud.10086.cn/op-help-center/doc/article/100962)
- [SDK 加密调用与模型通用参数](https://ecloud.10086.cn/op-help-center/doc/article/99301)
- [产品能力](https://ecloud.10086.cn/op-help-center/doc/article/99154)、[订购及操作](https://ecloud.10086.cn/op-help-center/doc/article/99156)
- [常见问题与 Asset 引用](https://ecloud.10086.cn/op-help-center/doc/article/99155)、[素材资产 API 说明](https://ecloud.10086.cn/op-help-center/doc/article/100301)
- [资费及资源包规则](https://ecloud.10086.cn/op-help-center/doc/article/99164)

实现见 [seedance.js](../plugins/providers/ecloud/seedance.js)，测试见 [ecloud-seedance.test.js](../tests/ecloud-seedance.test.js)。验证覆盖四种请求格式、轮询、终态、丢失提交响应、结果下载失败、取消、GET 恢复、密钥隔离、输入限制及画布参考地址到请求体的传递；未使用真实 API Key 做付费调用。完整结果见 [验证记录](history/验证记录.md)。
