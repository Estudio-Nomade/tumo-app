"use client"

import { useState } from "react"
import type { FaqItem } from "../config"

export function LandingAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="flex w-full flex-col gap-2.5">
      {items.map((item, index) => {
        const open = openIndex === index
        return (
          <div
            key={item.question}
            className={[
              "rounded-2xl border p-[18px]",
              open
                ? "border-[#7754E3] bg-[#7754E314]"
                : "border-[#262626] bg-[#0A0A0A]",
            ].join(" ")}
          >
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 text-left"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? -1 : index)}
            >
              <span className="text-lg font-semibold leading-snug text-[#FFFFFF]">
                {item.question}
              </span>
              <span
                className={[
                  "shrink-0 text-[22px] font-medium leading-none",
                  open ? "text-[#7754E3]" : "text-[#A3A3A3]",
                ].join(" ")}
                aria-hidden
              >
                {open ? "−" : "+"}
              </span>
            </button>
            {open ? (
              <p className="mt-2.5 text-lg leading-relaxed text-[#A3A3A3]">
                {item.answer}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
