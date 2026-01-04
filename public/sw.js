/// <reference lib="webworker" />

/**
 * FesMate Service Worker
 * - 푸시 알림 처리
 * - 오프라인 캐싱
 */

const CACHE_NAME = "fesmate-v1";
const STATIC_ASSETS = [
    "/",
    "/manifest.json",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",
];

// 설치 이벤트 - 정적 자산 캐싱
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn("Some assets failed to cache:", err);
            });
        })
    );
    self.skipWaiting();
});

// 활성화 이벤트 - 오래된 캐시 정리
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch 이벤트 - 네트워크 우선, 실패 시 캐시
self.addEventListener("fetch", (event) => {
    // API 요청은 캐싱하지 않음
    if (event.request.url.includes("/api/")) {
        return;
    }

    // HTML 요청은 네트워크 우선
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match("/") || new Response("Offline");
            })
        );
        return;
    }

    // 정적 자산은 캐시 우선
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return (
                cached ||
                fetch(event.request).then((response) => {
                    // 성공적인 응답만 캐시
                    if (response.ok && event.request.method === "GET") {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
            );
        })
    );
});

// 푸시 알림 수신
self.addEventListener("push", (event) => {
    if (!event.data) return;

    let payload;
    try {
        payload = event.data.json();
    } catch {
        payload = { title: "FesMate", body: event.data.text() };
    }

    const { title = "FesMate", body = "", icon, badge, data = {} } = payload;

    const options = {
        body,
        icon: icon || "/icons/icon-192x192.png",
        badge: badge || "/icons/icon-72x72.png",
        data,
        vibrate: [100, 50, 100],
        tag: data.tag || "fesmate-notification",
        renotify: true,
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 처리
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const data = event.notification.data || {};
    const deepLink = data.deepLink || "/";

    // 액션 버튼 클릭 처리
    if (event.action) {
        const action = data.actions?.find((a) => a.action === event.action);
        if (action?.url) {
            event.waitUntil(self.clients.openWindow(action.url));
            return;
        }
    }

    // 기본 클릭 - 앱 열기 또는 포커스
    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                // 이미 열린 창 찾기
                for (const client of clientList) {
                    if ("focus" in client) {
                        return client.focus().then(() => {
                            if ("navigate" in client) {
                                return client.navigate(deepLink);
                            }
                        });
                    }
                }
                // 새 창 열기
                return self.clients.openWindow(deepLink);
            })
    );
});

// 푸시 구독 변경 처리
self.addEventListener("pushsubscriptionchange", (event) => {
    console.log("Push subscription changed, re-subscribing...");
    // 재구독 로직은 클라이언트에서 처리
});
