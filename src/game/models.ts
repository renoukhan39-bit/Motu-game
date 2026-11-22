import * as THREE from 'three';
import type { ProceduralTextures } from './textures';

export interface RunnerRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  auraRing: THREE.Mesh;
  ideaBulb?: THREE.Mesh;
  shadow: THREE.Mesh;
  hitMeshes: THREE.MeshStandardMaterial[];
}

export interface SharedModelAssets {
  shadowGeo: THREE.CircleGeometry;
  shadowMat: THREE.MeshBasicMaterial;
  telegraphGeo: THREE.PlaneGeometry;
  telegraphMat: THREE.MeshBasicMaterial;
  samosaGeo: THREE.ExtrudeGeometry;
  samosaMat: THREE.MeshStandardMaterial;
  goldenSamosaMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createSharedModelAssets(
  textures: ProceduralTextures,
): SharedModelAssets {
  const shadowGeo = new THREE.CircleGeometry(0.95, 20);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });

  const telegraphGeo = new THREE.PlaneGeometry(2.5, 2.5);
  telegraphGeo.rotateX(-Math.PI / 2);
  const telegraphMat = new THREE.MeshBasicMaterial({
    map: textures.telegraphRing,
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
  });

  // Beveled crispy triangular Samosa geometry!
  const tri = new THREE.Shape();
  tri.moveTo(0, 0.56);
  tri.lineTo(-0.5, -0.34);
  tri.lineTo(0.5, -0.34);
  tri.closePath();

  const samosaGeo = new THREE.ExtrudeGeometry(tri, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.08,
    bevelSegments: 3,
  });
  samosaGeo.center();

  const samosaMat = new THREE.MeshStandardMaterial({
    color: 0xe69828,
    roughness: 0.58,
    metalness: 0.08,
    emissive: 0x4a2200,
    emissiveIntensity: 0.25,
  });

  const goldenSamosaMat = new THREE.MeshStandardMaterial({
    color: 0xffd23f,
    roughness: 0.25,
    metalness: 0.55,
    emissive: 0xff9d00,
    emissiveIntensity: 0.5,
  });

  return {
    shadowGeo,
    shadowMat,
    telegraphGeo,
    telegraphMat,
    samosaGeo,
    samosaMat,
    goldenSamosaMat,
    dispose: () => {
      shadowGeo.dispose();
      shadowMat.dispose();
      telegraphGeo.dispose();
      telegraphMat.dispose();
      samosaGeo.dispose();
      samosaMat.dispose();
      goldenSamosaMat.dispose();
    },
  };
}

function makeContactShadow(
  assets: SharedModelAssets,
  scaleX = 1,
  scaleZ = 1,
): THREE.Mesh {
  const m = new THREE.Mesh(assets.shadowGeo, assets.shadowMat);
  m.position.y = 0.025;
  m.scale.set(scaleX, 1, scaleZ);
  m.renderOrder = 1;
  return m;
}

/**
 * Composite 12-part Motu-inspired runner model (bottom-center pivot at y=0).
 * Plump silhouette, crimson kurta, dark Nehru waistcoat, curly handlebar mustache,
 * side hair tufts, dhoti legs, curled mojari shoes, articulated limbs, and golden power aura.
 */
