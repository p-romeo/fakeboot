import "vis-network/styles/vis-network.min.css";
import "./style.css";
import {
  DATA,
  filingsSubmittedCount,
  shopsByPayment,
  type ShopPayment,
} from "./data";
import { buildNetworkGraph, type GraphNodeMeta } from "./graph";

let graphApi: ReturnType<typeof buildNetworkGraph> | null = null;

function init() {
  renderHero();
  initGraph();
  renderShopExplorer();
  renderMoneyFlow();
  renderMaps();
  renderFilings();
  renderStory();
  renderFooter();
  initDrawer();
  initScrollReveal();
  initKeyboard();
  handleDeepLink();
  window.addEventListener("hashchange", handleDeepLink);
}

function renderHero() {
  const submitted = filingsSubmittedCount(DATA.filings);
  const counters = document.getElementById("hero-counters");
  if (!counters) return;

  counters.innerHTML = `
    <div class="counter-card" data-reveal>
      <div class="counter-value" data-count="${DATA.lockedShops}">0</div>
      <div class="counter-label">Fake storefronts</div>
    </div>
    <div class="counter-card" data-reveal>
      <div class="counter-value" data-count="${DATA.payments.length}">0</div>
      <div class="counter-label">Payment hosts</div>
    </div>
    <div class="counter-card" data-reveal>
      <div class="counter-value" data-count="${submitted}">0</div>
      <div class="counter-label">Filings submitted</div>
    </div>
  `;

  animateCounters();
}

function animateCounters() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target.querySelector(".counter-value") as HTMLElement;
        if (!el || el.dataset.animated) continue;
        el.dataset.animated = "true";
        const target = Number(el.dataset.count ?? 0);
        const duration = 1200;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.5 },
  );

  document.querySelectorAll(".counter-card").forEach((c) => observer.observe(c));
}

function initGraph() {
  const container = document.getElementById("network-graph");
  if (!container) return;

  graphApi = buildNetworkGraph(container, DATA, openDrawerFromMeta);

  document.getElementById("zoom-in")?.addEventListener("click", () => {
    const scale = graphApi?.network.getScale() ?? 1;
    graphApi?.network.moveTo({ scale: scale * 1.25, animation: true });
  });

  document.getElementById("zoom-out")?.addEventListener("click", () => {
    const scale = graphApi?.network.getScale() ?? 1;
    graphApi?.network.moveTo({ scale: scale * 0.8, animation: true });
  });

  document.getElementById("zoom-fit")?.addEventListener("click", () => {
    graphApi?.network.fit({ animation: true });
  });
}

function renderShopExplorer() {
  const grid = document.getElementById("shop-grid");
  const search = document.getElementById("shop-search") as HTMLInputElement;
  const chips = document.getElementById("filter-chips");
  if (!grid || !search || !chips) return;

  const payments = [...new Set(DATA.shopToPayment.map((s) => s.payment))].sort();

  chips.innerHTML = `<button class="chip active" data-filter="all">All</button>${payments
    .map((p) => `<button class="chip" data-filter="${escapeAttr(p)}">${escapeHtml(p)}</button>`)
    .join("")}`;

  grid.innerHTML = DATA.shopToPayment
    .map(
      (shop, i) => `
    <article class="shop-card" tabindex="0" role="button"
      data-shop="${escapeAttr(shop.domain)}"
      data-payment="${escapeAttr(shop.payment)}"
      data-name="${escapeAttr(shop.shop.toLowerCase())}"
      style="animation-delay: ${i * 40}ms">
      <div class="shop-card-name">${escapeHtml(shop.shop)}</div>
      <div class="shop-card-domain">${escapeHtml(shop.domain)}</div>
      <div class="shop-card-arrow">
        <span>checkout →</span>
        <span class="payment-name">${escapeHtml(shop.payment)}</span>
      </div>
    </article>`,
    )
    .join("");

  let activeFilter = "all";

  const applyFilters = () => {
    const q = search.value.trim().toLowerCase();
    let visible = 0;
    grid.querySelectorAll(".shop-card").forEach((card) => {
      const el = card as HTMLElement;
      const matchPayment =
        activeFilter === "all" || el.dataset.payment === activeFilter;
      const matchSearch =
        !q ||
        (el.dataset.name?.includes(q) ?? false) ||
        (el.dataset.shop?.includes(q) ?? false);
      const show = matchPayment && matchSearch;
      el.classList.toggle("hidden", !show);
      if (show) visible++;
    });

    let empty = grid.querySelector(".empty-state");
    if (visible === 0) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No shops match your filters.";
        grid.appendChild(empty);
      }
    } else {
      empty?.remove();
    }
  };

  search.addEventListener("input", applyFilters);

  chips.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(".chip") as HTMLButtonElement;
    if (!btn) return;
    chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter ?? "all";
    applyFilters();
  });

  grid.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest(".shop-card") as HTMLElement;
    if (!card) return;
    focusShop(card.dataset.shop ?? "");
  });

  grid.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = (e.target as HTMLElement).closest(".shop-card") as HTMLElement;
    if (!card) return;
    e.preventDefault();
    focusShop(card.dataset.shop ?? "");
  });
}

