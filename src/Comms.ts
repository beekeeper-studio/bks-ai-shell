import { IActiveTab, ITableColumn } from "./types";

interface RequestMap {
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
  },
  getConnectionInfo: {
    args: undefined;
    return: {};
  },
  getTables: {
    args: undefined;
    return: string[];
  },
  getColumns: {
    args: {
      table: string;
    };
    return: ITableColumn[];
  },
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
  ...args: RequestMap[K]['args'] extends undefined ? [] : [RequestMap[K]['args']]
): Promise<RequestMap[K]['return']> {
  if (import.meta.env.MODE === "development") {
    if (name === "getTheme") {
      // Copied from Beekeeper Studio
      return {
        cssString:
          "--theme-bg: #f8f8f8;--theme-base: black;--theme-primary: rgb(248.7313432836, 206.1044776119, 9.2686567164);--theme-secondary: #0099ff;--text-dark: rgba(0, 0, 0, 0.87);--text: rgba(0, 0, 0, 0.67);--text-light: rgba(0, 0, 0, 0.57);--text-lighter: rgba(0, 0, 0, 0.37);--text-hint: rgba(0, 0, 0, 0.37);--text-disabled: rgba(0, 0, 0, 0.37);--brand-info: #3498db;--brand-success: #15db95;--brand-warning: #dc700c;--brand-danger: #ff5d59;--brand-default: rgba(0, 0, 0, 0.57);--brand-purple: #9858ff;--brand-pink: #ff00f0;--border-color: rgba(0, 0, 0, 0.15);--link-color: rgba(0, 0, 0, 0.87);--placeholder: rgba(0, 0, 0, 0.37);--selection: rgba(248.7313432836, 206.1044776119, 9.2686567164, 0.2);--input-highlight: rgba(0, 0, 0, 0.27);",
      } as any;
    }
    if (name === "getActiveTab") {
      return {
        "type":"query",
        "data":{"id":312,"text":"\n\nselect * from countries;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n","title":"Query #1"}
      }
    }
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
