/**
 * CallGuide Query Functions
 *
 * 콜가이드 관련 Supabase 쿼리
 * - songs: 곡 정보
 * - call_guides: 콜가이드 (곡별 호응법)
 * - call_guide_entries: 콜가이드 항목
 */

import { createClient } from "../client";
import type {
    Song,
    CallGuide,
    CallGuideEntry,
    CallGuideStatus,
    CallType,
    CreateSongInput,
    CreateCallGuideEntryInput,
} from "@/types/call-guide";

// Re-export types for index.ts
export type { CreateSongInput, CreateCallGuideEntryInput };

// ===== Helper: Transform DB rows to frontend types =====

function transformDbSong(row: Record<string, unknown>): Song {
    return {
        id: row.id as string,
        title: row.title as string,
        artistId: row.artist_id as string,
        artistName: row.artist_name as string,
        youtubeId: row.youtube_id as string,
        duration: row.duration as number,
        thumbnailUrl: row.thumbnail_url as string | undefined,
        releaseYear: row.release_year as number | undefined,
        album: row.album as string | undefined,
        hasCallGuide: row.has_call_guide as boolean,
    };
}

function transformDbEntry(row: Record<string, unknown>): CallGuideEntry {
    return {
        id: row.id as string,
        startTime: Number(row.start_time),
        endTime: row.end_time ? Number(row.end_time) : undefined,
        type: row.type as CallType,
        text: row.text as string,
        textRomanized: row.text_romanized as string | undefined,
        textOriginal: row.text_original as string | undefined,
        instruction: row.instruction as string | undefined,
        intensity: row.intensity as 1 | 2 | 3 | undefined,
        // 작성자 & 도움됨
        createdBy: row.created_by as string | undefined,
        helpfulCount: (row.helpful_count as number) || 0,
    };
}

function transformDbCallGuide(
    row: Record<string, unknown>,
    entries: CallGuideEntry[] = [],
    song?: Song
): CallGuide {
    return {
        id: row.id as string,
        songId: row.song_id as string,
        song,
        entries,
        createdBy: row.created_by as string,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        version: row.version as number,
        contributors: (row.contributors as string[]) || [],
        status: row.status as CallGuideStatus,
        verifiedBy: row.verified_by as string | undefined,
        helpfulCount: (row.helpful_count as number) || 0,
    };
}

// ===== Song Query Functions =====

/**
 * 모든 곡 목록 조회
 */
export async function getSongs(options?: {
    artistId?: string;
    hasCallGuide?: boolean;
    limit?: number;
}): Promise<Song[]> {
    const supabase = createClient();

    let query = supabase
        .from("songs")
        .select("*")
        .order("title", { ascending: true });

    if (options?.artistId) {
        query = query.eq("artist_id", options.artistId);
    }

    if (options?.hasCallGuide !== undefined) {
        query = query.eq("has_call_guide", options.hasCallGuide);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
        console.error("[getSongs] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbSong);
}

/**
 * 곡 상세 조회
 */
export async function getSong(songId: string): Promise<Song | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("id", songId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null;
        console.error("[getSong] Error:", error);
        throw error;
    }

    return data ? transformDbSong(data) : null;
}

/**
 * YouTube ID로 곡 조회
 */
export async function getSongByYoutubeId(youtubeId: string): Promise<Song | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("youtube_id", youtubeId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null;
        console.error("[getSongByYoutubeId] Error:", error);
        throw error;
    }

    return data ? transformDbSong(data) : null;
}

/**
 * 곡 생성
 */
export async function createSong(input: CreateSongInput): Promise<Song> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("songs")
        .insert({
            title: input.title,
            artist_id: input.artistId,
            artist_name: input.artistName,
            youtube_id: input.youtubeId,
            duration: input.duration,
            thumbnail_url: input.thumbnailUrl || null,
            release_year: input.releaseYear || null,
            album: input.album || null,
            has_call_guide: false,
        })
        .select()
        .single();

    if (error) {
        console.error("[createSong] Error:", error);
        throw error;
    }

    return transformDbSong(data);
}

