import { forwardRef, useImperativeHandle } from 'react';

import type { CameraFeedHandle } from './CameraFeed';

// Web preview only: no camera, the preview OCR engine supplies sample receipts.
export type { CameraFeedHandle };

export const CameraFeed = forwardRef<CameraFeedHandle, { onDenied: () => void }>(function CameraFeed(_, ref) {
  useImperativeHandle(ref, () => ({ isReady: () => true, capture: async () => 'sample' }), []);
  return null;
});
