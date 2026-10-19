const fs = require('fs');
const path = require('path');

const samplesDir = path.join(__dirname, 'public', 'assets', 'samples');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

// 1. Generate Mechanical Gear STL (ASCII format)
function generateGearSTL() {
  const teeth = 12;
  const outerR = 1.2;
  const innerR = 0.9;
  const holeR = 0.35;
  const height = 0.4;
  const halfH = height / 2;

  let stl = 'solid MechanicalGear\n';

  function addFacet(n, v1, v2, v3) {
    stl += `  facet normal ${n[0].toFixed(6)} ${n[1].toFixed(6)} ${n[2].toFixed(6)}\n`;
    stl += '    outer loop\n';
    stl += `      vertex ${v1[0].toFixed(6)} ${v1[1].toFixed(6)} ${v1[2].toFixed(6)}\n`;
    stl += `      vertex ${v2[0].toFixed(6)} ${v2[1].toFixed(6)} ${v2[2].toFixed(6)}\n`;
    stl += `      vertex ${v3[0].toFixed(6)} ${v3[1].toFixed(6)} ${v3[2].toFixed(6)}\n`;
    stl += '    endloop\n';
    stl += '  endfacet\n';
  }

  function addQuad(n, v1, v2, v3, v4) {
    addFacet(n, v1, v2, v3);
    addFacet(n, v1, v3, v4);
  }

  const steps = teeth * 4;
  const profile = [];

  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const isTooth = (i % 4 === 1 || i % 4 === 2);
    const r = isTooth ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    profile.push({ x, y, r, angle });
  }

  // Top and bottom faces
  for (let i = 0; i < steps; i++) {
    const next = (i + 1) % steps;
    const p1 = profile[i];
    const p2 = profile[next];

    const h1x = Math.cos(p1.angle) * holeR;
    const h1y = Math.sin(p1.angle) * holeR;
    const h2x = Math.cos(p2.angle) * holeR;
    const h2y = Math.sin(p2.angle) * holeR;

    // Top face (Z = +halfH)
    addQuad([0, 0, 1],
      [p1.x, p1.y, halfH],
      [p2.x, p2.y, halfH],
      [h2x, h2y, halfH],
      [h1x, h1y, halfH]
    );

    // Bottom face (Z = -halfH)
    addQuad([0, 0, -1],
      [p2.x, p2.y, -halfH],
      [p1.x, p1.y, -halfH],
      [h1x, h1y, -halfH],
      [h2x, h2y, -halfH]
    );

    // Outer side wall
    const midAngle = (p1.angle + p2.angle) / 2;
    const nx = Math.cos(midAngle);
    const ny = Math.sin(midAngle);
    addQuad([nx, ny, 0],
      [p1.x, p1.y, -halfH],
      [p2.x, p2.y, -halfH],
      [p2.x, p2.y, halfH],
      [p1.x, p1.y, halfH]
    );

    // Inner hole wall
    addQuad([-nx, -ny, 0],
      [h2x, h2y, -halfH],
      [h1x, h1y, -halfH],
      [h1x, h1y, halfH],
      [h2x, h2y, halfH]
    );
  }

  stl += 'endsolid MechanicalGear\n';
  return stl;
}

// 2. Generate Classical Architectural Pillar OBJ
function generatePillarOBJ() {
  let obj = '# SJRC Designs Classical Pillar\n';
  obj += 'o ClassicalPillar\n';

  const segments = 16;
  const baseR = 0.7;
  const shaftR = 0.45;
  const height = 2.5;

  const vertices = [];
  const uvs = [];
  const normals = [];
  const faces = [];

  // Define rings along height (Y axis)
  const rings = [
    { y: 0.0, r: baseR * 1.2 },
    { y: 0.15, r: baseR * 1.15 },
    { y: 0.25, r: baseR },
    { y: 0.35, r: shaftR * 1.1 },
    { y: height - 0.35, r: shaftR },
    { y: height - 0.25, r: baseR * 0.95 },
    { y: height - 0.15, r: baseR * 1.1 },
    { y: height, r: baseR * 1.2 }
  ];

  // Add bottom center vertex (index 1)
  vertices.push([0, 0, 0]);
  normals.push([0, -1, 0]);
  uvs.push([0.5, 0.5]);

  // Generate vertices for each ring
  rings.forEach((ring, ringIdx) => {
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * ring.r;
      const z = Math.sin(angle) * ring.r;
      vertices.push([x, ring.y, z]);
      normals.push([Math.cos(angle), 0, Math.sin(angle)]);
      uvs.push([i / segments, ring.y / height]);
    }
  });

  // Top center vertex
  const topCenterIdx = vertices.length + 1;
  vertices.push([0, height, 0]);
  normals.push([0, 1, 0]);
  uvs.push([0.5, 0.5]);

  // Faces for rings
  for (let r = 0; r < rings.length - 1; r++) {
    const rStart1 = 2 + r * segments;
    const rStart2 = 2 + (r + 1) * segments;

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const v1 = rStart1 + i;
      const v2 = rStart1 + next;
      const v3 = rStart2 + next;
      const v4 = rStart2 + i;

      faces.push([v1, v2, v3]);
      faces.push([v1, v3, v4]);
    }
  }

  // Bottom cap
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    faces.push([1, 2 + next, 2 + i]);
  }

  // Top cap
  const lastRingStart = 2 + (rings.length - 1) * segments;
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    faces.push([topCenterIdx, lastRingStart + i, lastRingStart + next]);
  }

  // Write out OBJ
  vertices.forEach(v => {
    obj += `v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}\n`;
  });
  uvs.forEach(u => {
    obj += `vt ${u[0].toFixed(4)} ${u[1].toFixed(4)}\n`;
  });
  normals.forEach(n => {
    obj += `vn ${n[0].toFixed(4)} ${n[1].toFixed(4)} ${n[2].toFixed(4)}\n`;
  });
  obj += 's 1\n';
  faces.forEach(f => {
    obj += `f ${f[0]}/${f[0]}/${f[0]} ${f[1]}/${f[1]}/${f[1]} ${f[2]}/${f[2]}/${f[2]}\n`;
  });

  return obj;
}

