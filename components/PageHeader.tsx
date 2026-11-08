import type { ReactNode } from "react";

/**
 * Shared page header in the v2 visual direction: pill label, light two-tone
 * display title, optional subtitle, and actions aligned right.
 *
 *   <PageHeader label="Catalogue" title="Your" soft="products" subtitle="…" actions={<Button/>} />
 *
 * `title` renders in ink, `soft` (optional) follows it in the muted second tone.
 */
export default function PageHeader({
  label,
  title,
  soft,
  subtitle,
  actions,
}: {
  label: string;
  title: ReactNode;
  soft?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="pg-head">
      <div>
        <span className="pill">{label}</span>
        <h1>
          {title}
          {soft ? (
            <>
              {" "}
              <span className="soft">{soft}</span>
            </>
          ) : null}
        </h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="pg-head-actions">{actions}</div> : null}
    </header>
  );
}
