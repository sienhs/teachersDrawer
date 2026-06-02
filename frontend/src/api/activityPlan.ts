import api from './instance';
import type { ApiResponse } from '../types/auth';
import type {
  ActivityPlanAnalysis,
  ActivityPlanConfirmRequest,
  ActivityPlanDetail,
  ActivityPlanSummary,
  MontessoriHistoryItem,
} from '../types/activityPlan';

export interface ActivityPlanListParams {
  classroomId?: number;
  from?: string; // yyyy-MM-dd
  to?: string;   // yyyy-MM-dd
}

// Content-Disposition 헤더에서 파일명 추출
// filename*=UTF-8''... 우선, 없으면 filename="..." 폴백
function extractFilename(header?: string): string {
  if (!header) return 'file.hwp';
  const starMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (starMatch) return decodeURIComponent(starMatch[1]);
  const match = header.match(/filename="([^"]+)"/i);
  if (match) return match[1];
  return 'file.hwp';
}

export const activityPlanApi = {
  list: (params?: ActivityPlanListParams) =>
    api
      .get<ApiResponse<ActivityPlanSummary[]>>('/api/activity-plans', { params })
      .then((r) => r.data.data),

  get: (id: number) =>
    api
      .get<ApiResponse<ActivityPlanDetail>>(`/api/activity-plans/${id}`)
      .then((r) => r.data.data),

  // 업로드는 multipart/form-data; 성공 시 ActivityPlanDetail (id 포함)
  upload: (file: File, classroomId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (classroomId != null) {
      formData.append('classroomId', String(classroomId));
    }
    return api
      .post<ApiResponse<ActivityPlanDetail>>('/api/activity-plans', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  delete: (id: number) =>
    api.delete<ApiResponse<void>>(`/api/activity-plans/${id}`).then((r) => r.data.data),

  // Authorization 헤더가 필요하므로 blob으로 받아 a 태그로 다운로드 트리거
  downloadFile: async (id: number) => {
    const response = await api.get(`/api/activity-plans/${id}/file`, {
      responseType: 'blob',
    });
    const filename = extractFilename(
      response.headers['content-disposition'] as string | undefined,
    );
    return { blob: response.data as Blob, filename };
  },

  // 아이별 몬테소리 누적 이력 (planDate 포함)
  listChildMontessori: (childId: number) =>
    api
      .get<ApiResponse<MontessoriHistoryItem[]>>(
        `/api/activity-plans/children/${childId}/montessori`,
      )
      .then((r) => r.data.data),

  // HWP 분석 (DB 저장 X — 팝업용)
  analyze: (file: File, classroomId?: number) => {
    const form = new FormData();
    form.append('file', file);
    if (classroomId != null) form.append('classroomId', String(classroomId));
    return api
      .post<ApiResponse<ActivityPlanAnalysis>>('/api/activity-plans/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  // 확정 저장
  confirm: (request: ActivityPlanConfirmRequest) =>
    api
      .post<ApiResponse<ActivityPlanDetail>>('/api/activity-plans/confirm', request)
      .then((r) => r.data.data),

  // 거부 시 임시 파일 삭제
  cancelTemp: (fileKey: string) =>
    api
      .delete<ApiResponse<void>>(`/api/activity-plans/temp?fileKey=${encodeURIComponent(fileKey)}`)
      .then((r) => r.data.data),

  // 편집 후 자동 저장 (MinIO 파일 교체)
  updateFile: (planId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .put<ApiResponse<void>>(`/api/activity-plans/${planId}/file`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },
};