// 3. Generate Valid Autodesk FBX (ASCII format)
function generateTrophyFBX() {
  return `; FBX 7.4.0 project file
; Created by SJRC Designs 3D Studio
; --------------------------------------------------

FBXHeaderExtension:  {
	FBXHeaderVersion: 1003
	FBXVersion: 7400
	CreationTimeStamp:  {
		Version: 1000
		Year: 2026
		Month: 10
		Day: 20
		Hour: 0
		Minute: 0
		Second: 0
		Millisecond: 0
	}
	Creator: "SJRC Designs AR Studio"
}

Definitions:  {
	Version: 100
	Count: 2
	ObjectType: "Model" {
		Count: 1
	}
	ObjectType: "Material" {
		Count: 1
	}
}

Objects:  {
	Model: 1000000, "Model::SJRC_Award_Trophy", "Mesh" {
		Version: 232
		Properties70:  {
			P: "RotationActive", "bool", "", "",1
			P: "InheritType", "enum", "", "",1
			P: "ScalingMax", "Vector3D", "Vector", "",0,0,0
			P: "DefaultAttributeIndex", "int", "Integer", "",0
			P: "Lcl Translation", "Lcl Translation", "", "A",0,0,0
			P: "Lcl Rotation", "Lcl Rotation", "", "A",0,0,0
			P: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1
		}
		Vertices: *24 {
			a: -0.5,0,-0.5, 0.5,0,-0.5, 0.5,0.4,-0.5, -0.5,0.4,-0.5, -0.5,0,0.5, 0.5,0,0.5, 0.5,0.4,0.5, -0.5,0.4,0.5
		}
		PolygonVertexIndex: *24 {
			a: 0,1,2,-4, 4,7,6,-6, 0,4,5,-2, 1,5,6,-3, 2,6,7,-4, 3,7,4,-1
		}
		GeometryVersion: 124
		LayerElementNormal: 0 {
			Version: 101
			Name: ""
			MappingInformationType: "ByPolygonVertex"
			ReferenceInformationType: "Direct"
			Normals: *72 {
				a: 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0, 0,1,0, 0,1,0, 0,1,0, 0,1,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0
			}
		}
	}
	Material: 2000000, "Material::GoldFinish", "" {
		Version: 102
		ShadingModel: "phong"
		MultiLayer: 0
		Properties70:  {
			P: "DiffuseColor", "ColorRGB", "Color", "A",0.9,0.75,0.2
			P: "SpecularColor", "ColorRGB", "Color", "A",1,0.9,0.5
			P: "Shininess", "double", "Number", "",64
		}
	}
}

Connections:  {
	C: "OO",1000000,0
	C: "OO",2000000,1000000
}
`;
}

