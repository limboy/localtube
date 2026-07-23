import { createFileRoute } from "@tanstack/react-router";
import VideoListPlayer from "@/components/video-list-player";

export const Route = createFileRoute("/folder/$folderId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { folderId } = Route.useParams();
  const { showBookmarkedOnly, autoPlay, videoId } = Route.useSearch() as any;
  return <VideoListPlayer folderId={folderId} showBookmarkedOnly={!!showBookmarkedOnly} autoPlay={autoPlay !== false} initialVideoId={videoId} />;
}
