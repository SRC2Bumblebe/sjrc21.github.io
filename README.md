# SJRC Designs • 3D Augmented Reality QR Code Studio for Unity & WebAR

An enterprise-grade Web application that generates **Augmented Reality (AR) QR codes for Unity** and **instant Mobile WebAR** from 3D models uploaded by users in **OBJ, STL, GLB/glTF, and FBX** formats.

Built by **SJRC Designs**, this system bridges CAD, 3D modeling, Unity AR development, and smartphone AR experiences into a single unified workflow.

---

## 🌟 Key Features

### 1. Multi-Format 3D Model Upload & Processing
- **Supported 3D Formats**:
  - **`.glb` / `.gltf`**: Industry-standard binary and JSON glTF with full PBR metallic/roughness materials.
  - **`.stl`**: ASCII and Binary STL models commonly used for 3D printing and CAD engineering.
  - **`.obj`**: Wavefront 3D models with optional `.mtl` material definitions and texture maps.
  - **`.fbx`**: Autodesk FBX format for game dev and Unity animations.
- **Instant Three.js 3D Viewport**:
  - Real-time 3D rendering with studio PBR key/fill/rim lighting and soft shadow floor.
  - OrbitControls (rotate, pan, zoom with inertia damping).
  - Turntable auto-rotation, wireframe mode, ground grid toggles.
  - Automatic model normalization (centering and bottom pivot alignment to floor Y=0).
  - Geometric statistics HUD: Vertices, Polygons/Faces, and real-world dimensions (Width × Height × Depth in meters).

### 2. Unity AR Foundation Integration Suite
- **AR QR Code Modes**:
  - **Unity AR Foundation Manifest**: Generates a standardized JSON manifest (`/api/models/:id/unity-manifest.json`) encoding the model download URL, scale factor, and bounding box dimensions.
  - **Direct Model File Download**: Direct URL for Unity runtime downloading of raw `.obj`, `.stl`, `.glb`, or `.fbx` assets.
  - **Unity Deep Link (`unityar://`)**: Custom protocol link to launch your Unity application directly.
  - **Universal WebAR**: Scan with any standard iPhone or Android camera to open Apple Quick Look or Google Scene Viewer without installing any app.
- **Ready-to-Use Unity C# Scripts Included**:
  - `ARModelQRScanner.cs`: Camera frame barcode reader using AR Foundation (`ARCameraManager`, `ARPlaneManager`, `ARRaycastManager`) to detect QR codes in AR space and instantiate models on detected planes.
  - `RuntimeModelLoader.cs`: Universal dynamic model loader in Unity supporting glTFast (GLB), runtime Wavefront OBJ parser, and runtime binary/ASCII STL parser with local caching (`persistentDataPath`).
  - `UnityARSceneGuide.md`: Step-by-step Unity setup instructions.

### 3. Universal WebAR Generator (`/ar-view.html`)
- Built-in Google `<model-viewer>` with Apple AR Quick Look (`.usdz`) and Google Scene Viewer (`.glb`) support.
- Automatic conversion and streaming of uploaded OBJ, STL, and FBX files into universal `.glb` format using client-side Three.js `GLTFExporter`.

### 4. Smart Local Network & Wi-Fi IP Discovery
- The server automatically detects your machine's routable LAN Wi-Fi / Ethernet IPv4 address (e.g. `10.246.107.55` or `192.168.x.x`).
- QR codes are automatically generated with your LAN IP address so smartphones and tablets on the same Wi-Fi can scan and view models immediately.
- Includes a network adapter dropdown selector to easily toggle between Wi-Fi, Ethernet, and custom domain/ngrok URLs.

### 5. High-Resolution QR Customization & Print Sheet
- Real-time QR customization:
  - Custom color palettes (Electric Cyan, Unity Dark, Emerald, Purple).
  - Center emblem overlays: **SJRC 3D Studio**, **Unity 3D Official Badge**, or **AR Hologram Cube**.
  - High error-correction level ('H') for reliable scanning with logos.
  - Export to high-res PNG or SVG.
  - **"Print AR Marker Sheet"**: Printable card with high-contrast QR code, model name, and scanning instructions.

