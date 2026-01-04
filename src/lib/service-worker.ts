/**
 * Service Worker 등록 및 관리 유틸리티
 * - SW 등록/해제
 * - 푸시 알림 구독 관리
 */

// VAPID 공개 키 (실제 운영 시 환경변수로 관리)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/**
 * Service Worker 등록
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        console.log("Service Worker not supported");
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
        });

        console.log("Service Worker registered:", registration.scope);

        // 업데이트 확인
        registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        // 새 버전 사용 가능
                        console.log("New Service Worker available");
                        // 필요시 사용자에게 알림
                    }
                });
            }
        });

        return registration;
    } catch (error) {
        console.error("Service Worker registration failed:", error);
        return null;
    }
}

/**
 * Service Worker 해제
 */
export async function unregisterServiceWorker(): Promise<boolean> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const success = await registration.unregister();
        console.log("Service Worker unregistered:", success);
        return success;
    } catch (error) {
        console.error("Service Worker unregistration failed:", error);
        return false;
    }
}

/**
 * 푸시 알림 지원 여부 확인
 */
export function isPushSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

/**
 * 현재 알림 권한 상태 확인
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
    }
    return Notification.permission;
}

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
    if (!isPushSupported()) {
        return "unsupported";
    }

    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (error) {
        console.error("Notification permission request failed:", error);
        return "denied";
    }
}

/**
 * Base64 URL을 Uint8Array로 변환 (VAPID 키 변환용)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * 푸시 알림 구독
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
    if (!isPushSupported()) {
        console.log("Push notifications not supported");
        return null;
    }

    // 권한 확인
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
        console.log("Notification permission not granted:", permission);
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // 기존 구독 확인
        let subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            console.log("Already subscribed to push");
            return subscription;
        }

        // VAPID 키 없으면 구독 불가
        if (!VAPID_PUBLIC_KEY) {
            console.warn("VAPID public key not configured");
            return null;
        }

        // 새 구독 생성
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        console.log("Push subscription created:", subscription.endpoint);

        // TODO: 서버에 구독 정보 전송
        // await sendSubscriptionToServer(subscription);

        return subscription;
    } catch (error) {
        console.error("Push subscription failed:", error);
        return null;
    }
}

/**
 * 푸시 알림 구독 해제
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    if (!isPushSupported()) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            console.log("No push subscription to unsubscribe");
            return true;
        }

        const success = await subscription.unsubscribe();
        console.log("Push unsubscription:", success);

        // TODO: 서버에서 구독 정보 삭제
        // await removeSubscriptionFromServer(subscription);

        return success;
    } catch (error) {
        console.error("Push unsubscription failed:", error);
        return false;
    }
}

/**
 * 현재 푸시 구독 상태 확인
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        return await registration.pushManager.getSubscription();
    } catch (error) {
        console.error("Failed to get push subscription:", error);
        return null;
    }
}

/**
 * 로컬 테스트용 알림 표시 (SW 없이)
 */
export async function showLocalNotification(
    title: string,
    options?: NotificationOptions
): Promise<boolean> {
    if (!("Notification" in window)) {
        return false;
    }

    if (Notification.permission !== "granted") {
        const permission = await requestNotificationPermission();
        if (permission !== "granted") {
            return false;
        }
    }

    try {
        // Service Worker가 있으면 SW를 통해 표시
        if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, options);
        } else {
            // SW 없으면 직접 표시
            new Notification(title, options);
        }
        return true;
    } catch (error) {
        console.error("Failed to show notification:", error);
        return false;
    }
}