export function buildMotuModel(assets: SharedModelAssets): RunnerRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8a87c, roughness: 0.65, metalness: 0.02 });
  const kurtaMat = new THREE.MeshStandardMaterial({ color: 0xd92b2b, roughness: 0.72, metalness: 0.04 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x1e2230, roughness: 0.52, metalness: 0.12 });
  const dhotiMat = new THREE.MeshStandardMaterial({ color: 0xf7efe0, roughness: 0.8, metalness: 0.0 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x181414, roughness: 0.4, metalness: 0.1 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x6b3214, roughness: 0.35, metalness: 0.18 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.28, metalness: 0.65 });

  // 1. Plump round torso (kurta belly)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.58, 18, 14), kurtaMat);
  belly.scale.set(1.02, 1.05, 0.94);
  belly.position.y = 1.02;
  belly.castShadow = true;
  bodyGroup.add(belly);

  // 2. Crisp dark Nehru waistcoat cleanly wrapping upper/mid torso (zero belly clipping)
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.61, 0.64, 18), vestMat);
  vest.position.set(0, 1.18, 0);
  vest.scale.set(1.03, 1, 0.96);
  vest.castShadow = true;
  bodyGroup.add(vest);

  // 3. Kurta collar & vertical crimson front placket with golden brass buttons
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.058, 8, 18), kurtaMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.52;
  bodyGroup.add(collar);

  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.08), kurtaMat);
  placket.position.set(0, 1.2, 0.56);
  bodyGroup.add(placket);

  for (let b = 0; b < 3; b++) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), goldTrimMat);
    btn.position.set(0, 1.36 - b * 0.14, 0.61);
    bodyGroup.add(btn);
  }

  // 4. Lower kurta flare hem
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.66, 0.3, 16), kurtaMat);
  hem.position.y = 0.64;
  hem.castShadow = true;
  bodyGroup.add(hem);

  // 5. Head (jolly rounded head, bald crown with side hair tufts)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 14), skinMat);
  head.position.y = 1.82;
  head.castShadow = true;
  bodyGroup.add(head);

  // Side hair tufts & ears
  for (const side of [-1, 1]) {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), hairMat);
    tuft.scale.set(0.65, 1.1, 1.15);
    tuft.position.set(side * 0.34, 1.84, 0.02);
    bodyGroup.add(tuft);
  }

  // 6. Iconic curled handlebar mustache (TubeGeometry!)
  const leftStacheCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.72, 0.35),
    new THREE.Vector3(-0.14, 1.71, 0.37),
    new THREE.Vector3(-0.27, 1.75, 0.32),
    new THREE.Vector3(-0.24, 1.82, 0.28),
  ]);
  const rightStacheCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.72, 0.35),
    new THREE.Vector3(0.14, 1.71, 0.37),
    new THREE.Vector3(0.27, 1.75, 0.32),
    new THREE.Vector3(0.24, 1.82, 0.28),
  ]);
  bodyGroup.add(new THREE.Mesh(new THREE.TubeGeometry(leftStacheCurve, 12, 0.036, 6, false), hairMat));
  bodyGroup.add(new THREE.Mesh(new THREE.TubeGeometry(rightStacheCurve, 12, 0.036, 6, false), hairMat));

  // Eyes & expressive nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), skinMat);
  nose.position.set(0, 1.8, 0.36);
  bodyGroup.add(nose);

  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeWhiteMat);
    eye.position.set(side * 0.12, 1.88, 0.31);
    bodyGroup.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), hairMat);
    pupil.position.set(side * 0.12, 1.88, 0.355);
    bodyGroup.add(pupil);
  }

  // 7-8. Articulated Arms with rounded shoulder caps
  const makeArm = (side: number): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.58, 1.38, 0);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 8), kurtaMat);
    arm.add(shoulder);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.105, 0.46, 10), kurtaMat);
    sleeve.position.y = -0.23;
    sleeve.castShadow = true;
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), skinMat);
    hand.position.y = -0.48;
    arm.add(hand);
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  bodyGroup.add(leftArm, rightArm);

  // 9-10. Articulated Legs + Mojari Shoes
  const makeLeg = (side: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.24, 0.56, 0);
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.44, 10), dhotiMat);
    calf.position.y = -0.22;
    calf.castShadow = true;
    leg.add(calf);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.34), shoeMat);
    shoe.position.set(0, -0.49, 0.06);
    shoe.castShadow = true;
    leg.add(shoe);
    return leg;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // 11. Golden Samosa-Power Aura Ring
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffb800,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const auraRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 8, 24), auraMat);
  auraRing.rotation.x = Math.PI / 2;
  auraRing.position.y = 0.9;
  root.add(auraRing);

  // 12. Contact Shadow
  const shadow = makeContactShadow(assets, 1.05, 1.05);
  root.add(shadow);

  // Rotate character to face forward (-Z) during gameplay
  bodyGroup.rotation.y = Math.PI;

  return {
    root,
    bodyGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    auraRing,
    shadow,
    hitMeshes: [kurtaMat, vestMat, skinMat],
  };
}

/**
 * Composite 12-part Patlu-inspired runner model (bottom-center pivot at y=0).
 * Tall slim silhouette, saffron-yellow kurta, royal blue trousers, round spectacles,
 * nimble stance, and glowing "Idea Bulb" halo on double-jump!
 */
