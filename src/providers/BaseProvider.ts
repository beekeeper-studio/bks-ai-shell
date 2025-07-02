import { IModel, ModelConfig } from "@/providers";
import { BaseModel } from "@/providers/BaseModel";

export abstract class BaseProvider {
  public models: IModel[] = [];

  public abstract initialize(apiKey: string): Promise<void>;
  public abstract createModel(config: ModelConfig): BaseModel;

  findModelAndThrow(id: string): IModel {
    const model = this.models.find((m) => m.id === id);
    if (!model) {
      throw new Error(`Unknown model: ${id}`);
    }
    return model;
  }
}
