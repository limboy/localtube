import { useState, useEffect } from 'react';
import { enrichBookmarks } from '@/lib/utils';
import { VideoListInfo, VideoItem, EnrichedBookmark } from '@/types';

export function useEnrichedBookmarks() {
  const [bookmarkedVideos, setBookmarkedVideos] = useState<VideoListInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBookmarkedVideos();
  }, []);

  async function loadBookmarkedVideos() {
    const enriched = await enrichBookmarks();
    const videos = transformToVideoList(enriched);
    setBookmarkedVideos(videos);
    setIsLoading(false);
  }

  return { bookmarkedVideos, isLoading };
}

function transformToVideoList(enriched: EnrichedBookmark[]): VideoListInfo {
  const items: VideoItem[] = [];
  enriched.forEach(bookmark => {
    if (bookmark.data) {
      const video = bookmark.data.items.find(item => item.id === bookmark.id);
      if (video) {
        items.push(video);
      }
    }
  });

  return {
    id: 'bookmarks',
    title: 'Bookmarked Videos',
    lastUpdated: Date.now(),
    unreadCount: 0,
    items
  };
}
