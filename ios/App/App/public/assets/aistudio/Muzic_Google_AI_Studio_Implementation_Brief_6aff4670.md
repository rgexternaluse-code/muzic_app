# Muzic — Singing Studio, Vocal Separation & Monetization Implementation Brief

## Instructions for Google AI Studio

You are working on an **existing Ionic + Angular + Capacitor Android music-player app called Muzic**. Implement the requirements below in the existing project. Do not recreate the project from scratch, replace the current architecture, or remove working music-player functionality.

**Scope is strictly limited to the two requested additions: (1) Singing Studio and (2) the subscription/AI vocal-separation foundation described in this document. The existing Muzic app is already built and working. Do not rebuild it. Do not change existing screens, navigation, styling, playback behavior, or unrelated code except where a minimal, necessary integration point is required.**

**First inspect the repository**: review `package.json`, Angular/Ionic versions, app structure, routing, current player implementation, Capacitor plugins, theme, and existing storage/audio code. Then propose a short, minimal implementation plan and implement only these requested additions in small, testable phases. Reuse compatible packages and existing conventions. Do not upgrade major dependencies unless necessary and explicitly justified.

**Change-control rules:**
- Treat the current working app as the baseline and preserve it.
- Do not refactor, rename, reorganize, or clean up unrelated files.
- Do not replace the existing player or introduce a second player that conflicts with it; reuse existing audio services where practical.
- Do not alter existing behavior merely to make the new feature easier to implement.
- Before editing, list the specific files expected to change and why. Keep the change set as small as possible.
- After editing, report every changed file and explain its direct relevance to Singing Studio, subscriptions, or AI-separation integration.
- If a capability requires a backend, API key, cloud service, Google Play configuration, or external account, do not pretend it is working. Build only the appropriate integration boundary, document what is missing, and keep the rest of the app usable.

---

## 1. Product goals

Muzic is a local-first music player that will gain a **Singing Studio** feature. Users should be able to:

1. Play music stored on their phone.
2. Choose a built-in instrumental backing track.
3. Record their own singing over a backing track.
4. Adjust backing-track and voice volume independently.
5. Preview the combined result.
6. Save/export the combined recording to a user-accessible location.
7. In a later phase, choose a local song and request online AI vocal separation to obtain an instrumental backing track.
8. Eventually offer free and paid features through a subscription model.

The current app has **no backend** and the initial budget for AI hosting is **₹0**. Do not introduce a paid dependency or paid cloud infrastructure as if it were free.

## 2. Preserve the existing app

- Keep the current Ionic Angular + Capacitor project and its working local music-player functionality.
- Inspect the installed versions before selecting libraries; choose versions compatible with this project.
- Do not use `--legacy-peer-deps`.
- Do not remove or rewrite unrelated screens, playback features, routes, or styling.
- Avoid unnecessary dependency upgrades.
- If a required plugin is added, explain why it is needed, confirm compatibility, and provide installation/configuration steps.
- Handle Android runtime permissions correctly and request them only when needed.
- Test on a real Android device, including a lower-end/older phone where possible.

## 3. UI/UX direction

Use a polished, premium-feeling dark theme consistent with the existing Muzic app.

- Keep the interface clean, readable, and uncluttered.
- Avoid adding unnecessary icons, labels, cards, and decorative content.
- Use good spacing, clear visual hierarchy, readable contrast, and accessible touch targets.
- Show clear loading, empty, success, permission-denied, and error states.
- Do not redesign the whole app; add the Singing Studio in a way that fits the existing navigation and design system.
- Ensure responsive layouts for different Android screen sizes.

## 4. Singing Studio screen

Add a dedicated **Singing Studio** screen/feature with the following areas:

### A. Choose a backing track

Provide two clearly separated choices:

- **Built-in Instrumentals**
- **Choose Song from Phone**

For built-in tracks, show track title, style/category, duration when available, and a play/preview control. Do not show fake track metadata.

### B. Six built-in instrumental tracks

The initial collection must contain exactly these six categories:

1. Bollywood-style instrumental track 1.
2. Bollywood-style instrumental track 2.
3. Punjabi-beat instrumental track 1.
4. Punjabi-beat instrumental track 2.
5. Sad/emotional Bollywood-style instrumental track.
6. Sad/emotional Punjabi-style instrumental track.

Important rights requirement:
- Use original music created for Muzic or tracks for which appropriate commercial distribution and in-app use rights have been obtained.
- Do not bundle copyrighted Bollywood/Punjabi film recordings or rip songs from streaming services.
- Do not invent audio files or claim that placeholder audio is a finished track.
- If the six final audio files are not supplied, create a data-driven track catalogue and clearly marked placeholders so real, licensed files can be added later.
- Prefer keeping audio assets organized in a dedicated folder and metadata in a maintainable data structure.
- Keep the initial app size in mind. If appropriate, support downloading optional licensed backing tracks later, rather than bundling a large audio collection.

### C. Select a local song

