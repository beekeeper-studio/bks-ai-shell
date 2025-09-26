import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { getAppVersion } from "@beekeeperstudio/plugin";

const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

let copyCounter = 0;

async function useExtensions() {
  const appVersion = await getAppVersion();
  const supportOpenInQueryEditor = appVersion !== "5.3";
  marked.use({
    extensions: [
      {
        name: "code",
        renderer(token) {
          let className = "hljs";
          let langAttr = "";
          const codeId = "code-" + copyCounter++;

          if (token.lang) {
            className += ` language-${token.lang}`;
            langAttr = ` data-lang="${token.lang}"`;
          }

          let actionsHtml = `
            <button
              class="btn"
              ${supportOpenInQueryEditor ? "" : "disabled"}
              data-action="open-in-query-editor"
              data-action-target="${codeId}"
            >
              <span class="material-symbols-outlined">open_in_new</span>
              <span class="title-popup">
                Open in query editor
                ${supportOpenInQueryEditor ? "" : "<br>(requires Beekeeper Studio 5.4+)"}
              </span>
            </button>
            <button
              class="btn"
              data-action="copy"
              data-action-target="${codeId}"
            >
              <span class="material-symbols-outlined copy-icon">content_copy</span>
              <span class="material-symbols-outlined copied-icon">check</span>
              <span class="title-popup">
                <span class="copy-label">Copy</span>
                <span class="copied-label">Copied</span>
              </span>
            </button>
          `;

          // if (token.lang === "sql") {
          //   actionsHtml += `
          //     <button
          //       class="btn copy-btn"
          //       data-action="run"
          //       data-action-target="${codeId}"
          //     >
          //       <span class="material-symbols-outlined">play_arrow</span>
          //       Run
          //     </button>
          //   `;
          // }

          return `
            <div class="code-block">
              <div class="lang">${token.lang || ""}</div>
              <div class="actions">
                <div class="group">${actionsHtml}</div>
              </div>
              <pre><code id="${codeId}" class="${className}"${langAttr}>${token.text}</code></pre>
            </div>
          `;
        },
      },
    ],
  });
}

useExtensions();

export function parseMarkdownToHTML(document: string): string {
  return marked.parse(document, { async: false });
}
