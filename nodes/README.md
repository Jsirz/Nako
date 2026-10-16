# Nako 自定义节点目录

安装后，运行时默认扫描 `<安装目录>/nodes/`。每个直接子目录是一个节点包，至少包含 `manifest.json`（也支持 `node-package.json`）和 `index.mjs`。目录内的节点会自动出现在画布的“添加节点”菜单中，无需修改核心源码。

开发环境或需要使用用户目录时，可用 `NAKO_NODE_DIR` 覆盖默认目录。覆盖目录后调用 `POST /api/node-packages/reload`，或重启应用使变更生效。

默认安装 `canvas-core/`，包含基础节点和“逐帧拉片”。逐帧拉片使用宿主能力调用 Work-Fisher 文本模型并在本地通过 FFmpeg 提取素材；用户明确授权后才执行。测试夹具位于 `tests/fixtures/nodes/`，不随应用安装。详细格式见 `docs/节点目录开发说明.md`。
