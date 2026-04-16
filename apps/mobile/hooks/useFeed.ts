import { useState, useCallback } from 'react';
import { feedService } from '../services/feedService';

export function useFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (loading && !isRefresh) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const result = await feedService.getFeed(pageNum);
      if (isRefresh || pageNum === 1) setPosts(result.data);
      else setPosts((prev) => [...prev, ...result.data]);
      setHasMore(result.nextPage !== null);
      setPage(pageNum);
    } catch (error) { console.error('Feed load error:', error); }
    setLoading(false); setRefreshing(false);
  }, [loading]);

  const refresh = () => loadFeed(1, true);
  const loadMore = () => { if (hasMore && !loading) loadFeed(page + 1); };

  return { posts, loading, refreshing, hasMore, refresh, loadMore, loadFeed };
}
