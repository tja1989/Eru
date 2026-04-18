import api from '@/services/api';

const pollService = {
  vote: (contentId: string, pollOptionId: string) =>
    api.post(`/polls/${contentId}/vote`, { pollOptionId }).then((r) => r.data),
};

export default pollService;
