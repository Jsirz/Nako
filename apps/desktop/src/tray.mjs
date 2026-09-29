export function createTray({ Tray, Menu, icon, onShow, onQuit }) {
  const tray = new Tray(icon);
  tray.setToolTip('Nako 画布');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示 Nako 画布', click: onShow },
      { type: 'separator' },
      { label: '退出 Nako 画布', click: onQuit },
    ]),
  );
  tray.on('click', onShow);
  return tray;
}
