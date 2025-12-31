/**
 * Date 복원 유틸리티
 *
 * JSON.parse 후 문자열로 된 날짜를 Date 객체로 복원
 */

/**
 * 객체 배열에서 지정된 필드를 Date로 복원
 */
export function restoreDates<T>(data: T, dateFields: string[]): T {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => restoreDatesInObject(item, dateFields)) as T;
  }

  if (typeof data === "object") {
    return restoreDatesInObject(data as Record<string, unknown>, dateFields) as T;
  }

  return data;
}

/**
 * 단일 객체에서 지정된 필드를 Date로 복원
 */
export function restoreDatesInObject<T extends Record<string, unknown>>(
  obj: T,
  dateFields: string[]
): T {
  if (!obj || typeof obj !== "object") return obj;

  // 타입 캐스팅을 통해 mutable 객체로 처리
  const result = { ...obj } as Record<string, unknown>;

  dateFields.forEach((field) => {
    // 중첩 필드 지원 (예: "tickets.eventDate")
    if (field.includes(".")) {
      const [parentField, childField] = field.split(".");
      const parent = result[parentField];

      if (Array.isArray(parent)) {
        result[parentField] = parent.map((item) =>
          restoreDatesInObject(item as Record<string, unknown>, [childField])
        );
      } else if (parent && typeof parent === "object") {
        result[parentField] = restoreDatesInObject(
          parent as Record<string, unknown>,
          [childField]
        );
      }
    } else {
      const value = result[field];
      if (value && typeof value === "string") {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          result[field] = date;
        }
      }
    }
  });

  return result as T;
}

/**
 * Record<string, T> 형태의 객체에서 각 값의 Date 필드 복원
 */
export function restoreDatesInRecord<T extends Record<string, unknown>>(
  record: Record<string, T>,
  dateFields: string[]
): Record<string, T> {
  if (!record || typeof record !== "object") return record;

  const result: Record<string, T> = {};

  Object.entries(record).forEach(([key, value]) => {
    if (value && typeof value === "object") {
      result[key] = restoreDatesInObject(value as Record<string, unknown>, dateFields) as T;
    } else {
      result[key] = value;
    }
  });

  return result;
}
