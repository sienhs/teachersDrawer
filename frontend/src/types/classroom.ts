// 백엔드 ClassroomResponse 대응
export type ClassroomStatus = 'ACTIVE' | 'ARCHIVED';

export interface Classroom {
  id: number;
  year: number;
  name: string;
  status: string; // 'ACTIVE' | 'ARCHIVED'
}

export interface ClassroomCreateRequest {
  year: number;
  name: string;
}

export interface ClassroomUpdateRequest {
  name: string;
}
