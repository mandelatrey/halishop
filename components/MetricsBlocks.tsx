import DailyBars from "./DailyBars";
import type { CatalogueFacts, Counts, DayPoint } from "@/lib/metrics";
import { conversion, visits } from "@/lib/metrics";

function Delta({ now, before }: { now: number; before: number }) {
  if (before === 0 && now === 0) return <span className="db-delta">No activity yet</span>;
  if (before === 0) return <span className="db-delta up">New this period</span>;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="db-delta">Same as before</span>;
  return (
    <span className={pct > 0 ? "db-delta up" : "db-delta down"}>
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}% vs prior period
    </span>
  );
}

function money(stockValue: Record<string, number>) {
  const entries = Object.entries(stockValue).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return { cur: "", amount: "—", more: 0 };
  const [cur, v] = entries[0];
  return { cur, amount: Math.round(v).toLocaleString("en-US"), more: entries.length - 1 };
}

/** Headline KPIs: visits, order taps, tap rate, stock on hand. */
export function KpiRow({
  current,
  previous,
  catalogue,
  days,
}: {
  current: Counts;
  previous: Counts;
  catalogue: CatalogueFacts;
  days: number;
}) {
  const conv = conversion(current);
  const prevConv = conversion(previous);
  const stock = money(catalogue.stockValue);
  return (
    <div className="db-kpis">
      <div className="db-kpi">
        <div className="db-kpi-l">Page views · {days} days</div>
        <div className="db-kpi-v">{visits(current).toLocaleString("en-US")}</div>
        <Delta now={visits(current)} before={visits(previous)} />
      </div>
      <div className="db-kpi">
        <div className="db-kpi-l">Order taps · {days} days</div>
        <div className="db-kpi-v">{current.order_tap.toLocaleString("en-US")}</div>
        <Delta now={current.order_tap} before={previous.order_tap} />
      </div>
      <div className="db-kpi">
        <div className="db-kpi-l">Product views → order</div>
        <div className="db-kpi-v">{conv === null ? "—" : `${(conv * 100).toFixed(conv < 0.1 ? 1 : 0)}%`}</div>
        <span className="db-delta">
          {prevConv === null ? `${current.product_view} product views` : `was ${(prevConv * 100).toFixed(1)}%`}
        </span>
      </div>
      <div className="db-kpi">
        <div className="db-kpi-l">Stock on hand (retail)</div>
        <div className="db-kpi-v">
          {stock.cur && <small>{stock.cur}</small>}
          {stock.amount}
        </div>
        <span className="db-delta">
          {catalogue.inStock} in stock · {catalogue.lowStock} low · {catalogue.soldOut} sold out
          {stock.more ? ` · +${stock.more} currency` : ""}
        </span>
      </div>
    </div>
  );
}

/** Two single-measure charts side by side — visits and order taps per day. */
export function DailyCharts({ series }: { series: DayPoint[] }) {
  const any = series.some((p) => p.visits || p.orders);
  return (
    <div className="db-charts db-section">
      <section className="panel">
        <h2 className="section-title">Page views per day</h2>
        {any ? (
          <DailyBars points={series.map((p) => ({ day: p.day, value: p.visits }))} label="Page views per day" unit={["page view", "page views"]} />
        ) : (
          <p className="db-chart-empty">
            Nothing yet. Share your shop link or post a drop to your status — views show up here as buyers arrive.
          </p>
        )}
      </section>
      <section className="panel">
        <h2 className="section-title">Order taps per day</h2>
        {any ? (
          <DailyBars
            points={series.map((p) => ({ day: p.day, value: p.orders }))}
            label="Order taps per day"
            unit={["order tap", "order taps"]}
          />
        ) : (
          <p className="db-chart-empty">Each time a buyer taps &ldquo;Order on WhatsApp&rdquo;, it&rsquo;s counted here.</p>
        )}
      </section>
    </div>
  );
}

export const METRICS_FOOTNOTE =
  "Order taps count buyers opening WhatsApp with an order — Haali can't see whether the chat ended in a sale. Your own visits while signed in aren't counted.";
