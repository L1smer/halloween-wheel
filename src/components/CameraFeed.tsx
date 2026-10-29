import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { CONFIG } from '../config';

export type CameraFeedHandle = {
  isReady: () => boolean;
  /** Takes a silent photo and returns its file URI. */
  capture: () => Promise<string>;
};

export const CameraFeed = forwardRef<CameraFeedHandle, { onDenied: () => void }>(function CameraFeed({ onDenied }, ref) {
  const [permission, request] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const ready = useRef(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      if (permission.canAskAgain) request();
      else onDenied();
    }
  }, [permission, request, onDenied]);

  useImperativeHandle(ref, () => ({
    isReady: () => ready.current && !!cam.current,
    async capture() {
      const photo = await cam.current!.takePictureAsync({ quality: 0.8, shutterSound: false });
      return photo.uri;
    },
  }), []);

  if (!permission?.granted) return null;
  return (
    <CameraView
      ref={cam}
      style={StyleSheet.absoluteFill}
      facing={CONFIG.cameraFacing}
      animateShutter={false}
      onCameraReady={() => { ready.current = true; }}
      onMountError={onDenied}
    />
  );
});