function renderMoneyFlow() {
  const container = document.getElementById("money-flow");
  if (!container) return;

  const grouped = shopsByPayment(DATA.shopToPayment);
  const sorted = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);

  container.innerHTML = sorted
    .map(([payment, shops]) => {
      const host = DATA.payments.find((p) => p.label === payment);
      return `
      <div class="money-host reveal">
        <div class="money-host-header">
          <div class="money-host-name">${escapeHtml(payment)}</div>
          <div class="money-host-domain">${escapeHtml(host?.domain ?? "")}</div>
          <div class="money-host-count">${shops.length} shop${shops.length === 1 ? "" : "s"} route checkout here</div>
        </div>
        <ul class="money-shop-list">
          ${shops
            .map(
              (s) => `
            <li>
              <span>${escapeHtml(s.shop)}</span>
              <span class="domain">${escapeHtml(s.domain)}</span>
            </li>`,
            )
            .join("")}
        </ul>
      </div>`;
    })
    .join("");
}

function renderMaps() {
  const container = document.getElementById("maps-grid");
  if (!container) return;

  container.innerHTML = DATA.mapsContamination
    .map(
      (hit) => `
    <div class="maps-card reveal">
      <div class="maps-id">${escapeHtml(hit.id)}</div>
      <div class="maps-listing">${escapeHtml(hit.listing)}</div>
      <div class="maps-fake">Fake site: ${escapeHtml(hit.fake)}</div>
      <span class="status-badge submitted">Maps edit ${escapeHtml(hit.mapsEdit)}</span>
    </div>`,
    )
    .join("");
}

function renderFilings() {
  const board = document.getElementById("filings-board");
  if (!board) return;

  const entries: Array<[string, string, "submitted" | "blocked" | "hold" | "partial"]> = [
    ["Namecheap", DATA.filings.namecheap, classifyStatus(DATA.filings.namecheap)],
    ["FTC", DATA.filings.ftc, classifyStatus(DATA.filings.ftc)],
    ["Google Ads", DATA.filings.googleAds, classifyStatus(DATA.filings.googleAds)],
    ["Google Maps", DATA.filings.maps, classifyStatus(DATA.filings.maps)],
    ["Cloudflare", DATA.filings.cloudflare, classifyStatus(DATA.filings.cloudflare)],
    ["PayPal", DATA.filings.paypal, classifyStatus(DATA.filings.paypal)],
    ["IC3", DATA.filings.ic3, classifyStatus(DATA.filings.ic3)],
    ["HK Extracts", DATA.filings.hkExtracts, classifyStatus(DATA.filings.hkExtracts)],
  ];

  board.innerHTML = entries
    .map(
      ([name, status, kind]) => `
    <div class="filing-card ${kind} reveal">
      <span class="filing-icon">${filingIcon(kind)}</span>
      <div class="filing-name">${escapeHtml(name)}</div>
      <div class="filing-status">${escapeHtml(status)}</div>
    </div>`,
    )
    .join("");
}

