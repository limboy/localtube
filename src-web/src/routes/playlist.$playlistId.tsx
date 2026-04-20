import { createFileRoute } from "@tanstack/react-router";
import VideoListPlayer from "@/components/video-list-player";

export const Route = createFileRoute("/playlist/$playlistId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { playlistId } = Route.useParams();
  const { showBookmarkedOnly } = Route.useSearch() as any;
  return <VideoListPlayer playlistId={playlistId} showBookmarkedOnly={!!showBookmarkedOnly} />;
}
