"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { useDevContext } from "./dev-context";
import { useAuth } from "./auth-context";
import {
  Ticket,
  TicketBook,
  TicketInput,
  TicketSortBy,
  TicketSortOrder,
  SerializedTicketBook,
  serializeTicketBook,
  deserializeTicketBook,
} from "@/types/ticketbook";
import { createUserAdapter, DOMAINS } from "./storage";
import { isValidUUID } from "./utils";
import {
  getUserTickets,
  createTicket as createTicketDb,
  updateTicket as updateTicketDb,
  deleteTicket as deleteTicketDb,
  DbTicket,
} from "./supabase/queries";

interface TicketBookContextType {
  // 티켓 목록
  tickets: Ticket[];
  // 정렬 설정
  sortBy: TicketSortBy;
  sortOrder: TicketSortOrder;
  // 티켓 추가
  addTicket: (input: TicketInput) => Ticket;
  // 티켓 수정
  updateTicket: (id: string, updates: Partial<TicketInput>) => void;
  // 티켓 삭제
  deleteTicket: (id: string) => void;
  // 티켓 조회
  getTicket: (id: string) => Ticket | undefined;
  // 행사별 티켓 조회
  getTicketsByEvent: (eventId: string) => Ticket[];
  // 정렬 변경
  setSortBy: (sortBy: TicketSortBy) => void;
  setSortOrder: (sortOrder: TicketSortOrder) => void;
  // 정렬된 티켓 목록
  sortedTickets: Ticket[];
  // 로딩 상태
  isLoading: boolean;
  // Supabase 연동 여부
  isFromSupabase: boolean;
}

const TicketBookContext = createContext<TicketBookContextType | undefined>(
  undefined
);

// Storage adapter factory (userId 기반) - Dev 모드용
// SerializedTicketBook을 저장하고 읽음 (Date 직렬화된 형태)
const createTicketBookAdapter = createUserAdapter<SerializedTicketBook>({
  domain: DOMAINS.TICKETBOOK,
});

// 기본 티켓북 상태
const DEFAULT_TICKETBOOK: TicketBook = {
  tickets: [],
  sortBy: "date",
  sortOrder: "desc",
};

// 샘플 티켓 데이터 (user1용)
const MOCK_TICKETS: Ticket[] = [
  {
    id: "ticket_1",
    frontImage: {
      id: "img_1_front",
      url: "/images/tickets/sample-ticket-1.jpg",
      thumbnailUrl: "/images/tickets/sample-ticket-1-thumb.jpg",
      width: 800,
      height: 1200,
    },
    eventId: "24016943",
    eventTitle: "2024 IU Concert 'The Winning'",
    eventDate: new Date("2024-03-15"),
    memo: "생일 기념 공연! 최고의 무대였다 💜",
    seat: "VIP A구역 12열 5번",
    companion: "친구 2명",
    createdAt: new Date("2024-03-16"),
    updatedAt: new Date("2024-03-16"),
  },
  {
    id: "ticket_2",
    frontImage: {
      id: "img_2_front",
      url: "/images/tickets/sample-ticket-2.jpg",
      thumbnailUrl: "/images/tickets/sample-ticket-2-thumb.jpg",
      width: 800,
      height: 1200,
    },
    backImage: {
      id: "img_2_back",
      url: "/images/tickets/sample-ticket-2-back.jpg",
      thumbnailUrl: "/images/tickets/sample-ticket-2-back-thumb.jpg",
      width: 800,
      height: 1200,
    },
    eventId: "e2",
    eventTitle: "서울재즈페스티벌 2025",
    eventDate: new Date("2025-05-24"),
    memo: "비 왔지만 분위기 최고",
    seat: "자유석",
    createdAt: new Date("2025-05-25"),
    updatedAt: new Date("2025-05-25"),
  },
];

