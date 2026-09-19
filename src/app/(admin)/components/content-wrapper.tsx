



export const ContentWrapper = ({children}:{children:React.ReactNode}) => {
  return (
    <main className="p-10 flex-1 min-w-0 h-full overflow-y-auto">
      {children}
    </main>
  )
}
