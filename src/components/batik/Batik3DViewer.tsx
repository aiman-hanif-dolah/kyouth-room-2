import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Design } from "@/lib/batik/catalog";
import { designSvg } from "@/lib/batik/design";

interface Batik3DViewerProps {
  design: Design;
  className?: string;
}

export function Batik3DViewer({ design, className = "" }: Batik3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  // Keep references to Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  // Generate batik pattern into a high-res HTMLCanvasElement for Three texture
  const renderBatikCanvas = (d: Design): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const svgString = designSvg(d, "pattern");
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = d.background;
          ctx.fillRect(0, 0, 1024, 1024);
          ctx.drawImage(img, 0, 0, 1024, 1024);

          // Subtle fabric texture overlay
          if (d.texture) {
            ctx.fillStyle = "rgba(0,0,0,0.03)";
            for (let i = 0; i < 1024; i += 4) {
              ctx.fillRect(0, i, 1024, 1);
              ctx.fillRect(i, 0, 1, 1024);
            }
          }
        }
        URL.revokeObjectURL(url);
        resolve(canvas);
      };

      img.onerror = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = d.background;
          ctx.fillRect(0, 0, 512, 512);
        }
        URL.revokeObjectURL(url);
        resolve(canvas);
      };

      img.src = url;
    });
  };

  // Build product-specific 3D geometry mesh group
  const createProductMesh = (productId: string, batikMaterial: THREE.Material): THREE.Group => {
    const group = new THREE.Group();
    const darkAccentMat = new THREE.MeshStandardMaterial({
      color: 0x222225,
      roughness: 0.8,
      metalness: 0.1,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.7,
      metalness: 0.05,
    });

    switch (productId) {
      case "tote": {
        // Tote bag body (flat rectangular soft cuboid)
        const bagGeo = new THREE.BoxGeometry(2.4, 2.7, 0.4, 16, 16, 4);
        // Slightly curve the vertices for organic fabric look
        const pos = bagGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          const z = pos.getZ(i);
          // flare slightly at bottom
          if (y < 0) {
            pos.setZ(i, z * (1 + Math.sin(-y * 0.5) * 0.3));
          }
        }
        bagGeo.computeVertexNormals();
        const bagMesh = new THREE.Mesh(bagGeo, batikMaterial);
        bagMesh.castShadow = true;
        bagMesh.receiveShadow = true;
        group.add(bagMesh);

        // Tote handles (two curved torus segments)
        const handleCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.6, 1.35, 0.22),
          new THREE.Vector3(-0.7, 2.3, 0.2),
          new THREE.Vector3(0.7, 2.3, 0.2),
          new THREE.Vector3(0.6, 1.35, 0.22),
        ]);
        const handleGeo1 = new THREE.TubeGeometry(handleCurve, 32, 0.05, 8, false);
        const handle1 = new THREE.Mesh(handleGeo1, darkAccentMat);
        group.add(handle1);

        const handleCurve2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.6, 1.35, -0.22),
          new THREE.Vector3(-0.7, 2.3, -0.2),
          new THREE.Vector3(0.7, 2.3, -0.2),
          new THREE.Vector3(0.6, 1.35, -0.22),
        ]);
        const handleGeo2 = new THREE.TubeGeometry(handleCurve2, 32, 0.05, 8, false);
        const handle2 = new THREE.Mesh(handleGeo2, darkAccentMat);
        group.add(handle2);

        group.position.y = -0.5;
        break;
      }

      case "cushion": {
        // Pillow / Cushion: puffed box with softened curved edges
        const cushionGeo = new THREE.BoxGeometry(2.6, 2.6, 0.9, 24, 24, 12);
        const pos = cushionGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const z = pos.getZ(i);
          const distCenter = Math.sqrt((x / 1.3) ** 2 + (y / 1.3) ** 2);
          const puff = Math.max(0, 1 - distCenter * 0.7);
          pos.setZ(i, z * (1 + puff * 0.9));
        }
        cushionGeo.computeVertexNormals();
        const cushionMesh = new THREE.Mesh(cushionGeo, batikMaterial);
        cushionMesh.castShadow = true;
        cushionMesh.receiveShadow = true;
        group.add(cushionMesh);
        break;
      }

      case "tee":
      case "shirt":
      case "kurung":
      case "kebaya": {
        // Apparel / Garment Mannequin silhouette
        // Torso
        const bodyGeo = new THREE.CylinderGeometry(0.85, 1.05, 2.3, 32, 16);
        bodyGeo.scale(1.15, 1, 0.55); // Flatter torso depth
        const bodyMesh = new THREE.Mesh(bodyGeo, batikMaterial);
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        // Sleeves (left & right angled cylinders)
        const sleeveGeoL = new THREE.CylinderGeometry(0.35, 0.38, 0.9, 16);
        sleeveGeoL.scale(1, 1, 0.6);
        const sleeveL = new THREE.Mesh(sleeveGeoL, batikMaterial);
        sleeveL.position.set(-1.1, 0.7, 0);
        sleeveL.rotation.z = Math.PI / 4.2;
        group.add(sleeveL);

        const sleeveGeoR = new THREE.CylinderGeometry(0.35, 0.38, 0.9, 16);
        sleeveGeoR.scale(1, 1, 0.6);
        const sleeveR = new THREE.Mesh(sleeveGeoR, batikMaterial);
        sleeveR.position.set(1.1, 0.7, 0);
        sleeveR.rotation.z = -Math.PI / 4.2;
        group.add(sleeveR);

        // Collar ring / neck
        const collarGeo = new THREE.TorusGeometry(0.42, 0.08, 16, 32);
        collarGeo.rotation.x = Math.PI / 2;
        collarGeo.position.y = 1.15;
        const collar = new THREE.Mesh(collarGeo, darkAccentMat);
        group.add(collar);

        // If kurung/kebaya: add longer skirt/flair
        if (productId === "kurung" || productId === "kebaya") {
          const skirtGeo = new THREE.CylinderGeometry(1.05, 1.45, 1.8, 32);
          skirtGeo.scale(1.1, 1, 0.6);
          const skirt = new THREE.Mesh(skirtGeo, batikMaterial);
          skirt.position.y = -1.9;
          group.add(skirt);
          group.position.y = 0.5;
        } else {
          group.position.y = -0.1;
        }
        break;
      }

      case "scarf": {
        // Flowing draped scarf curve
        const scarfGeo = new THREE.PlaneGeometry(2.4, 3.2, 32, 32);
        const pos = scarfGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          pos.setZ(i, Math.sin(x * 2.2) * 0.35 + Math.cos(y * 1.8) * 0.25);
        }
        scarfGeo.computeVertexNormals();
        const scarfMesh = new THREE.Mesh(
          scarfGeo,
          new THREE.MeshStandardMaterial({
            map: (batikMaterial as THREE.MeshStandardMaterial).map,
            side: THREE.DoubleSide,
            roughness: 0.4,
            metalness: 0.15,
          })
        );
        scarfMesh.castShadow = true;
        group.add(scarfMesh);
        break;
      }

      case "sarong":
      case "fabric": {
        // Cylindrical fabric wrap drape or roll
        const cylGeo = new THREE.CylinderGeometry(1.1, 1.25, 3.0, 36, 16, true);
        const pos = cylGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const theta = Math.atan2(pos.getZ(i), pos.getX(i));
          const wave = Math.sin(theta * 8) * 0.05;
          pos.setX(i, pos.getX(i) * (1 + wave));
          pos.setZ(i, pos.getZ(i) * (1 + wave));
        }
        cylGeo.computeVertexNormals();
        const cylMat = new THREE.MeshStandardMaterial({
          map: (batikMaterial as THREE.MeshStandardMaterial).map,
          side: THREE.DoubleSide,
          roughness: 0.6,
        });
        const sarongMesh = new THREE.Mesh(cylGeo, cylMat);
        sarongMesh.castShadow = true;
        group.add(sarongMesh);

        // Top tied rim
        const rimGeo = new THREE.TorusGeometry(1.15, 0.09, 16, 32);
        rimGeo.rotation.x = Math.PI / 2;
        rimGeo.position.y = 1.45;
        const rim = new THREE.Mesh(rimGeo, darkAccentMat);
        group.add(rim);
        break;
      }

      case "notebook": {
        // Hardcover book
        const bookCoverGeo = new THREE.BoxGeometry(2.1, 2.9, 0.35);
        const bookCover = new THREE.Mesh(bookCoverGeo, batikMaterial);
        bookCover.castShadow = true;
        group.add(bookCover);

        // Pages inside
        const pagesMat = new THREE.MeshStandardMaterial({ color: 0xfaf6ea, roughness: 0.9 });
        const pagesGeo = new THREE.BoxGeometry(2.0, 2.78, 0.28);
        const pages = new THREE.Mesh(pagesGeo, pagesMat);
        pages.position.set(0.08, 0, 0);
        group.add(pages);

        // Spine ribbon
        const ribbonGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.1, 8);
        const ribbon = new THREE.Mesh(ribbonGeo, darkAccentMat);
        ribbon.position.set(-1.02, 0, 0.18);
        group.add(ribbon);
        break;
      }

      case "pouch": {
        // Compact cosmetic pouch with zipper
        const pouchGeo = new THREE.BoxGeometry(2.5, 1.5, 0.8, 16, 12, 10);
        const pos = pouchGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > 0) {
            // taper at top zipper
            pos.setZ(i, pos.getZ(i) * 0.4);
          }
        }
        pouchGeo.computeVertexNormals();
        const pouchMesh = new THREE.Mesh(pouchGeo, batikMaterial);
        pouchMesh.castShadow = true;
        group.add(pouchMesh);

        // Zipper bar on top
        const zipGeo = new THREE.BoxGeometry(2.35, 0.08, 0.1);
        const zip = new THREE.Mesh(zipGeo, darkAccentMat);
        zip.position.y = 0.77;
        group.add(zip);
        break;
      }

      case "runner": {
        // Table runner draped over simulated wooden tabletop
        const tableGeo = new THREE.BoxGeometry(3.6, 0.2, 2.2);
        const table = new THREE.Mesh(tableGeo, woodMat);
        table.position.y = -0.3;
        table.receiveShadow = true;
        group.add(table);

        // Runner fabric draping down edges
        const runnerGeo = new THREE.BoxGeometry(1.2, 0.04, 2.8, 16, 2, 16);
        const runner = new THREE.Mesh(runnerGeo, batikMaterial);
        runner.position.y = -0.18;
        runner.castShadow = true;
        group.add(runner);
        break;
      }

      default: {
        // Fallback smooth display cylinder/box
        const fallbackGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
        const fallbackMesh = new THREE.Mesh(fallbackGeo, batikMaterial);
        group.add(fallbackMesh);
        break;
      }
    }

    return group;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let destroyed = false;
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 420;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 5.2);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // 4. Lighting setup: warm studio studio lighting
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd9e5ff, 1.0);
    fillLight.position.set(-4, 2, -2);
    scene.add(fillLight);

    const floorLight = new THREE.DirectionalLight(0xfef2e0, 0.6);
    floorLight.position.set(0, -3, 2);
    scene.add(floorLight);

    // Pedestal shadow receiver disc
    const floorGeo = new THREE.CircleGeometry(2.6, 48);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.22 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.9;
    floor.receiveShadow = true;
    scene.add(floor);

    // 5. Generate Batik texture & product mesh
    setLoading(true);
    renderBatikCanvas(design).then((canvas) => {
      if (destroyed) return;

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 2);
      textureRef.current = texture;

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: design.material === "Satin" ? 0.35 : design.material === "Linen blend" ? 0.85 : 0.65,
        metalness: design.material === "Satin" ? 0.25 : 0.05,
      });

      const model = createProductMesh(design.product, material);
      modelGroupRef.current = model;
      scene.add(model);
      setLoading(false);
    });

    // 6. Interactive Drag Controls (Rotate with mouse / touch)
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !modelGroupRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      modelGroupRef.current.rotation.y += dx * 0.012;
      modelGroupRef.current.rotation.x = Math.max(-0.6, Math.min(0.6, modelGroupRef.current.rotation.x + dy * 0.008));
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !modelGroupRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - prevMouseRef.current.x;
      const dy = e.touches[0].clientY - prevMouseRef.current.y;
      modelGroupRef.current.rotation.y += dx * 0.012;
      modelGroupRef.current.rotation.x = Math.max(-0.6, Math.min(0.6, modelGroupRef.current.rotation.x + dy * 0.008));
      prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    domEl.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onMouseUp);

    // 7. Render Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (modelGroupRef.current && autoRotateRef.current && !isDraggingRef.current) {
        modelGroupRef.current.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width: newW, height: newH } = entries[0].contentRect;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      destroyed = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      domEl.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      domEl.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);

      if (textureRef.current) textureRef.current.dispose();
      renderer.dispose();
      container.replaceChildren();
    };
  }, [design.product]);

  // Update texture dynamically when design parameters change without reloading full scene
  useEffect(() => {
    let active = true;
    renderBatikCanvas(design).then((canvas) => {
      if (!active || !modelGroupRef.current) return;
      if (textureRef.current) {
        textureRef.current.dispose();
      }
      const newTexture = new THREE.CanvasTexture(canvas);
      newTexture.wrapS = THREE.RepeatWrapping;
      newTexture.wrapT = THREE.RepeatWrapping;
      newTexture.repeat.set(2, 2);
      textureRef.current = newTexture;

      modelGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.map !== undefined && mat.name !== "accent") {
            mat.map = newTexture;
            mat.roughness = design.material === "Satin" ? 0.35 : design.material === "Linen blend" ? 0.85 : 0.65;
            mat.metalness = design.material === "Satin" ? 0.25 : 0.05;
            mat.needsUpdate = true;
          }
        }
      });
    });
    return () => {
      active = false;
    };
  }, [
    design.motif,
    design.ink,
    design.accent,
    design.background,
    design.detail,
    design.scale,
    design.spacing,
    design.rotation,
    design.repeat,
    design.mirror,
    design.secondary,
    design.texture,
    design.material,
  ]);

  return (
    <div className={`relative w-full h-full select-none cursor-grab active:cursor-grabbing ${className}`}>
      <div ref={mountRef} className="w-full h-full min-h-[340px]" />

      {/* Floating 3D Control overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
            autoRotate
              ? "bg-[#282540] text-[#f4eddb] border-[#282540] shadow-sm"
              : "bg-white/80 text-[#282540] border-gray-300 hover:bg-white"
          }`}
          title="Toggle continuous rotation"
        >
          {autoRotate ? "↻ Spinning" : "⏸ Paused"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (modelGroupRef.current) {
              modelGroupRef.current.rotation.set(0, 0, 0);
            }
          }}
          className="px-2 py-1 text-xs rounded-full bg-white/80 text-gray-700 border border-gray-300 hover:bg-white transition-colors"
          title="Reset 3D view orientation"
        >
          Reset view
        </button>
      </div>

      {loading && (
        <div className="absolute inset-0 grid place-items-center bg-[#f4eee5]/70 backdrop-blur-xs text-xs font-semibold text-[#514267]">
          <span>Generating 3D canvas…</span>
        </div>
      )}

      <div className="absolute bottom-2 left-3 pointer-events-none text-[10px] text-gray-500 font-medium tracking-wide bg-white/60 px-2 py-0.5 rounded-sm">
        Drag to inspect 360° · Textured live
      </div>
    </div>
  );
}
