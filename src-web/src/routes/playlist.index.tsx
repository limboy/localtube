import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { PlaylistInfo } from '@/types'
import { loadPlaylists } from '@/lib/utils'
import { List } from 'lucide-react'
import Nav from '@/components/nav'

export const Route = createFileRoute('/playlist/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadPlaylists().then(data => {
      setPlaylists(data)
      setIsLoading(false)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen items-center bg-background overflow-hidden w-full">
      <Nav>
        <div>
          <h1 className="font-semibold line-clamp-1 select-none cursor-default">
            Playlists
          </h1>
        </div>
        <div />
      </Nav>

      <div className="flex-1 w-full overflow-y-auto p-8 max-w-5xl">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading playlists...</div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p>No playlists added yet.</p>
              <p className="text-sm">Click the + button in the sidebar to add one.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="group cursor-pointer flex flex-col gap-2"
                onClick={() => navigate({ to: '/playlist/$playlistId', params: { playlistId: playlist.id } })}
              >
                <div className="aspect-video w-full relative overflow-hidden rounded-lg bg-muted shadow-sm group-hover:shadow-md transition-shadow">
                  {playlist.thumbnail ? (
                    <img
                      src={playlist.thumbnail}
                      alt={playlist.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <List size={48} className="text-muted-foreground/20" />
                    </div>
                  )}
                  {playlist.unreadCount > 0 && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {playlist.unreadCount}
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {playlist.title}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
