/**
 * Per-phone command queue that serializes requests to the same host.
 * Prevents concurrent HTTP requests to a single phone, which Cisco IP phones
 * handle poorly (they tend to drop or delay overlapping requests).
 */
export class PhoneCommandQueue {
  private chains = new Map<string, Promise<unknown>>();

  private normalizeHost(host: string): string {
    return host.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  /**
   * Execute a function serialized per host. If another request to the same host
   * is in flight, this waits for it to complete (regardless of success/failure)
   * before running.
   */
  async execute<T>(host: string, fn: () => Promise<T>): Promise<T> {
    const key = this.normalizeHost(host);
    const previous = this.chains.get(key) ?? Promise.resolve();

    const next = previous
      // Always wait for previous to settle (success or failure)
      .catch(() => {})
      .then(() => fn());

    // Store the chain so the next caller waits for this one
    this.chains.set(key, next);

    try {
      return await next;
    } finally {
      // Clean up if this is still the tail of the chain
      if (this.chains.get(key) === next) {
        this.chains.delete(key);
      }
    }
  }
}

/** Singleton queue instance shared across the MCP server */
export const phoneQueue = new PhoneCommandQueue();
