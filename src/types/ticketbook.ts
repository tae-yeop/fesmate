// src/types/ticketbook.ts
// 티켓북 관련 타입 정의

/**
 * 티켓 이미지 정보
 */
export interface TicketImage {
  id: string;
  url: string;                   // data URL 또는 https URL
  thumbnailUrl: string;          // 썸네일 (목록용)
  width: number;
  height: number;
}

/**
 * 마스킹 영역 (Phase 2)
 */
export interface MaskArea {
  x: number;                     // % 기준 (0-100)
  y: number;                     // % 기준 (0-100)
  width: number;                 // % 기준
  height: number;                // % 기준
  type: "blur" | "sticker";
  stickerId?: string;            // 스티커 타입일 때
}

/**
 * 티켓 정보
 */
export interface Ticket {
  id: string;

  // 이미지
  frontImage: TicketImage;
  backImage?: TicketImage;       // 뒷면 (선택)

  // 연결 정보
  eventId: string;               // 연결된 행사 ID
  eventTitle: string;            // 행사 제목 (denormalized for display)
  eventDate: Date;               // 행사 날짜

  // 메타데이터
  memo?: string;                 // 사용자 메모
  seat?: string;                 // 좌석 정보
  companion?: string;            // 동행자

  // 마스킹 (Phase 2)
  maskAreas?: MaskArea[];        // 마스킹 영역

  // 시스템
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 티켓북 정렬 옵션
 */
export type TicketSortBy = "date" | "event" | "added";
export type TicketSortOrder = "asc" | "desc";

/**
 * 티켓북 전체 상태
 */
export interface TicketBook {
  tickets: Ticket[];
  sortBy: TicketSortBy;
  sortOrder: TicketSortOrder;
}

/**
 * 티켓 등록 입력 데이터
 */
export interface TicketInput {
  frontImageUrl: string;
  frontThumbnailUrl: string;
  frontWidth: number;
  frontHeight: number;
  backImageUrl?: string;
  backThumbnailUrl?: string;
  backWidth?: number;
  backHeight?: number;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  memo?: string;
  seat?: string;
  companion?: string;
}

/**
 * localStorage 직렬화용 티켓 (Date를 string으로)
 */
export interface SerializedTicket {
  id: string;
  frontImage: TicketImage;
  backImage?: TicketImage;
  eventId: string;
  eventTitle: string;
  eventDate: string;             // ISO string
  memo?: string;
  seat?: string;
  companion?: string;
  maskAreas?: MaskArea[];
  createdAt: string;             // ISO string
  updatedAt: string;             // ISO string
}

/**
 * localStorage 직렬화용 티켓북
 */
export interface SerializedTicketBook {
  tickets: SerializedTicket[];
  sortBy: TicketSortBy;
  sortOrder: TicketSortOrder;
}

/**
 * 티켓을 직렬화
 */
export function serializeTicket(ticket: Ticket): SerializedTicket {
  return {
    ...ticket,
    eventDate: ticket.eventDate.toISOString(),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

/**
 * 직렬화된 티켓을 역직렬화
 */
export function deserializeTicket(serialized: SerializedTicket): Ticket {
  return {
    ...serialized,
    eventDate: new Date(serialized.eventDate),
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
  };
}

/**
 * 티켓북을 직렬화
 */
export function serializeTicketBook(ticketBook: TicketBook): SerializedTicketBook {
  return {
    ...ticketBook,
    tickets: ticketBook.tickets.map(serializeTicket),
  };
}

/**
 * 직렬화된 티켓북을 역직렬화
 */
export function deserializeTicketBook(serialized: SerializedTicketBook): TicketBook {
  return {
    ...serialized,
    tickets: serialized.tickets.map(deserializeTicket),
  };
}
