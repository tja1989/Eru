jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  setAuthToken: jest.fn(),
}));

import { locationsService } from '@/services/locationsService';
import api from '@/services/api';

describe('locationsService.search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls GET /locations with the q param', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        results: [
          { pincode: '400001', area: 'Fort', district: 'Mumbai', state: 'Maharashtra' },
        ],
      },
    });

    const results = await locationsService.search('Fort');

    expect(api.get).toHaveBeenCalledWith('/locations', { params: { q: 'Fort' } });
    expect(results).toHaveLength(1);
    expect(results[0].pincode).toBe('400001');
    expect(results[0].area).toBe('Fort');
  });

  it('returns empty array when results is empty', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { results: [] } });
    const results = await locationsService.search('zzznomatch');
    expect(results).toEqual([]);
  });

  it('passes different query strings correctly', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        results: [
          { pincode: '110001', area: 'Connaught Place', district: 'New Delhi', state: 'Delhi' },
        ],
      },
    });
    await locationsService.search('110001');
    expect(api.get).toHaveBeenCalledWith('/locations', { params: { q: '110001' } });
  });
});
