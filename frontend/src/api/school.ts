import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { RegionInfo, Sigungu, SchoolInfo } from '../types/school';

export const getRegions = async (): Promise<RegionInfo[]> => {
  const response = await instance.get<ApiResponse<RegionInfo[]>>('/api/schools/regions');
  return response.data.data;
};

export const getSigungu = async (sidoCode: string): Promise<Sigungu[]> => {
  const response = await instance.get<ApiResponse<Sigungu[]>>(`/api/schools/regions/${sidoCode}`);
  return response.data.data;
};

export const searchSchools = async (name: string): Promise<SchoolInfo[]> => {
  const response = await instance.get<ApiResponse<SchoolInfo[]>>('/api/schools/search', {
    params: { name },
  });
  return response.data.data;
};

export const searchKindergartens = async (
  sidoCode: string,
  sggCode: string,
  name: string
): Promise<SchoolInfo[]> => {
  const response = await instance.get<ApiResponse<SchoolInfo[]>>('/api/schools/kindergartens', {
    params: { sidoCode, sggCode, name },
  });
  return response.data.data;
};
