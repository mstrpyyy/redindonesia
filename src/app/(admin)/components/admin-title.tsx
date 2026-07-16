import { ChevronRight } from "lucide-react"
import { Fragment } from "react"

interface IBreadcrumbs {
  parent: string
  title: string
}

export const AdminTitle = ({parent, title}:IBreadcrumbs) => {
  return (
    <div className="flex flex-col">
      <p className='text-xl'>{parent}</p>
      <h1 className="text-4xl font-bold text-brand-red">{title}</h1>
    </div>
  )
}
