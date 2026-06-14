import { logoutAction } from '../actions/auth'
import { Button } from '@/components/ui/button'

export default function BoardPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">MANTYS Kanban</h1>
      <p className="text-muted-foreground">Board coming in issue #22</p>
      <form action={logoutAction}>
        <Button variant="outline" type="submit">
          Log out
        </Button>
      </form>
    </div>
  )
}
