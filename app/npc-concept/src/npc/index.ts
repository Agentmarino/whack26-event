// Public surface of the NPC kit. Copy this whole folder; it imports nothing from outside it
// except React. Import './npc.css' once, and load the Press Start 2P font in the app.
import './npc.css'

export { NpcScene, type NpcHandle, type NpcSceneProps } from './NpcScene'
export { DialogueBox, type DialogueBoxProps, type DialogueLine } from './DialogueBox'
export { DebugPanel, type DebugPanelProps } from './DebugPanel'
export { useIntegerScale, usePrefersReducedMotion, useTypewriter, type Speed } from './hooks'
export { describeAgent } from './describe'
export {
  AGENT_STATES, EMOTES, GESTURES, NpcEngine, SEQUENCE_MS, STEP_MS,
  type AgentState, type Emote, type Gesture, type NpcSnapshot, type PaperState,
} from './engine'
export { BACKGROUND_NAMES, BACKGROUNDS, PALETTE_DEF, UI_COLORS, type Background, type ColorName } from './palette'
export { DEFAULT_FACIAL_HAIR, FACIAL_HAIR, type FacialHair } from './sprites/character'
export { NATIVE_W, NATIVE_H } from './raster'
