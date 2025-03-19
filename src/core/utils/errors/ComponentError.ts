// src/core/utils/errors/ComponentError.ts
import { BaseError } from "./BaseError";

export class ComponentError extends BaseError {
  public entityId: string;

  constructor(entityId: string, errorMessage: string, additionalInfo?: string) {
    super(`Entity ${entityId}: ${errorMessage}${additionalInfo ? ` (${additionalInfo})` : ''}`);
    this.entityId = entityId;
    // Do not reassign this.name; BaseError already sets it from the constructor’s name.
  }
}
