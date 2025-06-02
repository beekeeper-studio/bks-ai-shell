import { requestDevMode } from "./devComms";
import type {
  GetTablesRequest,
  GetColumnsRequest,
  RunQueryRequest,
  ExpandTableResultRequest,
  SetTabTitleRequest,
} from "./requestTypes";
import type {
  GetTablesResponse,
  GetColumnsResponse,
  GetConnectionInfoResponse,
  GetAllTabsResponse,
  RunQueryResponse,
  ExpandTableResultResponse,
  SetTabTitleResponse,
} from "./responseTypes";

// Define a custom import.meta interface for TypeScript
declare global {
  interface ImportMeta {
    env: {
      MODE: string;
    };
  }
}

const pendingRequests = new Map<
  string,
  {
    name: string;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }
>();

let debugComms = false;

export function setDebugComms(value: boolean) {
  debugComms = value;
}

window.addEventListener("message", (event) => {
  const { id, name, args, result, error } = event.data || {};

  if (name) {
    if (debugComms) {
      const time = new Date().toLocaleTimeString("en-GB");
      console.groupCollapsed(`${time} [NOTIFICATION] ${name}`);
      console.log("Args:", args);
      console.groupEnd();
    }

    const handlers = notificationListeners.get(name);
    if (handlers) {
      handlers.forEach((handler) => handler(args));
    }
  }

  if (id && pendingRequests.has(id)) {
    const { resolve, reject, name } = pendingRequests.get(id)!;
    pendingRequests.delete(id);

    if (debugComms) {
      const time = new Date().toLocaleTimeString("en-GB");
      console.groupCollapsed(`${time} [RESPONSE] ${name}`);
      console.log("Result:", result);
      if (error) console.error("Error:", error);
      console.groupEnd();
    }

    if (error) {
      reject(error);
    } else {
      resolve(result);
    }
  }
});

export async function request(name: "getTables", args?: GetTablesRequest["args"]): Promise<GetTablesResponse>;
export async function request(name: "getColumns", args: GetColumnsRequest["args"]): Promise<GetColumnsResponse>;
export async function request(name: "getConnectionInfo"): Promise<GetConnectionInfoResponse>;
export async function request(name: "getAllTabs"): Promise<GetAllTabsResponse>;
export async function request(name: "runQuery", args: RunQueryRequest["args"]): Promise<RunQueryResponse>;
export async function request(name: "expandTableResult", args: ExpandTableResultRequest["args"]): Promise<ExpandTableResultResponse>;
export async function request(name: "setTabTitle", args: SetTabTitleRequest["args"]): Promise<SetTabTitleResponse>;
export async function request(name: unknown, args?: unknown): Promise<unknown> {
  if (import.meta.env.MODE === "development") {
    const result = await requestDevMode(name, args);
    // console.log("result", result);
    return result;
  }

  if (debugComms) {
    const time = new Date().toLocaleTimeString("en-GB");
    console.groupCollapsed(`${time} [REQUEST] ${name}`);
    console.log("Args:", args);
    console.groupEnd();
  }

  return new Promise<any>((resolve, reject) => {
    try {
      const id = crypto.randomUUID();
      const data = { id, name, args };
      pendingRequests.set(id, { name, resolve, reject });
      window.parent.postMessage(data, "*");
    } catch (e) {
      reject(e);
    }
  });
}

export function notify(name: string, args: any) {
  if (debugComms) {
    const time = new Date().toLocaleTimeString("en-GB");
    console.groupCollapsed(`${time} [NOTIFICATION] ${name}`);
    console.log("Args:", args);
    console.groupEnd();
  }
  window.parent.postMessage({ name, args }, "*");
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
