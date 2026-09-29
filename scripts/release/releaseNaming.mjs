export const RELEASE_CONTRACT = Object.freeze({
  product: 'Nako 画布',
  controlCenter: 'Nako 控制中心',
  executable: 'Nako 控制中心.exe',
  installScript: 'Install-Nako-Canvas.bat',
  startScript: 'Start-Nako-Canvas.bat',
  stopScript: 'Stop-Nako-Canvas.bat',
  upgradeScript: 'Upgrade-Nako-Canvas.bat',
  rollbackScript: 'Rollback-Nako-Canvas.bat',
  uninstallScript: 'Uninstall-Nako-Canvas.bat',
  packagePrefix: 'Nako-Canvas',
  format: 'nako-portable-release',
});

export function brandedRootFiles(contract = RELEASE_CONTRACT) {
  return [
    contract.executable,
    contract.installScript,
    contract.startScript,
    contract.stopScript,
    contract.upgradeScript,
    contract.rollbackScript,
    contract.uninstallScript,
  ];
}

export function portablePackageName(version) {
  return `${RELEASE_CONTRACT.packagePrefix}-${version}-portable`;
}

export function installerPackageName(version) {
  return `${RELEASE_CONTRACT.packagePrefix}-${version}-Setup.exe`;
}

export function isPortableArchiveFileName(fileName) {
  const prefix = `${RELEASE_CONTRACT.packagePrefix}-`;
  const suffix = '-portable.zip';
  return (
    fileName.startsWith(prefix) &&
    fileName.endsWith(suffix) &&
    fileName.length > prefix.length + suffix.length
  );
}