function classifyStatus(
  text: string,
): "submitted" | "blocked" | "hold" | "partial" {
  const lower = text.toLowerCase();
  if (lower.startsWith("submitted")) return "submitted";
  if (lower.startsWith("blocked")) return "blocked";
  if (lower.startsWith("hold")) return "hold";
  return "partial";
}

function filingIcon(kind: "submitted" | "blocked" | "hold" | "partial"): string {
  switch (kind) {
    case "submitted":
      return "✓";
    case "blocked":
      return "✕";
    case "hold":
      return "⏸";
    case "partial":
      return "◐";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function renderStory() {
  const timeline = document.getElementById("story-timeline");
  if (!timeline) return;

  const steps = [
    {
      title: "Fake local storefronts",
      body: `${DATA.lockedShops} websites impersonate real US shoe-repair and tailor shops — copied branding, fake addresses, professional-looking pages.`,
    },
    {
      title: "Shared WordPress footprint",
      body: `All sites share the WordPress admin handle "${DATA.operatorHandle.split(" ")[0]}" — a string in source code, not proof of a named individual.`,
    },
    {
      title: "Namecheap registration",
      body: `Domains registered through ${DATA.registrar}, often with privacy WHOIS — the registrar thread includes indicators and shop addenda.`,
    },
    {
      title: "Checkout to payment hosts",
      body: `${DATA.payments.length} third-party payment hosts collect money via PayPal Client IDs and cart proxies — shops never keep checkout on their own domains.`,
    },
    {
      title: "Maps contamination",
      body: "Fake URLs appear on Google Maps listings for real businesses. Suggest-an-edit corrections submitted for National, Cobblers, Nu-Way, and Verona.",
    },
    {
      title: "Takedown in progress",
      body: "Filings submitted to Namecheap, FTC, and Google Ads. Maps partial. Cloudflare CAPTCHA, PayPal login, and IC3 phone requirements block some channels.",
    },
  ];

  timeline.innerHTML = steps
    .map(
      (s) => `
    <div class="story-step">
      <h3>${escapeHtml(s.title)}</h3>
      <p>${escapeHtml(s.body)}</p>
    </div>`,
    )
    .join("");
}

function renderFooter() {
  const notes = document.getElementById("footer-notes");
  if (!notes) return;
  notes.innerHTML = DATA.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("");
}

function initDrawer() {
  document.getElementById("drawer-close")?.addEventListener("click", closeDrawer);
  document.getElementById("drawer-overlay")?.addEventListener("click", closeDrawer);
}

function openDrawerFromMeta(meta: GraphNodeMeta | null) {
  if (!meta) {
    closeDrawer();
    return;
  }
  openDrawer(meta);
}

function openDrawer(meta: GraphNodeMeta) {
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("detail-drawer");
  const body = document.getElementById("drawer-content");
  if (!overlay || !drawer || !body) return;

  body.innerHTML = drawerHtml(meta);
  overlay.classList.add("open");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}

function closeDrawer() {
  document.getElementById("drawer-overlay")?.classList.remove("open");
  const drawer = document.getElementById("detail-drawer");
  drawer?.classList.remove("open");
  drawer?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  if (location.hash.startsWith("#shop=")) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

function drawerHtml(meta: GraphNodeMeta): string {
  const disclaimer =
    '<div class="drawer-disclaimer">Investigation by Paul Romeo (third party). Victim shop owners are not operators. Handles are technical identifiers only.</div>';

  switch (meta.kind) {
    case "operator":
      return `
        <span class="drawer-kind operator">Operator handle</span>
        <h2 class="drawer-title">viethoa24</h2>
        <div class="drawer-field">
          <div class="drawer-field-label">Identifier type</div>
          <div class="drawer-field-value">WordPress admin/author string</div>
        </div>
        <div class="drawer-field">
          <div class="drawer-field-label">Connections</div>
          <div class="drawer-field-value">Runs all ${DATA.lockedShops} fake storefronts</div>
        </div>
        ${disclaimer}`;

    case "registrar":
      return `
        <span class="drawer-kind registrar">Registrar</span>
        <h2 class="drawer-title">${escapeHtml(DATA.registrar)}</h2>
        <div class="drawer-field">
          <div class="drawer-field-label">Role</div>
          <div class="drawer-field-value">Domain registration for all storefronts in this network</div>
        </div>
        <div class="drawer-field">
          <div class="drawer-field-label">Filing status</div>
          <div class="drawer-field-value">${escapeHtml(DATA.filings.namecheap)}</div>
        </div>
        ${disclaimer}`;

    case "shop":
      if (!meta.shop) return "";
      return shopDrawerHtml(meta.shop);

    case "payment":
      return `
        <span class="drawer-kind payment">Payment host</span>
        <h2 class="drawer-title">${escapeHtml(meta.label)}</h2>
        <div class="drawer-field">
          <div class="drawer-field-label">Domain</div>
          <div class="drawer-field-value">${escapeHtml(meta.domain ?? "")}</div>
        </div>
        <div class="drawer-field">
          <div class="drawer-field-label">Shops routing here</div>
          <div class="drawer-field-value">${DATA.shopToPayment
            .filter((s) => s.payment === meta.paymentLabel)
            .map((s) => escapeHtml(s.shop))
            .join("<br>")}</div>
        </div>
        ${disclaimer}`;

    default: {
      const _exhaustive: never = meta.kind;
      return _exhaustive;
    }
  }
}

function shopDrawerHtml(shop: ShopPayment): string {
  return `
    <span class="drawer-kind shop">Fake storefront</span>
    <h2 class="drawer-title">${escapeHtml(shop.shop)}</h2>
    <div class="drawer-field">
      <div class="drawer-field-label">Domain</div>
      <div class="drawer-field-value">${escapeHtml(shop.domain)}</div>
    </div>
    <div class="drawer-field">
      <div class="drawer-field-label">Checkout routes to</div>
      <div class="drawer-field-value">${escapeHtml(shop.payment)} (${escapeHtml(shop.paymentDomain)})</div>
    </div>
    <div class="drawer-field">
      <div class="drawer-field-label">WordPress handle</div>
      <div class="drawer-field-value">viethoa24</div>
    </div>
    <div class="drawer-field">
      <div class="drawer-field-label">Registrar</div>
      <div class="drawer-field-value">${escapeHtml(DATA.registrar)}</div>
    </div>
    <div class="drawer-disclaimer">Investigation by Paul Romeo (third party). Victim shop owners are not operators.</div>`;
}

function focusShop(domain: string) {
  const nodeId = `shop:${domain}`;
  graphApi?.focusNode(nodeId);
  location.hash = `shop=${domain}`;
  document.getElementById("graph")?.scrollIntoView({ behavior: "smooth" });
}

function handleDeepLink() {
  const hash = location.hash;
  const match = hash.match(/^#shop=(.+)$/);
  if (!match) return;
  const domain = decodeURIComponent(match[1]);
  const shop = DATA.shopToPayment.find((s) => s.domain === domain);
  if (!shop) return;

  setTimeout(() => {
    graphApi?.focusNode(`shop:${domain}`);
    openDrawer({
      kind: "shop",
      label: shop.shop,
      domain: shop.domain,
      shop,
    });
  }, 800);
}

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
  );

  document.querySelectorAll(".reveal, .story-step").forEach((el) => observer.observe(el));
}

function initKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDrawer();
      return;
    }
    if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      document.getElementById("shop-search")?.focus();
      document.getElementById("shops")?.scrollIntoView({ behavior: "smooth" });
    }
    if (e.key === "g" && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement)) {
      document.getElementById("graph")?.scrollIntoView({ behavior: "smooth" });
    }
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

init();
