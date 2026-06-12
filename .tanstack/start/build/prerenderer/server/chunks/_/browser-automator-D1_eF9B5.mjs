import * as crypto from 'node:crypto';
import { chromium } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/playwright/index.mjs';
import { c as config } from './ninja-auth-manager-BmGRqhY0.mjs';
import 'node:fs';

class PlaywrightBrowserAutomator {
  generatePkceChallenge() {
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
  }
  generateState() {
    return crypto.randomBytes(32).toString("base64url");
  }
  async performLogin(credentials) {
    console.log("Starting browser-based authentication flow...");
    let browser = null;
    let context = null;
    try {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
      const page = await context.newPage();
      const { verifier, challenge } = this.generatePkceChallenge();
      const state = this.generateState();
      console.log("Generated PKCE challenge and state parameters");
      const authorizeUrl = new URL("/authorize", config.oauth.authBaseUrl);
      authorizeUrl.searchParams.set("client_id", config.oauth.clientId);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("redirect_uri", config.oauth.redirectUri);
      authorizeUrl.searchParams.set("scope", config.oauth.scope);
      authorizeUrl.searchParams.set("state", state);
      authorizeUrl.searchParams.set("code_challenge", challenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");
      console.log("Navigating to authorization URL...");
      await page.goto(authorizeUrl.toString());
      await page.waitForSelector('input[name="username"]', { timeout: 1e4 });
      console.log("Login form loaded successfully");
      await page.fill('input[name="username"]', credentials.email);
      await page.fill('input[name="password"]', credentials.password);
      console.log("Filled login form with credentials");
      let authorizationCode = null;
      page.on("request", (request) => {
        const url = request.url();
        if (url.startsWith(config.oauth.redirectUri)) {
          const redirectUrl = new URL(url);
          authorizationCode = redirectUrl.searchParams.get("code");
          console.log("Captured authorization code from redirect");
        }
      });
      await Promise.race([
        page.click(
          'button[type="submit"], input[type="submit"], [data-action-button-primary]'
        ),
        page.waitForTimeout(5e3)
      ]);
      let retryCount = 0;
      const maxRetries = 10;
      while (!authorizationCode && retryCount < maxRetries) {
        retryCount++;
        console.log(
          `Waiting for authorization code... (attempt ${retryCount}/${maxRetries})`
        );
        if (page.url().includes("/authorize/resume")) {
          console.log("On resume page, waiting for redirect...");
          await page.waitForTimeout(2e3);
        } else {
          await page.waitForTimeout(1e3);
        }
      }
      if (!authorizationCode) {
        console.error("Current URL:", page.url());
        console.error("Page title:", await page.title());
        await page.screenshot({ path: "login-debug.png", fullPage: true });
        throw new Error(
          "Failed to obtain authorization code after login. Check login-debug.png for details."
        );
      }
      console.log("Successfully obtained authorization code");
      const pageCookies = await context.cookies();
      const relevantCookies = [];
      for (const cookie of pageCookies) {
        if (["did", "auth0", "auth0_compat", "did_compat"].includes(cookie.name)) {
          relevantCookies.push(cookie);
          console.log(`Captured cookie: ${cookie.name}`);
        }
      }
      console.log(
        `Browser authentication completed successfully. Captured ${relevantCookies.length} cookies.`
      );
      return {
        cookies: relevantCookies,
        authorizationCode,
        pkceVerifier: verifier,
        state
      };
    } catch (error) {
      console.error("Browser authentication failed:", error);
      throw new Error(
        `Browser authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      if (context) {
        await context.close();
      }
      if (browser) {
        await browser.close();
      }
    }
  }
}

export { PlaywrightBrowserAutomator };
//# sourceMappingURL=browser-automator-D1_eF9B5.mjs.map