export function buildPatluModel(assets: SharedModelAssets): RunnerRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xebb489, roughness: 0.65, metalness: 0.02 });
  const kurtaMat = new THREE.MeshStandardMaterial({ color: 0xf4c430, roughness: 0.68, metalness: 0.05 });
  const pantMat = new THREE.MeshStandardMaterial({ color: 0x2659a8, roughness: 0.78, metalness: 0.02 });
  const specsMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1e, roughness: 0.22, metalness: 0.78 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.35, metalness: 0.15 });

  // 1. Tall slim yellow kurta torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.88, 14), kurtaMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // 2. Collar & shoulder yoke
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 8, 16), kurtaMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.64;
  bodyGroup.add(collar);

  // 3. Slim oval head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 14), skinMat);
  head.scale.set(0.92, 1.14, 0.94);
  head.position.y = 1.96;
  head.castShadow = true;
  bodyGroup.add(head);

  // 4-6. Iconic round spectacles (twin TorusGeometry rims + bridge!)
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.018, 8, 16), specsMat);
    rim.position.set(side * 0.11, 1.98, 0.27);
    bodyGroup.add(rim);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.022, 0.022), specsMat);
  bridge.position.set(0, 1.99, 0.27);
  bodyGroup.add(bridge);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.12, 8), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.92, 0.31);
  bodyGroup.add(nose);

  // 7-8. Articulated lanky arms with rounded shoulder caps
  const makeArm = (side: number): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.34, 1.54, 0);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), kurtaMat);
    arm.add(shoulder);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.074, 0.6, 10), kurtaMat);
    sleeve.position.y = -0.3;
    sleeve.castShadow = true;
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), skinMat);
    hand.position.y = -0.62;
    arm.add(hand);
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  bodyGroup.add(leftArm, rightArm);

  // 9-10. Articulated long blue trouser legs
  const makeLeg = (side: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, 0.76, 0);
    const pant = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.66, 10), pantMat);
    pant.position.y = -0.33;
    pant.castShadow = true;
    leg.add(pant);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.32), shoeMat);
    shoe.position.set(0, -0.7, 0.06);
    shoe.castShadow = true;
    leg.add(shoe);
    return leg;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // 11. Glowing "Idea Bulb!" above Patlu's head
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff08a,
    emissive: 0xffd000,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    transparent: true,
    opacity: 0,
  });
  const ideaBulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), bulbMat);
  ideaBulb.position.y = 2.52;
  bodyGroup.add(ideaBulb);

  // Aura ring
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffe042,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const auraRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 8, 24), auraMat);
  auraRing.rotation.x = Math.PI / 2;
  auraRing.position.y = 1.0;
  root.add(auraRing);

  // 12. Contact Shadow
  const shadow = makeContactShadow(assets, 0.86, 0.86);
  root.add(shadow);

  bodyGroup.rotation.y = Math.PI;

  return {
    root,
    bodyGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    auraRing,
    ideaBulb,
    shadow,
    hitMeshes: [kurtaMat, pantMat, skinMat],
  };
}

/**
 * Composite 10-part Auto-Rickshaw (Fast Charger Archetype).
 * Iconic green-and-yellow Indian tuk-tuk with 3 wheels, canopy, windshield, headlights, chrome bumper.
 */
export function buildAutoRickshawModel(assets: SharedModelAssets): THREE.Group {
  const group = new THREE.Group();

  const greenMat = new THREE.MeshStandardMaterial({ color: 0x168049, roughness: 0.32, metalness: 0.3 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf7c51e, roughness: 0.36, metalness: 0.22 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x26282b, roughness: 0.85, metalness: 0.04 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x99d6ea,
    roughness: 0.12,
    metalness: 0.45,
    transparent: true,
    opacity: 0.72,
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd9dfe8, roughness: 0.18, metalness: 0.88 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.86, metalness: 0.05 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfff8d6,
    emissive: 0xffd24d,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  // 1. Lower green chassis tub
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.82, 3.1), greenMat);
  lower.position.y = 0.72;
  lower.castShadow = true;
  group.add(lower);

  // 2. Curved yellow nose cowl facing player (+Z)
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.88, 0.86, 12, 1, false, -Math.PI / 2, Math.PI), yellowMat);
  nose.position.set(0, 0.74, 1.38);
  nose.castShadow = true;
  group.add(nose);

  // 3. Yellow upper side cabin & windshield frame
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.86, 2.55), yellowMat);
  cabin.position.set(0, 1.54, -0.18);
  cabin.castShadow = true;
  group.add(cabin);

  // 4. Rounded black canvas roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.22, 2.95), canopyMat);
  roof.position.set(0, 2.04, -0.04);
  roof.castShadow = true;
  group.add(roof);

  // 5. Windshield glass facing +Z
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.64, 0.08), glassMat);
  glass.position.set(0, 1.54, 1.12);
  group.add(glass);

  // 6. Chrome front bumper
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.14, 0.16), chromeMat);
  bumper.position.set(0, 0.44, 2.08);
  group.add(bumper);

  // 7. Twin glowing headlights
  for (const side of [-0.52, 0.52]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), lampMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(side, 0.86, 2.02);
    lamp.name = 'headlight';
    group.add(lamp);
  }

  // 8-10. 3 Wheels (1 front + 2 rear) with silver hubs
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.26, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const wheelCoords: [number, number, number][] = [
    [0, 0.34, 1.52],
    [-0.95, 0.34, -1.0],
    [0.95, 0.34, -1.0],
  ];
  for (const [wx, wy, wz] of wheelCoords) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, wy, wz);
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    hub.position.set(wx, wy, wz);
    group.add(w, hub);
  }

  group.add(makeContactShadow(assets, 1.55, 2.2));
  return group;
}

