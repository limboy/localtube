import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ChannelInfo } from '@/types'
import { loadChannels } from '@/lib/utils'
import { CircleUserRound } from 'lucide-react'
import Nav from '@/components/nav'
import { UpdateIndicator } from '@/components/update-indicator'

export const Route = createFileRoute('/channel/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [channels, setChannels] = useState<ChannelInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = () => {
      loadChannels().then(data => {
        setChannels(data)
        setIsLoading(false)
      })
    }
    fetchData()

    window.addEventListener('store-updated', fetchData)
    return () => window.removeEventListener('store-updated', fetchData)
  }, [])

  return (
    <div className="flex flex-col h-screen items-center bg-background overflow-hidden w-full">
      <Nav>
        <div>
          <h1 className="font-semibold line-clamp-1 select-none cursor-default">
            Channels
          </h1>
        </div>
        <div className="flex items-center">
          <UpdateIndicator />
        </div>
      </Nav>

      <div className="flex-1 w-full overflow-y-auto p-8 max-w-5xl">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading channels...</div>
          </div>
        ) : channels.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p>No channels added yet.</p>
              <p className="text-sm">Click the + button in the sidebar to add one.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="group cursor-pointer flex flex-col items-center text-center gap-3"
                onClick={() => navigate({ to: '/channel/$channelId', params: { channelId: channel.id } })}
              >
                <div className="w-24 h-24 relative overflow-hidden rounded-full bg-muted shadow-sm group-hover:shadow-md transition-shadow">
                  {channel.thumbnail ? (
                    <img
                      src={channel.thumbnail}
                      alt={channel.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CircleUserRound size={48} className="text-muted-foreground/20" />
                    </div>
                  )}
                  {channel.unreadCount > 0 && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-background">
                      {channel.unreadCount}
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {channel.title}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
