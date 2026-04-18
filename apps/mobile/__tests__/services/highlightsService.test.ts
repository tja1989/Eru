import api from '@/services/api';
import { highlightsService } from '@/services/highlightsService';

describe('highlightsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listForUser() calls GET /users/:id/highlights and returns highlights array', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { highlights: [{ id: 'h1', title: 'Travel', emoji: '✈️', sortOrder: 0, createdAt: '2026-01-01', itemCount: 3 }] },
    });
    const result = await highlightsService.listForUser('u1');
    expect(api.get).toHaveBeenCalledWith('/users/u1/highlights');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('h1');
  });

  it('create() POSTs /highlights and returns created highlight', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { highlight: { id: 'h2', title: 'Food', emoji: '🍜', sortOrder: 0, createdAt: '2026-01-01' } },
    });
    const result = await highlightsService.create({ title: 'Food', emoji: '🍜' });
    expect(api.post).toHaveBeenCalledWith('/highlights', { title: 'Food', emoji: '🍜' });
    expect(result.id).toBe('h2');
  });

  it('create() passes sortOrder when provided', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { highlight: { id: 'h3', title: 'Fun', emoji: '🎉', sortOrder: 2, createdAt: '2026-01-01' } },
    });
    await highlightsService.create({ title: 'Fun', emoji: '🎉', sortOrder: 2 });
    expect(api.post).toHaveBeenCalledWith('/highlights', { title: 'Fun', emoji: '🎉', sortOrder: 2 });
  });

  it('update() PUTs /highlights/:id and returns updated highlight', async () => {
    (api.put as jest.Mock).mockResolvedValue({
      data: { highlight: { id: 'h1', title: 'Updated', emoji: '🌟', sortOrder: 1, createdAt: '2026-01-01' } },
    });
    const result = await highlightsService.update('h1', { title: 'Updated' });
    expect(api.put).toHaveBeenCalledWith('/highlights/h1', { title: 'Updated' });
    expect(result.title).toBe('Updated');
  });

  it('remove() DELETEs /highlights/:id', async () => {
    (api.delete as jest.Mock).mockResolvedValue({ data: { success: true } });
    await highlightsService.remove('h1');
    expect(api.delete).toHaveBeenCalledWith('/highlights/h1');
  });

  it('getHighlight() calls GET /highlights/:id and returns highlight with items', async () => {
    const mockHighlight = { id: 'h1', title: 'Travel', emoji: '✈️', items: [{ id: 'i1', content: { id: 'c1' } }] };
    (api.get as jest.Mock).mockResolvedValue({ data: { highlight: mockHighlight } });
    const result = await highlightsService.getHighlight('h1');
    expect(api.get).toHaveBeenCalledWith('/highlights/h1');
    expect(result.items).toHaveLength(1);
  });

  it('addItem() POSTs /highlights/:id/items and returns item', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { item: { id: 'i1', highlightId: 'h1', contentId: 'c1', sortOrder: 0 } },
    });
    const result = await highlightsService.addItem('h1', 'c1');
    expect(api.post).toHaveBeenCalledWith('/highlights/h1/items', { contentId: 'c1' });
    expect(result.id).toBe('i1');
  });

  it('removeItem() DELETEs /highlights/:id/items/:itemId', async () => {
    (api.delete as jest.Mock).mockResolvedValue({ data: { success: true } });
    await highlightsService.removeItem('h1', 'i1');
    expect(api.delete).toHaveBeenCalledWith('/highlights/h1/items/i1');
  });
});
