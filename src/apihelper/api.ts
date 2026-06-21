/**
 * Static build stub for the API client.
 * Returns default/empty responses for all API calls.
 * The return type is flexible to match the original axios API shape.
 */

type ApiResponse = {
  data: any;
  status?: number;
};

const stubAxios = {
  get: async (_url: string, _config?: any): Promise<ApiResponse> => ({
    data: [],
    status: 200,
  }),
  post: async (_url: string, _data?: any, _config?: any): Promise<ApiResponse> => ({
    data: { data: null },
    status: 200,
  }),
  put: async (_url: string, _data?: any, _config?: any): Promise<ApiResponse> => ({
    data: { data: null },
    status: 200,
  }),
  patch: async (_url: string, _data?: any, _config?: any): Promise<ApiResponse> => ({
    data: { data: null },
    status: 200,
  }),
  delete: async (_url: string, _config?: any): Promise<ApiResponse> => ({
    data: { data: null },
    status: 200,
  }),
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} },
  },
};

export default stubAxios;
