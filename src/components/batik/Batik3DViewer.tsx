import { useEffect, useRef, useState } from "react";
import { Download, Expand, Minimize2, RotateCcw, RotateCw } from "lucide-react";
import * as THREE from "three";
import { productSizeScale, type Design } from "@/lib/batik/catalog";
import { designImage, designSvg, downloadBlob } from "@/lib/batik/design";

interface Batik3DViewerProps {
  design: Design;
  zoom?: number;
  className?: string;
}

const previewStages = [
  { id: "atelier", label: "Atelier", background: "radial-gradient(ellipse at 50% 42%, #fffaf1 0, #e8dccc 43%, #d8cbbd 73%, #c8b8aa 100%)" },
  { id: "gallery", label: "Night gallery", background: "radial-gradient(ellipse at 50% 38%, #514762 0, #29243a 54%, #17151e 100%)" },
  { id: "garden", label: "Garden light", background: "radial-gradient(ellipse at 50% 38%, #f3f3dd 0, #dce6d6 50%, #bbcbbd 100%)" },
] as const;

export function Batik3DViewer({ design, zoom = 1, className = "" }: Batik3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const designRef = useRef(design);
  designRef.current = design;
  const [loading, setLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [renderError, setRenderError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [captureNotice, setCaptureNotice] = useState("");
  const [previewStage, setPreviewStage] = useState<(typeof previewStages)[number]["id"]>("atelier");

  // Keep references to Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraTargetRef = useRef(new THREE.Vector3());
  const cameraDirectionRef = useRef(new THREE.Vector3(0, 0.08, 1).normalize());
  const cameraDistanceRef = useRef(5.2);
  const modelSizeRef = useRef<THREE.Vector3 | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const productGeometryRef = useRef<THREE.Group | null>(null);
  const productCenterYRef = useRef(0);
  const plinthRef = useRef<THREE.Mesh | null>(null);
  const plinthTopRef = useRef<THREE.Mesh | null>(null);
  const fabricMaterialsRef = useRef(new Set<THREE.MeshStandardMaterial>());
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const hasMountedTextureEffectRef = useRef(false);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const fitCameraRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const updateFullscreen = () => {
      setFullscreen(document.fullscreenElement === viewerRef.current);
      setFullscreenError("");
    };
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    setFullscreenError("");
    try {
      if (document.fullscreenElement === viewer) await document.exitFullscreen();
      else if (viewer.requestFullscreen) await viewer.requestFullscreen();
      else setFullscreenError("Full-screen view is unavailable in this browser.");
    } catch {
      setFullscreenError("The browser could not open full-screen view.");
    }
  };

  const save3DStill = () => {
    setCaptureNotice("Capturing transparent PNG…");
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) {
      setCaptureNotice("The 3D model is not ready to capture yet.");
      return;
    }
    try {
      renderer.render(scene, camera);
      const base64 = renderer.domElement.toDataURL("image/png").split(",")[1];
      if (!base64) throw new Error("The 3D image could not be encoded.");
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
      const blob = new Blob([bytes.buffer], { type: "image/png" });
      downloadBlob(blob, `${design.name.replace(/[^a-z0-9-]/gi, "-") || "batik-design"}-${design.product}-3d.png`);
      setCaptureNotice("Transparent 3D PNG saved.");
    } catch (error) {
      setCaptureNotice(error instanceof Error ? error.message : "The 3D image could not be captured.");
    }
  };

  const makeFabricMaterial = (texture: THREE.CanvasTexture) => {
    const finish = designRef.current.material;
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: finish === "Satin" ? 0.35 : finish === "Linen blend" ? 0.85 : 0.65,
      metalness: finish === "Satin" ? 0.12 : 0.02,
      side: THREE.DoubleSide,
    });
    fabricMaterialsRef.current.add(material);
    return material;
  };

  const fitFabricUvs = (geometry: THREE.BufferGeometry) => {
    const position = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    if (!position || !uv) return;
    const bounds = new THREE.Box3().setFromBufferAttribute(position as THREE.BufferAttribute);
    const size = bounds.getSize(new THREE.Vector3());
    for (let index = 0; index < uv.count; index++) {
      uv.setXY(index, (position.getX(index) - bounds.min.x) / Math.max(size.x, 0.001), (position.getY(index) - bounds.min.y) / Math.max(size.y, 0.001));
    }
    uv.needsUpdate = true;
  };

  const turnModel = (angle: number) => {
    if (!modelGroupRef.current) return;
    targetRotationRef.current.y = (autoRotate ? modelGroupRef.current.rotation.y : targetRotationRef.current.y) + angle;
    setAutoRotate(false);
  };

  // Compose the full design onto a high-res canvas for the 3D product texture.
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
          if (d.placement === "all") {
            ctx.drawImage(img, 0, 0, 1024, 1024);
          } else {
            ctx.save();
            if (d.placement === "panel") {
              ctx.beginPath();
              ctx.roundRect(230, 180, 564, 640, 12);
            } else {
              ctx.beginPath();
              ctx.rect(0, 748, 1024, 155);
            }
            ctx.clip();
            ctx.drawImage(img, 0, 0, 1024, 1024);
            ctx.restore();
          }
          if (d.border) {
            ctx.strokeStyle = d.detail;
            ctx.lineWidth = 10;
            for (const y of [768, 802]) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(1024, y);
              ctx.stroke();
            }
          }
          if (d.monogram) {
            const signatureScale = 1024 / 600;
            const fontSize = d.textSize * signatureScale;
            const x = d.textX * signatureScale;
            const y = d.textY * signatureScale;
            const fontFamily = d.monogramFont === "sans" ? "Arial, sans-serif" : d.monogramFont === "script" ? "cursive" : "Georgia, serif";
            const signatureColour = d.monogramColor === "accent" ? d.accent : d.monogramColor === "detail" ? d.detail : d.ink;
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = d.background;
            ctx.beginPath();
            ctx.roundRect(x - 120 * signatureScale, y - fontSize, 240 * signatureScale, (d.textSize + 22) * signatureScale, 4 * signatureScale);
            ctx.fill();
            ctx.fillStyle = signatureColour;
            ctx.fillText(d.monogram, x, y);
          }

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
        const pos = bagGeo.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          const z = pos.getZ(i);
          // flare slightly at bottom
          if (y < 0) {
            pos.setZ(i, z * (1 + Math.sin(-y * 0.5) * 0.3));
          }
        }
        bagGeo.computeVertexNormals();
        fitFabricUvs(bagGeo);
        const bagMesh = new THREE.Mesh(bagGeo, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
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
        const pos = cushionGeo.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const z = pos.getZ(i);
          const distCenter = Math.sqrt((x / 1.3) ** 2 + (y / 1.3) ** 2);
          const puff = Math.max(0, 1 - distCenter * 0.7);
          pos.setZ(i, z * (1 + puff * 0.9));
        }
        cushionGeo.computeVertexNormals();
        fitFabricUvs(cushionGeo);
        const cushionMesh = new THREE.Mesh(cushionGeo, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
        cushionMesh.castShadow = true;
        cushionMesh.receiveShadow = true;
        group.add(cushionMesh);
        break;
      }

      case "tee":
      case "shirt":
      case "kurung":
      case "kebaya": {
        const isTee = productId === "tee";
        const isShirt = productId === "shirt";
        const isKurung = productId === "kurung";
        const isKebaya = productId === "kebaya";
        const top = isTee ? 1.12 : 1.2;
        const hem = isTee ? -1.12 : isKurung ? -1.55 : -1.28;
        const shoulder = isTee ? 0.48 : 0.52;
        const outerSleeve = isTee ? 1.45 : 1.62;
        const waist = isKebaya ? 0.37 : 0.7;
        const sideHem = isKurung ? -1.48 : hem;
        const garmentShape = new THREE.Shape();
        garmentShape.moveTo(-waist, sideHem);
        garmentShape.lineTo(waist, sideHem);
        garmentShape.lineTo(waist, isKebaya ? -0.2 : 0.35);
        garmentShape.lineTo(1.05, 0.75);
        garmentShape.lineTo(outerSleeve, 0.08);
        garmentShape.lineTo(outerSleeve - 0.3, -0.1);
        garmentShape.lineTo(waist + 0.05, 0.45);
        garmentShape.lineTo(shoulder, top);
        garmentShape.lineTo(0.28, top);
        garmentShape.quadraticCurveTo(0, top - 0.34, -0.28, top);
        garmentShape.lineTo(-shoulder, top);
        garmentShape.lineTo(-waist - 0.05, 0.45);
        garmentShape.lineTo(-outerSleeve + 0.3, -0.1);
        garmentShape.lineTo(-outerSleeve, 0.08);
        garmentShape.lineTo(-1.05, 0.75);
        garmentShape.lineTo(-waist, isKebaya ? -0.2 : 0.35);
        garmentShape.closePath();
        if (isKebaya) {
          garmentShape.moveTo(-0.48, top - 0.02);
          garmentShape.lineTo(0.48, top - 0.02);
          garmentShape.lineTo(0.12, -0.5);
          garmentShape.lineTo(-0.32, -0.5);
          garmentShape.closePath();
        }
        const garmentGeo = new THREE.ExtrudeGeometry(garmentShape, {
          depth: 0.24,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelSize: 0.055,
          bevelThickness: 0.06,
        });
        fitFabricUvs(garmentGeo);
        const garmentMaterial = makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!);
        garmentMaterial.map!.wrapS = THREE.ClampToEdgeWrapping;
        garmentMaterial.map!.wrapT = THREE.ClampToEdgeWrapping;
        const garment = new THREE.Mesh(garmentGeo, garmentMaterial);
        garment.position.z = -0.12;
        garment.castShadow = true;
        group.add(garment);

        if (isShirt) {
          const placket = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.65, 0.035), darkAccentMat);
          placket.position.set(0, 0.04, 0.145);
          group.add(placket);
          for (const y of [0.62, 0.28, -0.06, -0.4]) {
            const button = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), woodMat);
            button.scale.set(1, 1, 0.35);
            button.position.set(0, y, 0.18);
            group.add(button);
          }
          for (const side of [-1, 1]) {
            const collarPoint = new THREE.Shape();
            collarPoint.moveTo(side * 0.28, top - 0.02);
            collarPoint.lineTo(side * 0.55, top + 0.02);
            collarPoint.lineTo(side * 0.3, top - 0.38);
            collarPoint.closePath();
            const collar = new THREE.Mesh(new THREE.ShapeGeometry(collarPoint), makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
            collar.position.z = 0.13;
            group.add(collar);
          }
        }

        // If kurung/kebaya: add longer skirt/flair
        if (isKurung || isKebaya) {
          const skirtGeo = new THREE.CylinderGeometry(isKurung ? 0.72 : 0.78, isKurung ? 1.05 : 1.2, isKurung ? 1.45 : 1.75, 40, 12);
          skirtGeo.scale(isKurung ? 0.92 : 1.1, 1, 0.6);
          const skirtMaterial = makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!);
          const skirt = new THREE.Mesh(skirtGeo, skirtMaterial);
          skirt.position.y = isKurung ? -1.9 : -1.72;
          skirt.castShadow = true;
          group.add(skirt);
        }
        break;
      }

      case "scarf": {
        // Flowing draped scarf curve
        const scarfGeo = new THREE.PlaneGeometry(2.4, 3.2, 32, 32);
        const pos = scarfGeo.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          pos.setZ(i, Math.sin(x * 2.2) * 0.35 + Math.cos(y * 1.8) * 0.25);
        }
        scarfGeo.computeVertexNormals();
        fitFabricUvs(scarfGeo);
        const scarfMaterial = makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!);
        const scarfMesh = new THREE.Mesh(scarfGeo, scarfMaterial);
        scarfMesh.castShadow = true;
        group.add(scarfMesh);
        break;
      }

      case "sarong":
      case "fabric": {
        const isSarong = productId === "sarong";
        const textileGeo = isSarong
          ? new THREE.PlaneGeometry(2.3, 2.8, 36, 32)
          : new THREE.PlaneGeometry(2.5, 3.2, 36, 40);
        const textilePositions = textileGeo.getAttribute("position");
        for (let i = 0; i < textilePositions.count; i++) {
          const x = textilePositions.getX(i);
          const y = textilePositions.getY(i);
          textilePositions.setZ(i, Math.sin(x * 7.5) * 0.065 + Math.sin(y * 1.8) * 0.045);
        }
        textileGeo.computeVertexNormals();
        fitFabricUvs(textileGeo);
        const textileMaterial = makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!);
        const textile = new THREE.Mesh(textileGeo, textileMaterial);
        textile.castShadow = true;
        group.add(textile);

        if (isSarong) {
          const waistband = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.08), darkAccentMat);
          waistband.position.y = 1.36;
          group.add(waistband);
        } else {
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.75, 24), woodMat);
          bolt.rotation.x = Math.PI / 2;
          bolt.position.set(0, -1.52, -0.18);
          group.add(bolt);
        }
        break;
      }

      case "notebook": {
        // Hardcover book
        const bookCoverGeo = new THREE.BoxGeometry(2.1, 2.9, 0.35);
        fitFabricUvs(bookCoverGeo);
        const bookCover = new THREE.Mesh(bookCoverGeo, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
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
        const pos = pouchGeo.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > 0) {
            // taper at top zipper
            pos.setZ(i, pos.getZ(i) * 0.4);
          }
        }
        pouchGeo.computeVertexNormals();
        fitFabricUvs(pouchGeo);
        const pouchMesh = new THREE.Mesh(pouchGeo, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
        pouchMesh.castShadow = true;
        group.add(pouchMesh);

        // Zipper bar on top
        const zipGeo = new THREE.BoxGeometry(2.35, 0.08, 0.1);
        const zip = new THREE.Mesh(zipGeo, darkAccentMat);
        zip.position.y = 0.77;
        group.add(zip);
        break;
      }

      case "apron": {
        const apronBodyGeometry = new THREE.BoxGeometry(1.9, 2.1, 0.14, 12, 16, 2);
        fitFabricUvs(apronBodyGeometry);
        const apronBody = new THREE.Mesh(apronBodyGeometry, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
        apronBody.position.y = -0.15;
        apronBody.castShadow = true;
        group.add(apronBody);

        const apronBibGeometry = new THREE.BoxGeometry(1.05, 1.15, 0.14, 8, 10, 2);
        fitFabricUvs(apronBibGeometry);
        const apronBib = new THREE.Mesh(apronBibGeometry, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
        apronBib.position.y = 1.05;
        apronBib.castShadow = true;
        group.add(apronBib);

        const neckStrap = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.38, 1.52, 0.12),
          new THREE.Vector3(-0.38, 2.05, 0.12),
          new THREE.Vector3(0, 2.22, 0.12),
          new THREE.Vector3(0.38, 2.05, 0.12),
          new THREE.Vector3(0.38, 1.52, 0.12),
        ]);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(neckStrap, 24, 0.045, 8, false), darkAccentMat));

        for (const side of [-1, 1]) {
          const tieCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.9, 0.45, 0.05),
            new THREE.Vector3(side * 1.25, 0.48, 0.05),
            new THREE.Vector3(side * 1.5, 0.35, 0.05),
          ]);
          group.add(new THREE.Mesh(new THREE.TubeGeometry(tieCurve, 12, 0.035, 8, false), darkAccentMat));
        }
        break;
      }

      case "bucket-hat": {
        const crownGeometry = new THREE.CylinderGeometry(0.7, 0.82, 0.82, 40, 12);
        fitFabricUvs(crownGeometry);
        const crown = new THREE.Mesh(crownGeometry, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
        crown.position.y = 0.28;
        crown.castShadow = true;
        group.add(crown);

        const brimGeometry = new THREE.CylinderGeometry(1.1, 0.88, 0.12, 48, 2);
        fitFabricUvs(brimGeometry);
        const brim = new THREE.Mesh(brimGeometry, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
        brim.position.y = -0.2;
        brim.castShadow = true;
        group.add(brim);

        const hatBand = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.035, 8, 40), darkAccentMat);
        hatBand.rotation.x = Math.PI / 2;
        hatBand.position.y = -0.08;
        group.add(hatBand);
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
        fitFabricUvs(runnerGeo);
        const runner = new THREE.Mesh(runnerGeo, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
        runner.position.y = -0.18;
        runner.castShadow = true;
        group.add(runner);
        break;
      }

      case "placemats": {
        for (const [index, x] of [-1.2, -0.4, 0.4, 1.2].entries()) {
          const matGeometry = new THREE.BoxGeometry(1.05, 1.65, 0.07, 10, 16, 1);
          fitFabricUvs(matGeometry);
          const mat = new THREE.Mesh(matGeometry, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
          mat.position.set(x, index % 2 === 0 ? 0 : 0.08, 0.12 - index * 0.08);
          mat.visible = designRef.current.size === "Set of 4" || index === 1 || index === 2;
          mat.userData.placematIndex = index;
          mat.castShadow = true;
          mat.receiveShadow = true;
          group.add(mat);
        }
        break;
      }

      case "tapestry": {
        const tapestryGeometry = new THREE.PlaneGeometry(2.55, 3.15, 32, 28);
        const tapestryPositions = tapestryGeometry.getAttribute("position");
        for (let i = 0; i < tapestryPositions.count; i++) {
          const x = tapestryPositions.getX(i);
          const y = tapestryPositions.getY(i);
          tapestryPositions.setZ(i, Math.sin(x * 2.2) * 0.035 + Math.sin(y * 1.3) * 0.018);
        }
        tapestryGeometry.computeVertexNormals();
        fitFabricUvs(tapestryGeometry);
        const tapestryMaterial = makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!);
        const tapestry = new THREE.Mesh(tapestryGeometry, tapestryMaterial);
        tapestry.castShadow = true;
        group.add(tapestry);

        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.9, 16), woodMat);
        rod.rotation.z = Math.PI / 2;
        rod.position.set(0, 1.63, 0);
        group.add(rod);
        break;
      }

      default: {
        // Fallback smooth display cylinder/box
        const fallbackGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
        const fallbackMesh = new THREE.Mesh(fallbackGeo, makeFabricMaterial((batikMaterial as THREE.MeshStandardMaterial).map!));
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
    const fabricMaterials = fabricMaterialsRef.current;
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 420;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, cameraDistanceRef.current / zoom);
    camera.lookAt(0, 0.12, 0);
    cameraRef.current = camera;

    // 3. Renderer setup
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setRenderError("WebGL is unavailable in this browser. Here's your 2D product preview.");
      setLoading(false);
      return;
    }
    setRenderError("");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) setAutoRotate(false);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);
    renderer.domElement.classList.add("batik-3d-scene");

    // 4. Lighting setup: warm studio studio lighting
    const ambientLight = new THREE.HemisphereLight(0xfff7ea, 0x796b64, 2.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffd7ae, 1.65);
    fillLight.position.set(4, 1.5, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xb2c3e4, 2.4);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    const floorLight = new THREE.DirectionalLight(0xfef2e0, 0.8);
    floorLight.position.set(0, -3, 2);
    scene.add(floorLight);

    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const shadowContext = shadowCanvas.getContext("2d");
    if (shadowContext) {
      const gradient = shadowContext.createRadialGradient(128, 128, 12, 128, 128, 128);
      gradient.addColorStop(0, "rgba(46,35,48,0.24)");
      gradient.addColorStop(0.5, "rgba(46,35,48,0.12)");
      gradient.addColorStop(1, "rgba(46,35,48,0)");
      shadowContext.fillStyle = gradient;
      shadowContext.fillRect(0, 0, 256, 256);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 4.6),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -1.87;
    scene.add(contactShadow);

    // Gallery plinth and a soft pool of light ground the product in the studio.
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.68, 0.22, 64),
      new THREE.MeshStandardMaterial({ color: "#c6b8a6", roughness: 0.78, metalness: 0.02 }),
    );
    plinth.position.y = -1.75;
    plinth.scale.set(1.25, 1, 1.25);
    plinthRef.current = plinth;
    scene.add(plinth);
    const plinthTop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.56, 1.56, 0.035, 64),
      new THREE.MeshStandardMaterial({ color: "#f6eee2", roughness: 0.48 }),
    );
    plinthTop.position.y = -1.62;
    plinthTop.scale.set(1.25, 1, 1.25);
    plinthTopRef.current = plinthTop;
    scene.add(plinthTop);

    // 5. Generate Batik texture & product mesh
    setLoading(true);
    let revealProgress = 0;
    renderBatikCanvas(designRef.current).then((canvas) => {
      if (destroyed) return;

      const currentDesign = designRef.current;

      const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textureRef.current = texture;

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: currentDesign.material === "Satin" ? 0.35 : currentDesign.material === "Linen blend" ? 0.85 : 0.65,
        metalness: currentDesign.material === "Satin" ? 0.12 : 0.02,
        name: "batik-print",
      });

      const productGeometry = createProductMesh(currentDesign.product, material);
      const bounds = new THREE.Box3().setFromObject(productGeometry);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const productFloor = bounds.min.y - center.y;
      productGeometry.position.sub(center);
      productCenterYRef.current = center.y;
      const scale = productSizeScale(currentDesign);
      productGeometry.scale.set(scale.x, scale.y, scale.z);
      productGeometry.position.y += (scale.y - 1) * size.y / 2;
      const model = new THREE.Group();
      model.add(productGeometry);
      modelSizeRef.current = size;
      productGeometryRef.current = productGeometry;
      const plinthRadius = Math.max(1.05, Math.hypot(size.x * scale.x, size.z * scale.z) * 0.34);
      plinth.scale.set(plinthRadius / 1.55, 1, plinthRadius / 1.55);
      plinthTop.scale.set(plinthRadius / 1.56, 1, plinthRadius / 1.56);
      plinth.position.y = productFloor - 0.1275;
      plinthTop.position.y = productFloor - 0.0175;
      contactShadow.position.y = productFloor - 0.24;
      modelGroupRef.current = model;
      fabricMaterials.add(material);
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        for (const candidate of Array.isArray(child.material) ? child.material : [child.material]) {
          const meshMaterial = candidate as THREE.MeshStandardMaterial;
          if (meshMaterial.map === texture) fabricMaterials.add(meshMaterial);
        }
      });
      scene.add(model);
      model.rotation.y = -0.22;
      targetRotationRef.current = { x: model.rotation.x, y: model.rotation.y };
      model.scale.setScalar(1);
      fitCameraRef.current?.();
      model.scale.setScalar(prefersReducedMotion ? 1 : 0.001);
      if (prefersReducedMotion) revealProgress = 1;
      setLoading(false);
    });

    // 6. Interactive drag controls for mouse, pen and touch
    const onPointerDown = (e: PointerEvent) => {
      if ((e.pointerType === "mouse" && e.button !== 0) || activePointerIdRef.current !== null || !modelGroupRef.current) return;
      e.preventDefault();
      activePointerIdRef.current = e.pointerId;
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      if (domEl.setPointerCapture) domEl.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId || !modelGroupRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      modelGroupRef.current.rotation.y += dx * 0.012;
      modelGroupRef.current.rotation.x = Math.max(-0.6, Math.min(0.6, modelGroupRef.current.rotation.x + dy * 0.008));
      targetRotationRef.current = { x: modelGroupRef.current.rotation.x, y: modelGroupRef.current.rotation.y };
      setAutoRotate(false);
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const stopPointerDrag = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      activePointerIdRef.current = null;
      isDraggingRef.current = false;
      if (domEl.hasPointerCapture?.(e.pointerId)) domEl.releasePointerCapture(e.pointerId);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!modelGroupRef.current) return;
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-0.16, 0], ArrowRight: [0.16, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12],
      };
      const direction = directions[e.key];
      if (direction) {
        e.preventDefault();
        targetRotationRef.current.y = (autoRotateRef.current ? modelGroupRef.current.rotation.y : targetRotationRef.current.y) + direction[0];
        targetRotationRef.current.x = Math.max(-0.6, Math.min(0.6, targetRotationRef.current.x + direction[1]));
        setAutoRotate(false);
      }
    };

    const domEl = renderer.domElement;
    domEl.tabIndex = 0;
    domEl.setAttribute("role", "img");
    domEl.setAttribute("aria-label", `${design.name}, interactive 3D ${design.product} preview. Drag to rotate or use the arrow keys.`);
    domEl.addEventListener("pointerdown", onPointerDown);
    domEl.addEventListener("pointermove", onPointerMove);
    domEl.addEventListener("pointerup", stopPointerDrag);
    domEl.addEventListener("pointercancel", stopPointerDrag);
    domEl.addEventListener("lostpointercapture", stopPointerDrag);
    domEl.addEventListener("keydown", onKeyDown);

    // 7. Render Loop
    const animationClock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = animationClock.getDelta();
      if (modelGroupRef.current && autoRotateRef.current && !isDraggingRef.current) {
        modelGroupRef.current.rotation.y += 0.008;
      }
      if (modelGroupRef.current) {
        if (!autoRotateRef.current && !isDraggingRef.current) {
          modelGroupRef.current.rotation.x = THREE.MathUtils.damp(modelGroupRef.current.rotation.x, targetRotationRef.current.x, 10, delta);
          modelGroupRef.current.rotation.y = THREE.MathUtils.damp(modelGroupRef.current.rotation.y, targetRotationRef.current.y, 10, delta);
        }
        const elapsed = performance.now() * 0.001;
        revealProgress = Math.min(1, revealProgress + 0.018);
        const reveal = 1 - (1 - revealProgress) ** 3;
        modelGroupRef.current.scale.setScalar(Math.max(0.001, reveal));
        modelGroupRef.current.position.y = prefersReducedMotion ? 0 : Math.sin(elapsed * 1.15) * 0.015;
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
        fitCameraRef.current?.();
      }
    });
    fitCameraRef.current = () => {
      if (!modelGroupRef.current || !modelSizeRef.current || !container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      const bounds = new THREE.Box3().setFromObject(modelGroupRef.current);
      const centre = bounds.getCenter(new THREE.Vector3());
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      cameraDistanceRef.current = Math.max(
        sphere.radius / Math.sin(verticalFov / 2),
        sphere.radius / Math.sin(horizontalFov / 2),
      ) * 1.3;
      cameraTargetRef.current.copy(centre);
      camera.position.copy(centre).addScaledVector(cameraDirectionRef.current, cameraDistanceRef.current / zoomRef.current);
      camera.lookAt(centre);
    };
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      destroyed = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      fitCameraRef.current = null;
      domEl.removeEventListener("pointerdown", onPointerDown);
      domEl.removeEventListener("pointermove", onPointerMove);
      domEl.removeEventListener("pointerup", stopPointerDrag);
      domEl.removeEventListener("pointercancel", stopPointerDrag);
      domEl.removeEventListener("lostpointercapture", stopPointerDrag);
      domEl.removeEventListener("keydown", onKeyDown);
      if (modelGroupRef.current) {
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        modelGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            geometries.add(child.geometry);
            for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
          }
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
      }
      fabricMaterials.clear();
      textureRef.current?.dispose();
      textureRef.current = null;
      plinth.geometry.dispose();
      (plinth.material as THREE.Material).dispose();
      plinthTop.geometry.dispose();
      (plinthTop.material as THREE.Material).dispose();
      contactShadow.geometry.dispose();
      (contactShadow.material as THREE.Material).dispose();
      shadowTexture.dispose();
      modelGroupRef.current = null;
      productGeometryRef.current = null;
      productCenterYRef.current = 0;
      modelSizeRef.current = null;
      plinthRef.current = null;
      plinthTopRef.current = null;
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      renderer.dispose();
      container.replaceChildren();
    };
  // Product changes replace the model. The following effect refreshes its print; the camera effect handles zoom.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.product]);

  useEffect(() => {
    const geometry = productGeometryRef.current;
    const size = modelSizeRef.current;
    if (!geometry || !size) return;
    const scale = productSizeScale({ product: design.product, size: design.size });
    geometry.scale.set(scale.x, scale.y, scale.z);
    geometry.position.y = -productCenterYRef.current + (scale.y - 1) * size.y / 2;
    geometry.traverse((child) => {
      if (typeof child.userData.placematIndex === "number") child.visible = design.size === "Set of 4" || child.userData.placematIndex === 1 || child.userData.placematIndex === 2;
    });
    const plinthRadius = Math.max(1.05, Math.hypot(size.x * scale.x, size.z * scale.z) * 0.34);
    if (plinthRef.current) plinthRef.current.scale.set(plinthRadius / 1.55, 1, plinthRadius / 1.55);
    if (plinthTopRef.current) plinthTopRef.current.scale.set(plinthRadius / 1.56, 1, plinthRadius / 1.56);
    fitCameraRef.current?.();
  }, [design.product, design.size]);

  // Update the print without rebuilding the model; only the listed design fields affect its texture.
  useEffect(() => {
    if (!hasMountedTextureEffectRef.current) {
      hasMountedTextureEffectRef.current = true;
      return;
    }
    let active = true;
    const updateTimeout = window.setTimeout(() => {
      renderBatikCanvas(design).then((canvas) => {
        if (!active || !modelGroupRef.current) return;
        const previousTexture = textureRef.current;
        const newTexture = new THREE.CanvasTexture(canvas);
        newTexture.wrapS = THREE.RepeatWrapping;
        newTexture.wrapT = THREE.RepeatWrapping;
        newTexture.repeat.set(1, 1);
        newTexture.colorSpace = THREE.SRGBColorSpace;
        newTexture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 1;
        textureRef.current = newTexture;

        fabricMaterialsRef.current.forEach((material) => {
          if (previousTexture && material.map === previousTexture) {
            material.map = newTexture;
            material.roughness = design.material === "Satin" ? 0.35 : design.material === "Linen blend" ? 0.85 : 0.65;
            material.metalness = design.material === "Satin" ? 0.12 : 0.02;
            material.needsUpdate = true;
          }
        });
        previousTexture?.dispose();
      });
    }, 50);
    return () => {
      active = false;
      window.clearTimeout(updateTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    design.secondaryScale,
    design.secondaryX,
    design.secondaryY,
    design.secondaryRotation,
    design.secondaryOpacity,
    design.layers,
    design.customShape,
    design.customCenter,
    design.customCount,
    design.customMotifImage,
    design.placement,
    design.border,
    design.monogram,
    design.monogramFont,
    design.monogramColor,
    design.textSize,
    design.textX,
    design.textY,
    design.texture,
    design.material,
    design.opacity,
  ]);

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.copy(cameraTargetRef.current).addScaledVector(cameraDirectionRef.current, cameraDistanceRef.current / zoom);
      cameraRef.current.lookAt(cameraTargetRef.current);
    }
  }, [zoom]);

  return (
    <div ref={viewerRef} style={{ background: previewStages.find((stage) => stage.id === previewStage)!.background }} className={`batik-3d-viewer relative w-full h-full select-none cursor-grab active:cursor-grabbing ${className}`}>
      <div ref={mountRef} className="w-full h-full min-h-[340px] touch-none" aria-label={`${design.name}, interactive 3D ${design.product} preview. Drag to rotate or focus and use the arrow keys.`} />
      {renderError && <div className="absolute inset-0 grid place-items-center bg-[#f4eee5] p-5" role="status"><div className="max-w-xs text-center"><p className="text-xs font-semibold text-[#514267]">{renderError}</p><img className="mt-3 max-h-56 w-full object-contain" src={designImage(design)} alt={`${design.name} 2D product preview`} /></div></div>}

      {/* Floating 3D Control overlay */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={() => turnModel(-Math.PI / 4)}
          className="grid size-8 place-items-center rounded-full border border-white/70 bg-white/70 text-[#29243a] shadow-md backdrop-blur-md transition-colors hover:bg-white"
          title="Turn product left 45 degrees"
          aria-label="Turn product left 45 degrees"
        >
          <RotateCcw size={15} />
        </button>
        <button
          type="button"
          onClick={() => turnModel(Math.PI / 4)}
          className="grid size-8 place-items-center rounded-full border border-white/70 bg-white/70 text-[#29243a] shadow-md backdrop-blur-md transition-colors hover:bg-white"
          title="Turn product right 45 degrees"
          aria-label="Turn product right 45 degrees"
        >
          <RotateCw size={15} />
        </button>
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => {
            if (prev && modelGroupRef.current) {
              targetRotationRef.current = {
                x: modelGroupRef.current.rotation.x,
                y: modelGroupRef.current.rotation.y,
              };
            }
            return !prev;
          })}
          className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
            autoRotate
              ? "bg-[#29243a] text-[#fff5e8] border-white/30 shadow-lg backdrop-blur-md"
              : "bg-white/70 text-[#29243a] border-white/70 hover:bg-white shadow-md backdrop-blur-md"
          }`}
          title={autoRotate ? "Pause product spin" : "Play product spin"}
          aria-label={autoRotate ? "Pause product spin" : "Play product spin"}
          aria-pressed={autoRotate}
        >
          {autoRotate ? "↻ Pause spin" : "↻ Play spin"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (modelGroupRef.current) {
              targetRotationRef.current = { x: 0, y: 0 };
              setAutoRotate(false);
            }
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white/70 text-[#29243a] border border-white/70 hover:bg-white transition-colors shadow-md backdrop-blur-md"
          title="Reset 3D view orientation"
          aria-label="Reset 3D view orientation"
        >
          Reset view
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="grid size-8 place-items-center rounded-full border border-white/70 bg-white/70 text-[#29243a] shadow-md backdrop-blur-md transition-colors hover:bg-white"
          title={fullscreen ? "Exit full-screen view" : "Inspect in full screen"}
          aria-label={fullscreen ? "Exit full-screen 3D view" : "Inspect 3D model in full screen"}
        >
          {fullscreen ? <Minimize2 size={15} /> : <Expand size={15} />}
        </button>
      </div>

      {fullscreenError && <p className="absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#282338]/85 px-3 py-2 text-center text-xs text-[#fff5e8]" role="status">{fullscreenError}</p>}
      {captureNotice && <p className="absolute top-14 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#282338]/85 px-3 py-2 text-center text-xs text-[#fff5e8]" role="status" aria-live="polite">{captureNotice}</p>}

      {loading && (
        <div className="absolute inset-0 grid place-items-center bg-[#f4eee5]/70 backdrop-blur-xs text-xs font-semibold text-[#514267]">
          <span>Generating 3D canvas…</span>
        </div>
      )}

      <div className="batik-3d-instructions absolute bottom-4 left-4 pointer-events-none rounded-full border border-white/50 bg-[#282338]/75 px-3.5 py-2 text-[10px] font-semibold tracking-wide text-[#fff5e8] shadow-lg backdrop-blur-md">
        <span className="mr-2 text-[#efb985]">✦</span>Drag to explore · Your print, in motion
      </div>
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-full border border-white/50 bg-white/55 p-1 shadow-md backdrop-blur-md" role="group" aria-label="3D preview lighting and export">
        {previewStages.map((stage) => <button key={stage.id} type="button" onClick={() => setPreviewStage(stage.id)} aria-pressed={previewStage === stage.id} className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${previewStage === stage.id ? "bg-[#29243a] text-[#fff5e8]" : "text-[#29243a] hover:bg-white/75"}`}>{stage.label}</button>)}
        <button type="button" onClick={save3DStill} disabled={loading || !!renderError} title="Save this camera angle as a transparent PNG" aria-label="Save transparent 3D product PNG" className="grid size-7 place-items-center rounded-full text-[#29243a] hover:bg-white/75 disabled:opacity-40"><Download size={14} /></button>
      </div>
    </div>
  );
}
