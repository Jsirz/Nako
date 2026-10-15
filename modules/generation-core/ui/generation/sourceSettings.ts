import { ERRORS, PluginError } from '../../../contracts/errors.js';
/**
 * 设置页按来源管理密钥，固定模型目录默认折叠。
 * 来源读取失败保留草稿并提供重试；模型 ID 是否允许覆盖由目录契约声明。
 */

import {
  isLikelyProviderApiKey,
  modelOverrideKey,
} from '../../../contracts/shared/modelOverrideKey.js';
import type {
  MediaKind,
  SourceBlock,
  SourceMedia,
  SourceModel,
  SourceSecret,
  SourceSettingsClient,
} from './sourceSettingsClient';
import { createStableTextElement as textElement } from '../../../kernel/ui/dom';
import { scopeSourceSettingsClient } from './sourceSettingsClient';
import { createSettingsScope, type SettingsScope } from '../../../kernel/ui/settingsScope';
import { mountDefaultModelsSettings } from './defaultModelsSettings';
import { libTvCliVendor } from './libTvCliSettings';
import { visibleSourceBlocks } from './hiddenProviderPolicy';
import { badge, disclosureButton, vendorLink } from './sourceSettingsDom';
import { dreaminaCliVendor } from './dreaminaCliSettings';

const PANEL_ATTRIBUTE = 'data-nako-source-settings';
const MEDIA_LABELS: Record<MediaKind, string> = {
  image: '图像',
  video: '视频',
  text: '文本',
  audio: '音频',
};

const BLOCK_NOTES: Record<string, string> = {
  work_fisher:
    '使用已适配的 Work-Fisher 文本、图像、视频与音频模型；保存 API Key 后直接在画布或 Agent 选择。密钥只保存在本机。',
  ecloud:
    '使用移动云 MoMA 非 Token Plan 的 API Key；Seedance 2.0 须另开通移动引擎机密模型服务，当前采用 HTTPS REST 非加密视频调用。密钥只保存在本机，费用以移动云账单为准。',
  // RH 两个站是两个账号：各自注册、各自充值、各自 API Key，余额不互通。
  // 「全能图片」标准模型系列已从 CN 站下线迁到 RH AI站。
  runninghub_global:
    'RH CN 和 AI 站的密钥不互通，需要在 RH AI 站单独注册充值，并保存本站的 API Key。',
  runninghub:
    'RH CN 和 AI 站的密钥不互通，需要在 RH CN 站单独注册并创建 API Key。两站余额不互通；「全能图片」系列已迁到 RH AI 站。',
  official: '每家厂商各自独立的密钥，填哪家亮哪家。价格以各厂商账单为准。',
};

function blockNote(block: SourceBlock) {
  return BLOCK_NOTES[block.source] ?? '';
}

const DIRECT_VENDOR_ORDER = ['豆包', 'Kimi', 'DeepSeek', '智谱 GLM', 'OpenAI'] as const;

/**
 * 密钥的展示信息。后端只给键名，中文厂商名与取密钥的链接属于界面知识。
 * 没登记的键名不吞掉：后端加了新厂商，这里也要能填，只是没有中文名和链接。
 */
