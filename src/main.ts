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
      <div class="counter-label">Fake shops confirmed</div>
    </div>
    <div class="counter-card" data-reveal>
      <div class="counter-value" data-count="${DATA.payments.length}">0</div>
      <div class="counter-label">Cash registers taking the money</div>
    </div>
    <div class="counter-card" data-reveal>
      <div class="counter-value" data-count="${submitted}">0</div>
      <div class="counter-label">Agencies and platforms reported to</div>
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
          <div class="money-host-count">${shops.length} fake shop${shops.length === 1 ? "" : "s"} send their checkout here</div>
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
      <div class="maps-fake">Fake site planted here: ${escapeHtml(hit.fake)}</div>
      <span class="status-badge submitted">Correction filed ${escapeHtml(hit.mapsEdit)}</span>
    </div>`,
    )
    .join("");
}

function renderFilings() {
  const board = document.getElementById("filings-board");
  if (!board) return;

  const entries: Array<[string, string, "submitted" | "blocked" | "hold" | "partial"]> = [
    ["Namecheap (domain seller)", DATA.filings.namecheap, classifyStatus(DATA.filings.namecheap)],
    ["FTC (US consumer protection)", DATA.filings.ftc, classifyStatus(DATA.filings.ftc)],
    ["Google Ads", DATA.filings.googleAds, classifyStatus(DATA.filings.googleAds)],
    ["Google Maps", DATA.filings.maps, classifyStatus(DATA.filings.maps)],
    ["Cloudflare (site security)", DATA.filings.cloudflare, classifyStatus(DATA.filings.cloudflare)],
    ["PayPal", DATA.filings.paypal, classifyStatus(DATA.filings.paypal)],
    ["FBI's IC3 cybercrime unit", DATA.filings.ic3, classifyStatus(DATA.filings.ic3)],
    ["Hong Kong company records", DATA.filings.hkExtracts, classifyStatus(DATA.filings.hkExtracts)],
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
      title: "Steal a shop's identity",
      body: `The operators pick a real, beloved local shoe-repair shop — one with years of good reviews — and build a copy of its website. Same name, same street address, same logo style. To a customer, it's indistinguishable from the real thing. ${DATA.lockedShops} of these clones have been confirmed so far.`,
    },
    {
      title: "Register the fakes in a factory run",
      body: `The fake domains weren't bought one at a time. A batch of them was registered through ${DATA.registrar} within roughly forty seconds of each other — the signature of automation, not a coincidence. More batches followed until the confirmed count hit fifteen.`,
    },
    {
      title: "Let Google deliver the customers",
      body: "The cruelest step: the fake website's address gets written into the real shop's Google Maps listing. Now anyone who searches for the actual cobbler gets handed the impostor on a plate. The real shop has no idea this is happening — until the angry calls start about orders it never took.",
    },
    {
      title: "Send checkout somewhere else",
      body: `When you click buy, the payment form doesn't belong to the fake shop. It loads from one of ${DATA.payments.length} separate outside websites — the cash registers. The shop name is just a costume; the register is where money actually changes hands, through PayPal accounts connected to those registers.`,
    },
    {
      title: "Rotate the register, keep the scam",
      body: 'When a cash register gets reported or scrutinized, the operators don\'t shut down — they swap. One fake shop moved its checkout to a brand-new register in a single day. The storefront stays up, the till changes, and customers never notice.',
    },
    {
      title: "The fingerprints they left behind",
      body: `Every fake site runs the same WordPress software under the same admin handle, "${DATA.operatorHandle.split(" ")[0]}". Six of the eight live cash registers publish the same Hong Kong office address. A software handle isn't a person's name, and a shared office building isn't proof of ownership on its own — but the pattern, taken together, points at one operation.`,
    },
    {
      title: "The fight so far",
      body: "Reports are in with the domain registrar, the FTC, and Google Ads. Four fake storefronts have already been taken offline at the registrar level. The cash registers are a harder fight — they're separate businesses in another jurisdiction, and some reporting channels require phone verification or logins I don't have. This investigation stays open.",
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
    '<div class="drawer-disclaimer">Independently investigated by Paul Romeo. The real shops are victims of this scheme, not part of it.</div>';

  switch (meta.kind) {
    case "operator":
      return `
        <span class="drawer-kind operator">Operator handle</span>
        <h2 class="drawer-title">viethoa24</h2>
        <div class="drawer-field">
          <div class="drawer-field-label">What this is</div>
          <div class="drawer-field-value">A software username found in the admin tools of every fake site</div>
        </div>
        <div class="drawer-field">
          <div class="drawer-field-label">Connections</div>
          <div class="drawer-field-value">Appears on all ${DATA.lockedShops} fake storefronts</div>
        </div>
        <div class="drawer-field">
          <div class="drawer-field-label">Important caveat</div>
          <div class="drawer-field-value">This is a username string, not a person's name — no individual has been identified</div>
        </div>
        ${disclaimer}`;

    case "registrar":
      return `
        <span class="drawer-kind registrar">Registrar</span>
        <h2 class="drawer-title">${escapeHtml(DATA.registrar)}</h2>
        <div class="drawer-field">
          <div class="drawer-field-label">What this is</div>
          <div class="drawer-field-value">The company the operators used to buy their fake website addresses</div>
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
        <span class="drawer-kind payment">Cash register</span>
        <h2 class="drawer-title">${escapeHtml(meta.label)}</h2>
        <div class="drawer-field">
          <div class="drawer-field-label">Domain</div>
          <div class="drawer-field-value">${escapeHtml(meta.domain ?? "")}</div>
        </div>
        <div class="drawer-field">
          <div class="drawer-field-label">What this is</div>
          <div class="drawer-field-value">An outside website where the fake shops' checkout payments actually load — not a shop, just the till</div>
        </div>
        <div class="drawer-field">
          <div class="drawer-field-label">Fake shops feeding it</div>
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
      <div class="drawer-field-label">Whose identity it stole</div>
      <div class="drawer-field-value">${escapeHtml(shop.shop)} — a real local business</div>
    </div>
    <div class="drawer-field">
      <div class="drawer-field-label">Where checkout money goes</div>
      <div class="drawer-field-value">${escapeHtml(shop.payment)} (${escapeHtml(shop.paymentDomain)})</div>
    </div>
    <div class="drawer-field">
      <div class="drawer-field-label">Operator's software handle</div>
      <div class="drawer-field-value">viethoa24 — a username, not a proven name</div>
    </div>
    <div class="drawer-field">
      <div class="drawer-field-label">Registrar</div>
      <div class="drawer-field-value">${escapeHtml(DATA.registrar)}</div>
    </div>
    <div class="drawer-disclaimer">Independently investigated by Paul Romeo. The real shops are victims of this scheme, not part of it.</div>`;
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
