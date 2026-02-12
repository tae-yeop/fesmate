/**
 * 세트리스트 관련 타입 정의
 *
 * 공연 슬롯의 세트리스트(곡 목록)를 관리하기 위한 타입들
 */

/** 세트리스트 정보 */
export interface Setlist {
    id: string;
    slotId: string;          // Which slot/performance this setlist belongs to
    eventId: string;
    artistId: string;
    artistName: string;
    songs: SetlistSong[];
    createdBy: string;
    createdByNickname: string;
    createdAt: Date;
    updatedAt: Date;
    status: SetlistStatus;
    helpfulCount: number;
}

/** 세트리스트 상태 */
export type SetlistStatus = "draft" | "published";

/** 세트리스트 곡 정보 */
export interface SetlistSong {
    id: string;
    order: number;           // 1-indexed order
    title: string;           // Song title
    isEncore: boolean;       // Is this an encore song?
    note?: string;           // Special notes (acoustic ver., collab, etc.)
    duration?: number;       // Duration in seconds
    callGuideId?: string;    // Link to call guide if exists
}

/** 세트리스트 생성 입력 */
export interface CreateSetlistInput {
    slotId: string;
    eventId: string;
    artistId: string;
    artistName: string;
    songs: Omit<SetlistSong, 'id'>[];
}

/** 세트리스트 수정 입력 */
export interface UpdateSetlistInput {
    songs?: Omit<SetlistSong, 'id'>[];
    status?: SetlistStatus;
}

/** 세트리스트 폼 상태 (에디터용) */
export interface SetlistFormSong {
    tempId: string;          // 임시 ID (폼 관리용)
    order: number;
    title: string;
    isEncore: boolean;
    note: string;
}

/** 기본 폼 곡 생성 */
export function createEmptySong(order: number): SetlistFormSong {
    return {
        tempId: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        order,
        title: "",
        isEncore: false,
        note: "",
    };
}

/** SetlistFormSong을 SetlistSong 입력으로 변환 */
export function formSongToInput(song: SetlistFormSong): Omit<SetlistSong, 'id'> {
    return {
        order: song.order,
        title: song.title.trim(),
        isEncore: song.isEncore,
        note: song.note.trim() || undefined,
    };
}
