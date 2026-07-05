import { findCdnHop } from '../utils/cdnDetect.js';

const NODE_TYPES = {
  laptop: 'laptop',
  router: 'router',
  hop: 'hop',
  dns: 'dns',
  cdn: 'cdn',
  server: 'server',
};

export function buildGraphFromResults(results, previewNodes = null) {
  if (previewNodes) {
    return buildPreviewGraph(previewNodes);
  }

  if (!results) {
    return buildDormantGraph();
  }

  const hops = results.route?.hops?.filter((h) => !h.timedOut) || [];
  const cdn = findCdnHop(hops);
  const nodes = [];
  const edges = [];

  nodes.push({
    id: 'laptop',
    type: NODE_TYPES.laptop,
    label: 'Your Laptop',
    detail: 'Source device',
  });

  if (hops.length > 0) {
    hops.forEach((hop, index) => {
      const isCdn = cdn && cdn.index === index;
      const id = `hop-${index}`;
      nodes.push({
        id,
        type: isCdn ? NODE_TYPES.cdn : index === 0 ? NODE_TYPES.router : NODE_TYPES.hop,
        label: hop.hostname || hop.ip || `Hop ${hop.hop}`,
        detail: hop.ip || 'Hidden',
        rtt: hop.rtt,
        hopIndex: index,
        cdnProvider: isCdn ? cdn.provider : null,
      });

      const prevId = index === 0 ? 'laptop' : `hop-${index - 1}`;
      edges.push({
        id: `edge-${prevId}-${id}`,
        from: prevId,
        to: id,
        rtt: hop.rtt,
        cumulativeRtt: hops.slice(0, index + 1).reduce((s, h) => s + (h.rtt || 0), 0),
      });
    });

    const resolvedIp = results.dns?.resolvedIp;
    const lastHop = hops[hops.length - 1];

    // When traceroute's final hop is already the resolved destination IP,
    // promote that hop into the server node instead of drawing a duplicate.
    if (lastHop && resolvedIp && lastHop.ip === resolvedIp) {
      const originNode = nodes[nodes.length - 1];
      originNode.type = NODE_TYPES.server;
      originNode.label = results.target?.hostname || originNode.label;
      originNode.detail = resolvedIp;
      originNode.cdnProvider = null;
      const lastEdge = edges[edges.length - 1];
      if (lastEdge) lastEdge.isTunnelSegment = true;
    } else {
      const lastHopId = `hop-${hops.length - 1}`;
      const originId = 'origin';

      nodes.push({
        id: originId,
        type: NODE_TYPES.server,
        label: results.target?.hostname || 'Origin',
        detail: resolvedIp || 'Destination',
      });

      edges.push({
        id: `edge-${lastHopId}-${originId}`,
        from: lastHopId,
        to: originId,
        rtt: results.http?.timing?.ttfb || 0,
        cumulativeRtt: hops.reduce((s, h) => s + (h.rtt || 0), 0) + (results.http?.timing?.ttfb || 0),
        isTunnelSegment: true,
      });
    }
  } else {
    nodes.push({
      id: 'origin',
      type: NODE_TYPES.server,
      label: results.target?.hostname || 'Origin',
      detail: results.dns?.resolvedIp || 'Destination',
    });
    edges.push({
      id: 'edge-laptop-origin',
      from: 'laptop',
      to: 'origin',
      rtt: results.http?.timing?.tcp || 50,
      cumulativeRtt: results.http?.timing?.tcp || 50,
      isTunnelSegment: true,
    });
  }

  nodes.push({
    id: 'dns-resolver',
    type: NODE_TYPES.dns,
    label: 'DNS Resolver',
    detail: results.dns?.resolverAddress || 'System resolver',
    branchFrom: 'laptop',
  });

  return { nodes, edges, dnsNode: nodes.find((n) => n.id === 'dns-resolver') };
}

function buildPreviewGraph(previewNodes) {
  const nodes = [{ id: 'laptop', type: NODE_TYPES.laptop, label: 'Your Laptop', detail: 'Source' }];
  const edges = [];

  previewNodes.forEach((pn, index) => {
    const id = pn.id;
    nodes.push({
      id,
      type: pn.type === 'server' ? NODE_TYPES.server : pn.type === 'router' ? NODE_TYPES.router : NODE_TYPES.hop,
      label: pn.label,
      detail: pn.rtt ? `${pn.rtt}ms` : '',
      rtt: pn.rtt,
    });
    const prevId = index === 0 ? 'laptop' : previewNodes[index - 1].id;
    const cumulative = previewNodes.slice(0, index + 1).reduce((s, h) => s + (h.rtt || 0), 0);
    edges.push({
      id: `edge-${prevId}-${id}`,
      from: prevId,
      to: id,
      rtt: pn.rtt,
      cumulativeRtt: cumulative,
      isTunnelSegment: index === previewNodes.length - 1,
    });
  });

  nodes.push({
    id: 'dns-resolver',
    type: NODE_TYPES.dns,
    label: 'DNS Resolver',
    detail: '8.8.8.8',
    branchFrom: 'laptop',
  });

  return { nodes, edges, dnsNode: nodes.find((n) => n.id === 'dns-resolver') };
}

