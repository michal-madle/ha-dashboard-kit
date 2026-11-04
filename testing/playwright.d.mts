import type { PlaywrightTestConfig } from "@playwright/test";

export function cardPlaywrightConfig(options: { port: number; testDir?: string }): PlaywrightTestConfig;
