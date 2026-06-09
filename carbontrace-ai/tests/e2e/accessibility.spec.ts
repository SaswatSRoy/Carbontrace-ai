import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Checks', () => {
  // Use a fake auth token for authenticated pages
  test.use({
    storageState: {
      cookies: [{
        name: '__session',
        value: 'fake_session_token',
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      }],
      origins: []
    }
  });

  const routes = [
    '/login', // Unauthenticated, but cookie won't hurt, it might redirect to /progress
    '/progress', // Main dashboard
    '/simulate', // What-If tool
    '/actions' // Action plans
  ];

  for (const route of routes) {
    test(`Passes basic accessibility on ${route}`, async ({ page }) => {
      // For /login, we clear the cookie so it doesn't redirect
      if (route === '/login') {
        await page.context().clearCookies();
      }

      await page.goto(route);

      // Wait for network idle to ensure everything rendered
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      // We assert that there are no critical violations
      // (In a perfect world we assert on ALL violations, but critical is a good baseline)
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical'
      );

      expect(criticalViolations).toEqual([]);
    });
  }
});
