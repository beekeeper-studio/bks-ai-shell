import { requestDevMode } from "./DevComms";
import { IActiveTab, ITableColumn } from "./types";

export interface RequestMap {
  getActiveTab: {
    args: undefined;
    return: IActiveTab;
  };
  getTheme: {
    args: undefined;
    return: {
      cssString: string;
    };
  };
  updateQueryText: {
    args: {
      tabId: number;
      query: string;
    };
    return: {
      success: boolean;
      message: string;
      tabId: number;
    };
  };
  getConnectionInfo: {
    args: undefined;
    return: {};
  };
  getTables: {
    args: undefined;
    return: string[];
  };
  getColumns: {
    args: {
      table: string;
    };
    return: ITableColumn[];
  };
}

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