/**
 * 곡 검색
 */
export async function searchSongs(query: string, limit = 10): Promise<Song[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("songs")
        .select("*")
        .or(`title.ilike.%${query}%,artist_name.ilike.%${query}%`)
        .limit(limit);

    if (error) {
        console.error("[searchSongs] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbSong);
}

// ===== CallGuide Query Functions =====

/**
 * 콜가이드 목록 조회
 */
export async function getCallGuides(options?: {
    status?: CallGuideStatus;
    limit?: number;
}): Promise<CallGuide[]> {
    const supabase = createClient();

    let query = supabase
        .from("call_guides")
        .select("*, songs(*)")
        .order("updated_at", { ascending: false });

    if (options?.status) {
        query = query.eq("status", options.status);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
        console.error("[getCallGuides] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => {
        const song = row.songs ? transformDbSong(row.songs as Record<string, unknown>) : undefined;
        return transformDbCallGuide(row, [], song);
    });
}

/**
 * 곡별 콜가이드 조회 (엔트리 포함)
 */
export async function getCallGuideBySongId(songId: string): Promise<CallGuide | null> {
    const supabase = createClient();

    // 콜가이드 조회
    const { data: guideData, error: guideError } = await supabase
        .from("call_guides")
        .select("*, songs(*)")
        .eq("song_id", songId)
        .single();

    if (guideError) {
        if (guideError.code === "PGRST116") return null;
        console.error("[getCallGuideBySongId] Error:", guideError);
        throw guideError;
    }

    if (!guideData) return null;

    // 엔트리 조회
    const { data: entriesData, error: entriesError } = await supabase
        .from("call_guide_entries")
        .select("*")
        .eq("call_guide_id", guideData.id)
        .order("start_time", { ascending: true });

    if (entriesError) {
        console.error("[getCallGuideBySongId] Entries Error:", entriesError);
        throw entriesError;
    }

    const song = guideData.songs
        ? transformDbSong(guideData.songs as Record<string, unknown>)
        : undefined;
    const entries = (entriesData ?? []).map(transformDbEntry);

    return transformDbCallGuide(guideData, entries, song);
}

/**
 * 콜가이드 ID로 조회 (엔트리 포함)
 */
export async function getCallGuide(callGuideId: string): Promise<CallGuide | null> {
    const supabase = createClient();

    const { data: guideData, error: guideError } = await supabase
        .from("call_guides")
        .select("*, songs(*)")
        .eq("id", callGuideId)
        .single();

    if (guideError) {
        if (guideError.code === "PGRST116") return null;
        console.error("[getCallGuide] Error:", guideError);
        throw guideError;
    }

    if (!guideData) return null;

    const { data: entriesData, error: entriesError } = await supabase
        .from("call_guide_entries")
        .select("*")
        .eq("call_guide_id", callGuideId)
        .order("start_time", { ascending: true });

    if (entriesError) {
        console.error("[getCallGuide] Entries Error:", entriesError);
        throw entriesError;
    }

    const song = guideData.songs
        ? transformDbSong(guideData.songs as Record<string, unknown>)
        : undefined;
    const entries = (entriesData ?? []).map(transformDbEntry);

    return transformDbCallGuide(guideData, entries, song);
}

/**
 * 콜가이드 생성
 */
export async function createCallGuide(
    userId: string,
    songId: string
): Promise<CallGuide> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("call_guides")
        .insert({
            song_id: songId,
            created_by: userId,
            version: 1,
            status: "draft",
            contributors: [userId],
        })
        .select("*, songs(*)")
        .single();

    if (error) {
        console.error("[createCallGuide] Error:", error);
        throw error;
    }

    const song = data.songs
        ? transformDbSong(data.songs as Record<string, unknown>)
        : undefined;

    return transformDbCallGuide(data, [], song);
}

/**
 * 콜가이드 상태 변경
 */
export async function updateCallGuideStatus(
    callGuideId: string,
    status: CallGuideStatus,
    verifiedBy?: string
): Promise<void> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = { status };
    if (status === "verified" && verifiedBy) {
        updateData.verified_by = verifiedBy;
    }

    const { error } = await supabase
        .from("call_guides")
        .update(updateData)
        .eq("id", callGuideId);

    if (error) {
        console.error("[updateCallGuideStatus] Error:", error);
        throw error;
    }
}

