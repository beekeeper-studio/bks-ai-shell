import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import PromptInput from "../../src/components/common/PromptInput.vue";

function buildPromptInput() {
  const wrapper = mount(PromptInput, {
    props: {
      storageKey: "test-key",
      selectedModel: {
        id: "very-good-model",
      },
    },
    global: {
      stubs: {
        Dropdown: true,
        DropdownOption: true,
      },
    },
  });
  const textarea = wrapper.find("textarea");

  return {
    value: () => textarea.element.value,
    type: (text: string) => ({ text }),
    press: (action: "enter" | "up" | "down") => `keydown.${action}` as const,
    /** Sequentially perform actions */
    async seq(...actions: (string | { text: string })[]) {
      for (const action of actions) {
        if (typeof action === "string") {
          await textarea.trigger(action);
        } else {
          await textarea.setValue(action.text);
        }
      }
    },
    wrapper,
  };
}

describe("PromptInput", () => {
  beforeEach(() => {
    // Initialize localStorage with empty history
    localStorage.setItem("test-key", "[]");
  });

  it("can send messages", async () => {
    const { wrapper, seq, type, press, value } = buildPromptInput();

    await seq(type("1st message"), press("enter"));

    const submit = wrapper.emitted("submit");

    expect(value()).toBe("");
    expect(submit).toHaveLength(1);
    expect(submit?.[0]).toEqual(["1st message"]);

    await seq(type("2nd message"), press("enter"));

    expect(value()).toBe("");
    expect(submit).toHaveLength(2);
    expect(submit?.[1]).toEqual(["2nd message"]);

    await seq(type("3rd message"));
    await wrapper.find("[test-id=submit]").trigger("click");

    expect(value()).toBe("");
    expect(submit).toHaveLength(3);
    expect(submit?.[2]).toEqual(["3rd message"]);
  });

  it("can not send empty messages", async () => {
    const { wrapper, seq, type, press, value } = buildPromptInput();

    await seq(press("enter"));
    expect(wrapper.emitted("submit")).toBeUndefined();

    await seq(type("      "), press("enter"));
    expect(value()).toBe("      ");
    expect(wrapper.emitted("submit")).toBeUndefined();

    await seq(type("\n\n\n\n\n\n"), press("enter"));
    expect(value()).toBe("\n\n\n\n\n\n");
    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("can go back/forward in history", async () => {
    const { seq, type, press, value } = buildPromptInput();

    await seq(type("1st message"), press("enter"), press("up"));
    expect(value()).toBe("1st message");

    await seq(press("down"));
    expect(value()).toBe("");

    await seq(type("2nd message"), press("enter"));
    expect(value()).toBe("");

    await seq(press("up"));
    expect(value()).toBe("2nd message");

    await seq(press("up"));
    expect(value()).toBe("1st message");
  });

  it("does not add messages starting with a space to history", async () => {
    const { seq, type, press, value } = buildPromptInput();

    await seq(type(" 1st message"), press("enter"), press("up"));
    expect(value()).toBe("");
  });

  it("can send previous messages", async () => {
    const { seq, type, press, value } = buildPromptInput();

    await seq(
      type("1st message"),
      press("enter"),

      type("2nd message"),
      press("enter"),

      press("up"), // 2nd message

      type("3rd message"),
      press("enter"),

      press("up"), // 3rd message
    );
    expect(value()).toBe("3rd message");

    await seq(press("up"));
    expect(value()).toBe("2nd message");

    await seq(press("up"));
    expect(value()).toBe("1st message");
  });

  it("does not add duplicate messages to history in a row", async () => {
    const { seq, type, press, value } = buildPromptInput();

    await seq(
      type("1st message"),
      press("enter"),

      type("2nd message"),
      press("enter"),

      press("up"), // 2nd message
      press("enter"),

      press("up"), // 2nd message
    );
    expect(value()).toBe("2nd message");

    await seq(press("up"));
    expect(value()).toBe("1st message");

    await seq(type("2nd message"), press("enter"), press("up"));
    expect(value()).toBe("2nd message");

    await seq(press("up"));
    expect(value()).toBe("1st message");
  });
});
