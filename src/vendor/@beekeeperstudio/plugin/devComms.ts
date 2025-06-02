import type {
  GetTablesRequest,
  GetColumnsRequest,
  GetConnectionInfoRequest,
  GetAllTabsRequest,
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

// Direct mapping approach for better type inference
export type RequestResponsePairs = {
  getTables: { req: GetTablesRequest; res: GetTablesResponse };
  getColumns: { req: GetColumnsRequest; res: GetColumnsResponse };
  getConnectionInfo: {
    req: GetConnectionInfoRequest;
    res: GetConnectionInfoResponse;
  };
  getAllTabs: { req: GetAllTabsRequest; res: GetAllTabsResponse };
  runQuery: { req: RunQueryRequest; res: RunQueryResponse };
  expandTableResult: {
    req: ExpandTableResultRequest;
    res: ExpandTableResultResponse;
  };
  setTabTitle: { req: SetTabTitleRequest; res: SetTabTitleResponse };
};

type RequestMap = {
  getTables: GetTablesRequest;
  getColumns: GetColumnsRequest;
  getConnectionInfo: GetConnectionInfoRequest;
  getAllTabs: GetAllTabsRequest;
  runQuery: RunQueryRequest;
  expandTableResult: ExpandTableResultRequest;
  setTabTitle: SetTabTitleRequest;
};

type ResponseMap = {
  getTables: GetTablesResponse;
  getColumns: GetColumnsResponse;
  getConnectionInfo: GetConnectionInfoResponse;
  getAllTabs: GetAllTabsResponse;
  runQuery: RunQueryResponse;
  expandTableResult: ExpandTableResultResponse;
  setTabTitle: SetTabTitleResponse;
}

export const devModeReponses: {
  [K in keyof RequestMap]: ResponseMap[K];
} = {
  getConnectionInfo: {
    connectionType: "sqlite",
    readOnlyMode: false,
    databaseName: "db.sqlite",
    defaultSchema: "",
  },
  getTables: [{ name: "countries" }, { name: "users" }],
  getColumns: [
    {
      name: "id",
      type: "integer",
    },
  ],
  getAllTabs: [],
  runQuery: {
    results: [
      {
        fields: [{ id: "id", name: "id", dataType: "integer" }],
        rows: [],
      },
    ],
  },
  expandTableResult: undefined,
  setTabTitle: undefined,
};

export async function requestDevMode<K extends keyof RequestMap>(
  name: K,
  args: RequestMap[K]["args"],
): Promise<ResponseMap[K]> {
  if (name === "setTabTitle") {
    document.title = args.title;
    return devModeReponses["setTabTitle"];
  }
  return devModeReponses[name];
}
