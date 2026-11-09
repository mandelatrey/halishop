import { requireOwnedShop } from "@/lib/auth/session";
import { listCustomTemplates } from "@/lib/server-store";
import TemplatesClient from "./Client";

export default async function TemplatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireOwnedShop(slug);
  const templates = await listCustomTemplates(slug);
  return <TemplatesClient initialTemplates={templates} />;
}
