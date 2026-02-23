// Drone-related type definitions for future expansion

export interface DronePosition {
  x: number;
  y: number;
  z: number;
  yaw: number; // Rotation in degrees
}

export interface DroneConfig {
  id: string;
  name: string;
  maxSpeed: number; // m/s
  maxAltitude: number; // meters
  batteryLife: number; // seconds
  ledColors: string[]; // Available LED colors
}

export interface DroneSwarm {
  drones: DronePosition[];
  formation: 'grid' | 'sphere' | 'custom';
  syncMode: 'synchronized' | 'sequential';
}

export interface DroneShow {
  id: string;
  name: string;
  swarm: DroneSwarm;
  timeline: DroneKeyframe[];
}

export interface DroneKeyframe {
  time: number; // seconds
  positions: DronePosition[];
  colors: string[];
  transition: 'linear' | 'ease' | 'bezier';
}
