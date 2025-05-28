import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should navigate to Google login page when Login with Google is clicked', async ({ page }) => {
    await page.goto('/'); // baseURL is set, so '/' accesses https://prom-party.netlify.app/

    // Wait for the "Login with Google" button to be visible
    const loginButton = page.locator('button:has-text("Login with Google")');
    await expect(loginButton).toBeVisible({ timeout: 10000 }); // Set a longer timeout

    // Click the login button
    // Since this redirects to a Google page, use page.waitForNavigation or page.waitForURL
    // However, as the page navigates to Google immediately after the click,
    // use Promise.all to perform the click and wait for navigation simultaneously.
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }), // Wait for navigation to the Google page, longer timeout
      loginButton.click(),
    ]);

    // Verify that the current URL contains Google's authentication-related domain
    // Expect it to include accounts.google.com
    expect(page.url()).toContain('accounts.google.com');

    // Note: This test does not perform an actual login.
    // It only verifies the correct navigation to the Google login page.
  });

  // TC1.2: Logout (Commented out or skipped as implementation is difficult at this stage)
  // test('should show login button after logout', async ({ page }) => {
  //   // Prerequisite: How to create a logged-in state is a challenge
  //   // Example: Load a pre-existing login session or use a test API to set the login state
  //   // await loginUser(page); // Placeholder login function

  //   const logoutButton = page.locator('button:has-text("Logout")');
  //   await expect(logoutButton).toBeVisible();
  //   await logoutButton.click();

  //   const loginButton = page.locator('button:has-text("Login with Google")');
  //   await expect(loginButton).toBeVisible();
  // });
});
