---
name: Expo native preview validation
description: Required verification for Sift changes that affect Expo configuration or native dependencies.
---

After changing Expo configuration, native dependencies, or document-handling behavior, validate both the Expo manifest JSON and the iOS launch bundle response. A working React Native Web preview does not prove that Expo Go can load the project.

**Why:** A web preview passed while Expo Go reported a manifest parsing failure. The native-facing issue was only exposed by Expo configuration diagnostics and direct manifest checks.

**How to apply:** Run the SDK compatibility/config checks, restart the managed Expo workflow, parse the full iOS manifest response, and request its launch asset before declaring the mobile preview healthy. Do not bypass Replit package safety controls to force very recent package releases.