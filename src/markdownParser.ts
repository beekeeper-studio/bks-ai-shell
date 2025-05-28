import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

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
            class="btn copy-btn"
            data-action="copy"
            data-action-target="${codeId}"
          >
            <span class="material-symbols-outlined">content_copy</span>
            <span class="copy-label">Copy</span>
            <span class="copied-label">Copied</span>
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
            <div class="header">
              <span class="lang">${token.lang || ""}</span>
              <div>${actionsHtml}</div>
            </div>
            <pre><code id="${codeId}" class="${className}"${langAttr}>${token.text}</code></pre>
          </div>
        `;
      },
    },
  ],
});

export function parseMarkdownToHTML(document: string): string {
  return marked.parse(document, { async: false });
}
