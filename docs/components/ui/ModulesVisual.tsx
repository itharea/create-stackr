'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react';
import styles from './ModulesVisual.module.css';
import { LOGO_PATHS, LogoName } from './IntegrationLogos';

// Nodes aligned to 20° grid intersections for visual anchoring
const modules: { name: LogoName; lat: number; lng: number }[] = [
    { name: 'RevenueCat', lat: 20, lng: 0 },      // NORTH
    { name: 'Adjust', lat: -20, lng: 80 },        // SOUTH
    { name: 'BetterAuth', lat: 40, lng: 140 },    // NORTH
    { name: 'Onboarding', lat: -20, lng: 220 },   // SOUTH
    { name: 'Stripe', lat: 20, lng: 280 },        // NORTH
];

const BASE_GLOBE_RADIUS = 240;
const MOBILE_BREAKPOINT = 640;
const LOGO_SIZE = 10; // Smaller, subtler logos

// Pole positions
const NORTH_POLE = { lat: 90, lng: 0 };
const SOUTH_POLE = { lat: -90, lng: 0 };

// Light beam settings
const BEAMS_PER_CONNECTION = 1;
const POLE_FLOW_DURATION = 4000; // ms - faster flow for light beam effect
const BEAM_LENGTH = 0.30; // 30% of path length for visible trail

interface Point3D {
    x: number;
    y: number;
    z: number;
}

interface Point2D {
    x: number;
    y: number;
    scale: number;
    opacity: number;
    zIndex: number;
}

function toCartesian(lat: number, lng: number, radius: number): Point3D {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return {
        x: -(radius * Math.sin(phi) * Math.cos(theta)),
        z: radius * Math.sin(phi) * Math.sin(theta),
        y: radius * Math.cos(phi),
    };
}

function project(point: Point3D, rotation: number, width: number, height: number, radius: number): Point2D {
    const rad = rotation * (Math.PI / 180);
    const xRot = point.x * Math.cos(rad) - point.z * Math.sin(rad);
    const zRot = point.x * Math.sin(rad) + point.z * Math.cos(rad);

    const perspective = 800;
    const scale = perspective / (perspective - zRot);

    return {
        x: width / 2 + xRot * scale,
        y: height / 2 - point.y * scale,
        scale: scale,
        opacity: Math.max(0.1, (zRot + radius) / (2 * radius)),
        zIndex: Math.floor(zRot),
    };
}

// Interpolate along longitude line from node to pole
function interpolateTowardsPole(
    nodeLat: number,
    nodeLng: number,
    poleLat: number,
    progress: number
): { lat: number; lng: number } {
    // Simple linear interpolation along the meridian
    return {
        lat: nodeLat + (poleLat - nodeLat) * progress,
        lng: nodeLng,
    };
}

// Generate light beam path segment with gradient endpoints
function generateBeamPath(
    nodeLat: number,
    nodeLng: number,
    poleLat: number,
    headProgress: number,
    rotation: number,
    width: number,
    height: number,
    radius: number,
    reverse: boolean = false
): { pathData: string; headPos: Point2D; tailPos: Point2D; visible: boolean } | null {
    const tailProgress = headProgress - BEAM_LENGTH;

    // Clamp to visible range
    const visibleHead = Math.min(1, Math.max(0, headProgress));
    const visibleTail = Math.min(1, Math.max(0, tailProgress));

    // Not visible if entirely outside range
    if (visibleHead <= visibleTail) return null;

    // Generate path points along the beam
    const numPoints = 12;
    const points: Point2D[] = [];

    for (let i = 0; i <= numPoints; i++) {
        const t = visibleTail + (visibleHead - visibleTail) * (i / numPoints);
        const actualT = reverse ? 1 - t : t;
        const pos = interpolateTowardsPole(nodeLat, nodeLng, poleLat, actualT);
        const p3d = toCartesian(pos.lat, pos.lng, radius);
        const p2d = project(p3d, rotation, width, height, radius);
        points.push(p2d);
    }

    // Build path data
    const pathData = points.map((pt, j) =>
        `${j === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`
    ).join(' ');

    // For gradient: tail is first point, head is last point
    const tailPos = points[0];
    const headPos = points[points.length - 1];

    // Calculate journey fade (fade in at start, fade out at end)
    const journeyFade = Math.sin(headProgress * Math.PI);

    return {
        pathData,
        headPos,
        tailPos,
        visible: journeyFade > 0.05
    };
}

