# Nako 自定义节点目录

安装后，运行时默认扫描 `<安装目录>/nodes/`。每个直接子目录是一个节点包，至少包含 `manifest.json`（也支持 `node-package.json`）和 `index.mjs`。目录内的节点会自动出现在画布的“添加节点”菜单中，无需修改核心源码。

开发环境或需要使用用户目录时，可用 `NAKO_NODE_DIR` 覆盖默认目录。覆盖目录后调用 `POST /api/node-packages/reload`，或重启应用使变更生效。

默认仅安装 `canvas-core/` 基础节点包。开发示例位于仓库 `examples/nodes/`，不会自动加载；需要时再复制到本目录。详细格式见 `docs/节点目录开发说明.md`。
