import sharp from 'sharp';

export interface CVSignalResult {
  name: string;
  score: number;      // 0.0 - 1.0
  passed: boolean;    // score >= threshold
  details: string;    // human-readable
}

export interface CVAnalysisResult {
  signals: CVSignalResult[];
  passedCount: number;
  processingMs: number;
}

const ANALYSIS_SIZE = 200;
const NEIGHBORS_4: readonly [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// --- Color space helpers ---

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) {
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    } else if (max === gn) {
      h = ((bn - rn) / d + 2) / 6;
    } else {
      h = ((rn - gn) / d + 4) / 6;
    }
  }
  return [h * 360, s, l]; // h in degrees, s and l in 0-1
}

// --- Signal 1: Color Diversity ---
// Builds 12-bin hue histogram, computes Shannon entropy
// Food photos have high color diversity; screenshots/solid images don't

function analyzeColorDiversity(raw: Buffer, width: number, height: number): CVSignalResult {
  const bins = new Array(12).fill(0);
  let saturatedPixels = 0;

  for (let i = 0; i < width * height; i++) {
    const r = raw[i * 3];
    const g = raw[i * 3 + 1];
    const b = raw[i * 3 + 2];
    const [h, s] = rgbToHsl(r, g, b);

    // Only count pixels with some saturation
    if (s > 0.15) {
      const bin = Math.min(Math.floor(h / 30), 11);
      bins[bin]++;
      saturatedPixels++;
    }
  }

  if (saturatedPixels === 0) {
    return { name: 'color_diversity', score: 0.0, passed: false, details: 'No saturated pixels (grayscale image)' };
  }

  // Shannon entropy
  let entropy = 0;
  for (const count of bins) {
    if (count > 0) {
      const p = count / saturatedPixels;
      entropy -= p * Math.log2(p);
    }
  }

  // Max entropy for 12 bins = log2(12) ≈ 3.585
  const normalizedEntropy = entropy / Math.log2(12);
  const passed = entropy > 2.0;
  const score = Math.min(normalizedEntropy, 1.0);

  return {
    name: 'color_diversity',
    score: Math.round(score * 100) / 100,
    passed,
    details: `Hue entropy: ${entropy.toFixed(2)} (${bins.filter(b => b > 0).length}/12 bins used)`,
  };
}

// --- Signal 2: Saturation & Warmth ---
// Food photos tend to have warm, saturated colors (reds, oranges, yellows, browns)

function analyzeSaturationWarmth(raw: Buffer, width: number, height: number): CVSignalResult {
  const totalPixels = width * height;
  let warmSaturated = 0;

  for (let i = 0; i < totalPixels; i++) {
    const r = raw[i * 3];
    const g = raw[i * 3 + 1];
    const b = raw[i * 3 + 2];
    const [h, s] = rgbToHsl(r, g, b);

    // Warm range: 0-60° (red/orange/yellow) and 300-360° (pink/magenta)
    const isWarm = h <= 60 || h >= 300;
    if (isWarm && s > 0.3) {
      warmSaturated++;
    }
  }

  const warmRatio = warmSaturated / totalPixels;
  const passed = warmRatio > 0.35;
  const score = Math.min(warmRatio / 0.5, 1.0); // normalize: 50% warm → score 1.0

  return {
    name: 'saturation_warmth',
    score: Math.round(score * 100) / 100,
    passed,
    details: `${(warmRatio * 100).toFixed(1)}% warm saturated pixels`,
  };
}

// --- Signal 3: Texture Variance ---
// Divides into 8x8 grid, computes luminance stddev per patch
// Food has varied textures; screenshots are smooth

function analyzeTextureVariance(raw: Buffer, width: number, height: number): CVSignalResult {
  const gridSize = 8;
  const patchW = Math.floor(width / gridSize);
  const patchH = Math.floor(height / gridSize);
  const patchStddevs: number[] = [];

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const values: number[] = [];
      for (let py = 0; py < patchH; py++) {
        for (let px = 0; px < patchW; px++) {
          const x = gx * patchW + px;
          const y = gy * patchH + py;
          const idx = (y * width + x) * 3;
          // Luminance approximation
          const lum = 0.299 * raw[idx] + 0.587 * raw[idx + 1] + 0.114 * raw[idx + 2];
          values.push(lum);
        }
      }

      if (values.length > 0) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
        patchStddevs.push(Math.sqrt(variance));
      }
    }
  }

  const meanStddev = patchStddevs.length > 0
    ? patchStddevs.reduce((a, b) => a + b, 0) / patchStddevs.length
    : 0;

  const passed = meanStddev > 12;
  // Normalize: stddev 20 → score 1.0
  const score = Math.min(meanStddev / 20, 1.0);

  return {
    name: 'texture_variance',
    score: Math.round(score * 100) / 100,
    passed,
    details: `Mean patch stddev: ${meanStddev.toFixed(1)}`,
  };
}

