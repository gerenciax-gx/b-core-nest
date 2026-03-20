export interface EventBusPort {
  emit(event: string, payload: Record<string, unknown>): void;
}
