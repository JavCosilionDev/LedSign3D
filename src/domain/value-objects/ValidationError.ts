/** Error de validación del dominio (invariantes de ProjectSettings). */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
