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
}

const TicketBookContext = createContext<TicketBookContextType | undefined>(
  undefined
);

// Storage adapter factory (userId 기반)
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

export function TicketBookProvider({ children }: { children: ReactNode }) {
  const { mockUserId, isLoggedIn } = useDevContext();
  const currentUserId = isLoggedIn ? mockUserId || "user1" : null;

  const [ticketBook, setTicketBook] = useState<TicketBook>(DEFAULT_TICKETBOOK);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(
    undefined
  );

  // Storage adapter (userId 변경 시 재생성)
  const ticketBookAdapter = useMemo(
    () => currentUserId ? createTicketBookAdapter(currentUserId) : null,
    [currentUserId]
  );

  // 사용자 변경 또는 초기 로드 시 storage에서 로드
  useEffect(() => {
    if (loadedUserId !== currentUserId) {
      // 비로그인 시에는 빈 데이터
      if (!currentUserId || !ticketBookAdapter) {
        setTicketBook(DEFAULT_TICKETBOOK);
        setLoadedUserId(currentUserId);
        setIsLoaded(true);
        return;
      }

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

      setLoadedUserId(currentUserId);
      setIsLoaded(true);
    }
  }, [currentUserId, loadedUserId, ticketBookAdapter]);

  // Storage에 저장
  useEffect(() => {
    if (!isLoaded || loadedUserId !== currentUserId || !ticketBookAdapter) return;

    const serialized = serializeTicketBook(ticketBook);
    ticketBookAdapter.set(serialized);
  }, [ticketBook, isLoaded, currentUserId, loadedUserId, ticketBookAdapter]);

  // 티켓 추가
  const addTicket = useCallback((input: TicketInput): Ticket => {
    const now = new Date();
    const newTicket: Ticket = {
      id: generateTicketId(),
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

    setTicketBook((prev) => ({
      ...prev,
      tickets: [newTicket, ...prev.tickets],
    }));

    return newTicket;
  }, []);

  // 티켓 수정
  const updateTicket = useCallback(
    (id: string, updates: Partial<TicketInput>) => {
      setTicketBook((prev) => ({
        ...prev,
        tickets: prev.tickets.map((ticket) => {
          if (ticket.id !== id) return ticket;

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

          if (updates.eventId !== undefined) {
            updatedTicket.eventId = updates.eventId;
          }
          if (updates.eventTitle !== undefined) {
            updatedTicket.eventTitle = updates.eventTitle;
          }
          if (updates.eventDate !== undefined) {
            updatedTicket.eventDate = updates.eventDate;
          }
          if (updates.memo !== undefined) {
            updatedTicket.memo = updates.memo;
          }
          if (updates.seat !== undefined) {
            updatedTicket.seat = updates.seat;
          }
          if (updates.companion !== undefined) {
            updatedTicket.companion = updates.companion;
          }

          return updatedTicket;
        }),
      }));
    },
    []
  );

  // 티켓 삭제
  const deleteTicket = useCallback((id: string) => {
    setTicketBook((prev) => ({
      ...prev,
      tickets: prev.tickets.filter((t) => t.id !== id),
    }));
  }, []);

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
    setTicketBook((prev) => ({ ...prev, sortBy }));
  }, []);

  const setSortOrder = useCallback((sortOrder: TicketSortOrder) => {
    setTicketBook((prev) => ({ ...prev, sortOrder }));
  }, []);

  // 정렬된 티켓 목록
  const sortedTickets = [...ticketBook.tickets].sort((a, b) => {
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

  return (
    <TicketBookContext.Provider
      value={{
        tickets: ticketBook.tickets,
        sortBy: ticketBook.sortBy,
        sortOrder: ticketBook.sortOrder,
        addTicket,
        updateTicket,
        deleteTicket,
        getTicket,
        getTicketsByEvent,
        setSortBy,
        setSortOrder,
        sortedTickets,
      }}
    >
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
