/**
 * 티켓 이미지와 템플릿 합성 로직
 */

import type { TicketTemplate, RenderOptions, CompositeResult } from "./types";

/**
 * 필름 구멍 장식 그리기
 */
function drawFilmHoles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const holeRadius = Math.min(width, height) * 0.02;
  const holeSpacing = holeRadius * 4;
  const margin = holeRadius * 2;

  ctx.fillStyle = "#000000";

  // 상단 구멍들
  for (let x = margin; x < width - margin; x += holeSpacing) {
    ctx.beginPath();
    ctx.arc(x, margin, holeRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 하단 구멍들
  for (let x = margin; x < width - margin; x += holeSpacing) {
    ctx.beginPath();
    ctx.arc(x, height - margin, holeRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 빈티지 테두리 장식 그리기
 */
function drawVintageBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const borderWidth = Math.min(width, height) * 0.03;

  ctx.strokeStyle = "#c9b896";
  ctx.lineWidth = 1;

  // 내부 테두리
  ctx.strokeRect(
    borderWidth,
    borderWidth,
    width - borderWidth * 2,
    height - borderWidth * 2
  );

  // 코너 장식
  const cornerSize = borderWidth * 1.5;
  const corners = [
    [borderWidth, borderWidth],
    [width - borderWidth, borderWidth],
    [width - borderWidth, height - borderWidth],
    [borderWidth, height - borderWidth],
  ];

  ctx.strokeStyle = "#b8a686";
  corners.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - cornerSize / 2, y);
    ctx.lineTo(x + cornerSize / 2, y);
    ctx.moveTo(x, y - cornerSize / 2);
    ctx.lineTo(x, y + cornerSize / 2);
    ctx.stroke();
  });
}

/**
 * 장식 렌더링
 */
function renderDecorator(
  ctx: CanvasRenderingContext2D,
  decoratorName: string,
  width: number,
  height: number
): void {
  switch (decoratorName) {
    case "filmHoles":
      drawFilmHoles(ctx, width, height);
      break;
    case "vintageBorder":
      drawVintageBorder(ctx, width, height);
      break;
  }
}

/**
 * 티켓 이미지를 템플릿에 합성합니다.
 *
 * @param ticketCanvas - 워프된 티켓 이미지 캔버스
 * @param template - 적용할 템플릿
 * @param options - 렌더링 옵션
 * @returns 합성 결과
 */
export function compositeTicketWithTemplate(
  ticketCanvas: HTMLCanvasElement,
  template: TicketTemplate,
  options: RenderOptions
): CompositeResult {
  const { outputWidth, quality = 0.92 } = options;

  // 티켓 비율 계산
  const ticketAspect = ticketCanvas.width / ticketCanvas.height;

  // 템플릿 영역 비율로 출력 크기 계산
  const { ticketArea, padding } = template;
  const effectiveWidth = ticketArea.width;
  const effectiveHeight = ticketArea.height;

  // 출력 캔버스 크기
  const canvasWidth = outputWidth;
  const canvasHeight = Math.round(
    outputWidth / (effectiveWidth / effectiveHeight) / ticketAspect *
    (ticketArea.height / ticketArea.width)
  );

  // 실제 티켓이 들어갈 영역 크기
  const ticketWidth = canvasWidth * ticketArea.width - padding * 2;
  const ticketHeight = ticketWidth / ticketAspect;
  const totalHeight = ticketHeight / ticketArea.height + padding * 2;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = Math.round(totalHeight);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context를 생성할 수 없습니다.");
  }

  // 배경색 채우기
  ctx.fillStyle = template.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 그림자 설정
  if (template.shadow) {
    ctx.shadowOffsetX = template.shadow.offsetX;
    ctx.shadowOffsetY = template.shadow.offsetY;
    ctx.shadowBlur = template.shadow.blur;
    ctx.shadowColor = template.shadow.color;
  }

  // 티켓 이미지 위치 계산
  const ticketX = (canvas.width - ticketWidth) / 2;
  const ticketY = canvas.height * ticketArea.y;

  // 테두리가 있는 경우 먼저 배경 박스 그리기
  if (template.border && template.border.width > 0) {
    ctx.fillStyle = template.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      ticketX - padding,
      ticketY - padding,
      ticketWidth + padding * 2,
      ticketHeight + padding * 2,
      template.border.radius
    );
    ctx.fill();
  }

  // 그림자 리셋 (이미지에는 적용하지 않음)
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  // 티켓 이미지 그리기
  if (template.border && template.border.radius > 0) {
    // 둥근 모서리 클리핑
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(ticketX, ticketY, ticketWidth, ticketHeight, template.border.radius);
    ctx.clip();
    ctx.drawImage(ticketCanvas, ticketX, ticketY, ticketWidth, ticketHeight);
    ctx.restore();
  } else {
    ctx.drawImage(ticketCanvas, ticketX, ticketY, ticketWidth, ticketHeight);
  }

  // 테두리 그리기
  if (template.border && template.border.width > 0) {
    ctx.strokeStyle = template.border.color;
    ctx.lineWidth = template.border.width;
    ctx.beginPath();
    ctx.roundRect(
      ticketX,
      ticketY,
      ticketWidth,
      ticketHeight,
      template.border.radius
    );
    ctx.stroke();
  }

  // 장식 렌더링
  if (template.decorator) {
    renderDecorator(ctx, template.decorator, canvas.width, canvas.height);
  }

  return {
    canvas,
    dataUrl: canvas.toDataURL("image/png", quality),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * 템플릿 미리보기 썸네일 생성
 */
export function createTemplateThumbnail(
  template: TicketTemplate,
  size: number = 80
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size * 1.4; // 세로로 긴 비율

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 배경
  ctx.fillStyle = template.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 티켓 영역 표시
  const { ticketArea, padding } = template;
  const ticketX = canvas.width * ticketArea.x;
  const ticketY = canvas.height * ticketArea.y;
  const ticketW = canvas.width * ticketArea.width;
  const ticketH = canvas.height * ticketArea.height;

  // 그림자
  if (template.shadow) {
    ctx.shadowOffsetX = template.shadow.offsetX * 0.3;
    ctx.shadowOffsetY = template.shadow.offsetY * 0.3;
    ctx.shadowBlur = template.shadow.blur * 0.3;
    ctx.shadowColor = template.shadow.color;
  }

  // 티켓 플레이스홀더
  ctx.fillStyle = "#e5e7eb";
  const radius = template.border?.radius ? template.border.radius * 0.5 : 4;
  ctx.beginPath();
  ctx.roundRect(ticketX, ticketY, ticketW, ticketH, radius);
  ctx.fill();

  // 그림자 리셋
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // 테두리
  if (template.border && template.border.width > 0) {
    ctx.strokeStyle = template.border.color;
    ctx.lineWidth = Math.max(1, template.border.width * 0.5);
    ctx.stroke();
  }

  // 장식
  if (template.decorator) {
    renderDecorator(ctx, template.decorator, canvas.width, canvas.height);
  }

  return canvas;
}
