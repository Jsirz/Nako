# 示例节点包

这里保存可复制到安装目录 `nodes/` 的开发示例。示例不会被运行时自动扫描。

将 `text-replace` 整个目录复制到：

```text
<安装目录>/nodes/text-replace/
```

也可以用 `NAKO_NODE_DIR` 指定自定义目录。复制后调用 `POST /api/node-packages/reload`，或重启应用。画布菜单中会出现“字符替换”节点。
