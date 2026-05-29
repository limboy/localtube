import { createFileRoute } from '@tanstack/react-router'
import HistoryPlayer from '@/components/history-player'

export const Route = createFileRoute('/history')({
  component: RouteComponent,
})

function RouteComponent() {
  return <HistoryPlayer />
}
