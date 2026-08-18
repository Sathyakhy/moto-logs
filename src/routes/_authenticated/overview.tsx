import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/overview')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/overview"!</div>
}
