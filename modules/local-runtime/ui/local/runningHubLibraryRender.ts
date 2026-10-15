import { requestAnchoredConfirmation } from '../../../kernel/ui/designSystem';
import { createStableElement as element } from '../../../kernel/ui/dom';
import type { RunningHubWebAppCard } from './workflowManagerClient';
import { control } from './runningHubControls';

export function createRunningHubLibraryCard(
  app: RunningHubWebAppCard,
  removeApp: () => Promise<void>,
  busy: (button: HTMLButtonElement, label: string, action: () => Promise<void>) => Promise<void>,
) {
  const card = element('article', 'rhwm-card');
  card.setAttribute('data-nako-rh-webapp-card', app.definitionId);
  const cover = element('div', 'rhwm-card-cover');
  const badges = element('div', 'rhwm-card-badges');
  badges.append(element('span', 'rhwm-badge', app.site === 'global' ? 'AI' : 'CN'),
    element('span', `rhwm-badge${app.verified ? ' is-ready' : ''}`, app.verified ? '已验证' : '可使用'));
  if (app.coverUrl) {
    const image = document.createElement('img');
    image.src = app.coverUrl;
    image.alt = app.title;
    image.loading = 'lazy';
    image.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
    cover.append(image);
    badges.style.cssText = 'position:relative;z-index:1';
  }
  cover.append(badges);
  if (!app.coverUrl) cover.append(element('div', 'rhwm-card-mark', 'WEBAPP'));
  const body = element('div', 'rhwm-card-body');
  body.append(element('div', 'rhwm-card-title', app.title),
    element('div', 'rhwm-card-description', app.description || `${app.categoryName} · RunningHub 云端应用`));
  const meta = element('div', 'rhwm-card-meta');
  meta.append(element('span', '', app.categoryName), element('span', '', '·'),
    element('span', '', `${app.fieldCount} 个输入`), element('span', '', '·'), element('span', '', app.webAppId));
  const actions = element('div', 'rhwm-card-actions');
  const remove = control('删除');
  remove.classList.add('rhwm-delete');
  remove.addEventListener('click', () => {
    void (async () => {
      const confirmed = await requestAnchoredConfirmation({
        anchor: remove, intent: 'destructive', title: '删除云端工作流？',
        description: `“${app.title}”将从本机列表删除；已添加到画布的节点仍保留。`, confirmLabel: '删除',
      });
      if (confirmed) await busy(remove, '删除中…', removeApp);
    })();
  });
  const test = control(app.verified ? '查看字段与输出' : '设置字段', true);
  test.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('nako:test-runninghub-webapp', {
      detail: { definitionId: app.definitionId, title: app.title },
    }));
  });
  actions.append(remove, test);
  body.append(meta, actions);
  card.append(cover, body);
  return card;
}

export function renderRunningHubCategories(
  categoryBar: HTMLDivElement,
  apps: RunningHubWebAppCard[],
  categories: Array<{ id: string; name: string }>,
  activeCategory: string,
  selectCategory: (id: string) => void,
) {
  categoryBar.replaceChildren();
  const all = element('button', `rhwm-chip${activeCategory === 'all' ? ' is-active' : ''}`, `全部 ${apps.length}`);
  all.type = 'button';
  all.addEventListener('click', () => selectCategory('all'));
  categoryBar.append(all);
  for (const item of categories) {
    const count = apps.filter((app) => app.categoryId === item.id).length;
    const chip = element('button', `rhwm-chip${activeCategory === item.id ? ' is-active' : ''}`, `${item.name} ${count}`);
    chip.type = 'button';
    chip.addEventListener('click', () => selectCategory(item.id));
    categoryBar.append(chip);
  }
}