// 4. Generate GLB (Binary glTF)
function generateRobotGLB() {
  // We construct a clean, compliant binary GLB buffer with vertices, normals, and materials
  const positions = new Float32Array([
    // Body cube
    -0.4, 0.0, -0.3,   0.4, 0.0, -0.3,   0.4, 0.8, -0.3,  -0.4, 0.8, -0.3,
    -0.4, 0.0,  0.3,   0.4, 0.0,  0.3,   0.4, 0.8,  0.3,  -0.4, 0.8,  0.3,
    // Head cube
    -0.25, 0.85, -0.25,  0.25, 0.85, -0.25,  0.25, 1.3, -0.25, -0.25, 1.3, -0.25,
    -0.25, 0.85,  0.25,  0.25, 0.85,  0.25,  0.25, 1.3,  0.25, -0.25, 1.3,  0.25,
    // Left eye / sensor
    -0.15, 1.05, 0.26,  -0.05, 1.05, 0.26,  -0.05, 1.15, 0.26,  -0.15, 1.15, 0.26,
    // Right eye / sensor
     0.05, 1.05, 0.26,   0.15, 1.05, 0.26,   0.15, 1.15, 0.26,   0.05, 1.15, 0.26
  ]);

  const indices = new Uint16Array([
    // Body
    0,1,2, 0,2,3,  4,6,5, 4,7,6,  0,4,5, 0,5,1,
    1,5,6, 1,6,2,  2,6,7, 2,7,3,  3,7,4, 3,4,0,
    // Head
    8,9,10, 8,10,11,  12,14,13, 12,15,14,  8,12,13, 8,13,9,
    9,13,14, 9,14,10, 10,14,15, 10,15,11, 11,15,12, 11,12,8,
    // Eyes
    16,17,18, 16,18,19,
    20,21,22, 20,22,23
  ]);

  const posByteLength = positions.byteLength;
  const indByteLength = indices.byteLength;
  const totalBinaryLength = posByteLength + indByteLength;

  const binBuffer = Buffer.alloc(totalBinaryLength);
  Buffer.from(positions.buffer).copy(binBuffer, 0);
  Buffer.from(indices.buffer).copy(binBuffer, posByteLength);

  const gltf = {
    asset: { version: "2.0", generator: "SJRC Designs AR Studio" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "CyberRobot" }],
    meshes: [{
      name: "CyberRobotMesh",
      primitives: [{
        attributes: { POSITION: 0 },
        indices: 1,
        material: 0
      }]
    }],
    materials: [{
      name: "CyberArmorPBR",
      pbrMetallicRoughness: {
        baseColorFactor: [0.12, 0.74, 0.95, 1.0],
        metallicFactor: 0.85,
        roughnessFactor: 0.25
      }
    }],
    buffers: [{ byteLength: totalBinaryLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posByteLength, target: 34962 },
      { buffer: 0, byteOffset: posByteLength, byteLength: indByteLength, target: 34963 }
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: positions.length / 3,
        type: "VEC3",
        max: [0.4, 1.3, 0.3],
        min: [-0.4, 0.0, -0.3]
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5123, // UNSIGNED_SHORT
        count: indices.length,
        type: "SCALAR",
        max: [23],
        min: [0]
      }
    ]
  };

  let jsonString = JSON.stringify(gltf);
  while (jsonString.length % 4 !== 0) jsonString += ' ';

  const jsonBuffer = Buffer.from(jsonString, 'utf8');

  // GLB Header: Magic (0x46546C67), Version 2, Total Length
  const headerLength = 12;
  const jsonChunkHeaderLength = 8;
  const binChunkHeaderLength = 8;
  const totalLength = headerLength + jsonChunkHeaderLength + jsonBuffer.length + binChunkHeaderLength + binBuffer.length;

  const glbBuffer = Buffer.alloc(totalLength);
  let offset = 0;

  // Magic 'glTF'
  glbBuffer.writeUInt32LE(0x46546C67, offset); offset += 4;
  // Version 2
  glbBuffer.writeUInt32LE(2, offset); offset += 4;
  // Total Length
  glbBuffer.writeUInt32LE(totalLength, offset); offset += 4;

  // JSON Chunk Header
  glbBuffer.writeUInt32LE(jsonBuffer.length, offset); offset += 4;
  glbBuffer.writeUInt32LE(0x4E4F534A, offset); offset += 4; // 'JSON'
  jsonBuffer.copy(glbBuffer, offset); offset += jsonBuffer.length;

  // BIN Chunk Header
  glbBuffer.writeUInt32LE(binBuffer.length, offset); offset += 4;
  glbBuffer.writeUInt32LE(0x004E4942, offset); offset += 4; // 'BIN\0'
  binBuffer.copy(glbBuffer, offset);

  return glbBuffer;
}

// Write files
fs.writeFileSync(path.join(samplesDir, 'gear.stl'), generateGearSTL(), 'utf8');
fs.writeFileSync(path.join(samplesDir, 'pillar.obj'), generatePillarOBJ(), 'utf8');
fs.writeFileSync(path.join(samplesDir, 'trophy.fbx'), generateTrophyFBX(), 'utf8');
fs.writeFileSync(path.join(samplesDir, 'robot.glb'), generateRobotGLB());

console.log('Sample 3D models generated successfully in public/assets/samples/:');
console.log(' - gear.stl (STL)');
console.log(' - pillar.obj (OBJ)');
console.log(' - trophy.fbx (FBX)');
console.log(' - robot.glb (GLB)');
