# 이미지 업로드 시스템

> 작성일: 2025-12-21
> 상태: 구현 완료 (Local Storage), Supabase 전환 대기

## 개요

FesMate의 이미지 업로드 시스템은 **저장소 추상화 패턴**을 사용하여 로컬 개발 환경과 프로덕션(Supabase Storage) 간 쉬운 전환을 지원합니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Components                          │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  ImageUploader   │  │  ImageGallery    │                │
│  │  (업로드 UI)     │  │  (표시/라이트박스) │                │
│  └────────┬─────────┘  └──────────────────┘                │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Storage Abstraction Layer              │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │         ImageStorageAdapter (Interface)       │  │   │
│  │  │  - upload(file, options) → ImageUploadResult  │  │   │
│  │  │  - delete(imageId) → boolean                  │  │   │
│  │  │  - getUrl(imageId) → string                   │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │           ▲                    ▲                    │   │
│  │           │                    │                    │   │
│  │  ┌────────┴───────┐  ┌────────┴───────────────┐   │   │
│  │  │ LocalStorage   │  │ SupabaseImageStorage   │   │   │
│  │  │ (개발용)        │  │ (프로덕션, TODO)        │   │   │
│  │  └────────────────┘  └────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 파일 구조

```
src/
├── types/
│   └── image.ts              # 타입 정의 (UploadedImage, Options 등)
├── lib/storage/
│   ├── index.ts              # 통합 모듈 (getImageStorage)
│   ├── image-utils.ts        # 유틸리티 (리사이즈, 썸네일, 검증)
│   ├── local-image-storage.ts # 로컬 스토리지 구현
│   └── supabase-image-storage.ts # (TODO) Supabase 구현
└── components/image/
    ├── index.ts              # 컴포넌트 export
    ├── ImageUploader.tsx     # 업로드 UI
    └── ImageGallery.tsx      # 갤러리/라이트박스 UI
```

## 사용법

### 1. 이미지 업로드 (UI 컴포넌트)

```tsx
import { useState } from "react";
import { UploadedImage } from "@/types/image";
import { ImageUploader } from "@/components/image";

function MyComponent() {
    const [images, setImages] = useState<UploadedImage[]>([]);

    return (
        <ImageUploader
            images={images}
            onChange={setImages}
            maxImages={5}
        />
    );
}
```

### 2. 이미지 표시

```tsx
import { ImageGallery } from "@/components/image";

function MyComponent({ images }: { images: string[] }) {
    return (
        <ImageGallery
            images={images}
            thumbnailSize="md"  // sm | md | lg
            allowZoom={true}    // 클릭 시 라이트박스
        />
    );
}
```

### 3. 프로그래매틱 업로드

```tsx
import { getImageStorage } from "@/lib/storage";

async function uploadImage(file: File) {
    const storage = getImageStorage();
    const result = await storage.upload(file, {
        maxFileSize: 5 * 1024 * 1024,  // 5MB
        maxWidth: 1200,
        quality: 0.8,
    });

    if (result.success) {
        console.log("업로드 완료:", result.image);
    } else {
        console.error("업로드 실패:", result.error);
    }
}
```

## 업로드 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `maxFileSize` | 5MB | 최대 파일 크기 |
| `maxImages` | 5 | 최대 이미지 수 |
| `allowedTypes` | jpeg, png, gif, webp | 허용 MIME 타입 |
| `maxWidth` | 1200px | 리사이즈 최대 너비 |
| `maxHeight` | 1200px | 리사이즈 최대 높이 |
| `quality` | 0.8 | JPEG 압축 품질 (0-1) |
| `generateThumbnail` | true | 썸네일 생성 여부 |
| `thumbnailSize` | 200px | 썸네일 크기 |

## 저장소 전환 방법

### 현재: Local Storage (개발용)

- 이미지를 Base64로 변환하여 localStorage에 저장
- 용량 제한: ~5MB (브라우저 한계)
- 페이지 새로고침 후에도 유지

### 전환: Supabase Storage (프로덕션)

1. **환경변수 설정**
   ```bash
   # .env.local
   NEXT_PUBLIC_IMAGE_STORAGE=supabase
   ```

2. **Supabase Storage 구현** (`src/lib/storage/supabase-image-storage.ts`)
   ```typescript
   import { createClient } from "@/lib/supabase/client";
   import { ImageStorageAdapter } from "@/types/image";

   export class SupabaseImageStorage implements ImageStorageAdapter {
       readonly storageType = "supabase" as const;
       private bucketName = "post-images";

       async upload(file: File, options?: ImageUploadOptions) {
           const supabase = createClient();
           const fileName = `${Date.now()}_${file.name}`;

           const { data, error } = await supabase.storage
               .from(this.bucketName)
               .upload(fileName, file);

           if (error) {
               return { success: false, error: error.message };
           }

           const { data: urlData } = supabase.storage
               .from(this.bucketName)
               .getPublicUrl(fileName);

           return {
               success: true,
               image: {
                   id: data.path,
                   url: urlData.publicUrl,
                   // ... 기타 필드
               },
           };
       }

       // delete, getUrl 구현...
   }
   ```

3. **index.ts 업데이트**
   ```typescript
   case "supabase":
       return getSupabaseImageStorage();
   ```

## 이미지 데이터 타입

```typescript
interface UploadedImage {
    id: string;           // 고유 ID
    url: string;          // 이미지 URL (data: 또는 https:)
    thumbnailUrl?: string; // 썸네일 URL
    fileName: string;      // 원본 파일명
    fileSize: number;      // 파일 크기 (bytes)
    mimeType: string;      // MIME 타입
    width?: number;        // 이미지 너비
    height?: number;       // 이미지 높이
    uploadedAt: Date;      // 업로드 시각
    storageType: "local" | "supabase"; // 저장소 타입
}
```

## 마이그레이션 전략

로컬에서 Supabase로 전환 시:

1. `storageType` 필드로 기존 이미지 식별
2. 배치 스크립트로 localStorage → Supabase 마이그레이션
3. URL 업데이트 (data: → https:)

```typescript
async function migrateImages() {
    const localStorage = getLocalImageStorage();
    const supabaseStorage = getSupabaseImageStorage();

    const localImages = localStorage.getAllImages();

    for (const image of localImages) {
        if (image.storageType === "local") {
            // Base64를 Blob으로 변환
            const blob = await fetch(image.url).then(r => r.blob());
            const file = new File([blob], image.fileName);

            // Supabase에 업로드
            await supabaseStorage.upload(file);

            // 로컬에서 삭제
            await localStorage.delete(image.id);
        }
    }
}
```

## 제약사항

### Local Storage
- 최대 용량: ~5-10MB (브라우저별 상이)
- 동기식 API로 대용량 이미지 시 UI 블로킹 가능
- 디바이스 간 동기화 없음

### 공통
- 클라이언트 사이드에서만 동작 (SSR 시 `window` 체크 필요)
- 이미지 최적화는 업로드 시 클라이언트에서 수행

## 향후 개선

- [ ] Supabase Storage 구현
- [ ] 서버 사이드 이미지 최적화 (Edge Function)
- [ ] CDN 캐싱
- [ ] 이미지 최적화 (WebP 변환, srcset)
- [ ] 업로드 진행률 표시
- [ ] 드래그 앤 드롭 순서 변경
