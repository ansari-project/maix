# E2E Tests for Maix

## Todo System Demo

### Demo Options

#### 1. Simple Demo (Recommended)
A guided walkthrough that prompts for manual sign-in:

```bash
npm run test:e2e:demo:simple
```

This demo:
- Prompts you to sign in manually
- Provides clear instructions at each step
- Shows todo features based on your permissions
- Works with any account

#### 2. Automated Demo
Attempts to use a test account (requires database setup):

```bash
npm run test:e2e:demo
```

Test account credentials:
- Email: `waleedk+ptest@gmail.com`  
- Password: `playwright-test-123`

### What the Demo Shows

1. **Automatic sign in** with test account
2. **Navigation** to projects page
3. **Project selection** and todo section viewing
4. **Permission checking** (shows if user can create todos)
5. **Todo display** with status indicators

### Setup Test Account Manually

If needed, you can create the test account manually:

```bash
npx tsx scripts/setup-test-account.ts
```

This script:
- Checks if the test account already exists
- Creates it if needed with a hashed password
- Marks the email as verified for testing

### Notes

- The test account is only for local development/testing
- The password is intentionally simple for demo purposes
- The account is automatically created before each demo run

## Video Recording

### Recording Test Runs

Playwright can record videos of test runs. Videos are saved in the `test-results` folder.

#### Configuration Options

In `playwright.config.ts`:
```typescript
video: {
  mode: 'on',              // Always record
  // mode: 'off',          // Never record
  // mode: 'retain-on-failure', // Keep video only on failure
  // mode: 'on-first-retry',    // Record on retry
  size: { width: 1280, height: 720 }
}
```

#### Run Test with Video Recording

```bash
# Run specific test with video
npx playwright test tests/e2e/todo-demo-video.spec.ts --headed

# Or use the regular demo (video enabled in config)
npm run test:e2e:demo:simple
```

#### Video Location

Videos are saved in:
```
test-results/
└── [test-name]/
    └── video.webm
```

To convert WebM to MP4:
```bash
ffmpeg -i video.webm -c:v h264 output.mp4
```