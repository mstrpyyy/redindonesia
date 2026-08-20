import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { getSegmentBackgroundColor } from "@/lib/segment-colors"
import { cn } from "@/lib/utils"

interface IDropdownDeviceItem {
  imageUrl?: string
  icon?: React.ReactNode
  title: string
  body: string
}

interface IDropdownDevice {
  list: IDropdownDeviceItem[]
  header?: string
  /** One of SEGMENT_BACKGROUND_COLOR_VALUES (src/lib/segment-colors.ts). */
  backgroundColor?: string
}

export const DropdownDevice = ({ list, header, backgroundColor }: IDropdownDevice) => {
  // Defaults to peach, not DEFAULT_SEGMENT_BACKGROUND_COLOR (black) — this
  // section always rendered peach before the picker existed, see ADR-054.
  const { bgClassName, textClassName } = getSegmentBackgroundColor(backgroundColor ?? "peach")

  return (
    <section className={cn("w-full rounded-2xl overflow-hidden border border-neutral-200", bgClassName)}>
      <h2
        className={cn("h2-md-format px-8 py-6", textClassName)}
        data-aos="fade-up"
        data-aos-duration="500"
      >
        {header ?? "Technology"}
      </h2>
      <Accordion
        type="single"
        collapsible={false}
        defaultValue="0"
        className=""
        data-aos="fade-up"
        data-aos-duration="500"
        data-aos-delay="150"
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
            {/* `whitespace-pre-line` keeps the line breaks an admin typed
                (Enter) in the Description textarea — plain text otherwise
                collapses them and the paragraph renders as one flat line. */}
            <AccordionContent className="p-sm-format px-8 pb-8 bg-white whitespace-pre-line">{item.body}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
