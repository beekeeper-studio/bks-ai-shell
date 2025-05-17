import { RequestMap } from "./Comms";

const devModeReponses: Record<keyof RequestMap, RequestMap[keyof RequestMap]["return"]> = {
  getTheme: {
        cssString:
          "--theme-bg: #f8f8f8;--theme-base: black;--theme-primary: rgb(248.7313432836, 206.1044776119, 9.2686567164);--theme-secondary: #0099ff;--text-dark: rgba(0, 0, 0, 0.87);--text: rgba(0, 0, 0, 0.67);--text-light: rgba(0, 0, 0, 0.57);--text-lighter: rgba(0, 0, 0, 0.37);--text-hint: rgba(0, 0, 0, 0.37);--text-disabled: rgba(0, 0, 0, 0.37);--brand-info: #3498db;--brand-success: #15db95;--brand-warning: #dc700c;--brand-danger: #ff5d59;--brand-default: rgba(0, 0, 0, 0.57);--brand-purple: #9858ff;--brand-pink: #ff00f0;--border-color: rgba(0, 0, 0, 0.15);--link-color: rgba(0, 0, 0, 0.87);--placeholder: rgba(0, 0, 0, 0.37);--selection: rgba(248.7313432836, 206.1044776119, 9.2686567164, 0.2);--input-highlight: rgba(0, 0, 0, 0.27);--bks-text-editor-activeline-bg-color: rgba(0, 0, 0, .03);--bks-text-editor-activeline-gutter-bg-color: rgba(0, 0, 0, .03);--bks-text-editor-atom-fg-color: #ae81ff;--bks-text-editor-bg-color: white;--bks-text-editor-bracket-fg-color: rgba(0, 0, 0, .67);--bks-text-editor-builtin-fg-color: #66d9ef;--bks-text-editor-comment-attribute-fg-color: #97b757;--bks-text-editor-comment-def-fg-color: #bc9262;--bks-text-editor-comment-fg-color: #75715e;--bks-text-editor-comment-tag-fg-color: #bc6283;--bks-text-editor-comment-type-fg-color: #bc6283;--bks-text-editor-cursor-bg-color: rgba(0, 0, 0, .87);--bks-text-editor-def-fg-color: #fd971f;--bks-text-editor-error-bg-color: #f8f8f0;--bks-text-editor-error-fg-color: #f92672;--bks-text-editor-fg-color: rgba(0, 0, 0, .87);--bks-text-editor-gutter-bg-color: white;--bks-text-editor-guttermarker-fg-color: #f8f8f2;--bks-text-editor-guttermarker-subtle-fg-color: rgba(0, 0, 0, .25);--bks-text-editor-header-fg-color: #ae81ff;--bks-text-editor-keyword-fg-color: #ff00f0;--bks-text-editor-linenumber-fg-color: rgba(0, 0, 0, .25);--bks-text-editor-link-fg-color: #ae81ff;--bks-text-editor-matchingbracket-fg-color: #999977;--bks-text-editor-matchingbracket-bg-color: rgba(153, 153, 119, .2);--bks-text-editor-number-fg-color: #ff8d21;--bks-text-editor-property-fg-color: #9CDCFE;--bks-text-editor-selected-bg-color: rgba(0, 0, 0, .25);--bks-text-editor-string-fg-color: rgb(12.075, 125.925, 85.675);--bks-text-editor-tag-fg-color: #f92672;--bks-text-editor-variable-2-fg-color: #0099ff;--bks-text-editor-variable-3-fg-color: #66d9ef;--bks-text-editor-variable-fg-color: hsla(0, 0%, -10%, .87);--bks-text-editor-namespace-fg-color: #7a7a7a;--bks-text-editor-type-fg-color: #00aa66;--bks-text-editor-class-fg-color: #4EC9B0;--bks-text-editor-enum-fg-color: #00aa77;--bks-text-editor-interface-fg-color: #00cc88;--bks-text-editor-struct-fg-color: #00bb99;--bks-text-editor-typeParameter-fg-color: #00aaaa;--bks-text-editor-parameter-fg-color: #2288dd;--bks-text-editor-enumMember-fg-color: #4488ff;--bks-text-editor-decorator-fg-color: #cc33cc;--bks-text-editor-event-fg-color: #5555ff;--bks-text-editor-function-fg-color: #dcdcaa;--bks-text-editor-method-fg-color: #4488ee;--bks-text-editor-macro-fg-color: #8855dd;--bks-text-editor-label-fg-color: #666666;--bks-text-editor-regexp-fg-color: #ee5555;--bks-text-editor-operator-fg-color: #d4d4d4;--bks-text-editor-definition-fg-color: #fd971f;--bks-text-editor-variableName-fg-color: #f8f8f2;--bks-text-editor-bool-fg-color: #ae81ff;--bks-text-editor-null-fg-color: #ae81ff;--bks-text-editor-className-fg-color: #4EC9B0;--bks-text-editor-propertyName-fg-color: #9CDCFE;--bks-text-editor-punctuation-fg-color: rgba(0, 0, 0, .67);--bks-text-editor-meta-fg-color: #75715e;--bks-text-editor-typeName-fg-color: #4EC9B0;--bks-text-editor-labelName-fg-color: #C8C8C8;--bks-text-editor-attributeName-fg-color: #9CDCFE;--bks-text-editor-attributeValue-fg-color: rgb(12.075, 125.925, 85.675);--bks-text-editor-heading-fg-color: #ae81ff;--bks-text-editor-url-fg-color: #ae81ff;--bks-text-editor-processingInstruction-fg-color: #75715e;--bks-text-editor-special-string-fg-color: rgb(16.5375, 172.4625, 117.3375);--bks-text-editor-context-menu-bg-color: rgb(235.25, 235.25, 235.25);--bks-text-editor-context-menu-fg-color: rgba(0, 0, 0, .87);--bks-text-editor-context-menu-item-bg-color-active: #3498db;--bks-text-editor-context-menu-item-fg-color-active: #ffffff;--bks-text-editor-context-menu-item-bg-color-hover: rgba(0, 0, 0, .05);",
  },
  getActiveTab: {
    type: "query",
    data: {
      id: 312,
      text: "\n\nselect * from countries;\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
      title: "Query #1",
    },
  },
  updateQueryText: {
    success: true,
    message: "Query updated",
    tabId: 312,
  },
  getConnectionInfo: {},
  getTables: ["countries", "users"],
  getColumns: [
    {
      name: "id",
      type: "integer",
      nullable: false,
      default: null,
    },
  ],
}

export async function requestDevMode<K extends keyof RequestMap>(
  name: K,
  ..._args: RequestMap[K]["args"] extends undefined
    ? []
    : [RequestMap[K]["args"]]
): Promise<RequestMap[K]["return"]> {
  return devModeReponses[name];
}
