import * as faceapi from '@vladmandic/face-api';

let loaded = false;

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

export async function loadFaceModels() {
  if (loaded) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  loaded = true;
}

export interface FacePosition {
  x: number;
  y: number;
}

export async function detectFacePosition(imageUrl: string): Promise<FacePosition | null> {
  await loadFaceModels();

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = async () => {
      try {
        const result = await faceapi.detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions()
        );

        if (!result) return resolve(null);

        const faceCenterX = (result.box.x + result.box.width / 2) / img.width;
        const faceCenterY = (result.box.y + result.box.height / 2) / img.height;

        resolve({
          x: Math.round(faceCenterX * 100),
          y: Math.round(faceCenterY * 100),
        });
      } catch (err) {
        console.warn('Face detection error:', err);
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
  });
}

// Legacy function for backward compatibility
export async function detectFaceY(imageUrl: string): Promise<number | null> {
  const position = await detectFacePosition(imageUrl);
  return position?.y ?? null;
}
