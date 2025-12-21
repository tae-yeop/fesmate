// YouTube IFrame API 타입 정의

export interface YTPlayer {
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    getPlayerState: () => number;
    mute: () => void;
    unMute: () => void;
    isMuted: () => boolean;
    destroy: () => void;
}

export interface YTPlayerConfig {
    height: string;
    width: string;
    videoId: string;
    playerVars?: Record<string, number | string>;
    events?: {
        onReady?: (event: { target: YTPlayer }) => void;
        onStateChange?: (event: { data: number }) => void;
    };
}

declare global {
    interface Window {
        YT: {
            Player: new (elementId: string, config: YTPlayerConfig) => YTPlayer;
            PlayerState: {
                PLAYING: number;
                PAUSED: number;
                ENDED: number;
            };
        };
        onYouTubeIframeAPIReady?: () => void;
    }
}

export {};
