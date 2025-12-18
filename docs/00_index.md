# docs index (v0.5)

**Last updated:** 2025-12-18

이 폴더는 FesMate 문서를 “한 문서 = 한 역할”로 관리하기 위한 문서 지도입니다.

## Source of Truth
- 제품 요구사항: `product/PRD_fesmate_v0.5.md`
- UX/IA: `ux/UX_IA_fesmate_v0.5.md`
- 요약(온보딩): `product/fes_app_planning_summary_v0.5.md`
- 기술 설계(변경 잦음): `tech/*`

## 문서 규칙(간단)
- PRD: 무엇/왜, 범위/우선순위
- UX/IA: 정보구조/화면/플로우/상태 노출
- Tech Spec: 어떻게(구현/운영/성능), 인터페이스/테스트/모니터링
- 큰 결정은 ADR로 남기고(PRD/UX/Tech는 ADR 링크를 붙인다)

## Tech Specs
- `tech/ingestion_crawling.md` — 수집/정규화/변경관리 파이프라인
- `tech/maps_deeplink.md` — 커뮤니티 장소 입력 + 지도앱 딥링크

## ADR
- `adr/` — 결정 기록(예: LIVE↔RECAP 전환 규칙, 상태 모델 변경 등)
