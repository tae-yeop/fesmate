export interface MaskRegion {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: MaskType;
    confidence: "auto" | "manual";
}

export type MaskType = "name" | "phone" | "email" | "barcode" | "qrcode" | "custom";

export interface MaskStyle {
    type: "blur" | "solid" | "pattern";
    color?: string;
    blurAmount?: number;
    pattern?: "dots" | "lines" | "stars";
}

export type TicketType = "interpark" | "yes24" | "melon" | "generic";

export const COMMON_MASK_REGIONS: Record<TicketType, MaskRegion[]> = {
    interpark: [
        { id: "interpark-name", x: 10, y: 75, width: 40, height: 5, type: "name", confidence: "auto" },
        { id: "interpark-phone", x: 10, y: 80, width: 30, height: 4, type: "phone", confidence: "auto" },
        { id: "interpark-barcode", x: 60, y: 85, width: 35, height: 12, type: "barcode", confidence: "auto" },
    ],
    yes24: [
        { id: "yes24-name", x: 5, y: 70, width: 35, height: 5, type: "name", confidence: "auto" },
        { id: "yes24-phone", x: 5, y: 76, width: 25, height: 4, type: "phone", confidence: "auto" },
        { id: "yes24-qr", x: 70, y: 70, width: 25, height: 25, type: "qrcode", confidence: "auto" },
    ],
    melon: [
        { id: "melon-name", x: 8, y: 72, width: 35, height: 5, type: "name", confidence: "auto" },
        { id: "melon-phone", x: 8, y: 78, width: 28, height: 4, type: "phone", confidence: "auto" },
        { id: "melon-barcode", x: 55, y: 80, width: 40, height: 15, type: "barcode", confidence: "auto" },
    ],
    generic: [
        { id: "generic-bottom", x: 5, y: 75, width: 45, height: 20, type: "custom", confidence: "auto" },
    ],
};

export const MASK_TYPE_LABELS: Record<MaskType, string> = {
    name: "이름",
    phone: "전화번호",
    email: "이메일",
    barcode: "바코드",
    qrcode: "QR코드",
    custom: "기타",
};

export function getSuggestedMaskRegions(ticketType: TicketType): MaskRegion[] {
    return COMMON_MASK_REGIONS[ticketType].map(region => ({
        ...region,
        id: `${region.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    }));
}

export function applyMasksToCanvas(
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
    masks: MaskRegion[],
    maskStyle: MaskStyle
): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    ctx.drawImage(image, 0, 0);

    masks.forEach(mask => {
        const x = (mask.x / 100) * canvas.width;
        const y = (mask.y / 100) * canvas.height;
        const width = (mask.width / 100) * canvas.width;
        const height = (mask.height / 100) * canvas.height;

        switch (maskStyle.type) {
            case "blur":
                applyBlurMask(ctx, x, y, width, height, maskStyle.blurAmount || 20);
                break;
            case "solid":
                applySolidMask(ctx, x, y, width, height, maskStyle.color || "#000000");
                break;
            case "pattern":
                applyPatternMask(ctx, x, y, width, height, maskStyle.pattern || "dots");
                break;
        }
    });
}

function applyBlurMask(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    amount: number
): void {
    const imageData = ctx.getImageData(x, y, width, height);
    const data = imageData.data;

    for (let i = 0; i < 3; i++) {
        boxBlur(data, width, height, Math.floor(amount / 3));
    }

    ctx.putImageData(imageData, x, y);
}

function boxBlur(data: Uint8ClampedArray, width: number, height: number, radius: number): void {
    const copy = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;

                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        const idx = (ny * width + nx) * 4;
                        r += copy[idx];
                        g += copy[idx + 1];
                        b += copy[idx + 2];
                        count++;
                    }
                }
            }

            const idx = (y * width + x) * 4;
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
        }
    }
}

function applySolidMask(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function applyPatternMask(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    pattern: "dots" | "lines" | "stars"
): void {
    ctx.fillStyle = "#333333";
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = "#666666";

    switch (pattern) {
        case "dots":
            const dotSpacing = 8;
            const dotRadius = 2;
            for (let dy = dotSpacing; dy < height; dy += dotSpacing) {
                for (let dx = dotSpacing; dx < width; dx += dotSpacing) {
                    ctx.beginPath();
                    ctx.arc(x + dx, y + dy, dotRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;

        case "lines":
            const lineSpacing = 6;
            ctx.strokeStyle = "#666666";
            ctx.lineWidth = 1;
            for (let i = -height; i < width + height; i += lineSpacing) {
                ctx.beginPath();
                ctx.moveTo(x + i, y);
                ctx.lineTo(x + i + height, y + height);
                ctx.stroke();
            }
            break;

        case "stars":
            const starSpacing = 15;
            ctx.font = "10px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            for (let dy = starSpacing / 2; dy < height; dy += starSpacing) {
                for (let dx = starSpacing / 2; dx < width; dx += starSpacing) {
                    ctx.fillText("*", x + dx, y + dy);
                }
            }
            break;
    }
}

export function createMaskRegion(
    x: number,
    y: number,
    width: number,
    height: number,
    type: MaskType = "custom"
): MaskRegion {
    return {
        id: `mask-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        x,
        y,
        width,
        height,
        type,
        confidence: "manual",
    };
}

export async function exportMaskedImage(
    canvas: HTMLCanvasElement,
    format: "png" | "jpeg" = "png",
    quality: number = 0.92
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Failed to export image"));
                }
            },
            `image/${format}`,
            quality
        );
    });
}
