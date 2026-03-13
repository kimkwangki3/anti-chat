const scoreKoreanReadability = (text) => {
    if (!text || typeof text !== 'string') return -9999;
    const hangulCount = (text.match(/[가-힣]/g) || []).length;
    const replacementCount = (text.match(/�/g) || []).length;
    const mojibakeLatinCount = (text.match(/[ÃÂÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßà-ÿ]/g) || []).length;
    return (hangulCount * 3) - (replacementCount * 4) - (mojibakeLatinCount * 2);
};

const normalizeUploadedFileName = (rawName) => {
    if (!rawName || typeof rawName !== 'string') return 'file';

    const original = rawName.trim();
    if (!original) return 'file';

    let decodedLatin1 = original;
    try {
        decodedLatin1 = Buffer.from(original, 'latin1').toString('utf8');
    } catch (_) {
        decodedLatin1 = original;
    }

    const best = scoreKoreanReadability(decodedLatin1) > scoreKoreanReadability(original)
        ? decodedLatin1
        : original;

    return best.normalize('NFC');
};

module.exports = {
    normalizeUploadedFileName
};
