"use client";

import { useState, useCallback, useMemo } from "react";
import { X, Search, ChevronDown, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageUploader } from "@/components/image/ImageUploader";
import { UploadedImage } from "@/types/image";
import { TicketInput } from "@/types/ticketbook";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { useWishlist } from "@/lib/wishlist-context";
import { TicketEditorModal } from "./TicketEditorModal";

interface TicketUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: TicketInput) => void;
}

/**
 * 티켓 등록 모달
 */
export function TicketUploadModal({
  isOpen,
  onClose,
  onSubmit,
}: TicketUploadModalProps) {
  // 이미지 상태
  const [frontImages, setFrontImages] = useState<UploadedImage[]>([]);
  const [backImages, setBackImages] = useState<UploadedImage[]>([]);

  // 행사 선택
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [showEventDropdown, setShowEventDropdown] = useState(false);

  // 메타데이터
  const [memo, setMemo] = useState("");
  const [seat, setSeat] = useState("");
  const [companion, setCompanion] = useState("");

  // 에디터 모달 상태
  const [showEditor, setShowEditor] = useState(false);
  const [editingImageType, setEditingImageType] = useState<"front" | "back">("front");

  // 다녀온 행사 우선 표시를 위한 wishlist context
  const { attended } = useWishlist();

  // 다녀온 행사 목록 (상단에 표시)
  const attendedEvents = useMemo(() => {
    return MOCK_EVENTS.filter((e) => attended.has(e.id));
  }, [attended]);

  // 검색된 행사 목록
  const filteredEvents = useMemo(() => {
    if (!eventSearchQuery.trim()) {
      // 검색어가 없으면 다녀온 행사만 표시
      return attendedEvents;
    }
    const query = eventSearchQuery.toLowerCase();
    return MOCK_EVENTS.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.venue.name.toLowerCase().includes(query)
    );
  }, [eventSearchQuery, attendedEvents]);

  // 선택된 행사 정보
  const selectedEvent = useMemo(() => {
    return MOCK_EVENTS.find((e) => e.id === selectedEventId);
  }, [selectedEventId]);

  // 폼 유효성
  const isValid = frontImages.length > 0 && selectedEventId;

  // 초기화
  const resetForm = useCallback(() => {
    setFrontImages([]);
    setBackImages([]);
    setSelectedEventId("");
    setEventSearchQuery("");
    setMemo("");
    setSeat("");
    setCompanion("");
    setShowEditor(false);
  }, []);

  // 에디터 열기
  const handleOpenEditor = useCallback((type: "front" | "back") => {
    setEditingImageType(type);
    setShowEditor(true);
  }, []);

  // 에디터 완료 (편집된 이미지로 교체)
  const handleEditorComplete = useCallback((resultDataUrl: string) => {
    const editedImage: UploadedImage = {
      id: `edited-${Date.now()}`,
      url: resultDataUrl,
      thumbnailUrl: resultDataUrl,
      width: 800,
      height: 1200,
      fileName: "edited-ticket.png",
      fileSize: resultDataUrl.length,
      mimeType: "image/png",
      uploadedAt: new Date(),
      storageType: "local",
    };

    if (editingImageType === "front") {
      setFrontImages([editedImage]);
    } else {
      setBackImages([editedImage]);
    }
    setShowEditor(false);
  }, [editingImageType]);

  // 현재 편집 중인 이미지 URL
  const editingImageUrl = useMemo(() => {
    const images = editingImageType === "front" ? frontImages : backImages;
    return images[0]?.url || "";
  }, [editingImageType, frontImages, backImages]);

  // 제출
  const handleSubmit = useCallback(() => {
    if (!isValid || !selectedEvent) return;

    const frontImage = frontImages[0];
    const backImage = backImages[0];

    const input: TicketInput = {
      frontImageUrl: frontImage.url,
      frontThumbnailUrl: frontImage.thumbnailUrl || frontImage.url,
      frontWidth: frontImage.width || 800,
      frontHeight: frontImage.height || 1200,
      backImageUrl: backImage?.url,
      backThumbnailUrl: backImage?.thumbnailUrl,
      backWidth: backImage?.width,
      backHeight: backImage?.height,
      eventId: selectedEvent.id,
      eventTitle: selectedEvent.title,
      eventDate: selectedEvent.startAt,
      memo: memo.trim() || undefined,
      seat: seat.trim() || undefined,
      companion: companion.trim() || undefined,
    };

    onSubmit(input);
    resetForm();
    onClose();
  }, [
    isValid,
    selectedEvent,
    frontImages,
    backImages,
    memo,
    seat,
    companion,
    onSubmit,
    resetForm,
    onClose,
  ]);

  // 닫기
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">티켓 등록</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 앞면 이미지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              티켓 앞면 <span className="text-red-500">*</span>
            </label>
            <ImageUploader
              images={frontImages}
              onChange={setFrontImages}
              maxImages={1}
              uploadOptions={{
                maxWidth: 1200,
                maxHeight: 1800,
                quality: 0.9,
              }}
            />
            {frontImages.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenEditor("front")}
                className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <Wand2 className="h-4 w-4" />
                티켓 편집 (기울기 보정 + 템플릿)
              </button>
            )}
          </div>

          {/* 뒷면 이미지 (선택) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              티켓 뒷면 <span className="text-gray-400">(선택)</span>
            </label>
            <ImageUploader
              images={backImages}
              onChange={setBackImages}
              maxImages={1}
              uploadOptions={{
                maxWidth: 1200,
                maxHeight: 1800,
                quality: 0.9,
              }}
            />
            {backImages.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenEditor("back")}
                className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <Wand2 className="h-4 w-4" />
                티켓 편집 (기울기 보정 + 템플릿)
              </button>
            )}
          </div>

          {/* 행사 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연결할 행사 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEventDropdown((prev) => !prev)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 border rounded-lg text-left transition-colors",
                  selectedEvent
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-300 hover:border-gray-400"
                )}
              >
                {selectedEvent ? (
                  <span className="font-medium truncate">
                    {selectedEvent.title}
                  </span>
                ) : (
                  <span className="text-gray-400">행사를 선택하세요</span>
                )}
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-gray-400 transition-transform",
                    showEventDropdown && "transform rotate-180"
                  )}
                />
              </button>

              {/* 드롭다운 */}
              {showEventDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                  {/* 검색 */}
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={eventSearchQuery}
                        onChange={(e) => setEventSearchQuery(e.target.value)}
                        placeholder="행사명으로 검색..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* 행사 목록 */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredEvents.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        {eventSearchQuery
                          ? "검색 결과가 없습니다"
                          : "다녀온 행사가 없습니다"}
                      </div>
                    ) : (
                      filteredEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => {
                            setSelectedEventId(event.id);
                            setShowEventDropdown(false);
                            setEventSearchQuery("");
                          }}
                          className={cn(
                            "w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0",
                            selectedEventId === event.id && "bg-purple-50"
                          )}
                        >
                          <div className="font-medium text-sm line-clamp-1">
                            {event.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {event.startAt.toLocaleDateString("ko-KR")} •{" "}
                            {event.venue.name}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 좌석 정보 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              좌석 정보 <span className="text-gray-400">(선택)</span>
            </label>
            <input
              type="text"
              value={seat}
              onChange={(e) => setSeat(e.target.value)}
              placeholder="예: VIP A구역 12열 5번"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 동행자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              동행자 <span className="text-gray-400">(선택)</span>
            </label>
            <input
              type="text"
              value={companion}
              onChange={(e) => setCompanion(e.target.value)}
              placeholder="예: 친구 2명"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메모 <span className="text-gray-400">(선택)</span>
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="공연 감상, 기억하고 싶은 순간 등..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={cn(
              "w-full py-3 rounded-lg font-medium transition-colors",
              isValid
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            등록하기
          </button>
        </div>
      </div>

      {/* 티켓 에디터 모달 */}
      {editingImageUrl && (
        <TicketEditorModal
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          imageUrl={editingImageUrl}
          onComplete={handleEditorComplete}
        />
      )}
    </div>
  );
}
