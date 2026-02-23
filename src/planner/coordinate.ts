import { Vector3 } from './types';

// Spec coordinates: x/y on launch field, z is height.
// Scene coordinates: x/z on ground plane, y is height.
export function specToSceneVector(value: Vector3): Vector3 {
  return {
    x: value.x,
    y: value.z,
    z: value.y,
  };
}

export function specToSceneArray(value: Vector3): [number, number, number] {
  return [value.x, value.z, value.y];
}

