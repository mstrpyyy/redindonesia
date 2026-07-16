import React from 'react'
import { BodyWrapper } from '../BodyWrapper'

interface ICenteredTextDevice {
  h2?: string
  h2Class?: string
  h3?: string
  p?: string
}

export const CenteredTextDevice = ({h2, h3, p, h2Class}:ICenteredTextDevice) => {
  return (
    <BodyWrapper className='my-14'>
      <section>
        {h2 &&
          <h2 className={`h2-format text-center mb-4 ${h2Class ?? ''}`}>{h2}</h2>
        }
        {h3 &&
          <h3 className='h3-format text-balance! mt-4 mb-8 text-center'>{h3}</h3>
        }
        {p &&
          <p className='p-format text-center! mt-4 whitespace-pre-line'>{p}</p>
        }
      </section>
    </BodyWrapper>
  )
}
