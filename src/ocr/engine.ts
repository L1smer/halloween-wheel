import { useCallback } from 'react';
import { Skia } from '@shopify/react-native-skia';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { models, setTelemetryEnabled, useOpticalCharacterRecognizer } from 'react-native-executorch';
import type { ImageBuffer } from 'react-native-executorch/cv';

import type { OcrEngine, OcrRead } from './types';

// Receipts are read on the iPad with ExecuTorch running PP-OCRv6 (Core ML on iPad).
// The model (about 8–25 MB) downloads once on first launch and is cached after that.
setTelemetryEnabled(false);
const MODEL = models.ocr.PADDLE.PPOCRV6_SMALL.DEFAULT;

// Receipt text stays sharp at this width and the detector runs fast
const READ_WIDTH = 1280;

// Photos never pile up on the iPad: the capture goes as soon as it is decoded,
// and only the latest resized copy is kept, for the snapshot on screen.
let lastSaved: string | null = null;
function remove(uri: string | null) {
  if (!uri) return;
  try { new File(uri).delete(); } catch { /* already gone */ }
}

async function decode(uri: string): Promise<{ buffer: ImageBuffer; uri: string }> {
  let saved;
  try {
    const resized = await ImageManipulator.manipulate(uri).resize({ width: READ_WIDTH }).renderAsync();
    saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  } finally {
    remove(uri);
  }
  remove(lastSaved);
  lastSaved = saved.uri;
  const data = await Skia.Data.fromURI(saved.uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not decode the photo');
  const pixels = image.readPixels();
  if (!(pixels instanceof Uint8Array)) throw new Error('Could not read the photo pixels');
  const buffer: ImageBuffer = { data: pixels, width: image.width(), height: image.height(), format: 'rgba', layout: 'hwc' };
  image.dispose();
  data.dispose();
  return { buffer, uri: saved.uri };
}

export function useOcrEngine(): OcrEngine {
  const ocr = useOpticalCharacterRecognizer(MODEL);
  const recognize = ocr.recognizeCharacters;

  const read = useCallback(async (photoUri: string): Promise<OcrRead> => {
    if (!recognize) throw new Error('The OCR model is not ready yet');
    const { buffer, uri } = await decode(photoUri);
    const detections = await recognize(buffer, { confidenceThreshold: 0.4 });
    return { detections, uri, width: buffer.width, height: buffer.height };
  }, [recognize]);

  return {
    ready: ocr.isReady,
    progress: ocr.downloadProgress,
    error: ocr.error ? String(ocr.error.message ?? ocr.error) : null,
    read,
  };
}