// --- Signal 4: Multi-Region Detection ---
// Quantizes to 8 colors, flood-fills to count distinct regions
// Food photos have multiple visual regions (plate, food items, background)

function analyzeMultiRegion(raw: Buffer, width: number, height: number): CVSignalResult {
  const totalPixels = width * height;
  const minRegionSize = Math.floor(totalPixels * 0.01); // 1% of image

  // Quantize each pixel to one of 8 color buckets (3-bit: R>128, G>128, B>128)
  const quantized = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const r = raw[i * 3] > 128 ? 4 : 0;
    const g = raw[i * 3 + 1] > 128 ? 2 : 0;
    const b = raw[i * 3 + 2] > 128 ? 1 : 0;
    quantized[i] = r | g | b;
  }

  // Flood-fill to find contiguous regions
  const visited = new Uint8Array(totalPixels);
  let regionCount = 0;

  for (let start = 0; start < totalPixels; start++) {
    if (visited[start]) continue;

    const color = quantized[start];
    const stack: number[] = [start];
    let size = 0;

    while (stack.length > 0) {
      const idx = stack.pop()!;
      if (visited[idx]) continue;
      visited[idx] = 1;
      size++;

      const x = idx % width;
      const y = Math.floor(idx / width);

      // 4-connected neighbors
      if (x > 0 && !visited[idx - 1] && quantized[idx - 1] === color) stack.push(idx - 1);
      if (x < width - 1 && !visited[idx + 1] && quantized[idx + 1] === color) stack.push(idx + 1);
      if (y > 0 && !visited[idx - width] && quantized[idx - width] === color) stack.push(idx - width);
      if (y < height - 1 && !visited[idx + width] && quantized[idx + width] === color) stack.push(idx + width);
    }

    if (size >= minRegionSize) {
      regionCount++;
    }
  }

  const passed = regionCount >= 4;
  // Normalize: 6+ regions → score 1.0
  const score = Math.min(regionCount / 6, 1.0);

  return {
    name: 'multi_region',
    score: Math.round(score * 100) / 100,
    passed,
    details: `${regionCount} distinct regions (>1% area)`,
  };
}

// --- Signal 5: Specular Highlights ---
// Detects isolated bright spots (oil shine, sauce gloss, wet surfaces)

function analyzeSpecularHighlights(raw: Buffer, width: number, height: number): CVSignalResult {
  const totalPixels = width * height;

  // Find bright pixels (luminance > 240) with darker neighbors (< 200)
  const brightMask = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const lum = 0.299 * raw[i * 3] + 0.587 * raw[i * 3 + 1] + 0.114 * raw[i * 3 + 2];
    if (lum > 240) {
      const x = i % width;
      const y = Math.floor(i / width);

      // Check if at least one neighbor is significantly darker
      let hasDarkNeighbor = false;
      for (const [dx, dy] of NEIGHBORS_4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const ni = ny * width + nx;
          const nlum = 0.299 * raw[ni * 3] + 0.587 * raw[ni * 3 + 1] + 0.114 * raw[ni * 3 + 2];
          if (nlum < 200) {
            hasDarkNeighbor = true;
            break;
          }
        }
      }

      if (hasDarkNeighbor) {
        brightMask[i] = 1;
      }
    }
  }

  // Count clusters of specular highlights via flood-fill
  const visited = new Uint8Array(totalPixels);
  let clusterCount = 0;

  for (let start = 0; start < totalPixels; start++) {
    if (!brightMask[start] || visited[start]) continue;

    // Flood-fill cluster
    const stack: number[] = [start];
    let clusterSize = 0;

    while (stack.length > 0) {
      const idx = stack.pop()!;
      if (visited[idx]) continue;
      visited[idx] = 1;
      clusterSize++;

      const x = idx % width;
      const y = Math.floor(idx / width);

      for (const [dx, dy] of NEIGHBORS_4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const ni = ny * width + nx;
          if (brightMask[ni] && !visited[ni]) stack.push(ni);
        }
      }
    }

    // Only count clusters with 2+ pixels (avoid noise)
    if (clusterSize >= 2) {
      clusterCount++;
    }
  }

  const passed = clusterCount >= 2;
  // Normalize: 5+ clusters → score 1.0
  const score = Math.min(clusterCount / 5, 1.0);

  return {
    name: 'specular_highlights',
    score: Math.round(score * 100) / 100,
    passed,
    details: `${clusterCount} specular highlight clusters`,
  };
}

