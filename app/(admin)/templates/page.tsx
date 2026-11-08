import { listCustomTemplates } from "@/lib/server-store";
import { getShopSlug } from "@/lib/actions/_slug";
import TemplatesClient from "./Client";

export default async function TemplatesPage() {
  const templates = await listCustomTemplates(getShopSlug());
  return <TemplatesClient initialTemplates={templates} />;
}
