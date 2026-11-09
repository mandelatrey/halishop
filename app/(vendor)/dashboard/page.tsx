import type { Metadata } from "next";
import Link from "next/link";
import { DailyCharts, KpiRow, METRICS_FOOTNOTE } from "@/components/MetricsBlocks";
import PageHeader from "@/components/PageHeader";
import { requireVendor } from "@/lib/auth/session";
import { combine, conversion, getShopMetrics, visits } from "@/lib/metrics";
import { listShopsForOwner } from "@/lib/server-store";

export const metadata: Metadata = { title: "Dashboard — Haali" };

const DAYS = 30;

/** Vendor home: every shop they run, with metrics rolled up across all of them. */
export default async function DashboardPage() {
  const vendor = await requireVendor("/dashboard");
  const shops = await listShopsForOwner(vendor.id);
  const first = vendor.name.split(/\s+/)[0];

  if (shops.length === 0) {
    return (
      <main className="page ad-page">
        <PageHeader
          label="Welcome"
          title={`Hi ${first},`}
          soft="let's set up your first shop."
          subtitle="A shop is one storefront link with its own catalogue, brand and WhatsApp number. Run as many as you have hustles."
        />
        <Link href="/dashboard/new" className="panel db-add" style={{ maxWidth: 520 }}>
          + Create your first shop
        </Link>
      </main>
    );
  }

  const metrics = await getShopMetrics(shops, DAYS);
  const all = combine(metrics);
  const multi = shops.length > 1;

  return (
    <main className="page ad-page">
      <PageHeader
        label={multi ? `${shops.length} shops` : "Dashboard"}
        title={`Hi ${first},`}
        soft={multi ? "here's how your shops are doing." : "here's how your shop is doing."}
        subtitle={`Last ${DAYS} days${multi ? ", across every shop you run" : ""}.`}
        actions={
          <Link href="/dashboard/new" className="btn sec">
            + Add a shop
          </Link>
        }
      />

      <KpiRow current={all.current} previous={all.previous} catalogue={all.catalogue} days={DAYS} />
      <DailyCharts series={all.series} />

      <section className="db-section">
        <div className="db-section-head">
          <h2 className="section-title">Your shops</h2>
        </div>
        <div className="db-shops">
          {metrics.map((m) => {
            const shop = shops.find((s) => s.slug === m.slug)!;
            const conv = conversion(m.current);
            return (
              <Link key={m.slug} href={`/dashboard/${m.slug}`} className="panel db-shop">
                <div className="db-shop-head">
                  {m.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.logo} alt="" className="db-shop-logo" />
                  ) : (
                    <span className="db-shop-logo" aria-hidden>
                      {m.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="db-shop-name">{m.name}</div>
                    <div className="db-shop-url">/shop/{m.slug}</div>
                  </div>
                </div>
                <div className="db-shop-stats">
                  <div>
                    <b>{visits(m.current)}</b>
                    <span>Page views</span>
                  </div>
                  <div>
                    <b>{m.current.order_tap}</b>
                    <span>Order taps</span>
                  </div>
                  <div>
                    <b>{conv === null ? "—" : `${Math.round(conv * 100)}%`}</b>
                    <span>View → order</span>
                  </div>
                  <div>
                    <b>{m.catalogue.inStock}</b>
                    <span>In stock</span>
                  </div>
                </div>
                <div className="db-shop-foot">
                  {m.catalogue.lowStock > 0 && <span className="tag acc">{m.catalogue.lowStock} running low</span>}
                  {m.top[0] && m.top[0].orders > 0 && <span className="tag">Top: {m.top[0].title}</span>}
                  <span className="tag">
                    {m.dropsInWindow} {m.dropsInWindow === 1 ? "drop" : "drops"} this month
                  </span>
                  {!shop.about?.description && !shop.about?.tagline && <span className="tag">Add shop info</span>}
                </div>
              </Link>
            );
          })}
          <Link href="/dashboard/new" className="panel db-add">
            + Add another shop
            <br />
            <span className="ad-hint">Another hustle? Give it its own link and catalogue.</span>
          </Link>
        </div>
      </section>

      {multi && (
        <section className="panel db-section">
          <h2 className="section-title">Side by side</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="db-table">
              <thead>
                <tr>
                  <th>Shop</th>
                  <th className="num">Page views</th>
                  <th className="num">Product views</th>
                  <th className="num">Order taps</th>
                  <th className="num">Questions</th>
                  <th className="num">Link taps</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.slug}>
                    <td>
                      <Link href={`/dashboard/${m.slug}`}>{m.name}</Link>
                    </td>
                    <td className="num">{visits(m.current)}</td>
                    <td className="num">{m.current.product_view}</td>
                    <td className="num">{m.current.order_tap}</td>
                    <td className="num">{m.current.ask_tap}</td>
                    <td className="num">{m.current.link_tap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="db-note">{METRICS_FOOTNOTE}</p>
    </main>
  );
}
