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

test.describe('E2E Tests for Authenticated User', () => {
  test('should allow a logged-in user to create, view, and use a template', async ({ page, baseURL }) => {
    // Handle any alert that might appear (e.g., after saving)
    page.on('dialog', dialog => dialog.accept());

    // 1. Simulate Login
    const futureTime = Math.floor(Date.now() / 1000) + 3600;
    const dummyEmail = "testuser@example.com";
    const dummyPayload = { 
      "sub": "12345678-abcd-1234-abcd-1234567890ab", 
      "email": dummyEmail, 
      "app_metadata": { "provider": "google", "providers": ["google"] }, 
      "user_metadata": { "full_name": "Test User E2E" }, 
      "aud": "authenticated", 
      "exp": futureTime, 
      "iat": futureTime - 3600, 
      "iss": "https://bxrucqdkxbzqadejbddl.supabase.co/auth/v1", // Use the actual supabase URL from app.js
      "role": "authenticated", 
      "aal": "aal1" 
    };
    const dummyAccessToken = Buffer.from(JSON.stringify(dummyPayload)).toString('base64');
    
    // Construct the callback URL
    const callbackUrl = `${baseURL}/#access_token=${dummyAccessToken}&expires_in=3600&token_type=bearer&provider_token=dummy-provider-token&refresh_token=dummy-refresh-token`;
    
    await page.goto(callbackUrl);

    // Wait for UI to update to logged-in state
    await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Login with Google")')).toBeHidden();
    await expect(page.locator('#user-info')).toHaveText(`Logged in as: ${dummyEmail}`);

    // 2. Create New Template
    await page.locator('button:has-text("Create New Template")').click();
    await expect(page.locator('#template-editor-section')).toBeVisible();

    const templateTitle = 'My E2E Test Template';
    const templateDesc = 'This is a description for the E2E test template.';
    const templatePrompt = 'Hello {{name}}, welcome to {{place}}!';
    
    await page.locator('#template-title').fill(templateTitle);
    await page.locator('#template-description').fill(templateDesc);
    await page.locator('#template-prompt').fill(templatePrompt);

    // Add an input field
    await page.locator('button:has-text("Add Field")').click();
    const fieldGroup = page.locator('.field-group').last();
    await expect(fieldGroup).toBeVisible();
    await fieldGroup.locator('.field-name').fill('name');
    await fieldGroup.locator('.field-label').fill('Your Name');
    await fieldGroup.locator('.field-type').selectOption('text');
    
    // Add another input field for 'place' to match the prompt
    await page.locator('button:has-text("Add Field")').click();
    const secondFieldGroup = page.locator('.field-group').last();
    await expect(secondFieldGroup).toBeVisible();
    await secondFieldGroup.locator('.field-name').fill('place');
    await secondFieldGroup.locator('.field-label').fill('The Place');
    await secondFieldGroup.locator('.field-type').selectOption('text');


    // Add a tag
    const tagName = 'e2e-test-tag';
    await page.locator('#tag-input').fill(tagName);
    await page.locator('button:has-text("Add Tag")').click();
    await expect(page.locator(`.tag-display[data-tag-name="${tagName}"]`)).toBeVisible();

    // Click "Save Template" - dialog is handled by page.on('dialog')
    await page.locator('button:has-text("Save Template")').click();

    // 3. Verify Template in List
    await expect(page.locator('#my-templates-section')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`h4:has-text("${templateTitle}")`)).toBeVisible();
    await expect(page.locator(`p:text-matches("${templateDesc.replace('.', '\\.')}")`)).toBeVisible(); // Escape dot for regex match if needed, or use exact match

    // 4. Use the Template
    await page.locator(`.template-list-item:has(h4:has-text("${templateTitle}")) button:has-text("Use")`).click();
    
    await expect(page.locator('#prompt-generation-section')).toBeVisible();
    await expect(page.locator(`#generation-template-info h3:has-text("${templateTitle}")`)).toBeVisible();
    await expect(page.locator(`#generation-template-info p:text-matches("${templateDesc.replace('.', '\\.')}")`)).toBeVisible();
    
    await expect(page.locator('label:has-text("Your Name:")')).toBeVisible();
    await expect(page.locator('label:has-text("The Place:")')).toBeVisible();

    await page.locator('#gen-field-name').fill('Tester');
    await page.locator('#gen-field-place').fill('Playwrightville');
    
    // Verify the generated prompt output
    // The regex needs to account for potential whitespace differences around placeholders if the app trims them.
    // And the placeholder {{place}} might become [...] if not filled, or its value if filled.
    await expect(page.locator('#generated-prompt-output')).toHaveValue('Hello Tester, welcome to Playwrightville!');
  });
});
