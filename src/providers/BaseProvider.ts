import { IModel, ModelConfig } from "@/providers";
import { BaseModel } from "@/providers/BaseModel";

export abstract class BaseProvider {
  public static id: string;
  public static displayName: string;

  public models: IModel[] = [];

  public abstract initialize(apiKey: string): Promise<void>;
  public abstract createModel(config: ModelConfig): BaseModel;
}

