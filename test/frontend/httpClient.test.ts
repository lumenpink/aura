import { describe, expect, it, beforeEach, mock, afterEach } from "bun:test";
import { HttpClient } from "../../apps/frontend/src/modules/core/api/httpClient";

// --- MOCK BROADCASTCHANNEL ---
class MockBroadcastChannel {
  name: string;
  private static instances: Map<string, MockBroadcastChannel[]> = new Map();
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Set<(event: MessageEvent) => void> = new Set();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.instances.has(name)) {
      MockBroadcastChannel.instances.set(name, []);
    }
    MockBroadcastChannel.instances.get(name)!.push(this);
  }

  postMessage(message: any) {
    const list = MockBroadcastChannel.instances.get(this.name) || [];
    for (const inst of list) {
      if (inst !== this) {
        const event = { data: message } as MessageEvent;
        if (inst.onmessage) inst.onmessage(event);
        for (const l of inst.listeners) {
          l(event);
        }
      }
    }
  }

  addEventListener(type: string, listener: any) {
    if (type === "message") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: any) {
    if (type === "message") {
      this.listeners.delete(listener);
    }
  }

  close() {
    const list = MockBroadcastChannel.instances.get(this.name) || [];
    const index = list.indexOf(this);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  static clearAll() {
    MockBroadcastChannel.instances.clear();
  }
}

// --- MOCK LOCK MANAGER ---
class MockLockManager {
  private activeLocks: Set<string> = new Set();
  private queue: Map<
    string,
    Array<{ requestFn: () => Promise<any>; resolve: (v: any) => void; reject: (e: any) => void }>
  > = new Map();

  async request(name: string, options: any, callback?: any): Promise<any> {
    let opts = options;
    let cb = callback;
    if (typeof options === "function") {
      cb = options;
      opts = {};
    }

    const ifAvailable = opts.ifAvailable || false;

    return new Promise((resolve, reject) => {
      const runLock = async () => {
        this.activeLocks.add(name);
        try {
          const lock = { name, mode: "exclusive" };
          const result = await cb(lock);
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.activeLocks.delete(name);
          this.processNext(name);
        }
      };

      if (this.activeLocks.has(name)) {
        if (ifAvailable) {
          cb(null).then(resolve).catch(reject);
        } else {
          if (!this.queue.has(name)) {
            this.queue.set(name, []);
          }
          this.queue.get(name)!.push({ requestFn: runLock, resolve, reject });
        }
      } else {
        runLock();
      }
    });
  }

  private processNext(name: string) {
    const list = this.queue.get(name) || [];
    if (list.length > 0 && !this.activeLocks.has(name)) {
      const next = list.shift()!;
      next.requestFn();
    }
  }

  clear() {
    this.activeLocks.clear();
    this.queue.clear();
  }
}

// Inject mocks globally
globalThis.BroadcastChannel = MockBroadcastChannel as any;
const mockLocks = new MockLockManager();
globalThis.navigator = {
  locks: mockLocks,
} as any;

