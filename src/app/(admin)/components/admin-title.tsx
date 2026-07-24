interface IBreadcrumbs {
  parent: string
  title: string
}

export const AdminTitle = ({parent, title}:IBreadcrumbs) => {
  return (
    <div className="flex flex-col mb-8">
      <p className='text-2xl'>{parent}</p>
      <h1 className="text-5xl font-bold text-brand-red">{title}</h1>
    </div>
  )
}
