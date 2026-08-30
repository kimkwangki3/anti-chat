import { getImageThumb, getFileUrl } from '../utils/fileUtils';

// 본문 내 마크다운 이미지 ![alt](url) 을 인라인 이미지로, 나머지는 텍스트로 렌더링.
const IMG_RE = /!\[[^\]]*\]\(([^)]+)\)/g;

const PostContent = ({ content, className = '' }) => {
    if (!content) return null;

    const parts = [];
    let last = 0;
    let m;
    IMG_RE.lastIndex = 0;
    while ((m = IMG_RE.exec(content)) !== null) {
        if (m.index > last) parts.push({ type: 'text', value: content.slice(last, m.index) });
        parts.push({ type: 'img', value: m[1] });
        last = m.index + m[0].length;
    }
    if (last < content.length) parts.push({ type: 'text', value: content.slice(last) });

    return (
        <div className={className}>
            {parts.map((p, i) =>
                p.type === 'img' ? (
                    <img
                        key={i}
                        src={getImageThumb(p.value, 1000)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onClick={() => window.open(getFileUrl(p.value), '_blank')}
                        className="block my-4 max-w-full h-auto rounded-2xl border border-white/10 cursor-zoom-in"
                    />
                ) : (
                    <span key={i} className="whitespace-pre-wrap">{p.value}</span>
                )
            )}
        </div>
    );
};

// 카드 미리보기용: 이미지 마크다운 제거하고 텍스트만
export const stripImages = (content = '') => content.replace(IMG_RE, ' ').replace(/\s+/g, ' ').trim();

export default PostContent;
