/**
 * Storage Adapter 타입 정의
 *
 * localStorage 접근을 추상화하기 위한 인터페이스
 */

export interface StorageAdapter<T> {
  /** 저장된 데이터 조회 (없으면 null) */
  get(): T | null;
  /** 데이터 저장 */
  set(data: T): void;
  /** 데이터 삭제 */
  remove(): void;
  /** 데이터 존재 여부 */
  exists(): boolean;
}

export interface StorageOptions<T> {
  /** localStorage 키 */
  key: string;
  /** 기본값 (get() 실패 시 반환하지 않음, 호출자가 처리) */
  defaultValue?: T;
  /** Date로 복원할 필드명 목록 */
  dateFields?: string[];
  /** 중첩 객체 내 Date 필드 (예: "tickets.eventDate") */
  nestedDateFields?: string[];
}

/**
 * Repository 기본 인터페이스
 * 각 도메인별 Repository는 이를 확장하여 구현
 */
export interface BaseRepository<T> {
  getAll(): T[];
  save(data: T[]): void;
  clear(): void;
}
