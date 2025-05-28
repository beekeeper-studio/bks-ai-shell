import { requestDevMode } from "./devComms";
import type {
  GetThemeRequest,
  GetTablesRequest,
  GetColumnsRequest,
  GetConnectionInfoRequest,
  GetActiveTabRequest,
  GetAllTabsRequest,
  RunQueryRequest,
  ExpandTableResultRequest,
} from "./requestTypes";
import type {
  GetThemeResponse,
  GetTablesResponse,
  GetColumnsResponse,
  GetConnectionInfoResponse,
  GetActiveTabResponse,
  GetAllTabsResponse,
  RunQueryResponse,
  ExpandTableResultResponse,
} from "./responseTypes";

// Define a custom import.meta interface for TypeScript
declare global {
  interface ImportMeta {
    env: {
      MODE: string;
    };
  }
}

// Direct mapping approach for better type inference
export type RequestResponsePairs = {
  getTheme: { req: GetThemeRequest; res: GetThemeResponse };
  getTables: { req: GetTablesRequest; res: GetTablesResponse };
  getColumns: { req: GetColumnsRequest; res: GetColumnsResponse };
  getConnectionInfo: { req: GetConnectionInfoRequest; res: GetConnectionInfoResponse };
  getActiveTab: { req: GetActiveTabRequest; res: GetActiveTabResponse };
  getAllTabs: { req: GetAllTabsRequest; res: GetAllTabsResponse };
  runQuery: { req: RunQueryRequest; res: RunQueryResponse };
  expandTableResult: { req: ExpandTableResultRequest; res: ExpandTableResultResponse };
};

// Create RequestMap from the pairs
export type RequestMap = {
  [K in keyof RequestResponsePairs]: {
    args: RequestResponsePairs[K]["req"] extends { args: infer A } ? A : undefined;
    return: RequestResponsePairs[K]["res"];
  }
};

const pendingRequests = new Map<
  string,
  {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }
>();

window.addEventListener("message", (event) => {
  const { id, name, args, result, error } = event.data || {};

  if (name) {
    const handlers = notificationListeners.get(name);
    if (handlers) {
      handlers.forEach((handler) => handler(args));
    }
  }

  if (id && pendingRequests.has(id)) {
    const { resolve, reject } = pendingRequests.get(id)!;
    pendingRequests.delete(id);

    if (error) {
      reject(error);
    } else {
      resolve(result);
    }
  }
});

export async function request<K extends keyof RequestMap>(
  name: K,
  ...args: RequestMap[K]["args"] extends undefined
    ? []
    : [RequestMap[K]["args"]]
): Promise<RequestMap[K]["return"]> {
  if (import.meta.env.MODE === "development") {
    const result = await requestDevMode(name, ...args);
    // console.log("result", result);
    return result;
  }

  return new Promise<any>((resolve, reject) => {
    try {
      const id = crypto.randomUUID();
      const data = { id, name, args };
      pendingRequests.set(id, { resolve, reject });
      window.parent.postMessage(data, "*");
    } catch (e) {
      reject(e);
    }
  });
}

const notificationListeners = new Map<string, ((args: any) => void)[]>();

export async function addNotificationListener(
  name: string,
  handler: (args: any) => void,
) {
  if (!notificationListeners.get(name)) {
    notificationListeners.set(name, []);
  }
  notificationListeners.get(name)!.push(handler);
}
