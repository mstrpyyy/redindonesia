

export const BodyWrapper = ({children, className, id}:{children:React.ReactNode, className?:string, id?:string}) => {
  return (
    <div id={id} className={`flex items-center max-sm:px-10 ${className ?? ''}`}>
      <div className={`sm:mx-auto body-container-limit w-full`}>
        {children}
      </div>
    </div>
  )
}
