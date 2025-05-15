import { defineStore } from "pinia";
import { ProviderId } from "./providers";
import { STORAGE_KEYS } from "./config";
import { BaseModelProvider } from "./providers/baseProvider";
import { IChatMessage, IModel } from "./types";
import _ from "lodash";
import { createModelProvider } from "./providers/modelFactory";
import showdown from "showdown";
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import sql from 'highlight.js/lib/languages/sql';

interface ProviderState {
  providerId: ProviderId;
  apiKey: string;
  provider?: BaseModelProvider;
  model?: IModel;
  models: IModel[];
  messages: IChatMessage[];
  isThinking: boolean;
}

hljs.registerLanguage('sql', sql);
hljs.registerLanguage('javascript', javascript);

showdown.extension("highlight", function () {
  return [
    {
      type: "output",
      filter: function (text, converter, options) {
        var left = "<pre><code\\b[^>]*>",
          right = "</code></pre>",
          flags = "g";
        var replacement = function (wholeMatch, match, left, right) {
          var lang = (left.match(/class=\"([^ \"]+)/) || [])[1];
          left = left.slice(0, -1) + ` data-lang="${lang}"` + left.slice(-1);
          if (lang && hljs.getLanguage(lang)) {
            return left + hljs.highlight(lang, match).value + right;
          } else {
            return left + hljs.highlightAuto(match).value + right;
          }
        };
        return showdown.helper.replaceRecursiveRegExp(
          text,
          replacement,
          left,
          right,
          flags,
        );
      },
    },
  ];
});

const converter = new showdown.Converter({extensions: ["highlight"]});

// the first argument is a unique id of the store across your application
export const useProviderStore = defineStore("providers", {
  state: (): ProviderState => ({
    providerId:
      (localStorage.getItem(STORAGE_KEYS.PROVIDER) as ProviderId) || "claude",
    apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || "",
    provider: undefined,
    model: undefined,
    models: [],
    messages: [],
    isThinking: false,
  }),
  actions: {
    async initializeProvider() {
      this.isThinking = true;

      try {
        const provider = await createModelProvider(
          this.providerId,
          this.apiKey,
        );
        await provider.initialize();
        const models = await provider.getAvailableModels();
        this.model = provider.getModel();
        this.models = models;
        this.provider = provider;
        if (this.messages.length === 0) {
          this.messages.push({
            type: "system",
            content:
              "Hi there! I'm your AI-powered assistant. How can I help you today?",
          });
        }
      } catch (e) {
        console.error(e);
        this.messages.push({
          type: "system",
          content: `Something went wrong: ${e}`,
        });
        throw e;
      } finally {
        this.isThinking = false;
      }
    },
    async sendMessage(message: string) {
      if (!this.provider) {
        throw new Error("No provider initialized");
      }

      this.isThinking = true;

      try {
        this.messages.push({ type: "human", content: message });
        const response = await this.provider.sendMessage(
          message,
          this.messages,
        );
        const html = converter.makeHtml(response);
        this.messages.push({
          type: "ai",
          content: html,
        });
      } catch (e) {
        console.error(e);
        this.messages.push({
          type: "system",
          content: `Something went wrong: ${e}`,
        });
        throw e;
      } finally {
        this.isThinking = false;
      }
    },
    sendStreamMessage(message: string): Promise<void> {
      if (!this.provider) {
        throw new Error("No provider initialized");
      }

      this.isThinking = true;

      this.messages.push({ type: "human", content: message });
      const responseMessage: IChatMessage = { type: "ai", content: "" };
      this.messages.push(responseMessage);
      return new Promise<void>((resolve, reject) => {
        this.provider!.sendStreamMessage(message, this.messages, {
          onStreamChunk: async (text) => {
            responseMessage.content += text;
            responseMessage.html = converter.makeHtml(responseMessage.content);
            this.messages = [...this.messages];
          },
          onToolCall: async (tool) => {
            console.log("using tool:", tool);
            // tell the user that a tool is being used
          },
          onFinalized: () => resolve(),
        })
          .catch((e) => {
            console.error(e);
            this.messages.push({
              type: "system",
              content: `Something went wrong: ${e}`,
            });
            reject(e);
          })
          .finally(() => {
            this.isThinking = false;
          });
      });
    },
    setProviderId(providerId: ProviderId) {
      this.providerId = providerId;
      localStorage.setItem(STORAGE_KEYS.PROVIDER, providerId);
    },
    setApiKey(apiKey: string) {
      this.apiKey = apiKey;
      localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    },
    async switchModelById(modelId: string) {
      try {
        await this.provider?.switchModelById(modelId);
        this.model = this.provider?.getModel();
        this.messages.push({
          type: "system",
          content: `Switched to ${this.model?.displayName}`,
        });
      } catch (e) {
        console.error(e);
        this.messages.push({
          type: "system",
          content: `Something went wrong: ${e}`,
        });
        throw e;
      }
    },
  },
});