function buildDormantGraph() {
  const nodes = [
    { id: 'laptop', type: NODE_TYPES.laptop, label: 'Your Laptop', detail: 'Ready' },
    { id: 'router', type: NODE_TYPES.router, label: 'Router', detail: '—', dormant: true },
    { id: 'transit', type: NODE_TYPES.hop, label: 'Transit', detail: '—', dormant: true },
    { id: 'origin', type: NODE_TYPES.server, label: 'Server', detail: '—', dormant: true },
  ];
  const edges = [
    { id: 'dormant-1', from: 'laptop', to: 'router', dormant: true },
    { id: 'dormant-2', from: 'router', to: 'transit', dormant: true },
    { id: 'dormant-3', from: 'transit', to: 'origin', dormant: true, isTunnelSegment: true },
  ];
  return { nodes, edges, dnsNode: null };
}

export function layoutGraph(graph, width, height) {
  const { nodes, edges } = graph;
  const mainNodes = nodes.filter((n) => n.type !== NODE_TYPES.dns);
  const padding = 60;
  const usable = width - padding * 2;
  const y = height * 0.55;
  const count = mainNodes.length;

  // Cumulative latency per node (laptop = 0), so slow hops visually "stretch".
  const cumById = { [mainNodes[0]?.id]: 0 };
  for (const edge of edges) {
    if (typeof edge.cumulativeRtt === 'number') cumById[edge.to] = edge.cumulativeRtt;
  }
  const maxCum = Math.max(0, ...mainNodes.map((n) => cumById[n.id] || 0));

  // Blend even spacing with latency-proportional spacing, then enforce a
  // minimum gap and rescale so nodes always fit and labels never collide.
  const rawPositions = mainNodes.map((node, index) => {
    const evenFrac = count > 1 ? index / (count - 1) : 0;
    const rttFrac = maxCum > 0 ? (cumById[node.id] || 0) / maxCum : evenFrac;
    return (0.45 * evenFrac + 0.55 * rttFrac) * usable;
  });

  const minGap = count > 1 ? Math.max(64, (usable / (count - 1)) * 0.5) : 0;
  for (let i = 1; i < rawPositions.length; i += 1) {
    rawPositions[i] = Math.max(rawPositions[i], rawPositions[i - 1] + minGap);
  }
  const overflow = rawPositions[rawPositions.length - 1];
  const scale = overflow > usable && overflow > 0 ? usable / overflow : 1;
  const xById = Object.fromEntries(
    mainNodes.map((node, index) => [node.id, padding + rawPositions[index] * scale]),
  );

  const positioned = nodes.map((node) => {
    if (node.type === NODE_TYPES.dns) {
      return { ...node, x: padding, y: height * 0.22 };
    }

    return {
      ...node,
      x: xById[node.id] ?? padding,
      y,
    };
  });

  const nodeMap = Object.fromEntries(positioned.map((n) => [n.id, n]));

  const positionedEdges = edges.map((edge) => {
    const from = nodeMap[edge.from];
    const to = nodeMap[edge.to];
    if (!from || !to) return { ...edge, pathD: '' };
    const midY = (from.y + to.y) / 2 - 20;
    const pathD = `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${midY} ${to.x} ${to.y}`;
    return { ...edge, pathD, from, to };
  });

  const dnsEdge = graph.dnsNode
    ? (() => {
        const from = nodeMap.laptop;
        const to = nodeMap['dns-resolver'];
        if (!from || !to) return null;
        const pathD = `M ${from.x} ${from.y - 20} Q ${from.x} ${(from.y + to.y) / 2} ${to.x} ${to.y}`;
        return { id: 'dns-branch', pathD, from, to };
      })()
    : null;

  const tunnelEdge = positionedEdges.find((e) => e.isTunnelSegment) || positionedEdges[positionedEdges.length - 1];

  return { nodes: positioned, edges: positionedEdges, dnsEdge, tunnelEdge, nodeMap };
}
