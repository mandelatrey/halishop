import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { getUserForAdmin } from "@/lib/server-store";
import { prettyPhone } from "@/lib/wa";
import { describeAction, formatWhen } from "../../format";
import UserActions from "./UserActions";

export const metadata = { title: "User · Haali admin" };

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, me] = await Promise.all([getUserForAdmin(id), getCurrentUser()]);
  if (!data) notFound();
  const { user, ordersPlaced, shopOrders, sessions, log } = data;

  return (
    <main className="page ad-page">
      <Link href="/admin" className="by-back sf-back">
        ← All users
      </Link>
      <PageHeader
        label={user.role === "admin" ? "Admin" : user.shopSlug ? "Seller" : "Buyer"}
        title={user.name}
        subtitle={`${prettyPhone(user.phone)} · joined ${formatWhen(user.createdAt, false)}`}
      />

      <div className="sf-facts">
        <div>
          <span className="st-label">Status</span>
          <b>{user.disabled ? "Turned off" : user.mustChangePassword ? "On a temporary password" : "Active"}</b>
        </div>
        <div>
          <span className="st-label">Signed in on</span>
          <b>
            {sessions} device{sessions === 1 ? "" : "s"}
          </b>
        </div>
        <div>
          <span className="st-label">Orders placed</span>
          <b>{ordersPlaced}</b>
        </div>
        <div>
          <span className="st-label">Shop</span>
          <b>
            {user.shopSlug ? (
              <Link href={`/shop/${user.shopSlug}`}>{user.shopName ?? user.shopSlug}</Link>
            ) : (
              "—"
            )}
          </b>
          {user.shopSlug && <span className="sf-muted">{shopOrders} orders received</span>}
        </div>
        <div>
          <span className="st-label">Favourite shops</span>
          <b>{user.favorites}</b>
        </div>
      </div>

      <UserActions user={user} sessions={sessions} isMe={me?.id === user.id} host={process.env.NEXT_PUBLIC_APP_HOST || "shop.app"} />

      <section className="panel sf-log-panel">
        <h2 className="section-title">Admin history</h2>
        {log.length === 0 ? (
          <p className="ad-hint">No admin has changed this account.</p>
        ) : (
          <ul className="sf-log">
            {log.map((e, i) => (
              <li key={i}>
                <span className="sf-muted">{formatWhen(e.at)}</span>
                <span>
                  <b>{e.adminName}</b> {describeAction(e.action)} {e.targetName}
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
