import type { AgentSkill, AgentSkillDocument } from '../../../contracts/skillCatalog.js';
import { SKILL_CATEGORIES, SKILL_DESCRIPTION_MAX_LENGTH } from '../../../contracts/skillCatalog.js';
import { CARD_PLACEHOLDER_IMAGE } from '../../../contracts/presentationAssets.js';
import { activateModal } from '../../../kernel/ui/modalFocus';
import { createAgentSkillClient, type AgentSkillClient } from './skillClient';
import { installSkillStyles } from './skillCommunityStyles';
import { button, element } from './skillManagerCards';

function openDeleteConfirmation(name: string, onConfirm: () => void) {
  const overlay = element('div', 'nako-skill-detail-overlay nako-skill-delete-overlay');
  const dialog = element('section', 'nako-skill-import-dialog nako-skill-delete-dialog');
  dialog.setAttribute('role', 'alertdialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', '删除技能确认');
  const title = element('h2', '', '删除技能？');
  const message = element('p', '', `确定删除“${name}”及其全部文件？此操作无法撤销，已有对话记录保留。`);
  message.id = 'nako-skill-delete-message'; dialog.setAttribute('aria-describedby', message.id);
  let release: (() => void) | undefined, closed = false;
  const close = () => { if (closed) return; closed = true; release?.(); overlay.remove(); };
  const cancel = button('取消', close);
  const confirm = button('确认删除技能', () => { if (closed) return; close(); onConfirm(); }); confirm.classList.add('is-danger');
  const actions = element('footer', 'nako-skill-detail-footer'); actions.append(cancel, confirm);
  dialog.append(title, message, actions); overlay.append(dialog); document.body.append(overlay);
  release = activateModal(overlay, close, { initialFocus: cancel });
  overlay.addEventListener('mousedown', event => { if (event.target === overlay) close(); });
  return close;
}

