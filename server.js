const express = require('express');
const multer = require('multer');
const cors = require('cors');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all domains so Unity WebRequest and mobile browsers can access without restriction
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SAMPLES_DIR = path.join(__dirname, 'public', 'assets', 'samples');
const DB_FILE = path.join(__dirname, 'uploads', 'models-registry.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Read / Write metadata registry
function readRegistry() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading registry:', err);
    return [];
  }
}

function writeRegistry(items) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing registry:', err);
  }
}

// Network IP helper to get primary routable LAN IPv4 (prioritizing Wi-Fi/Ethernet over APIPA)
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  
  // Pass 1: Look for Wi-Fi or Ethernet with valid routable IP (excluding 169.254.x.x link-local)
  for (const name of Object.keys(interfaces)) {
    const lower = name.toLowerCase();
    if (lower.includes('wi-fi') || lower.includes('wireless') || lower.includes('ethernet') || lower.includes('wlan')) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
          return iface.address;
        }
      }
    }
  }

  // Pass 2: Any non-internal IPv4 not link-local
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        return iface.address;
      }
    }
  }

  // Pass 3: Any non-internal IPv4
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function getAllIpv4Addresses() {
  const addresses = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4') {
        addresses.push({ name, address: iface.address, internal: iface.internal });
      }
    }
  }
  return addresses;
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Generate or retrieve modelId
    if (!req.modelFolderId) {
      req.modelFolderId = 'model_' + Date.now() + '_' + uuidv4().substring(0, 8);
    }
    const modelDir = path.join(UPLOADS_DIR, req.modelFolderId);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
    cb(null, modelDir);
  },
  filename: (req, file, cb) => {
    // Clean filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 } // 250 MB max
});

// Static routes
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));
app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules', 'three')));
app.use('/vendor/model-viewer', express.static(path.join(__dirname, 'node_modules', '@google', 'model-viewer', 'dist')));
app.use('/vendor/fflate', express.static(path.join(__dirname, 'node_modules', 'fflate')));

// ================= API ROUTES =================

// 1. Network Info Endpoint
app.get('/api/network-info', (req, res) => {
  const hostHeader = req.headers.host;
  const localIp = getLocalNetworkIp();
  const allIps = getAllIpv4Addresses();
  const protocol = req.protocol;

  const baseLocal = `${protocol}://${localIp}:${PORT}`;
  const baseReq = `${protocol}://${hostHeader}`;

  res.json({
    localIp,
    port: PORT,
    allIps,
    recommendedHost: localIp !== 'localhost' ? baseLocal : baseReq,
    activeHost: baseReq
  });
});

// 2. Pre-loaded Sample Models
app.get('/api/samples', (req, res) => {
  const samples = [
    {
      id: 'sample_robot',
      name: 'Cyber Robot Sentinel',
      filename: 'robot.glb',
      format: 'glb',
      fileSize: 4200,
      description: 'Futuristic robot model with metallic PBR shading and articulated segments.',
      url: '/assets/samples/robot.glb',
      category: 'Sci-Fi / Character'
    },
    {
      id: 'sample_gear',
      name: 'Mechanical Transmission Gear',
      filename: 'gear.stl',
      format: 'stl',
      fileSize: 18500,
      description: 'Precision CAD spur gear with involute teeth for industrial 3D printing & engineering.',
      url: '/assets/samples/gear.stl',
      category: 'Mechanical / CAD'
    },
    {
      id: 'sample_pillar',
      name: 'Classical Architectural Pillar',
      filename: 'pillar.obj',
      format: 'obj',
      fileSize: 12800,
      description: 'Greco-Roman architectural column with fluted pedestal and capital.',
      url: '/assets/samples/pillar.obj',
      category: 'Architecture'
    },
    {
      id: 'sample_trophy',
      name: 'SJRC Championship Trophy',
      filename: 'trophy.fbx',
      format: 'fbx',
      fileSize: 2200,
      description: 'Autodesk FBX format trophy with gold finish material connections.',
      url: '/assets/samples/trophy.fbx',
      category: 'Award / Prop'
    }
  ];
  res.json({ success: true, samples });
});

