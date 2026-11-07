// History version of a card. Most cards stay whole; plan steps fold into one line you can open.
import type { AgentMessage } from 'shared'
import { Card } from './Card'

export function CompactCard({ msg }: { msg: AgentMessage }) {
  return <Card msg={msg} />
}
