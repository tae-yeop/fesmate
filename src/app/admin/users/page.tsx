"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    RefreshCw,
    Search,
    Users,
    Shield,
    Ban,
    CheckCircle2,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    X,
    Calendar,
    Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getUsers,
    suspendUser,
    unsuspendUser,
    warnUser,
    getReportsAgainstUser,
    type UserWithSuspension,
    type DbReport,
} from "@/lib/supabase/queries";

// =============================================
// Main Component
// =============================================

export default function UsersManagementPage() {
    const [users, setUsers] = useState<UserWithSuspension[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [suspendedOnly, setSuspendedOnly] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithSuspension | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isSuspendOpen, setIsSuspendOpen] = useState(false);

    const PAGE_SIZE = 20;

    useEffect(() => {
        fetchData();
    }, [currentPage, roleFilter, suspendedOnly]);

    async function fetchData() {
        setIsLoading(true);
        try {
            const { data, count } = await getUsers({
                search: searchQuery || undefined,
                role: roleFilter || undefined,
                suspendedOnly,
                limit: PAGE_SIZE,
                offset: currentPage * PAGE_SIZE,
            });
            setUsers(data);
            setTotalCount(count);
        } catch (error) {
            console.error("[UsersManagementPage] Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleSearch() {
        setCurrentPage(0);
        fetchData();
    }

    function handleViewDetail(user: UserWithSuspension) {
        setSelectedUser(user);
        setIsDetailOpen(true);
    }

    function handleSuspendClick(user: UserWithSuspension) {
        setSelectedUser(user);
        setIsSuspendOpen(true);
    }

    async function handleUnsuspend(userId: string) {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await unsuspendUser(user.id, userId);
            fetchData();
        } catch (error) {
            console.error("[UsersManagementPage] Error unsuspending:", error);
        }
    }

    async function handleWarn(userId: string, reason: string) {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await warnUser(user.id, userId, reason);
            fetchData();
        } catch (error) {
            console.error("[UsersManagementPage] Error warning:", error);
        }
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    if (isLoading && users.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">사용자 관리</h1>
                <p className="text-muted-foreground">
                    사용자 정보 조회 및 정지/해제를 관리합니다.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="닉네임 또는 이메일로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setSuspendedOnly(!suspendedOnly)}
                        className={cn(
                            "px-3 py-2 text-sm rounded-lg border transition-colors flex items-center gap-1",
                            suspendedOnly
                                ? "bg-red-50 text-red-600 border-red-200"
                                : "hover:bg-muted"
                        )}
                    >
                        <Ban className="h-4 w-4" />
                        정지된 사용자만
                    </button>
                    <button
                        onClick={() => setRoleFilter(roleFilter === "ADMIN" ? null : "ADMIN")}
                        className={cn(
                            "px-3 py-2 text-sm rounded-lg border transition-colors flex items-center gap-1",
                            roleFilter === "ADMIN"
                                ? "bg-purple-50 text-purple-600 border-purple-200"
                                : "hover:bg-muted"
                        )}
                    >
                        <Shield className="h-4 w-4" />
                        관리자만
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">사용자</th>
                            <th className="text-left p-3 text-sm font-medium">권한</th>
                            <th className="text-left p-3 text-sm font-medium">경고</th>
                            <th className="text-left p-3 text-sm font-medium">상태</th>
                            <th className="text-left p-3 text-sm font-medium">가입일</th>
                            <th className="text-left p-3 text-sm font-medium">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    사용자가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="border-t hover:bg-muted/30">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            {user.avatarUrl ? (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.nickname}
                                                    className="w-8 h-8 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-sm">{user.nickname}</p>
                                                {user.email && (
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <RoleBadge role={user.role} />
                                    </td>
                                    <td className="p-3 text-sm">
                                        {user.warningCount > 0 ? (
                                            <span className="text-amber-600 font-medium">{user.warningCount}회</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <SuspensionBadge
                                            suspendedAt={user.suspendedAt}
                                            suspendedUntil={user.suspendedUntil}
                                        />
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                        {formatDate(user.createdAt)}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleViewDetail(user)}
                                                className="text-sm text-primary hover:underline"
                                            >
                                                상세
                                            </button>
                                            {user.suspendedAt ? (
                                                <button
                                                    onClick={() => handleUnsuspend(user.id)}
                                                    className="text-sm text-green-600 hover:underline"
                                                >
                                                    해제
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleSuspendClick(user)}
                                                    className="text-sm text-red-500 hover:underline"
                                                >
                                                    정지
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        총 {totalCount}건
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                            className="p-2 rounded-lg border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className="p-2 rounded-lg border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {isDetailOpen && selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => {
                        setIsDetailOpen(false);
                        setSelectedUser(null);
                    }}
                    onWarn={(reason) => {
                        handleWarn(selectedUser.id, reason);
                        setIsDetailOpen(false);
                        setSelectedUser(null);
                    }}
                />
            )}

            {/* Suspend Modal */}
            {isSuspendOpen && selectedUser && (
                <SuspendModal
                    userName={selectedUser.nickname}
                    onClose={() => {
                        setIsSuspendOpen(false);
                        setSelectedUser(null);
                    }}
                    onConfirm={async (until, reason) => {
                        const supabase = createClient();
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;

                        await suspendUser(user.id, selectedUser.id, until, reason);
                        setIsSuspendOpen(false);
                        setSelectedUser(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}

// =============================================
// Sub Components
// =============================================

function RoleBadge({ role }: { role: string }) {
    const isAdmin = role === "ADMIN";
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded text-xs",
                isAdmin ? "bg-purple-50 text-purple-600" : "bg-gray-50 text-gray-600"
            )}
        >
            {isAdmin && <Shield className="h-3 w-3" />}
            {isAdmin ? "관리자" : "사용자"}
        </span>
    );
}

function SuspensionBadge({
    suspendedAt,
    suspendedUntil,
}: {
    suspendedAt?: Date;
    suspendedUntil?: Date;
}) {
    if (!suspendedAt) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                정상
            </span>
        );
    }

    const isPermanent = !suspendedUntil;
    const isExpired = suspendedUntil && new Date() > suspendedUntil;

    if (isExpired) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-50 text-gray-600">
                만료됨
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-600">
            <Ban className="h-3 w-3" />
            {isPermanent ? "영구 정지" : `~${formatDate(suspendedUntil)}`}
        </span>
    );
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

// =============================================
// User Detail Modal
// =============================================

interface UserDetailModalProps {
    user: UserWithSuspension;
    onClose: () => void;
    onWarn: (reason: string) => void;
}

function UserDetailModal({ user, onClose, onWarn }: UserDetailModalProps) {
    const [reports, setReports] = useState<DbReport[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);
    const [warnReason, setWarnReason] = useState("");
    const [showWarnInput, setShowWarnInput] = useState(false);

    useEffect(() => {
        async function fetchReports() {
            try {
                const data = await getReportsAgainstUser(user.id);
                setReports(data);
            } catch (error) {
                console.error("[UserDetailModal] Error fetching reports:", error);
            } finally {
                setIsLoadingReports(false);
            }
        }
        fetchReports();
    }, [user.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-background rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold">사용자 상세</h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-muted">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user.nickname}
                                className="w-16 h-16 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                        )}
                        <div>
                            <h3 className="text-xl font-bold">{user.nickname}</h3>
                            {user.email && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                </p>
                            )}
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                가입일: {formatDate(user.createdAt)}
                            </p>
                        </div>
                    </div>

                    {/* Status Grid */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold">{user.warningCount}</p>
                            <p className="text-xs text-muted-foreground">경고</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold">{reports.length}</p>
                            <p className="text-xs text-muted-foreground">받은 신고</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <RoleBadge role={user.role} />
                        </div>
                    </div>

                    {/* Suspension Info */}
                    {user.suspendedAt && (
                        <div className="p-3 bg-red-50 rounded-lg">
                            <p className="text-sm font-medium text-red-600">정지 상태</p>
                            <p className="text-xs text-red-500 mt-1">
                                사유: {user.suspensionReason || "없음"}
                            </p>
                            <p className="text-xs text-red-500">
                                기간: {user.suspendedUntil ? `~${formatDate(user.suspendedUntil)}` : "영구"}
                            </p>
                        </div>
                    )}

                    {/* Reports */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">받은 신고 이력</h4>
                        {isLoadingReports ? (
                            <p className="text-sm text-muted-foreground">로딩 중...</p>
                        ) : reports.length === 0 ? (
                            <p className="text-sm text-muted-foreground">신고 이력이 없습니다.</p>
                        ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {reports.map((report) => (
                                    <div key={report.id} className="p-2 bg-muted/50 rounded text-xs">
                                        <span className="font-medium">{report.reason}</span>
                                        <span className="text-muted-foreground ml-2">
                                            {formatDate(report.createdAt)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Warn Action */}
                    {!user.suspendedAt && (
                        <div className="pt-2 border-t">
                            {showWarnInput ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={warnReason}
                                        onChange={(e) => setWarnReason(e.target.value)}
                                        placeholder="경고 사유 입력..."
                                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowWarnInput(false)}
                                            className="flex-1 py-2 text-sm rounded-lg border hover:bg-muted"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={() => warnReason && onWarn(warnReason)}
                                            disabled={!warnReason}
                                            className="flex-1 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                                        >
                                            경고 부여
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowWarnInput(true)}
                                    className="w-full py-2 text-sm rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 flex items-center justify-center gap-2"
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    경고 부여
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================
// Suspend Modal
// =============================================

interface SuspendModalProps {
    userName: string;
    onClose: () => void;
    onConfirm: (until: Date | null, reason: string) => void;
}

function SuspendModal({ userName, onClose, onConfirm }: SuspendModalProps) {
    const [duration, setDuration] = useState<"1d" | "7d" | "30d" | "permanent">("7d");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleConfirm() {
        if (!reason) return;
        setIsSubmitting(true);

        let until: Date | null = null;
        if (duration !== "permanent") {
            until = new Date();
            if (duration === "1d") until.setDate(until.getDate() + 1);
            else if (duration === "7d") until.setDate(until.getDate() + 7);
            else if (duration === "30d") until.setDate(until.getDate() + 30);
        }

        await onConfirm(until, reason);
        setIsSubmitting(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-background rounded-lg shadow-lg p-4 space-y-4">
                <div className="text-center">
                    <Ban className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold">사용자 정지</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                        &quot;{userName}&quot;을(를) 정지하시겠습니까?
                    </p>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">정지 기간</label>
                    <div className="grid grid-cols-4 gap-2">
                        {([
                            { value: "1d", label: "1일" },
                            { value: "7d", label: "7일" },
                            { value: "30d", label: "30일" },
                            { value: "permanent", label: "영구" },
                        ] as const).map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setDuration(opt.value)}
                                className={cn(
                                    "px-2 py-2 text-sm rounded-lg border transition-colors",
                                    duration === opt.value
                                        ? "bg-red-500 text-white border-red-500"
                                        : "hover:bg-muted"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">정지 사유</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="정지 사유를 입력하세요..."
                        className="w-full h-20 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg font-medium border hover:bg-muted"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!reason || isSubmitting}
                        className="flex-1 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                    >
                        {isSubmitting ? "처리 중..." : "정지"}
                    </button>
                </div>
            </div>
        </div>
    );
}
