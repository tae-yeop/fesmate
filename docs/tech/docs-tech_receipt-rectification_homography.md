# 영수증/문서 리크티피케이션 (수동 꼭지점 태깅 + Homography.js)

웹에서 사용자가 영수증(또는 문서)의 **4꼭지점을 직접 태깅**하고, 그 좌표로 **호모그래피(projective transform)** 를 적용해 “정면으로 펴진” 이미지를 만드는 방법을 정리합니다.

## 목표와 전제

- **자동 꼭지점 검출은 하지 않음**: 꼭지점은 최종적으로 사용자가 지정(클릭/드래그)합니다.
- 따라서 핵심은 **(1) 4점 순서 정규화** + **(2) projective warp(원근 보정)** 입니다.

---

## 왜 Homography 전용 라이브러리인가

이 프로젝트에서 실제로 필요한 기능은 아래로 좁혀집니다.

1) 4점(쿼드) ↔ 4점(사각형) 대응  
2) projective warp(원근 보정)  
3) 결과를 Canvas에 렌더링  

이 범위라면 OpenCV 전체를 들고 오기보다 **Homography 전용(가벼운) 라이브러리**가 번들/초기 로딩 측면에서 유리합니다.

---

## 설치/로드 방법

### 1) npm (React/Next/Vite 등 번들러 환경)

```bash
npm install homography
```

```js
import { Homography } from "homography";
```

> 팁: ESM import 흐름이 가장 매끄럽고, 코드 스플리팅/동적 import와도 잘 맞습니다.

### 2) CDN (브라우저에서 ESM import)

```html
<script type="module">
  import { Homography } from "https://cdn.jsdelivr.net/gh/Eric-Canas/Homography.js@1.4/Homography.js";
  // 사용 예시는 아래 "기본 사용법" 참고
</script>
```

### 3) CDN (Lightweight UMD)

Piecewise affine(메시 워핑) 등 고급 기능이 필요 없고 “펴기”만 필요하면 Lightweight 빌드가 더 가볍습니다.

```html
<script src="https://cdn.jsdelivr.net/gh/Eric-Canas/Homography.js@1.4/HomographyLightweight.min.js"></script>
<script>
  const H = new homography.Homography("projective");
</script>
```

---

## 기본 파이프라인

1. 사용자가 업로드한 이미지를 로드합니다.  
2. 화면 표시용(미리보기)으로 다운스케일해서 보여줍니다.  
3. 사용자가 미리보기 위에 꼭지점 4개를 찍거나 드래그로 보정합니다.  
4. 미리보기 좌표를 **원본 이미지 좌표로 환산**합니다.  
5. 출력 사각형의 (w, h)을 계산합니다.  
6. Homography(projective)로 워프하고 canvas에 그립니다.

---

## 꼭지점 순서 정규화 (중요)

호모그래피는 점 대응이 정확해야 합니다. 입력 4점이 뒤섞이면 결과가 꼬입니다.

- 권장 순서: **[top-left, top-right, bottom-right, bottom-left]** (시계방향)

아래는 흔히 쓰는 “합/차 기반” 정렬 예시입니다.

```js
/**
 * points: [[x,y], [x,y], [x,y], [x,y]]
 * return: [tl, tr, br, bl]
 */
export function orderQuad(points) {
  const pts = points.map(([x, y]) => ({ x, y }));
  const sum = pts.map((p) => p.x + p.y);
  const diff = pts.map((p) => p.x - p.y);

  const tl = pts[sum.indexOf(Math.min(...sum))];
  const br = pts[sum.indexOf(Math.max(...sum))];
  const tr = pts[diff.indexOf(Math.max(...diff))];
  const bl = pts[diff.indexOf(Math.min(...diff))];

  return [
    [tl.x, tl.y],
    [tr.x, tr.y],
    [br.x, br.y],
    [bl.x, bl.y],
  ];
}
```

---

## 출력 크기(w, h) 계산

“펴진 결과 사각형”의 크기는 보통 다음이 자연스럽습니다.

- width = 상단 변 길이와 하단 변 길이의 평균  
- height = 좌측 변 길이와 우측 변 길이의 평균  

```js
function dist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy);
}

export function estimateOutputSize([tl, tr, br, bl]) {
  const w = Math.round((dist(tl, tr) + dist(bl, br)) / 2);
  const h = Math.round((dist(tl, bl) + dist(tr, br)) / 2);
  return { w: Math.max(w, 1), h: Math.max(h, 1) };
}
```

---

## Homography.js 기본 사용법 (Image -> Canvas)

아래 예시는 `<img id="inputImg">`, `<canvas id="outCanvas">`가 있다고 가정합니다.