/**
 * 콜가이드 삭제
 */
export async function deleteCallGuide(callGuideId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("call_guides")
        .delete()
        .eq("id", callGuideId);

    if (error) {
        console.error("[deleteCallGuide] Error:", error);
        throw error;
    }
}

// ===== CallGuideEntry Query Functions =====

/**
 * 엔트리 추가
 */
export async function addCallGuideEntry(
    callGuideId: string,
    input: CreateCallGuideEntryInput
): Promise<CallGuideEntry> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("call_guide_entries")
        .insert({
            call_guide_id: callGuideId,
            start_time: input.startTime,
            end_time: input.endTime || null,
            type: input.type,
            text: input.text,
            text_romanized: input.textRomanized || null,
            text_original: input.textOriginal || null,
            instruction: input.instruction || null,
            intensity: input.intensity || null,
        })
        .select()
        .single();

    if (error) {
        console.error("[addCallGuideEntry] Error:", error);
        throw error;
    }

    return transformDbEntry(data);
}

/**
 * 엔트리 수정
 */
export async function updateCallGuideEntry(
    entryId: string,
    input: Partial<CreateCallGuideEntryInput>
): Promise<CallGuideEntry> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};
    if (input.startTime !== undefined) updateData.start_time = input.startTime;
    if (input.endTime !== undefined) updateData.end_time = input.endTime || null;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.text !== undefined) updateData.text = input.text;
    if (input.textRomanized !== undefined) updateData.text_romanized = input.textRomanized || null;
    if (input.textOriginal !== undefined) updateData.text_original = input.textOriginal || null;
    if (input.instruction !== undefined) updateData.instruction = input.instruction || null;
    if (input.intensity !== undefined) updateData.intensity = input.intensity || null;

    const { data, error } = await supabase
        .from("call_guide_entries")
        .update(updateData)
        .eq("id", entryId)
        .select()
        .single();

    if (error) {
        console.error("[updateCallGuideEntry] Error:", error);
        throw error;
    }

    return transformDbEntry(data);
}

/**
 * 엔트리 삭제
 */
export async function deleteCallGuideEntry(entryId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("call_guide_entries")
        .delete()
        .eq("id", entryId);

    if (error) {
        console.error("[deleteCallGuideEntry] Error:", error);
        throw error;
    }
}

/**
 * 엔트리 일괄 교체 (버전 업 시)
 */
