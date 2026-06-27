let audioContext = null;
let unlockInstalled = false;
let audioUnlocked = false;

const getAudioContext = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
        return null;
    }

    if (!audioContext) {
        audioContext = new AudioCtx();
    }

    return audioContext;
};

const getAudioCtor = () => window.AudioContext || window.webkitAudioContext || null;

const resumeAudioContext = async () => {
    const ctx = getAudioContext();
    if (!ctx) {
        return null;
    }

    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
            if (ctx.state === 'running') {
                audioUnlocked = true;
            }
        } catch (_) {
            return ctx;
        }
    }

    return ctx;
};

export const installAudioUnlock = () => {
    if (unlockInstalled || typeof window === 'undefined') {
        return;
    }

    unlockInstalled = true;
    const unlock = () => {
        const ctx = getAudioContext();
        if (!ctx) {
            return;
        }

        if (ctx.state === 'running') {
            audioUnlocked = true;
            return;
        }

        ctx.resume()
            .then(() => {
                if (ctx.state === 'running') {
                    audioUnlocked = true;
                }
            })
            .catch(() => {});
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });

    // 탭이 다시 포그라운드로 올 때 suspended 된 AudioContext 재개
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && audioContext) {
            audioContext.resume()
                .then(() => {
                    if (audioContext.state === 'running') {
                        audioUnlocked = true;
                    }
                })
                .catch(() => {});
        }
    });
};

const scheduleTone = (ctx, destination, { start, duration, frequency, type, gainValue }) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
};

const getPattern = (soundType, baseGain, now) => {
    const patterns = {
        peach: [
            { start: now, duration: 0.14, frequency: 784, type: 'triangle', gainValue: baseGain },
            { start: now + 0.13, duration: 0.22, frequency: 1047, type: 'triangle', gainValue: baseGain },
            // 저음 보강(body) — 더 묵직하고 강하게 들리도록
            { start: now + 0.13, duration: 0.22, frequency: 523, type: 'sine', gainValue: baseGain * 0.55 }
        ],
        crystal: [
            { start: now, duration: 0.10, frequency: 1047, type: 'triangle', gainValue: baseGain },
            { start: now + 0.10, duration: 0.12, frequency: 1319, type: 'triangle', gainValue: baseGain },
            { start: now + 0.22, duration: 0.20, frequency: 1568, type: 'triangle', gainValue: baseGain * 0.9 }
        ],
        knock: [
            { start: now, duration: 0.07, frequency: 220, type: 'square', gainValue: baseGain },
            { start: now + 0.10, duration: 0.07, frequency: 165, type: 'square', gainValue: baseGain * 0.9 },
            { start: now + 0.20, duration: 0.10, frequency: 110, type: 'square', gainValue: baseGain * 0.85 }
        ]
    };

    return patterns[soundType] || patterns.peach;
};

const playOnContext = (ctx, soundType, volume) => {
    // 강하게: 배수·상한을 크게 올림 (기존 0.25/0.2 → 0.85/0.85)
    const baseGain = Math.max(0.08, Math.min(0.85, Number(volume || 0.5) * 0.85));
    const now = ctx.currentTime + 0.01;

    // 마스터 리미터: 크게 키워도 소리가 찢어지지(클리핑) 않게 압축
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, now);
    compressor.knee.setValueAtTime(6, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0.002, now);
    compressor.release.setValueAtTime(0.18, now);
    compressor.connect(ctx.destination);

    const pattern = getPattern(soundType, baseGain, now);
    pattern.forEach((tone) => scheduleTone(ctx, compressor, tone));
    return true;
};

const playWithFreshContext = (soundType, volume) => {
    const AudioCtx = getAudioCtor();
    if (!AudioCtx) {
        return false;
    }

    const freshContext = new AudioCtx();
    playOnContext(freshContext, soundType, volume);
    audioUnlocked = true;

    window.setTimeout(() => {
        freshContext.close().catch(() => {});
    }, 1000);

    return true;
};

export const playNotificationTone = async (soundType = 'peach', volume = 0.5, options = {}) => {
    const { forceFreshContext = false } = options;

    if (forceFreshContext) {
        return playWithFreshContext(soundType, volume);
    }

    if (!audioUnlocked) {
        return false;
    }

    const ctx = await resumeAudioContext();
    if (!ctx) {
        return false;
    }

    if (ctx.state !== 'running') {
        return false;
    }

    return playOnContext(ctx, soundType, volume);
};
