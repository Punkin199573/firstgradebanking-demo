import {withSentryConfig} from '@sentry/nextjs';
/** @type {import('next').NextConfig} */
const nextConfig = {};

const sentryBuildConfigured =
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT;

export default sentryBuildConfigured
  ? withSentryConfig(
      nextConfig,
      {
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        silent: true,
        widenClientFileUpload: true,
      },
      {
        hideSourceMaps: true,
        disableLogger: true,
        automaticVercelMonitors: true,
      }
    )
  : nextConfig;