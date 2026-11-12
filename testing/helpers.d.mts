import type { Page } from "@playwright/test";

export function axeViolations(page: Page, skip?: string[]): Promise<string[]>;
import type { Locator } from "@playwright/test";

export function joinedLines(locator: Locator): Promise<string[]>;