describe("HttpClient", () => {
  let originalFetch: typeof fetch;
  let fetchMockCalls: Array<{ url: string; init?: RequestInit }> = [];
  let refreshEndpointStatus = 200;
  let refreshDelayMs = 0;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMockCalls = [];
    refreshEndpointStatus = 200;
    refreshDelayMs = 0;
    MockBroadcastChannel.clearAll();
    mockLocks.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const setupMockFetch = (handlers: {
    onRequest?: (url: string, init?: RequestInit) => Response | Promise<Response>;
  }) => {
    globalThis.fetch = (async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input.toString();
      fetchMockCalls.push({ url, init });

      if (handlers.onRequest) {
        return handlers.onRequest(url, init);
      }

      return new Response("OK", { status: 200 });
    }) as any;
  };

  it("should send access token in Authorization header", async () => {
    setupMockFetch({
      onRequest: (url, init) => {
        expect(init?.headers).toBeDefined();
        const headers = new Headers(init?.headers);
        expect(headers.get("Authorization")).toBe("Bearer test-token-123");
        return new Response("Data", { status: 200 });
      },
    });

    const client = new HttpClient("http://localhost:12202");
    client.setAccessToken("test-token-123");

    const res = await client.request("/api/data");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Data");
  });

  it("should perform silent refresh on 401 and retry", async () => {
    let requestsCount = 0;
    setupMockFetch({
      onRequest: async (url, init) => {
        if (url.includes("/auth/refresh")) {
          return new Response(JSON.stringify({ accessToken: "new-token-456" }), { status: 200 });
        }
        if (url.includes("/api/protected")) {
          requestsCount++;
          if (requestsCount === 1) {
            return new Response("Unauthorized", { status: 401 });
          }
          const headers = new Headers(init?.headers);
          expect(headers.get("Authorization")).toBe("Bearer new-token-456");
          return new Response("SuccessData", { status: 200 });
        }
        return new Response("Not Found", { status: 444 });
      },
    });

    const client = new HttpClient("http://localhost:12202");
    client.setAccessToken("expired-token");

    const res = await client.request("/api/protected");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("SuccessData");
    expect(client.getAccessToken()).toBe("new-token-456");

    // Check that we hit the API protected route twice (401 first, then 200 retry)
    expect(requestsCount).toBe(2);
  });

  it("should coordinate refresh across multiple tabs (only one requests API)", async () => {
    let refreshCalls = 0;
    let protectedRequestsTab1 = 0;
    let protectedRequestsTab2 = 0;

    setupMockFetch({
      onRequest: async (url, init) => {
        if (url.includes("/auth/refresh")) {
          refreshCalls++;
          if (refreshDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, refreshDelayMs));
          }
          if (refreshEndpointStatus === 200) {
            return new Response(JSON.stringify({ accessToken: "rotated-token-999" }), { status: 200 });
          }
          return new Response("Refresh Failed", { status: refreshEndpointStatus });
        }

        if (url.includes("/api/tab1")) {
          protectedRequestsTab1++;
          if (protectedRequestsTab1 === 1) {
            return new Response("Unauthorized", { status: 401 });
          }
          const headers = new Headers(init?.headers);
          expect(headers.get("Authorization")).toBe("Bearer rotated-token-999");
          return new Response("Tab1Success", { status: 200 });
        }

        if (url.includes("/api/tab2")) {
          protectedRequestsTab2++;
          if (protectedRequestsTab2 === 1) {
            return new Response("Unauthorized", { status: 401 });
          }
          const headers = new Headers(init?.headers);
          expect(headers.get("Authorization")).toBe("Bearer rotated-token-999");
          return new Response("Tab2Success", { status: 200 });
        }

        return new Response("Not Found", { status: 444 });
      },
    });

    // Simulate 2 separate clients (simulating 2 browser tabs of same origin)
    const clientTab1 = new HttpClient("http://localhost:12202");
    const clientTab2 = new HttpClient("http://localhost:12202");

    clientTab1.setAccessToken("expired-token-1");
    clientTab2.setAccessToken("expired-token-2");

    refreshDelayMs = 40; // Add simulated delay so both calls run concurrently

    // Trigger requests concurrently
    const [res1, res2] = await Promise.all([
      clientTab1.request("/api/tab1"),
      clientTab2.request("/api/tab2"),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(await res1.text()).toBe("Tab1Success");
    expect(await res2.text()).toBe("Tab2Success");

    // Both tabs must now hold the rotated access token
    expect(clientTab1.getAccessToken()).toBe("rotated-token-999");
    expect(clientTab2.getAccessToken()).toBe("rotated-token-999");

    // CRITICAL ASSERTION: refresh request was only made ONCE to the backend API!
    expect(refreshCalls).toBe(1);

    clientTab1.close();
    clientTab2.close();
  });
});
