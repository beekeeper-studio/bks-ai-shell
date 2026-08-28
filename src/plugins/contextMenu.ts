import type { Plugin } from "vue";
import type {
  ContextMenuElement,
  DividerItem,
  MenuItem,
} from "@beekeeperstudio/ui-kit";
import { clipboard } from "@beekeeperstudio/plugin";

type TextInput = HTMLInputElement | HTMLTextAreaElement;

export interface OpenMenuOptions {
  event: Event;
  options: MenuItem[];
}

export function openMenu({ event, options }: OpenMenuOptions) {
  const menu = document.createElement("bks-context-menu") as ContextMenuElement;
  menu.event = event;
  menu.options = options;
  menu.addEventListener("bks-destroyed", () => {
    menu.remove();
  });
  document.body.appendChild(menu);
}

const divider: DividerItem = { type: "divider", id: "divider" };

/** Adds a cut/copy/paste context menu to every text input in the app. */
export const ContextMenu: Plugin = {
  install(app) {
    const menu = new InputContextMenu();
    app.mixin({
      mounted() {
        document.addEventListener("contextmenu", menu.handle);
      },
      unmounted() {
        document.removeEventListener("contextmenu", menu.handle);
      },
    });
    app.config.globalProperties.$bks = { openMenu };
  },
};

class InputContextMenu {
  constructor() {
    this.handle = this.handle.bind(this);
  }

  static targetTypes = [
    "text",
    "password",
    "email",
    "url",
    "tel",
    "search",
    "number",
  ];

  handle(event: Event) {
    if (event.defaultPrevented) {
      return;
    }

    const target = event.target;

    if (!this.isTextInput(target)) {
      return;
    }

    if (target.dataset?.disableContextMenu) {
      return;
    }

    event.preventDefault();

    if (!target.disabled) {
      target.focus(); // clipboard and undo/redo act on the focused field
    }

    const editable = this.isEditable(target);
    const hasSelection = this.hasSelectedText(target);

    openMenu({
      event,
      options: [
        {
          label: "Undo",
          handler: () => document.execCommand("undo"),
          disabled: !editable,
          shortcut: "Control+Z",
        },
        {
          label: "Redo",
          handler: () => document.execCommand("redo"),
          disabled: !editable,
          shortcut: "Control+Shift+Z",
        },
        divider,
        {
          label: "Cut",
          handler: async () => {
            const selection = this.selectionOf(target);
            if (!selection.text) {
              return;
            }
            await clipboard.writeText(selection.text);
            this.replaceSelection(target, "");
          },
          disabled: !hasSelection || !editable,
          shortcut: "Control+X",
        },
        {
          label: "Copy",
          handler: async () => {
            const selection = this.selectionOf(target);
            if (!selection.text) {
              return;
            }
            await clipboard.writeText(selection.text);
          },
          disabled: !hasSelection,
          shortcut: "Control+C",
        },
        {
          label: "Paste",
          handler: async () => {
            const text = await clipboard.readText();
            if (!text) {
              return;
            }
            this.replaceSelection(target, text);
          },
          disabled: !editable,
          shortcut: "Control+V",
        },
        divider,
        {
          label: "Select All",
          handler: () => target.select(),
          shortcut: "Control+A",
        },
      ],
    });
  }

  private isTextInput(target: EventTarget | null): target is TextInput {
    if (target instanceof HTMLTextAreaElement) {
      return true;
    }
    if (target instanceof HTMLInputElement) {
      return InputContextMenu.targetTypes.includes(target.type);
    }
    return false;
  }

  private isEditable(el: HTMLElement | null) {
    if (!el) {
      return false;
    }
    if (!this.isTextInput(el)) {
      return el.isContentEditable;
    }
    return !el.readOnly && !el.disabled;
  }

  private hasSelectedText(target: TextInput) {
    return (
      typeof target.selectionStart === "number" &&
      typeof target.selectionEnd === "number" &&
      target.selectionStart !== target.selectionEnd
    );
  }

  private selectionOf(target: TextInput) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    return { start, end, text: target.value.slice(start, end) };
  }

  private replaceSelection(target: TextInput, text: string) {
    target.focus();
    // insertText keeps the native undo stack intact
    if (document.execCommand("insertText", false, text)) {
      return;
    }
    const { start, end } = this.selectionOf(target);
    target.setRangeText(text, start, end, "end");
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
