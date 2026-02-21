import { useState, useEffect } from 'react';

const useDevice = () => {
    const [device, setDevice] = useState({
        isIOS: false,
        isAndroid: false,
        isMobile: false,
        isPC: true,
        userAgent: ''
    });

    useEffect(() => {
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/.test(ua);
        const isMobile = isIOS || isAndroid || /Mobi/.test(ua);

        setDevice({
            isIOS,
            isAndroid,
            isMobile,
            isPC: !isMobile,
            userAgent: ua
        });
    }, []);

    return device;
};

export default useDevice;
