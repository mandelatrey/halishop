"use server";

import { revalidatePath } from "next/cache";
import type { CustomTemplate } from "../types";
import { getDb } from "../db";
import { ensureSeeded } from "../seed";
import { getShopSlug } from "./_slug";

type TemplateDoc = CustomTemplate & { _id: string; shopSlug: string };

export async function upsertCustomTemplate(template: CustomTemplate): Promise<void> {
  const slug = getShopSlug();
  await ensureSeeded(slug);
  const db = await getDb();
  await db.collection<TemplateDoc>("custom_templates").updateOne(
    { _id: template.id },
    {
      $set: {
        shopSlug: slug,
        ...template,
      },
      $setOnInsert: { _id: template.id },
    },
    { upsert: true }
  );
  revalidatePath("/templates");
  revalidatePath(`/templates/${template.id}`);
}

export async function removeCustomTemplate(id: string): Promise<void> {
  const slug = getShopSlug();
  const db = await getDb();
  await db.collection<TemplateDoc>("custom_templates").deleteOne({ _id: id, shopSlug: slug });
  revalidatePath("/templates");
}
