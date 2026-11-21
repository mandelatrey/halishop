import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { listUsersForAdmin, recentAdminLog, type AdminFilter } from "@/lib/server-store";
import { prettyPhone } from "@/lib/wa";
import { describeAction, formatWhen } from "./format";

export const metadata = { title: "Users · Haali admin" };

const FILTERS: { value: AdminFilter; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "sellers", label: "Sellers" },
  { value: "buyers", label: "Buyers" },
  { value: "admins", label: "Admins" },
  { value: "disabled", label: "Turned off" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.value === sp.filter)?.value ?? "all") as AdminFilter;
  const q = sp.q?.trim() ?? "";
  const page = Number(sp.page) || 1;
  const [{ rows, total, pages }, log] = await Promise.all([listUsersForAdmin({ q, filter, page }), recentAdminLog(12)]);
  const href = (over: Record<string, string | number>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(filter !== "all" ? { filter } : {}), ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, String(v)])) });
    for (const [k, v] of [...p]) if (!v || (k === "filter" && v === "all") || (k === "page" && v === "1")) p.delete(k);
    const s = p.toString();
    return `/admin${s ? `?${s}` : ""}`;
  };

  return (
    <main className="page ad-page">
      <PageHeader label="Admin" title="Users" subtitle="Everyone with a Haali account: find them, reset a password, sign them out, turn an account off, or move a shop." />

      <form className="sf-toolbar" action="/admin">
        <input className="inp" type="search" name="q" defaultValue={q} placeholder="Search by name, number or shop link" aria-label="Search users" />
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <button type="submit" className="btn sec">
          Search
        </button>
      </form>
      <div className="st-tabs" role="tablist" aria-label="Filter users">
        {FILTERS.map((f) => (
          <Link key={f.value} href={href({ filter: f.value, page: 1 })} role="tab" aria-selected={filter === f.value} className={filter === f.value ? "on" : ""}>
            {f.label}
          </Link>
        ))}
      </div>

      <section className="panel sf-table-wrap">
        <p className="sf-count">
          {total} {total === 1 ? "account" : "accounts"}
          {q ? ` matching “${q}”` : ""}
        </p>
        {rows.length === 0 ? (
          <p className="st-empty">No accounts here.</p>
        ) : (
          <table className="sf-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>WhatsApp</th>
                <th>Account</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className={u.disabled ? "off" : undefined}>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className="sf-user">
                      {u.name}
                    </Link>
                  </td>
                  <td className="sf-mono">{prettyPhone(u.phone)}</td>
                  <td>
                    <span className="sf-badges">
                      {u.shopSlug ? <span className="sf-badge seller">Seller · {u.shopName ?? u.shopSlug}</span> : <span className="sf-badge">Buyer</span>}
                      {u.role === "admin" && <span className="sf-badge admin">Admin</span>}
                      {u.disabled && <span className="sf-badge off">Turned off</span>}
                      {u.mustChangePassword && <span className="sf-badge temp">Temporary password</span>}
                    </span>
                  </td>
                  <td className="sf-muted">{formatWhen(u.createdAt, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <nav className="sf-pages" aria-label="Pages">
            {page > 1 && <Link href={href({ page: page - 1 })}>← Newer</Link>}
            <span>
              Page {page} of {pages}
            </span>
            {page < pages && <Link href={href({ page: page + 1 })}>Older →</Link>}
          </nav>
        )}
      </section>

      <section className="panel sf-log-panel">
        <h2 className="section-title">Recent admin activity</h2>
        {log.length === 0 ? (
          <p className="ad-hint">Nothing yet. Every action taken here is recorded.</p>
        ) : (
          <ul className="sf-log">
            {log.map((e, i) => (
              <li key={i}>
                <span className="sf-muted">{formatWhen(e.at)}</span>
                <span>
                  <b>{e.adminName}</b> {describeAction(e.action)}{" "}
                  <Link href={`/admin/users/${e.targetId}`}>{e.targetName}</Link>
                  {e.detail ? <span className="sf-muted"> — {e.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
