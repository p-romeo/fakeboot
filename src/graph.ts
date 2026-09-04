import { DataSet, Network } from "vis-network/standalone";
import type { InvestigationData, ShopPayment } from "./data";

export type NodeKind = "operator" | "registrar" | "shop" | "payment";

export interface GraphNodeMeta {
  kind: NodeKind;
  label: string;
  domain?: string;
  shop?: ShopPayment;
  paymentLabel?: string;
}

const COLORS = {
  operator: { bg: "#22c55e", border: "#16a34a", highlight: "#4ade80" },
  registrar: { bg: "#64748b", border: "#475569", highlight: "#94a3b8" },
  shop: { bg: "#1877f2", border: "#0d65d9", highlight: "#4599ff" },
  payment: { bg: "#f97316", border: "#ea580c", highlight: "#fb923c" },
} as const;

function nodeStyle(kind: NodeKind) {
  const c = COLORS[kind];
  return {
    color: {
      background: c.bg,
      border: c.border,
      highlight: { background: c.highlight, border: c.bg },
      hover: { background: c.highlight, border: c.bg },
    },
    font: { color: "#f8fafc", face: "Inter, system-ui, sans-serif" },
    borderWidth: 2,
    shadow: { enabled: true, color: "rgba(0,0,0,0.45)", size: 8 },
  };
}

export interface NetworkGraph {
  network: Network;
  nodeMeta: Map<string, GraphNodeMeta>;
  focusNode: (id: string) => void;
  destroy: () => void;
}

export function buildNetworkGraph(
  container: HTMLElement,
  data: InvestigationData,
  onSelect: (meta: GraphNodeMeta | null) => void,
): NetworkGraph {
  const nodeMeta = new Map<string, GraphNodeMeta>();
  const nodes: Array<Record<string, unknown>> = [];
  const edges: Array<Record<string, unknown>> = [];

  const operatorId = "operator";
  nodeMeta.set(operatorId, {
    kind: "operator",
    label: "viethoa24",
  });
  nodes.push({
    id: operatorId,
    label: "viethoa24",
    title: "WordPress handle only — not a proven natural person",
    size: 28,
    ...nodeStyle("operator"),
  });

  const registrarId = "registrar";
  nodeMeta.set(registrarId, {
    kind: "registrar",
    label: data.registrar,
  });
  nodes.push({
    id: registrarId,
    label: data.registrar,
    title: "Domain registrar",
    size: 22,
    ...nodeStyle("registrar"),
  });

  for (const shop of data.shopToPayment) {
    const shopId = `shop:${shop.domain}`;
    nodeMeta.set(shopId, {
      kind: "shop",
      label: shop.shop,
      domain: shop.domain,
      shop,
    });
    nodes.push({
      id: shopId,
      label: truncate(shop.shop, 22),
      title: `${shop.shop}\n${shop.domain}`,
      size: 18,
      ...nodeStyle("shop"),
    });

    edges.push(
      {
        from: operatorId,
        to: shopId,
        dashes: [8, 6],
        color: { color: "#22c55e88", highlight: "#22c55e" },
        width: 1,
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        title: "runs",
      },
      {
        from: registrarId,
        to: shopId,
        dashes: [4, 8],
        color: { color: "#64748b88", highlight: "#94a3b8" },
        width: 1,
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        title: "registered via",
      },
    );
  }

  for (const payment of data.payments) {
    const payId = `payment:${payment.label}`;
    nodeMeta.set(payId, {
      kind: "payment",
      label: payment.label,
      domain: payment.domain,
      paymentLabel: payment.label,
    });
    nodes.push({
      id: payId,
      label: truncate(payment.label, 18),
      title: `${payment.label}\n${payment.domain}`,
      size: 24,
      ...nodeStyle("payment"),
    });
  }

  for (const shop of data.shopToPayment) {
    const shopId = `shop:${shop.domain}`;
    const payId = `payment:${shop.payment}`;
    edges.push({
      from: shopId,
      to: payId,
      color: { color: "#f97316cc", highlight: "#fb923c" },
      width: 2,
      arrows: { to: { enabled: true, scaleFactor: 0.7 } },
      title: "sends checkout to",
      smooth: { type: "curvedCW", roundness: 0.15 },
    });
  }

  const network = new Network(
    container,
    {
      nodes: new DataSet(nodes),
      edges: new DataSet(edges),
    },
    {
      autoResize: true,
      physics: {
        enabled: true,
        stabilization: { iterations: 180, fit: true },
        barnesHut: {
          gravitationalConstant: -5200,
          centralGravity: 0.25,
          springLength: 140,
          springConstant: 0.04,
          damping: 0.12,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 120,
        navigationButtons: false,
        keyboard: { enabled: true, bindToWindow: false },
        multiselect: false,
      },
      layout: {
        improvedLayout: true,
      },
      nodes: {
        shape: "dot",
        scaling: { min: 12, max: 32 },
      },
      edges: {
        smooth: { enabled: true, type: "dynamic", roundness: 0.5 },
      },
    },
  );

  network.on("click", (params) => {
    if (params.nodes.length === 0) {
      onSelect(null);
      return;
    }
    const meta = nodeMeta.get(String(params.nodes[0]));
    onSelect(meta ?? null);
  });

  network.once("stabilizationIterationsDone", () => {
    network.setOptions({ physics: { enabled: false } });
  });

  const focusNode = (id: string) => {
    network.selectNodes([id]);
    network.focus(id, {
      scale: 1.15,
      animation: { duration: 600, easingFunction: "easeInOutQuad" },
    });
    const meta = nodeMeta.get(id);
    if (meta) onSelect(meta);
  };

  return {
    network,
    nodeMeta,
    focusNode,
    destroy: () => network.destroy(),
  };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