```js
import { Homography } from "homography";
import { orderQuad, estimateOutputSize } from "./quad";

export function rectifyToCanvas({
  imageEl,          // HTMLImageElement
  quadPoints,       // [[x,y],...4]  (원본 이미지 좌표)
  canvasEl,         // HTMLCanvasElement
}) {
  // 1) 순서 정규화
  const quad = orderQuad(quadPoints);

  // 2) 출력 크기 추정
  const { w, h } = estimateOutputSize(quad);

  // 3) 목적지 사각형(정면)
  const dst = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];

  // 4) Projective(원근) 변환 설정
  const H = new Homography("projective");
  H.setReferencePoints(quad, dst);

  // 5) 워핑 → ImageData 반환
  const outImageData = H.warp(imageEl); // 기본: ImageData

  // 6) Canvas 렌더링
  canvasEl.width = outImageData.width;
  canvasEl.height = outImageData.height;
  const ctx = canvasEl.getContext("2d");
  ctx.putImageData(outImageData, 0, 0);

  return { w, h };
}
```

---

## “해당 화면에서만” 로드하기 (가장 효과 큼)

문서 보정 기능은 대부분 유저 여정에서 “가끔” 쓰는 기능입니다.  
가장 큰 최적화는 **이 기능이 필요한 화면(라우트/모달)에서만 Homography.js를 로드**하는 것입니다.

### A) 버튼 클릭 시에만 동적 import (프레임워크 공통)

```js
async function onClickRectify() {
  const { Homography } = await import("homography"); // 필요한 순간에만 로드
  // ... Homography 사용 ...
}
```

- 장점: 메인 페이지/초기 로딩이 가벼워짐
- 단점: 첫 클릭에서 약간의 로딩이 생길 수 있음 → 아래 프리로드로 보완

#### (선택) UX 개선: 호버/포커스 시 미리 프리로드

```js
let homographyPromise;

function preloadHomography() {
  homographyPromise ??= import("homography");
}

async function onClickRectify() {
  const { Homography } = await (homographyPromise ?? import("homography"));
  // ...
}
```

### B) Next.js에서 “해당 라우트에서만” 로드 (예시)

```js
// app/receipt/rectify/page.jsx (예시)
"use client";

export default function RectifyPage() {
  const handle = async () => {
    const { rectifyToCanvas } = await import("./rectify"); // 내부 모듈 자체를 lazy-load
    // ...
  };

  return <button onClick={handle}>영수증 펴기</button>;
}
```

### C) 바닐라 JS에서 “페이지 진입 시에만” 스크립트 포함

```html
<!-- 이 페이지(영수증 보정)에서만 포함 -->
<script type="module" src="/js/rectify-page.js"></script>
```

---

## 성능 팁 (서비스가 무거워지지 않게)

### 1) 드래그 UI는 저해상도 미리보기로만

- 사용자가 꼭지점을 조절하는 동안은 긴 변 기준 800~1200px 정도로 다운스케일한 “미리보기”를 사용합니다.
- 최종 저장/업로드/제출 시에만 원본 해상도로 워프합니다.

> 핵심: 태깅 좌표는 미리보기 기준이므로, 원본 기준으로 환산해서 최종 워프해야 합니다.

```js
// previewScale = previewWidth / originalWidth (동일 비율로 리사이즈했다고 가정)
const toOriginal = ([x, y], previewScale) => [x / previewScale, y / previewScale];
```

### 2) 메인 스레드 버벅임 방지: Worker + OffscreenCanvas (가능하면)

- 큰 이미지 워프는 메인 스레드를 쉽게 막습니다.
- 가능하다면 Web Worker에서 처리하고, 메인 스레드는 UI(점 드래그)만 담당합니다.
- 환경에 따라 OffscreenCanvas 지원/제약이 있으니 “가능하면” 적용합니다.

### 3) 메모리 관리

- 업로드 미리보기를 `URL.createObjectURL(file)`로 만들었다면, 사용 후 `URL.revokeObjectURL()` 호출
- 캔버스에 매우 큰 이미지를 여러 번 그리지 않도록(특히 모바일) “최종 1회 렌더” 구조로 설계

---

## 체크리스트

- [ ] 사용자가 찍은 4점의 **순서를 항상 정규화**한다.
- [ ] 미리보기에서 찍은 좌표를 **원본 좌표로 환산**한다.
- [ ] 보정 기능은 **해당 화면에서만 로드**한다. (동적 import/route split)
- [ ] 드래그 중엔 **저해상도**, 제출 시에만 **원본 고해상도**로 처리한다.
- [ ] 가능하면 워프 처리는 Worker로 보내 UI 끊김을 줄인다.
