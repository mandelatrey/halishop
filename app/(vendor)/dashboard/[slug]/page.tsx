import Link from "next/link";
import CopyLink from "@/components/CopyLink";
import { DailyCharts, KpiRow, METRICS_FOOTNOTE } from "@/components/MetricsBlocks";
import PageHeader from "@/components/PageHeader";
import { requireOwnedShop } from "@/lib/auth/session";
import { getShopMetrics } from "@/lib/metrics";
import { appHost, dashPath, shopPath } from "@/lib/paths";
import { listDropsForShop } from "@/lib/server-store";

const DAYS = 30;

/** One shop's overview: its metrics, best sellers, and shortcuts to its tools. */
export default async function ShopOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { shop } = await requireOwnedShop(slug);
  const [[m], drops] = await Promise.all([getShopMetrics([shop], DAYS), listDropsForShop(slug, 3)]);
  const [nameHead, ...nameRest] = shop.brandKit.shopName.trim().split(/\s+/);
  const missingInfo = !shop.about?.description && !shop.about?.tagline;

  return (
    <main className="page ad-page">
      <PageHeader
        label="Overview"
        title={nameHead}
        soft={nameRest.join(" ") || undefined}
        subtitle={`Last ${DAYS} days.`}
        actions={
          <>
            <Link href={dashPath(slug, "/products")} className="btn sec">
              Add products
            </Link>
            <Link href={dashPath(slug, "/drops/new")} className="btn">
              Post a drop
            </Link>
          </>
        }
      />

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2 className="section-title">Your shop link</h2>
        <CopyLink display={`${appHost()}${shopPath(slug)}`} path={shopPath(slug)} />
        <p className="db-note" style={{ marginTop: 10 }}>
          Buyers who open this link see only this shop, plus an About page telling them who they&rsquo;re buying from.
          {missingInfo && (
            <>
              {" "}
              <Link href={dashPath(slug, "/settings")}>Add your shop info →</Link>
            </>
          )}
        </p>
      </section>

      <KpiRow current={m.current} previous={m.previous} catalogue={m.catalogue} days={DAYS} />
      <DailyCharts series={m.series} />

      <div className="db-two db-section">
        <section className="panel">
          <h2 className="section-title">Most wanted products</h2>
          {m.top.length === 0 ? (
            <p className="db-chart-empty">Once buyers start looking at products, the most viewed and ordered show up here.</p>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Views</th>
                  <th className="num">Order taps</th>
                </tr>
              </thead>
              <tbody>
                {m.top.map((t) => (
                  <tr key={t.code}>
                    <td>
                      <Link href={dashPath(slug, `/products/${t.code}/card`)}>{t.title}</Link>{" "}
                      <span className="ad-hint">{t.code}</span>
                    </td>
                    <td className="num">{t.views}</td>
                    <td className="num">{t.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <h2 className="section-title">Activity</h2>
          <table className="db-table">
            <tbody>
              <tr>
                <td>Storefront visits</td>
                <td className="num">{m.current.shop_view}</td>
              </tr>
              <tr>
                <td>Product page views</td>
                <td className="num">{m.current.product_view}</td>
              </tr>
              <tr>
                <td>Drop page views</td>
                <td className="num">{m.current.drop_view}</td>
              </tr>
              <tr>
                <td>Status link taps</td>
                <td className="num">{m.current.link_tap}</td>
              </tr>
              <tr>
                <td>Questions asked</td>
                <td className="num">{m.current.ask_tap}</td>
              </tr>
              <tr>
                <td>About page views</td>
                <td className="num">{m.current.about_view}</td>
              </tr>
            </tbody>
          </table>
          {drops.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: 24 }}>
                Recent drops
              </h2>
              <div className="db-quick">
                {drops.map((d) => (
                  <Link key={d.id} href={dashPath(slug, `/drops/${d.id}`)} className="btn sec">
                    {d.name}
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <p className="db-note">{METRICS_FOOTNOTE}</p>
    </main>
  );
}
