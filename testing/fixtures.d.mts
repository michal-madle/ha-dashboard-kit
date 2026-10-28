import type { TestType, PlaywrightTestArgs, PlaywrightTestOptions, PlaywrightWorkerArgs, PlaywrightWorkerOptions } from "@playwright/test";

export function makeTest(card: string): TestType<
  PlaywrightTestArgs & PlaywrightTestOptions & { collectCoverage: void },
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;
