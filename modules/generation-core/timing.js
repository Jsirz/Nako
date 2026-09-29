export function parseTimeToMs(value) {
  if (!value) return 900_000;
  if (typeof value === 'number') return value;
  const amount = Number.parseInt(value, 10);
  if (Number.isNaN(amount)) return 900_000;
  const text = String(value).toLowerCase();
  const milliseconds = text.includes('min') ? amount * 60_000 : text.includes('ms') ? amount : text.includes('s') ? amount * 1_000 : 300_000;
  return milliseconds * 3;
}
export async function withTimeout(promise, estimate = '5min') {
  const milliseconds = parseTimeToMs(estimate);
  const label = typeof estimate === 'number' ? `${Math.ceil(milliseconds / 1000)}秒` : estimate;
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`生成超时（限制为 ${label}），请重试。`)), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