/**
 * Composite 10-part John's Goon (Lane Strider / Lunge Archetype) with ground telegraph ring.
 */
export function buildGoonModel(assets: SharedModelAssets): THREE.Group {
  const group = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({ color: 0x5d2e8c, roughness: 0.62, metalness: 0.08 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf4f0ea, roughness: 0.75 });
  const tieMat = new THREE.MeshStandardMaterial({ color: 0xd93025, roughness: 0.4 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xdca075, roughness: 0.66 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x17171c, roughness: 0.22, metalness: 0.5 });

  // 1. Broad blazer torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.82, 0.48), suitMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);

  // 2. White shirt V & red tie
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.5), shirtMat);
  shirt.position.y = 1.08;
  group.add(shirt);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.52), tieMat);
  tie.position.y = 1.05;
  group.add(tie);

  // 3. Head + tall pompadour hair + dark shades
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skinMat);
  head.position.y = 1.7;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.56), darkMat);
  hair.position.set(0, 1.94, 0.05);
  hair.rotation.x = -0.15;
  group.add(hair);

  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.14), darkMat);
  shades.position.set(0, 1.73, 0.24);
  group.add(shades);

  // 4-7. Arms & legs
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.65, 8), suitMat);
    arm.position.set(side * 0.56, 1.04, 0.12);
    arm.rotation.x = -0.35;
    group.add(arm);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.66, 8), darkMat);
    leg.position.set(side * 0.22, 0.34, 0);
    group.add(leg);
  }

  // Telegraph ground ring (hidden until goon telegraphs lunge)
  const ring = new THREE.Mesh(assets.telegraphGeo, assets.telegraphMat);
  ring.position.y = 0.04;
  ring.visible = false;
  ring.name = 'telegraphRing';
  group.add(ring);

  group.add(makeContactShadow(assets, 1.0, 1.0));
  return group;
}

/**
 * Composite 11-part John the Don's Getaway Samosa Scooter-Cart (Boss Kiter).
 */
