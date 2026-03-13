export const getFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '')
        || (typeof window !== 'undefined'
            ? `${window.location.protocol}//${window.location.hostname}:5000`
            : 'http://127.0.0.1:5000');

    return `${apiBase}${url}`;
};
