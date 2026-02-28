/**
 * UserAvatar - 프로필 사진 > Peach 로고 > 이름 첫 글자 순으로 폴백
 * @param {string} profileImage - 사용자 프로필 이미지 URL
 * @param {string} name - 사용자 이름 (폴백용)
 * @param {string} size - Tailwind 클래스 w-/h- (기본: 'w-9 h-9')
 * @param {string} radiusClass - 모서리 클래스 (기본: 'rounded-2xl')
 * @param {string} className - 추가 클래스
 */
const UserAvatar = ({ profileImage, name, size = 'w-9 h-9', radiusClass = 'rounded-2xl', className = '' }) => {
    if (profileImage) {
        return (
            <div className={`${size} ${radiusClass} overflow-hidden flex-shrink-0 ${className}`}>
                <img
                    src={profileImage}
                    alt={name || '프로필'}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('show-fallback'); }}
                />
            </div>
        );
    }

    // 프로필 사진 없으면 Peach 로고
    return (
        <div className={`${size} ${radiusClass} overflow-hidden flex-shrink-0 bg-[#FF8C69]/10 border border-[#FF8C69]/20 flex items-center justify-center ${className}`}>
            <img
                src="/icon-192.png"
                alt="peach"
                className="w-full h-full object-cover opacity-70"
                onError={(e) => {
                    // 로고 로드 실패시 이름 첫 글자로 폴백
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement;
                    fallback.textContent = name?.[0]?.toUpperCase() || '?';
                    fallback.classList.add('text-[#FF8C69]', 'font-black', 'text-sm');
                }}
            />
        </div>
    );
};

export default UserAvatar;
