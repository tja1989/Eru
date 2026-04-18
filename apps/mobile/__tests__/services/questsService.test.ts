import api from '@/services/api';
import { questsService } from '@/services/questsService';

describe('questsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getWeekly() calls GET /quests/weekly and returns the quests array', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { quests: [{ id: 'q1', title: 'x' }] },
    });
    const result = await questsService.getWeekly();
    expect(api.get).toHaveBeenCalledWith('/quests/weekly');
    expect(result).toEqual([{ id: 'q1', title: 'x' }]);
  });
});