// ID 생성 유틸리티
function generateTicketId(): string {
  return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * DB 티켓을 Context 타입으로 변환
 */
function transformDbToTicket(db: DbTicket): Ticket {
  return {
    id: db.id,
    frontImage: {
      id: db.frontImage.id,
      url: db.frontImage.url,
      thumbnailUrl: db.frontImage.thumbnailUrl || db.frontImage.url,
      width: db.frontImage.width || 800,
      height: db.frontImage.height || 1200,
    },
    backImage: db.backImage
      ? {
          id: db.backImage.id,
          url: db.backImage.url,
          thumbnailUrl: db.backImage.thumbnailUrl || db.backImage.url,
          width: db.backImage.width || 800,
          height: db.backImage.height || 1200,
        }
      : undefined,
    eventId: db.eventId || "",
    eventTitle: db.eventTitle,
    eventDate: db.eventDate,
    memo: db.memo,
    seat: db.seat,
    companion: db.companion,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  };
}

export function TicketBookProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();

  // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드 또는 비로그인
  const realUserId = authUser?.id;
  const isRealUser = !!realUserId;

  // Dev 모드에서 mockUserId 사용
  const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

  // 최종 사용자 ID (실제 > Dev > null)
  const currentUserId = realUserId || devUserId;

  const [ticketBook, setTicketBook] = useState<TicketBook>(DEFAULT_TICKETBOOK);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromSupabase, setIsFromSupabase] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(
    undefined
  );

  // Storage adapter (userId 변경 시 재생성) - Dev 모드용
  const ticketBookAdapter = useMemo(
    () => (currentUserId && !isRealUser) ? createTicketBookAdapter(currentUserId) : null,
    [currentUserId, isRealUser]
  );

  // 사용자 변경 또는 초기 로드 시 데이터 로드
  useEffect(() => {
    if (loadedUserId !== currentUserId) {
      // 비로그인 시에는 빈 데이터
      if (!currentUserId) {
        setTicketBook(DEFAULT_TICKETBOOK);
        setLoadedUserId(currentUserId);
        setIsFromSupabase(false);
        return;
      }

      // 실제 사용자: Supabase에서 로드
      if (isRealUser && realUserId) {
        setIsLoading(true);
        getUserTickets(realUserId)
          .then((dbTickets) => {
            setTicketBook({
              tickets: dbTickets.map(transformDbToTicket),
              sortBy: "date",
              sortOrder: "desc",
            });
            setIsFromSupabase(true);
          })
          .catch((error) => {
            console.error("[TicketBookContext] Supabase load failed:", error);
            setTicketBook(DEFAULT_TICKETBOOK);
            setIsFromSupabase(false);
          })
          .finally(() => {
            setIsLoading(false);
            setLoadedUserId(currentUserId);
          });
        return;
      }

      // Dev 모드: localStorage에서 로드
      if (ticketBookAdapter) {
        const saved = ticketBookAdapter.get();
        if (saved) {
          setTicketBook(deserializeTicketBook(saved));
        } else {
          // 저장된 데이터가 없으면 user1에게만 Mock 데이터 제공
          if (currentUserId === "user1") {
            setTicketBook({
              tickets: MOCK_TICKETS,
              sortBy: "date",
              sortOrder: "desc",
            });
          } else {
            setTicketBook(DEFAULT_TICKETBOOK);
          }
        }
      }

      setLoadedUserId(currentUserId);
      setIsFromSupabase(false);
    }
  }, [currentUserId, isRealUser, realUserId, loadedUserId, ticketBookAdapter]);

  // Storage에 저장 (Dev 모드에서만)
  const saveToStorage = useCallback((book: TicketBook) => {
    if (!currentUserId || isRealUser || !ticketBookAdapter) return;
    const serialized = serializeTicketBook(book);
    ticketBookAdapter.set(serialized);
  }, [currentUserId, isRealUser, ticketBookAdapter]);

  // 티켓 추가
  const addTicket = useCallback((input: TicketInput): Ticket => {
    const now = new Date();
    const tempId = generateTicketId();
    const newTicket: Ticket = {
      id: tempId,
      frontImage: {
        id: generateImageId(),
        url: input.frontImageUrl,
        thumbnailUrl: input.frontThumbnailUrl,
        width: input.frontWidth,
        height: input.frontHeight,
      },
      backImage: input.backImageUrl
        ? {
            id: generateImageId(),
            url: input.backImageUrl,
            thumbnailUrl: input.backThumbnailUrl || input.backImageUrl,
            width: input.backWidth || input.frontWidth,
            height: input.backHeight || input.frontHeight,
          }
        : undefined,
      eventId: input.eventId,
      eventTitle: input.eventTitle,
      eventDate: input.eventDate,
      memo: input.memo,
      seat: input.seat,
      companion: input.companion,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    setTicketBook((prev) => ({
      ...prev,
      tickets: [newTicket, ...prev.tickets],
    }));

    // 로그인 시 Supabase에 저장
    if (isRealUser && realUserId) {
      createTicketDb(realUserId, {
        eventId: input.eventId && isValidUUID(input.eventId) ? input.eventId : undefined,
        eventTitle: input.eventTitle,
        eventDate: input.eventDate,
        frontImageUrl: input.frontImageUrl,
        frontThumbnailUrl: input.frontThumbnailUrl,
        frontWidth: input.frontWidth,
        frontHeight: input.frontHeight,
        backImageUrl: input.backImageUrl,
        backThumbnailUrl: input.backThumbnailUrl,
        backWidth: input.backWidth,
        backHeight: input.backHeight,
        memo: input.memo,
        seat: input.seat,
        companion: input.companion,
      })
        .then((dbTicket) => {
          // DB에서 반환된 실제 ID로 교체
          setTicketBook((prev) => ({
            ...prev,
            tickets: prev.tickets.map((t) =>
              t.id === tempId ? transformDbToTicket(dbTicket) : t
            ),
          }));
        })
        .catch((error) => {
          console.error("[TicketBookContext] addTicket failed:", error);
          // 롤백
          setTicketBook((prev) => ({
            ...prev,
            tickets: prev.tickets.filter((t) => t.id !== tempId),
          }));
        });
    } else {
      // Dev 모드: localStorage에 저장
      saveToStorage({
        ...ticketBook,
        tickets: [newTicket, ...ticketBook.tickets],
      });
    }

    return newTicket;
  }, [isRealUser, realUserId, ticketBook, saveToStorage]);

  // 티켓 수정
  const updateTicketFn = useCallback(
    (id: string, updates: Partial<TicketInput>) => {
      const originalTicket = ticketBook.tickets.find((t) => t.id === id);
      if (!originalTicket) return;

      // 수정된 티켓 생성
      const createUpdatedTicket = (ticket: Ticket): Ticket => {
        const updatedTicket: Ticket = {
          ...ticket,
          updatedAt: new Date(),
        };

        if (updates.frontImageUrl !== undefined) {
          updatedTicket.frontImage = {
            id: ticket.frontImage.id,
            url: updates.frontImageUrl,
            thumbnailUrl:
              updates.frontThumbnailUrl || updates.frontImageUrl,
            width: updates.frontWidth || ticket.frontImage.width,
            height: updates.frontHeight || ticket.frontImage.height,
          };
        }

        if (updates.backImageUrl !== undefined) {
          if (updates.backImageUrl) {
            updatedTicket.backImage = {
              id: ticket.backImage?.id || generateImageId(),
              url: updates.backImageUrl,
              thumbnailUrl:
                updates.backThumbnailUrl || updates.backImageUrl,
              width: updates.backWidth || ticket.frontImage.width,
              height: updates.backHeight || ticket.frontImage.height,
            };
          } else {
            updatedTicket.backImage = undefined;
          }
        }

        if (updates.eventId !== undefined) updatedTicket.eventId = updates.eventId;
        if (updates.eventTitle !== undefined) updatedTicket.eventTitle = updates.eventTitle;
        if (updates.eventDate !== undefined) updatedTicket.eventDate = updates.eventDate;
        if (updates.memo !== undefined) updatedTicket.memo = updates.memo;
        if (updates.seat !== undefined) updatedTicket.seat = updates.seat;
        if (updates.companion !== undefined) updatedTicket.companion = updates.companion;

        return updatedTicket;
      };

      // Optimistic update
      setTicketBook((prev) => ({
        ...prev,
        tickets: prev.tickets.map((ticket) =>
          ticket.id === id ? createUpdatedTicket(ticket) : ticket
        ),
      }));

      // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
      if (isRealUser && realUserId && isValidUUID(id)) {
        updateTicketDb(id, {
          eventTitle: updates.eventTitle,
          eventDate: updates.eventDate,
          frontImageUrl: updates.frontImageUrl,
          frontThumbnailUrl: updates.frontThumbnailUrl,
          frontWidth: updates.frontWidth,
          frontHeight: updates.frontHeight,
          backImageUrl: updates.backImageUrl,
          backThumbnailUrl: updates.backThumbnailUrl,
          backWidth: updates.backWidth,
          backHeight: updates.backHeight,
          memo: updates.memo,
          seat: updates.seat,
          companion: updates.companion,
        }).catch((error) => {
          console.error("[TicketBookContext] updateTicket failed:", error);
          // 롤백
          setTicketBook((prev) => ({
            ...prev,
            tickets: prev.tickets.map((t) =>
              t.id === id ? originalTicket : t
            ),
          }));
        });
      } else {
        // Dev 모드: localStorage에 저장
        const updated = {
          ...ticketBook,
          tickets: ticketBook.tickets.map((ticket) =>
            ticket.id === id ? createUpdatedTicket(ticket) : ticket
          ),
        };
        saveToStorage(updated);
      }
    },
    [ticketBook, isRealUser, realUserId, saveToStorage]
  );

  // 티켓 삭제
  const deleteTicketFn = useCallback((id: string) => {
    const originalTicket = ticketBook.tickets.find((t) => t.id === id);
    if (!originalTicket) return;

    // Optimistic update
    setTicketBook((prev) => ({
      ...prev,
      tickets: prev.tickets.filter((t) => t.id !== id),
    }));

    // 로그인 + 유효한 UUID인 경우에만 Supabase에서 삭제
    if (isRealUser && realUserId && isValidUUID(id)) {
      deleteTicketDb(id).catch((error) => {
        console.error("[TicketBookContext] deleteTicket failed:", error);
        // 롤백
        setTicketBook((prev) => ({
          ...prev,
          tickets: [...prev.tickets, originalTicket],
        }));
      });
    } else {
      // Dev 모드: localStorage에 저장
      saveToStorage({
        ...ticketBook,
        tickets: ticketBook.tickets.filter((t) => t.id !== id),
      });
    }
  }, [ticketBook, isRealUser, realUserId, saveToStorage]);

  // 티켓 조회
  const getTicket = useCallback(
    (id: string): Ticket | undefined => {
      return ticketBook.tickets.find((t) => t.id === id);
    },
    [ticketBook.tickets]
  );

  // 행사별 티켓 조회
  const getTicketsByEvent = useCallback(
    (eventId: string): Ticket[] => {
      return ticketBook.tickets.filter((t) => t.eventId === eventId);
    },
    [ticketBook.tickets]
  );

  // 정렬 설정
  const setSortBy = useCallback((sortBy: TicketSortBy) => {
    setTicketBook((prev) => {
      const updated = { ...prev, sortBy };
      if (!isRealUser) saveToStorage(updated);
      return updated;
    });
  }, [isRealUser, saveToStorage]);

  const setSortOrder = useCallback((sortOrder: TicketSortOrder) => {
    setTicketBook((prev) => {
      const updated = { ...prev, sortOrder };
      if (!isRealUser) saveToStorage(updated);
      return updated;
    });
  }, [isRealUser, saveToStorage]);

  // 정렬된 티켓 목록
  const sortedTickets = useMemo(() => {
    return [...ticketBook.tickets].sort((a, b) => {
      let comparison = 0;

      switch (ticketBook.sortBy) {
        case "date":
          comparison = a.eventDate.getTime() - b.eventDate.getTime();
          break;
        case "event":
          comparison = a.eventTitle.localeCompare(b.eventTitle, "ko");
          break;
        case "added":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }

      return ticketBook.sortOrder === "asc" ? comparison : -comparison;
    });
  }, [ticketBook.tickets, ticketBook.sortBy, ticketBook.sortOrder]);

  const value = useMemo(() => ({
    tickets: ticketBook.tickets,
    sortBy: ticketBook.sortBy,
    sortOrder: ticketBook.sortOrder,
    addTicket,
    updateTicket: updateTicketFn,
    deleteTicket: deleteTicketFn,
    getTicket,
    getTicketsByEvent,
    setSortBy,
    setSortOrder,
    sortedTickets,
    isLoading,
    isFromSupabase,
  }), [
    ticketBook.tickets,
    ticketBook.sortBy,
    ticketBook.sortOrder,
    addTicket,
    updateTicketFn,
    deleteTicketFn,
    getTicket,
    getTicketsByEvent,
    setSortBy,
    setSortOrder,
    sortedTickets,
    isLoading,
    isFromSupabase,
  ]);

  return (
    <TicketBookContext.Provider value={value}>
      {children}
    </TicketBookContext.Provider>
  );
}

export function useTicketBook() {
  const context = useContext(TicketBookContext);
  if (context === undefined) {
    throw new Error("useTicketBook must be used within a TicketBookProvider");
  }
  return context;
}
