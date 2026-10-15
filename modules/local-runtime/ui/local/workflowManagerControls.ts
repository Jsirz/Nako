import { createStableElement as element } from '../../../kernel/ui/dom';
export function button(label: string, variant: 'primary' | 'quiet' | 'ghost' = 'quiet') {
  const control = element('button', `fwm-button is-${variant}`, label);
  control.type = 'button';
  return control;
}

export function field(label: string | HTMLElement, control: HTMLElement, source = '') {
  const compound = control.getAttribute('data-nako-compound-control') === 'true';
  const wrapper = element(compound ? 'div' : 'label', 'fwm-field');
  if (compound) {
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute(
      'aria-label',
      typeof label === 'string'
        ? label
        : label.getAttribute('aria-label') || label.textContent || '参数',
    );
  }
  const copy = element('span', 'fwm-field-copy');
  if (typeof label === 'string') {
    copy.append(element('span', 'fwm-field-label', label));
  } else {
    label.classList.add('fwm-field-label');
    copy.append(label);
  }
  if (source) copy.append(element('span', 'fwm-field-source', source));
  wrapper.append(copy, control);
  return wrapper;
}

export function messageFor(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请检查配置后重试。';
}

export function assetControlPresentation(mediaKind: string) {
  if (mediaKind === 'audio') {
    return {
      label: '音频',
      accept: '.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm,audio/*',
    };
  }
  if (mediaKind === 'video') {
    return {
      label: '视频',
      accept: '.mp4,.mov,.webm,.m4v,.mkv,video/*',
    };
  }
  return {
    label: mediaKind === 'mask' ? '遮罩' : '图片',
    accept: '.png,.jpg,.jpeg,.webp,.gif,.bmp,image/*',
  };
}
