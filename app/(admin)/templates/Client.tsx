"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { v4 as uuidv4 } from "uuid";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import { removeCustomTemplate, upsertCustomTemplate } from "@/lib/actions/templates";
import type { CustomTemplate } from "@/lib/types";

const NEW_TEMPLATE_DEFAULTS: Omit<CustomTemplate, "id" | "createdAt"> = {
  name: "Untitled template",
  composition: "background",
  image: "",
  productScale: 1,
  textZone: "bottom-left",
  textColor: "#f3f2f2",
  accentColor: "#135aed",
  fields: { shopName: true, title: true, price: true, code: true, shopUrl: true },
  productImageMode: "grayscale",
};

export default function TemplatesClient({ initialTemplates }: { initialTemplates: CustomTemplate[] }) {
  const [templates, setTemplates] = useState<CustomTemplate[]>(initialTemplates);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function createNew() {
    const id = uuidv4();
    const t: CustomTemplate = { ...NEW_TEMPLATE_DEFAULTS, id, createdAt: Date.now() };
    startTransition(async () => {
      await upsertCustomTemplate(t);
      setTemplates((prev) => [t, ...prev]);
      router.push(`/templates/${id}`);
    });
  }

  function del(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    startTransition(async () => {
      await removeCustomTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    });
  }

  return (
    <main className="page ad-page">
      <PageHeader
        label="Templates"
        title="Custom"
        soft="templates"
        subtitle="Upload your own backgrounds, overlays, or full designs. The app burns product code, price, shop name, and shop URL on top so every card stays trackable."
        actions={
          <Button onClick={createNew} disabled={isPending}>
            {isPending ? "Creating…" : "+ New template"}
          </Button>
        }
      />

      {templates.length === 0 ? (
        <section className="panel ad-empty">
          <h2 className="section-title">Nothing here yet</h2>
          <p>
            Tap <strong style={{ color: "var(--color-text)", fontWeight: 600 }}>+ New template</strong> to upload an image and configure the text zone.
            You&rsquo;ll see a live preview using a sample product before you save.
          </p>
        </section>
      ) : (
        <div className="ad-tlist">
          {templates.map((t) => (
            <Link key={t.id} href={`/templates/${t.id}`} className="ad-tcard">
              <div className="ad-tcard-img">
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt="" />
                ) : (
                  <div className="ad-empty-ph">No image yet</div>
                )}
              </div>
              <div className="ad-tcard-meta">
                <div className="col">
                  <span className="t2">{t.name}</span>
                  <span className="s">{t.composition}</span>
                </div>
                <button
                  type="button"
                  className="btn gh danger"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    del(t.id, t.name);
                  }}
                >
                  Delete
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