export function buildJohnCartModel(assets: SharedModelAssets): THREE.Group {
  const group = new THREE.Group();

  const redMetal = new THREE.MeshStandardMaterial({ color: 0xc9222b, roughness: 0.26, metalness: 0.55 });
  const goldTrim = new THREE.MeshStandardMaterial({ color: 0xf0b429, roughness: 0.24, metalness: 0.72 });
  const crateWood = new THREE.MeshStandardMaterial({ color: 0x9c622f, roughness: 0.85, metalness: 0.02 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1d1d22, roughness: 0.88 });
  const suitMat = new THREE.MeshStandardMaterial({ color: 0x2a1a4a, roughness: 0.5, metalness: 0.18 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6ad82, roughness: 0.65 });

  // 1. Scooter deck & chassis
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 2.7), redMetal);
  deck.position.y = 0.56;
  deck.castShadow = true;
  group.add(deck);

  // 2. Gold side fenders
  for (const s of [-0.78, 0.78]) {
    const fender = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 2.2), goldTrim);
    fender.position.set(s, 0.64, 0);
    group.add(fender);
  }

  // 3. Overflowing stolen Samosa Crate on the rear rack facing the player (+Z)
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.76, 1.15), crateWood);
  crate.position.set(0, 1.12, 0.68);
  crate.castShadow = true;
  group.add(crate);

  // Heap of golden samosas peeking out of the stolen crate!
  for (let i = 0; i < 4; i++) {
    const sam = new THREE.Mesh(assets.samosaGeo, assets.goldenSamosaMat);
    sam.scale.setScalar(0.55);
    sam.position.set((i - 1.5) * 0.28, 1.62 + (i % 2) * 0.12, 0.65);
    sam.rotation.set(0.3 * i, i * 0.8, 0.2);
    group.add(sam);
  }

  // 4. John the Don driving at the front (-Z) looking back mischievously
  const johnTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.75, 12), suitMat);
  johnTorso.position.set(0, 1.24, -0.58);
  group.add(johnTorso);

  const johnHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skinMat);
  johnHead.position.set(0, 1.82, -0.58);
  group.add(johnHead);

  const johnHair = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.36, 10), tireMat);
  johnHair.position.set(0, 2.1, -0.58);
  group.add(johnHair);

  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.14), tireMat);
  shades.position.set(0, 1.84, -0.34);
  group.add(shades);

  // 5. Exhaust tailpipe & wheels
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [
    [-0.74, 0.92],
    [0.74, 0.92],
    [0, -1.05],
  ]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, 0.34, wz);
    group.add(w);
  }

  group.add(makeContactShadow(assets, 1.45, 2.0));
  return group;
}

/**
 * Composite 5-part Bazaar Chai-Crate Barricade (low obstacle: jump over).
 */
export function buildCrateModel(assets: SharedModelAssets): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xa46632, roughness: 0.84, metalness: 0.02 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x663a19, roughness: 0.78, metalness: 0.05 });
  const clayMat = new THREE.MeshStandardMaterial({ color: 0xc95f36, roughness: 0.65, metalness: 0.04 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.86, 1.05), woodMat);
  base.position.y = 0.43;
  base.castShadow = true;
  group.add(base);

  // Cross wooden slats
  for (const y of [0.22, 0.64]) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.12, 1.1), darkWood);
    slat.position.y = y;
    group.add(slat);
  }

  // Terracotta matka pot perched on top via LatheGeometry!
  const potProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.18, 0.04),
    new THREE.Vector2(0.28, 0.22),
    new THREE.Vector2(0.22, 0.38),
    new THREE.Vector2(0.14, 0.46),
    new THREE.Vector2(0.19, 0.52),
  ];
  const pot = new THREE.Mesh(new THREE.LatheGeometry(potProfile, 12), clayMat);
  pot.position.set(0.42, 0.86, 0);
  pot.castShadow = true;
  group.add(pot);

  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd8c39e, roughness: 0.92 }));
  sack.scale.set(1.1, 0.72, 0.95);
  sack.position.set(-0.46, 1.02, 0);
  group.add(sack);

  group.add(makeContactShadow(assets, 1.35, 0.95));
  return group;
}

/**
 * Composite 7-part Festive Marigold Bamboo Archway (high obstacle: slide underneath!).
 */
export function buildArchModel(assets: SharedModelAssets): THREE.Group {
  const group = new THREE.Group();
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x8b6f38, roughness: 0.74, metalness: 0.04 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0xd93829, roughness: 0.8 });
  const marigoldOrange = new THREE.MeshStandardMaterial({ color: 0xff8c1a, roughness: 0.62 });
  const marigoldYellow = new THREE.MeshStandardMaterial({ color: 0xffcf26, roughness: 0.6 });

  // Side bamboo posts
  for (const side of [-1.22, 1.22]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.7, 8), bambooMat);
    pole.position.set(side, 1.35, 0);
    pole.castShadow = true;
    group.add(pole);
  }

  // Top beam
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.7, 8), bambooMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.y = 2.6;
  group.add(beam);

  // Hanging festive crimson bazaar banner (leaves 1.2m clear underneath to slide!)
  const banner = new THREE.Mesh(new THREE.BoxGeometry(2.26, 1.1, 0.16), clothMat);
  banner.position.y = 1.98;
  banner.castShadow = true;
  group.add(banner);

  // Marigold floral toran spheres along the bottom edge of the banner
  for (let i = -4; i <= 4; i++) {
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 6),
      i % 2 === 0 ? marigoldOrange : marigoldYellow,
    );
    flower.position.set(i * 0.25, 1.36, 0.08);
    group.add(flower);
  }

  group.add(makeContactShadow(assets, 1.5, 0.6));
  return group;
}

