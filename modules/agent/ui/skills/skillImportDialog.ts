import { AgentOperationError } from '../../../contracts/agentErrors.js';
import { CARD_PLACEHOLDER_IMAGE } from '../../../contracts/presentationAssets.js';
import { activateModal } from '../../../canvas-ui/api/ui/design/modalFocus';
import { SKILL_CATEGORIES, SKILL_DESCRIPTION_MAX_LENGTH } from '../../../contracts/skillCatalog.js';
import type { AgentSkillClient } from './skillClient';
import { button, element } from './skillManagerCards';

type ImportFile = File & { webkitRelativePath?: string };
const SKILL_FILE = /(?:^|\/)SKILL\.md$/i;
function relative(file: ImportFile) { return file.webkitRelativePath || file.name; }
function readText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new AgentOperationError(`无法读取 ${file.name}`, { operation: 'read-skill-import' }));
    reader.onload = () => resolve(String(reader.result || '')); reader.readAsText(file);
  });
}
function field(label: string, control: HTMLElement) {
  const wrap = element('label', 'nako-skill-import-field'); wrap.append(element('span', '', label), control); return wrap;
}
function skillFileWithPath(file: File, path: string) {
  const result = new File([file], file.name, { type: file.type });
  Object.defineProperty(result, 'webkitRelativePath', { value: path });
  return result as ImportFile;
}

