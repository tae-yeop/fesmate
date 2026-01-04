"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    X,
    ChevronLeft,
    MapPin,
    Clock,
    Users,
    Car,
    Utensils,
    Home,
    Ticket,
    MessageCircle,
    AlertTriangle,
    ShoppingBag,
    Shield,
    Building,
    Star,
    Video,
    HelpCircle,
    ImagePlus,
    Send,
    LogIn,
    Lightbulb,
    PartyPopper,
    Cake,
    Search,
    ChevronRight,
    Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PostType, POST_TYPE_LABELS } from "@/types/post";
import { UploadedImage } from "@/types/image";
import { useAuth } from "@/lib/auth-context";
import { useDevContext } from "@/lib/dev-context";
import { usePost } from "@/lib/post-context";
import { useRateLimit } from "@/lib/rate-limit-context";
import { filterContent, hasBlockedLinks } from "@/lib/content-filter";
import { ImageUploader } from "@/components/image";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { useWishlist } from "@/lib/wishlist-context";
import { Event } from "@/types/event";

interface PostComposerProps {
    isOpen: boolean;
    onClose: () => void;
    /** 초기 선택된 행사 ID (선택적) */
    eventId?: string;
    /** 초기 선택된 행사 제목 (선택적) */
    eventTitle?: string;
    /** 수정 모드: 기존 글 데이터 */
    editPost?: {
        id: string;
        eventId: string;
        content: string;
        maxPeople?: number;
        price?: string;
        placeText?: string;
        placeHint?: string;
        meetTime?: string;  // ISO string format
        expiresAt?: Date;
    };
    /** 수정 완료 콜백 */
    onEditComplete?: (postId: string, updatedData: {
        content: string;
        maxPeople?: number;
        placeText?: string;
        placeHint?: string;
        meetTime?: string;
        expiresAt?: Date;
    }) => void;
}

type CategoryType = "realtime" | "community" | "review";

interface PostTypeOption {
    type: PostType;
    label: string;
    icon: React.ElementType;
    description: string;
    category: CategoryType;
}

const POST_TYPE_OPTIONS: PostTypeOption[] = [
    // 실시간 제보
    { type: "gate", label: "게이트", icon: MapPin, description: "입장/게이트 상황", category: "realtime" },
    { type: "md", label: "MD/굿즈", icon: ShoppingBag, description: "MD 재고/대기 상황", category: "realtime" },
    { type: "facility", label: "시설", icon: Building, description: "화장실/편의시설 정보", category: "realtime" },
    { type: "safety", label: "안전", icon: Shield, description: "안전/주의사항", category: "realtime" },
    // 커뮤니티
    { type: "companion", label: "동행", icon: Users, description: "같이 갈 사람 구해요", category: "community" },
    { type: "taxi", label: "택시팟", icon: Car, description: "택시 같이 타실 분", category: "community" },
    { type: "meal", label: "밥", icon: Utensils, description: "밥 같이 먹어요", category: "community" },
    { type: "lodge", label: "숙소", icon: Home, description: "숙소 공유/구해요", category: "community" },
    { type: "transfer", label: "양도", icon: Ticket, description: "티켓 양도/구해요", category: "community" },
    { type: "tip", label: "팁", icon: Lightbulb, description: "꿀팁 공유", category: "community" },
    { type: "fanevent", label: "팬이벤트", icon: Cake, description: "생일카페/포토존/서포트", category: "community" },
    { type: "afterparty", label: "뒷풀이", icon: PartyPopper, description: "공연 후 모임", category: "community" },
    { type: "question", label: "질문", icon: HelpCircle, description: "궁금한 점 질문", category: "community" },
    // 후기
    { type: "review", label: "후기", icon: Star, description: "행사 후기", category: "review" },
    { type: "video", label: "영상", icon: Video, description: "영상 공유", category: "review" },
];

/**
 * 글 작성/수정 모달 - PRD v0.5 기준
 * - 글 타입 선택
 * - 행사 검색/선택
 * - 템플릿 기반 작성
 * - 비로그인 시 로그인 유도
 * - 수정 모드 지원
 */
