"use client";

import { useState } from "react";
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
    Camera,
    Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PostType, POST_TYPE_LABELS } from "@/types/post";

interface PostComposerProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    eventTitle: string;
    initialType?: PostType;
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
    { type: "question", label: "질문", icon: HelpCircle, description: "궁금한 점 질문", category: "community" },
    // 후기
    { type: "review", label: "후기", icon: Star, description: "행사 후기", category: "review" },
    { type: "video", label: "영상", icon: Video, description: "영상 공유", category: "review" },
    { type: "tip", label: "팁", icon: MessageCircle, description: "꿀팁 공유", category: "review" },
];

/**
 * 글 작성 모달 - PRD v0.5 기준
 * - 글 타입 선택
 * - 템플릿 기반 작성
 */
export function PostComposer({ isOpen, onClose, eventId, eventTitle, initialType }: PostComposerProps) {
    const [step, setStep] = useState<"select" | "compose">(initialType ? "compose" : "select");
    const [selectedType, setSelectedType] = useState<PostType | null>(initialType || null);
    const [content, setContent] = useState("");
    const [images, setImages] = useState<string[]>([]);

    // 커뮤니티용 추가 필드
    const [meetTime, setMeetTime] = useState("");
    const [placeText, setPlaceText] = useState("");      // 장소명
    const [placeHint, setPlaceHint] = useState("");      // 장소 힌트 (선택)
    const [maxPeople, setMaxPeople] = useState(4);

    // 후기용 추가 필드
    const [rating, setRating] = useState(5);
    const [videoUrl, setVideoUrl] = useState("");

    if (!isOpen) return null;

    const selectedOption = POST_TYPE_OPTIONS.find((o) => o.type === selectedType);

    const handleSelectType = (type: PostType) => {
        setSelectedType(type);
        setStep("compose");
    };

    const handleBack = () => {
        setStep("select");
        setSelectedType(null);
    };

    const handleSubmit = () => {
        // TODO: 실제 제출 로직
        console.log({
            eventId,
            type: selectedType,
            content,
            images,
            meetTime,
            placeText,
            placeHint,
            maxPeople,
            rating,
            videoUrl,
        });
        onClose();
        // 폼 리셋
        setStep("select");
        setSelectedType(null);
        setContent("");
        setImages([]);
        setMeetTime("");
        setPlaceText("");
        setPlaceHint("");
        setMaxPeople(4);
        setRating(5);
        setVideoUrl("");
    };

    const isValid = () => {
        if (!content.trim()) return false;
        if (selectedOption?.category === "community" && selectedType !== "question") {
            // 질문 외 커뮤니티 글은 시간과 장소 필수
            if (!meetTime || !placeText) return false;
        }
        if (selectedType === "video" && !videoUrl.trim()) return false;
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
                    {step === "compose" ? (
                        <button onClick={handleBack} className="p-1 hover:bg-accent rounded">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    ) : (
                        <div className="w-7" />
                    )}
                    <h2 className="font-bold">
                        {step === "select" ? "글 작성" : selectedOption?.label}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 행사 정보 */}
                <div className="px-4 py-2 bg-muted/50 text-sm text-muted-foreground">
                    📍 {eventTitle}
                </div>

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
                        />
                    )}
                </div>

                {/* 하단 액션 (compose 단계에서만) */}
                {step === "compose" && (
                    <div className="px-4 py-3 border-t flex items-center justify-between">
                        <button className="p-2 hover:bg-accent rounded">
                            <Camera className="h-5 w-5 text-muted-foreground" />
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isValid()}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                            올리기
                        </button>
                    </div>
                )}
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

            {/* 커뮤니티 추가 필드 */}
            {isCommunity && type !== "question" && (
                <>
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
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {type === "taxi" ? "출발 장소" : "만남 장소"}
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

            {/* 양도 경고 */}
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
