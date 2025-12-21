"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Check,
    User,
    Shield,
    Eye,
    EyeOff,
    Users,
    Lock,
    Globe,
    ChevronRight,
    Star,
    Calendar,
    Trophy,
    Award,
    UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    useUserProfile,
    AVATAR_OPTIONS,
    PrivacySettings,
    PrivacyLevel,
    PRIVACY_LEVEL_LABELS,
    PRIVACY_SETTING_LABELS,
    DEFAULT_PRIVACY_SETTINGS,
} from "@/lib/user-profile-context";
import Link from "next/link";

type EditTab = "profile" | "privacy";

const PRIVACY_LEVEL_OPTIONS: { value: PrivacyLevel; icon: typeof Globe }[] = [
    { value: "public", icon: Globe },
    { value: "friends", icon: UserCheck },
    { value: "crew", icon: Users },
    { value: "private", icon: Lock },
];

export default function ProfileEditPage() {
    const router = useRouter();
    const {
        myProfile,
        isLoggedIn,
        isInitialized,
        updateProfile,
        updatePrivacy,
    } = useUserProfile();

    const [activeTab, setActiveTab] = useState<EditTab>("profile");

    // 프로필 폼 상태
    const [nickname, setNickname] = useState("");
    const [avatar, setAvatar] = useState("🎵");
    const [bio, setBio] = useState("");
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);

    // 프라이버시 설정 상태
    const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);

    // 변경 사항 추적
    const [hasChanges, setHasChanges] = useState(false);

    // 프로필 초기화
    useEffect(() => {
        if (myProfile) {
            setNickname(myProfile.nickname);
            setAvatar(myProfile.avatar);
            setBio(myProfile.bio);
            setPrivacySettings(myProfile.privacy);
        }
    }, [myProfile]);

    // 변경 사항 추적
    useEffect(() => {
        if (!myProfile) return;

        const profileChanged =
            nickname !== myProfile.nickname ||
            avatar !== myProfile.avatar ||
            bio !== myProfile.bio;

        const privacyChanged =
            JSON.stringify(privacySettings) !== JSON.stringify(myProfile.privacy);

        setHasChanges(profileChanged || privacyChanged);
    }, [nickname, avatar, bio, privacySettings, myProfile]);

    // 저장
    const handleSave = () => {
        const trimmedNickname = nickname.trim();
        if (!trimmedNickname) {
            alert("닉네임을 입력해주세요.");
            return;
        }
        if (trimmedNickname.length > 20) {
            alert("닉네임은 20자 이내로 입력해주세요.");
            return;
        }
        if (bio.length > 50) {
            alert("한줄소개는 50자 이내로 입력해주세요.");
            return;
        }

        // 프로필 업데이트
        updateProfile({
            nickname: trimmedNickname,
            avatar,
            bio: bio.trim(),
        });

        // 프라이버시 설정 업데이트
        updatePrivacy(privacySettings);

        router.back();
    };

    // 프라이버시 설정 변경
    const handlePrivacyChange = (key: keyof PrivacySettings, value: PrivacyLevel) => {
        setPrivacySettings(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!isLoggedIn || !myProfile) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
                    <div className="container flex items-center gap-3 h-14 px-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-lg font-semibold">프로필 편집</h1>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <User className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">로그인이 필요해요</p>
                    <Link href="/login" className="mt-4 text-primary hover:underline">
                        로그인하기
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-6">
            {/* 헤더 */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
                <div className="container flex items-center justify-between h-14 px-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-lg font-semibold">프로필 편집</h1>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                            hasChanges
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        <Check className="h-4 w-4" />
                        저장
                    </button>
                </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className="border-b">
                <div className="container max-w-2xl mx-auto">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab("profile")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative",
                                activeTab === "profile"
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <User className="h-4 w-4" />
                            프로필
                            {activeTab === "profile" && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("privacy")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative",
                                activeTab === "privacy"
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Shield className="h-4 w-4" />
                            프라이버시
                            {activeTab === "privacy" && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* 콘텐츠 */}
            <div className="container max-w-2xl mx-auto p-4">
                {activeTab === "profile" ? (
                    <div className="space-y-6">
                        {/* 아바타 선택 */}
                        <div className="flex flex-col items-center gap-3">
                            <button
                                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center text-5xl hover:scale-105 transition-transform border-2 border-primary/30 shadow-lg"
                            >
                                {avatar}
                            </button>
                            <span className="text-sm text-muted-foreground">
                                탭하여 아바타 변경
                            </span>

                            {showAvatarPicker && (
                                <div className="w-full p-4 bg-muted/50 rounded-xl">
                                    <div className="grid grid-cols-8 gap-2">
                                        {AVATAR_OPTIONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                onClick={() => {
                                                    setAvatar(emoji);
                                                    setShowAvatarPicker(false);
                                                }}
                                                className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all",
                                                    avatar === emoji
                                                        ? "bg-primary text-primary-foreground scale-110 shadow-md"
                                                        : "bg-background hover:bg-accent hover:scale-105"
                                                )}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 닉네임 */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">닉네임</label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="닉네임을 입력하세요"
                                maxLength={20}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {nickname.length}/20
                            </p>
                        </div>

                        {/* 한줄소개 */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">한줄소개</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="나를 소개해보세요"
                                maxLength={50}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {bio.length}/50
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 안내 */}
                        <div className="p-4 bg-muted/50 rounded-xl">
                            <div className="flex items-start gap-3">
                                <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">프라이버시 설정</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        내 활동을 누구에게 공개할지 설정할 수 있어요.
                                        크루원에게도 공유하고 싶지 않은 정보가 있다면 여기서 조절하세요.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 프라이버시 설정 항목들 */}
                        <div className="space-y-3">
                            {(Object.keys(PRIVACY_SETTING_LABELS) as Array<keyof PrivacySettings>).map((key) => {
                                const setting = PRIVACY_SETTING_LABELS[key];
                                const currentValue = privacySettings[key];
                                const currentLevel = PRIVACY_LEVEL_LABELS[currentValue];

                                // 아이콘 선택
                                let SettingIcon = Eye;
                                switch (key) {
                                    case "wishlistVisibility":
                                        SettingIcon = Star;
                                        break;
                                    case "attendedVisibility":
                                        SettingIcon = Calendar;
                                        break;
                                    case "gonglogVisibility":
                                        SettingIcon = Trophy;
                                        break;
                                    case "badgeVisibility":
                                        SettingIcon = Award;
                                        break;
                                    case "crewActivityVisibility":
                                        SettingIcon = Users;
                                        break;
                                    case "friendsListVisibility":
                                        SettingIcon = UserCheck;
                                        break;
                                }

                                return (
                                    <PrivacySettingRow
                                        key={key}
                                        icon={SettingIcon}
                                        label={setting.label}
                                        description={setting.description}
                                        value={currentValue}
                                        onChange={(value) => handlePrivacyChange(key, value)}
                                    />
                                );
                            })}
                        </div>

                        {/* 공개 범위 설명 */}
                        <div className="pt-4 border-t space-y-2">
                            <p className="text-xs font-medium text-muted-foreground mb-3">
                                공개 범위 안내
                            </p>
                            {PRIVACY_LEVEL_OPTIONS.map(({ value, icon: Icon }) => {
                                const level = PRIVACY_LEVEL_LABELS[value];
                                return (
                                    <div key={value} className="flex items-center gap-3 text-xs">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium w-16">{level.label}</span>
                                        <span className="text-muted-foreground">{level.description}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// 프라이버시 설정 행 컴포넌트
function PrivacySettingRow({
    icon: Icon,
    label,
    description,
    value,
    onChange,
}: {
    icon: typeof Eye;
    label: string;
    description: string;
    value: PrivacyLevel;
    onChange: (value: PrivacyLevel) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const currentLevel = PRIVACY_LEVEL_LABELS[value];

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        value === "public" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        value === "friends" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                        value === "crew" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                        value === "private" && "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    )}>
                        {currentLevel.label}
                    </span>
                    <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isOpen && "rotate-90"
                    )} />
                </div>
            </button>

            {isOpen && (
                <div className="border-t bg-muted/30 p-2 grid grid-cols-2 gap-2">
                    {PRIVACY_LEVEL_OPTIONS.map(({ value: optionValue, icon: OptionIcon }) => {
                        const level = PRIVACY_LEVEL_LABELS[optionValue];
                        const isSelected = value === optionValue;

                        return (
                            <button
                                key={optionValue}
                                onClick={() => {
                                    onChange(optionValue);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "flex items-center gap-2 p-3 rounded-lg text-sm transition-colors",
                                    isSelected
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background hover:bg-accent"
                                )}
                            >
                                <OptionIcon className="h-4 w-4" />
                                <span className="font-medium">{level.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
