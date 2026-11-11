import type { Track } from './music'
import { useContextState, usePlayer, type PlayContext } from './player-context'

/** For a page's big play button: starts the list, or pauses and resumes it if it's what's playing. */
export function usePlayList(tracks: Track[] | undefined, context: PlayContext) {
  const player = usePlayer()
  const { active, playing } = useContextState(context.kind, context.id)

  const toggle = () => {
    if (active && player.track) player.togglePlay()
    else if (tracks?.length) player.playTracks(tracks, 0, context)
  }

  return { playing, toggle }
}
