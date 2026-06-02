// 백엔드 ChildResponse 대응
export type ChildStatus = 'ENROLLED' | 'PENDING' | 'GRADUATED' | 'WITHDRAWN';

export interface Child {
  id: number;
  name: string;
  birthDate?: string | null; // yyyy-MM-dd
  gender?: string | null;
  status: string; // 백엔드는 String으로 응답 (ChildStatus 값들이 들어옴)
  memo?: string | null;
}

export interface ChildCreateRequest {
  name: string;
  birthDate?: string;
  gender?: string;
  memo?: string;
}

export interface ChildUpdateRequest extends ChildCreateRequest {
  status?: string;
}
