import type { ExtraData, PSResponse } from "@/types";

// Kept apart from api.ts so reading a response does not pull axios into the first-screen bundle.
const HTML_LIKE = /^\s*</;

export function looksLikeHtml(value: string): boolean {
    return HTML_LIKE.test(value);
}

export function normalizePsResponse(body: unknown, httpStatus = 200): PSResponse {
    if (typeof body === "string") {
        return { status: httpStatus, message: body.trim() };
    }

    if (body && typeof body === "object") {
        const raw = body as { status?: unknown; message?: unknown; extra_data?: ExtraData; error?: unknown };

        if (typeof raw.error === "string" && raw.error) {
            return { status: 400, message: raw.error };
        }

        const status = typeof raw.status === "number" ? raw.status : Number(raw.status);
        return {
            status: Number.isFinite(status) && status > 0 ? status : httpStatus,
            message: typeof raw.message === "string" ? raw.message : JSON.stringify(body),
            extra_data: raw.extra_data,
        };
    }

    return { status: httpStatus, message: "" };
}
