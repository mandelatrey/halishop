"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { v4 as uuidv4 } from "uuid";
import Button from "@/components/Button";
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
    <main className="page">
      <h1>Custom templates</h1>
      <p className="subtitle">
        Upload your own backgrounds, overlays, or full designs. The app burns product code, price,
        shop name, and shop URL on top so every card stays trackable.
      </p>

      <div style={{ marginBottom: 20 }}>
        <Button onClick={createNew} className="sm" variant="sm" disabled={isPending}>
          {isPending ? "Creating…" : "+ New template"}
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="dinstr">
          <h3>Nothing here yet</h3>
          <p style={{ margin: 0 }}>
            Tap <strong>+ New template</strong> to upload an image and configure the text zone.
            You&rsquo;ll see a live preview using a sample product before you save.
          </p>
        </div>
      ) : (
        <div className="tlist">
          {templates.map((t) => (
            <Link key={t.id} href={`/templates/${t.id}`}>
              <div className="previewbox">
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt="" />
                ) : (
                  <div className="ph" style={{ width: "100%", height: "100%" }}>
                    no image
                  </div>
                )}
              </div>
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <div className="col" style={{ gap: 2 }}>
                  <span className="t2">{t.name}</span>
                  <span className="s">{t.composition}</span>
                </div>
                <button
                  type="button"
                  className="btn gh"
                  style={{ width: "auto", padding: "4px 6px" }}
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