export async function replaceCallGuideEntries(
    callGuideId: string,
    entries: CreateCallGuideEntryInput[]
): Promise<CallGuideEntry[]> {
    const supabase = createClient();

    // 기존 엔트리 삭제
    const { error: deleteError } = await supabase
        .from("call_guide_entries")
        .delete()
        .eq("call_guide_id", callGuideId);

    if (deleteError) {
        console.error("[replaceCallGuideEntries] Delete Error:", deleteError);
        throw deleteError;
    }

    if (entries.length === 0) {
        return [];
    }

    // 새 엔트리 삽입
    const insertData = entries.map((entry, index) => ({
        call_guide_id: callGuideId,
        start_time: entry.startTime,
        end_time: entry.endTime || null,
        type: entry.type,
        text: entry.text,
        text_romanized: entry.textRomanized || null,
        text_original: entry.textOriginal || null,
        instruction: entry.instruction || null,
        intensity: entry.intensity || null,
        display_order: index,
    }));

    const { data, error } = await supabase
        .from("call_guide_entries")
        .insert(insertData)
        .select();

    if (error) {
        console.error("[replaceCallGuideEntries] Insert Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbEntry);
}

// ===== Version History =====

/**
 * 버전 히스토리 저장
 */
export async function saveCallGuideVersion(
    callGuideId: string,
    version: number,
    entries: CallGuideEntry[],
    editedBy: string,
    changeDescription?: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("call_guide_versions")
        .insert({
            call_guide_id: callGuideId,
            version,
            entries: JSON.stringify(entries),
            edited_by: editedBy,
            change_description: changeDescription || null,
        });

    if (error) {
        console.error("[saveCallGuideVersion] Error:", error);
        throw error;
    }

    // 콜가이드 버전 증가
    const { error: updateError } = await supabase
        .from("call_guides")
        .update({ version: version + 1 })
        .eq("id", callGuideId);

    if (updateError) {
        console.error("[saveCallGuideVersion] Version Update Error:", updateError);
        throw updateError;
    }
}

/**
 * 버전 히스토리 조회
 */
export async function getCallGuideVersions(
    callGuideId: string
): Promise<Array<{
    id: string;
    version: number;
    editedBy: string;
    editedAt: Date;
    changeDescription?: string;
}>> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("call_guide_versions")
        .select("id, version, edited_by, created_at, change_description")
        .eq("call_guide_id", callGuideId)
        .order("version", { ascending: false });

    if (error) {
        console.error("[getCallGuideVersions] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => ({
        id: row.id as string,
        version: row.version as number,
        editedBy: row.edited_by as string,
        editedAt: new Date(row.created_at as string),
        changeDescription: row.change_description as string | undefined,
    }));
}

// ===== Reactions =====

/**
 * 콜가이드 도움됨 토글
 *
 * 참고: DB 트리거가 call_guide_reactions INSERT/DELETE 시
 * call_guides.helpful_count를 자동으로 업데이트합니다.
 *
 * @returns { isHelpful: boolean, newCount: number } - 현재 도움됨 상태와 새 카운트
 */
export async function toggleCallGuideReaction(
    userId: string,
    callGuideId: string
): Promise<{ isHelpful: boolean; newCount: number }> {
    const supabase = createClient();

    // 기존 반응 확인
    const { data: existing, error: checkError } = await supabase
        .from("call_guide_reactions")
        .select("user_id")
        .eq("user_id", userId)
        .eq("call_guide_id", callGuideId)
        .single();

    if (checkError && checkError.code !== "PGRST116") {
        console.error("[toggleCallGuideReaction] Check Error:", checkError);
        throw checkError;
    }

    if (existing) {
        // 반응 제거 (트리거가 helpful_count를 -1)
        const { error } = await supabase
            .from("call_guide_reactions")
            .delete()
            .eq("user_id", userId)
            .eq("call_guide_id", callGuideId);

        if (error) {
            console.error("[toggleCallGuideReaction] Delete Error:", error);
            throw error;
        }

        // 업데이트된 카운트 조회
        const { data: guide, error: fetchError } = await supabase
            .from("call_guides")
            .select("helpful_count")
            .eq("id", callGuideId)
            .single();

        if (fetchError) {
            console.error("[toggleCallGuideReaction] Fetch Error:", fetchError);
            return { isHelpful: false, newCount: 0 };
        }

        return { isHelpful: false, newCount: (guide?.helpful_count as number) || 0 };
    } else {
        // 반응 추가 (트리거가 helpful_count를 +1)
        const { error } = await supabase
            .from("call_guide_reactions")
            .insert({
                user_id: userId,
                call_guide_id: callGuideId,
                reaction_type: "helpful",
            });

        if (error) {
            console.error("[toggleCallGuideReaction] Insert Error:", error);
            throw error;
        }

        // 업데이트된 카운트 조회
        const { data: guide, error: fetchError } = await supabase
            .from("call_guides")
            .select("helpful_count")
            .eq("id", callGuideId)
            .single();

        if (fetchError) {
            console.error("[toggleCallGuideReaction] Fetch Error:", fetchError);
            return { isHelpful: true, newCount: 0 };
        }

        return { isHelpful: true, newCount: (guide?.helpful_count as number) || 0 };
    }
}

