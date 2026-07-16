import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface IDropdownDevice {
  imageUrl?: string
  icon?: React.ReactNode
  title: string
  body: string
}

export const DropdownDevice = ({list}:{list:IDropdownDevice[]}) => {
  return (
    <section className="w-full bg-brand-peach/30 rounded-2xl overflow-hidden border border-neutral-200">
      <h2 className="h2-md-format px-8 py-6">Technology</h2>
      <Accordion
        type="single"
        collapsible={false}
        defaultValue="0"
        className=""
      >
        {list.map((item, idx) => (
          <AccordionItem key={idx} value={idx.toString()}>
            <AccordionTrigger className="hover:no-underline bg-white  px-8 rounded-none items-center">
              <div className="flex items-center gap-4">
                <div className="text-brand-peach">
                  {item.icon}
                </div>
                <h3 className="h3-sm-format">{item.title}</h3>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-sm-format px-8 pb-8 bg-white">{item.body}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
