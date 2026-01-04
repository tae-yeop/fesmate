/**
 * 갤러리 타입 정의
 * 티켓 + 사진 + SNS 포스트를 통합한 공연 아카이브
 */

/** 갤러리 아이템 타입 */
export type GalleryItemType = "ticket" | "photo" | "instagram" | "twitter";

/** SNS 플랫폼 */
export type SocialPlatform = "instagram" | "twitter";

/** 갤러리 아이템 기본 인터페이스 */
export interface GalleryItemBase {
    id: string;
    type: GalleryItemType;
    createdAt: Date;
    order: number; // 정렬 순서
}

/** 티켓 아이템 */
export interface TicketGalleryItem extends GalleryItemBase {
    type: "ticket";
    ticketId: string;
    // 공유 시 필요한 티켓 정보 (스냅샷)
    ticketSnapshot?: {
        eventTitle: string;
        eventDate: Date;
        venue?: string;
        seat?: string;
        frontImageUrl: string;
        frontImageThumbnailUrl?: string;
    };
}

/** 사진 아이템 */
export interface PhotoGalleryItem extends GalleryItemBase {
    type: "photo";
    imageUrl: string;
    thumbnailUrl?: string;
    caption?: string;
    eventId?: string; // 연결된 행사 (선택)
    eventTitle?: string;
    takenAt?: Date; // 촬영 날짜
}

/** Instagram 포스트 아이템 */
export interface InstagramGalleryItem extends GalleryItemBase {
    type: "instagram";
    embedUrl: string;
    embedHtml?: string; // oEmbed HTML
    thumbnailUrl?: string;
    caption?: string;
    authorName?: string;
}

/** Twitter 포스트 아이템 */
export interface TwitterGalleryItem extends GalleryItemBase {
    type: "twitter";
    embedUrl: string;
    embedHtml?: string; // oEmbed HTML
    authorName?: string;
    authorHandle?: string;
    content?: string; // 트윗 텍스트
}

/** 갤러리 아이템 Union 타입 */
export type GalleryItem =
    | TicketGalleryItem
    | PhotoGalleryItem
    | InstagramGalleryItem
    | TwitterGalleryItem;

/** 갤러리 */
export interface Gallery {
    id: string;
    userId: string;
    title: string;
    description?: string;
    coverImageUrl?: string; // 커버 이미지
    items: GalleryItem[];
    isPublic: boolean;
    shareId?: string; // 공개 URL용 (예: abc123)
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
}

/** 갤러리 생성 입력 */
export interface CreateGalleryInput {
    title: string;
    description?: string;
    isPublic?: boolean;
}

/** 갤러리 아이템 추가 입력 */
export interface AddGalleryItemInput {
    type: GalleryItemType;
    // 티켓
    ticketId?: string;
    // 사진
    imageUrl?: string;
    caption?: string;
    eventId?: string;
    takenAt?: Date;
    // SNS
    embedUrl?: string;
}

/** oEmbed 응답 데이터 */
export interface OEmbedData {
    type: "rich" | "video" | "photo" | "link";
    version: string;
    title?: string;
    author_name?: string;
    author_url?: string;
    provider_name: string;
    provider_url: string;
    html?: string;
    width?: number;
    height?: number;
    thumbnail_url?: string;
    thumbnail_width?: number;
    thumbnail_height?: number;
}

/** SNS URL 파싱 결과 */
export interface ParsedSocialUrl {
    platform: SocialPlatform;
    url: string;
    postId?: string;
    username?: string;
}