const SECRET_META: Record<string, { vendor: string; label: string; link?: string }> = {
  WORK_FISHER_API_KEY: { vendor: 'Work-Fisher', label: 'API Key' },
  RUNNINGHUB_API_KEY: {
    vendor: 'RH CN站',
    label: 'API Key',
    link: 'https://www.runninghub.cn/call-api/bill-task?tab=keys&type=consumer',
  },
  RUNNINGHUB_GLOBAL_API_KEY: {
    vendor: 'RH AI站',
    label: 'API Key',
    link: 'https://www.runninghub.ai/zh-cn/call-api/bill-task?tab=keys&type=consumer',
  },
  JIMENG_ACCESS_KEY: {
    vendor: '即梦 (Jimeng)',
    label: 'Access Key',
    link: 'https://console.volcengine.com/iam/keymanage',
  },
  JIMENG_SECRET_KEY: {
    vendor: '即梦 (Jimeng)',
    label: 'Secret Key',
    link: 'https://console.volcengine.com/iam/keymanage',
  },
  ARK_API_KEY: {
    vendor: '豆包',
    label: 'API Key',
    link: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
  },
  KLING_ACCESS_KEY: {
    vendor: '可灵 (Kling)',
    label: 'Access Key',
    link: 'https://klingai.com/dev/api-key',
  },
  KLING_SECRET_KEY: {
    vendor: '可灵 (Kling)',
    label: 'Secret Key',
    link: 'https://klingai.com/dev/api-key',
  },
  OPENAI_API_KEY: {
    vendor: 'OpenAI',
    label: 'OpenAI API Key',
    link: 'https://platform.openai.com/api-keys',
  },
  ECLOUD_API_KEY: {
    vendor: '移动云 MoMA',
    label: 'MoMA API Key',
    link: 'https://ecloud.10086.cn/op-help-center/doc/article/95476',
  },
  DEEPSEEK_API_KEY: {
    vendor: 'DeepSeek',
    label: 'DeepSeek API Key',
    link: 'https://platform.deepseek.com/api_keys',
  },
  ZHIPU_API_KEY: {
    vendor: '智谱 GLM',
    label: 'API Key',
    link: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
  MOONSHOT_API_KEY: {
    vendor: 'Kimi',
    label: 'API Key',
    link: 'https://platform.kimi.com/',
  },
  ALIYUN_API_KEY: {
    vendor: '阿里云 (Aliyun)',
    label: 'Aliyun API Key',
    link: 'https://dashscope.console.aliyun.com/apiKey',
  },
  MUREKA_API_KEY: {
    vendor: 'Mureka',
    label: 'Mureka API Key',
    link: 'https://platform.mureka.cn/',
  },
};

function secretMeta(key: string) {
  return SECRET_META[key] ?? { vendor: key, label: key };
}

/** 同一家厂商的多个密钥（Access Key + Secret Key）必须画在一起，否则填漏一个而不自知。 */
function groupByVendor(secrets: SourceSecret[]) {
  const groups = new Map<string, { vendor: string; link?: string; secrets: SourceSecret[] }>();
  for (const secret of secrets) {
    const meta = secretMeta(secret.key);
    const group = groups.get(meta.vendor) ?? { vendor: meta.vendor, link: meta.link, secrets: [] };
    group.secrets.push(secret);
    groups.set(meta.vendor, group);
  }
  const vendorOrder = new Map<string, number>(
    DIRECT_VENDOR_ORDER.map((vendor, index) => [vendor, index]),
  );
  return [...groups.values()].sort((left, right) => {
    const leftOrder = vendorOrder.get(left.vendor) ?? DIRECT_VENDOR_ORDER.length;
    const rightOrder = vendorOrder.get(right.vendor) ?? DIRECT_VENDOR_ORDER.length;
    return leftOrder - rightOrder;
  });
}

function secretField(secret: SourceSecret, onDirty: (key: string, value: string) => void) {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-6';
  row.setAttribute('data-nako-secret-field', secret.key);

  row.append(
    textElement(
      'div',
      secretMeta(secret.key).label,
      'w-48 shrink-0 text-base font-medium text-[var(--nk-text-secondary)] whitespace-nowrap',
    ),
  );

  const input = document.createElement('input');
  input.type = 'password';
  input.value = '';
  // 已配置的密钥不回填值——后端只给布尔量，回填只能是伪造的掩码，
  // 用户一旦选中修改就会把掩码本身当成密钥存回去。
  input.placeholder = secret.configured ? '•••••••••••••••• · 已保存' : '未配置';
  input.className = 'nako-key-input w-full rounded-lg px-6 py-4 pr-16 text-base';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', secretMeta(secret.key).label);
  input.addEventListener('input', () => {
    input.dataset.nakoDirty = 'true';
    onDirty(secret.key, input.value);
  });

  // 密钥不回填，用户只能盲打几十个字符——不给查看开关就只能靠保存后报错才发现打错。
  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.textContent = '显示';
  reveal.setAttribute('data-nako-secret-reveal', secret.key);
  reveal.className =
    'absolute right-4 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-[var(--nk-info)] hover:bg-[var(--nk-info-bg)] hover:text-[var(--nk-info)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--nk-focus)]';
  reveal.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    reveal.textContent = hidden ? '隐藏' : '显示';
  });

  const field = document.createElement('div');
  field.className = 'flex-1 relative';
  field.append(input, reveal);
  row.append(field);
  return row;
}

