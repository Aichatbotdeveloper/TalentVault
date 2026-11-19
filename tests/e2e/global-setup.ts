import { resetRateLimits } from "./helpers";

/** Rate limits are real in E2E runs; clear counters so repeated local runs do not trip them. */
async function globalSetup() {
  await resetRateLimits();
}

export default globalSetup;
