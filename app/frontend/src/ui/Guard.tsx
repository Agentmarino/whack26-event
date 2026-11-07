// A card that throws (unexpected data from the backend) disappears instead of blanking the whole page.
// The agent's line above it still stands on its own.
import { Component, type ReactNode } from 'react'

export class Guard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('[card] could not draw this card', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
