import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://b588358e3187193025aeeec2037bd494@o4509442009071616.ingest.us.sentry.io/4509442026766336",
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
  ],
})
