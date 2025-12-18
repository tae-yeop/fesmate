# Tech Spec — 지도 보기(Deep Link) (v0.5)

**Status:** Draft  
**Owner:** Client  
**Last updated:** 2025-12-18  
**Related:** PRD 6.4.1(장소 필드), UX/IA 5.7(커뮤니티 공통 UX)

---

## 0. 목표
커뮤니티 글(양도/뒷풀이/택시팟 등)에 `place_text`가 있을 때,
지도 SDK/API 키 없이 **외부 지도 앱(또는 웹)에서 검색/길찾기**를 열 수 있게 한다.

---

## 1. 제품 요구(요약)
- 글쓰기(PostComposer)에 **장소(선택)** 입력 추가: `place_text` (예: “올림픽공원 정문”)
- 글 카드(PostCard)/상세(PostDetail)에 장소가 있으면 **[📍 지도 보기]** CTA 표시
- CTA 탭 시 지도 앱 선택(액션시트) → 앱/웹으로 이동
- 좌표/현재 위치는 수집하지 않는다(텍스트 검색만)

---

## 2. 링크 생성 규칙(권장)
### 2.1 공통
- 검색어는 URL 인코딩
- `place_hint`가 있으면 `"place_text place_hint"` 형태로 합쳐 검색 정확도 개선

### 2.2 Google Maps (권장 기본값)
- Universal Maps URL을 사용한다: 앱이 있으면 앱으로, 없으면 브라우저로 열림
- 예: `https://www.google.com/maps/search/?api=1&query={QUERY}`

### 2.3 KakaoMap
- 앱 스킴(설치 시): `kakaomap://search?q={QUERY}`
- 웹 폴백(설치 안 됐을 때): `http://m.map.kakao.com/scheme/search?q={QUERY}`
- (고도화) 좌표 중심 검색 `&p={LAT},{LNG}`는 Future

### 2.4 Naver Map
- 앱 스킴: `nmap://search?query={QUERY}&appname={APP_ID}`
- 주의: 네이버 지도 URL Scheme은 **앱 설치가 필요**하며, 미설치 시 설치 유도 처리가 필요함
- 폴백 전략(권장)
  1) iOS/Android 네이티브 앱: `canOpenURL`로 설치 여부 확인 후 스토어/웹으로 폴백
  2) 웹(브라우저) 환경: 기본값을 Google/Kakao 웹으로 두고, “네이버지도(앱)”은 옵션으로 제공

---

## 3. 클라이언트 구현 메모
### 3.1 웹(Next.js/PWA)에서의 현실적 처리
- 브라우저는 스킴 실행 실패 시 UX가 불안정할 수 있음
- 따라서 기본 제공은 “Google Maps(웹 안전)”로 두고,
  네이버/카카오는 선택 옵션(또는 “앱에서 열기”)로 제공하는 것이 안정적

### 3.2 네이티브(React Native 등)로 감싼 경우
- iOS: `canOpenURL` 사용 시, 허용 스킴을 Info.plist에 선언 필요
- Android: intent 또는 package 지정으로 설치 여부/폴백 처리 가능

---

## 4. UX 디테일(추천)
- 액션시트 항목: `구글지도(권장) / 카카오맵 / 네이버지도 / 웹으로 보기`
- “다음부터 이 지도로 열기” 체크(기본값 저장)
- 만료 글(EXPIRED/CLOSED)도 지도 보기는 유지(연락 CTA만 비활성)

---

## 5. 데이터 모델(추가)
- `Post.place_text?: string`
- `Post.place_hint?: string`
- (Future) `place_lat/lng`, `place_provider`, `place_id`