function modelChip(model: SourceModel) {
  const chip = textElement(
    'span',
    model.name,
    `px-3 py-1 rounded-md border text-xs ${
      model.configured
        ? 'border-[var(--nk-border-control)] text-[var(--nk-text)]'
        : 'border-[var(--nk-border)] text-[var(--nk-text-muted)]'
    }`,
  );
  chip.setAttribute('data-nako-source-model', model.name);
  chip.setAttribute('data-nako-configured', String(model.configured));
  return chip;
}

function mediaSection(media: SourceMedia) {
  const section = document.createElement('div');
  section.setAttribute('data-nako-source-media', media.kind);
  const heading = document.createElement('div');
  heading.className = 'flex items-center gap-2 mb-2';
  heading.append(
    textElement(
      'span',
      MEDIA_LABELS[media.kind] ?? media.kind,
      'text-sm font-bold text-[var(--nk-text-secondary)]',
    ),
    textElement('span', `${media.models.length} 个模型`, 'text-xs text-[var(--nk-text-muted)]'),
  );
  const chips = document.createElement('div');
  chips.className = 'flex flex-wrap gap-2';
  for (const model of media.models) chips.append(modelChip(model));
  section.append(heading, chips);
  return section;
}

function modelCatalogDisclosure(
  media: readonly SourceMedia[],
  saveConfiguration: (values: Record<string, string>) => Promise<void>,
) {
  const wrapper = document.createElement('section');
  wrapper.className =
    'rounded-lg border border-[var(--nk-border)] bg-[var(--nk-input)] overflow-hidden';
  const modelCount = media.reduce((total, section) => total + section.models.length, 0);
  const summary = document.createElement('span');
  summary.className = 'flex min-w-0 items-center gap-3 text-left';
  summary.append(
    textElement('span', '可用模型', 'text-sm font-bold text-[var(--nk-text)]'),
    textElement('span', `${modelCount} 个`, 'text-xs text-[var(--nk-text-muted)]'),
  );
  const body = document.createElement('div');
  body.className = 'space-y-4 border-t border-[var(--nk-border)] px-5 py-4';
  body.setAttribute('data-nako-models-body', 'true');
  for (const section of media) {
    body.append(mediaSection(section));
    const editable = section.models.filter((model) => model.modelIdOverride !== false);
    if (editable.length) body.append(adaptedModelSelector(editable, saveConfiguration));
  }
  const toggle = disclosureButton(
    summary,
    body,
    'data-nako-models-toggle',
    'flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--nk-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400',
  );
  wrapper.append(toggle, body);
  return wrapper;
}

function directVendorDisclosure(
  block: SourceBlock,
  group: { vendor: string; link?: string; secrets: SourceSecret[] },
  onDirty: (key: string, value: string) => void,
  saveConfiguration: (values: Record<string, string>, keys: string[]) => Promise<void>,
) {
  const vendor = document.createElement('section');
  vendor.className =
    'rounded-lg border border-[var(--nk-border)] bg-[var(--nk-surface-raised)] overflow-hidden';
  vendor.setAttribute('data-nako-source-vendor', group.vendor);
  const configuredCount = group.secrets.filter((secret) => secret.configured).length;

  const title = document.createElement('span');
  title.className = 'flex min-w-0 items-center gap-3 text-left';
  title.append(textElement('span', group.vendor, 'text-lg font-bold text-[var(--nk-text)]'));
  const configurationBadge =
    configuredCount === group.secrets.length
      ? badge('已配置', 'on')
      : badge(
          configuredCount ? `已配置 ${configuredCount}/${group.secrets.length}` : '未配置',
          'off',
        );
  configurationBadge.dataset.nakoVendorStatus = 'true';
  title.append(configurationBadge);

  const body = document.createElement('div');
  body.className = 'space-y-4 border-t border-[var(--nk-border)] px-5 py-5';
  body.setAttribute('data-nako-vendor-body', 'true');
  if (group.link) body.append(vendorLink(group.link));
  for (const secret of group.secrets) body.append(secretField(secret, onDirty));
  body.append(
    adaptedModelSelector(
      adaptedModelsForVendor(
        block,
        group.secrets.map((secret) => secret.key),
      ),
      (values) =>
        saveConfiguration(
          values,
          group.secrets.map((secret) => secret.key),
        ),
    ),
  );

  const toggle = disclosureButton(
    title,
    body,
    'data-nako-vendor-toggle',
    'flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--nk-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400',
  );
  vendor.append(toggle, body);
  return vendor;
}

