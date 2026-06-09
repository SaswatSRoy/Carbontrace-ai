import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('User can complete onboarding via chat and see dashboard', async ({ page }) => {
    // 1. Visit /login
    await page.goto('/login');

    // 2. Mock Firebase auth & proxy bypass
    // Set a fake __session cookie so the Next.js proxy lets us through
    await page.context().addCookies([{
      name: '__session',
      value: 'fake_session_token',
      domain: 'localhost',
      path: '/',
    }]);

    // 3. Navigate to /onboard
    await page.goto('/onboard');
    
    // We expect the chat interface to be there
    const chatInput = page.getByPlaceholder('Type your answer...');
    await expect(chatInput).toBeVisible();

    // 4. Type a message
    // Intercept the chat API to return a mocked response
    await page.route('/api/onboard/chat', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      if (postData.message.includes('complete')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reply: 'Great! I have everything I need.',
            profileExtracted: true,
            score: 5500
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reply: 'I see. What kind of car do you drive?',
            profileExtracted: false
          })
        });
      }
    });

    await chatInput.fill('I live in the USA');
    await page.getByRole('button', { name: 'Send message' }).click();

    // See Gemini response appear
    await expect(page.getByText('I see. What kind of car do you drive?')).toBeVisible();

    // 5. Complete full onboarding flow
    await chatInput.fill('complete');
    await page.getByRole('button', { name: 'Send message' }).click();

    // 6. Assert redirect to dashboard
    // The component redirects after 2 seconds
    await page.waitForURL('**/progress', { timeout: 5000 });

    // 7. Assert score ring is visible
    const scoreRing = page.getByRole('img', { name: /Your carbon footprint is/i });
    await expect(scoreRing).toBeVisible();

    // 8. Assert score is a positive number
    // We mocked the score as 5500, but in a real e2e we might just look for the regex
    await expect(page.getByText('5,500')).toBeVisible();
  });
});