export function PostComposer({ isOpen, onClose, eventId, eventTitle, editPost, onEditComplete }: PostComposerProps) {
    const { user, isLoading } = useAuth();
    const { isLoggedIn: isDevLoggedIn } = useDevContext();
    const { wishlist } = useWishlist();
    const { createPost } = usePost();
    const { checkRateLimit, recordPost, getCooldownStatus } = useRateLimit();
    const isEditMode = !!editPost;

    // 에러/경고 상태
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [contentWarning, setContentWarning] = useState<string | null>(null);

    // 실제 로그인 또는 Dev 모드 로그인 상태 확인
    const isLoggedIn = !!user || isDevLoggedIn;

    // 단계: select (타입 선택) -> compose (작성)
    const [step, setStep] = useState<"select" | "compose">(isEditMode ? "compose" : "select");
    const [selectedType, setSelectedType] = useState<PostType | null>(null);
    const [content, setContent] = useState(editPost?.content || "");
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [showImageUploader, setShowImageUploader] = useState(false);

    // 행사 선택 상태
    const [selectedEventId, setSelectedEventId] = useState<string | null>(editPost?.eventId || eventId || null);
    const [isEventSelectorOpen, setIsEventSelectorOpen] = useState(false);

    // 선택된 행사 정보
    const selectedEvent = useMemo(() => {
        if (!selectedEventId) return null;
        return MOCK_EVENTS.find(e => e.id === selectedEventId) || null;
    }, [selectedEventId]);

    // 커뮤니티용 추가 필드
    const [meetTime, setMeetTime] = useState(editPost?.meetTime || "");
    const [placeText, setPlaceText] = useState(editPost?.placeText || "");      // 장소명
    const [placeHint, setPlaceHint] = useState(editPost?.placeHint || "");      // 장소 힌트 (선택)
    const [maxPeople, setMaxPeople] = useState(editPost?.maxPeople || 4);

    // 후기용 추가 필드
    const [rating, setRating] = useState(5);
    const [videoUrl, setVideoUrl] = useState("");

    if (!isOpen) return null;

    // 비로그인 상태면 로그인 유도 화면 표시 (Dev 모드 제외)
    if (!isLoading && !isLoggedIn) {
        return (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                {/* 백드롭 */}
                <div className="absolute inset-0 bg-black/50" onClick={onClose} />

                {/* 모달 */}
                <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl overflow-hidden">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <div className="w-7" />
                        <h2 className="font-bold">글 작성</h2>
                        <button onClick={onClose} className="p-1 hover:bg-accent rounded">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* 로그인 유도 */}
                    <div className="p-8 text-center">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <LogIn className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">로그인이 필요해요</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            글을 작성하려면 로그인해주세요.<br />
                            간편하게 소셜 로그인으로 시작할 수 있어요.
                        </p>
                        <div className="space-y-2">
                            <Link
                                href="/login"
                                onClick={onClose}
                                className="block w-full bg-primary text-primary-foreground rounded-full py-3 font-medium hover:opacity-90 transition-opacity"
                            >
                                로그인하기
                            </Link>
                            <button
                                onClick={onClose}
                                className="w-full text-muted-foreground py-2 text-sm hover:text-foreground"
                            >
                                나중에 할게요
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const selectedOption = POST_TYPE_OPTIONS.find((o) => o.type === selectedType);

    const handleSelectType = (type: PostType) => {
        setSelectedType(type);
        setStep("compose");
    };

    const handleBack = () => {
        setStep("select");
        setSelectedType(null);
    };

    const handleSubmit = async () => {
        setSubmitError(null);
        setContentWarning(null);

        if (isEditMode && editPost && onEditComplete) {
            // 수정 모드: 콜백 호출
            onEditComplete(editPost.id, {
                content,
                maxPeople,
                placeText,
                placeHint,
                meetTime,
            });
        } else {
            // 신규 작성 모드
            if (!selectedType || !selectedEventId) return;

            // 1. Rate Limit 체크
            const rateLimitResult = checkRateLimit(selectedType);
            if (!rateLimitResult.allowed) {
                setSubmitError(rateLimitResult.message || "잠시 후 다시 시도해주세요");
                return;
            }

            // 2. 금지어 필터 체크
            const filterResult = filterContent(content);
            if (!filterResult.passed) {
                if (filterResult.level === "warn") {
                    setContentWarning(filterResult.message || "부적절한 내용이 포함되어 있습니다");
                    // 경고는 한 번 표시 후 다시 제출하면 통과
                    if (!contentWarning) return;
                } else {
                    setSubmitError(filterResult.message || "부적절한 내용으로 작성할 수 없습니다");
                    return;
                }
            }

            // 3. 링크 검증 (본문 + 영상 URL)
            const contentToCheck = videoUrl ? `${content} ${videoUrl}` : content;
            const linkCheck = hasBlockedLinks(contentToCheck);
            if (linkCheck.blocked) {
                setSubmitError("허용되지 않는 링크가 포함되어 있습니다");
                return;
            }
            // 단축 URL 경고
            if (linkCheck.warnings.length > 0) {
                setContentWarning(linkCheck.warnings[0]);
                if (!contentWarning) return;
            }

            // 4. 글 생성
            const newPost = await createPost({
                eventId: selectedEventId,
                type: selectedType,
                content,
                maxPeople: maxPeople > 1 ? maxPeople : undefined,
                meetAt: meetTime ? new Date(meetTime) : undefined,
                placeText: placeText || undefined,
                placeHint: placeHint || undefined,
            });

            if (newPost) {
                // Rate limit 기록
                recordPost(newPost.id, selectedType);
            } else {
                setSubmitError("글 작성에 실패했습니다. 다시 시도해주세요.");
                return;
            }
        }

        onClose();
        // 폼 리셋
        setStep("select");
        setSelectedType(null);
        setSelectedEventId(eventId || null);
        setContent("");
        setImages([]);
        setMeetTime("");
        setPlaceText("");
        setPlaceHint("");
        setMaxPeople(4);
        setRating(5);
        setVideoUrl("");
        setSubmitError(null);
        setContentWarning(null);
    };

    const isValid = () => {
        if (!selectedEventId) return false;  // 행사 선택 필수
        if (!content.trim()) return false;
        if (selectedOption?.category === "community" && selectedType !== "question" && selectedType !== "tip") {
            // 질문, 팁 외 커뮤니티 글은 시간과 장소 필수
            if (!meetTime || !placeText) return false;
        }
        if (selectedType === "video" && !videoUrl.trim()) return false;
        // 양도글은 티켓 사진 필수 (PRD 6.19 - 사기 방지)
        if (selectedType === "transfer" && images.length === 0) return false;
        return true;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* 백드롭 */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* 모달 */}
            <div className="relative w-full max-w-lg bg-background rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    {step === "compose" && !isEditMode ? (
                        <button onClick={handleBack} className="p-1 hover:bg-accent rounded">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    ) : (
                        <div className="w-7" />
                    )}
                    <h2 className="font-bold">
                        {isEditMode
                            ? "글 수정"
                            : step === "select"
                                ? "글 작성"
                                : selectedOption?.label}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 행사 선택 */}
                <button
                    onClick={() => !isEditMode && setIsEventSelectorOpen(true)}
                    disabled={isEditMode}
                    className={cn(
                        "w-full px-4 py-3 bg-muted/50 text-sm flex items-center justify-between transition-colors",
                        !isEditMode && "hover:bg-muted cursor-pointer",
                        isEditMode && "cursor-default"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {selectedEvent ? (
                            <span className="font-medium text-foreground">{selectedEvent.title}</span>
                        ) : (
                            <span className="text-muted-foreground">행사를 선택하세요</span>
                        )}
                    </div>
                    {!isEditMode && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                </button>

                {/* 콘텐츠 */}
                <div className="flex-1 overflow-y-auto">
                    {step === "select" ? (
                        <TypeSelector onSelect={handleSelectType} />
                    ) : (
                        <ComposeForm
                            type={selectedType!}
                            option={selectedOption!}
                            content={content}
                            setContent={setContent}
                            meetTime={meetTime}
                            setMeetTime={setMeetTime}
                            placeText={placeText}
                            setPlaceText={setPlaceText}
                            placeHint={placeHint}
                            setPlaceHint={setPlaceHint}
                            maxPeople={maxPeople}
                            setMaxPeople={setMaxPeople}
                            rating={rating}
                            setRating={setRating}
                            videoUrl={videoUrl}
                            setVideoUrl={setVideoUrl}
                            imageCount={images.length}
                        />
                    )}
                </div>

                {/* 하단 액션 (compose 단계에서만) */}
                {step === "compose" && (
                    <div className="border-t">
                        {/* 에러 메시지 */}
                        {submitError && (
                            <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                                <p className="text-sm text-red-600 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    {submitError}
                                </p>
                            </div>
                        )}
                        {/* 경고 메시지 (계속하기 가능) */}
                        {contentWarning && !submitError && (
                            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                                <p className="text-sm text-amber-700 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    {contentWarning}
                                    <span className="text-xs">(다시 클릭하면 게시됩니다)</span>
                                </p>
                            </div>
                        )}
                        {/* 이미지 업로더 (토글) */}
                        {showImageUploader && (
                            <div className="px-4 pt-3 pb-1 border-b bg-muted/30">
                                <ImageUploader
                                    images={images}
                                    onChange={setImages}
                                    maxImages={5}
                                />
                            </div>
                        )}
                        <div className="px-4 py-3 flex items-center justify-between">
                            <button
                                onClick={() => setShowImageUploader(!showImageUploader)}
                                className={cn(
                                    "p-2 rounded transition-colors flex items-center gap-1.5",
                                    showImageUploader
                                        ? "bg-primary/10 text-primary"
                                        : selectedType === "transfer" && images.length === 0
                                            ? "bg-amber-100 text-amber-700 animate-pulse"
                                            : "hover:bg-accent text-muted-foreground"
                                )}
                            >
                                <ImagePlus className="h-5 w-5" />
                                {images.length > 0 ? (
                                    <span className="text-xs font-medium">{images.length}</span>
                                ) : selectedType === "transfer" ? (
                                    <span className="text-xs font-medium">필수</span>
                                ) : null}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!isValid()}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" />
                                {isEditMode ? "수정하기" : "올리기"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 행사 선택 모달 */}
            <EventSelectorModal
                isOpen={isEventSelectorOpen}
                onClose={() => setIsEventSelectorOpen(false)}
                onSelect={(event) => {
                    setSelectedEventId(event.id);
                    setIsEventSelectorOpen(false);
                }}
                selectedEventId={selectedEventId}
                wishlistIds={Array.from(wishlist)}
            />
        </div>
    );
}

// 행사 선택 모달
function EventSelectorModal({
    isOpen,
    onClose,
    onSelect,
    selectedEventId,
    wishlistIds,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (event: Event) => void;
    selectedEventId: string | null;
    wishlistIds: string[];
}) {
    const [searchQuery, setSearchQuery] = useState("");

    // 행사 필터링 및 정렬
    const filteredEvents = useMemo(() => {
        const activeEvents = MOCK_EVENTS.filter(e => e.status !== "CANCELED");

        // 검색어 필터
        const filtered = searchQuery.trim()
            ? activeEvents.filter(e =>
                e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.venue?.name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : activeEvents;

        // 찜한 행사 우선, 그 다음 날짜순
        return filtered.sort((a, b) => {
            const aWished = wishlistIds.includes(a.id);
            const bWished = wishlistIds.includes(b.id);
            if (aWished && !bWished) return -1;
            if (!aWished && bWished) return 1;
            return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
        });
    }, [searchQuery, wishlistIds]);

    // 찜한 행사 목록
    const wishedEvents = filteredEvents.filter(e => wishlistIds.includes(e.id));
    const otherEvents = filteredEvents.filter(e => !wishlistIds.includes(e.id));

    if (!isOpen) return null;

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("ko-KR", {
            month: "short",
            day: "numeric",
            weekday: "short",
        }).format(new Date(date));
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
            {/* 백드롭 */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* 모달 */}
            <div className="relative w-full max-w-lg bg-background rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h2 className="font-bold">행사 선택</h2>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 검색 */}
                <div className="px-4 py-3 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="행사명 검색..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm"
                            autoFocus
                        />
                    </div>
                </div>

                {/* 행사 목록 */}
                <div className="flex-1 overflow-y-auto">
                    {/* 찜한 행사 */}
                    {wishedEvents.length > 0 && !searchQuery && (
                        <div className="px-4 pt-4">
                            <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                찜한 행사
                            </h3>
                            <div className="space-y-2">
                                {wishedEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={() => onSelect(event)}
                                        className={cn(
                                            "w-full p-3 rounded-lg border text-left transition-colors",
                                            selectedEventId === event.id
                                                ? "border-primary bg-primary/5"
                                                : "hover:border-primary/50 hover:bg-accent/50"
                                        )}
                                    >
                                        <p className="font-medium text-sm line-clamp-1">{event.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {formatDate(event.startAt)} · {event.venue?.name}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 기타 행사 */}
                    <div className="px-4 py-4">
                        {!searchQuery && wishedEvents.length > 0 && (
                            <h3 className="text-xs font-bold text-muted-foreground mb-2">전체 행사</h3>
                        )}
                        {filteredEvents.length > 0 ? (
                            <div className="space-y-2">
                                {(searchQuery ? filteredEvents : otherEvents).map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={() => onSelect(event)}
                                        className={cn(
                                            "w-full p-3 rounded-lg border text-left transition-colors",
                                            selectedEventId === event.id
                                                ? "border-primary bg-primary/5"
                                                : "hover:border-primary/50 hover:bg-accent/50"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm line-clamp-1">{event.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {formatDate(event.startAt)} · {event.venue?.name}
                                                </p>
                                            </div>
                                            {wishlistIds.includes(event.id) && (
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0 ml-2" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">검색 결과가 없습니다</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 타입 선택 UI
function TypeSelector({ onSelect }: { onSelect: (type: PostType) => void }) {
    const categories: { key: CategoryType; label: string }[] = [
        { key: "realtime", label: "실시간 제보" },
        { key: "community", label: "커뮤니티" },
        { key: "review", label: "후기" },
    ];

    return (
        <div className="p-4 space-y-6">
            {categories.map((cat) => (
                <section key={cat.key}>
                    <h3 className="text-sm font-bold text-muted-foreground mb-3">{cat.label}</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {POST_TYPE_OPTIONS.filter((o) => o.category === cat.key).map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.type}
                                    onClick={() => onSelect(option.type)}
                                    className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                                >
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{option.label}</p>
                                        <p className="text-xs text-muted-foreground">{option.description}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}

// 작성 폼
function ComposeForm({
    type,
    option,
    content,
    setContent,
    meetTime,
    setMeetTime,
    placeText,
    setPlaceText,
    placeHint,
    setPlaceHint,
    maxPeople,
    setMaxPeople,
    rating,
    setRating,
    videoUrl,
    setVideoUrl,
    imageCount,
}: {
    type: PostType;
    option: PostTypeOption;
    content: string;
    setContent: (v: string) => void;
    meetTime: string;
    setMeetTime: (v: string) => void;
    placeText: string;
    setPlaceText: (v: string) => void;
    placeHint: string;
    setPlaceHint: (v: string) => void;
    maxPeople: number;
    setMaxPeople: (v: number) => void;
    rating: number;
    setRating: (v: number) => void;
    videoUrl: string;
    setVideoUrl: (v: string) => void;
    imageCount: number;
}) {
    const isCommunity = option.category === "community";
    const isReview = type === "review";
    const isVideo = type === "video";

    // 플레이스홀더 텍스트
    const getPlaceholder = () => {
        switch (type) {
            case "gate":
                return "게이트 상황을 알려주세요. (예: A게이트 줄이 줄어들고 있어요!)";
            case "md":
                return "MD/굿즈 상황을 알려주세요. (예: 포토카드 재고 있어요!)";
            case "facility":
                return "시설 정보를 알려주세요. (예: 2층 화장실이 비교적 한가해요)";
            case "safety":
                return "안전 관련 정보를 알려주세요.";
            case "companion":
                return "어떤 동행을 찾으시나요?";
            case "taxi":
                return "출발지와 도착지를 알려주세요.";
            case "meal":
                return "어디서 뭘 먹을지 알려주세요.";
            case "lodge":
                return "숙소 정보를 알려주세요.";
            case "transfer":
                return "양도 정보를 알려주세요. (좌석, 가격 등)";
            case "question":
                return "궁금한 점을 질문해주세요.";
            case "review":
                return "행사는 어땠나요? 솔직한 후기를 남겨주세요.";
            case "video":
                return "영상에 대한 설명을 적어주세요.";
            case "tip":
                return "다른 분들에게 도움이 될 팁을 공유해주세요.";
            case "fanevent":
                return "팬이벤트 정보를 알려주세요. (장소, 운영시간, 특전 등)";
            case "afterparty":
                return "뒷풀이 정보를 알려주세요. (장소, 시간, 예상 비용 등)";
            default:
                return "내용을 입력해주세요.";
        }
    };

    return (
        <div className="p-4 space-y-4">
            {/* 실시간 제보 경고 */}
            {option.category === "realtime" && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-amber-800">
                        정확한 정보만 공유해주세요. 허위 정보는 신뢰도에 영향을 줄 수 있습니다.
                    </p>
                </div>
            )}

            {/* 후기 별점 */}
            {isReview && (
                <div>
                    <label className="text-sm font-medium mb-2 block">별점</label>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className="p-1"
                            >
                                <Star
                                    className={cn(
                                        "h-8 w-8 transition-colors",
                                        star <= rating
                                            ? "text-yellow-400 fill-yellow-400"
                                            : "text-gray-300"
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 영상 URL */}
            {isVideo && (
                <div>
                    <label className="text-sm font-medium mb-2 block">영상 링크</label>
                    <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="YouTube, TikTok 등 영상 URL"
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                </div>
            )}

            {/* 커뮤니티 추가 필드 (질문, 팁 제외) */}
            {isCommunity && type !== "question" && type !== "tip" && (
                <>
                    {/* 양도글은 모집인원 불필요, 시간/장소만 표시 */}
                    {type === "transfer" ? (
                        <div>
                            <label className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                거래 희망 시간
                            </label>
                            <input
                                type="datetime-local"
                                value={meetTime}
                                onChange={(e) => setMeetTime(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium mb-2 flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {type === "taxi" ? "출발 시간" : "만남 시간"}
                                </label>
                                <input
                                    type="datetime-local"
                                    value={meetTime}
                                    onChange={(e) => setMeetTime(e.target.value)}
                                    className="w-full rounded-lg border px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    모집 인원
                                </label>
                                <select
                                    value={maxPeople}
                                    onChange={(e) => setMaxPeople(Number(e.target.value))}
                                    className="w-full rounded-lg border px-3 py-2 text-sm"
                                >
                                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                                        <option key={n} value={n}>{n}명</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {type === "taxi" ? "출발 장소" : type === "transfer" ? "거래 장소" : "만남 장소"}
                        </label>
                        <input
                            type="text"
                            value={placeText}
                            onChange={(e) => setPlaceText(e.target.value)}
                            placeholder="예: 올림픽공원 정문"
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                        <input
                            type="text"
                            value={placeHint}
                            onChange={(e) => setPlaceHint(e.target.value)}
                            placeholder="힌트 (선택): 예: 5호선 올림픽공원역 3번 출구"
                            className="w-full rounded-lg border px-3 py-2 text-sm text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground">
                            장소 정보는 다른 분들이 지도에서 검색할 때 사용됩니다
                        </p>
                    </div>
                </>
            )}

            {/* 본문 */}
            <div>
                <label className="text-sm font-medium mb-2 block">내용</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={getPlaceholder()}
                    rows={5}
                    className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
                />
            </div>

            {/* 양도글 티켓 사진 필수 안내 */}
            {type === "transfer" && (
                <div className={cn(
                    "flex items-start gap-2 p-3 rounded-lg text-sm border",
                    imageCount > 0
                        ? "bg-green-50 border-green-200"
                        : "bg-amber-50 border-amber-200"
                )}>
                    <Ticket className={cn(
                        "h-4 w-4 mt-0.5",
                        imageCount > 0 ? "text-green-600" : "text-amber-600"
                    )} />
                    <div className={imageCount > 0 ? "text-green-800" : "text-amber-800"}>
                        <p className="font-medium">
                            {imageCount > 0
                                ? `✓ 티켓 사진 ${imageCount}장 첨부됨`
                                : "📸 티켓 사진 필수"}
                        </p>
                        <p className="text-xs mt-1">
                            {imageCount > 0
                                ? "현물 티켓 사진이 확인되었습니다."
                                : "사기 방지를 위해 현재 소지한 티켓 사진을 첨부해주세요. 하단 이미지 버튼을 눌러 추가할 수 있습니다."}
                        </p>
                    </div>
                </div>
            )}

            {/* 양도 안전 거래 안내 */}
            {type === "transfer" && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <Shield className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="text-red-800">
                        <p className="font-medium">안전 거래 안내</p>
                        <p className="text-xs mt-1">직거래 시 사기에 주의하세요. 가급적 안전한 장소에서 만나고, 선입금은 피해주세요.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
