const pendingQueries = new Map<
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

  if (id && pendingQueries.has(id)) {
    const { resolve, reject } = pendingQueries.get(id)!;
    pendingQueries.delete(id);

    if (error) {
      reject(error);
    } else {
      resolve(result);
    }
  }
});

export async function query(name: string, args?: any): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    try {
      const id = crypto.randomUUID();
      const data = { id, name, args };
      pendingQueries.set(id, { resolve, reject });
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
