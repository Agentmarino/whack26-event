// Own-words goal answers: pnpm --filter backend exec tsx scripts/try-goal.ts "I want ..." ...
import { answer } from '../src/questions.ts'
import { newSession } from '../src/session.ts'
for (const text of process.argv.slice(2)) {
  const s = newSession()
  await answer(s, 'goal', text)
  console.log(JSON.stringify(text), '->', s.profile.goal, s.goalWords ? `(words: ${s.goalWords})` : '')
}
