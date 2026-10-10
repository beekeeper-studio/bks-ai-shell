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
  items: MenuItem[];
}

class ContextMenuManager {
  items: MenuItem[] = [];

  flushItems(event: Event) {
    event.preventDefault();

    const target = event.target;
    const items = this.items;

    this.items = [];

    if (this.isTextInput(target)) {
      if (items.length > 0) {
        items.unshift(divider, ...this.getDefaultItems(target));
      } else {
        items.unshift(...this.getDefaultItems(target));
      }
    }

    if (items.length === 0) {
      return;
    }

    const element = document.createElement(
      "bks-context-menu",
    ) as ContextMenuElement;

    element.event = event;
    element.options = items;

    element.addEventListener("bks-destroyed", () => {
      element.remove();
    });

    document.body.appendChild(element);
  }

  static inputTypes = [
    "text",
    "password",
    "email",
    "url",
    "tel",
    "search",
    "number",
  ];

  private getDefaultItems(target: TextInput) {
    if (!target.disabled) {
      target.focus(); // clipboard and undo/redo act on the focused field
    }

    const editable = this.isEditable(target);
    const hasSelection = this.hasSelectedText(target);

    return [
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
    ];
  }

  private isTextInput(target: EventTarget | null): target is TextInput {
    if (target instanceof HTMLTextAreaElement) {
      return true;
    }
    if (target instanceof HTMLInputElement) {
      return ContextMenuManager.inputTypes.includes(target.type);
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

const contextMenu = new ContextMenuManager();

const divider: DividerItem = { type: "divider", id: "divider" };

/** Adds a cut/copy/paste context menu to every text input in the app. */
export const ContextMenu: Plugin = {
  install(app) {
    document.addEventListener("contextmenu", (event) => {
      contextMenu.flushItems(event);
    });
    app.config.globalProperties.$bks = {
      openMenu({ event, items }: OpenMenuOptions) {
        contextMenu.items.unshift(...items);

        if (event.cancelBubble) {
          contextMenu.flushItems(event);
        }
      },
    };
  },
};
