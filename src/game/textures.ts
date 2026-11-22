import * as THREE from 'three';

export interface ProceduralTextures {
  roadAlbedo: THREE.CanvasTexture;
  roadBump: THREE.CanvasTexture;
  plasterBump: THREE.CanvasTexture;
  awningOrange: THREE.CanvasTexture;
  awningTeal: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  telegraphRing: THREE.CanvasTexture;
  clockFace: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(
  maxAnisotropy: number,
): ProceduralTextures {
  const aniso = Math.min(Math.max(1, maxAnisotropy), 8);

  // 1. Furfuri Nagar Sunlit Bazaar Street (3 clear lanes, terracotta curbs, warm sandstone pavers)
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rctx = roadCanvas.getContext('2d')!;

  // Warm sun-baked tarmac base
  rctx.fillStyle = '#5a4e46';
  rctx.fillRect(0, 0, 512, 512);

  // Subtle cobbled grain & sun dust
  for (let y = 0; y < 512; y += 16) {
    for (let x = 0; x < 512; x += 24) {
      const shade = 82 + ((x * 7 + y * 13) % 16);
      rctx.fillStyle = `rgb(${shade + 6}, ${shade - 4}, ${shade - 12})`;
      rctx.fillRect(x + ((y / 16) % 2) * 8, y, 22, 14);
    }
  }

  // Terracotta sandstone sidewalks / curbs on left and right margins
  rctx.fillStyle = '#b96945';
  rctx.fillRect(0, 0, 44, 512);
  rctx.fillRect(468, 0, 44, 512);

  // Cream/terracotta painted curb blocks
  for (let y = 0; y < 512; y += 64) {
    rctx.fillStyle = (y / 64) % 2 === 0 ? '#f3dfc1' : '#c84b31';
    rctx.fillRect(42, y, 12, 64);
    rctx.fillRect(458, y, 12, 64);
  }

  // Painted warm cream dashed lane dividers between lanes (at 1/3 and 2/3 of road interior)
  rctx.fillStyle = '#f6dfb2';
  for (let y = 20; y < 512; y += 96) {
    rctx.fillRect(184, y, 10, 52);
    rctx.fillRect(318, y, 10, 52);
  }

  // Subtle wheel tracks in the 3 lanes
  rctx.fillStyle = 'rgba(42, 30, 24, 0.16)';
  rctx.fillRect(88, 0, 58, 512);
  rctx.fillRect(227, 0, 58, 512);
  rctx.fillRect(366, 0, 58, 512);

  const roadAlbedo = new THREE.CanvasTexture(roadCanvas);
  roadAlbedo.colorSpace = THREE.SRGBColorSpace;
  roadAlbedo.wrapS = THREE.RepeatWrapping;
  roadAlbedo.wrapT = THREE.RepeatWrapping;
  roadAlbedo.repeat.set(1, 14);
  roadAlbedo.anisotropy = aniso;

  // 2. Road Bump Map (linear NoColorSpace)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    const v = 90 + ((i * 29) % 85);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(x, y, 4, 4);
  }
  const roadBump = new THREE.CanvasTexture(bumpCanvas);
  roadBump.wrapS = THREE.RepeatWrapping;
  roadBump.wrapT = THREE.RepeatWrapping;
  roadBump.repeat.set(2, 24);