function adaptedModelsForVendor(block: SourceBlock, secretKeys: readonly string[]) {
  const keySet = new Set(secretKeys);
  const models = block.media
    .flatMap((media) => media.models)
    .filter(
      (model) =>
        model.requiredSecrets.length > 0 &&
        model.requiredSecrets.every((secret) => keySet.has(secret)),
    );
  return [...new Map(models.map((model) => [model.name, model])).values()];
}

function adaptedModelSelector(
  availableModels: readonly SourceModel[],
  saveConfiguration: (values: Record<string, string>) => Promise<void>,
) {
  const models = [...availableModels].sort(
    (a, b) => Number(b.vision === 'supported') - Number(a.vision === 'supported'),
  );
  const wrapper = document.createElement('div');
  wrapper.className = 'grid gap-3';
  wrapper.setAttribute('data-nako-adapted-models', 'true');
  wrapper.append(
    textElement(
      'span',
      `已适配模型（${models.length}）`,
      'text-sm text-[var(--nk-text-secondary)]',
    ),
  );
  const select = document.createElement('select');
  select.setAttribute('aria-label', '已适配模型');
  select.className =
    'w-full rounded-lg border border-[var(--nk-border)] bg-[var(--nk-input)] px-4 py-3 text-sm text-[var(--nk-text)] outline-none focus:border-[var(--nk-info)]';
  if (!models.length) {
    select.disabled = true;
    select.append(new Option('暂无已适配模型', ''));
  } else {
    for (const model of models) {
      const capability =
        model.vision === 'supported'
          ? '有视觉 · 推荐用于画布'
          : model.vision === 'unsupported'
            ? '无视觉 · 仅文字'
            : model.vision === 'unknown'
              ? '视觉未确认'
              : '';
      const option = new Option(`${model.name}${capability ? ` · ${capability}` : ''}`, model.name);
      option.setAttribute('data-nako-source-model', model.name);
      option.setAttribute('data-nako-configured', String(model.configured));
      select.append(option);
    }
  }
  wrapper.append(select);
  const capabilityNote = textElement('p', '', 'text-xs leading-relaxed text-neutral-400');
  capabilityNote.setAttribute('data-nako-model-capability', 'true');
  wrapper.append(capabilityNote);
  const editor = document.createElement('div');
  editor.className = 'flex flex-wrap items-center gap-2';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 200;
  input.setAttribute('aria-label', '自定义模型 ID');
  input.className =
    'min-w-0 flex-1 rounded-lg border border-[var(--nk-border)] bg-[var(--nk-input)] px-3 py-2 text-sm text-[var(--nk-text)]';
  const save = document.createElement('button');
  save.type = 'button';
  save.textContent = '保存密钥和模型';
  save.className = 'nako-button is-primary';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = '恢复默认';
  reset.className = 'nako-button';
  const status = textElement('p', '', 'text-xs text-[var(--nk-text-secondary)]');
  status.setAttribute('role', 'status');
  const refreshModel = () => {
    const model = models.find((item) => item.name === select.value);
    capabilityNote.textContent =
      model?.vision === 'unsupported'
        ? '此模型无视觉，只能依据文字和节点信息判断，无法直接分析画布图片。需要看图时，推荐选择标有“有视觉”的模型。'
        : model?.vision === 'unknown'
          ? '当前模型视觉能力未确认；自定义模型 ID 的能力以实际服务商为准。'
          : '';
    capabilityNote.hidden = !capabilityNote.textContent;
    input.value = model?.customModelId || '';
    input.placeholder = model?.modelIds?.length
      ? `默认：${[...new Set(model.modelIds)].join(' / ')}`
      : '填写服务商提供的模型 ID';
    status.textContent = '留空使用默认。自定义模型沿用所选接口格式与能力，费用以服务商账单为准。';
  };
  select.addEventListener('change', refreshModel);
  const persist = async (value: string) => {
    if (value && !/^[a-zA-Z0-9][a-zA-Z0-9_./:@+-]{0,199}$/.test(value)) {
      status.textContent = '请输入有效模型 ID，不能包含空格或换行。';
      return;
    }
    if (isLikelyProviderApiKey(value)) {
      status.textContent = '这里填写模型 ID，不是 API Key；请在上方密钥输入框填写 API Key。';
      return;
    }
    save.disabled = reset.disabled = select.disabled = input.disabled = true;
    const model = models.find((item) => item.name === select.value);
    try {
      await saveConfiguration({ [modelOverrideKey(select.value)]: value });
      if (model) model.customModelId = value;
      input.value = value;
      status.textContent = '密钥和模型已保存，可以回到画布或 Agent 选择。';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : '保存失败，请重试。';
    } finally {
      save.disabled = reset.disabled = select.disabled = input.disabled = false;
    }
  };
  save.addEventListener('click', () => {
    void persist(input.value.trim());
  });
  reset.addEventListener('click', () => {
    void persist('');
  });
  refreshModel();
  if (!models.length) save.disabled = reset.disabled = input.disabled = true;
  editor.append(input, save, reset);
  wrapper.append(editor, status);
  return wrapper;
}