- Allow the user to select an audio file stored on their device using an appropriate Android/Capacitor file picker.
- Support common formats only where they can actually be decoded by the chosen playback/processing implementation; clearly communicate unsupported formats.
- Handle cancellation, permission failures, large files, corrupted files, and missing metadata gracefully.
- Do not upload any audio unless the user explicitly starts an online separation operation and is informed that the file will be uploaded.
- Do not assume every song on the device is accessible or that DRM-protected streaming downloads can be processed.

## 5. Recording and audio mixing

Implement the Singing Studio recording workflow:

1. User selects a built-in instrumental or an instrumental returned by the separation service.
2. User can preview and seek within the backing track.
3. User starts recording their voice while the backing track plays.
4. Voice recording and backing playback must remain as synchronized as practical.
5. User can stop, replay, discard, or re-record.
6. Provide independent volume controls for backing audio and recorded voice.
7. Provide a combined preview.
8. Export/save a combined audio file in a supported format.
9. Show progress, output location/status, and useful errors.

Technical requirements:
- Inspect the project's current audio/playback implementation before choosing a recording/mixing strategy.
- Verify whether the selected Web Audio, MediaRecorder, native plugin, or other approach works on the target Android WebView/Capacitor versions.
- Do not assume browser-only APIs are reliable in every Android WebView without testing.
- Keep the UI responsive during playback, recording, mixing, and export.
- Do not run AI source separation on the phone as the default path. The target is cloud processing because the app must accommodate older and lower-end phones.
- If a fully synchronized mix/export cannot be completed in one step, implement a clear, testable foundation and document the remaining native/audio-engine requirements instead of faking the output.

## 6. Online AI vocal separation — future integration, not falsely enabled

The desired eventual workflow is:

1. User chooses a local audio file.
2. App explains that the file will be uploaded to a server for vocal separation and requests the user's action/consent.
3. App uploads the file securely to a backend API.
4. Backend queues the job and runs a suitable vocal-separation model on server-side compute.
5. App shows processing status and handles retry/cancel/failure states.
6. Backend returns a time-limited download URL or another secure way to retrieve the instrumental output.
7. User can use the returned instrumental in Singing Studio.
8. Temporary uploaded and generated files are deleted according to a documented retention policy.

Current constraints:
- There is no Muzic backend yet.
- Initial budget is ₹0.
- No song-catalog API is required: the user supplies a local file.
- Do not process audio on the user's phone by default, since lower-end phones must be supported.
- Do not embed API keys, model credentials, cloud secrets, or privileged tokens in the Angular app.
- Do not invent an API endpoint or claim the separation service works without a real backend and model.
- Build a typed service/interface and configuration boundary for a future backend, with clear unavailable/not-configured UI state.
- Keep the built-in instrumental and recording features working when the backend is absent.
- Evaluate free demos/hosting only for experiments. Do not depend on a limited public demo, shared free GPU quota, or free hosting tier as a guaranteed production service.
- Before selecting a model, verify its current maintenance status, code licence, model-weight licence, commercial-use rights, deployment needs, audio-quality limitations, and CPU/GPU/RAM requirements.
- Benchmark cost and processing time with sample audio before offering this as an unlimited feature.
- Add reasonable file-size, duration, request-rate, concurrency, and user-usage limits when a real backend is available.
- Do not promise unlimited AI processing until its costs can be covered.

For now, deliver the frontend integration boundary and documented API contract, not a fake working AI service. Example conceptual API contract (adapt only when a real backend is built):

- `POST /api/v1/separation-jobs` — authenticated upload and job creation.
- `GET /api/v1/separation-jobs/{jobId}` — job status and result metadata.
- `DELETE /api/v1/separation-jobs/{jobId}` — best-effort cancellation/cleanup, if supported.

These are proposed paths only, not existing endpoints. Document expected request/response types, status values, limits, authentication, upload handling, and errors.

## 7. Subscription and monetization architecture

The intended business model is freemium. The app currently has no backend and has an initial budget of ₹0.

### Possible premium features

Keep the existing basic local music-player experience free. Consider premium access for:
- Advanced recording/mixing controls.
- Additional original/licensed instrumental tracks.
- An ad-free experience.
- A defined monthly allowance of AI vocal-separation minutes or credits once server processing exists.

Do not promise unlimited cloud AI processing in a low-cost subscription. A credit/usage allowance may be more sustainable.

### Android purchase implementation

- For an Android app distributed through Google Play, evaluate Google Play Billing and a compatible subscription-management SDK such as RevenueCat.
- Inspect current dependencies and official documentation before implementing.
- Keep subscription code behind a clean service abstraction, such as `SubscriptionService`.
- Separate UI presentation from entitlement decisions.
- Provide free/premium feature gates and a restore/manage-purchase path where supported.
- Test purchase, renewal, cancellation, expiration, pending purchase, refund/revocation, offline state, and restore scenarios.
- Do not trust a local boolean or local storage value as secure proof of Premium entitlement.
- Never embed private service credentials or secret API keys in the app.
- Do not hardcode fake prices or claim a product is purchasable until the products are configured in Google Play Console and tested.
- Use placeholder product IDs only when clearly labelled as configuration placeholders.
- Explain which steps require Google Play Console, a signed build, tester accounts, a service account, or an external account.
- If a full purchase integration cannot be verified in the current environment, create the architecture and setup guide without falsely claiming live payments are functional.

