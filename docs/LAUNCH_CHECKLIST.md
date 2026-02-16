# Naninha App Launch Checklist

## Current Status Summary

**Already Done:**

- App code complete (nap tracking, dashboard, history)
- Supabase backend configured
- Email/password authentication

**Still Needed:**

- Apple Sign-In
- Remove Android references (iOS only)
- Disable iPad/Apple Watch
- Privacy Policy
- App Store listing (screenshots, description)
- Final build and submission

---

## Remaining Tasks (In Order)

### Task 1: Add Apple Sign-In

Apple requires apps with third-party login to also offer Sign in with Apple.

**Files to modify:**

- `package.json` - add `expo-apple-authentication`
- `app.json` - add Apple Sign-In entitlement
- `contexts/AuthContext.tsx` - add `signInWithApple` function
- `app/(auth)/login.tsx` - add Apple Sign-In button
- `app/(auth)/register.tsx` - add Apple Sign-In button

### Task 2: Remove Android References

Remove all Android-related configuration since the app is iOS only.

**Files to modify:**
- `app.json` - remove `android` section
- `package.json` - remove `android` script
- `eas.json` - remove Android build profiles (if any)

### Task 3: Fix iPad/Apple Watch

In `app.json`, set `"supportsTablet": false` to disable iPad support.

### Task 4: Create Privacy Policy

Create a simple privacy policy page and host it (Notion, GitHub Pages, or your website).

### Task 5: Complete App Store Listing

- App description (Portuguese)
- Keywords
- Screenshots (iPhone only)
- Support URL
- Privacy Policy URL

### Task 6: Build and Submit

```bash
eas build --profile production --platform ios --auto-submit
```

---

## Simplified View

| Task                    | Time Estimate | Difficulty |
| ----------------------- | ------------- | ---------- |
| Apple Sign-In           | 30 min        | Medium     |
| Remove Android          | 5 min         | Easy       |
| Fix iPad/Watch          | 2 min         | Easy       |
| Privacy Policy          | 20 min        | Easy       |
| App Store Listing       | 30 min        | Easy       |
| Build and Submit        | 30 min        | Easy       |

**Total: ~2 hours of work**

---

## Task Status

- [ ] Task 1: Apple Sign-In
- [ ] Task 2: Remove Android References
- [ ] Task 3: Fix iPad/Apple Watch
- [ ] Task 4: Privacy Policy
- [ ] Task 5: App Store Listing
- [ ] Task 6: Build and Submit