function renderBlock(
  block: SourceBlock,
  client: SourceSettingsClient,
  reload: () => void,
  parentScope: SettingsScope,
) {
  const card = document.createElement('div');
  card.className =
    'rounded-lg border border-[var(--nk-border)] bg-[var(--nk-surface-raised)] overflow-hidden';
  card.setAttribute('data-nako-source-block', block.source);
  const scope = createSettingsScope(card, parentScope.signal);
  client = scopeSourceSettingsClient(client, scope.signal);

  const vendors = groupByVendor(block.secrets);
  const configuredCount = block.secrets.filter((secret) => secret.configured).length;
  const heading = document.createElement('div');
  heading.className = 'flex items-center gap-3';
  heading.append(textElement('h3', block.label, 'text-[var(--nk-text)] text-xl font-bold'));
  const configurationBadge =
    configuredCount === block.secrets.length
      ? badge('已配置', 'on')
      : badge(
          configuredCount ? `已配置 ${configuredCount}/${block.secrets.length}` : '未配置',
          'off',
        );
  configurationBadge.setAttribute('data-nako-source-status', 'true');
  heading.append(configurationBadge);
  if (block.accountManaged && block.singleKey && vendors[0]?.link) {
    heading.append(vendorLink(vendors[0].link));
  }

  const header = document.createElement('div');
  header.className = 'min-w-0 space-y-1 text-left';
  header.append(heading);
  const note = blockNote(block);
  if (note) {
    header.append(textElement('p', note, 'text-sm text-[var(--nk-text-muted)] font-medium'));
  }
  const dirty = new Map<string, string>();
  const onDirty = (key: string, value: string) => {
    dirty.set(key, value);
  };
  let saving = false;
  const saveConfiguration = async (values: Record<string, string>, keys?: string[]) => {
    if (saving) throw new PluginError(ERRORS.busy, '配置正在保存，请稍候。', {
      context: { moduleId: 'generation-core', operation: 'saveConfiguration', source: block.source },
    });
    const snapshot = new Map([...dirty].filter(([key]) => !keys || keys.includes(key)));
    saving = true;
    try {
      await client.saveKeys({ ...Object.fromEntries(snapshot), ...values });
      if (!scope.active()) return;
      for (const [key, value] of snapshot) {
        if (dirty.get(key) !== value) continue;
        dirty.delete(key);
        const row = [...card.querySelectorAll<HTMLElement>('[data-nako-secret-field]')].find(
          (field) => field.dataset.nakoSecretField === key,
        );
        const field = row?.querySelector('input');
        if (field) {
          field.value = '';
          field.removeAttribute('data-nako-dirty');
        }
      }
      window.dispatchEvent(new CustomEvent('nako:model-sources-changed'));
      reload();
    } finally {
      saving = false;
    }
  };

  const keys = document.createElement('div');
  keys.className = 'space-y-3';
  if (block.source === 'official') {
    keys.append(dreaminaCliVendor(client, scope));
    keys.append(libTvCliVendor(client, scope));
    for (const group of vendors)
      keys.append(directVendorDisclosure(block, group, onDirty, saveConfiguration));
  } else {
    for (const group of vendors) {
      const vendor = document.createElement('div');
      vendor.className = 'space-y-3';
      vendor.setAttribute('data-nako-source-vendor', group.vendor);
      // 单密钥的站不再重复一遍站名——标题已经写着「模型服务」了。
      if (!block.singleKey) {
        const vendorRow = document.createElement('div');
        vendorRow.className = 'flex items-center gap-3';
        vendorRow.append(
          textElement('h4', group.vendor, 'text-base font-bold text-[var(--nk-text)]'),
        );
        if (group.link) vendorRow.append(vendorLink(group.link));
        vendor.append(vendorRow);
      }
      for (const secret of group.secrets) vendor.append(secretField(secret, onDirty));
      keys.append(vendor);
    }
  }

  const body = document.createElement('div');
  body.className = 'space-y-6 border-t border-[var(--nk-border)] px-6 py-6';
  body.setAttribute('data-nako-source-body', 'true');
  body.append(keys);

  // 密钥配置和模型目录是两件事。打开站点只显示连接配置，
  // 大量模型标签仍需再显式展开，避免设置页成为模型选择器。
  if (block.source !== 'official')
    body.append(modelCatalogDisclosure(block.media, saveConfiguration));

  if (!block.accountManaged) {
    const footer = document.createElement('div');
    footer.className = 'flex items-center gap-4';
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = '保存密钥';
    save.setAttribute('data-nako-source-save', block.source);
    save.className = 'nako-button is-primary';
    const message = textElement('span', '', 'text-sm text-[var(--nk-text-secondary)]');
    message.setAttribute('role', 'status');
    save.addEventListener('click', () => {
      if (save.disabled || !scope.active()) return;
      if (!dirty.size) {
        message.textContent = '没有修改过的密钥。';
        return;
      }
      save.setAttribute('disabled', 'true');
      message.textContent = '保存中…';
      void saveConfiguration({})
        .then(() => {
          if (!scope.active()) return;
          message.textContent = dirty.size
            ? '已保存提交内容，仍有新修改尚未保存。'
            : '连接配置已保存，可以回到画布选择模型。';
        })
        .catch((error: unknown) => {
          if (!scope.active()) return;
          message.textContent = error instanceof Error ? error.message : '保存失败。';
        })
        .finally(() => {
          if (scope.active()) save.disabled = false;
        });
    });
    footer.append(save);
    if (block.singleKey && vendors[0]?.link) footer.append(vendorLink(vendors[0].link));
    footer.append(message);
    body.append(footer);
  }


  const sourceToggle = disclosureButton(
    header,
    body,
    'data-nako-source-toggle',
    'flex w-full items-center justify-between gap-5 px-6 py-5 text-left hover:bg-[var(--nk-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400',
  );
  card.append(sourceToggle, body);
  return card;
}

