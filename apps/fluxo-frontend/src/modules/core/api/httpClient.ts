interface RefreshMessage {
  type: 'REFRESH_SUCCESS' | 'REFRESH_FAILURE';
  accessToken?: string;
  error?: string;
}

export class HttpClient {
  private accessToken: string | null = null;
  private baseUrl: string;
  private channel: BroadcastChannel | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseUrl?: string) {
    // Determine base URL, favoring constructor param, then import.meta.env, then empty string
    this.baseUrl = baseUrl || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';
    
    // Initialize BroadcastChannel if available in the global scope
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('auth_channel');
    }
  }

  public setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Helper to make a request, automatically adding Bearer token if present
   */
  public async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    
    const headers = new Headers(options.headers);
    if (this.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    // Default credentials to include for cookies (e.g. refreshToken cookie)
    const init: RequestInit = {
      ...options,
      headers,
    };
    if (init.credentials === undefined) {
      init.credentials = 'include';
    }

    let response = await fetch(url, init);

    // If we get a 401 Unauthorized, try silent refresh
    if (response.status === 401) {
      try {
        const newToken = await this.refreshAccessToken();
        
        // Retry the request with the new access token
        const newHeaders = new Headers(options.headers);
        newHeaders.set('Authorization', `Bearer ${newToken}`);
        return await fetch(url, { ...init, headers: newHeaders });
      } catch (refreshError) {
        // If refresh fails, bubble up the original 401 response or propagate the failure
        return response;
      }
    }

    return response;
  }

  /**
   * Safe wrapper around navigator.locks that falls back to direct execution if unsupported
   */
  private async withLock<T>(name: string, fn: (lock: any) => Promise<T>, fallbackFn: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return new Promise<T>((resolve, reject) => {
        navigator.locks.request(name, { ifAvailable: true }, async (lock) => {
          if (lock) {
            try {
              const res = await fn(lock);
              resolve(res);
            } catch (err) {
              reject(err);
            }
          } else {
            try {
              const res = await fallbackFn();
              resolve(res);
            } catch (err) {
              reject(err);
            }
          }
        });
      });
    }
    // Fallback: Web Locks API not supported, execute directly
    return fn(null);
  }

  /**
   * Coordinated Refresh: Ensures only one tab does the refresh, others wait and sync.
   */
  public async refreshAccessToken(): Promise<string> {
    // If a refresh is already in progress in this tab, reuse the promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const token = await this.withLock(
          'auth_refresh_lock',
          // Active Tab Flow: Obtained the lock
          async () => {
            const refreshUrl = `${this.baseUrl}/auth/refresh`;
            const res = await fetch(refreshUrl, {
              method: 'POST',
              credentials: 'include',
            });

            if (!res.ok) {
              // Broadcast failure to other waiting tabs
              this.broadcast({ type: 'REFRESH_FAILURE', error: 'Refresh request failed' });
              throw new Error('Refresh request failed');
            }

            const data = await res.json() as { accessToken: string };
            const newToken = data.accessToken;
            this.setAccessToken(newToken);

            // Broadcast success to all other tabs
            this.broadcast({ type: 'REFRESH_SUCCESS', accessToken: newToken });
            return newToken;
          },
          // Passive Tab Flow: Lock is occupied, wait for active tab to broadcast token
          async () => {
            return this.waitForActiveTabRefresh();
          }
        );
        return token;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private broadcast(message: RefreshMessage): void {
    if (this.channel) {
      this.channel.postMessage(message);
    }
  }

  /**
   * Listen to BroadcastChannel for active tab to finish refresh, with safety timeout.
   */
  private waitForActiveTabRefresh(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (!this.channel) {
        // Fallback: If no BroadcastChannel, attempt direct refresh (no locks possible)
        reject(new Error('No BroadcastChannel available'));
        return;
      }

      let timeoutId: any;
      const cleanUp = () => {
        clearTimeout(timeoutId);
        this.channel!.removeEventListener('message', listener);
      };

      const listener = (event: MessageEvent<RefreshMessage>) => {
        const msg = event.data;
        if (msg.type === 'REFRESH_SUCCESS' && msg.accessToken) {
          cleanUp();
          this.setAccessToken(msg.accessToken);
          resolve(msg.accessToken);
        } else if (msg.type === 'REFRESH_FAILURE') {
          cleanUp();
          reject(new Error(msg.error || 'Refresh failed in active tab'));
        }
      };

      this.channel.addEventListener('message', listener);

      // Safety timeout: if active tab crashes or closes before broadcasting, time out and fail
      timeoutId = setTimeout(() => {
        cleanUp();
        reject(new Error('Active tab refresh timeout'));
      }, 8000);
    });
  }

  public close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

export const httpClient = new HttpClient();