// --- Signal 6: Circular Contours ---
// Sobel edge detection + curvature analysis in center region
// Plates, bowls, and round food create curved edges

function analyzeCircularContours(raw: Buffer, width: number, height: number): CVSignalResult {
  const totalPixels = width * height;

  // Convert to grayscale
  const gray = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    gray[i] = Math.round(0.299 * raw[i * 3] + 0.587 * raw[i * 3 + 1] + 0.114 * raw[i * 3 + 2]);
  }

  // Sobel edge detection
  const edgeMag = new Float32Array(totalPixels);
  const edgeDir = new Float32Array(totalPixels);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // 3x3 Sobel kernels
      const tl = gray[(y - 1) * width + (x - 1)];
      const tc = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];
      const ml = gray[y * width + (x - 1)];
      const mr = gray[y * width + (x + 1)];
      const bl = gray[(y + 1) * width + (x - 1)];
      const bc = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

      const idx = y * width + x;
      edgeMag[idx] = Math.sqrt(gx * gx + gy * gy);
      edgeDir[idx] = Math.atan2(gy, gx); // radians
    }
  }

  // Analyze center 60% of image
  const cx1 = Math.floor(width * 0.2);
  const cx2 = Math.floor(width * 0.8);
  const cy1 = Math.floor(height * 0.2);
  const cy2 = Math.floor(height * 0.8);
  const centerPixels = (cx2 - cx1) * (cy2 - cy1);

  let edgePixels = 0;
  let curvedEdges = 0;
  const edgeThreshold = 50; // magnitude threshold for edge pixel

  for (let y = cy1 + 1; y < cy2 - 1; y++) {
    for (let x = cx1 + 1; x < cx2 - 1; x++) {
      const idx = y * width + x;
      if (edgeMag[idx] > edgeThreshold) {
        edgePixels++;

        // Check curvature: compare direction with neighbors
        // Curved edges have gradually changing direction
        let dirChanges = 0;
        let neighborEdges = 0;

        for (const [dx, dy] of NEIGHBORS_4) {
          const ni = (y + dy) * width + (x + dx);
          if (edgeMag[ni] > edgeThreshold) {
            neighborEdges++;
            const angleDiff = Math.abs(edgeDir[idx] - edgeDir[ni]);
            // Gradual direction change (10-60 degrees) suggests curvature
            const normalizedDiff = angleDiff > Math.PI ? 2 * Math.PI - angleDiff : angleDiff;
            if (normalizedDiff > 0.17 && normalizedDiff < 1.05) { // ~10° to ~60°
              dirChanges++;
            }
          }
        }

        if (neighborEdges >= 2 && dirChanges >= 1) {
          curvedEdges++;
        }
      }
    }
  }

  const edgeDensity = edgePixels / centerPixels;
  const curvatureRatio = edgePixels > 0 ? curvedEdges / edgePixels : 0;
  const hasCurvature = curvatureRatio > 0.1;
  const passed = edgeDensity > 0.15 && hasCurvature;

  // Combined score: weighted edge density + curvature
  const densityScore = Math.min(edgeDensity / 0.2, 1.0);
  const curvatureScore = Math.min(curvatureRatio / 0.2, 1.0);
  const score = Math.min(densityScore * 0.5 + curvatureScore * 0.5, 1.0);

  return {
    name: 'circular_contours',
    score: Math.round(score * 100) / 100,
    passed,
    details: `Edge density: ${(edgeDensity * 100).toFixed(1)}%, curvature ratio: ${(curvatureRatio * 100).toFixed(1)}%`,
  };
}

// --- Main entry point ---

export async function analyzeCVSignals(imageBuffer: Buffer): Promise<CVAnalysisResult> {
  const start = Date.now();

  const { data: raw, info } = await sharp(imageBuffer)
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  const signals: CVSignalResult[] = [
    analyzeColorDiversity(raw, width, height),
    analyzeSaturationWarmth(raw, width, height),
    analyzeTextureVariance(raw, width, height),
    analyzeMultiRegion(raw, width, height),
    analyzeSpecularHighlights(raw, width, height),
    analyzeCircularContours(raw, width, height),
  ];

  return {
    signals,
    passedCount: signals.filter(s => s.passed).length,
    processingMs: Date.now() - start,
  };
}
