import { randomBytes } from "node:crypto";

import { expect, test as setup } from "@playwright/test";

import { createAdminClient } from "./support/local-supabase";

// Signs in once as a staff user and saves the session for every other test.
//
// The user lives only in the LOCAL stack. Its password is generated fresh on every run and
// set through the local Auth admin API, so no credential is stored in the repo or the
// environment — there is nothing to leak. `.test` is a reserved domain that never routes.

export const STAFF_STATE = "e2e/.auth/staff.json";
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL ?? "e2e-staff@homemix.test";

setup("sign in as staff", async ({ page }) => {
  const admin = createAdminClient();
  const password = randomBytes(24).toString("base64url");

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((user) => user.email === STAFF_EMAIL);

  const { error } = existing
    ? await admin.auth.admin.updateUserById(existing.id, { password })
    : await admin.auth.admin.createUser({ email: STAFF_EMAIL, password, email_confirm: true });
  if (error) throw error;

  await page.goto("/");
  await page.getByLabel("ელფოსტა").fill(STAFF_EMAIL);
  await page.getByLabel("პაროლი").fill(password);
  await page.getByRole("button", { name: "შესვლა" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("navigation", { name: "მთავარი ნავიგაცია" })).toBeVisible();

  await page.context().storageState({ path: STAFF_STATE });
});
