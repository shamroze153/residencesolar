import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AssetInfo, LayerKey, ViewPreset } from '../types';

interface TerraceViewerProps {
  layers: Record<LayerKey, boolean>;
  showText?: boolean;
  timeOfDay?: number;
  showSunArc?: boolean;
  showColumnPlan?: boolean;
  columnFocusMode?: boolean;
  activeView: ViewPreset | null;
  onSelectAsset: (asset: AssetInfo | null) => void;
  selectedAssetCode: string | null;
  onTimeChange?: (time: number) => void;
}

export const TerraceViewer: React.FC<TerraceViewerProps> = ({
  layers,
  showText = true,
  timeOfDay = 12.0,
  showSunArc = true,
  showColumnPlan = true,
  columnFocusMode = false,
  activeView,
  onSelectAsset,
  selectedAssetCode,
  onTimeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // References for three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const layersGroupRef = useRef<Record<string, THREE.Group>>({});
  const pickableRef = useRef<THREE.Mesh[]>([]);
  const selectedMeshRef = useRef<THREE.Mesh | null>(null);
  const selectedOriginalMatRef = useRef<THREE.Material | THREE.Material[] | null>(null);

  // Dynamic Sun & Sky refs
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const sunMeshRef = useRef<THREE.Group | null>(null);
  const sunArcGroupRef = useRef<THREE.Group | null>(null);

  // Camera animation targets for smooth preset transitions
  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3(13, 14, 18));
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.9, 0));
  const isPresetAnimating = useRef<boolean>(false);

  // View preset handler
  useEffect(() => {
    if (!activeView) return;
    const FT = 0.3048;
    const D38 = 38 * FT;
    const HZ = D38 / 2;
    const GATE = { x: -3.2, w: 1.25 };

    const VIEWS: Record<ViewPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
      iso: { pos: [13, 14, 18], target: [0, 0.9, 0] },
      plan: { pos: [0, 26, 0.1], target: [0, 0, 0] },
      entry: { pos: [GATE.x, 2.0, HZ + 5.5], target: [GATE.x, 1.2, HZ - 1.5] },
    };

    const v = VIEWS[activeView];
    if (v && cameraRef.current && controlsRef.current) {
      targetCamPos.current.set(...v.pos);
      targetLookAt.current.set(...v.target);
      isPresetAnimating.current = true;
    }
  }, [activeView]);

  // Layer & 3D Text/Labels visibility update
  useEffect(() => {
    Object.keys(layers).forEach((key) => {
      const group = layersGroupRef.current[key];
      if (group) {
        if (columnFocusMode) {
          // Boss Column Focus Mode: show struct & colplan ONLY
          if (key === 'struct') {
            group.visible = true;
          } else {
            group.visible = false;
          }
        } else if (key === 'dims') {
          group.visible = showText && layers.dims;
        } else {
          group.visible = layers[key as LayerKey];
        }
      }
    });

    if (layersGroupRef.current['hvac']) {
      layersGroupRef.current['hvac'].visible = !columnFocusMode && layers.hvac;
    }
    if (layersGroupRef.current['util']) {
      layersGroupRef.current['util'].visible = !columnFocusMode && layers.util;
    }
    if (layersGroupRef.current['context']) {
      layersGroupRef.current['context'].visible = !columnFocusMode && layers.context;
    }
    if (layersGroupRef.current['solar']) {
      layersGroupRef.current['solar'].visible = !columnFocusMode && layers.solar;
    }
    if (layersGroupRef.current['base']) {
      layersGroupRef.current['base'].visible = !columnFocusMode;
    }
    if (layersGroupRef.current['labels']) {
      layersGroupRef.current['labels'].visible = showText && !columnFocusMode;
    }

    if (layersGroupRef.current['colplan']) {
      layersGroupRef.current['colplan'].visible = showColumnPlan || activeView === 'plan' || columnFocusMode;
    }
  }, [layers, showText, showColumnPlan, activeView, columnFocusMode]);

  // Dynamic Sun Path & Shadow Position Update Effect
  useEffect(() => {
    if (!sunLightRef.current || !sunMeshRef.current) return;

    const t = timeOfDay ?? 12.0;
    const norm = Math.max(0, Math.min(1, (t - 6.0) / 12.0));
    const angleRad = Math.PI * norm;
    const elevation = Math.sin(angleRad);

    const y = 2.5 + elevation * 30.0;
    const x = 35.0 * Math.cos(angleRad);
    const z = -10.0 + 26.0 * Math.sin(angleRad);

    // Position sun light & visual 3D sun sphere
    sunLightRef.current.position.set(x, y, z);
    sunMeshRef.current.position.set(x, y, z);

    // Calculate light color and intensity transitions based on time of day
    const sunColor = new THREE.Color();
    const hemiSky = new THREE.Color();
    let intensity = 1.0;

    if (t < 7.5) {
      // Sunrise / Dawn (6.0 - 7.5)
      const factor = Math.max(0, (t - 6.0) / 1.5);
      sunColor.lerpColors(new THREE.Color(0xff5511), new THREE.Color(0xffaa33), factor);
      hemiSky.lerpColors(new THREE.Color(0x3a2e42), new THREE.Color(0x8fa8cd), factor);
      intensity = 0.65 + factor * 0.35;
    } else if (t < 11.5) {
      // Morning (7.5 - 11.5)
      const factor = (t - 7.5) / 4.0;
      sunColor.lerpColors(new THREE.Color(0xffaa33), new THREE.Color(0xffffff), factor);
      hemiSky.lerpColors(new THREE.Color(0x8fa8cd), new THREE.Color(0xdae6f4), factor);
      intensity = 1.0 + factor * 0.25;
    } else if (t < 13.5) {
      // Solar Noon (11.5 - 13.5)
      sunColor.setHex(0xffffff);
      hemiSky.setHex(0xebf3fc);
      intensity = 1.25;
    } else if (t < 16.5) {
      // Afternoon (13.5 - 16.5)
      const factor = (t - 13.5) / 3.0;
      sunColor.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0xffc866), factor);
      hemiSky.lerpColors(new THREE.Color(0xebf3fc), new THREE.Color(0xdae6f4), factor);
      intensity = 1.25 - factor * 0.25;
    } else {
      // Sunset / Dusk (16.5 - 18.5)
      const factor = Math.min(1, (t - 16.5) / 2.0);
      sunColor.lerpColors(new THREE.Color(0xffc866), new THREE.Color(0xff3300), factor);
      hemiSky.lerpColors(new THREE.Color(0xdae6f4), new THREE.Color(0x2d1f38), factor);
      intensity = 1.0 - factor * 0.55;
    }

    sunLightRef.current.color.copy(sunColor);
    sunLightRef.current.intensity = intensity;

    if (hemiLightRef.current) {
      hemiLightRef.current.color.copy(hemiSky);
    }

    if (sunArcGroupRef.current) {
      sunArcGroupRef.current.visible = showSunArc;
    }
  }, [timeOfDay, showSunArc]);

  // Main Three.js Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const FT = 0.3048;
    const W45 = 45 * FT; // 45 ft front (13.716m)
    const D38 = 38 * FT; // 38 ft sides (11.5824m)
    const S6 = 6 * FT;   // 6 ft side strip (1.8288m)
    const S6R = 3 * FT;  // 3 ft right strip
    const S3 = 3 * FT;   // 3 ft front strip
    const HX = W45 / 2;  // 6.858m
    const HZ = D38 / 2;  // 5.7912m
    const PARH = 1.15;
    const PART = 0.23;
    const GATE = { x: -3.2, w: 1.25 };

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.08, 700);
    camera.position.set(13, 14, 18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Orbit Controls Setup for natural, smooth 3D navigation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 2.5;
    controls.maxDistance = 110;
    controls.maxPolarAngle = Math.PI / 2 - 0.01; // Stay above ground level
    controls.target.set(0, 0.9, 0);
    controls.update();
    controlsRef.current = controls;

    // Ambient & Directional Lighting
    const hemiLight = new THREE.HemisphereLight(0xdae6f4, 0x6d6a63, 1.1);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sun = new THREE.DirectionalLight(0xfff3e0, 0.95);
    sun.position.set(13, 26, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.near = 1; sc.far = 120; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22;
    sun.shadow.bias = -0.0006; sun.shadow.radius = 2;
    scene.add(sun);
    sunLightRef.current = sun;

    const fill = new THREE.DirectionalLight(0xc4d4e6, 0.35);
    fill.position.set(-16, 10, -18);
    scene.add(fill);

    // Helper to generate textures
    function cvs(w: number, h?: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
      const c = document.createElement('canvas');
      c.width = w; c.height = h || w;
      return [c, c.getContext('2d')!];
    }

    function skyTex() {
      const [c, g] = cvs(64, 512);
      const grd = g.createLinearGradient(0, 0, 0, 512);
      grd.addColorStop(0.00, '#8fa4bb');
      grd.addColorStop(0.38, '#b9c4cf');
      grd.addColorStop(0.62, '#d3d8dc');
      grd.addColorStop(0.85, '#c4c8c9');
      grd.addColorStop(1.00, '#9aa0a2');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 512);
      return new THREE.CanvasTexture(c);
    }

    function tileTex() {
      const [c, g] = cvs(512);
      g.fillStyle = '#b0a99c'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const v = 203 + Math.random() * 24;
        g.fillStyle = 'rgb(' + (v | 0) + ',' + ((v - 3) | 0) + ',' + ((v - 15) | 0) + ')';
        g.fillRect(i * 128 + 2.5, j * 128 + 2.5, 123, 123);
        for (let n = 0; n < 48; n++) {
          g.fillStyle = 'rgba(146,139,126,' + (Math.random() * 0.17) + ')';
          g.beginPath();
          g.arc(i * 128 + 8 + Math.random() * 112, j * 128 + 8 + Math.random() * 112, 2 + Math.random() * 10, 0, 6.3);
          g.fill();
        }
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(W45 / 2.4, D38 / 2.4);
      return t;
    }

    function screedTex() {
      const [c, g] = cvs(256);
      g.fillStyle = '#9d9a92'; g.fillRect(0, 0, 256, 256);
      for (let n = 0; n < 900; n++) {
        g.fillStyle = 'rgba(120,116,106,' + (Math.random() * 0.22) + ')';
        g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 7, 0, 6.3); g.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(S6 / 1.2, D38 / 1.2);
      return t;
    }

    function washTex(hex: string, strength: number, rep?: number) {
      const [c, g] = cvs(256);
      g.fillStyle = hex; g.fillRect(0, 0, 256, 256);
      for (let n = 0; n < 240; n++) {
        g.fillStyle = 'rgba(96,92,80,' + (Math.random() * strength) + ')';
        g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 10 + Math.random() * 62);
      }
      for (let n = 0; n < 140; n++) {
        g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.06) + ')';
        g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 22, 0, 6.3); g.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      if (rep) t.repeat.set(rep, 1);
      return t;
    }

    function fanTex() {
      const [c, g] = cvs(256);
      g.clearRect(0, 0, 256, 256);
      g.strokeStyle = '#3a4048'; g.lineCap = 'round'; g.lineWidth = 6;
      for (let r = 26; r <= 118; r += 15) { g.beginPath(); g.arc(128, 128, r, 0, 6.3); g.stroke(); }
      g.lineWidth = 7;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        g.beginPath();
        g.moveTo(128 - Math.cos(a) * 120, 128 - Math.sin(a) * 120);
        g.lineTo(128 + Math.cos(a) * 120, 128 + Math.sin(a) * 120);
        g.stroke();
      }
      g.lineWidth = 11; g.strokeStyle = '#2d333a';
      g.beginPath(); g.arc(128, 128, 124, 0, 6.3); g.stroke();
      g.fillStyle = '#20252b'; g.beginPath(); g.arc(128, 128, 20, 0, 6.3); g.fill();
      return new THREE.CanvasTexture(c);
    }

    function finTex() {
      const [c, g] = cvs(128);
      g.fillStyle = '#aeb3b8'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#7d848c'; g.lineWidth = 1.4;
      for (let y = 2; y < 128; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
      g.strokeStyle = 'rgba(90,96,103,0.35)'; g.lineWidth = 1;
      for (let x = 6; x < 128; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    }

    function meshTex() {
      const [c, g] = cvs(128);
      g.clearRect(0, 0, 128, 128);
      g.strokeStyle = '#1b1d20'; g.lineWidth = 3.0;
      for (let i = 0; i <= 8; i++) {
        g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, 128); g.stroke();
        g.beginPath(); g.moveTo(0, i * 16); g.lineTo(128, i * 16); g.stroke();
      }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    }

    function pvTex() {
      const [c, g] = cvs(256);
      g.fillStyle = '#0f1c36'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 12; j++) {
        const grd = g.createLinearGradient(i * 42, j * 21, i * 42 + 40, j * 21 + 19);
        grd.addColorStop(0, '#20356a'); grd.addColorStop(1, '#0e2144');
        g.fillStyle = grd; g.fillRect(i * 42 + 2, j * 21 + 1, 38, 18);
      }
      g.strokeStyle = 'rgba(185,203,228,0.42)'; g.lineWidth = 1;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(i * 42 + 21, 0); g.lineTo(i * 42 + 21, 256); g.stroke(); }
      return new THREE.CanvasTexture(c);
    }

    function walkwayTex() {
      const [c, g] = cvs(256);
      // Sleek black anti-slip metal mesh background
      g.fillStyle = '#181b22'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#2e3540'; g.lineWidth = 3;
      for (let i = -256; i <= 512; i += 24) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
        g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke();
      }
      // Subtle yellow safety anti-slip border strips
      g.fillStyle = '#ffb020';
      g.fillRect(0, 0, 12, 256);
      g.fillRect(244, 0, 12, 256);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1, 12);
      return t;
    }

    function teslaGeyserTex() {
      const [c, g] = cvs(256, 512);
      // Dark charcoal Tesla casing
      g.fillStyle = '#1c2026'; g.fillRect(0, 0, 256, 512);
      g.strokeStyle = '#323a45'; g.lineWidth = 4;
      g.strokeRect(6, 6, 244, 500);

      // Top header band with TESLA wordmark logo
      g.fillStyle = '#111419'; g.fillRect(12, 16, 232, 68);
      g.fillStyle = '#ffffff'; g.font = 'bold 36px ui-sans-serif, system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('TESLA', 128, 62);

      // Vertical LED status indicator strip
      g.fillStyle = '#0f1216'; g.fillRect(120, 100, 16, 360);
      g.fillStyle = '#ff2a3b'; g.fillRect(124, 110, 8, 340); // Glowing status line

      // Subtle metallic highlights on casing
      g.fillStyle = 'rgba(255, 255, 255, 0.06)';
      g.fillRect(16, 100, 96, 360);
      return new THREE.CanvasTexture(c);
    }

    // Material Map
    const MESH_T = meshTex(), FAN_T = fanTex(), FIN_T = finTex(), WALK_T = walkwayTex(), TESLA_T = teslaGeyserTex();
    const M = {
      floor: new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.87 }),
      screed: new THREE.MeshStandardMaterial({ map: screedTex(), roughness: 0.95 }),
      slab: new THREE.MeshStandardMaterial({ color: 0xa8a294, roughness: 0.94 }),
      parap: new THREE.MeshStandardMaterial({ map: washTex('#aebbbb', 0.10, 3), roughness: 0.93 }),
      coping: new THREE.MeshStandardMaterial({ map: washTex('#d7d1c2', 0.07, 4), roughness: 0.92 }),
      cream: new THREE.MeshStandardMaterial({ map: washTex('#ddd8ca', 0.08, 2), roughness: 0.91 }),
      white: new THREE.MeshStandardMaterial({ map: washTex('#e6e2d8', 0.05, 2), roughness: 0.90 }),
      rust: new THREE.MeshStandardMaterial({ color: 0x8d5a3f, roughness: 0.84, metalness: 0.22 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x6e7885, roughness: 0.42, metalness: 0.78 }),
      galvGirder: new THREE.MeshStandardMaterial({ color: 0x9faab8, roughness: 0.35, metalness: 0.85 }),
      walkwayMat: new THREE.MeshStandardMaterial({ map: WALK_T, roughness: 0.35, metalness: 0.80 }),
      teslaMat: new THREE.MeshStandardMaterial({ map: TESLA_T, roughness: 0.35, metalness: 0.65 }),
      steelD: new THREE.MeshStandardMaterial({ color: 0x48505c, roughness: 0.50, metalness: 0.75 }),
      blackS: new THREE.MeshStandardMaterial({ color: 0x1e2126, roughness: 0.6, metalness: 0.5 }),
      netM: new THREE.MeshStandardMaterial({ map: MESH_T, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.4, color: 0x2a2d31 }),
      pv: new THREE.MeshStandardMaterial({ map: pvTex(), roughness: 0.12, metalness: 0.45 }),
      pvBack: new THREE.MeshStandardMaterial({ color: 0x1a212c, roughness: 0.75 }),
      frame: new THREE.MeshStandardMaterial({ color: 0xc2cbd6, roughness: 0.30, metalness: 0.90 }),
      acW: new THREE.MeshStandardMaterial({ color: 0xeceeef, roughness: 0.42, metalness: 0.18 }),
      acG: new THREE.MeshStandardMaterial({ color: 0xc9cbc6, roughness: 0.66, metalness: 0.14 }),
      fin: new THREE.MeshStandardMaterial({ map: FIN_T, roughness: 0.62, metalness: 0.55 }),
      fan: new THREE.MeshStandardMaterial({ map: FAN_T, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.4 }),
      recess: new THREE.MeshStandardMaterial({ color: 0x1a1e23, roughness: 0.9 }),
      tarp: new THREE.MeshStandardMaterial({ color: 0x2f6bb0, roughness: 0.9, side: THREE.DoubleSide }),
      tarpD: new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.95, side: THREE.DoubleSide }),
      wood: new THREE.MeshStandardMaterial({ color: 0x9c8163, roughness: 0.94 }),
      pipe: new THREE.MeshStandardMaterial({ color: 0xc6cace, roughness: 0.5, metalness: 0.3 }),
      pipeI: new THREE.MeshStandardMaterial({ color: 0x2b2f34, roughness: 0.9 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 1 }),
      ctx: new THREE.MeshStandardMaterial({ color: 0x9aa2ac, roughness: 0.95 }),
      ctxD: new THREE.MeshStandardMaterial({ color: 0x7d8792, roughness: 0.95 }),
      block: new THREE.MeshStandardMaterial({ color: 0x98a0a8, roughness: 0.9 }),
      amber: new THREE.MeshBasicMaterial({ color: 0xffb020 })
    };

    // Sun Visual Group (Core glowing sphere + Outer Corona Glow)
    const sunGroup = new THREE.Group();
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff5cc, fog: false })
    );
    sunGroup.add(sunCore);

    const sunGlowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.38, fog: false })
    );
    sunGroup.add(sunGlowMesh);
    scene.add(sunGroup);
    sunMeshRef.current = sunGroup;

    // 3D Sun Path Arc Trajectory Line
    const sunArcGroup = new THREE.Group();
    const arcPts: THREE.Vector3[] = [];
    for (let t = 6.0; t <= 18.0; t += 0.2) {
      const norm = (t - 6.0) / 12.0;
      const angleRad = Math.PI * norm;
      const elevation = Math.sin(angleRad);
      const y = 2.5 + elevation * 30.0;
      const x = 35.0 * Math.cos(angleRad);
      const z = -10.0 + 26.0 * Math.sin(angleRad);
      arcPts.push(new THREE.Vector3(x, y, z));
    }
    const arcCurve = new THREE.CatmullRomCurve3(arcPts);
    const tubeGeo = new THREE.TubeGeometry(arcCurve, 64, 0.12, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.65, fog: false });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    sunArcGroup.add(tubeMesh);

    // Hour Markers along the 3D Sun Arc
    const hourMarkers = [
      { hour: 6.0, label: '6 AM' },
      { hour: 9.0, label: '9 AM' },
      { hour: 12.0, label: '12 PM' },
      { hour: 15.0, label: '3 PM' },
      { hour: 18.0, label: '6 PM' },
    ];

    hourMarkers.forEach(({ hour }) => {
      const norm = (hour - 6.0) / 12.0;
      const angleRad = Math.PI * norm;
      const elevation = Math.sin(angleRad);
      const y = 2.5 + elevation * 30.0;
      const x = 35.0 * Math.cos(angleRad);
      const z = -10.0 + 26.0 * Math.sin(angleRad);

      const mGeo = new THREE.SphereGeometry(0.55, 16, 16);
      const mMat = new THREE.MeshBasicMaterial({ color: 0xffca28, fog: false });
      const mMesh = new THREE.Mesh(mGeo, mMat);
      mMesh.position.set(x, y, z);
      mMesh.userData.hour = hour;
      sunArcGroup.add(mMesh);
    });

    scene.add(sunArcGroup);
    sunArcGroupRef.current = sunArcGroup;

    // Sky Dome
    const skyGeo = new THREE.SphereGeometry(320, 32, 20);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false });
    scene.add(new THREE.Mesh(skyGeo, skyMat));
    scene.fog = new THREE.Fog(0xc2c9cf, 70, 260);

    // Layer groups setup
    const LGroup: Record<string, THREE.Group> = {
      hvac: new THREE.Group(),
      solar: new THREE.Group(),
      struct: new THREE.Group(),
      util: new THREE.Group(),
      context: new THREE.Group(),
      dims: new THREE.Group(),
      colplan: new THREE.Group(),
      labels: new THREE.Group(),
      base: new THREE.Group()
    };
    const GLabels = LGroup.labels;
    GLabels.visible = showText;
    if (LGroup.colplan) {
      LGroup.colplan.visible = showColumnPlan || activeView === 'plan';
    }
    layersGroupRef.current = LGroup;

    Object.keys(LGroup).forEach((k) => {
      scene.add(LGroup[k]);
      if (k in layers) {
        LGroup[k].visible = layers[k as LayerKey];
      }
    });

    const pickable: THREE.Mesh[] = [];
    pickableRef.current = pickable;

    function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, G?: THREE.Group, asset?: AssetInfo | null) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true;
      (G || LGroup.base).add(m);
      if (asset) { m.userData.asset = asset; pickable.push(m); }
      return m;
    }

    function cyl(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, G?: THREE.Group, seg?: number) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 18), mat);
      m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true;
      (G || LGroup.base).add(m); return m;
    }

    function net(w: number, h: number, x: number, y: number, z: number, rotY?: number, G?: THREE.Group) {
      const t = MESH_T.clone(); t.needsUpdate = true;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(Math.max(1, w / 0.48), Math.max(1, h / 0.48));
      const mat = M.netM.clone(); mat.map = t;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y + h / 2, z); m.rotation.y = rotY || 0;
      (G || LGroup.base).add(m); return m;
    }

    // Split AC Condenser Builder
    let acCount = 0;
    function condenser(o: { x: number; z: number; y?: number; rot?: number; big?: boolean; aged?: boolean; mount?: string }) {
      acCount++;
      const G = LGroup.hvac;
      const s = o.big ? 1.15 : 1.0;
      const w = 0.92 * s, h = 0.70 * s, d = 0.35 * s;
      const mat = o.aged ? M.acG : M.acW;
      const g = new THREE.Group();
      g.position.set(o.x, o.y || 0, o.z);
      g.rotation.y = o.rot || 0;
      G.add(g);

      // Main body
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      body.position.y = h / 2 + 0.05; body.castShadow = true; body.receiveShadow = true; g.add(body);

      // Top cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.035, d + 0.03), mat);
      cap.position.y = h + 0.06; cap.castShadow = true; g.add(cap);

      // Side fins
      const ft = FIN_T.clone(); ft.needsUpdate = true;
      ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(2, 3);
      const fm = M.fin.clone(); fm.map = ft;
      [[-w / 2 - 0.005, Math.PI / 2], [w / 2 + 0.005, -Math.PI / 2]].forEach((p) => {
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.92, h * 0.82), fm);
        pl.position.set(p[0], h / 2 + 0.05, 0); pl.rotation.y = p[1]; g.add(pl);
      });

      // Front fan & grill
      const rec = new THREE.Mesh(new THREE.CircleGeometry(0.245 * s, 26), M.recess);
      rec.position.set(0, h * 0.50 + 0.05, d / 2 + 0.004); g.add(rec);
      const guard = new THREE.Mesh(new THREE.PlaneGeometry(0.56 * s, 0.56 * s), M.fan);
      guard.position.set(0, h * 0.50 + 0.05, d / 2 + 0.014); g.add(guard);

      box(w * 0.72, 0.05, 0.02, M.recess, 0, h * 0.10, d / 2 + 0.002, g);

      // Feet
      [-w * 0.34, w * 0.34].forEach((dx) => {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, d * 0.9), M.acG);
        f.position.set(dx, 0.025, 0); f.castShadow = true; g.add(f);
      });

      // Copper/insulated connection piping
      const px = w / 2 + 0.02;
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.30, 8), M.pipeI);
      p1.rotation.z = Math.PI / 2; p1.position.set(px + 0.12, h * 0.30, d * 0.18); g.add(p1);
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.30, 8), M.pipeI);
      p2.rotation.z = Math.PI / 2; p2.position.set(px + 0.12, h * 0.20, d * 0.18); g.add(p2);

      const code = 'R1-HVAC-' + ('0' + acCount).slice(-2);
      body.userData.asset = {
        code,
        name: 'AC Condenser Unit ' + acCount,
        rows: [
          ['Capacity', o.big ? '2.0 Ton split AC' : '1.5 Ton split AC'],
          ['Mounting', o.mount || 'Direct on deck'],
          ['Condition', o.aged ? 'Weathered casing' : 'Good condition'],
          ['Location', 'Terrace deck level']
        ],
        note: 'Outdoor split AC unit positioned on the terrace deck slab.'
      };
      pickable.push(body);
      return g;
    }

    // 1. MAIN TERRACE DECK (45 ft Front × 38 ft Sides)
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(W45, 0.45, D38), M.floor);
    floorMesh.position.y = -0.225; floorMesh.receiveShadow = true;
    floorMesh.userData.asset = {
      code: 'R1-SLAB-01',
      name: 'Main Terrace Slab (45 × 38 ft)',
      rows: [
        ['Front Width', '45 ft (13.72 m)'],
        ['Side Depth', '38 ft (11.58 m)'],
        ['Deck Area', '1,710 sq ft (158.9 m²)'],
        ['Left Side Corridor', '6 ft wide strip before 38 ft wall'],
        ['Right/Front Strips', '3 ft perimeter strips'],
        ['Total Area', '2,239 sq ft total footprint']
      ],
      note: 'Main tiled roof terrace with 45 ft front width and 38 ft side depth plus 6 ft side extension.'
    };
    pickable.push(floorMesh);
    LGroup.base.add(floorMesh);

    function screedMat(rx: number, rz: number) {
      const m = M.screed.clone();
      m.map = M.screed.map!.clone(); m.map.needsUpdate = true;
      m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
      m.map.repeat.set(rx, rz);
      return m;
    }

    // Side corridors & perimeter strips
    const OX = HX + PART, OZ = HZ + PART;
    const sd = OZ * 2 + PART;

    // LEFT 6 ft STRIP (Before 38 ft wall)
    const sL = new THREE.Mesh(new THREE.BoxGeometry(S6, 0.45, sd), screedMat(S6 / 1.2, sd / 1.2));
    sL.position.set(-OX - S6 / 2, -0.225, PART / 2); sL.receiveShadow = true; LGroup.base.add(sL);
    sL.userData.asset = {
      code: 'R1-STRIP-01',
      name: 'Left 6 ft Side Strip',
      rows: [
        ['Width', '6 ft (1.83 m)'],
        ['Length', '38 ft (11.58 m)'],
        ['Finish', 'Concrete screed floor']
      ],
      note: 'Additional 6 ft wide side space extending along the left side before the main 38 ft terrace wall.'
    };
    pickable.push(sL);

    // Right 3 ft strip
    const sR = new THREE.Mesh(new THREE.BoxGeometry(S6R, 0.45, sd), screedMat(S6R / 1.2, sd / 1.2));
    sR.position.set(OX + S6R / 2, -0.225, PART / 2); sR.receiveShadow = true; LGroup.base.add(sR);

    // Front 3 ft strip
    const fw = (OX + S6) + (OX + S6R);
    const sF = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.45, S3), screedMat(fw / 1.2, S3 / 1.2));
    sF.position.set(((OX + S6R) - (OX + S6)) / 2, -0.225, -OZ - S3 / 2);
    sF.receiveShadow = true; LGroup.base.add(sF);

    // 2. PARAPET WALLS (45 ft front, 38 ft sides)
    const GStruct = LGroup.struct;
    const parapetAsset: AssetInfo = {
      code: 'R1-PAR-01',
      name: 'Perimeter Parapet Wall',
      rows: [
        ['Height', '1.15 m (~3 ft 9 in)'],
        ['Thickness', '230 mm rendered wall'],
        ['Front Wall', '45 ft (13.72 m)'],
        ['Side Walls', '38 ft each (11.58 m)']
      ],
      note: 'Solid rendered parapet wall with coping fillet extending around the 45x38 ft terrace.'
    };

    function runWall(w: number, d: number, x: number, z: number, rusty?: boolean) {
      box(w, PARH, d, M.parap, x, 0, z, GStruct, (x === 0 && z < 0) ? parapetAsset : null);
      box(w + 0.09, 0.075, d + 0.09, rusty ? M.rust : M.coping, x, PARH, z, GStruct);
    }

    // Front 45 ft wall
    runWall(W45 + PART * 2, PART, 0, -HZ - PART / 2, false);

    // Entry wall with door opening
    const gL = GATE.x - GATE.w / 2, gR = GATE.x + GATE.w / 2;
    runWall(gL - (-HX - PART), PART, (-HX - PART + gL) / 2, HZ + PART / 2, false);
    runWall((HX + PART) - gR, PART, (gR + HX + PART) / 2, HZ + PART / 2, false);

    // Side 38 ft inner parapet walls
    box(PART, PARH - 0.12, D38, M.cream, -HX - PART / 2, 0, 0, GStruct);
    box(0.40, 0.12, D38, M.coping, -HX - PART / 2, PARH - 0.12, 0, GStruct);

    box(PART, PARH - 0.12, D38, M.cream, HX + PART / 2, 0, 0, GStruct);
    box(0.40, 0.12, D38, M.coping, HX + PART / 2, PARH - 0.12, 0, GStruct);

    // Outer boundary walls enclosing 6 ft strip & extended rear forecourt
    const LxO = -OX - S6, RxO = OX + S6R, FzO = -OZ - S3;
    const zA = FzO - PART, zB = OZ + 3.6; // Extended forecourt back wall to z = +9.6m

    // Extended Forecourt Concrete Floor Slab (Spanning full width from left to right boundary walls)
    const extFloorW = (RxO - LxO) + PART * 2;
    const extFloorD = zB - OZ;
    const extFloor = new THREE.Mesh(new THREE.BoxGeometry(extFloorW, 0.45, extFloorD), screedMat(extFloorW / 1.2, extFloorD / 1.2));
    extFloor.position.set((LxO + RxO) / 2, -0.225, OZ + extFloorD / 2);
    extFloor.receiveShadow = true;
    extFloor.userData.asset = {
      code: 'R1-SLAB-EXT',
      name: 'Extended Forecourt Floor Deck',
      rows: [
        ['Dimensions', `${extFloorW.toFixed(1)} m × ${extFloorD.toFixed(1)} m`],
        ['Location', 'Full width forecourt deck (Left, Entrance & Right Canopy)'],
        ['Capacity', 'Solid grounded floor slab for Canopy Roof & Future Additions']
      ],
      note: 'Continuous extended concrete floor deck slab spanning across both sides.'
    };
    pickable.push(extFloor);
    LGroup.base.add(extFloor);

    // Label Sprite on Left Extended Floor Deck (Space for future additions)
    const leftExtLabel = createLabelSprite('EXTENDED FLOOR DECK', 'Space Reserved for Future Additions', 1.8, 'rgba(15,24,42,0.92)', '#38bdf8');
    leftExtLabel.position.set(LxO + (GATE.x - LxO) / 2, 0.10, OZ + extFloorD / 2);
    GLabels.add(leftExtLabel);

    box(PART, 0.95, zB - zA, M.cream, LxO - PART / 2, 0, (zA + zB) / 2, GStruct);
    box(0.34, 0.10, zB - zA, M.coping, LxO - PART / 2, 0.95, (zA + zB) / 2, GStruct);
    box(PART, 0.95, zB - zA, M.cream, RxO + PART / 2, 0, (zA + zB) / 2, GStruct);
    box(0.34, 0.10, zB - zA, M.coping, RxO + PART / 2, 0.95, (zA + zB) / 2, GStruct);

    box(RxO - LxO + PART * 2, 0.95, PART, M.cream, (LxO + RxO) / 2, 0, FzO - PART / 2, GStruct);
    box(RxO - LxO + PART * 2, 0.10, 0.34, M.coping, (LxO + RxO) / 2, 0.95, FzO - PART / 2, GStruct);

    box(RxO - LxO + PART * 2, 0.95, PART, M.cream, (LxO + RxO) / 2, 0, zB - PART / 2, GStruct);
    box(RxO - LxO + PART * 2, 0.10, 0.34, M.coping, (LxO + RxO) / 2, 0.95, zB - PART / 2, GStruct);

    // Security fence & entrance door
    net(1.35, 1.55, LxO + S6 / 2, 0, -1.6, Math.PI / 2, GStruct);
    box(0.05, 1.60, 1.40, M.blackS, LxO + S6 / 2 - 0.02, 0, -1.6, GStruct);

    box(GATE.w + 0.3, 0.06, PART + 0.2, M.slab, GATE.x, 0, HZ + PART / 2, GStruct);
    box(0.10, 2.15, 0.10, M.blackS, gL - 0.05, 0, HZ + PART / 2, GStruct);
    box(0.10, 2.15, 0.10, M.blackS, gR + 0.05, 0, HZ + PART / 2, GStruct);
    box(GATE.w + 0.3, 0.10, 0.10, M.blackS, GATE.x, 2.15, HZ + PART / 2, GStruct);

    const gateLeaf = new THREE.Group();
    gateLeaf.position.set(gL - 0.05, 0, HZ + PART / 2);
    gateLeaf.rotation.y = -1.15;
    GStruct.add(gateLeaf);

    const lw = GATE.w + 0.05, lh = 2.0;
    const lt = MESH_T.clone(); lt.needsUpdate = true;
    lt.wrapS = lt.wrapT = THREE.RepeatWrapping; lt.repeat.set(lw / 0.42, lh / 0.42);
    const lm = M.netM.clone(); lm.map = lt;
    const pnl = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), lm);
    pnl.position.set(lw / 2, lh / 2 + 0.06, 0); gateLeaf.add(pnl);

    [0.06, lh + 0.06].forEach((y) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(lw, 0.07, 0.05), M.blackS);
      b.position.set(lw / 2, y, 0); b.castShadow = true; gateLeaf.add(b);
    });
    [0, lw].forEach((x) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, lh + 0.06, 0.05), M.blackS);
      b.position.set(x, lh / 2 + 0.06, 0); b.castShadow = true; gateLeaf.add(b);
    });

    // =========================================================================
    // SMALL CANOPY ROOF AT FAR RIGHT EXTREME (LINKED TO RIGHT BOUNDARY WALL)
    // WITH 4 SOLAR PANELS ON TOP & 2 TESLA GEYSERS + WATER TANK UNDERNEATH
    // =========================================================================
    // 1. Compact Canopy Roof Shelter at Far Right Extreme (Linked to Right Boundary Wall at X = +6.8m)
    const canopyW = 2.8, canopyD = 3.4;
    const canopyX = +5.40; // Right edge at +5.40 + 1.40 = +6.80m (touches right boundary wall)
    const canopyZ = OZ + extFloorD / 2; // Perfectly centered on the extended floor deck slab (z = 7.82m)
    const canopyH = 2.85; // Clear headroom under small canopy roof slab

    // Concrete Support Columns at outer corners along the right boundary wall
    const colOffsetX = canopyW / 2 - 0.25, colOffsetZ = canopyD / 2 - 0.25;
    [[-colOffsetX, -colOffsetZ], [+colOffsetX, -colOffsetZ], [-colOffsetX, +colOffsetZ], [+colOffsetX, +colOffsetZ]].forEach(([cx, cz]) => {
      box(0.42, canopyH, 0.42, M.cream, canopyX + cx, 0, canopyZ + cz, GStruct);
      box(0.50, 0.12, 0.50, M.coping, canopyX + cx, 0, canopyZ + cz, GStruct); // Base pad
      box(0.50, 0.10, 0.50, M.coping, canopyX + cx, canopyH - 0.10, canopyZ + cz, GStruct); // Capital
    });

    // Compact Concrete Canopy Roof Slab & Parapet Trim (Linked to Right Boundary Wall)
    const canopySlab = box(canopyW, 0.18, canopyD, M.slab, canopyX, canopyH, canopyZ, GStruct, {
      code: 'R1-CANOPY-RIGHT',
      name: 'Small Right Canopy Roof (4 PV Panels)',
      rows: [
        ['Dimensions', '2.8 m × 4.2 m (126 sq ft)'],
        ['Clear Height', '2.85 m (9 ft 4 in)'],
        ['Location', 'Far Right Extreme (Linked to Boundary Wall)'],
        ['Equipment Underneath', '2 × Tesla Smart Geysers + Water Tank'],
        ['Roof Array', '4 Ground-Mounted Solar Panels Above']
      ],
      note: 'Compact concrete roof slab shelter positioned at the far right boundary wall holding 4 solar PV panels with Tesla geysers underneath.'
    });
    box(canopyW + 0.12, 0.12, canopyD + 0.12, M.cream, canopyX, canopyH + 0.18, canopyZ, GStruct);
    box(canopyW + 0.18, 0.08, canopyD + 0.18, M.coping, canopyX, canopyH + 0.30, canopyZ, GStruct);

    // 2. 4 SOLAR PANELS MOUNTED ON TOP OF THE COMPACT RIGHT CANOPY ROOF
    const GSolar = LGroup.solar;
    const gRoofY = canopyH + 0.38;
    const pW = 0.98, pD = 1.80;

    // Mounting C-channel rails on top of compact roof slab
    [-1.0, +1.0].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 0.08), M.frame);
      rail.position.set(canopyX, gRoofY + 0.03, canopyZ + rz);
      GSolar.add(rail);
    });

    // 4 Solar Panels in 2x2 grid low-tilt (10°) on Compact Roof
    const gPGeo = new THREE.BoxGeometry(pW, 0.04, pD);
    const gPMats = [M.frame, M.frame, M.pv, M.pvBack, M.frame, M.frame];
    [-pW / 2 - 0.04, +pW / 2 + 0.04].forEach((pxOffset) => {
      [-pD / 2 - 0.04, +pD / 2 + 0.04].forEach((pzOffset) => {
        const panel = new THREE.Mesh(gPGeo, gPMats);
        panel.position.set(canopyX + pxOffset, gRoofY + 0.12, canopyZ + pzOffset);
        panel.rotation.x = -0.17; // 10 degree tilt
        panel.castShadow = true;
        panel.userData.asset = {
          code: 'R1-GEYSER-PV',
          name: '4 × Right Canopy Solar Panels',
          rows: [
            ['Quantity', '4 PV Modules (2×2 Array)'],
            ['Capacity', '2.34 kWp Total Output'],
            ['Mounting', 'Low-tilt deck mounts on Small Canopy Roof'],
            ['Target Load', 'Tesla Geysers & Water Pumping']
          ],
          note: '4 solar PV panels mounted directly on top of the small right canopy roof.'
        };
        pickable.push(panel);
        GSolar.add(panel);
      });
    });

    // Label Badge Sprite on Right Canopy Roof Solar Array
    const gRoofLabel = createLabelSprite('4 PANELS', 'CANOPY ROOF ARRAY', 1.5, 'rgba(15,24,42,0.92)', '#38bdf8');
    gRoofLabel.position.set(canopyX, gRoofY + 0.85, canopyZ);
    GLabels.add(gRoofLabel);

    // 3. DUAL TESLA GEYSERS & WATER TANK UNDERNEATH SMALL RIGHT CANOPY ROOF
    const gAsset: AssetInfo = {
      code: 'R1-TESLA-GEYSER',
      name: '2 × Tesla Smart Water Geysers',
      rows: [
        ['Quantity', '2 × Tesla Smart Heat Pump Geysers'],
        ['Location', 'Sheltered under Right Canopy Roof (Boundary Wall)'],
        ['Status', 'Active with LED Status Indicator Lines'],
        ['Power Source', '4 Canopy Roof Solar PV Panels Above']
      ],
      note: 'Dual Tesla smart water geyser units installed safely under the small right canopy shelter.'
    };

    // Dual Tesla Geysers placed at X = +4.5 and X = +5.2 under small right canopy
    [+4.5, +5.2].forEach((gx) => {
      const gz = canopyZ;

      // Concrete plinth pad
      box(0.68, 0.10, 0.55, M.slab, gx, 0, gz, GStruct);

      // Tesla Casing Body with Tesla logo & vertical glowing LED strip
      const geyser = new THREE.Mesh(new THREE.BoxGeometry(0.64, 1.85, 0.45), [
        M.steelD, M.steelD, M.steelD, M.steelD, M.teslaMat, M.steelD
      ]);
      geyser.position.set(gx, 0.10 + 0.925, gz);
      geyser.castShadow = true; geyser.receiveShadow = true;
      geyser.userData.asset = gAsset;
      pickable.push(geyser);
      GStruct.add(geyser);

      // Stainless / copper water pipes going up to canopy ceiling
      [gx - 0.18, gx + 0.18].forEach((px) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, canopyH - 1.95, 12), M.pipe);
        pipe.position.set(px, 1.95 + (canopyH - 1.95) / 2, gz - 0.10);
        GStruct.add(pipe);
      });
    });

    // Tesla Geyser Label Badge Sprite under right canopy
    const geyserLabel = createLabelSprite('2 × TESLA GEYSERS', 'Smart Heat Pump System', 1.8, 'rgba(18,22,28,0.92)', '#ff3344');
    geyserLabel.position.set(+4.85, 2.30, canopyZ + 0.40);
    GLabels.add(geyserLabel);

    // Water Filtration Tank / Pressure Vessel under right canopy (X = +6.0, Z = canopyZ)
    const tankX = +6.0, tankZ = canopyZ;
    cyl(0.32, 1.45, M.white, tankX, 0.10, tankZ, GStruct, 24);
    box(0.70, 0.10, 0.70, M.slab, tankX, 0, tankZ, GStruct); // Plinth
    cyl(0.12, 0.15, M.steelD, tankX, 1.55, tankZ, GStruct);  // Pressure valve top

    // Tank Label Badge Sprite under right canopy
    const tankLabel = createLabelSprite('WATER TANK', 'Filtration & Pressure Tank', 1.4, 'rgba(18,22,28,0.92)', '#38bdf8');
    tankLabel.position.set(tankX, 2.05, tankZ + 0.40);
    GLabels.add(tankLabel);

    // 6. ROOF-MOUNTED STRUCTURE SOLAR SYSTEM (POLE MOUNTED WITH HEAVY GIRDERS & 4 ARRAYS)
    // Spatial parameters matching reference layout and specification:
    // Left edge (end of 6 ft strip) X = -8.5 m; Right edge (right wall) X = +6.5 m
    // Height at left (6ft strip): 12 ft (3.66 m); Height at right: 6.5 ft (1.98 m)
    const xLeft = -8.5;
    const xRight = +6.5;
    const hLeft = 3.66;  // 12 ft
    const hRight = 1.98; // 6.5 ft

    // Slope helper for height at any X position
    function getGirderY(x: number): number {
      const frac = (x - xLeft) / (xRight - xLeft);
      return hLeft + frac * (hRight - hLeft);
    }

    // Concrete Footing Pedestals & Heavy Steel Support Posts (40 Girders Grid)
    // Measurement Specification: 8 Column positions × 5 Z-Depth Rows = 40 Vertical Heavy Steel Girders Total
    // Twin Column Pairs (P2-P3, P4-P5, P6-P7) with 24" (2 ft) spacing positioned directly under the 3 elevated walkways
    const postXPositions = [-8.30, -5.335, -4.725, -0.805, -0.195, +2.695, +3.305, +5.50];
    const postZPositions = [-4.6, -2.3, 0.0, +2.3, +4.6]; // 5 rows spanning 38 ft depth

    postXPositions.forEach((px) => {
      const py = getGirderY(px);
      postZPositions.forEach((pz) => {
        // Concrete pad footing on slab
        box(0.50, 0.14, 0.50, M.slab, px, 0, pz, GStruct);
        // Steel base plate
        box(0.38, 0.03, 0.38, M.steelD, px, 0.14, pz, GStruct);
        // Vertical steel column girder extending from slab to main roof height Y(px)
        const colHeight = py - 0.17;
        const postMesh = box(0.18, colHeight, 0.18, M.galvGirder, px, 0.17, pz, GStruct, {
          code: 'R1-POST-GIRDER',
          name: 'Heavy Steel Post Girder (40 Total)',
          rows: [
            ['Total Count', '40 Main Vertical Steel Girders'],
            ['Structure Placement', '24" Double-Pole Pairs positioned directly under 3 Walkways'],
            ['Grid Layout', '8 Columns × 5 Longitudinal Rows'],
            ['Location X', `${px.toFixed(2)} m (${((px + 8.3) / 0.3048).toFixed(1)} ft from start)`],
            ['Location Z', `${pz.toFixed(2)} m`],
            ['Design Engineer', 'Engr. Shamroze']
          ],
          note: 'One of 40 heavy steel support girders engineered in 24" double-pole pairs positioned directly under the 3 elevated walkways by Engr. Shamroze.'
        });
        pickable.push(postMesh);

        // Structural gusset / bracket at top and bottom
        box(0.26, 0.20, 0.26, M.steelD, px, 0.17, pz, GStruct);
        box(0.26, 0.25, 0.26, M.steelD, px, py - 0.25, pz, GStruct);
      });
    });

    // Horizontal Steel Tie-Brace Channels between 24" Twin Post Pairs directly under Walkway 1, 2, and 3
    const twinPairs = [[-5.335, -4.725], [-0.805, -0.195], [+2.695, +3.305]];
    twinPairs.forEach(([x1, x2]) => {
      const midX = (x1 + x2) / 2;
      const spanW = Math.abs(x2 - x1);
      const py = getGirderY(midX);
      postZPositions.forEach((pz) => {
        // Mid-height tie beam
        const tieMid = new THREE.Mesh(new THREE.BoxGeometry(spanW, 0.10, 0.10), M.steelD);
        tieMid.position.set(midX, py * 0.50, pz);
        GStruct.add(tieMid);

        // Top-height tie beam
        const tieTop = new THREE.Mesh(new THREE.BoxGeometry(spanW, 0.12, 0.12), M.steelD);
        tieTop.position.set(midX, py - 0.25, pz);
        GStruct.add(tieTop);
      });
    });

    // 7. INBUILT MONKEY LADDER WITH SAFETY CAGE FOR PV CLEANING & MAINTENANCE ACCESS
    // Positioned attached to main structural post at X = -7.90m, Z = -4.60m (Direct access to Walkway 1 at Y = 3.66m)
    const mkyX = -7.90;
    const mkyZ = -4.20;
    const mkyStartY = 0.14;
    const mkyTopY = 3.80;
    const mkyW = 0.52;

    // Side Tubular Rails
    [-mkyW / 2, +mkyW / 2].forEach((dx) => {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, mkyTopY - mkyStartY + 0.60, 16),
        M.steelD
      );
      rail.position.set(mkyX + dx, mkyStartY + (mkyTopY - mkyStartY + 0.60) / 2, mkyZ);
      rail.castShadow = true;
      GStruct.add(rail);

      // Curved Exit Grab Handles
      const curveGeo = new THREE.TorusGeometry(0.22, 0.025, 12, 24, Math.PI / 2);
      const grabHandle = new THREE.Mesh(curveGeo, M.steelD);
      grabHandle.position.set(mkyX + dx, mkyTopY + 0.30, mkyZ + 0.22);
      grabHandle.rotation.y = Math.PI / 2;
      GStruct.add(grabHandle);
    });

    // Anti-slip Steel Rungs
    const mkyRungCount = 14;
    for (let r = 0; r <= mkyRungCount; r++) {
      const ry = mkyStartY + 0.12 + r * 0.25;
      if (ry <= mkyTopY) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, mkyW, 12), M.galvGirder);
        rung.rotation.z = Math.PI / 2;
        rung.position.set(mkyX, ry, mkyZ);
        rung.castShadow = true;
        GStruct.add(rung);
      }
    }

    // Safety Cage Hoops (Monkey Cage Rings)
    const cageRadius = 0.38;
    const cageStartY = 1.70;
    const cageTopY = 4.05;
    const hoopCount = 6;
    for (let h = 0; h < hoopCount; h++) {
      const hy = cageStartY + h * ((cageTopY - cageStartY) / (hoopCount - 1));
      const hoopGeo = new THREE.TorusGeometry(cageRadius, 0.018, 12, 28, Math.PI * 1.35);
      const hoop = new THREE.Mesh(hoopGeo, M.galvGirder);
      hoop.rotation.x = Math.PI / 2;
      hoop.rotation.z = -Math.PI * 0.175;
      hoop.position.set(mkyX, hy, mkyZ + 0.18);
      hoop.castShadow = true;
      GStruct.add(hoop);
    }

    // Vertical Safety Cage Flat Straps
    for (let s = -2; s <= 2; s++) {
      const angle = (s * Math.PI) / 5;
      const sx = mkyX + cageRadius * Math.sin(angle);
      const sz = mkyZ + 0.18 + cageRadius * Math.cos(angle);
      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, cageTopY - cageStartY, 0.008),
        M.galvGirder
      );
      strap.position.set(sx, cageStartY + (cageTopY - cageStartY) / 2, sz);
      strap.castShadow = true;
      GStruct.add(strap);
    }

    // Heavy Steel Structural Wall/Column Anchor Brackets
    [0.90, 2.10, 3.30].forEach((by) => {
      box(0.32, 0.06, 0.35, M.steelD, mkyX - 0.20, by, mkyZ, GStruct);
    });

    // Diamond Safety Platform Landing
    const platform = box(0.85, 0.08, 0.85, M.walkwayMat, mkyX + 0.15, mkyTopY - 0.08, mkyZ + 0.35, GStruct, {
      code: 'R1-MONKEY-LADDER',
      name: 'Inbuilt Safety Monkey Ladder with Cage',
      rows: [
        ['Equipment Type', 'Inbuilt Vertical Safety Monkey Ladder with Protection Cage'],
        ['Total Height', '3.80 m (12 ft 6 in) Vertical Climb'],
        ['Safety Standard', 'OSHA / ISO Industrial Safety Cage Standard'],
        ['Rung Spacing', '14 Anti-Slip Steel Rungs at 250 mm'],
        ['Primary Function', 'Roof PV Solar Panel Wash & Cleaning Access'],
        ['Target Walkway', 'Direct Exit to Walkway 1'],
        ['Designed By', 'Engr. Shamroze']
      ],
      note: 'Inbuilt galvanised steel monkey ladder with 6 safety cage hoops, exit handles, and diamond safety platform engineered for solar panel cleaning crew.'
    });
    pickable.push(platform);

    // Label Sprite for Monkey Ladder
    const mkyLabel = createLabelSprite('INBUILT MONKEY LADDER', 'PV Cleaning & Wash Access', 1.8, 'rgba(15,23,42,0.95)', '#22c55e');
    mkyLabel.position.set(mkyX + 0.20, mkyTopY + 0.70, mkyZ + 0.35);
    GLabels.add(mkyLabel);

    // 2D Structural Column Placement Plan Overlay Graphics (Clean CAD Architectural Drawing)
    const GColPlan = LGroup.colplan;
    const colGridLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const rowGridLabels = ['A', 'B', 'C', 'D', 'E'];

    // 1. Column Grid Lines & CAD Circular Axis Bubbles (8 X-Lines and 5 Z-Lines)
    postXPositions.forEach((px, colIdx) => {
      // Clean thin grid line on floor
      const gLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.005, 12.0),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
      );
      gLine.position.set(px, 0.015, 0.0);
      GColPlan.add(gLine);

      // Top (Z = -6.2m) and Bottom (Z = +6.2m) CAD Axis Circles
      [-6.2, +6.2].forEach((zPos) => {
        const bubble = createGridBubbleSprite(colGridLabels[colIdx], '#0284c7', '#ffffff');
        bubble.position.set(px, 0.15, zPos);
        GColPlan.add(bubble);
      });
    });

    postZPositions.forEach((pz, rowIdx) => {
      // Clean thin grid line on floor
      const gLine = new THREE.Mesh(
        new THREE.BoxGeometry(15.8, 0.005, 0.025),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
      );
      gLine.position.set(-1.4, 0.015, pz);
      GColPlan.add(gLine);

      // Left (X = -9.6m) and Right (X = +6.8m) CAD Axis Circles
      [-9.6, +6.8].forEach((xPos) => {
        const bubble = createGridBubbleSprite(rowGridLabels[rowIdx], '#0284c7', '#ffffff');
        bubble.position.set(xPos, 0.15, pz);
        GColPlan.add(bubble);
      });
    });

    // 2. High-Contrast Target Rings & Markers for each of 40 Columns (C01 to C40)
    const ringMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const ringMatRed = new THREE.MeshBasicMaterial({ color: 0xff0055, side: THREE.DoubleSide });
    const dotMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const ringGeoOuter = new THREE.RingGeometry(0.24, 0.32, 24);
    const ringGeoInner = new THREE.RingGeometry(0.10, 0.18, 24);
    const dotGeoCenter = new THREE.CircleGeometry(0.06, 16);

    postXPositions.forEach((px, colIdx) => {
      postZPositions.forEach((pz, rowIdx) => {
        const cNum = colIdx * 5 + rowIdx + 1;
        const colCode = `C${cNum < 10 ? '0' + cNum : cNum}`;
        const colGrid = `${rowGridLabels[rowIdx]}-${colIdx + 1}`;

        // Target rings flat on floor level (Clean, no floating text clutter)
        const rOuter = new THREE.Mesh(ringGeoOuter, ringMatCyan);
        rOuter.rotation.x = -Math.PI / 2;
        rOuter.position.set(px, 0.02, pz);
        GColPlan.add(rOuter);

        const rInner = new THREE.Mesh(ringGeoInner, ringMatRed);
        rInner.rotation.x = -Math.PI / 2;
        rInner.position.set(px, 0.021, pz);
        rInner.userData.asset = {
          code: `COL-${colCode}`,
          name: `Column ${colCode} (Grid ${colGrid})`,
          rows: [
            ['Column Code', colCode],
            ['Grid Position', `Row ${rowGridLabels[rowIdx]}, Col ${colIdx + 1}`],
            ['X Coordinate', `${px.toFixed(2)} m`],
            ['Z Coordinate', `${pz.toFixed(2)} m`],
            ['Structure Placement', '24" Double-Pole Pair directly under Walkway'],
            ['Total Column Grid', '40 Steel Girders Matrix (8×5)']
          ],
          note: `Positioned at Grid ${colGrid}. Designed by Engr. Shamroze.`
        };
        pickable.push(rInner);
        GColPlan.add(rInner);

        const dCenter = new THREE.Mesh(dotGeoCenter, dotMatWhite);
        dCenter.rotation.x = -Math.PI / 2;
        dCenter.position.set(px, 0.022, pz);
        GColPlan.add(dCenter);
      });
    });

    // 3. Walkway 24" Twin Column Pair Indicators
    twinPairs.forEach(([x1, x2], wIdx) => {
      const midX = (x1 + x2) / 2;
      const wNum = wIdx + 1;
      const twinLabel = createLabelSprite(`WALKWAY ${wNum} TWIN POSTS`, `24" Spacing`, 1.4, 'rgba(15,23,42,0.95)', '#ffb020');
      twinLabel.position.set(midX, 0.40, -5.2);
      GColPlan.add(twinLabel);
    });

    // Label Sprite for 40 Girders Grid
    const girderGridLabel = createLabelSprite('40 HEAVY GIRDERS INSTALLED', '24" Twin Columns Directly Under Walkways · Engr. Shamroze', 2.2, 'rgba(15,24,42,0.95)', '#38bdf8');
    girderGridLabel.position.set(-1.8, hLeft * 0.6, +4.8);
    GLabels.add(girderGridLabel);

    // Main Sloped Transverse Heavy Steel Girders ("Guarders" - Heavy I-Beams)
    // 5 continuous heavy I-beams spanning across X from left (-8.5m) to right (+6.5m)
    postZPositions.forEach((pz) => {
      const spanLen = Math.hypot(xRight - xLeft, hRight - hLeft);
      const angleY = Math.atan2(hRight - hLeft, xRight - xLeft);
      const girder = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 0.24, 0.14), M.galvGirder);
      girder.position.set((xLeft + xRight) / 2, (hLeft + hRight) / 2, pz);
      girder.rotation.z = angleY;
      girder.castShadow = true; girder.receiveShadow = true;
      GSolar.add(girder);

      // Bottom flange plate for I-beam look
      const flange = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 0.03, 0.22), M.steelD);
      flange.position.set((xLeft + xRight) / 2, (hLeft + hRight) / 2 - 0.11, pz);
      flange.rotation.z = angleY;
      GSolar.add(flange);
    });

    // Longitudinal Steel C-Channel Purlins supporting panels & walkways
    const purlinZPositions = [-5.2, -3.8, -2.4, -1.0, +0.4, +1.8, +3.2, +4.6, +5.2];
    purlinZPositions.forEach((pz) => {
      const spanLen = Math.hypot(xRight - xLeft, hRight - hLeft);
      const angleY = Math.atan2(hRight - hLeft, xRight - xLeft);
      const purlin = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 0.08, 0.10), M.frame);
      purlin.position.set((xLeft + xRight) / 2, (hLeft + hRight) / 2 + 0.14, pz);
      purlin.rotation.z = angleY;
      purlin.castShadow = true;
      GSolar.add(purlin);
    });

    // "MADE BY ENGR SHAMROZE" Credit Badge on Top Corner of Main Structure
    const engLabel = createLabelSprite('MADE BY ENGR SHAMROZE', '73 Panels Total (645W) · 47.1 kWp System', 2.8, 'rgba(15,24,42,0.95)', '#ffb020');
    engLabel.position.set(xRight - 1.2, hRight + 1.25, -4.6);
    GLabels.add(engLabel);

    // 4 SOLAR ARRAYS & 3 ELEVATED WALKWAYS (EXACT REFERENCE LAYOUT)
    // ARRAY-04: 15 panels (3 cols x 5 rows, #51-#65) starting at 6ft strip
    // Walkway 1: 18" (0.457m)
    // ARRAY-03: 20 panels (4 cols x 5 rows, #31-#50)
    // Walkway 2: 18" (0.457m)
    // ARRAY-02: 15 panels (3 cols x 5 rows, #16-#30)
    // Walkway 3: 18" (0.457m)
    // ARRAY-01: 15 panels (3 cols x 5 rows, #01-#15) ending at right wall

    interface ArrayDef {
      name: string;
      label: string;
      cols: number;
      startNum: number;
      xStart: number;
    }

    const colWidth = 0.98;
    const colGap = 0.05;
    const walkwayW = 0.46; // 18 inches

    // Calculate X start coordinates cleanly across the structure
    const a4X = -8.3;
    const a4Width = 3 * colWidth + 2 * colGap; // ~3.04m
    const w1X = a4X + a4Width;
    const a3X = w1X + walkwayW;
    const a3Width = 4 * colWidth + 3 * colGap; // ~4.07m
    const w2X = a3X + a3Width;
    const a2X = w2X + walkwayW;
    const a2Width = 3 * colWidth + 2 * colGap; // ~3.04m
    const w3X = a2X + a2Width;
    const a1X = w3X + walkwayW;

    const arrays: ArrayDef[] = [
      { name: 'ARRAY-04', label: 'ARRAY-04 (15 PANELS)', cols: 3, startNum: 51, xStart: a4X },
      { name: 'ARRAY-03', label: 'ARRAY-03 (20 PANELS)', cols: 4, startNum: 31, xStart: a3X },
      { name: 'ARRAY-02', label: 'ARRAY-02 (15 PANELS)', cols: 3, startNum: 16, xStart: a2X },
      { name: 'ARRAY-01', label: 'ARRAY-01 (15 PANELS)', cols: 3, startNum: 1, xStart: a1X },
    ];

    const pDepth = 1.80;
    const rowGap = 0.10;
    const numRows = 5;
    const startZ = -4.2;

    const pGeo = new THREE.BoxGeometry(colWidth, 0.04, pDepth);
    const pMats = [M.frame, M.frame, M.pv, M.pvBack, M.frame, M.frame];

    // Helper to generate clean CAD Grid Axis Bubble Sprites
    function createGridBubbleSprite(label: string, bgCol: string = '#0284c7', textCol: string = '#ffffff') {
      const [c, g] = cvs(128, 128);
      g.fillStyle = bgCol;
      g.beginPath();
      g.arc(64, 64, 56, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 5;
      g.stroke();

      g.fillStyle = textCol;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'bold 50px ui-sans-serif, system-ui, sans-serif';
      g.fillText(label, 64, 66);

      const tx = new THREE.CanvasTexture(c);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: true }));
      sprite.scale.set(0.95, 0.95, 1);
      return sprite;
    }

    // Helper to generate text label textures on panels and walkways
    function createLabelSprite(text: string, sub: string, width: number, bgCol: string, fgCol: string) {
      const [c, g] = cvs(380, 110);
      g.fillStyle = bgCol;
      g.fillRect(0, 0, 380, 110);
      g.strokeStyle = fgCol;
      g.lineWidth = 4;
      g.strokeRect(2, 2, 376, 106);
      g.fillStyle = fgCol;
      g.textAlign = 'center';
      g.font = 'bold 42px ui-sans-serif, system-ui, sans-serif';
      g.fillText(text, 190, 52);
      if (sub) {
        g.font = '600 26px ui-sans-serif, system-ui, sans-serif';
        g.fillText(sub, 190, 88);
      }
      const tx = new THREE.CanvasTexture(c);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: true }));
      sprite.scale.set(width, width * 110 / 380, 1);
      return sprite;
    }

    // Render 4 Solar Panel Arrays (65 Panels Total)
    arrays.forEach((arr) => {
      for (let r = 0; r < numRows; r++) {
        const pz = startZ + r * (pDepth + rowGap);
        for (let c = 0; c < arr.cols; c++) {
          const px = arr.xStart + c * (colWidth + colGap) + colWidth / 2;
          const py = getGirderY(px) + 0.18;
          const angleY = Math.atan2(hRight - hLeft, xRight - xLeft);

          const panel = new THREE.Mesh(pGeo, pMats);
          panel.position.set(px, py, pz);
          panel.rotation.z = angleY;
          panel.castShadow = true;
          panel.userData.asset = {
            code: `R1-${arr.name}`,
            name: `${arr.name} Solar Panels (645W)`,
            rows: [
              ['Main Structure', '65 Panels (41.9 kWp)'],
              ['Canopy Roof', '4 Panels (2.58 kWp)'],
              ['Existing Add-on', '4 Panels (2.58 kWp)'],
              ['Total Project', '73 Panels (47.1 kWp Total)'],
              ['Module Specs', '645W Tier-1 N-Type TOPCon']
            ],
            note: '65 high-efficiency 645W solar PV panels mounted on heavy elevated steel structure engineered by Engr. Shamroze.'
          };
          pickable.push(panel);
          GSolar.add(panel);
        }
      }

      // Clean Array Label Badge suspended above array
      const arrCenterX = arr.xStart + (arr.cols * (colWidth + colGap) - colGap) / 2;
      const arrTopY = getGirderY(arrCenterX) + 0.75;
      const arrLabel = createLabelSprite(arr.name, '', 1.8, 'rgba(15,24,42,0.92)', '#38bdf8');
      arrLabel.position.set(arrCenterX, arrTopY, 0);
      GLabels.add(arrLabel);
    });

    // Render 3 Elevated 18" Walkway Grates between arrays (SLEEK BLACK WALKWAYS)
    const walkwayXs = [w1X + walkwayW / 2, w2X + walkwayW / 2, w3X + walkwayW / 2];
    walkwayXs.forEach((wx) => {
      const wy = getGirderY(wx) + 0.14;
      const angleY = Math.atan2(hRight - hLeft, xRight - xLeft);
      const walkLen = numRows * (pDepth + rowGap);
      const centerZ = startZ + walkLen / 2 - pDepth / 2;

      // Anti-slip black mesh walkway platform deck
      const grate = new THREE.Mesh(new THREE.BoxGeometry(walkwayW, 0.03, walkLen + 0.4), M.walkwayMat);
      grate.position.set(wx, wy, centerZ);
      grate.rotation.z = angleY;
      grate.castShadow = true;
      GSolar.add(grate);

      // Yellow safety toe-kickplates along edges
      [-walkwayW / 2, +walkwayW / 2].forEach((kx) => {
        const kick = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, walkLen + 0.4), M.amber);
        kick.position.set(wx + kx, wy + 0.04, centerZ);
        kick.rotation.z = angleY;
        GSolar.add(kick);
      });

      // 18" Walkway Label Badge
      const wLabel = createLabelSprite('18" WALKWAY', '', 1.1, 'rgba(18,22,28,0.92)', '#ffb020');
      wLabel.position.set(wx, wy + 0.55, startZ - 0.5);
      GLabels.add(wLabel);
    });

    // Front Elevated 18" Walkway running along the 45 ft front wall
    const frontWy = getGirderY(0) + 0.14;
    const frontWalkLen = (xRight - xLeft) - 0.4;
    const frontWalk = new THREE.Mesh(new THREE.BoxGeometry(frontWalkLen, 0.03, 0.46), M.walkwayMat);
    frontWalk.position.set((xLeft + xRight) / 2, frontWy, startZ - pDepth / 2 - 0.4);
    frontWalk.castShadow = true;
    GSolar.add(frontWalk);

    // Front 18" Walkway Label
    const frontWLabel = createLabelSprite('18" WALKWAY', '', 1.8, 'rgba(18,22,28,0.92)', '#ffb020');
    frontWLabel.position.set(0, frontWy + 0.65, startZ - pDepth / 2 - 0.4);
    GLabels.add(frontWLabel);

    // FLEXIBLE LADDER AT 45 FT FRONT WALL
    // Positioned at front wall near 45 ft mark (X = -1.8m, Z = -HZ)
    const ladderX = -1.8;
    const ladderZ = -HZ - 0.12;
    const ladderTopY = getGirderY(ladderX) + 0.14;
    const ladderBottomY = 0.05; // Terrace deck level

    const flexLadderGroup = new THREE.Group();
    flexLadderGroup.position.set(ladderX, 0, ladderZ);
    GSolar.add(flexLadderGroup);

    // Side Wire Cables / Side Rails
    const ladderHeight = ladderTopY - ladderBottomY;
    [-0.22, +0.22].forEach((lx) => {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, ladderHeight, 12), M.pipeI);
      cable.position.set(lx, ladderBottomY + ladderHeight / 2, 0);
      cable.castShadow = true;
      flexLadderGroup.add(cable);
    });

    // Aluminum Tubular Rungs
    const numRungs = Math.floor(ladderHeight / 0.30);
    for (let r = 0; r <= numRungs; r++) {
      const ry = ladderBottomY + r * 0.30;
      if (ry <= ladderTopY) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 12), M.frame);
        rung.rotation.z = Math.PI / 2;
        rung.position.set(0, ry, 0);
        rung.castShadow = true;
        flexLadderGroup.add(rung);
      }
    }

    // Top Attachment Hooks / Anchor Brackets onto the 18" Walkway
    box(0.52, 0.06, 0.25, M.steel, 0, ladderTopY, 0.10, flexLadderGroup);
    box(0.06, 0.20, 0.06, M.steelD, -0.22, ladderTopY - 0.10, 0, flexLadderGroup);
    box(0.06, 0.20, 0.06, M.steelD, +0.22, ladderTopY - 0.10, 0, flexLadderGroup);

    // Wall Standoff Brackets anchoring ladder to front wall
    [0.8, 1.8, 2.8].forEach((by) => {
      if (by < ladderTopY) {
        box(0.50, 0.03, 0.12, M.steelD, 0, by, -0.06, flexLadderGroup);
      }
    });

    // Flexible Ladder Canvas Label
    const ladderLabel = createLabelSprite('FLEXIBLE LADDER', 'Access to Elevated Solar Deck', 1.8, 'rgba(255,176,32,0.95)', '#10131a');
    ladderLabel.position.set(ladderX, ladderTopY / 2, ladderZ + 0.35);
    GLabels.add(ladderLabel);

    // 4. WATER TANK & PLINTHS
    const GUtil = LGroup.util;
    const tx = -0.8, tz = 0.5, tw = 2.0, td = 1.5, th = 1.00;
    box(tw, th, td, M.white, tx, 0, tz, GUtil, {
      code: 'R1-WTR-01',
      name: 'Water Tank & Plinth Enclosure',
      rows: [
        ['Footprint', '2.0 × 1.5 m'],
        ['Height', '1.00 m rendered plinth'],
        ['Cover', 'PE tarpaulin cover']
      ],
      note: 'Central rendered water tank/plinth enclosure on terrace deck.'
    });
    box(tw + 0.12, 0.08, td + 0.12, M.coping, tx, th, tz, GUtil);

    const tpMesh = new THREE.Mesh(new THREE.PlaneGeometry(tw + 0.25, td + 0.25), M.tarp);
    tpMesh.rotation.x = -Math.PI / 2; tpMesh.position.set(tx, th + 0.09, tz); GUtil.add(tpMesh);

    // 4. AC CONDENSERS (7 UNITS)
    condenser({ x: -HX + 0.85, z: -0.5, rot: Math.PI / 2, mount: 'Direct on deck along left 38 ft wall' });
    condenser({ x: tx - 0.2, z: tz + td / 2 + 0.6, rot: 0, mount: 'Beside water tank plinth' });
    condenser({ x: tx, z: tz, y: th + 0.08, rot: Math.PI, aged: true, mount: 'On tank enclosure coping' });
    condenser({ x: -1.8, z: -HZ + 0.6, rot: 0, mount: 'Mounted near front 45 ft wall' });
    condenser({ x: 0.8, z: -HZ + 0.6, rot: 0, mount: 'Mounted near front 45 ft wall' });
    condenser({ x: HX - 0.85, z: 1.0, rot: -Math.PI / 2, mount: 'Right wall deck level' });
    condenser({ x: HX - 0.85, z: -1.2, rot: -Math.PI / 2, aged: true, mount: 'Right wall deck level' });

    // 5. SURROUNDING CONTEXT
    const GContext = LGroup.context;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420),
      new THREE.MeshStandardMaterial({ color: 0x6f7168, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -13; ground.receiveShadow = true; GContext.add(ground);

    const nb = new THREE.Group(); nb.position.set(-HX - S6 - 8.5, 0, -0.5); GContext.add(nb);
    box(14, 3.4, 15, M.block, 0, -3.2, 0, nb);

    const towers = [
      [-40, -46, 34, 10], [-25, -52, 27, 9], [-8, -58, 31, 10], [10, -54, 24, 9],
      [26, -50, 29, 10], [42, -40, 22, 9], [54, -8, 26, 10], [46, 26, 30, 10],
      [-46, 22, 25, 9], [-56, -14, 28, 10], [18, -70, 36, 11], [-18, -72, 30, 10]
    ];
    towers.forEach((t) => {
      const m = box(t[3], t[2], t[3], M.ctx, t[0], 0, t[1], GContext);
      m.position.y = t[2] / 2 - 13;
    });

    // 6. DIMENSIONS OVERLAY (CLEAN, ELEGANT 38 ft & 45 ft MEASUREMENTS ON SCREEN)
    const GDims = LGroup.dims;
    function dimLabel(text: string, sub: string, x: number, y: number, z: number, size: number) {
      const [c, g] = cvs(480, 160);
      const r = 20, w = c.width - 8, h = c.height - 8;
      
      // Clean, light semi-transparent dark background pill
      g.fillStyle = 'rgba(14, 18, 26, 0.88)';
      g.strokeStyle = 'rgba(255, 176, 32, 0.75)';
      g.lineWidth = 3;
      
      g.beginPath();
      g.moveTo(4 + r, 4); g.lineTo(4 + w - r, 4); g.quadraticCurveTo(4 + w, 4, 4 + w, 4 + r);
      g.lineTo(4 + w, 4 + h - r); g.quadraticCurveTo(4 + w, 4 + h, 4 + w - r, 4 + h);
      g.lineTo(4 + r, 4 + h); g.quadraticCurveTo(4, 4 + h, 4, 4 + h - r);
      g.lineTo(4, 4 + r); g.quadraticCurveTo(4, 4, 4 + r, 4); g.closePath();
      g.fill();
      g.stroke();

      // Clean crisp typography
      g.fillStyle = '#ffffff'; g.textAlign = 'center';
      g.font = '600 68px ui-sans-serif, system-ui, -apple-system, sans-serif'; g.fillText(text, 240, 88);
      g.font = '500 36px ui-sans-serif, system-ui, -apple-system, sans-serif';
      g.fillStyle = '#cbd5e1'; g.fillText(sub, 240, 134);
      
      const tx = new THREE.CanvasTexture(c);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false }));
      s.position.set(x, y, z); s.scale.set(size, size * 160 / 480, 1); s.renderOrder = 999;
      GDims.add(s);
    }

    function dimLine(ax: number, az: number, bx: number, bz: number, y: number) {
      const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), ang = Math.atan2(dx, dz);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, len - 0.3), M.amber);
      bar.position.set((ax + bx) / 2, y, (az + bz) / 2); bar.rotation.y = ang; GDims.add(bar);
      [[ax, az, 1], [bx, bz, -1]].forEach((p) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 12), M.amber);
        cone.position.set(p[0] + (dx / len) * 0.10 * p[2], y, p[1] + (dz / len) * 0.10 * p[2]);
        cone.rotation.y = ang; cone.rotation.x = p[2] > 0 ? Math.PI / 2 : -Math.PI / 2; GDims.add(cone);
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.35, 0.03), M.amber);
        tick.position.set(p[0], y + 0.18, p[1]); GDims.add(tick);
      });
    }

    const dimY = 0.15, dimOff = 1.6;
    // Front Width: 45 ft (13.72 m)
    dimLine(-HX, -OZ - S3 - PART - dimOff, HX, -OZ - S3 - PART - dimOff, dimY);
    dimLabel('45 ft FRONT', '13.72 m Width', 0, 1.4, -OZ - S3 - PART - dimOff, 2.2);

    // Right Side Depth: 38 ft (11.58 m)
    dimLine(OX + S6R + PART + dimOff, -HZ, OX + S6R + PART + dimOff, HZ, dimY);
    dimLabel('38 ft SIDE', '11.58 m Depth', OX + S6R + PART + dimOff, 1.4, 0, 2.2);

    // Left Side Depth: 38 ft (11.58 m)
    dimLine(-HX + 0.8, -HZ + 0.4, -HX + 0.8, HZ - 0.4, dimY);
    dimLabel('38 ft SIDE', '11.58 m Depth', -HX + 0.8, 1.4, 0, 2.2);

    // Left 6 ft Side Strip
    dimLine(-OX, -HZ + 1.1, -OX - S6, -HZ + 1.1, dimY);
    dimLabel('6 ft STRIP', '1.83 m Extension', -OX - S6 / 2, 1.2, -HZ + 1.1, 1.8);

    // Raycasting & Interaction Handlers
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const highlightMat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0x5c3400, roughness: 0.4 });

    function isMeshVisible(o: THREE.Object3D | null): boolean {
      let p: THREE.Object3D | null = o;
      while (p) {
        if (p.visible === false) return false;
        p = p.parent;
      }
      return true;
    }

    function castRay(e: MouseEvent | PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObjects(pickableRef.current.filter(isMeshVisible), false);
    }

    function handleHover(e: PointerEvent) {
      const hits = castRay(e);
      if (hits.length > 0 && container) {
        const hitMesh = hits[0].object as THREE.Mesh;
        if (hitMesh.userData.asset || hitMesh.userData.hour !== undefined) {
          container.style.cursor = 'pointer';
          if (tooltipRef.current) {
            const rect = container.getBoundingClientRect();
            tooltipRef.current.style.display = 'block';
            tooltipRef.current.style.left = `${e.clientX - rect.left + 12}px`;
            tooltipRef.current.style.top = `${e.clientY - rect.top + 12}px`;
            if (hitMesh.userData.hour !== undefined) {
              const h = hitMesh.userData.hour;
              const period = h >= 12 ? 'PM' : 'AM';
              const dispH = h % 12 === 0 ? 12 : Math.floor(h % 12);
              tooltipRef.current.textContent = `Click to set Sun Position: ${dispH}:00 ${period}`;
            } else if (hitMesh.userData.asset) {
              tooltipRef.current.textContent = hitMesh.userData.asset.name;
            }
          }
          return;
        }
      }
      if (container) {
        container.style.cursor = 'grab';
      }
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
    }

    function clearSelection() {
      if (selectedMeshRef.current && selectedOriginalMatRef.current) {
        selectedMeshRef.current.material = selectedOriginalMatRef.current;
        selectedMeshRef.current = null;
        selectedOriginalMatRef.current = null;
      }
    }

    function handlePick(e: PointerEvent) {
      clearSelection();
      const hits = castRay(e);
      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        if (hitMesh.userData.hour !== undefined && onTimeChange) {
          onTimeChange(hitMesh.userData.hour);
          return;
        }
        if (hitMesh.userData.asset) {
          selectedMeshRef.current = hitMesh;
          selectedOriginalMatRef.current = hitMesh.material;
          hitMesh.material = highlightMat;
          onSelectAsset(hitMesh.userData.asset);
        } else {
          onSelectAsset(null);
        }
      } else {
        onSelectAsset(null);
      }
    }

    let downPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      handleHover(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist < 6) {
        handlePick(e);
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', handlePointerDown);
    domEl.addEventListener('pointermove', handlePointerMove);
    domEl.addEventListener('pointerup', handlePointerUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth preset camera transitions
      if (isPresetAnimating.current) {
        camera.position.lerp(targetCamPos.current, 0.08);
        controls.target.lerp(targetLookAt.current, 0.08);
        if (camera.position.distanceTo(targetCamPos.current) < 0.05) {
          isPresetAnimating.current = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('pointerdown', handlePointerDown);
      domEl.removeEventListener('pointermove', handlePointerMove);
      domEl.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
      rendererRef.current?.dispose();
    };
  }, [onSelectAsset]);

  // Sync highlighting if selectedAssetCode cleared from parent
  useEffect(() => {
    if (!selectedAssetCode && selectedMeshRef.current && selectedOriginalMatRef.current) {
      selectedMeshRef.current.material = selectedOriginalMatRef.current;
      selectedMeshRef.current = null;
      selectedOriginalMatRef.current = null;
    }
  }, [selectedAssetCode]);

  return (
    <div ref={containerRef} className="relative w-full h-full cursor-grab active:cursor-grabbing">
      <div
        ref={tooltipRef}
        className="absolute z-30 pointer-events-none text-xs font-mono font-semibold bg-[#ffb020] text-[#10131a] px-2 py-1 rounded shadow-md hidden"
      />
    </div>
  );
};