/**
 * Composite 4-part John's Banana / Smoke Hazard with warning ring.
 */
export function buildBananaBombModel(assets: SharedModelAssets): THREE.Group {
  const group = new THREE.Group();
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffd62e, roughness: 0.42, metalness: 0.08 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.7 });

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const peel = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 8), yellowMat);
    peel.position.set(Math.cos(a) * 0.22, 0.18, Math.sin(a) * 0.22);
    peel.rotation.z = 0.85;
    peel.rotation.y = -a;
    group.add(peel);
  }

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 8), darkMat);
  stem.position.y = 0.42;
  group.add(stem);

  const ring = new THREE.Mesh(assets.telegraphGeo, assets.telegraphMat);
  ring.position.y = 0.035;
  ring.scale.setScalar(0.8);
  group.add(ring);

  return group;
}

/**
 * Composite 8-part Colorful Furfuri Nagar Bazaar Shopfront Building.
 */
export function buildBazaarBuilding(
  textures: ProceduralTextures,
  wallHex: number,
  useTealAwning: boolean,
  width = 7.4,
  height = 7.2,
  depth = 6.2,
): THREE.Group {
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    color: wallHex,
    bumpMap: textures.plasterBump,
    bumpScale: 0.08,
    roughness: 0.86,
    metalness: 0.02,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xfff3dc, roughness: 0.72, metalness: 0.04 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c361d, roughness: 0.75, metalness: 0.06 });
  const awningMat = new THREE.MeshStandardMaterial({
    map: useTealAwning ? textures.awningTeal : textures.awningOrange,
    color: 0xffffff,
    roughness: 0.82,
  });
  const shopDark = new THREE.MeshStandardMaterial({ color: 0x2c1b12, roughness: 0.9 });

  // 1. Primary building block
  const main = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  main.position.y = height / 2;
  main.castShadow = true;
  main.receiveShadow = true;
  group.add(main);

  // 2. Rooftop parapet cornice & decorative trim
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(width + 0.45, 0.45, depth + 0.45), trimMat);
  cornice.position.y = height + 0.12;
  group.add(cornice);

  // 3. Recessed shopfront bay with wooden bazaar counter & warm golden interior lantern glow
  const bay = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.75, depth * 0.68), shopDark);
  bay.position.set(width / 2 + 0.02, 1.4, 0);
  group.add(bay);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.92, depth * 0.64), woodMat);
  counter.position.set(width / 2 + 0.24, 0.46, 0);
  group.add(counter);

  const counterTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.1, depth * 0.68),
    new THREE.MeshStandardMaterial({ color: 0xe6c38d, roughness: 0.6 }),
  );
  counterTop.position.set(width / 2 + 0.28, 0.96, 0);
  group.add(counterTop);

  // Warm shop display lantern strip inside bay
  const lantern = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.18, depth * 0.42),
    new THREE.MeshStandardMaterial({
      color: 0xffdf85,
      emissive: 0xffa629,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    }),
  );
  lantern.position.set(width / 2 + 0.18, 2.48, 0);
  group.add(lantern);

  // 4. Sloped striped bazaar cloth awning
  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, depth * 0.86), awningMat);
  awning.position.set(width / 2 + 0.92, 3.05, 0);
  awning.rotation.z = -0.28;
  awning.castShadow = true;
  group.add(awning);

  // 5-6. Upper floor windows with wooden shutters
  for (const wz of [-depth * 0.24, depth * 0.24]) {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.55, 1.15), trimMat);
    winFrame.position.set(width / 2 + 0.04, height - 1.9, wz);
    group.add(winFrame);

    const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.32, 0.92), woodMat);
    shutter.position.set(width / 2 + 0.08, height - 1.9, wz);
    group.add(shutter);
  }

  // 7. Painted shop signboard fascia above awning
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.62, depth * 0.76),
    new THREE.MeshStandardMaterial({
      color: useTealAwning ? 0xf2b705 : 0x1e6b5c,
      roughness: 0.48,
      metalness: 0.12,
    }),
  );
  signBoard.position.set(width / 2 + 0.14, 3.72, 0);
  group.add(signBoard);

  return group;
}

/**
 * Composite 7-part Tropical Palm Tree for Furfuri Nagar roadside & hills.
 */
