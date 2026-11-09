"use server";

import { revalidatePath } from "next/cache";
import type { CustomTemplate } from "../types";
import { getDb } from "../db";
import { assertShopOwner } from "../auth/session";
import { dashPath } from "../paths";

type TemplateDoc = CustomTemplate & { _id: string; shopSlug: string };

export async function upsertCustomTemplate(slug: string, template: CustomTemplate): Promise<void> {
  await assertShopOwner(slug);
  if (typeof template?.id !== "string" || !template.id) throw new Error("Template needs an id.");
  const db = await getDb();
  const { _id: _ignoredId, shopSlug: _ignoredShop, ...fields } = template as CustomTemplate & {
    _id?: unknown;
    shopSlug?: unknown;
  };
  // Filter on shopSlug too: an id belonging to another shop then fails the
  // insert (duplicate _id) instead of overwriting that shop's template.
  await db.collection<TemplateDoc>("custom_templates").updateOne(
    { _id: template.id, shopSlug: slug },
    {
      $set: { ...fields, shopSlug: slug },
      $setOnInsert: { _id: template.id },
    },
    { upsert: true }
  );
  revalidatePath(dashPath(slug), "layout");
}

export async function removeCustomTemplate(slug: string, id: string): Promise<void> {
  await assertShopOwner(slug);
  const db = await getDb();
  await db.collection<TemplateDoc>("custom_templates").deleteOne({ _id: String(id), shopSlug: slug });
  revalidatePath(dashPath(slug), "layout");
}
