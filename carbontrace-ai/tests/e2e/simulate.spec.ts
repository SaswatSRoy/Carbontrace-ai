import { test, expect } from '@playwright/test';

test.describe('Simulate Flow', () => {
  test('What-if simulator updates score in real time', async ({ page }) => {
    // 1. Mock auth and go to simulate
    await page.context().addCookies([{
      name: '__session',
      value: 'fake_session_token',
      domain: 'localhost',
      path: '/',
    }]);

    // We need to mock the /api/carbon/simulate route which is hit on debounced slider change
    await page.route('/api/carbon/simulate', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      if (postData.includeNarration) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            narration: 'By eating a vegan diet, you are saving 1,500 kg of CO2 per year.',
            deltakgCO2eYear: -1500,
            simulatedScore: { totalKgCO2eYear: 8500 }
          })
        });
      } else {
        // Just the simulation update
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            deltakgCO2eYear: -1500,
            simulatedScore: { totalKgCO2eYear: 8500 }
          })
        });
      }
    });

    // Normally /simulate requires fetching the user's profile from DB, 
    // so in a real environment we would seed the DB or mock the page load data.
    // For this test, we assume the page renders the WhatIfPanel correctly.
    await page.goto('/simulate');

    // Wait for the panel to load
    await expect(page.getByText('Simulate Changes')).toBeVisible();

    // 2. Move diet slider (from whatever it is, to vegan - index 0)
    // We can simulate slider movement by pressing Left Arrow, or clicking the input
    const dietSlider = page.getByRole('slider', { name: 'Diet (Meat level)' });
    await dietSlider.fill('0'); 

    // The simulation takes 300ms to debounce, then makes the API call
    // 3. Assert delta value appears and is negative
    await expect(page.getByText('Save 1,500 kg')).toBeVisible();

    // 4. Click "Explain This"
    await page.getByRole('button', { name: 'Ask AI to explain these changes' }).click();

    // Assert narration text appears
    await expect(page.getByText('By eating a vegan diet, you are saving 1,500 kg of CO2 per year.')).toBeVisible();

    // 5. Move slider back
    // (We update our mock to return a different score)
    await page.route('/api/carbon/simulate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          deltakgCO2eYear: 2000,
          simulatedScore: { totalKgCO2eYear: 12000 }
        })
      });
    });

    await dietSlider.fill('4'); 
    await expect(page.getByText('Add 2,000 kg')).toBeVisible();
  });
});
