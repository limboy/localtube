import { createFileRoute } from '@tanstack/react-router'
import LatestPlayer from '@/components/latest-player'

export const Route = createFileRoute('/all-unseen')({
  component: RouteComponent,
})

function RouteComponent() {
  return <LatestPlayer onlyUnseen title="All Unseen" />
}
