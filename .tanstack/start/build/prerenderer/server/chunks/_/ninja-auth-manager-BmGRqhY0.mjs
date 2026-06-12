import { existsSync, promises } from 'node:fs';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const OAUTH_CONFIG = {
  CLIENT_ID: "WjsyFHxF1B1OT7EEh0LWc3NZJktQ2an2",
  REDIRECT_URI: "com.sharkninja.ninja://logineu.sharkninja.com/android/com.sharkninja.ninja.connected.kitchen/callback",
  SCOPE: "openid profile email offline_access read:users read:current_user read:user_idp_tokens",
  AUTH_BASE_URL: "https://logineu.sharkninja.com"
};
const AYLA_PUBLIC_CONFIG = {
  BASE_URL: "https://user-field-eu.aylanetworks.com",
  TOKEN_SIGN_IN_ENDPOINT: "/api/v1/token_sign_in",
  APP_ID: "android_ninjakitchen_prod-PQ-id"
};
const AYLA_SERVER_CONFIG = {
  APP_SECRET: process.env.AYLA_APP_SECRET
};
for (const [key, value] of Object.entries({
  ...OAUTH_CONFIG,
  ...AYLA_PUBLIC_CONFIG
})) {
  if (!value) {
    const message = `FATAL ERROR: Missing required public environment variable for ${key}. Check your .env file.`;
    {
      console.error(message);
      process.exit(1);
    }
    throw new Error(message);
  }
}
{
  if (!AYLA_SERVER_CONFIG.APP_SECRET) {
    console.error(
      "FATAL ERROR: Missing required server environment variable 'AYLA_APP_SECRET'."
    );
    process.exit(1);
  }
}
function getAylaServerConfig() {
  return AYLA_SERVER_CONFIG;
}
const config = {
  oauth: {
    clientId: OAUTH_CONFIG.CLIENT_ID,
    redirectUri: OAUTH_CONFIG.REDIRECT_URI,
    scope: OAUTH_CONFIG.SCOPE,
    authBaseUrl: OAUTH_CONFIG.AUTH_BASE_URL
  },
  ayla: {
    baseUrl: AYLA_PUBLIC_CONFIG.BASE_URL,
    tokenSignInEndpoint: AYLA_PUBLIC_CONFIG.TOKEN_SIGN_IN_ENDPOINT,
    appId: AYLA_PUBLIC_CONFIG.APP_ID
    // appSecret is intentionally omitted from client-side config
  },
  settings: {
    tokenExpiryBufferMs: 6e4,
    // 60 seconds
    maxLoginRetries: 3,
    loginTimeoutMs: 3e4
    // 30 seconds
  }
};
const AUTH_STATE_FILE = "auth-state.json";
const TOKEN_EXPIRY_BUFFER_MS = config.settings.tokenExpiryBufferMs;
class AuthError extends Error {
  constructor(message, stage) {
    super(message);
    this.stage = stage;
    this.name = "AuthError";
  }
}
class NinjaAuthManager {
  constructor(browserAutomator, credentials, initialState) {
    __publicField(this, "state", {});
    __publicField(this, "stateLoaded", false);
    __publicField(this, "browserAutomator");
    __publicField(this, "credentials");
    __publicField(this, "tokenCache", /* @__PURE__ */ new Map());
    __publicField(this, "inFlightRequests", /* @__PURE__ */ new Map());
    __publicField(this, "DEFAULT_CACHE_TTL", 3600 * 1e3);
    __publicField(this, "metrics", {
      successCount: 0,
      failureCount: 0,
      refreshCount: 0
    });
    this.browserAutomator = browserAutomator;
    if (!credentials) {
      throw new Error("AuthManager constructor was called without credentials.");
    }
    this.credentials = credentials;
    if (initialState) {
      this.state = initialState;
      this.stateLoaded = true;
    }
  }
  // Private constructor for controlled instantiation
  async getBrowserAutomator() {
    if (!this.browserAutomator) {
      const { PlaywrightBrowserAutomator } = await import('./browser-automator-D1_eF9B5.mjs');
      this.browserAutomator = new PlaywrightBrowserAutomator();
    }
    return this.browserAutomator;
  }
  static async playwrightRequest() {
    const { request } = await import('file:///Users/thomasrooney/Code/ninjapal.io/node_modules/@playwright/test/index.mjs');
    return request;
  }
  /**
   * Factory method to create a new NinjaAuthManager instance for a specific user.
   * @param credentials The user's email and password (required).
   * @param initialState Optional initial auth state to hydrate the instance.
   * @returns A new instance of NinjaAuthManager.
   */
  static create(credentials, initialState) {
    if (!credentials || !credentials.email || !credentials.password) {
      throw new Error(
        "Credentials with email and password are required to create an AuthManager instance."
      );
    }
    return new NinjaAuthManager(void 0, credentials, initialState);
  }
  /**
   * Get browser-based authentication artifacts with caching and race condition handling
   */
  async getIdentityAuth() {
    const cacheKey = `identity_${this.credentials.email}`;
    const cached = this.getCachedItem(cacheKey);
    if (cached) {
      this.logEvent("auth_success", { stage: "browser", source: "cache" });
      return cached;
    }
    if (this.inFlightRequests.has(cacheKey)) {
      console.log(
        "[NinjaAuthManager] Attaching to in-flight browser auth request"
      );
      const request = this.inFlightRequests.get(cacheKey);
      if (!request) {
        throw new Error("In-flight request not found");
      }
      return request;
    }
    const authPromise = this.performBrowserAuth().then((identity) => {
      this.setCachedItem(cacheKey, identity, this.DEFAULT_CACHE_TTL);
      this.inFlightRequests.delete(cacheKey);
      return identity;
    }).catch((error) => {
      this.inFlightRequests.delete(cacheKey);
      throw error;
    });
    this.inFlightRequests.set(cacheKey, authPromise);
    return authPromise;
  }
  /**
   * Perform browser authentication
   */
  async performBrowserAuth() {
    await this.ensureStateLoaded();
    this.logEvent("auth_started", { stage: "browser" });
    try {
      const startTime = Date.now();
      const automator = await this.getBrowserAutomator();
      const identity = await automator.performLogin(this.credentials);
      this.state.identity = {
        cookies: identity.cookies,
        authorizationCode: identity.authorizationCode,
        pkceVerifier: identity.pkceVerifier,
        state: identity.state
      };
      this.updateMetadata("success", Date.now() - startTime);
      await this.saveState();
      this.logEvent("auth_success", { stage: "browser" });
      return identity;
    } catch (error) {
      this.updateMetadata("failure");
      this.logEvent("auth_failure", {
        stage: "browser",
        error: error instanceof Error ? error.message : "Unknown browser auth error"
      });
      throw new AuthError(
        `Browser authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "browser"
      );
    }
  }
  /**
   * Get OAuth ID token with caching and automatic refresh
   */
  async getIDToken() {
    var _a, _b, _c;
    const cacheKey = `oauth_id_${this.credentials.email}`;
    const cached = this.getCachedItem(cacheKey);
    if (cached) {
      return cached;
    }
    if (this.state.oauthTokens && !this.isTokenExpired(this.state.oauthTokens.expiresAt)) {
      const idToken = this.state.oauthTokens.idToken;
      const remainingTTL = this.state.oauthTokens.expiresAt - Date.now() - TOKEN_EXPIRY_BUFFER_MS;
      if (remainingTTL > 0) {
        this.setCachedItem(cacheKey, idToken, remainingTTL);
      }
      return idToken;
    }
    if ((_a = this.state.oauthTokens) == null ? void 0 : _a.refreshToken) {
      try {
        this.logEvent("token_refresh", { stage: "oauth" });
        await this.refreshOAuthTokens();
        const idToken = (_b = this.state.oauthTokens) == null ? void 0 : _b.idToken;
        const ttl = ((_c = this.state.oauthTokens) == null ? void 0 : _c.expiresAt) - Date.now() - TOKEN_EXPIRY_BUFFER_MS;
        this.setCachedItem(cacheKey, idToken, ttl);
        return idToken;
      } catch (error) {
        console.warn(
          "OAuth token refresh failed, proceeding with full re-auth:",
          error
        );
        this.state.oauthTokens = void 0;
      }
    }
    const identity = await this.getIdentityAuth();
    try {
      this.logEvent("auth_started", { stage: "oauth" });
      const startTime = Date.now();
      const oauthTokens = await this.exchangeCodeForOAuthTokens(
        identity.authorizationCode,
        identity.pkceVerifier
      );
      this.state.oauthTokens = oauthTokens;
      if (this.state.identity) {
        this.state.identity.authorizationCode = void 0;
        this.state.identity.pkceVerifier = void 0;
        this.state.identity.state = void 0;
      }
      this.updateMetadata("success", Date.now() - startTime);
      await this.saveState();
      const ttl = oauthTokens.expiresAt - Date.now() - TOKEN_EXPIRY_BUFFER_MS;
      this.setCachedItem(cacheKey, oauthTokens.idToken, ttl);
      this.logEvent("auth_success", { stage: "oauth" });
      return oauthTokens.idToken;
    } catch (error) {
      this.updateMetadata("failure");
      this.logEvent("auth_failure", {
        stage: "oauth",
        error: error instanceof Error ? error.message : "Unknown OAuth error"
      });
      throw new AuthError(
        `OAuth token exchange failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "oauth"
      );
    }
  }
  /**
   * Get Ayla API token with caching and race condition handling
   */
  async getAPIToken() {
    const cacheKey = `ayla_api_${this.credentials.email}`;
    const cached = this.getCachedItem(cacheKey);
    if (cached) {
      console.log("[NinjaAuthManager] Returning cached Ayla API token");
      return cached;
    }
    if (this.inFlightRequests.has(cacheKey)) {
      console.log(
        "[NinjaAuthManager] Attaching to in-flight Ayla token request"
      );
      const request = this.inFlightRequests.get(cacheKey);
      if (!request) {
        throw new Error("In-flight request not found");
      }
      return request;
    }
    const tokenPromise = this.acquireAylaToken().then((token) => {
      if (this.state.aylaToken) {
        const ttl = this.state.aylaToken.expiresAt - Date.now() - TOKEN_EXPIRY_BUFFER_MS;
        if (ttl > 0) {
          this.setCachedItem(cacheKey, token, ttl);
        }
      }
      this.inFlightRequests.delete(cacheKey);
      return token;
    }).catch((error) => {
      this.inFlightRequests.delete(cacheKey);
      throw error;
    });
    this.inFlightRequests.set(cacheKey, tokenPromise);
    return tokenPromise;
  }
  /**
   * Acquire Ayla API token
   */
  async acquireAylaToken() {
    await this.ensureStateLoaded();
    if (this.state.aylaToken && !this.isTokenExpired(this.state.aylaToken.expiresAt)) {
      return this.state.aylaToken.accessToken;
    }
    const idToken = await this.getIDToken();
    this.logEvent("auth_started", { stage: "ayla" });
    const startTime = Date.now();
    try {
      const aylaToken = await this.exchangeIdTokenForAylaToken(idToken);
      this.state.aylaToken = aylaToken;
      this.updateMetadata("success", Date.now() - startTime);
      await this.saveState();
      this.logEvent("auth_success", { stage: "ayla" });
      return aylaToken.accessToken;
    } catch (error) {
      this.updateMetadata("failure");
      this.logEvent("auth_failure", {
        stage: "ayla",
        error: error instanceof Error ? error.message : "Unknown Ayla token error"
      });
      throw new AuthError(
        `Ayla token exchange failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "ayla"
      );
    }
  }
  /**
   * Force refresh of the Ayla API token
   */
  async forceRefreshAPIToken() {
    const cacheKey = `ayla_api_${this.credentials.email}`;
    this.tokenCache.delete(cacheKey);
    this.state.aylaToken = void 0;
    this.metrics.refreshCount++;
    return this.getAPIToken();
  }
  /**
   * Get current authentication state
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Clear all authentication state
   */
  async clearState() {
    this.state = {};
    this.stateLoaded = false;
    this.tokenCache.clear();
    this.inFlightRequests.clear();
    this.metrics = { successCount: 0, failureCount: 0, refreshCount: 0 };
    if (existsSync(AUTH_STATE_FILE)) {
      try {
        await promises.unlink(AUTH_STATE_FILE);
      } catch (error) {
        console.warn("Failed to delete auth state file:", error);
      }
    }
  }
  /**
   * Get authentication metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
  // Private helper methods
  /**
   * Get cached item if valid
   */
  getCachedItem(key) {
    const entry = this.tokenCache.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now >= entry.expiresAt) {
      this.tokenCache.delete(key);
      return null;
    }
    console.log(
      `[NinjaAuthManager] Cache hit for ${key}, expires in ${Math.round((entry.expiresAt - now) / 1e3)}s`
    );
    return entry.data;
  }
  /**
   * Set cached item with TTL
   */
  setCachedItem(key, data, ttlMs) {
    const now = Date.now();
    this.tokenCache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttlMs
    });
    console.log(
      `[NinjaAuthManager] Cached ${key} with TTL ${Math.round(ttlMs / 1e3)}s`
    );
  }
  async exchangeCodeForOAuthTokens(authCode, pkceVerifier) {
    const request = await NinjaAuthManager.playwrightRequest();
    const requestContext = await request.newContext();
    try {
      const response = await requestContext.post(
        `${config.oauth.authBaseUrl}/oauth/token`,
        {
          headers: {
            "Content-Type": "application/json"
          },
          data: {
            client_id: config.oauth.clientId,
            grant_type: "authorization_code",
            code: authCode,
            redirect_uri: config.oauth.redirectUri,
            code_verifier: pkceVerifier,
            scope: config.oauth.scope
          }
        }
      );
      if (response.status() !== 200) {
        const errorText = await response.text();
        throw new Error(
          `Token exchange failed with status ${response.status()}: ${errorText}`
        );
      }
      const tokenData = await response.json();
      const userInfoResponse = await requestContext.get(
        `${config.oauth.authBaseUrl}/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`
          }
        }
      );
      if (userInfoResponse.status() !== 200) {
        throw new Error(
          `Failed to fetch user info: ${userInfoResponse.status()}`
        );
      }
      const userInfo = await userInfoResponse.json();
      this.state.userInfo = userInfo;
      return {
        accessToken: tokenData.access_token,
        idToken: tokenData.id_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1e3
      };
    } finally {
      await requestContext.dispose();
    }
  }
  async refreshOAuthTokens() {
    var _a;
    if (!((_a = this.state.oauthTokens) == null ? void 0 : _a.refreshToken)) {
      throw new Error("No refresh token available");
    }
    const request = await NinjaAuthManager.playwrightRequest();
    const requestContext = await request.newContext();
    try {
      const response = await requestContext.post(
        `${config.oauth.authBaseUrl}/oauth/token`,
        {
          headers: {
            "Content-Type": "application/json"
          },
          data: {
            client_id: config.oauth.clientId,
            grant_type: "refresh_token",
            refresh_token: this.state.oauthTokens.refreshToken,
            scope: config.oauth.scope
          }
        }
      );
      if (response.status() !== 200) {
        const errorText = await response.text();
        throw new Error(
          `Token refresh failed with status ${response.status()}: ${errorText}`
        );
      }
      const tokenData = await response.json();
      this.state.oauthTokens = {
        accessToken: tokenData.access_token,
        idToken: tokenData.id_token,
        refreshToken: tokenData.refresh_token || this.state.oauthTokens.refreshToken,
        expiresAt: Date.now() + tokenData.expires_in * 1e3
      };
      this.metrics.refreshCount++;
      await this.saveState();
    } finally {
      await requestContext.dispose();
    }
  }
  async exchangeIdTokenForAylaToken(idToken) {
    const request = await NinjaAuthManager.playwrightRequest();
    const requestContext = await request.newContext();
    try {
      const response = await requestContext.post(
        `${config.ayla.baseUrl}${config.ayla.tokenSignInEndpoint}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "*/*",
            "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 16; sdk_gphone64_arm64 Build/BP22.250325.006)"
          },
          data: {
            token: idToken,
            app_id: config.ayla.appId,
            app_secret: getAylaServerConfig().APP_SECRET
          }
        }
      );
      if (response.status() !== 200) {
        const errorText = await response.text();
        throw new Error(
          `Ayla token_sign_in failed with status ${response.status()}: ${errorText}`
        );
      }
      const tokenData = await response.json();
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1e3
      };
    } finally {
      await requestContext.dispose();
    }
  }
  isTokenExpired(expiresAt) {
    return Date.now() + TOKEN_EXPIRY_BUFFER_MS >= expiresAt;
  }
  async ensureStateLoaded() {
    if (this.stateLoaded) return;
    try {
      if (existsSync(AUTH_STATE_FILE)) {
        const data = await promises.readFile(AUTH_STATE_FILE, "utf-8");
        this.state = JSON.parse(data);
        console.log("[NinjaAuthManager] Loaded auth state from file");
      }
    } catch (error) {
      console.warn("[NinjaAuthManager] Failed to load auth state:", error);
      this.state = {};
    }
    this.stateLoaded = true;
  }
  async saveState() {
    try {
      await promises.writeFile(AUTH_STATE_FILE, JSON.stringify(this.state, null, 2));
      console.log("[NinjaAuthManager] Saved auth state to file");
    } catch (error) {
      console.error("[NinjaAuthManager] Failed to save auth state:", error);
    }
  }
  updateMetadata(result, latencyMs) {
    if (result === "success") {
      this.metrics.successCount++;
      if (latencyMs) {
        const current = this.metrics.averageLatencyMs || 0;
        const count = this.metrics.successCount;
        this.metrics.averageLatencyMs = (current * (count - 1) + latencyMs) / count;
      }
    } else {
      this.metrics.failureCount++;
    }
  }
  logEvent(type, data) {
    console.log(`[NinjaAuthManager] Event: ${type}`, data || "");
  }
}
const ninjaAuthManager = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AuthError,
  NinjaAuthManager
}, Symbol.toStringTag, { value: "Module" }));

export { config as c, ninjaAuthManager as n };
//# sourceMappingURL=ninja-auth-manager-BmGRqhY0.mjs.map
