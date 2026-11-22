import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  LANE_X,
  TARGET_DISTANCE,
  buildHudSnapshot,
  createInitialGameState,
  startNewRun,
  stepGame,
  type GameState,
} from './engine';
import {
  buildArchModel,
  buildAutoRickshawModel,
  buildBananaBombModel,
  buildBazaarBuilding,
  buildClocktowerLandmark,
  buildCrateModel,
  buildGoonModel,
  buildJohnCartModel,
  buildMotuModel,
  buildPalmTree,
  buildPatluModel,
  buildStreetGarland,
  createSharedModelAssets,
  type RunnerRig,
  type SharedModelAssets,
} from './models';
import { SoundEngine } from './audio';
import { createProceduralTextures, type ProceduralTextures } from './textures';
import type { GameEvent, HudSnapshot, InputIntents, ObstacleKind } from './types';

// Pre-allocated scratch helpers (zero GC inside animation loop)
const _vec3 = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  colorHex: number;
}

const MAX_PARTICLES = 180;
const BUILDING_COLORS = [0xf29f67, 0xf6c65b, 0x5ab4ac, 0xe87b75, 0xf3d48c, 0x76b7c5];

export interface GameControllerCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onBestScoreChange: (best: number) => void;
}

function detectSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class FurfuriGameScene {
  private container: HTMLElement;
  private callbacks: GameControllerCallbacks;
  private sound: SoundEngine;
  private isSoftwareGl: boolean;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextures;
  private sharedAssets: SharedModelAssets;

  private state: GameState;
  private motuRig: RunnerRig;
  private patluRig: RunnerRig;
  private johnMesh: THREE.Group;
  private clocktower: THREE.Group;

  // Recycling street props
  private sceneryBlocks: THREE.Group[] = [];
  private garlands: THREE.Group[] = [];

  // Dynamic active entity meshes keyed by entity id
  private obstacleMeshes = new Map<number, THREE.Group>();
  private pickupMeshes = new Map<number, THREE.Mesh>();

  // Pooled particle InstancedMesh
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;

  // Input hub (held vs single-frame edge triggers)
  private heldKeys = new Set<string>();
  private queuedIntents: InputIntents = {
    moveLeft: false,
    moveRight: false,
    jumpPressed: false,
    jumpHeld: false,
    slidePressed: false,
    powerPressed: false,
    switchRunnerPressed: false,
  };

  // Loop & timing
  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private titleTime = 0;
  private lastHudPushMs = 0;
  private lastPushedPhase = '';
  private lastPushedHearts = -1;
  private lastPushedRunner = '';
  private lastPushedSamosas = -1;
  private lastPushedPower = false;
  private contextLost = false;

  // Swipe tracking
  private touchStartX = 0;
  private touchStartY = 0;

  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    sound: SoundEngine,
    callbacks: GameControllerCallbacks,
    initialBestScore: number,
    autoStart: boolean,
  ) {
    this.container = container;
    this.sound = sound;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();

    this.state = createInitialGameState(
      initialBestScore,
      (Date.now() ^ 0x517cc1b7) >>> 0,
      autoStart ? 'playing' : 'title',
    );

    const width = Math.max(container.clientWidth, window.innerWidth, 320);
    const height = Math.max(container.clientHeight, window.innerHeight, 240);

    // 1. Renderer setup with studio PBR pipeline & software-WebGL guard
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'game-canvas');
    container.appendChild(this.renderer.domElement);

    // WebGL context loss safety
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);

    // 2. Scene, Horizon-Matched Fog & Studio RoomEnvironment
    this.scene = new THREE.Scene();
    const horizonHex = 0xf4cfa0;
    this.scene.background = new THREE.Color(horizonHex);
    this.scene.fog = new THREE.Fog(horizonHex, 48, 155);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(56, width / height, 0.2, 240);
    this.camera.position.set(2.4, 3.2, 7.6);
    this.camera.lookAt(-0.4, 1.4, -10);

    // 4. Warm/Cool Golden-Afternoon Studio Rig
    const hemi = new THREE.HemisphereLight(0x88d4f2, 0xc77d48, 0.92);
    hemi.position.set(0, 60, 0);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0d1, 1.95);
    sun.position.set(24, 38, 18);
    if (!this.isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1024;
      sun.shadow.mapSize.height = 1024;
      sun.shadow.camera.near = 4;
      sun.shadow.camera.far = 110;
      const d = 28;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0005;
      sun.shadow.normalBias = 0.02;
    }
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(0xffb45c, 0.55);
    rim.position.set(-18, 14, -26);
    this.scene.add(rim);

    // 5. Procedural Textures & Shared Assets
    this.textures = createProceduralTextures(
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    this.sharedAssets = createSharedModelAssets(this.textures);

    // 6. Build Extended World Terrain, Road, Bazaar Shopfronts, Palms & Clocktower
    this.buildEnvironment();

    // 7. Build Hero Duo (Motu & Patlu) and John the Don's Getaway Cart
    this.motuRig = buildMotuModel(this.sharedAssets);
    this.patluRig = buildPatluModel(this.sharedAssets);
    this.scene.add(this.motuRig.root, this.patluRig.root);

    this.johnMesh = buildJohnCartModel(this.sharedAssets);
    this.johnMesh.visible = false;
    this.scene.add(this.johnMesh);

    this.clocktower = buildClocktowerLandmark(this.textures);
    this.clocktower.position.set(0, 0, -108);
    this.scene.add(this.clocktower);

    // 8. Pooled InstancedMesh Particle System (Zero GC)
    const partGeo = new THREE.DodecahedronGeometry(0.14, 0);
    const partMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.15,
    });
    this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 0.001,
        colorHex: 0xffd23f,
      });
      _mat4.makeScale(0.0001, 0.0001, 0.0001);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, _color.setHex(0xffd23f));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.particleMesh);

    // Pre-warm shaders on GPU
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind input & resize listeners
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart, {
      passive: true,
    });
    this.renderer.domElement.addEventListener('touchend', this.onTouchEnd, {
      passive: true,
    });

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Initial sync & push first HUD snapshot
    this.syncWorldMeshes(0);
    this.pushHud(true);

    // Start paced render loop
    this.lastTimeMs = performance.now();
    this.tick();
  }

  private buildEnvironment(): void {
    // Extended warm sun-baked ochre ground plane (never boxed in an empty void)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xd6a16c,
      roughness: 0.94,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(380, 380), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.04, -55);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Sunlit Sky Dome (warm golden horizon -> bright Indian afternoon cerulean zenith)
    const skyGeo = new THREE.SphereGeometry(210, 24, 16);
    const skyPos = skyGeo.attributes.position;
    const colors: number[] = [];
    const lowCol = new THREE.Color(0xf5cf9c);
    const midCol = new THREE.Color(0x9bd7f0);
    const topCol = new THREE.Color(0x3b9be0);
    const tmp = new THREE.Color();
    for (let i = 0; i < skyPos.count; i++) {
      const y = skyPos.getY(i);
      const t = THREE.MathUtils.clamp((y + 10) / 145, 0, 1);
      if (t < 0.35) {
        tmp.lerpColors(lowCol, midCol, t / 0.35);
      } else {
        tmp.lerpColors(midCol, topCol, (t - 0.35) / 0.65);
      }
      colors.push(tmp.r, tmp.g, tmp.b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const skyMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Distant warm sandstone hills framing the horizon naturally
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0xc98b5b,
      roughness: 0.92,
      metalness: 0.0,
    });
    const hillConfigs: [number, number, number, number][] = [
      [-65, -135, 42, 24],
      [68, -140, 48, 28],
      [-95, -90, 36, 18],
      [92, -85, 38, 20],
    ];
    for (const [hx, hz, r, h] of hillConfigs) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), hillMat);
      hill.position.set(hx, h / 2 - 2, hz);
      this.scene.add(hill);
    }

    // Main Furfuri Bazaar Road strip (3 wide lanes = 11.4m wide, offset +0.02 above terrain)
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.textures.roadAlbedo,
      bumpMap: this.textures.roadBump,
      bumpScale: 0.06,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.04,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(12.2, 220), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -78);
    road.receiveShadow = true;
    this.scene.add(road);

    // Repeating colorful Furfuri Nagar Bazaar street blocks on left & right sides
    const blockSpacing = 14.5;
    for (let i = 0; i < 11; i++) {
      const block = new THREE.Group();
      const z = 14 - i * blockSpacing;
      block.position.z = z;

      // Left shopfront
      const leftColor = BUILDING_COLORS[i % BUILDING_COLORS.length];
      const leftHeight = 6.8 + ((i * 3) % 4) * 1.1;
      const leftBldg = buildBazaarBuilding(
        this.textures,
        leftColor,
        i % 2 === 0,
        7.6,
        leftHeight,
        8.6,
      );
      leftBldg.position.set(-10.4, 0, 0);
      block.add(leftBldg);

      // Right shopfront (rotated PI to face inward toward the street)
      const rightColor = BUILDING_COLORS[(i + 2) % BUILDING_COLORS.length];
      const rightHeight = 6.5 + ((i * 5) % 4) * 1.15;
      const rightBldg = buildBazaarBuilding(
        this.textures,
        rightColor,
        i % 2 === 1,
        7.6,
        rightHeight,
        8.6,
      );
      rightBldg.position.set(10.4, 0, 0);
      rightBldg.rotation.y = Math.PI;
      block.add(rightBldg);

      // Roadside tropical palm trees alternating between shop blocks
      const palm = buildPalmTree();
      const palmSide = i % 2 === 0 ? -1 : 1;
      palm.position.set(palmSide * 7.6, 0, 6.2);
      palm.scale.setScalar(0.88 + (i % 3) * 0.14);
      palm.rotation.y = i * 1.1;
      block.add(palm);

      this.scene.add(block);
      this.sceneryBlocks.push(block);
    }

    // Overhead festive marigold bunting garlands strung across the bazaar
    for (let i = 0; i < 6; i++) {
      const garland = buildStreetGarland();
      garland.position.z = -4 - i * 24;
      this.scene.add(garland);
      this.garlands.push(garland);
    }
  }

  // Public Control API for React Game Shell
  public startGame(): void {
    this.clearDynamicMeshes();
    this.state = startNewRun(this.state);
    this.heldKeys.clear();
    this.resetQueuedIntents();
    this.pushHud(true);
  }

  public togglePause(): void {
    if (this.state.phase === 'playing') {
      this.state.phase = 'paused';
      this.heldKeys.clear();
      this.pushHud(true);
    } else if (this.state.phase === 'paused') {
      this.state.phase = 'playing';
      this.lastTimeMs = performance.now();
      this.pushHud(true);
    }
  }

  public returnToTitle(): void {
    this.clearDynamicMeshes();
    this.state = createInitialGameState(
      this.state.bestScore,
      (Date.now() ^ 0x1234567) >>> 0,
      'title',
    );
    this.heldKeys.clear();
    this.resetQueuedIntents();
    this.pushHud(true);
  }

  public triggerAction(
    action: 'left' | 'right' | 'jump' | 'slide' | 'power' | 'switch',
  ): void {
    if (this.state.phase !== 'playing') return;
    if (action === 'left') this.queuedIntents.moveLeft = true;
    if (action === 'right') this.queuedIntents.moveRight = true;
    if (action === 'jump') {
      this.queuedIntents.jumpPressed = true;
      this.queuedIntents.jumpHeld = true;
    }
    if (action === 'slide') this.queuedIntents.slidePressed = true;
    if (action === 'power') this.queuedIntents.powerPressed = true;
    if (action === 'switch') this.queuedIntents.switchRunnerPressed = true;
  }

  public getPhase(): string {
    return this.state.phase;
  }

  private resetQueuedIntents(): void {
    this.queuedIntents.moveLeft = false;
    this.queuedIntents.moveRight = false;
    this.queuedIntents.jumpPressed = false;
    this.queuedIntents.jumpHeld = false;
    this.queuedIntents.slidePressed = false;
    this.queuedIntents.powerPressed = false;
    this.queuedIntents.switchRunnerPressed = false;
  }

  private clearDynamicMeshes(): void {
    for (const mesh of this.obstacleMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.obstacleMeshes.clear();
    for (const mesh of this.pickupMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.pickupMeshes.clear();
  }

  // Input Event Listeners
  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;

    // Title-to-Start handshake on Enter / Space
    if (this.state.phase === 'title' && (code === 'Enter' || code === 'Space')) {
      e.preventDefault();
      this.startGame();
      return;
    }

    // Pause / Resume on Escape or P
    if (code === 'Escape' || code === 'KeyP') {
      if (this.state.phase === 'playing' || this.state.phase === 'paused') {
        e.preventDefault();
        this.togglePause();
        return;
      }
    }

    // Quick Restart on R during playing or paused
    if (code === 'KeyR' && (this.state.phase === 'playing' || this.state.phase === 'paused')) {
      e.preventDefault();
      this.startGame();
      return;
    }

    if (this.state.phase !== 'playing') return;

    const alreadyHeld = this.heldKeys.has(code);
    this.heldKeys.add(code);

    if (
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'Space'
    ) {
      e.preventDefault();
    }

    if (!alreadyHeld) {
      if (code === 'ArrowLeft' || code === 'KeyA') this.queuedIntents.moveLeft = true;
      if (code === 'ArrowRight' || code === 'KeyD') this.queuedIntents.moveRight = true;
      if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
        this.queuedIntents.jumpPressed = true;
      }
      if (code === 'ArrowDown' || code === 'KeyS') this.queuedIntents.slidePressed = true;
      if (code === 'KeyE' || code === 'KeyF' || code === 'ShiftLeft' || code === 'ShiftRight') {
        this.queuedIntents.powerPressed = true;
      }
      if (code === 'KeyQ' || code === 'Tab') {
        e.preventDefault();
        this.queuedIntents.switchRunnerPressed = true;
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private onWindowBlur = (): void => {
    this.heldKeys.clear();
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.heldKeys.clear();
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 0) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (this.state.phase !== 'playing' || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 26) return;
    if (absX > absY) {
      if (dx > 0) this.queuedIntents.moveRight = true;
      else this.queuedIntents.moveLeft = true;
    } else {
      if (dy < 0) {
        this.queuedIntents.jumpPressed = true;
        this.queuedIntents.jumpHeld = true;
      } else {
        this.queuedIntents.slidePressed = true;
      }
    }
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
  };

  private onContextRestored = (): void => {
    this.contextLost = false;
  };

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 240);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Particle Spawner (Zero-GC ring buffer)
  private spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    colorHex: number,
    speed: number,
    size = 0.16,
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.4;
      p.y = y + Math.random() * 0.35;
      p.z = z + (Math.random() - 0.5) * 0.4;
      const angle = Math.random() * Math.PI * 2;
      const horiz = (0.4 + Math.random() * 0.8) * speed;
      p.vx = Math.cos(angle) * horiz;
      p.vy = (0.5 + Math.random() * 0.9) * speed;
      p.vz = Math.sin(angle) * horiz;
      p.maxLife = 0.32 + Math.random() * 0.35;
      p.life = p.maxLife;
      p.size = size * (0.7 + Math.random() * 0.6);
      p.colorHex = colorHex;
    }
  }

  private handleGameEvents(events: GameEvent[]): void {
    this.sound.playEvents(events);
    for (const ev of events) {
      const ex = ev.x ?? this.state.playerX;
      const ey = ev.y ?? this.state.playerY + 0.8;
      const ez = ev.z ?? 0;

      if (ev.type === 'samosa') {
        this.spawnParticles(ex, ey, ez, 8, 0xffd23f, 4.5, 0.14);
      } else if (ev.type === 'jump' || ev.type === 'land' || ev.type === 'lane_switch') {
        this.spawnParticles(ex, 0.15, ez, 5, 0xe8c396, 3.2, 0.13);
      } else if (ev.type === 'double_jump') {
        this.spawnParticles(ex, ey, ez, 10, 0xfff066, 5.2, 0.16);
      } else if (ev.type === 'power_start') {
        this.spawnParticles(ex, ey, ez, 24, 0xff9d00, 8.5, 0.24);
      } else if (ev.type === 'smash' || ev.type === 'john_strike') {
        this.spawnParticles(ex, ey, ez, 20, 0xff5a1f, 9.0, 0.22);
        this.spawnParticles(ex, ey, ez, 10, 0xffd23f, 7.5, 0.18);
      } else if (ev.type === 'hurt') {
        this.spawnParticles(ex, ey, ez, 16, 0xff3b1f, 6.8, 0.2);
      } else if (ev.type === 'switch_runner') {
        this.spawnParticles(ex, ey, ez, 12, 0xffe484, 5.5, 0.16);
      } else if (ev.type === 'victory') {
        this.spawnParticles(0, 2.2, -2, 30, 0xffd23f, 9.5, 0.25);
        this.callbacks.onBestScoreChange(this.state.bestScore);
      } else if (ev.type === 'gameover') {
        this.callbacks.onBestScoreChange(this.state.bestScore);
      }
    }
  }

  private getOrCreateObstacleMesh(id: number, kind: ObstacleKind): THREE.Group {
    let mesh = this.obstacleMeshes.get(id);
    if (!mesh) {
      switch (kind) {
        case 'crate':
          mesh = buildCrateModel(this.sharedAssets);
          break;
        case 'arch':
          mesh = buildArchModel(this.sharedAssets);
          break;
        case 'goon':
          mesh = buildGoonModel(this.sharedAssets);
          break;
        case 'rickshaw':
          mesh = buildAutoRickshawModel(this.sharedAssets);
          break;
        case 'banana':
          mesh = buildBananaBombModel(this.sharedAssets);
          break;
      }
      this.scene.add(mesh);
      this.obstacleMeshes.set(id, mesh);
    }
    return mesh;
  }

  private syncWorldMeshes(dt: number): void {
    const st = this.state;

    // 1. Scroll road texture, bazaar shopfronts & garlands when playing
    if (st.phase === 'playing') {
      const moveZ = st.speed * dt;
      this.textures.roadAlbedo.offset.y -= moveZ * 0.068;
      this.textures.roadBump.offset.y -= moveZ * 0.11;

      for (const block of this.sceneryBlocks) {
        block.position.z += moveZ;
        if (block.position.z > 24) {
          block.position.z -= this.sceneryBlocks.length * 14.5;
        }
      }
      for (const g of this.garlands) {
        g.position.z += moveZ;
        if (g.position.z > 18) {
          g.position.z -= this.garlands.length * 24;
        }
      }
    }

    // Subtle garland breeze sway even on title screen
    const sway = Math.sin(this.titleTime * 2.1) * 0.04;
    for (let i = 0; i < this.garlands.length; i++) {
      this.garlands[i].rotation.x = sway * (i % 2 === 0 ? 1 : -1);
    }

    // Approaching Furfuri Clocktower Landmark (always visible on the horizon, arrives at 1000m!)
    const remaining = Math.max(0, TARGET_DISTANCE - st.distance);
    const towerZ =
      st.phase === 'title'
        ? -102
        : -Math.max(16, Math.min(116, remaining * 0.11 + 16));
    this.clocktower.position.z = towerZ;

    // 2. Position & Animate Hero Duo (Motu & Patlu)
    const activeRig = st.runner === 'motu' ? this.motuRig : this.patluRig;
    const partnerRig = st.runner === 'motu' ? this.patluRig : this.motuRig;

    if (st.phase === 'title') {
      // Diegetic Awakening on Title Screen: Motu & Patlu stand ready together slightly right of center
      const bob = Math.sin(this.titleTime * 2.6) * 0.045;
      this.motuRig.root.position.set(1.05, 0, 0.2);
      this.motuRig.bodyGroup.rotation.set(0, -0.35, 0); // face camera cheerfully
      this.motuRig.bodyGroup.scale.set(1, 1 + bob * 0.35, 1);
      this.motuRig.leftArm.rotation.x = Math.sin(this.titleTime * 2.6) * 0.18;
      this.motuRig.rightArm.rotation.x = -0.5 + Math.sin(this.titleTime * 3.8) * 0.22; // friendly wave!
      this.motuRig.leftLeg.rotation.x = 0;
      this.motuRig.rightLeg.rotation.x = 0;
      (this.motuRig.auraRing.material as THREE.MeshBasicMaterial).opacity = 0;

      this.patluRig.root.position.set(2.55, 0, -0.45);
      this.patluRig.bodyGroup.rotation.set(0, -0.52, 0);
      this.patluRig.bodyGroup.scale.set(1, 1 - bob * 0.25, 1);
      this.patluRig.leftArm.rotation.x = -0.15;
      this.patluRig.rightArm.rotation.x = 0.2 + Math.cos(this.titleTime * 2.6) * 0.15;
      this.patluRig.leftLeg.rotation.x = 0;
      this.patluRig.rightLeg.rotation.x = 0;
      (this.patluRig.auraRing.material as THREE.MeshBasicMaterial).opacity = 0;
      if (this.patluRig.ideaBulb) {
        (this.patluRig.ideaBulb.material as THREE.MeshStandardMaterial).opacity =
          0.35 + Math.sin(this.titleTime * 4) * 0.2;
      }
    } else {
      // Gameplay Running / Jumping / Sliding / KO Topple
      const gait = st.runCycleDist * 1.45;
      const isSliding = st.slideTimer > 0;
      const isPower = st.powerTimer > 0;

      activeRig.root.position.set(st.playerX, 0, 0);
      activeRig.bodyGroup.position.y = st.playerY + (st.grounded ? Math.abs(Math.sin(gait)) * 0.12 : 0);

      if (st.phase === 'ko_beat' || st.phase === 'gameover') {
        activeRig.bodyGroup.rotation.set(-0.9, Math.PI + this.titleTime * 6, 0.4);
      } else if (isSliding) {
        activeRig.bodyGroup.rotation.set(-0.85, Math.PI, st.leanAngle);
      } else {
        activeRig.bodyGroup.rotation.set(0.12, Math.PI, st.leanAngle);
      }

      activeRig.bodyGroup.scale.set(
        st.squashX * (isPower ? 1.12 : 1),
        (isSliding ? 0.55 : st.squashY) * (isPower ? 1.12 : 1),
        st.squashX * (isPower ? 1.12 : 1),
      );

      const swing = st.grounded && !isSliding ? Math.sin(gait) * 0.95 : 0.45;
      activeRig.leftArm.rotation.x = swing;
      activeRig.rightArm.rotation.x = -swing;
      activeRig.leftLeg.rotation.x = -swing;
      activeRig.rightLeg.rotation.x = swing;

      // Shadow stays grounded at y=0.025 and shrinks slightly when jumping high
      const shadowScale = Math.max(0.45, 1 - st.playerY * 0.14);
      activeRig.shadow.scale.set(shadowScale, 1, shadowScale);

      // Golden Samosa Power aura ring
      const auraMat = activeRig.auraRing.material as THREE.MeshBasicMaterial;
      auraMat.opacity = isPower ? 0.72 + Math.sin(this.titleTime * 16) * 0.2 : 0;
      activeRig.auraRing.position.y = st.playerY + 0.9;
      activeRig.auraRing.rotation.z = this.titleTime * 5;

      // Patlu's Idea Bulb lights up on double jump!
      if (this.patluRig.ideaBulb) {
        const bulbMat = this.patluRig.ideaBulb.material as THREE.MeshStandardMaterial;
        bulbMat.opacity = st.runner === 'patlu' && st.jumpsUsed >= 2 ? 0.95 : 0;
      }

      // Invulnerability blink & hit flash
      const blinkHide = st.invulnTimer > 0 && Math.floor(st.invulnTimer * 18) % 2 === 0;
      activeRig.bodyGroup.visible = !blinkHide;
      const flashEmissive = st.hitFlashTimer > 0 ? 0.85 : isPower ? 0.25 : 0;
      for (const m of activeRig.hitMeshes) {
        m.emissive.setHex(st.hitFlashTimer > 0 ? 0xffffff : 0xffaa00);
        m.emissiveIntensity = flashEmissive;
      }

      // Supportive Partner runs in duo formation slightly behind & offset!
      const partnerTargetX = THREE.MathUtils.clamp(
        st.playerX + (st.lane === 2 ? -1.85 : 1.85),
        -4.1,
        4.1,
      );
      partnerRig.root.position.x +=
        (partnerTargetX - partnerRig.root.position.x) * (1 - Math.exp(-6 * dt));
      partnerRig.root.position.z = 2.45;
      partnerRig.bodyGroup.visible = true;
      partnerRig.bodyGroup.position.y = Math.abs(Math.sin(gait + 1.2)) * 0.12;
      partnerRig.bodyGroup.rotation.set(0.1, Math.PI, 0);
      partnerRig.bodyGroup.scale.set(0.88, 0.88, 0.88);
      const pSwing = Math.sin(gait + 1.2) * 0.85;
      partnerRig.leftArm.rotation.x = pSwing;
      partnerRig.rightArm.rotation.x = -pSwing;
      partnerRig.leftLeg.rotation.x = -pSwing;
      partnerRig.rightLeg.rotation.x = pSwing;
      (partnerRig.auraRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    // 3. Sync John the Don's Boss Getaway Cart
    this.johnMesh.visible = st.john.active || st.john.spinTimer > 0;
    if (this.johnMesh.visible) {
      this.johnMesh.position.set(st.john.x, 0, st.john.z);
      this.johnMesh.rotation.y =
        st.john.spinTimer > 0 ? this.titleTime * 14 : Math.sin(this.titleTime * 4) * 0.08;
      this.johnMesh.position.y = Math.abs(Math.sin(this.titleTime * 10)) * 0.06;
    }

    // 4. Sync Active Obstacles
    const activeObstacleIds = new Set<number>();
    for (const obs of st.obstacles) {
      activeObstacleIds.add(obs.id);
      const mesh = this.getOrCreateObstacleMesh(obs.id, obs.kind);
      mesh.position.set(obs.x, obs.smashed ? Math.max(0, (0.48 - obs.koTimer) * 9) : 0, obs.z);

      if (obs.smashed) {
        mesh.rotation.x += dt * 9;
        mesh.rotation.z += dt * 11;
      } else {
        mesh.rotation.set(0, 0, 0);
        // Goon telegraph crouch & glowing ground target ring
        if (obs.kind === 'goon') {
          const ring = mesh.getObjectByName('telegraphRing');
          if (ring) {
            ring.visible = obs.telegraphTimer > 0;
            if (ring.visible) {
              const targetOffsetX = LANE_X[obs.targetLane] - obs.x;
              ring.position.x = targetOffsetX;
              const pulse = 1 + Math.sin(this.titleTime * 22) * 0.12;
              ring.scale.setScalar(pulse);
            }
          }
          // Subtle crouch during telegraph
          mesh.scale.y = obs.telegraphTimer > 0 ? 0.86 : 1;
        }
        // Rickshaw bob + headlight flash telegraph
        if (obs.kind === 'rickshaw') {
          mesh.position.y = Math.abs(Math.sin(this.titleTime * 18)) * 0.05;
        }
      }
    }

    for (const [id, mesh] of this.obstacleMeshes.entries()) {
      if (!activeObstacleIds.has(id)) {
        this.scene.remove(mesh);
        this.obstacleMeshes.delete(id);
      }
    }

    // 5. Sync Active Samosa Pickups
    const activePickupIds = new Set<number>();
    for (const p of st.pickups) {
      activePickupIds.add(p.id);
      let mesh = this.pickupMeshes.get(p.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          this.sharedAssets.samosaGeo,
          p.isGolden
            ? this.sharedAssets.goldenSamosaMat
            : this.sharedAssets.samosaMat,
        );
        mesh.scale.setScalar(p.isGolden ? 1.15 : 0.92);
        this.scene.add(mesh);
        this.pickupMeshes.set(p.id, mesh);
      }
      mesh.position.set(p.x, p.y + Math.sin(this.titleTime * 4.5 + p.id) * 0.14, p.z);
      mesh.rotation.y = this.titleTime * 2.6 + p.id * 0.6;
      mesh.rotation.z = Math.sin(this.titleTime * 3 + p.id) * 0.14;
    }

    for (const [id, mesh] of this.pickupMeshes.entries()) {
      if (!activePickupIds.has(id)) {
        this.scene.remove(mesh);
        this.pickupMeshes.delete(id);
      }
    }

    // 6. Update Pooled Particles (Zero GC)
    let dirtyParticles = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirtyParticles = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat4.makeScale(0.0001, 0.0001, 0.0001);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      p.vy -= 18 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.05, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const frac = p.life / p.maxLife;
      const sc = p.size * frac;
      _vec3.set(p.x, p.y, p.z);
      _scale.set(sc, sc, sc);
      _quat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, p.life * 8);
      _mat4.compose(_vec3, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, _color.setHex(p.colorHex));
    }
    if (dirtyParticles) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }

    // 7. Exponentially Damped Camera Rig + Trauma² Shake + Power FOV Kick
    const camDamp = 1 - Math.exp(-7.5 * dt);
    if (st.phase === 'title') {
      // Gentle scenic showcase orbit framing Motu & Patlu on the right & Bazaar vista ahead
      const orbitX = 0.65 + Math.sin(this.titleTime * 0.45) * 0.75;
      const orbitY = 2.85 + Math.cos(this.titleTime * 0.35) * 0.18;
      _targetPos.set(orbitX, orbitY, 6.2);
      _lookTarget.set(-0.35, 1.85, -14);
      this.camera.position.lerp(_targetPos, camDamp);
      this.camera.lookAt(_lookTarget);
      this.camera.fov += (54 - this.camera.fov) * camDamp;
      this.camera.updateProjectionMatrix();
    } else {
      const targetCamX = st.playerX * 0.56;
      const targetCamY = 4.25 + st.playerY * 0.42;
      const targetCamZ = 7.8 + (st.powerTimer > 0 ? 0.8 : 0);
      _targetPos.set(targetCamX, targetCamY, targetCamZ);
      this.camera.position.lerp(_targetPos, camDamp);

      // Trauma² shake on heavy smashes / hurts
      const shake = st.cameraTrauma * st.cameraTrauma;
      const shakeX = (Math.random() - 0.5) * 0.85 * shake;
      const shakeY = (Math.random() - 0.5) * 0.65 * shake;

      _lookTarget.set(
        st.playerX * 0.32 + shakeX,
        1.75 + st.playerY * 0.28 + shakeY,
        -12,
      );
      this.camera.lookAt(_lookTarget);

      const targetFov = st.powerTimer > 0 ? 64 : 56 + (st.speed - 16.5) * 0.35;
      if (Math.abs(targetFov - this.camera.fov) > 0.05) {
        this.camera.fov += (targetFov - this.camera.fov) * camDamp;
        this.camera.updateProjectionMatrix();
      }
    }
  }

  private pushHud(force = false): void {
    const now = performance.now();
    const st = this.state;
    const importantChange =
      force ||
      st.phase !== this.lastPushedPhase ||
      st.hearts !== this.lastPushedHearts ||
      st.runner !== this.lastPushedRunner ||
      st.samosas !== this.lastPushedSamosas ||
      (st.powerTimer > 0) !== this.lastPushedPower;

    if (!importantChange && now - this.lastHudPushMs < 110) {
      return;
    }

    this.lastHudPushMs = now;
    this.lastPushedPhase = st.phase;
    this.lastPushedHearts = st.hearts;
    this.lastPushedRunner = st.runner;
    this.lastPushedSamosas = st.samosas;
    this.lastPushedPower = st.powerTimer > 0;
    this.callbacks.onHudUpdate(buildHudSnapshot(st));
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync && gl.deleteSync) gl.deleteSync(sync);
        return;
      }
      const status = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (status === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync && gl.deleteSync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = Math.min(Math.max((now - this.lastTimeMs) / 1000, 0.001), 0.05);
    this.lastTimeMs = now;
    this.titleTime += rawDt;

    if (!this.contextLost) {
      if (this.state.phase === 'playing' || this.state.phase === 'ko_beat') {
        const jumpHeld =
          this.heldKeys.has('Space') ||
          this.heldKeys.has('ArrowUp') ||
          this.heldKeys.has('KeyW') ||
          this.queuedIntents.jumpHeld;

        const intents: InputIntents = {
          moveLeft: this.queuedIntents.moveLeft,
          moveRight: this.queuedIntents.moveRight,
          jumpPressed: this.queuedIntents.jumpPressed,
          jumpHeld,
          slidePressed: this.queuedIntents.slidePressed,
          powerPressed: this.queuedIntents.powerPressed,
          switchRunnerPressed: this.queuedIntents.switchRunnerPressed,
        };
        this.resetQueuedIntents();

        const events = stepGame(this.state, rawDt, intents);
        if (events.length > 0) {
          this.handleGameEvents(events);
        }
      }

      this.syncWorldMeshes(rawDt);
      this.renderer.render(this.scene, this.camera);
      this.pushHud(false);
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.renderer.domElement.removeEventListener('touchend', this.onTouchEnd);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.textures.dispose();
    this.sharedAssets.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
