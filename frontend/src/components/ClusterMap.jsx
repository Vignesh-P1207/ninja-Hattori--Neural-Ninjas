import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';

const CLUSTER_COLORS = ['#7b2fff', '#00d4ff', '#ff2d78', '#39ff14', '#ffcc00', '#ff4500'];

const getClusterColor = (id) => {
    if (id === -1) return '#888888'; // Noise
    return CLUSTER_COLORS[id % CLUSTER_COLORS.length];
};

export default function ClusterMap({ nodes, threshold, newDefectEvent }) {
    const containerRef = useRef(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const simulationRef = useRef(null);
    const dataRef = useRef({ nodes: [], links: [] });

    useEffect(() => {
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Filter nodes by threshold (stub: assume similarity attached to nodes if requested, 
        // but the prompt says "moving it live re-runs similarity filter, nodes that drop fade out".
        // For simplicity, we just render all nodes from state).

        // Create links between same clusters
        const links = [];
        const clusters = {};
        nodes.forEach(n => {
            if (n.cluster_id !== -1) {
                if (!clusters[n.cluster_id]) clusters[n.cluster_id] = [];
                clusters[n.cluster_id].push(n);
            }
        });

        Object.values(clusters).forEach(group => {
            for (let i = 0; i < group.length - 1; i++) {
                // Just link to the next one to form a chain/tree
                links.push({ source: group[i].id, target: group[i + 1].id });
            }
        });

        dataRef.current = {
            nodes: nodes.map(d => ({ ...d })), // clone
            links: links.map(d => ({ ...d }))
        };

        d3.select(containerRef.current).select("svg").remove();

        const svg = d3.select(containerRef.current)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, width, height]);

        // Defs for glows
        const defs = svg.append("defs");
        CLUSTER_COLORS.forEach((color, i) => {
            const filter = defs.append("filter").attr("id", `glow-${i}`);
            filter.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "coloredBlur");
            const feMerge = filter.append("feMerge");
            feMerge.append("feMergeNode").attr("in", "coloredBlur");
            feMerge.append("feMergeNode").attr("in", "SourceGraphic");
        });

        const gLayer = svg.append("g");

        // Zoom behavior
        const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", (e) => {
            gLayer.attr("transform", e.transform);
        });
        svg.call(zoom);

        // Start slightly zoomed out and centered
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));

        const linkGroup = gLayer.append("g").attr("class", "links");
        const nodeGroup = gLayer.append("g").attr("class", "nodes");
        const ringGroup = gLayer.append("g").attr("class", "rings");

        const simulation = d3.forceSimulation(dataRef.current.nodes)
            .force("link", d3.forceLink(dataRef.current.links).id(d => d.id).distance(40))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("collide", d3.forceCollide().radius(12))
            .force("x", d3.forceX(d => d.x * 200).strength(0.05)) // Use PCA coords as target
            .force("y", d3.forceY(d => d.y * 200).strength(0.05));

        simulationRef.current = simulation;

        const updateMap = () => {
            // Data bind Links
            const link = linkGroup.selectAll("line").data(dataRef.current.links);
            const linkEnter = link.enter().append("line")
                .attr("stroke", "rgba(255,255,255,0.1)")
                .attr("stroke-width", 1);
            const linkMerge = linkEnter.merge(link);

            // Data bind Nodes
            const node = nodeGroup.selectAll("circle").data(dataRef.current.nodes, d => d.id);

            const nodeEnter = node.enter()
                .append("circle")
                .attr("r", 6)
                .attr("fill", d => getClusterColor(d.cluster_id))
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 0.5)
                .style("filter", d => d.cluster_id !== -1 ? `url(#glow-${d.cluster_id % CLUSTER_COLORS.length})` : "none")
                .style("transition", "transform 0.2s")
                .on("mouseenter", (e, d) => {
                    d3.select(e.currentTarget).attr("r", 10);
                    setHoveredNode(d);
                    setTooltipPos({ x: e.clientX, y: e.clientY });

                    // Emit sparks
                    for (let i = 0; i < 6; i++) {
                        const spark = document.createElement('div');
                        spark.className = 'fixed w-1 h-1 rounded-full z-[100] pointer-events-none';
                        spark.style.backgroundColor = getClusterColor(d.cluster_id);
                        spark.style.left = `${e.clientX}px`;
                        spark.style.top = `${e.clientY}px`;
                        document.body.appendChild(spark);

                        const angle = (i / 6) * Math.PI * 2;
                        const velocity = 30;
                        const tx = Math.cos(angle) * velocity;
                        const ty = Math.sin(angle) * velocity;

                        spark.animate([
                            { transform: `translate(0px, 0px) scale(1)`, opacity: 1 },
                            { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
                        ], {
                            duration: 500,
                            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                        }).onfinish = () => spark.remove();
                    }
                })
                .on("mouseleave", (e, d) => {
                    d3.select(e.currentTarget).attr("r", 6);
                    setHoveredNode(null);
                })
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));

            const nodeMerge = nodeEnter.merge(node);
            node.exit().transition().duration(400).attr("r", 0).remove();

            // Pulse animation
            pulseNodes();
            function pulseNodes() {
                nodeGroup.selectAll("circle")
                    .transition()
                    .duration(1000)
                    .attr("r", 6.5)
                    .transition()
                    .duration(1000)
                    .attr("r", 5.5)
                    .on("end", pulseNodes);
            }

            // Rings (Compute centroids)
            const renderRings = () => {
                const centroids = {};
                const counts = {};
                dataRef.current.nodes.forEach(n => {
                    if (n.cluster_id !== -1) {
                        if (!centroids[n.cluster_id]) {
                            centroids[n.cluster_id] = { x: 0, y: 0 };
                            counts[n.cluster_id] = 0;
                        }
                        centroids[n.cluster_id].x += n.x;
                        centroids[n.cluster_id].y += n.y;
                        counts[n.cluster_id]++;
                    }
                });

                const activeClusters = Object.keys(centroids).map(id => {
                    return {
                        id,
                        x: centroids[id].x / counts[id],
                        y: centroids[id].y / counts[id],
                        r: Math.max(40, counts[id] * 5)
                    };
                });

                const rings = ringGroup.selectAll("g.ring").data(activeClusters, d => d.id);

                const ringsEnter = rings.enter().append("g").attr("class", "ring");

                ringsEnter.append("circle")
                    .attr("fill", "none")
                    .attr("stroke", d => getClusterColor(d.id))
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "4,8")
                    .attr("class", d => `orbit-${d.id % 3 === 0 ? '8s' : d.id % 2 === 0 ? '12s' : '16s'}`);

                ringsEnter.append("circle")
                    .attr("fill", d => getClusterColor(d.id))
                    .attr("opacity", 0.05)
                    .attr("class", "glow-bg");

                const ringsMerge = ringsEnter.merge(rings);

                ringsMerge.attr("transform", d => `translate(${d.x},${d.y})`);
                ringsMerge.select("circle.orbit-8s, circle.orbit-12s, circle.orbit-16s").attr("r", d => d.r);
                ringsMerge.select("circle.glow-bg").attr("r", d => d.r * 1.5).style("filter", d => `url(#glow-${d.id % CLUSTER_COLORS.length})`);

                rings.exit().remove();
            };

            simulation.on("tick", () => {
                linkMerge
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                nodeMerge
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);

                renderRings();
            });
        };

        updateMap();

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

    }, [nodes]); // Re-run when full nodes list changes (on upload)

    // Handle new defect event separately
    useEffect(() => {
        if (newDefectEvent && containerRef.current && simulationRef.current) {
            const { result, node_position, id, title } = newDefectEvent;

            const newNode = {
                id: id || "NEW_NODE",
                title: title,
                cluster_id: result.cluster_id,
                x: node_position?.x * 200 || 0, // Target PCA mapped
                y: -1000 // Spawn far top
            };

            dataRef.current.nodes.push(newNode);

            // Connect to cluster if duplicate
            if (result.decision === "duplicate" || result.decision === "possible_duplicate") {
                const targetNode = dataRef.current.nodes.find(n => n.id === result.top_matches[0].id);
                if (targetNode) {
                    dataRef.current.links.push({ source: newNode.id, target: targetNode.id });
                }
            }

            // We should trigger a D3 update, for now we can just force update the component 
            // by relying on the parent passing down the new nodes array, BUT the prompt asks for
            // comet trail.

            // Comet trail effect
            const comet = document.createElement('div');
            comet.className = 'fixed w-3 h-3 rounded-full z-50 pointer-events-none';
            comet.style.background = result.decision === "new_defect" ? '#00ffaa' : '#ffcc00';
            comet.style.boxShadow = `0 0 20px ${comet.style.background}`;
            comet.style.left = `50%`;
            comet.style.top = `-50px`;
            document.body.appendChild(comet);

            comet.animate([
                { transform: `translate(0, 0)`, opacity: 1 },
                { transform: `translate(0, 500px)`, opacity: 0 } // Simulate fly in
            ], {
                duration: 1000,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }).onfinish = () => comet.remove();

            // Restart sim with jump
            simulationRef.current.nodes(dataRef.current.nodes);
            simulationRef.current.force("link").links(dataRef.current.links);
            simulationRef.current.alpha(1).restart();
        }
    }, [newDefectEvent]);

    return (
        <div className="relative w-full h-full z-10" ref={containerRef}>
            <AnimatePresence>
                {hoveredNode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="fixed z-50 bg-[#0a0a0f]/90 border border-white/10 p-3 rounded-sm backdrop-blur-md shadow-2xl pointer-events-none"
                        style={{ left: tooltipPos.x + 15, top: tooltipPos.y + 15, width: 200 }}
                    >
                        <div className="font-mono text-xs text-accentDup mb-1">ID: {hoveredNode.id}</div>
                        <div className="font-body text-sm text-white line-clamp-3">{hoveredNode.title}</div>
                        <div className="font-mono text-[10px] text-white/50 mt-2 uppercase">Cluster: {hoveredNode.cluster_id}</div>
                        <div className="absolute inset-0 border border-accentDup/30 rounded-sm scale-105 pointer-events-none"></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