### Backend decision

A custom backend is not mandatory solely to display subscriptions if a suitable billing/entitlement service is used. A secure backend or managed processing service will be required for reliable cloud AI separation, usage enforcement, server-side job handling, and secure processing. Do not conflate these two needs.

## 8. Ads and profitability

- Ads are optional; do not clutter the premium-feeling music UI.
- If ads are added, use an appropriate supported SDK and follow its consent, privacy, and Google Play requirements.
- Premium users should receive the advertised ad-free experience if that is included in the plan.
- Do not implement fake ad placements or assume ad revenue is guaranteed.
- Document that profit depends on net subscription/advertising revenue after applicable store fees, taxes, service fees, refunds, and AI processing costs.

## 9. Privacy, security, and copyright

- Ask for microphone permission when the user starts recording, with a clear explanation.
- Use Android's file picker and least-privilege access where possible.
- Clearly disclose when a local song will be uploaded for online processing.
- Use HTTPS for upload/download and protect backend access when implemented.
- Avoid collecting unnecessary personal data.
- Define retention and deletion for recordings, uploads, and generated stems.
- Do not log raw audio, tokens, or secrets.
- Ensure built-in tracks have the required rights for distribution and commercial use.
- Do not market vocal separation as permission to redistribute copyrighted music.
- Provide appropriate privacy-policy disclosures before release.

## 10. Suggested implementation phases

### Phase 0 — Repository assessment
- Report current framework and Capacitor versions, app structure, audio implementation, and relevant dependencies.
- Identify risks before changing files.
- Propose a minimal plan that preserves the current player.

### Phase 1 — Singing Studio foundation
- Add navigation and the dark-themed Singing Studio screen.
- Add the six-category track catalogue with clearly marked placeholders if final audio files are not supplied.
- Add local audio-file selection and playback.
- Add recording, synchronization, independent volume controls, preview, and export as far as verified platform capabilities allow.

### Phase 2 — Subscription foundation
- Add a subscription service abstraction and premium/free feature gating.
- Evaluate compatible Google Play Billing/RevenueCat integration based on current project versions.
- Document external configuration and testing steps. Do not simulate successful payments.

### Phase 3 — AI separation proof of concept
- Test candidate models and free experimentation options outside the production app.
- Record quality, latency, resource needs, licensing, and cost findings.
- Do not enable the production UI until a real endpoint is configured.

### Phase 4 — Backend and AI processing
- When hosting and budget are available, build secure upload/job/status/result APIs and the server-side worker.
- Add quotas, queue management, file cleanup, privacy disclosure, and usage metering.
- Integrate the actual endpoint into Muzic.

### Phase 5 — Release readiness
- Test on multiple Android versions and devices, including an older/lower-end phone.
- Check recording interruptions, incoming calls, app backgrounding, permission denial, low storage, export failures, and network loss.
- Test Google Play purchase states and release configuration.
- Provide a release checklist.

## 11. Quality requirements and acceptance criteria

Do not consider the work complete until the following are checked and reported:

- Existing local music playback still works.
- The Singing Studio is accessible from the app's normal navigation.
- The six required track categories are represented accurately.
- No unlicensed commercial recordings are bundled.
- The local file picker works on a real Android device or its limitations are explicitly documented.
- Microphone permission and recording failure states are handled.
- The user can preview backing audio, record voice, adjust the two volumes, and export a combined result—or the exact unimplemented platform blocker is documented.
- Audio processing does not freeze the UI.
- AI separation is clearly shown as unavailable until a real backend is configured.
- Subscription UI never falsely claims a successful purchase or Premium entitlement.
- No secrets are stored in client code.
- Build and tests are run where the environment allows; include actual commands and results.
- Any unresolved item is listed clearly, with the required next action.

## 12. Required final response from Google AI Studio

After implementation, report:

**Scope verification:** Confirm that only Singing Studio and the related subscription/AI-separation foundation were changed. Explicitly confirm that unrelated working app functionality was left untouched. If any unrelated file had to change, explain why.

1. Files created or modified.
2. Features completed and how to test each one.
3. Dependencies added and why.
4. Build/test commands actually run and their real results.
5. Android permissions and device-testing steps.
6. External setup still required (audio assets, Google Play products, RevenueCat configuration, backend hosting, AI model, API URL, privacy policy).
7. Known limitations and a prioritized next-step list.

**Important:** Make changes incrementally, preserve the current working app, and never claim that cloud separation, subscriptions, or export are production-ready unless they have been implemented and verified end to end.
