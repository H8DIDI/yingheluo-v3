import { Project } from '../types';

export interface HealthStatus {
  ok: boolean;
  dbPath: string;
  time: string;
  uptimeSec: number;
}

export interface ProjectRecord {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectRecord {
  data: Project;
}

function resolveApiBase() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) return envBase;

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (protocol === 'http:' || protocol === 'https:') {
      return `${protocol}//${hostname}/api`;
    }
  }

  return '/api';
}

const API_BASE = resolveApiBase();

function toDate(value: string | Date | undefined) {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    positions: project.positions ?? [],
    events: project.events ?? [],
    cues: project.cues ?? [],
    cueList: project.cueList ?? [],
    createdAt: toDate(project.createdAt as unknown as string | Date),
    updatedAt: toDate(project.updatedAt as unknown as string | Date),
  };
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : (null as T);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return payload;
}

export async function fetchHealth(): Promise<HealthStatus> {
  return requestJson<HealthStatus>('/health');
}

export async function listProjects(): Promise<ProjectRecord[]> {
  return requestJson<ProjectRecord[]>('/projects');
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const detail = await requestJson<ProjectDetail>(`/projects/${id}`);
  return {
    ...detail,
    data: normalizeProject(detail.data),
  };
}

export async function createProject(payload: {
  id?: string;
  name: string;
  data: Project;
}): Promise<ProjectRecord> {
  return requestJson<ProjectRecord>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProject(
  id: string,
  payload: { name?: string; data?: Project }
): Promise<ProjectRecord> {
  return requestJson<ProjectRecord>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' });
}
