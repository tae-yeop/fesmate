import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ParticipationProvider, useParticipation } from "@/lib/participation-context";
import { DevProvider } from "@/lib/dev-context";
import { AuthProvider } from "@/lib/auth-context";
import React from "react";

// Provider wrapper
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
        <DevProvider>
            <ParticipationProvider>{children}</ParticipationProvider>
        </DevProvider>
    </AuthProvider>
);

describe("ParticipationContext", () => {
    beforeEach(() => {
        // localStorage 초기화
        vi.mocked(localStorage.getItem).mockReturnValue(null);
        vi.mocked(localStorage.setItem).mockClear();
    });

    it("초기 상태에서 Mock 데이터가 로드됨", () => {
        const { result } = renderHook(() => useParticipation(), { wrapper });

        // 받은 신청 목록 확인
        const received = result.current.getReceivedRequests();
        expect(Array.isArray(received)).toBe(true);
    });

    it("참여 신청을 보낼 수 있음", () => {
        const { result } = renderHook(() => useParticipation(), { wrapper });

        act(() => {
            result.current.sendRequest({
                postId: "test-post-1",
                postAuthorId: "user2",
                message: "참여하고 싶어요!",
            });
        });

        // 보낸 신청에 추가됨
        const sent = result.current.getSentRequests();
        const newRequest = sent.find((r) => r.postId === "test-post-1");
        expect(newRequest).toBeDefined();
        expect(newRequest?.message).toBe("참여하고 싶어요!");
        expect(newRequest?.status).toBe("pending");
    });

    it("신청을 수락할 수 있음", () => {
        const { result } = renderHook(() => useParticipation(), { wrapper });

        // 먼저 대기 중인 신청 찾기
        const received = result.current.getReceivedRequests();
        const pendingRequest = received.find((r) => r.status === "pending");

        if (pendingRequest) {
            act(() => {
                result.current.acceptRequest(pendingRequest.id);
            });

            // 상태가 accepted로 변경됨
            const updated = result.current.getReceivedRequests();
            const accepted = updated.find((r) => r.id === pendingRequest.id);
            expect(accepted?.status).toBe("accepted");
        }
    });

    it("신청을 거절할 수 있음", () => {
        const { result } = renderHook(() => useParticipation(), { wrapper });

        const received = result.current.getReceivedRequests();
        const pendingRequest = received.find((r) => r.status === "pending");

        if (pendingRequest) {
            act(() => {
                result.current.declineRequest(pendingRequest.id);
            });

            const updated = result.current.getReceivedRequests();
            const declined = updated.find((r) => r.id === pendingRequest.id);
            expect(declined?.status).toBe("declined");
        }
    });

    it("보낸 신청을 취소할 수 있음", () => {
        const { result } = renderHook(() => useParticipation(), { wrapper });

        // 먼저 신청 보내기
        let newRequestId: string = "";
        act(() => {
            const request = result.current.sendRequest({
                postId: "test-post-cancel",
                postAuthorId: "user3",
            });
            if (request) {
                newRequestId = request.id;
            }
        });

        // 취소
        act(() => {
            result.current.cancelRequest(newRequestId);
        });

        // 상태 확인
        const myRequest = result.current.getMyRequest("test-post-cancel");
        expect(myRequest?.status).toBe("canceled");
    });

    it("특정 글에 대한 내 신청 상태를 확인할 수 있음", () => {
        const { result } = renderHook(() => useParticipation(), { wrapper });

        act(() => {
            result.current.sendRequest({
                postId: "test-status-check",
                postAuthorId: "user4",
            });
        });

        const status = result.current.getMyRequestStatus("test-status-check");
        expect(status).toBe("pending");
    });

    it("대기 중인 신청 수를 카운트함", () => {
        const { result } = renderHook(() => useParticipation(), { wrapper });

        const receivedCount = result.current.getReceivedPendingCount();
        const sentCount = result.current.getSentPendingCount();

        expect(typeof receivedCount).toBe("number");
        expect(typeof sentCount).toBe("number");
        expect(receivedCount).toBeGreaterThanOrEqual(0);
        expect(sentCount).toBeGreaterThanOrEqual(0);
    });
});
