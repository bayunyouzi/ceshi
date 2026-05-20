export const isQuotaExhaustedError = (status: number, errorText: string) => {
  if (!errorText) return false;
  if (![400, 401, 403, 429].includes(status)) return false;

  const raw = String(errorText);
  let msg = raw;
  try {
    const parsed = JSON.parse(raw);
    const extracted =
      parsed?.error?.message ??
      parsed?.message ??
      parsed?.error ??
      parsed?.msg ??
      null;
    if (typeof extracted === 'string' && extracted.trim()) msg = extracted;
  } catch (_e) {}

  const hay = msg.toLowerCase();
  if (msg.includes('免费体验访问令牌') && msg.includes('最大使用额度')) return true;
  if (msg.includes('配额') && (msg.includes('用尽') || msg.includes('不足') || msg.includes('达到'))) return true;
  if (hay.includes('insufficient_quota')) return true;
  if (hay.includes('exceed') && hay.includes('quota')) return true;
  if (hay.includes('rate') && hay.includes('limit')) return true;
  if (hay.includes('quota') && (hay.includes('exceed') || hay.includes('exhaust') || hay.includes('insufficient'))) return true;

  return false;
};