// 3. Upload 3D Model(s)
app.post('/api/upload', upload.array('models', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files were uploaded.' });
  }

  const modelId = req.modelFolderId;
  const uploadedFiles = req.files;

  // Identify main 3D model file (obj, stl, glb, gltf, fbx)
  const validExtensions = ['.glb', '.gltf', '.obj', '.stl', '.fbx'];
  let primaryModelFile = uploadedFiles.find(f => {
    const ext = path.extname(f.originalname).toLowerCase();
    return validExtensions.includes(ext);
  });

  if (!primaryModelFile) {
    // If not found by extension, fallback to first file
    primaryModelFile = uploadedFiles[0];
  }

  const ext = path.extname(primaryModelFile.originalname).toLowerCase().replace('.', '');
  const baseHost = req.body.customHost || `${req.protocol}://${req.headers.host}`;

  const modelRecord = {
    id: modelId,
    name: primaryModelFile.originalname,
    format: ext,
    fileSize: primaryModelFile.size,
    createdAt: new Date().toISOString(),
    primaryFilename: primaryModelFile.filename,
    allFiles: uploadedFiles.map(f => ({
      name: f.originalname,
      filename: f.filename,
      size: f.size
    })),
    relativeFolder: `/uploads/${modelId}/`,
    downloadUrl: `${baseHost}/uploads/${modelId}/${primaryModelFile.filename}`,
    manifestUrl: `${baseHost}/api/models/${modelId}/unity-manifest.json`,
    arViewUrl: `${baseHost}/ar-view.html?id=${modelId}`,
    scale: { x: 1, y: 1, z: 1 },
    hasConvertedGlb: ext === 'glb'
  };

  const registry = readRegistry();
  registry.unshift(modelRecord);
  writeRegistry(registry);

  res.json({
    success: true,
    model: modelRecord,
    message: `Model ${primaryModelFile.originalname} uploaded successfully.`
  });
});

// 4. Save Converted GLB from Client-side Three.js Exporter
app.post('/api/models/:id/save-glb', upload.single('glbFile'), (req, res) => {
  const modelId = req.params.id;
  const modelDir = path.join(UPLOADS_DIR, modelId);

  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  const targetGlbPath = path.join(modelDir, 'converted.glb');

  if (req.file) {
    fs.renameSync(req.file.path, targetGlbPath);
  } else if (req.body && req.body.glbBase64) {
    const buffer = Buffer.from(req.body.glbBase64, 'base64');
    fs.writeFileSync(targetGlbPath, buffer);
  } else {
    return res.status(400).json({ success: false, error: 'No GLB data provided.' });
  }

  const registry = readRegistry();
  const record = registry.find(m => m.id === modelId);
  if (record) {
    const baseHost = req.body.customHost || `${req.protocol}://${req.headers.host}`;
    record.hasConvertedGlb = true;
    record.convertedGlbUrl = `${baseHost}/uploads/${modelId}/converted.glb`;
    writeRegistry(registry);
  }

  res.json({
    success: true,
    convertedGlbUrl: `/uploads/${modelId}/converted.glb`
  });
});

// 5. Get List of Models
app.get('/api/models', (req, res) => {
  const registry = readRegistry();
  res.json({ success: true, models: registry });
});

// 6. Get Single Model Metadata
app.get('/api/models/:id', (req, res) => {
  const modelId = req.params.id;

  // Check if sample model
  if (modelId.startsWith('sample_')) {
    const filenameMap = {
      sample_robot: { name: 'robot.glb', format: 'glb', title: 'Cyber Robot Sentinel' },
      sample_gear: { name: 'gear.stl', format: 'stl', title: 'Mechanical Transmission Gear' },
      sample_pillar: { name: 'pillar.obj', format: 'obj', title: 'Classical Architectural Pillar' },
      sample_trophy: { name: 'trophy.fbx', format: 'fbx', title: 'SJRC Championship Trophy' }
    };

    const sample = filenameMap[modelId];
    if (sample) {
      const baseHost = `${req.protocol}://${req.headers.host}`;
      return res.json({
        success: true,
        model: {
          id: modelId,
          name: sample.title,
          format: sample.format,
          primaryFilename: sample.name,
          downloadUrl: `${baseHost}/assets/samples/${sample.name}`,
          directUrl: `/assets/samples/${sample.name}`,
          manifestUrl: `${baseHost}/api/models/${modelId}/unity-manifest.json`,
          arViewUrl: `${baseHost}/ar-view.html?id=${modelId}`,
          isSample: true,
          scale: { x: 1, y: 1, z: 1 }
        }
      });
    }
  }

  const registry = readRegistry();
  const record = registry.find(m => m.id === modelId);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Model not found.' });
  }

  res.json({ success: true, model: record });
});

