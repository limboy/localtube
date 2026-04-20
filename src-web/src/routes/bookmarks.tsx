import { createFileRoute } from '@tanstack/react-router'
import VideoListPlayer from '@/components/video-list-player'
import { z } from 'zod'

const bookmarksSearchSchema = z.object({
  videoId: z.string().optional()
})

export const Route = createFileRoute('/bookmarks')({
  component: RouteComponent,
  validateSearch: (search) => bookmarksSearchSchema.parse(search),
})

function RouteComponent() {
  const { videoId } = Route.useSearch()

  return (
    <VideoListPlayer 
      showBookmarkedOnly={true} 
      initialVideoId={videoId}
    />
  )
}