/**
 * 사용자의 콜가이드 반응 목록 조회
 */
export async function getUserCallGuideReactions(
    userId: string
): Promise<string[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("call_guide_reactions")
        .select("call_guide_id")
        .eq("user_id", userId);

    if (error) {
        console.error("[getUserCallGuideReactions] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => row.call_guide_id as string);
}

// ===== Entry Reactions =====

/**
 * 콜가이드 엔트리 도움됨 토글
 *
 * @returns { isHelpful: boolean, newCount: number } - 현재 도움됨 상태와 새 카운트
 */
export async function toggleEntryReaction(
    userId: string,
    entryId: string
): Promise<{ isHelpful: boolean; newCount: number }> {
    const supabase = createClient();

    // 기존 반응 확인
    const { data: existing, error: checkError } = await supabase
        .from("call_guide_entry_reactions")
        .select("user_id")
        .eq("user_id", userId)
        .eq("entry_id", entryId)
        .single();

    if (checkError && checkError.code !== "PGRST116") {
        console.error("[toggleEntryReaction] Check Error:", checkError);
        throw checkError;
    }

    if (existing) {
        // 반응 제거 (트리거가 helpful_count를 -1)
        const { error } = await supabase
            .from("call_guide_entry_reactions")
            .delete()
            .eq("user_id", userId)
            .eq("entry_id", entryId);

        if (error) {
            console.error("[toggleEntryReaction] Delete Error:", error);
            throw error;
        }

        // 업데이트된 카운트 조회
        const { data: entry, error: fetchError } = await supabase
            .from("call_guide_entries")
            .select("helpful_count")
            .eq("id", entryId)
            .single();

        if (fetchError) {
            console.error("[toggleEntryReaction] Fetch Error:", fetchError);
            return { isHelpful: false, newCount: 0 };
        }

        return { isHelpful: false, newCount: (entry?.helpful_count as number) || 0 };
    } else {
        // 반응 추가 (트리거가 helpful_count를 +1)
        const { error } = await supabase
            .from("call_guide_entry_reactions")
            .insert({
                user_id: userId,
                entry_id: entryId,
                reaction_type: "helpful",
            });

        if (error) {
            console.error("[toggleEntryReaction] Insert Error:", error);
            throw error;
        }

        // 업데이트된 카운트 조회
        const { data: entry, error: fetchError } = await supabase
            .from("call_guide_entries")
            .select("helpful_count")
            .eq("id", entryId)
            .single();

        if (fetchError) {
            console.error("[toggleEntryReaction] Fetch Error:", fetchError);
            return { isHelpful: true, newCount: 0 };
        }

        return { isHelpful: true, newCount: (entry?.helpful_count as number) || 0 };
    }
}

/**
 * 사용자의 엔트리별 반응 목록 조회
 *
 * 참고: call_guide_entry_reactions 테이블이 마이그레이션 전이면 빈 배열 반환
 */
export async function getUserEntryReactions(
    userId: string
): Promise<string[]> {
    const supabase = createClient();

    try {
        const { data, error } = await supabase
            .from("call_guide_entry_reactions")
            .select("entry_id")
            .eq("user_id", userId);

        if (error) {
            // 테이블이 없거나 권한 문제 등 → 빈 배열 반환 (graceful degradation)
            console.warn("[getUserEntryReactions] Error (returning empty):", error.code, error.message);
            return [];
        }

        return (data ?? []).map((row) => row.entry_id as string);
    } catch (e) {
        console.warn("[getUserEntryReactions] Exception (returning empty):", e);
        return [];
    }
}