/** Updates server metadata without rebuilding inputs or discarding another card's draft. */
function updateBlockMetadata(card: HTMLElement, block: SourceBlock) {
  const header = card.querySelector('[data-nako-source-toggle]');
  const status = header?.querySelector('[data-nako-source-status]');
  const count = block.secrets.filter((secret) => secret.configured).length;
  if (status) {
    status.textContent =
      count === block.secrets.length
        ? '已配置'
        : count
          ? `已配置 ${count}/${block.secrets.length}`
          : '未配置';
    status.className = badge('', count === block.secrets.length ? 'on' : 'off').className;
  }
  for (const group of groupByVendor(block.secrets)) {
    const vendor = [...card.querySelectorAll<HTMLElement>('[data-nako-source-vendor]')].find(
      (element) => element.dataset.nakoSourceVendor === group.vendor,
    );
    const vendorStatus = vendor?.querySelector('[data-nako-vendor-status]');
    const configured = group.secrets.filter((secret) => secret.configured).length;
    if (vendorStatus) {
      vendorStatus.textContent =
        configured === group.secrets.length
          ? '已配置'
          : configured
            ? `已配置 ${configured}/${group.secrets.length}`
            : '未配置';
      vendorStatus.className = badge(
        '',
        configured === group.secrets.length ? 'on' : 'off',
      ).className;
    }
  }
  for (const row of card.querySelectorAll<HTMLElement>('[data-nako-secret-field]')) {
    const secret = block.secrets.find((item) => item.key === row.dataset.nakoSecretField);
    const input = row.querySelector('input');
    if (input && secret)
      input.placeholder = secret.configured ? '•••••••••••••••• · 已保存' : '未配置';
  }
  const models = new Map(
    block.media.flatMap((media) => media.models.map((model) => [model.name, model] as const)),
  );
  for (const element of card.querySelectorAll<HTMLElement>('[data-nako-source-model]')) {
    const model = models.get(element.dataset.nakoSourceModel || '');
    if (!model) continue;
    element.dataset.nakoConfigured = String(model.configured);
    if (element.tagName === 'SPAN') element.className = modelChip(model).className;
  }
}

