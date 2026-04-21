import { businessService } from '@/services/businessService';
import api from '@/services/api';

jest.mock('@/services/api');

describe('businessService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('GETs /business/:id and returns the business payload', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: { business: { id: 'b1', name: 'Kashi' } } });
      const biz = await businessService.get('b1');
      expect(api.get).toHaveBeenCalledWith('/business/b1');
      expect(biz).toEqual({ id: 'b1', name: 'Kashi' });
    });
  });

  describe('search', () => {
    it('GETs /businesses/search?q=... and returns items', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          items: [
            { id: 'b1', name: 'Kashi Bakes', category: 'bakery', pincode: '682016', avatarUrl: null },
          ],
        },
      });
      const out = await businessService.search('kashi');
      expect(api.get).toHaveBeenCalledWith('/businesses/search', { params: { q: 'kashi' } });
      expect(out).toEqual([
        { id: 'b1', name: 'Kashi Bakes', category: 'bakery', pincode: '682016', avatarUrl: null },
      ]);
    });

    it('trims whitespace and skips API call when query is empty', async () => {
      const result1 = await businessService.search('  ');
      expect(api.get).not.toHaveBeenCalled();
      expect(result1).toEqual([]);

      const result2 = await businessService.search('');
      expect(api.get).not.toHaveBeenCalled();
      expect(result2).toEqual([]);
    });
  });
});
