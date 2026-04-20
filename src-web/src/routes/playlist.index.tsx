import { createFileRoute } from '@tanstack/react-router'
import Nav from '@/components/nav'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/ui/sidebar'

export const Route = createFileRoute('/playlist/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { state } = useSidebar()
  return <div className="flex flex-col h-screen items-center bg-background">
    <Nav>
      <div>
        <h1 className="font-semibold line-clamp-1 select-none cursor-default">
          Playlists
        </h1>
      </div>
      <div />
    </Nav>

    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <p>Select a playlist to view videos</p>
      </div>
    </div>
  </div>
}