export function mountSourceSettings(host: HTMLElement, client: SourceSettingsClient): () => void {
  const panel = document.createElement('section');
  panel.setAttribute(PANEL_ATTRIBUTE, 'true');
  panel.className = 'space-y-8';
  const notice = textElement('div', '正在读取生成来源…', 'text-sm text-[var(--nk-text-secondary)]'),
    retry = document.createElement('button'),
    cards = document.createElement('div');
  cards.className = 'space-y-8';
  notice.setAttribute('role', 'status');
  retry.type = 'button';
  retry.textContent = '重新读取生成来源';
  retry.className = 'nako-button';
  retry.hidden = true;
  const defaults = mountDefaultModelsSettings(panel);
  panel.append(notice, retry, cards);
  host.prepend(panel);
  const scope = createSettingsScope(panel);
  let read: AbortController | undefined,
    epoch = 0;
  scope.onDispose(() => read?.abort());
  const load = () => {
    if (!scope.active()) return;
    read?.abort();
    read = new AbortController();
    const owner = ++epoch;
    defaults.refresh();
    retry.hidden = true;
    void client
      .getBlocks({ signal: read.signal })
      .then((blocks) => {
        if (!scope.active() || owner !== epoch) return;
        const sorted = visibleSourceBlocks(blocks);
        for (const { block } of sorted) {
          const existing = [...cards.children].find(
            (child) =>
              child instanceof HTMLElement && child.dataset.nakoSourceBlock === block.source,
          ) as HTMLElement | undefined;
          if (existing) updateBlockMetadata(existing, block);
          else cards.append(renderBlock(block, client, load, scope));
        }
        notice.hidden = true;
        retry.hidden = true;
      })
      .catch((error) => {
        if (!scope.active() || owner !== epoch) return;
        notice.hidden = false;
        notice.setAttribute('role', 'alert');
        notice.textContent = error instanceof Error ? error.message : '读取生成来源失败。';
        retry.hidden = false;
      });
  };
  retry.addEventListener('click', load);
  load();
  return () => {
    defaults.dispose();
    scope.dispose();
    panel.remove();
  };
}