export function openSkillEditDialog(skill: AgentSkill, onSaved: (skill: AgentSkill | null) => void,
  client: AgentSkillClient = createAgentSkillClient()) {
  if (skill.source !== 'local') return () => {};
  installSkillStyles();
  const overlay = element('div', 'nako-skill-detail-overlay');
  const dialog = element('section', 'nako-skill-import-dialog nako-skill-editor');
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', '编辑技能');
  const head = element('header', 'nako-skill-import-head'), title = element('div');
  title.append(element('h2', '', '编辑技能'), element('p', '', '编辑自定义技能与配套文件，保存后生效。'));
  let busy = false, disposed = false, document: AgentSkillDocument | undefined, coverUrl = '', selectedPath = '';
  const drafts = new Map<string, string>(), added = new Map<string, File>(), removed = new Set<string>();
  let coverFile: string | null | undefined;
  let release: (() => void) | undefined;
  let closeConfirmation: (() => void) | undefined;
  const close = () => {
    if (busy || disposed) return;
    disposed = true; closeConfirmation?.(); release?.(); overlay.remove(); if (coverUrl) URL.revokeObjectURL(coverUrl);
  };
  const dismiss = button('×', close); dismiss.setAttribute('aria-label', '关闭编辑技能'); dismiss.className = 'nako-skill-close';
  head.append(title, dismiss);
  const form = element('fieldset', 'nako-skill-edit-form'); form.disabled = true;
  const name = element('input'), description = element('textarea'), category = element('input');
  name.maxLength = 120; description.maxLength = SKILL_DESCRIPTION_MAX_LENGTH; category.maxLength = 40;
  const field = (label: string, input: HTMLElement) => {
    input.setAttribute('aria-label', label);
    const wrapper = element('label', 'nako-skill-import-field'); wrapper.append(element('span', '', label), input); return wrapper;
  };
  category.setAttribute('list', 'nako-skill-edit-categories');
  const categories = element('datalist'); categories.id = 'nako-skill-edit-categories';
  categories.append(...SKILL_CATEGORIES.map(value => new Option(value, value)));
  const meta = element('div', 'nako-skill-edit-metadata');
  meta.append(field('技能名称', name), field('简介', description), field('分类', category), categories);
  const preview = element('img', 'nako-skill-import-cover'); preview.alt = '技能封面'; preview.src = skill.coverUrl || CARD_PLACEHOLDER_IMAGE;
  const coverInput = element('input'); coverInput.type = 'file'; coverInput.hidden = true;
  coverInput.accept = 'image/png,image/jpeg,image/webp,image/gif'; coverInput.setAttribute('aria-label', '更换封面图片');
  const coverRow = element('div', 'nako-skill-import-cover-row');
  coverRow.append(preview, button('更换封面', () => coverInput.click()), button('移除封面', () => {
    coverFile = null; preview.src = CARD_PLACEHOLDER_IMAGE;
  }), coverInput);
  const filesPanel = element('div', 'nako-skill-edit-files'), selector = element('select'), content = element('textarea');
  const fileNote = element('p', 'nako-skill-import-status'), fileActions = element('div', 'nako-skill-import-sources');
  selector.setAttribute('aria-label', '技能文件'); content.setAttribute('aria-label', '文件内容'); content.spellcheck = false;
  const upload = element('input'); upload.type = 'file'; upload.multiple = true; upload.hidden = true; upload.setAttribute('aria-label', '添加技能文件');
  const newPath = element('input'); newPath.placeholder = '例如 references/guide.md'; newPath.setAttribute('aria-label', '新文件路径');
  const status = element('p', 'nako-skill-import-status'); status.setAttribute('role', 'status'); status.textContent = '正在读取技能…';
  function validPath(path: string) {
    return path && !/[\\:<>"|?*\x00-\x1f]/.test(path) && !path.split('/').some(part => !part || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) && path.toLowerCase() !== 'metadata.json';
  }
  function paths() { return [...new Set([...(document?.files.map(file => file.path) || []), ...added.keys(), ...drafts.keys()])].filter(path => !removed.has(path)).sort(); }
  function showFile(path: string) {
    selectedPath = path;
    const original = document?.files.find(file => file.path === path);
    const text = drafts.get(path) ?? (added.has(path) ? undefined : original?.text);
    content.value = text ?? ''; content.disabled = text === undefined;
    fileNote.textContent = text === undefined ? '此文件为附件，可上传替换或删除。' : '可编辑文本文件；参考清单中的路径需要与文件保持一致。';
  }
  function renderFiles(preferred = selectedPath) {
    const names = paths(); selector.replaceChildren(...names.map(path => new Option(path, path)));
    selector.value = names.includes(preferred) ? preferred : names.includes('SKILL.md') ? 'SKILL.md' : names[0] || '';
    showFile(selector.value);
  }
  selector.addEventListener('change', () => showFile(selector.value));
  content.addEventListener('input', () => drafts.set(selectedPath, content.value));
  const addText = button('新建文本文件', () => {
    const path = newPath.value.trim();
    if (!validPath(path) || paths().some(item => item.toLowerCase() === path.toLowerCase())) { status.textContent = '请输入有效且不重复的相对文件路径。'; return; }
    removed.delete(path); drafts.set(path, ''); newPath.value = ''; renderFiles(path);
  });
  const removeFile = button('删除文件', () => {
    if (!selectedPath || selectedPath === 'SKILL.md') { status.textContent = '根 SKILL.md 必须保留。'; return; }
    removed.add(selectedPath); drafts.delete(selectedPath); added.delete(selectedPath);
    if ((coverFile === undefined ? document?.coverFile : coverFile) === selectedPath) { coverFile = null; preview.src = CARD_PLACEHOLDER_IMAGE; }
    renderFiles();
  });
  fileActions.append(newPath, addText, button('上传文件', () => upload.click()), removeFile, upload);
  filesPanel.append(field('技能文件', selector), fileActions, content, fileNote);
  form.append(meta, coverRow, filesPanel);
  const footer = element('footer', 'nako-skill-detail-footer');
  const save = button('保存修改', () => void submit()); save.classList.add('is-primary'); save.disabled = true;
  const remove = button('删除技能', () => {
    if (busy || disposed) return;
    closeConfirmation?.(); closeConfirmation = openDeleteConfirmation(document?.skill.name || skill.name, () => void deleteSkill());
  }); remove.classList.add('is-danger'); remove.disabled = true;
  footer.append(remove, button('取消', close), save);
  dialog.append(head, form, status, footer); overlay.append(dialog); window.document.body.append(overlay);
  release = activateModal(overlay, close, { initialFocus: dismiss });
  overlay.addEventListener('mousedown', event => { if (event.target === overlay) close(); });
  function setBusy(value: boolean) { busy = value; form.disabled = value; save.disabled = value; remove.disabled = value; dismiss.disabled = value; }
  upload.addEventListener('change', () => {
    const files = Array.from(upload.files || []), target = newPath.value.trim();
    for (const file of files) {
      const path = files.length === 1 && target ? target : file.name;
      if (!validPath(path)) { status.textContent = '文件名无效，metadata.json 请通过上方表单编辑。'; continue; }
      added.set(path, file); drafts.delete(path); removed.delete(path);
      if (/\.(?:md|txt|json|ya?ml|py|[cm]?js|ts|css|html|csv|xml|toml|sh|bat|ps1)$/i.test(path)) {
        const reader = new FileReader();
        reader.onload = () => {
          if (disposed || added.get(path) !== file) return;
          drafts.set(path, String(reader.result || '')); renderFiles(selectedPath || path);
        };
        reader.onerror = () => { if (!disposed) status.textContent = `无法读取 ${path}，请重新上传。`; };
        reader.readAsText(file);
      }
    }
    renderFiles(); upload.value = ''; newPath.value = '';
  });
  coverInput.addEventListener('change', () => {
    const file = coverInput.files?.[0]; if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !/^(png|jpe?g|webp|gif)$/.test(extension) || file.size > 5 * 1024 * 1024) { status.textContent = '请选择不超过 5 MB 的 GIF、PNG、JPEG 或 WebP 图片。'; return; }
    coverFile = `cover.${extension}`; added.set(coverFile, file); drafts.delete(coverFile); removed.delete(coverFile); coverInput.value = '';
    if (coverUrl) URL.revokeObjectURL(coverUrl); coverUrl = URL.createObjectURL(file); preview.src = coverUrl; renderFiles();
  });
  async function submit() {
    if (busy || !document) return;
    if (!name.value.trim() || !description.value.trim()) { status.textContent = '请填写技能名称和简介。'; return; }
    setBusy(true); status.textContent = '正在保存…';
    try {
      const files = new Map(added);
      for (const [path, text] of drafts) if (text !== document.files.find(file => file.path === path)?.text || added.has(path)) files.set(path, new File([text], path.split('/').pop()!));
      const uploads = [...files].filter(([path]) => !removed.has(path)).map(([path, file]) => {
        const upload = new File([file], file.name, { type: file.type }); Object.defineProperty(upload, 'webkitRelativePath', { value: path }); return upload;
      });
      const updated = await client.update(skill.slug, { updatedAt: document.skill.updatedAt, name: name.value.trim(), description: description.value.trim(), category: category.value.trim() || '其他',
        removedPaths: [...removed].filter(path => document!.files.some(file => file.path === path)), ...(coverFile !== undefined ? { coverFile } : {}) }, uploads);
      if (disposed) return;
      setBusy(false); close(); onSaved(updated);
    } catch (error) { if (!disposed) { setBusy(false); status.textContent = error instanceof Error ? error.message : '保存失败，请重试。'; } }
  }
  async function deleteSkill() {
    if (busy) return;
    setBusy(true); status.textContent = '正在删除…';
    try { await client.remove(skill.slug); if (disposed) return; setBusy(false); close(); onSaved(null); }
    catch (error) { if (!disposed) { setBusy(false); status.textContent = error instanceof Error ? error.message : '删除失败，请重试。'; } }
  }
  void client.readDocument(skill.slug).then(value => {
    if (disposed) return;
    document = value; name.value = value.skill.name; description.value = value.skill.description; category.value = value.skill.category || '其他';
    renderFiles('SKILL.md'); setBusy(false); status.textContent = '';
  }).catch(error => { if (!disposed) status.textContent = error instanceof Error ? error.message : '读取失败，请关闭后重试。'; });
  return () => { busy = false; close(); };
}
