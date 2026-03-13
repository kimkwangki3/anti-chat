export const getFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '')
        || (typeof window !== 'undefined'
            ? `${window.location.protocol}//${window.location.hostname}:5000`
            : 'http://127.0.0.1:5000');

    return `${apiBase}${url}`;
};

const readabilityScore = (text) => {
    if (!text || typeof text !== 'string') return -9999;
    const hangulCount = (text.match(/[가-힣]/g) || []).length;
    const replacementCount = (text.match(/�/g) || []).length;
    const mojibakeLatinCount = (text.match(/[ÃÂÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßà-ÿ]/g) || []).length;
    return (hangulCount * 3) - (replacementCount * 4) - (mojibakeLatinCount * 2);
};

export const normalizeDisplayFileName = (rawName) => {
    if (!rawName || typeof rawName !== 'string') return 'file';
    const original = rawName.trim();
    if (!original) return 'file';

    let decoded = original;
    try {
        const bytes = Uint8Array.from([...original].map((char) => char.charCodeAt(0) & 0xff));
        decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch (_) {
        decoded = original;
    }

    const best = readabilityScore(decoded) > readabilityScore(original) ? decoded : original;
    return best.normalize('NFC');
};