  // 3. Stucco Plaster Bump Map (linear)
  const plasterCanvas = document.createElement('canvas');
  plasterCanvas.width = 256;
  plasterCanvas.height = 256;
  const pctx = plasterCanvas.getContext('2d')!;
  pctx.fillStyle = '#808080';
  pctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i++) {
    const x = (i * 71) % 256;
    const y = (i * 113) % 256;
    const v = 108 + ((i * 19) % 44);
    pctx.fillStyle = `rgb(${v},${v},${v})`;
    pctx.fillRect(x, y, 8, 5);
  }
  const plasterBump = new THREE.CanvasTexture(plasterCanvas);
  plasterBump.wrapS = THREE.RepeatWrapping;
  plasterBump.wrapT = THREE.RepeatWrapping;
  plasterBump.repeat.set(2, 2);

  // 4. Striped Bazaar Awnings
  const makeAwning = (c1: string, c2: string): THREE.CanvasTexture => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = (x / 32) % 2 === 0 ? c1 : c2;
      ctx.fillRect(x, 0, 32, 256);
    }
    // Decorative scalloped border hem
    ctx.fillStyle = '#5c2810';
    ctx.fillRect(0, 232, 256, 8);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = aniso;
    return tex;
  };
  const awningOrange = makeAwning('#e85d1a', '#fff4dc');
  const awningTeal = makeAwning('#1a8c7a', '#fff4dc');

  // 5. Soft Radial Contact Shadow Disc
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(30, 14, 6, 0.65)');
  grad.addColorStop(0.6, 'rgba(30, 14, 6, 0.28)');
  grad.addColorStop(1, 'rgba(30, 14, 6, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  // 6. Telegraph Target Ring (crimson/amber warning ring on ground)
  const ringCanvas = document.createElement('canvas');
  ringCanvas.width = 128;
  ringCanvas.height = 128;
  const tctx = ringCanvas.getContext('2d')!;
  tctx.clearRect(0, 0, 128, 128);
  tctx.strokeStyle = '#ff3b1f';
  tctx.lineWidth = 10;
  tctx.beginPath();
  tctx.arc(64, 64, 52, 0, Math.PI * 2);
  tctx.stroke();
  tctx.strokeStyle = '#ffcf40';
  tctx.lineWidth = 4;
  tctx.setLineDash([12, 8]);
  tctx.beginPath();
  tctx.arc(64, 64, 38, 0, Math.PI * 2);
  tctx.stroke();
  const telegraphRing = new THREE.CanvasTexture(ringCanvas);
  telegraphRing.colorSpace = THREE.SRGBColorSpace;

  // 7. Furfuri Clocktower Face
  const clockCanvas = document.createElement('canvas');
  clockCanvas.width = 256;
  clockCanvas.height = 256;
  const cctx = clockCanvas.getContext('2d')!;
  cctx.fillStyle = '#fdf3dc';
  cctx.beginPath();
  cctx.arc(128, 128, 120, 0, Math.PI * 2);
  cctx.fill();
  cctx.strokeStyle = '#5c3416';
  cctx.lineWidth = 14;
  cctx.stroke();
  // Hour ticks
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    cctx.strokeStyle = '#381e0c';
    cctx.lineWidth = i % 3 === 0 ? 8 : 4;
    cctx.beginPath();
    cctx.moveTo(128 + Math.cos(a) * 86, 128 + Math.sin(a) * 86);
    cctx.lineTo(128 + Math.cos(a) * 106, 128 + Math.sin(a) * 106);
    cctx.stroke();
  }
  // Clock hands (pointing to 10:10)
  cctx.strokeStyle = '#241208';
  cctx.lineWidth = 9;
  cctx.lineCap = 'round';
  cctx.beginPath();
  cctx.moveTo(128, 128);
  cctx.lineTo(82, 92);
  cctx.stroke();
  cctx.lineWidth = 6;
  cctx.beginPath();
  cctx.moveTo(128, 128);
  cctx.lineTo(176, 80);
  cctx.stroke();
  cctx.fillStyle = '#d98a16';
  cctx.beginPath();
  cctx.arc(128, 128, 10, 0, Math.PI * 2);
  cctx.fill();
  const clockFace = new THREE.CanvasTexture(clockCanvas);
  clockFace.colorSpace = THREE.SRGBColorSpace;
  clockFace.anisotropy = aniso;

  return {
    roadAlbedo,
    roadBump,
    plasterBump,
    awningOrange,
    awningTeal,
    contactShadow,
    telegraphRing,
    clockFace,
    dispose: () => {
      roadAlbedo.dispose();
      roadBump.dispose();
      plasterBump.dispose();
      awningOrange.dispose();
      awningTeal.dispose();
      contactShadow.dispose();
      telegraphRing.dispose();
      clockFace.dispose();
    },
  };
}
