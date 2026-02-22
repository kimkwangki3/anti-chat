export const getFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    // 로컬 개발 환경 및 Vercel 환경 대응
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${apiBase}${url}`;
};