export function buildPalmTree(): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5434, roughness: 0.9, metalness: 0.02 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3b8c3e, roughness: 0.65, metalness: 0.04 });

  // 3 stacked tapered trunk segments with slight natural curve
  let curY = 0;
  let curX = 0;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 - i * 0.04, 0.3 - i * 0.04, 2.2, 8),
      trunkMat,
    );
    seg.position.set(curX + i * 0.16, curY + 1.05, 0);
    seg.rotation.z = -0.06 * (i + 1);
    seg.castShadow = true;
    group.add(seg);
    curY += 2.05;
    curX += i * 0.16;
  }

  // Radiating arched palm fronds
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.9, 5), leafMat);
    frond.scale.set(1, 1, 0.25);
    frond.position.set(curX + Math.cos(a) * 1.15, curY + 0.25, Math.sin(a) * 1.15);
    frond.rotation.z = -Math.PI / 2 + 0.32;
    frond.rotation.y = -a;
    group.add(frond);
  }

  return group;
}

/**
 * Composite 10-part Tall Furfuri Nagar Clocktower Landmark (always visible ahead!).
 */
export function buildClocktowerLandmark(textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();

  const sandstone = new THREE.MeshStandardMaterial({
    color: 0xd99b66,
    bumpMap: textures.plasterBump,
    bumpScale: 0.08,
    roughness: 0.82,
  });
  const creamTrim = new THREE.MeshStandardMaterial({ color: 0xf9e9cc, roughness: 0.68 });
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xc9492e, roughness: 0.44, metalness: 0.18 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf4be2c, roughness: 0.24, metalness: 0.78 });
  const clockMat = new THREE.MeshStandardMaterial({ map: textures.clockFace, color: 0xffffff, roughness: 0.4 });

  // 1-2. Twin stone archway pillars framing the road finish
  for (const side of [-7.2, 7.2]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 11.5, 4.2), sandstone);
    pillar.position.set(side, 5.75, 0);
    group.add(pillar);
  }

  // 3. Spanning bazaar stone arch lintel above the road
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(17.8, 3.2, 4.4), sandstone);
  bridge.position.y = 10.6;
  group.add(bridge);

  const trimBand = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.65, 4.8), creamTrim);
  trimBand.position.y = 12.3;
  group.add(trimBand);

  // 4. Central vertical clock tower shaft
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(5.4, 9.8, 5.4), sandstone);
  shaft.position.y = 17.2;
  group.add(shaft);

  // 5. Large circular clock face facing the player (+Z)
  const face = new THREE.Mesh(new THREE.CircleGeometry(2.05, 24), clockMat);
  face.position.set(0, 18.2, 2.76);
  group.add(face);

  // 6. Upper cornice
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.7, 6.2), creamTrim);
  topTrim.position.y = 22.3;
  group.add(topTrim);

  // 7. Chhatri onion cupola dome (LatheGeometry!)
  const domePts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(2.4, 0.1),
    new THREE.Vector2(2.6, 1.1),
    new THREE.Vector2(1.8, 2.3),
    new THREE.Vector2(0.45, 3.2),
    new THREE.Vector2(0, 3.6),
  ];
  const dome = new THREE.Mesh(new THREE.LatheGeometry(domePts, 18), domeMat);
  dome.position.y = 22.6;
  group.add(dome);

  // 8. Golden finial spire
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.6, 10), goldMat);
  spire.position.y = 27.3;
  group.add(spire);

  return group;
}

/**
 * Festive Overhead Marigold Bunting Garland strung across Furfuri Bazaar Street.
 */
export function buildStreetGarland(): THREE.Group {
  const group = new THREE.Group();
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x5c361a, roughness: 0.85 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff8011, roughness: 0.55 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffd221, roughness: 0.52 });

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.4, 7.6, 0),
    new THREE.Vector3(-4.2, 6.3, 0),
    new THREE.Vector3(0, 5.85, 0),
    new THREE.Vector3(4.2, 6.3, 0),
    new THREE.Vector3(8.4, 7.6, 0),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.055, 6, false), ropeMat));

  const sphereGeo = new THREE.SphereGeometry(0.18, 8, 6);
  for (let i = 1; i < 13; i++) {
    const pt = curve.getPoint(i / 13);
    const flower = new THREE.Mesh(sphereGeo, i % 2 === 0 ? orangeMat : yellowMat);
    flower.position.copy(pt);
    flower.position.y -= 0.14;
    group.add(flower);
  }

  return group;
}
