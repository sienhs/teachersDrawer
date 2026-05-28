import instance from './instance';
import type { ApiResponse, LoginRequest, LoginResponse, SignupRequest } from '../types/auth';

export const login = async (request: LoginRequest): Promise<LoginResponse> => {
  const response = await instance.post<ApiResponse<LoginResponse>>('/api/auth/login', request);
  return response.data.data;
};

export const signup = async (request: SignupRequest): Promise<void> => {
  await instance.post<ApiResponse<null>>('/api/auth/signup', request);
};

export const logout = async (): Promise<void> => {
  await instance.post<ApiResponse<null>>('/api/auth/logout');
};

export const reissue = async (): Promise<string> => {
  const response = await instance.post<ApiResponse<string>>('/api/auth/reissue');
  return response.data.data;
};
