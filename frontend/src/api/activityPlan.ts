import api from './instance';
import type { ApiResponse } from '../types/auth';
import type {
  ActivityPlanDetail,
  ActivityPlanSummary,
  MontessoriHistoryItem,
} from '../types/activityPlan';

export interface ActivityPlanListParams {
  classroomId?: number;
  from?: string; // yyyy-MM-dd
  to?: string; // yyyy-MM-dd
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

  // 업로드는 multipart/form-data
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

  // 원본 HWP 다운로드용 URL (실제 다운로드 트리거는 Step 3-B).
  // 주의: 이 엔드포인트는 JWT 인증이 필요하므로 단순 링크 클릭만으로는
  //       토큰이 실리지 않는다. 3-B에서 blob 다운로드로 처리 예정.
  downloadUrl: (id: number) => `/api/activity-plans/${id}/file`,

  // 아이별 몬테소리 누적 이력
  listChildMontessori: (childId: number) =>
    api
      .get<ApiResponse<MontessoriHistoryItem[]>>(
        `/api/activity-plans/children/${childId}/montessori`
      )
      .then((r) => r.data.data),
};
