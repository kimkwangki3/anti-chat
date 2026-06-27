export const getFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '')
        || (typeof window !== 'undefined'
            ? `${window.location.protocol}//${window.location.hostname}:5000`
            : 'http://127.0.0.1:5000');

    return `${apiBase}${url}`;
};

// 인라인 이미지용 최적화 URL.
// Cloudinary 이미지는 f_auto(webp/avif 자동) + q_auto(품질 자동) + w_제한 을 주입해
// 느린 인터넷에서 원본 대비 보통 80~95% 가볍게 받습니다. (클릭 시 원본은 getFileUrl 사용)
// Cloudinary가 아닌 URL은 그대로 통과.
export const getImageThumb = (url, width = 900) => {
    const full = getFileUrl(url);
    if (!full || !full.includes('res.cloudinary.com')) return full;
    const marker = '/upload/';
    const uIdx = full.indexOf(marker);
    if (uIdx === -1) return full;
    const after = full.slice(uIdx + marker.length);
    if (after.startsWith('f_auto')) return full; // 이미 최적화됨 (중복 주입 방지)
    return `${full.slice(0, uIdx + marker.length)}f_auto,q_auto,w_${width}/${after}`;
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
