import type { Page } from "@playwright/test";

export function axeViolations(page: Page, skip?: string[]): Promise<string[]>;
