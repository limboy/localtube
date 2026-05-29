import { createFileRoute } from '@tanstack/react-router'
import LatestPlayer from '@/components/latest-player'

export const Route = createFileRoute('/latest')({
  component: RouteComponent,
})

function RouteComponent() {
  return <LatestPlayer />
}
