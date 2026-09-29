export function startupFailureMessage(error) {
  switch (error?.code) {
    case 'CREDENTIAL_FORMAT_INVALID':
      return '本地 API Key 文件格式需要转换为 Nako。请先备份，再按 docs/Nako品牌私有化说明.md 转换凭据后重试；项目和原密钥文件仍保留在本机。';
    case 'CREDENTIAL_DECRYPT_FAILED':
      return '无法解密本地 API Key。请使用原 Windows 账号，并确认旧凭据已转换为 Nako 格式；不要删除原凭据文件。';
    default:
      return '本机服务未能启动，请重试。你的项目仍保存在本机。';
  }
}
