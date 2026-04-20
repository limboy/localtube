import { createFileRoute } from "@tanstack/react-router";
import VideoListPlayer from "@/components/video-list-player";

export const Route = createFileRoute("/channel/$channelId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { channelId } = Route.useParams();
  const { showBookmarkedOnly, autoPlay } = Route.useSearch() as any;
  return <VideoListPlayer channelId={channelId} showBookmarkedOnly={!!showBookmarkedOnly} autoPlay={autoPlay !== false} />;
}
