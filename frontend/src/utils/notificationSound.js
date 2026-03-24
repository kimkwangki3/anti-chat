let audioContext = null;
let unlockInstalled = false;

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

const resumeAudioContext = async () => {
    const ctx = getAudioContext();
    if (!ctx) {
        return null;
    }

    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
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
    const unlock = async () => {
        await resumeAudioContext();
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
};

const scheduleTone = (ctx, { start, duration, frequency, type, gainValue }) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
};

export const playNotificationTone = async (soundType = 'peach', volume = 0.5) => {
    const ctx = await resumeAudioContext();
    if (!ctx) {
        return false;
    }

    const baseGain = Math.max(0.02, Math.min(0.2, Number(volume || 0.5) * 0.25));
    const now = ctx.currentTime + 0.01;

    const patterns = {
        peach: [
            { start: now, duration: 0.09, frequency: 740, type: 'sine', gainValue: baseGain },
            { start: now + 0.12, duration: 0.12, frequency: 988, type: 'sine', gainValue: baseGain * 0.9 }
        ],
        crystal: [
            { start: now, duration: 0.07, frequency: 1047, type: 'triangle', gainValue: baseGain * 0.8 },
            { start: now + 0.09, duration: 0.09, frequency: 1319, type: 'triangle', gainValue: baseGain * 0.75 },
            { start: now + 0.2, duration: 0.12, frequency: 1568, type: 'triangle', gainValue: baseGain * 0.65 }
        ],
        knock: [
            { start: now, duration: 0.05, frequency: 220, type: 'square', gainValue: baseGain * 0.9 },
            { start: now + 0.08, duration: 0.05, frequency: 180, type: 'square', gainValue: baseGain * 0.75 }
        ]
    };

    const pattern = patterns[soundType] || patterns.peach;
    pattern.forEach((tone) => scheduleTone(ctx, tone));
    return true;
};
