"use client";

import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

function chartRows(labels: string, values: string): Array<{ name: string; value: number }> {
  const names = labels.split("|").map((part) => part.trim()).filter(Boolean).slice(0, 8);
  const numbers = values.split("|").map((part) => Number(part.trim()));
  const rows = names.map((name, index) => ({
    name,
    value: Number.isFinite(numbers[index]) ? numbers[index] : 0,
  }));
  return rows.length > 0 ? rows : [{ name: "A", value: 40 }, { name: "B", value: 70 }, { name: "C", value: 55 }];
}

function ChartView({ node }: NodeViewProps) {
  const title = String(node.attrs.title || "Chart");
  const rows = chartRows(String(node.attrs.labels || ""), String(node.attrs.values || ""));
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <NodeViewWrapper className="folio-chart" data-chart="bar">
      <p className="folio-chart-title">{title}</p>
      <ul>
        {rows.map((row) => (
          <li key={row.name}>
            <span className="folio-chart-label">{row.name}</span>
            <span className="folio-chart-track">
              <span style={{ width: `${Math.max(0, Math.min(100, (row.value / max) * 100))}%` }} />
            </span>
            <span className="folio-chart-value">{row.value}</span>
          </li>
        ))}
      </ul>
    </NodeViewWrapper>
  );
}

export const TextAlign = Extension.create({
  name: "textAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "tableCell", "tableHeader"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => {
              const align = element.style.textAlign;
              return align === "center" || align === "right" ? align : null;
            },
            renderHTML: (attributes) => {
              const align = attributes.textAlign as string | null;
              if (align !== "center" && align !== "right") return {};
              return { style: `text-align: ${align}` };
            },
          },
        },
      },
    ];
  },
});

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: "div[data-page-break]" }, { tag: "hr[data-page-break]" }];
  },

  renderHTML() {
    return ["div", { "data-page-break": "true", class: "page-break", role: "separator" }];
  },
});

export const Chart = Node.create({
  name: "chart",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      title: { default: "Chart" },
      labels: { default: "Alpha|Beta|Gamma" },
      values: { default: "40|70|55" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-chart]",
        getAttrs: (element) => {
          const node = element as HTMLElement;
          return {
            title: node.getAttribute("data-title") || "Chart",
            labels: node.getAttribute("data-labels") || "",
            values: node.getAttribute("data-values") || "",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-chart": "bar",
        "data-title": HTMLAttributes.title,
        "data-labels": HTMLAttributes.labels,
        "data-values": HTMLAttributes.values,
      }),
      String(HTMLAttributes.title || "Chart"),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartView);
  },
});
