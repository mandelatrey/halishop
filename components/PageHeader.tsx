import type { ReactNode } from "react";

/**
 * Shared page header: pill label, title in charcoal, optional grey subtitle,
 * and actions aligned right.
 *
 *   <PageHeader label="Catalogue" title="Your" soft="products" subtitle="…" actions={<Button/>} />
 *
 * `soft` (optional) is appended to `title` in the same colour — titles are one
 * tone; the contrast is between the title and the grey subtitle beneath it.
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
          {soft ? <> {soft}</> : null}
        </h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="pg-head-actions">{actions}</div> : null}
    </header>
  );
}
