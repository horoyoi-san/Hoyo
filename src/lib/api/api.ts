import { CollapseAvatarData, CollapseConnectionRequest, CollapseConnectionResponse, EnkaProxyResponse, FreeSRJson, PSResponse } from "@/types";
import axios from 'axios';
import { ExtraData } from "@/types";

export * from "./dataApi";
export * from "./response";
import { normalizePsResponse } from "./response";

async function postAndNormalize(url: string, payload: unknown): Promise<PSResponse | string> {
    try {
        const response = await axios.post(url, payload);
        return normalizePsResponse(response.data, response.status);
    } catch (error: unknown) {
        const axiosError = error as { response?: { status: number; data: unknown }; message?: string };
        if (axiosError.response) {
            return normalizePsResponse(axiosError.response.data, axiosError.response.status);
        }
        return axiosError.message || "Unknown error";
    }
}

export async function SendDataToServer(
    username: string,
    password: string,
    serverUrl: string,
    data?: FreeSRJson,
    extraData?: ExtraData
): Promise<PSResponse | string> {
    return postAndNormalize(`${serverUrl}`, { username, password, data, extra_data: extraData });
}

export async function SendDataToMarch7thHoney(
    username: string,
    password: string,
    serverUrl: string,
    data?: FreeSRJson
): Promise<PSResponse | string> {
    return postAndNormalize(`${serverUrl}`, { username, password, data });
}

export async function FetchEnkaProfile(uid: string): Promise<EnkaProxyResponse> {
    try {
        const response = await axios.get<EnkaProxyResponse>(`/api/enka/${encodeURIComponent(uid)}`, {
            timeout: 30000,
            validateStatus: () => true,
        });
        const body = response.data;
        if (body && typeof body === "object" && typeof body.ok === "boolean") {
            return body;
        }
        return { ok: false, code: "UPSTREAM", message: "Unexpected response from /api/enka" };
    } catch (error: unknown) {
        return { ok: false, code: "NETWORK", message: (error as Error)?.message || "Network error" };
    }
}

export const COLLAPSE_RETCODE = {
    BAD_BODY: -1,
    AUTH: -2,
    INVALID_PAYLOAD: -3,
    TIMEOUT: -4,
    INTERNAL: -5,
} as const;

export function mapCollapseResponse(body: unknown, httpStatus = 200): PSResponse {
    if (!body || typeof body !== "object") {
        const message = httpStatus === 404
            ? "Endpoint /query_connection not found: check the URL, and that the server runs with --game"
            : "";
        return { status: httpStatus >= 400 ? httpStatus : 502, message };
    }

    const raw = body as CollapseConnectionResponse;
    const retcode = Number(raw.retcode);
    const errors = Array.isArray(raw.data?.errors) ? raw.data.errors : [];
    const message = typeof raw.message === "string" ? raw.message : "";
    const numbers = [raw.data?.avatars, raw.data?.created, raw.data?.updated, raw.data?.deleted].map(Number);
    const stats = numbers.every(Number.isFinite)
        ? { avatars: numbers[0], created: numbers[1], updated: numbers[2], deleted: numbers[3] }
        : undefined;

    return {
        status: Number.isFinite(retcode) && retcode === 0 ? 200 : (httpStatus >= 400 ? httpStatus : 400),
        message,
        warnings: errors.length > 0 ? errors : undefined,
        stats,
        retcode: Number.isFinite(retcode) ? retcode : undefined,
    };
}

export async function SendDataToCollapse(
    username: string,
    password: string,
    serverUrl: string,
    avatars: CollapseAvatarData[]
): Promise<PSResponse | string> {
    try {
        const response = await axios.post(
            serverUrl,
            { Username: username, Password: password, Avatars: avatars } satisfies CollapseConnectionRequest
        );
        return mapCollapseResponse(response.data, response.status);
    } catch (error: unknown) {
        const axiosError = error as { response?: { status: number; data: unknown }; message?: string };
        if (axiosError.response) {
            return mapCollapseResponse(axiosError.response.data, axiosError.response.status);
        }
        return axiosError.message || "Unknown error";
    }
}

export async function ProbeCollapseConnection(
    username: string,
    password: string,
    serverUrl: string
): Promise<PSResponse | string> {
    const response = await SendDataToCollapse(username, password, serverUrl, []);

    if (typeof response === "string") return response;
    if (response.status >= 200 && response.status < 300) return response;
    if (response.retcode === COLLAPSE_RETCODE.INVALID_PAYLOAD) return { status: 200, message: "", retcode: 0 };

    return response;
}

export async function SendDataThroughProxy({ data }: { data: Record<string, unknown> | unknown }) {
    try {
        const response = await axios.post(`/api/proxy`, typeof data === "object" && data !== null ? { ...data } : data)
        return response.data;
    } catch (error: unknown) {
        const body = (error as { response?: { data?: unknown } })?.response?.data;
        if (body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string") {
            return new Error((body as { error: string }).error);
        }
        return error;
    }
}
