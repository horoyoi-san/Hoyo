import { ExtraData } from "./extraData";
import { FreeSRJson } from "./srtools";

export enum PSConnectType {
  FireflyGo = "FireflyGo",
  RobinSR = "RobinSR",
  March7thHoney = "March7thHoney",
  Collapse = "Collapse",
  Other = "Other",
}

export interface ProxyPayload {
    username?: string;
    password?: string;
    serverUrl: string;
    data?: FreeSRJson;
}

export interface ProxyResponse {
    error?: string;
    message?: string;
    data?: unknown;
}

export interface PushStats {
    avatars: number;
    created: number;
    updated: number;
    deleted: number;
}

export interface PSResponse {
    status: number;
    message: string;
    extra_data?: ExtraData
    warnings?: string[]
    stats?: PushStats
    retcode?: number
}

export enum ConnectErrorCode {
  PrivateHostUseLocal = "PRIVATE_HOST_USE_LOCAL",
}

export interface ActionResult {
    success: boolean;
    message: string;
    code?: ConnectErrorCode;
    warning?: string;
    stats?: PushStats;
}
