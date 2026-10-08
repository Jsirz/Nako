export function hasMeaningfulValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
}

/**
 * RunningHub 的标准模型 API 只认「企业级-共享」那把 Key，个人 Key 一律回 1014。
 * 原文只说「仅限企业级-共享API Key调用」，不说去哪换——补一句去处，
 * 否则用户只能怀疑是自己填错了密钥，反复重填同一把。
 */
const RUNNINGHUB_ERROR_HINTS = Object.freeze({
    1014: '请到 RunningHub 控制台的「密钥」页改用「企业级-共享」API Key，个人 Key 调不了标准模型。',
});

export function formatRunningHubError(result, fallback = 'RunningHub task failed.') {
    if (!result || typeof result !== 'object') return fallback;
    const hint = RUNNINGHUB_ERROR_HINTS[Number(result.errorCode)];
    if (hint) return `${result.errorMessage || result.msg || ''} ${hint}`.trim();
    const candidates = [
        result.errorMessage,
        result.msg,
        result.message,
        result.errorCode,
        result.failedReason
    ];
    const meaningful = candidates.find(hasMeaningfulValue);
    if (!hasMeaningfulValue(meaningful)) return fallback;
    return typeof meaningful === 'string' ? meaningful : JSON.stringify(meaningful);
}

function normalizeRhartResolution(resolution) {
    const value = String(resolution || '1K').trim().toLowerCase();
    if (value === '512') return '1k';
    if (['1k', '2k', '4k'].includes(value)) return value;
    return '1k';
}

function normalizeRhartAspectRatio(aspectRatio) {
    const value = String(aspectRatio || '1:1').trim();
    return value && value !== 'Auto' ? value : '1:1';
}

/**
 * 标准模型的请求体。
 *
 * gpt-image-2 的官方稳定版把 quality 列为**必填**（详情页参数表带 *，Playground 默认 medium），
 * 不带这个字段请求会被直接打回——这跟价格无关，是条链路能不能通的问题。
 * 其它模型没有这个参数，多传会被当成未知字段，所以只对这一族补。
 *
 * 而且钉死在 medium：目录里那份 ¥ 单价就是按 medium 档折算的。
 * 放开让用户选画质而价格不跟着变，high 档会把费用少报 3.7 倍
 * （medium 1K $0.054，high 1K $0.198）。要支持 high 得单独开一条目录条目。
 */
export function buildStandardImageBody(finalUrl, params) {
    const body = {
        prompt: params.prompt || '',
        aspectRatio: normalizeRhartAspectRatio(params.aspectRatio),
        resolution: normalizeRhartResolution(params.resolution)
    };
    // 认接口路径里的 slug，不是 RH 页面上的显示名：显示名叫 gpt-image-2/…/stable，
    // 真实路径是 /rhart-image-g-2-official/…。低价渠道 /rhart-image-g-2/… 没有这个参数，
    // 多传会被当成非法字段，所以必须带 -official 才匹配。
    if (/\/rhart-image-g-2-official\//i.test(String(finalUrl || ''))) {
        // 写死 medium，连传进来的 quality 都不认：目录里的 cost 只按分辨率索引，
        // 表达不了画质这一维。让画质可变而报价不变，等于按 medium 报价、按 high 收钱。
        body.quality = 'medium';
    }
    return body;
}

/**
 * 视频分辨率原样传。
 *
 * 别复用图片那个 normalizeRhartResolution——它把一切不认识的都压成 1k，
 * 视频档位是 480p/540p/720p/1080p/2k/4k，压完就全成 1k 了，
 * 用户选 1080p 却出 480p，而且账单还按 1080p 报。
 */
function normalizeVideoResolution(resolution) {
    const value = String(resolution || '720p').trim().toLowerCase();
    return /^(480p|540p|720p|1080p|2k|4k)$/.test(value) ? value : '720p';
}

/**
 * 从接口路径的末段判断这次是哪种生成，决定要不要上传素材、上传什么。
 * 认路径不认节点的模式名：同一个模式名在不同模型上可能落到不同末段。
 */
export function standardVideoMode(finalUrl) {
    const path = String(finalUrl || '').split('?')[0];
    if (/\/(video-edit|edit-video)$/i.test(path)) return 'video-edit';
    if (/\/multimodal-video$/i.test(path)) return 'multimodal-video';
    if (/\/(reference-to-video|video-to-video)$/i.test(path)) return 'reference-to-video';
    if (/\/(image-to-video|first-last-frame|start-end-to-video|multi-image-to-video)$/i.test(path)) return 'image-to-video';
    return 'text-to-video';
}

/**
 * 标准视频的请求体。
 *
 * 音频开关钉死在开：RH 这几个模型（Seedance 1.5 Pro 的 generateAudio、
 * 可灵 o3 的 sound）**价格随它翻倍**，而目录里的 cost 只按分辨率索引，
 * 表达不了这一维。放开让节点自己传，就成了按带音频报价、按无音频出片——
 * 或者反过来按无音报价、按带音收钱。要便宜的无音档得单开一条目录条目。
 * 这和 gpt-image-2 把 quality 钉死在 medium 是同一个理由。
 */
export function buildStandardVideoBody(finalUrl, params) {
    const mode = standardVideoMode(finalUrl);
    const body = { prompt: params.prompt || '' };
    const aspectRatio = normalizeRhartAspectRatio(params.aspectRatio);
    const resolution = normalizeVideoResolution(params.resolution);
    // duration 在 RH 详情页的参数表里带 *，是必填。之前写成"有才传"，
    // 节点没给就整个字段消失，请求会被打回。缺省按 5 秒——
    // 目录里的 ¥/秒 也是按 5 秒片子折算的，两边对齐。
    const duration = Number(params.duration);
    const normalizedDuration = Number.isFinite(duration) && duration > 0 ? duration : 5;

    // 这三家标准视频 API 看起来都是 RHArt，但字段契约并不通用。
    // 只发详情页明确列出的字段；多传 resolution / aspectRatio 也会被上游当成非法参数。
    if (/\/rhart-video\/sparkvideo-2\.0/i.test(finalUrl)) {
        body.resolution = resolution;
        body.duration = normalizedDuration;
        body.ratio = aspectRatio;
        body.generateAudio = true;
        return { body, mode };
    }

    if (/\/kling-video-o3-/i.test(finalUrl)) {
        if (mode === 'video-edit') {
            body.keepOriginalSound = true;
            return { body, mode };
        }
        body.duration = normalizedDuration;
        if (mode === 'text-to-video' || mode === 'reference-to-video') {
            body.aspectRatio = aspectRatio;
        }
        body.sound = true;
        return { body, mode };
    }

    if (/\/vidu\//i.test(finalUrl)) {
        body.resolution = resolution;
        body.duration = normalizedDuration;
        if (mode === 'text-to-video' || mode === 'reference-to-video') {
            body.aspectRatio = aspectRatio;
        }
        if (/q3-/i.test(finalUrl) || /-q3$/i.test(finalUrl)) body.audio = true;
        return { body, mode };
    }

    body.aspectRatio = aspectRatio;
    body.resolution = resolution;
    body.duration = normalizedDuration;
    if (/\/seedance-v1\.5-pro/i.test(finalUrl)) body.generateAudio = true;
    // 可灵 3.0 和 o3 都带 sound 这一维，价格差约 1.5 倍。目录里的 cost 记的是带音价，
    // 所以这里必须钉死开——放开就成了按带音报价、按无音出片。
    if (/\/kling-(video-o3|v3\.0)/i.test(finalUrl)) body.sound = true;
    return { body, mode };
}
