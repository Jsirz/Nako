export interface ImageClipboardRuntime {
  fetch(url: string): Promise<Response>;
  createItem(items: Record<string, Blob>): ClipboardItem;
  write(items: ClipboardItem[]): Promise<void>;
}

function defaultRuntime(): ImageClipboardRuntime {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined')
    throw new Error('系统剪贴板不可用。请在桌面应用或受支持的浏览器中使用此功能。');
  return {
    fetch: (url) => fetch(url),
    createItem: (items) => new ClipboardItem(items),
    write: (items) => navigator.clipboard.write(items),
  };
}

async function asPng(blob: Blob): Promise<Blob> {
  if (blob.type.toLowerCase() === 'image/png') return blob;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('无法读取项目图片。'));
      element.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法准备图片剪贴板数据。');
    context.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('无法转换项目图片。'))),
        'image/png',
      ),
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Write a project's rendered image to the operating-system clipboard as PNG. */
export async function copyCanvasImageToSystemClipboard(
  url: string,
  runtime: ImageClipboardRuntime = defaultRuntime(),
): Promise<void> {
  if (!url) throw new Error('该节点没有可复制的图片。');
  const response = await runtime.fetch(url);
  if (!response.ok) throw new Error('无法读取项目图片。');
  const source = await response.blob();
  if (!source.type.toLowerCase().startsWith('image/'))
    throw new Error('该节点结果不是可复制的图片。');
  const image = await asPng(source);
  await runtime.write([runtime.createItem({ 'image/png': image })]);
}