export function openSkillImportDialog(client: AgentSkillClient, onClose: () => void, onImported: () => void) {
  const overlay = element('div', 'nako-skill-detail-overlay');
  const dialog = element('section', 'nako-skill-import-dialog');
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', '导入技能');
  const head = element('header', 'nako-skill-import-head');
  const heading = element('div'); heading.append(element('h2', '', '导入技能'), element('p', '', '导入 SKILL.md 与配套文件，可补充名称、简介和封面。'));
  const close = button('×', onClose); close.className = 'nako-skill-close'; close.setAttribute('aria-label', '关闭导入界面'); head.append(heading, close);

  const form = element('div', 'nako-skill-import-form');
  const name = element('input'), description = element('input'), category = element('input'), content = element('textarea');
  name.maxLength = 120; name.required = true; name.placeholder = '为你的技能起个名字'; name.setAttribute('aria-label', '技能名称');
  description.maxLength = SKILL_DESCRIPTION_MAX_LENGTH; description.required = true; description.placeholder = '说明适用场景、输入要求和交付内容'; description.setAttribute('aria-label', '简介');
  category.maxLength = 40; category.value = SKILL_CATEGORIES[0] || ''; category.placeholder = '输入或选择分类'; category.setAttribute('list', 'nako-skill-import-categories'); category.setAttribute('aria-label', '分类');
  const categories = element('datalist'); categories.id = 'nako-skill-import-categories'; categories.replaceChildren(...SKILL_CATEGORIES.map(value => new Option(value, value)));
  content.placeholder = '选择 SKILL.md 后会显示内容，可在导入前编辑'; content.setAttribute('aria-label', '技能内容');
  const sources = element('div', 'nako-skill-import-sources');
  const fileInput = element('input'); fileInput.type = 'file'; fileInput.accept = '.md'; fileInput.hidden = true; fileInput.setAttribute('aria-label', '选择 SKILL.md');
  const folderInput = element('input'); folderInput.type = 'file'; folderInput.multiple = true; folderInput.setAttribute('webkitdirectory', ''); folderInput.hidden = true; folderInput.setAttribute('aria-label', '选择技能文件夹');
  const sourceStatus = element('p', 'nako-skill-import-status', '尚未选择技能文件');
  const fileButton = button('选择 SKILL.md', () => fileInput.click());
  const folderButton = button('选择文件夹', () => folderInput.click());
  sources.append(fileButton, folderButton, sourceStatus, fileInput, folderInput);

  const coverInput = element('input'); coverInput.type = 'file'; coverInput.accept = 'image/png,image/jpeg,image/webp,image/gif'; coverInput.hidden = true; coverInput.setAttribute('aria-label', '选择封面图片');
  const coverPreview = element('img', 'nako-skill-import-cover'); coverPreview.src = CARD_PLACEHOLDER_IMAGE; coverPreview.alt = '技能默认封面';
  const coverButton = button('上传封面（可选）', () => coverInput.click());
  const coverRow = element('div', 'nako-skill-import-cover-row'); coverRow.append(coverPreview, coverButton, coverInput);
  let files: ImportFile[] = [], markdownFile: ImportFile | null = null, cover: File | null = null, coverUrl = '';
  const result = element('p', 'nako-skill-import-status'); result.setAttribute('role', 'status');
  const save = button('导入技能', () => void submit()); save.classList.add('is-primary'); save.disabled = true;
  const cancel = button('取消', onClose);
  const footer = element('footer', 'nako-skill-detail-footer'); footer.append(cancel, save);
  form.append(field('技能名称 *', name), field('简介 *', description), field('分类', category), sources,
    field('技能内容 *', content), coverRow, result);
  dialog.append(head, form, footer); overlay.append(dialog); document.body.append(overlay);
  const release = activateModal(overlay, onClose, { initialFocus: fileButton });
  const dispose = () => { release(); overlay.remove(); if (coverUrl) URL.revokeObjectURL(coverUrl); };
  const parseMetadata = (text: string) => {
    const front = text.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---/);
    const value = (key: string) => front?.[1].match(new RegExp(`^${key}:\\s*(.*)$`, 'im'))?.[1]?.trim().replace(/^(?:"(.*)"|'(.*)')$/, '$1$2') || '';
    return { name: value('display-name') || value('name'),
      description: value('display-description') || value('description'), category: value('category') };
  };
  const updateReady = () => { save.disabled = !(markdownFile && name.value.trim() && description.value.trim() && content.value.trim()); };
  const chooseFiles = async (selected: FileList | null) => {
    files = Array.from(selected || []) as ImportFile[]; markdownFile = files.find(file => SKILL_FILE.test(relative(file))) || null;
    if (!markdownFile) { result.textContent = '所选内容必须包含一个 SKILL.md'; save.disabled = true; return; }
    const matches = files.filter(file => SKILL_FILE.test(relative(file)));
    if (matches.length !== 1) { result.textContent = '每次导入一个技能，请分别选择包含单个 SKILL.md 的文件夹。'; markdownFile = null; save.disabled = true; return; }
    const markdown = await readText(markdownFile); content.value = markdown;
    const root = relative(markdownFile).replace(/[^/]+$/, '');
    const metadataFile = files.find(file => relative(file) === `${root}metadata.json`);
    let meta = parseMetadata(markdown);
    if (metadataFile) {
      try {
        const value = JSON.parse(await readText(metadataFile));
        if (typeof value?.name !== 'string' || typeof value?.description !== 'string') {
          throw new AgentOperationError('metadata.json 的名称或简介无效', { operation: 'read-skill-import-metadata' });
        }
        meta = { name: value.name, description: value.description, category: typeof value.category === 'string' ? value.category : '' };
      } catch (error) { result.textContent = error instanceof Error ? error.message : '无法读取 metadata.json'; save.disabled = true; return; }
    }
    name.value = meta.name; description.value = meta.description;
    if (SKILL_CATEGORIES.includes(meta.category)) category.value = meta.category;
    sourceStatus.textContent = `已选择 ${files.length} 个文件`;
    result.textContent = ''; updateReady();
  };
  fileInput.addEventListener('change', () => void chooseFiles(fileInput.files));
  folderInput.addEventListener('change', () => void chooseFiles(folderInput.files));
  name.addEventListener('input', updateReady); description.addEventListener('input', updateReady); content.addEventListener('input', updateReady);
  coverInput.addEventListener('change', () => {
    cover = coverInput.files?.[0] || null;
    if (!cover) return;
    if (cover.size > 5 * 1024 * 1024) { cover = null; result.textContent = '封面不能超过 5 MB'; return; }
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    coverUrl = URL.createObjectURL(cover); coverPreview.src = coverUrl; coverPreview.alt = '自定义技能封面';
    coverButton.textContent = cover.name;
  });
  async function submit() {
    if (!markdownFile || save.disabled) return;
    save.disabled = true; result.textContent = '正在导入…';
    try {
      const path = relative(markdownFile), root = path.slice(0, Math.max(0, path.lastIndexOf('/') + 1));
      const updated = new File([content.value], markdownFile.name, { type: 'text/markdown' });
      const metadataPath = `${root}metadata.json`;
      const metadata = new File([JSON.stringify({ name: name.value.trim(), description: description.value.trim(), category: category.value.trim() }, null, 2)], 'metadata.json', { type: 'application/json' });
      const uploaded = files.filter(file => relative(file) !== metadataPath)
        .map(file => relative(file) === path ? skillFileWithPath(updated, path) : file);
      uploaded.push(skillFileWithPath(metadata, metadataPath));
      if (cover) {
        const coverPath = `${root}cover.${cover.name.split('.').pop()?.toLowerCase()}`;
        uploaded.splice(0, uploaded.length, ...uploaded.filter(file =>
          !/^cover\.(?:png|jpe?g|webp|gif)$/i.test(relative(file).split('/').pop() || ''),
        ));
        uploaded.push(skillFileWithPath(cover, coverPath));
      }
      await client.importFolders(uploaded, category.value.trim() || undefined);
      result.textContent = '技能已导入'; onImported(); dispose();
    } catch (error) { result.textContent = error instanceof Error ? error.message : '导入失败，请检查技能文件后重试。'; save.disabled = false; }
  }
  overlay.addEventListener('mousedown', event => { if (event.target === overlay) onClose(); });
  return dispose;
}
