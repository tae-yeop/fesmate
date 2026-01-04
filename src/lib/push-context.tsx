"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import {
    registerServiceWorker,
    isPushSupported,
    getNotificationPermission,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    getPushSubscription,
    showLocalNotification,
} from "./service-worker";

/** Push Context 상태 */
interface PushContextState {
    /** Service Worker 등록 완료 여부 */
    isServiceWorkerReady: boolean;
    /** 푸시 알림 지원 여부 */
    isPushSupported: boolean;
    /** 알림 권한 상태 */
    permission: NotificationPermission | "unsupported" | "loading";
    /** 푸시 구독 상태 */
    isSubscribed: boolean;
    /** 로딩 중 */
    isLoading: boolean;
}

/** Push Context 액션 */
interface PushContextActions {
    /** 알림 권한 요청 */
    requestPermission: () => Promise<boolean>;
    /** 푸시 알림 구독 */
    subscribe: () => Promise<boolean>;
    /** 푸시 알림 구독 해제 */
    unsubscribe: () => Promise<boolean>;
    /** 로컬 테스트 알림 표시 */
    showNotification: (title: string, options?: NotificationOptions) => Promise<boolean>;
    /** 상태 새로고침 */
    refresh: () => Promise<void>;
}

type PushContextValue = PushContextState & PushContextActions;

const PushContext = createContext<PushContextValue | null>(null);

interface PushProviderProps {
    children: ReactNode;
}

/**
 * Push Notification Context Provider
 * - Service Worker 등록 관리
 * - 푸시 알림 권한 및 구독 관리
 */
export function PushProvider({ children }: PushProviderProps) {
    const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
    const [pushSupported, setPushSupported] = useState(false);
    const [permission, setPermission] = useState<PushContextState["permission"]>("loading");
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 초기화
    useEffect(() => {
        const init = async () => {
            // 푸시 지원 확인
            const supported = isPushSupported();
            setPushSupported(supported);

            if (!supported) {
                setPermission("unsupported");
                setIsLoading(false);
                return;
            }

            // 권한 상태 확인
            setPermission(getNotificationPermission());

            // Service Worker 등록
            const registration = await registerServiceWorker();
            setIsServiceWorkerReady(!!registration);

            // 구독 상태 확인
            if (registration) {
                const subscription = await getPushSubscription();
                setIsSubscribed(!!subscription);
            }

            setIsLoading(false);
        };

        init();
    }, []);

    /**
     * 알림 권한 요청
     */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!pushSupported) return false;

        setIsLoading(true);
        const result = await requestNotificationPermission();
        setPermission(result);
        setIsLoading(false);

        return result === "granted";
    }, [pushSupported]);

    /**
     * 푸시 알림 구독
     */
    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!pushSupported) return false;

        setIsLoading(true);
        const subscription = await subscribeToPush();
        const success = !!subscription;
        setIsSubscribed(success);

        if (success) {
            setPermission("granted");
        }

        setIsLoading(false);
        return success;
    }, [pushSupported]);

    /**
     * 푸시 알림 구독 해제
     */
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        if (!pushSupported) return false;

        setIsLoading(true);
        const success = await unsubscribeFromPush();
        if (success) {
            setIsSubscribed(false);
        }
        setIsLoading(false);
        return success;
    }, [pushSupported]);

    /**
     * 로컬 알림 표시
     */
    const showNotification = useCallback(
        async (title: string, options?: NotificationOptions): Promise<boolean> => {
            return showLocalNotification(title, options);
        },
        []
    );

    /**
     * 상태 새로고침
     */
    const refresh = useCallback(async () => {
        if (!pushSupported) return;

        setIsLoading(true);
        setPermission(getNotificationPermission());
        const subscription = await getPushSubscription();
        setIsSubscribed(!!subscription);
        setIsLoading(false);
    }, [pushSupported]);

    const value: PushContextValue = {
        isServiceWorkerReady,
        isPushSupported: pushSupported,
        permission,
        isSubscribed,
        isLoading,
        requestPermission,
        subscribe,
        unsubscribe,
        showNotification,
        refresh,
    };

    return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
}

/**
 * Push Context Hook
 */
export function usePush(): PushContextValue {
    const context = useContext(PushContext);
    if (!context) {
        throw new Error("usePush must be used within a PushProvider");
    }
    return context;
}
