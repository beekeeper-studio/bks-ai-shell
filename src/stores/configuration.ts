/** Usage:
 *
 * 1. Access the state normally to read it.
 * 2. Always use `configure()` to update the state.
 *
 * FUTURE PLAN (probably):
 *
 * - Save configuration to .ini config files via Beekeeper Studio API
 *   instead of local storage?
 */
import { STORAGE_KEYS } from "@/config";
import { ProviderId } from "@/providers";
import { defineStore } from "pinia";
import _ from "lodash";

type ProviderConfigurable = {
  apiKey: string;
};

type Configurable = {
  /** Enable summarization. */
  summarization: boolean;
  activeProviderId: ProviderId;
  activeModelId: string;
  providers: Record<ProviderId, ProviderConfigurable>;
};

export const defaultConfiguration: Configurable = {
  summarization: true,
  activeProviderId: "claude",
  activeModelId: "",
  providers: {
    mock: {
      apiKey: "",
    },
    claude: {
      apiKey: "",
    },
  },
};

type ConfigurationState = Configurable & {};

export const useConfigurationStore = defineStore("configuration", {
  state: (): ConfigurationState => {
    // TODO: remove this at some point
    migrateConfigFromV1_0_X();

    const configuration = JSON.parse(
      localStorage.getItem("configuration") || "{}",
    ) as Partial<Configurable>;

    return _.merge({}, defaultConfiguration, configuration);
  },

  actions: {
    configure<T extends DeepKeyOf<Configurable>>(config: T, value: DeepValue<Configurable, T>) {
      // @ts-expect-error T is always a key of Configurable
      this.$state[config] = value;
      // @ts-expect-error defaultConfiguration keys are all in Configurable
      const configurable: Configurable = _.pick(
        this.$state,
        Object.keys(defaultConfiguration),
      );
      localStorage.setItem("configuration", JSON.stringify(configurable));
    },
  },
});

/**
 * Migrate all configuration stored in AI Shell v1.0.x and remove them.
 * At this time, we only support claude.
 * */
function migrateConfigFromV1_0_X() {
  let configuration = JSON.parse(localStorage.getItem("configuration") || "{}");

  if (
    localStorage.getItem(STORAGE_KEYS.PROVIDER) &&
    localStorage.getItem(STORAGE_KEYS.API_KEY)
  ) {
    const migration: Partial<Configurable> = {
      activeProviderId: "claude",
      /** @ts-expect-error */
      providers: {
        claude: {
          apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY)!,
        },
      },
    };

    configuration = _.merge({}, configuration, migration);

    localStorage.setItem("configuration", JSON.stringify(configuration));
    localStorage.removeItem(STORAGE_KEYS.PROVIDER);
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
  }

  if (localStorage.getItem(STORAGE_KEYS.MODEL)) {
    const modelId = localStorage.getItem(STORAGE_KEYS.MODEL)!;

    const migration: Partial<Configurable> = {
      activeModelId: modelId.startsWith(`claude:`)
        ? modelId.split(":")[1]
        : modelId,
    };

    configuration = _.merge({}, configuration, migration);

    localStorage.setItem("configuration", JSON.stringify(configuration));
    localStorage.removeItem(STORAGE_KEYS.MODEL);
  }
}

/**
 * Ref: https://stackoverflow.com/a/66661477/10012118
 * with little modifications
 */
declare type DeepKeyOf<T> = (
  [T] extends [never]
    ? ""
    : T extends Record<string, any>
    ? {
        [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DeepKeyOf<T[K]>>}`;
      }[Exclude<keyof T, symbol>]
    : ""
) extends infer D
  ? Extract<D, string>
  : never;

type DotPrefix<T extends string> = T extends "" ? "" : `.${T}`;

type DeepValue<T, P extends string> =
  P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
      ? DeepValue<T[Key], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;