export function ModulesVisual() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [rotation, setRotation] = useState(0);
    const [hoveredModule, setHoveredModule] = useState<string | null>(null);
    const [flowTime, setFlowTime] = useState(0);

    // Only render after mounting to avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        let animationFrame: number;
        let lastTime = performance.now();
        const animate = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            setRotation(prev => (prev + 0.15) % 360);
            setFlowTime(prev => prev + deltaTime);
            animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, []);

    // Calculate responsive globe radius - scales proportionally under 640px
    const globeRadius = useMemo(() => {
        if (dimensions.width === 0) return BASE_GLOBE_RADIUS;
        if (dimensions.width >= MOBILE_BREAKPOINT) return BASE_GLOBE_RADIUS;
        // Scale proportionally based on viewport width under 640px
        return BASE_GLOBE_RADIUS * (dimensions.width / MOBILE_BREAKPOINT);
    }, [dimensions.width]);

    const gridLines = useMemo(() => {
        const lines = [];
        for (let lng = 0; lng < 360; lng += 20) {
            const points = [];
            for (let lat = -90; lat <= 90; lat += 10) {
                points.push(toCartesian(lat, lng, globeRadius));
            }
            lines.push(points);
        }
        for (let lat = -80; lat <= 80; lat += 20) {
            const points = [];
            for (let lng = 0; lng <= 360; lng += 10) {
                points.push(toCartesian(lat, lng, globeRadius));
            }
            lines.push(points);
        }
        return lines;
    }, [globeRadius]);

    // Core is at 0,0,0
    const corePos = project({ x: 0, y: 0, z: 0 }, rotation, dimensions.width, dimensions.height, globeRadius);

    // Project poles
    const northPole3d = toCartesian(NORTH_POLE.lat, NORTH_POLE.lng, globeRadius);
    const southPole3d = toCartesian(SOUTH_POLE.lat, SOUTH_POLE.lng, globeRadius);
    const northPole2d = project(northPole3d, rotation, dimensions.width, dimensions.height, globeRadius);
    const southPole2d = project(southPole3d, rotation, dimensions.width, dimensions.height, globeRadius);

    // Separate nodes by hemisphere
    const northNodes = modules.filter(m => m.lat > 0);
    const southNodes = modules.filter(m => m.lat < 0);

    // Don't render dynamic content until mounted to avoid hydration mismatch
    if (!mounted) {
        return <div ref={containerRef} className={styles.container} />;
    }

    return (
        <div ref={containerRef} className={styles.container}>
            <svg className={styles.globeSvg}>
                <defs>
                    <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--fg-tertiary)" stopOpacity="0.15" />
                        <stop offset="50%" stopColor="var(--fg-tertiary)" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="var(--fg-tertiary)" stopOpacity="0.15" />
                    </linearGradient>

                    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="var(--globe-core-inner)" stopOpacity="0.5" />
                        <stop offset="40%" stopColor="var(--globe-core-inner)" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="var(--globe-core-inner)" stopOpacity="0" />
                    </radialGradient>

                    <radialGradient id="poleGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="var(--globe-node)" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="var(--globe-node)" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="var(--globe-node)" stopOpacity="0" />
                    </radialGradient>

                    <radialGradient id="nodeBackdrop" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="var(--globe-node)" stopOpacity="0.12" />
                        <stop offset="70%" stopColor="var(--globe-node)" stopOpacity="0.04" />
                        <stop offset="100%" stopColor="var(--globe-node)" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Grid */}
                {gridLines.map((line, i) => {
                    const pathData = line.map((pt, j) => {
                        const p2d = project(pt, rotation, dimensions.width, dimensions.height, globeRadius);
                        return `${j === 0 ? 'M' : 'L'} ${p2d.x} ${p2d.y}`;
                    }).join(' ');

                    return (
                        <path
                            key={i}
                            d={pathData}
                            fill="none"
                            stroke="url(#gridGradient)"
                            strokeWidth={0.5}
                        />
                    );
                })}

                {/* North Pole */}
                <g transform={`translate(${northPole2d.x}, ${northPole2d.y})`} opacity={northPole2d.opacity}>
                    <circle r={10} fill="url(#poleGlow)" opacity={0.4} />
                    <circle r={2} fill="var(--globe-node)" opacity={0.6} />
                </g>

                {/* South Pole */}
                <g transform={`translate(${southPole2d.x}, ${southPole2d.y})`} opacity={southPole2d.opacity}>
                    <circle r={10} fill="url(#poleGlow)" opacity={0.4} />
                    <circle r={2} fill="var(--globe-node)" opacity={0.6} />
                </g>

                {/* North Pole Connections */}
                {northNodes.map((module, nodeIndex) => {
                    const pt3d = toCartesian(module.lat, module.lng, globeRadius);
                    const pt2d = project(pt3d, rotation, dimensions.width, dimensions.height, globeRadius);

                    // Generate path points along meridian to north pole
                    const pathPoints: Array<{ lat: number; lng: number }> = [];
                    const numPathPoints = 40;
                    for (let i = 0; i <= numPathPoints; i++) {
                        pathPoints.push(interpolateTowardsPole(module.lat, module.lng, 90, i / numPathPoints));
                    }

                    const pathData = pathPoints.map((pt, j) => {
                        const p3d = toCartesian(pt.lat, pt.lng, globeRadius);
                        const p2d = project(p3d, rotation, dimensions.width, dimensions.height, globeRadius);
                        return `${j === 0 ? 'M' : 'L'} ${p2d.x} ${p2d.y}`;
                    }).join(' ');

                    const avgOpacity = (pt2d.opacity + northPole2d.opacity) / 2;

                    return (
                        <g key={`north-${module.name}`} opacity={avgOpacity * 0.7}>
                            {/* Connection line to pole - very subtle */}
                            <path
                                d={pathData}
                                fill="none"
                                stroke="var(--globe-line)"
                                strokeWidth={0.3}
                            />

                            {/* Light beam flowing TO pole */}
                            {Array.from({ length: BEAMS_PER_CONNECTION }).map((_, beamIdx) => {
                                const offset = beamIdx / BEAMS_PER_CONNECTION;
                                const headProgress = ((flowTime / POLE_FLOW_DURATION) + offset + nodeIndex * 0.25) % 1;

                                const beam = generateBeamPath(
                                    module.lat, module.lng, 90,
                                    headProgress, rotation,
                                    dimensions.width, dimensions.height,
                                    globeRadius, false
                                );

                                if (!beam || !beam.visible) return null;

                                const gradientId = `north-out-grad-${nodeIndex}-${beamIdx}`;
                                const journeyFade = Math.sin(headProgress * Math.PI);

                                return (
                                    <g key={`north-out-${nodeIndex}-${beamIdx}`}>
                                        <defs>
                                            <linearGradient
                                                id={gradientId}
                                                gradientUnits="userSpaceOnUse"
                                                x1={beam.tailPos.x}
                                                y1={beam.tailPos.y}
                                                x2={beam.headPos.x}
                                                y2={beam.headPos.y}
                                            >
                                                <stop offset="0%" stopColor="var(--globe-beam)" stopOpacity="0" />
                                                <stop offset="60%" stopColor="var(--globe-beam)" stopOpacity="0.5" />
                                                <stop offset="100%" stopColor="var(--globe-beam)" stopOpacity="0.9" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d={beam.pathData}
                                            fill="none"
                                            stroke={`url(#${gradientId})`}
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            opacity={journeyFade * avgOpacity * 0.85}
                                        />
                                    </g>
                                );
                            })}

                            {/* Light beam flowing FROM pole - offset timing */}
                            {Array.from({ length: BEAMS_PER_CONNECTION }).map((_, beamIdx) => {
                                const offset = beamIdx / BEAMS_PER_CONNECTION;
                                const headProgress = ((flowTime / POLE_FLOW_DURATION) + offset + nodeIndex * 0.25 + 0.5) % 1;

                                const beam = generateBeamPath(
                                    module.lat, module.lng, 90,
                                    headProgress, rotation,
                                    dimensions.width, dimensions.height,
                                    globeRadius, true
                                );

                                if (!beam || !beam.visible) return null;

                                const gradientId = `north-in-grad-${nodeIndex}-${beamIdx}`;
                                const journeyFade = Math.sin(headProgress * Math.PI);

                                return (
                                    <g key={`north-in-${nodeIndex}-${beamIdx}`}>
                                        <defs>
                                            <linearGradient
                                                id={gradientId}
                                                gradientUnits="userSpaceOnUse"
                                                x1={beam.tailPos.x}
                                                y1={beam.tailPos.y}
                                                x2={beam.headPos.x}
                                                y2={beam.headPos.y}
                                            >
                                                <stop offset="0%" stopColor="var(--globe-beam)" stopOpacity="0" />
                                                <stop offset="60%" stopColor="var(--globe-beam)" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="var(--globe-beam)" stopOpacity="0.8" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d={beam.pathData}
                                            fill="none"
                                            stroke={`url(#${gradientId})`}
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            opacity={journeyFade * avgOpacity * 0.8}
                                        />
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}

                {/* South Pole Connections */}
                {southNodes.map((module, nodeIndex) => {
                    const pt3d = toCartesian(module.lat, module.lng, globeRadius);
                    const pt2d = project(pt3d, rotation, dimensions.width, dimensions.height, globeRadius);

                    // Generate path points along meridian to south pole
                    const pathPoints: Array<{ lat: number; lng: number }> = [];
                    const numPathPoints = 40;
                    for (let i = 0; i <= numPathPoints; i++) {
                        pathPoints.push(interpolateTowardsPole(module.lat, module.lng, -90, i / numPathPoints));
                    }

                    const pathData = pathPoints.map((pt, j) => {
                        const p3d = toCartesian(pt.lat, pt.lng, globeRadius);
                        const p2d = project(p3d, rotation, dimensions.width, dimensions.height, globeRadius);
                        return `${j === 0 ? 'M' : 'L'} ${p2d.x} ${p2d.y}`;
                    }).join(' ');

                    const avgOpacity = (pt2d.opacity + southPole2d.opacity) / 2;

                    return (
                        <g key={`south-${module.name}`} opacity={avgOpacity * 0.7}>
                            {/* Connection line to pole - very subtle */}
                            <path
                                d={pathData}
                                fill="none"
                                stroke="var(--globe-line)"
                                strokeWidth={0.3}
                            />

                            {/* Light beam flowing TO pole */}
                            {Array.from({ length: BEAMS_PER_CONNECTION }).map((_, beamIdx) => {
                                const offset = beamIdx / BEAMS_PER_CONNECTION;
                                const headProgress = ((flowTime / POLE_FLOW_DURATION) + offset + nodeIndex * 0.3) % 1;

                                const beam = generateBeamPath(
                                    module.lat, module.lng, -90,
                                    headProgress, rotation,
                                    dimensions.width, dimensions.height,
                                    globeRadius, false
                                );

                                if (!beam || !beam.visible) return null;

                                const gradientId = `south-out-grad-${nodeIndex}-${beamIdx}`;
                                const journeyFade = Math.sin(headProgress * Math.PI);

                                return (
                                    <g key={`south-out-${nodeIndex}-${beamIdx}`}>
                                        <defs>
                                            <linearGradient
                                                id={gradientId}
                                                gradientUnits="userSpaceOnUse"
                                                x1={beam.tailPos.x}
                                                y1={beam.tailPos.y}
                                                x2={beam.headPos.x}
                                                y2={beam.headPos.y}
                                            >
                                                <stop offset="0%" stopColor="var(--globe-beam)" stopOpacity="0" />
                                                <stop offset="60%" stopColor="var(--globe-beam)" stopOpacity="0.5" />
                                                <stop offset="100%" stopColor="var(--globe-beam)" stopOpacity="0.9" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d={beam.pathData}
                                            fill="none"
                                            stroke={`url(#${gradientId})`}
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            opacity={journeyFade * avgOpacity * 0.85}
                                        />
                                    </g>
                                );
                            })}

                            {/* Light beam flowing FROM pole - offset timing */}
                            {Array.from({ length: BEAMS_PER_CONNECTION }).map((_, beamIdx) => {
                                const offset = beamIdx / BEAMS_PER_CONNECTION;
                                const headProgress = ((flowTime / POLE_FLOW_DURATION) + offset + nodeIndex * 0.3 + 0.5) % 1;

                                const beam = generateBeamPath(
                                    module.lat, module.lng, -90,
                                    headProgress, rotation,
                                    dimensions.width, dimensions.height,
                                    globeRadius, true
                                );

                                if (!beam || !beam.visible) return null;

                                const gradientId = `south-in-grad-${nodeIndex}-${beamIdx}`;
                                const journeyFade = Math.sin(headProgress * Math.PI);

                                return (
                                    <g key={`south-in-${nodeIndex}-${beamIdx}`}>
                                        <defs>
                                            <linearGradient
                                                id={gradientId}
                                                gradientUnits="userSpaceOnUse"
                                                x1={beam.tailPos.x}
                                                y1={beam.tailPos.y}
                                                x2={beam.headPos.x}
                                                y2={beam.headPos.y}
                                            >
                                                <stop offset="0%" stopColor="var(--globe-beam)" stopOpacity="0" />
                                                <stop offset="60%" stopColor="var(--globe-beam)" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="var(--globe-beam)" stopOpacity="0.8" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d={beam.pathData}
                                            fill="none"
                                            stroke={`url(#${gradientId})`}
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                            opacity={journeyFade * avgOpacity * 0.8}
                                        />
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}

                {/* Core Node (Center) */}
                <g transform={`translate(${corePos.x}, ${corePos.y})`}>
                    {/* Ambient Glow - rendered first (behind) */}
                    <circle r={40} fill="url(#coreGlow)" opacity={0.5} />
                    {/* Outer Rotating Ring */}
                    <motion.circle
                        r={18}
                        fill="none"
                        stroke="var(--fg-primary)"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        opacity={0.5}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    />
                    {/* Inner Rotating Ring (Counter) */}
                    <motion.circle
                        r={12}
                        fill="none"
                        stroke="var(--globe-node)"
                        strokeWidth={1.5}
                        strokeDasharray="10 10"
                        opacity={0.6}
                        animate={{ rotate: -360 }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    />
                    {/* Inner Core */}
                    <circle r={6} fill="var(--globe-core-inner)" />
                </g>

                {/* Modules & Radiating Connections */}
                {modules.map((module, i) => {
                    const pt3d = toCartesian(module.lat, module.lng, globeRadius);
                    const pt2d = project(pt3d, rotation, dimensions.width, dimensions.height, globeRadius);

                    // Connection from Center Core to Surface Node
                    const connectionPath = `M ${corePos.x} ${corePos.y} L ${pt2d.x} ${pt2d.y}`;
                    const isHovered = hoveredModule === module.name;

                    // Determine opacity based on Z-index (fade if behind core/globe)
                    const opacity = Math.max(0.3, pt2d.opacity);

                    // Calculate logo transform - scale factor to fit path in LOGO_SIZE
                    const logoScale = (LOGO_SIZE / 24) * pt2d.scale;
                    const nodeRadius = 16 * pt2d.scale;

                    return (
                        <g key={module.name} style={{ opacity }}>
                            {/* Beam - Interactive */}
                            <path
                                d={connectionPath}
                                stroke="var(--fg-primary)"
                                strokeWidth={isHovered ? 1.5 : 0.5}
                                opacity={isHovered ? 0.5 : 0.15}
                                fill="none"
                                style={{ transition: 'stroke-width 0.3s ease, opacity 0.3s ease' }}
                            />

                            {/* Particle (Energy Pulse) */}
                            <motion.circle
                                r={isHovered ? 3.5 : 2.5}
                                fill="var(--globe-node)"
                                initial={{ opacity: 0 }}
                                animate={{
                                    opacity: [0, 0.9, 0],
                                    offsetDistance: ["0%", "100%"]
                                }}
                                style={{ offsetPath: `path("${connectionPath}")` }}
                                transition={{
                                    duration: isHovered ? 1 : 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                    ease: "easeInOut"
                                }}
                            />

                            {/* Surface Node with Logo */}
                            <g
                                transform={`translate(${pt2d.x}, ${pt2d.y})`}
                                onMouseEnter={() => setHoveredModule(module.name)}
                                onMouseLeave={() => setHoveredModule(null)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Outer ring - subtle border */}
                                <circle
                                    r={nodeRadius}
                                    fill="none"
                                    stroke="var(--globe-ring)"
                                    strokeWidth={1 * pt2d.scale}
                                />

                                {/* Background gradient */}
                                <circle
                                    r={nodeRadius - 1}
                                    fill="url(#nodeBackdrop)"
                                />

                                {/* Logo - centered */}
                                <g transform={`translate(${-LOGO_SIZE * pt2d.scale / 2}, ${-LOGO_SIZE * pt2d.scale / 2}) scale(${logoScale})`}>
                                    <path
                                        d={LOGO_PATHS[module.name]}
                                        fill="var(--globe-node)"
                                        opacity={0.9}
                                    />
                                </g>

                                {/* Hover ripple effect */}
                                {isHovered && (
                                    <motion.circle
                                        r={nodeRadius}
                                        fill="none"
                                        stroke="var(--globe-node)"
                                        strokeWidth={1 * pt2d.scale}
                                        initial={{ scale: 0.8, opacity: 0.6 }}
                                        animate={{ scale: 1.4, opacity: 0 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
                                    />
                                )}
                            </g>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
