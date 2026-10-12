export function createTray({ Tray, Menu, icon, onShow, onQuit }) {
  const tray = new Tray(icon);
  tray.setToolTip('NAKO Agent 纳科画布智能体');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示 NAKO Agent 纳科画布智能体', click: onShow },
      { type: 'separator' },
      { label: '退出 NAKO Agent 纳科画布智能体', click: onQuit },
    ]),
  );
  tray.on('click', onShow);
  return tray;
}