---

## 🚀 Quick Start Guide

### 1. Start the Server
```bash
npm start
```
The server will start on port 3000:
- **Local Studio**: `http://localhost:3000`
- **Mobile / Unity AR (LAN)**: `http://<your-lan-ip>:3000`

### 2. Upload or Test with Pre-Loaded Samples
The portal comes with 4 pre-loaded 3D samples for testing:
1. **Cyber Sentinel** (`robot.glb`) - Sci-Fi PBR robot
2. **Spur Gear** (`gear.stl`) - Precision CAD mechanical gear
3. **Roman Pillar** (`pillar.obj`) - Architectural column
4. **SJRC Championship Trophy** (`trophy.fbx`) - Autodesk FBX award model

Drag and drop your own `.obj`, `.stl`, `.glb`, or `.fbx` file into the upload zone to generate its AR QR code immediately.

---

## 📱 How to Use the QR Codes

### Option A: Scan with Phone Camera (No App Required)
1. Set the scan destination to **Universal WebAR**.
2. Open your smartphone camera (iOS or Android).
3. Scan the QR code on screen or printed card.
4. Tap the link to open the 3D viewer, then tap **"View in your Room (AR)"** to place the 3D model on your floor or table!

### Option B: Scan with Unity AR Application
1. Click the **"Unity C# Scripts"** button in the top navigation bar.
2. Download or copy `ARModelQRScanner.cs` and `RuntimeModelLoader.cs`.
3. Add them to your Unity AR Foundation scene (attached to the AR Camera).
4. Run your Unity app on iOS or Android and aim the camera at the generated QR code.
5. The Unity script downloads the model at runtime and instantiates it on the detected AR plane!

---

## 📁 Project Structure

```
├── server.js                          # Express server, multi-part uploads, LAN IP detection, QR generator
├── package.json                       # Dependencies & start scripts
├── generate-samples.js                # Sample 3D model generator
├── uploads/                           # Persistent directory for uploaded 3D assets & converted GLBs
├── public/
│   ├── index.html                     # 3D Studio & AR QR Generator Dashboard
│   ├── ar-view.html                   # Mobile WebAR Viewer (Google Scene Viewer / Quick Look)
│   ├── css/
│   │   ├── style.css                  # Studio styling, glassmorphism, responsive grid & print stylesheet
│   │   └── ar-view.css                # Mobile AR view stylesheet
│   ├── js/
│   │   ├── app.js                     # Main application logic & UI binding
│   │   ├── viewer.js                  # Three.js 3D viewport, lighting, and loaders (OBJ, STL, GLB, FBX)
│   │   ├── qr-generator.js            # Canvas QR generator with logo overlays & SVG/PNG export
│   │   └── ar-view.js                 # Controller for mobile AR view
│   └── assets/
│       ├── samples/                   # Pre-loaded 3D models (robot.glb, gear.stl, pillar.obj, trophy.fbx)
│       └── unity/                     # Downloadable Unity C# scripts & integration guide
│           ├── ARModelQRScanner.cs    # AR Foundation QR scanner script
│           ├── RuntimeModelLoader.cs  # Universal runtime 3D model loader
│           └── UnityARSceneGuide.md   # Step-by-step Unity integration guide
```

---

## 🛠️ API Reference

- `GET /api/network-info`: Returns active local IP, all network adapters, and recommended host URL.
- `GET /api/samples`: Returns list of pre-loaded sample models.
- `POST /api/upload`: Multi-part file upload endpoint for 3D models (`.obj`, `.stl`, `.glb`, `.fbx`).
- `GET /api/models/:id`: Returns metadata for a specific 3D model.
- `GET /api/models/:id/unity-manifest.json`: Standardized Unity AR JSON manifest consumed by `ARModelQRScanner.cs`.
- `POST /api/models/:id/save-glb`: Saves client-side converted universal GLB stream.
- `GET /api/qr`: Dynamic QR code generator (PNG, SVG, or data URL with custom colors).

---

© 2026 SJRC Designs. All rights reserved.
