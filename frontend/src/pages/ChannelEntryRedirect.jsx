import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useChannelStore from '../store/channelStore';

const ChannelEntryRedirect = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { fetchChannelBySlug, setCurrentChannel } = useChannelStore();

    useEffect(() => {
        const resolveChannel = async () => {
            if (!slug) {
                navigate('/');
                return;
            }

            const channel = await fetchChannelBySlug(slug);
            if (!channel) {
                navigate('/');
                return;
            }

            setCurrentChannel(channel);
            navigate(`/notices?channelId=${channel._id}`, { replace: true });
        };

        resolveChannel();
    }, [slug, fetchChannelBySlug, setCurrentChannel, navigate]);

    return (
        <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-[#FF8C69] border-t-transparent rounded-full animate-spin" />
        </div>
    );
};

export default ChannelEntryRedirect;