// 7. Unity AR Manifest JSON Endpoint
// Directly consumed by Unity AR Foundation script ARModelQRScanner.cs
app.get('/api/models/:id/unity-manifest.json', (req, res) => {
  const modelId = req.params.id;
  const baseHost = `${req.protocol}://${req.headers.host}`;

  let record = null;

  if (modelId.startsWith('sample_')) {
    const filenameMap = {
      sample_robot: { name: 'robot.glb', format: 'glb', title: 'Cyber Robot Sentinel' },
      sample_gear: { name: 'gear.stl', format: 'stl', title: 'Mechanical Transmission Gear' },
      sample_pillar: { name: 'pillar.obj', format: 'obj', title: 'Classical Architectural Pillar' },
      sample_trophy: { name: 'trophy.fbx', format: 'fbx', title: 'SJRC Championship Trophy' }
    };
    const s = filenameMap[modelId];
    if (s) {
      record = {
        id: modelId,
        name: s.title,
        format: s.format,
        downloadUrl: `${baseHost}/assets/samples/${s.name}`,
        convertedGlbUrl: s.format === 'glb' ? `${baseHost}/assets/samples/${s.name}` : undefined
      };
    }
  } else {
    const registry = readRegistry();
    record = registry.find(m => m.id === modelId);
  }

  if (!record) {
    return res.status(404).json({ error: 'Model manifest not found' });
  }

  const manifest = {
    app: "SJRC-Unity-AR",
    version: "1.0",
    id: record.id,
    name: record.name,
    format: record.format,
    modelUrl: record.hasConvertedGlb && record.convertedGlbUrl ? record.convertedGlbUrl : record.downloadUrl,
    originalUrl: record.downloadUrl,
    scale: record.scale || { x: 1.0, y: 1.0, z: 1.0 },
    bounds: record.bounds || { width: 1.0, height: 1.0, depth: 1.0 },
    created: record.createdAt || new Date().toISOString()
  };

  res.setHeader('Content-Type', 'application/json');
  res.json(manifest);
});

// 8. Dynamic QR Code Generator Endpoint
app.get('/api/qr', async (req, res) => {
  try {
    const {
      text,
      format = 'png',
      colorDark = '#06b6d4',
      colorLight = '#0b0f17',
      errorCorrectionLevel = 'M',
      margin = 2,
      width = 400
    } = req.query;

    if (!text) {
      return res.status(400).json({ error: 'Query parameter "text" is required.' });
    }

    const qrOptions = {
      errorCorrectionLevel,
      margin: parseInt(margin, 10),
      width: parseInt(width, 10),
      color: {
        dark: colorDark,
        light: colorLight
      }
    };

    if (format === 'svg') {
      const svg = await QRCode.toString(text, { ...qrOptions, type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    } else if (format === 'dataurl') {
      const dataUrl = await QRCode.toDataURL(text, qrOptions);
      return res.json({ success: true, dataUrl });
    } else {
      const buffer = await QRCode.toBuffer(text, qrOptions);
      res.setHeader('Content-Type', 'image/png');
      return res.send(buffer);
    }
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code: ' + err.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalNetworkIp();
  console.log(`=======================================================`);
  console.log(`🚀 SJRC 3D AR Studio Server running!`);
  console.log(`📍 Local:   http://localhost:${PORT}`);
  console.log(`📱 LAN AR:  http://${localIp}:${PORT}`);
  console.log(`=======================================================`);
});
