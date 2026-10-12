'use client'

import { DeviceLaptop } from '@/components/mock/DeviceLaptop'
import { VsCodeScreen, type Decision } from '@/components/mock/VsCodeScreen'
import { useBeats, useInView } from '@/lib/mock/sequence'
import { FRAMES, STARTS } from '@/lib/mock/script'

// Plays once when 40% is in view and holds the last frame. Server HTML, reduced motion and no JavaScript all show that last frame.
export function InstallMock({ decision }: { decision: Decision }) {
  const { ref, visible } = useInView<HTMLDivElement>(0.4)
  const step = useBeats(STARTS, visible)
  return (
    <div
      ref={ref}
      data-visible={visible}
      role="img"
      aria-label={`A laptop showing VS Code. The Proton extension installs, its sidebar goes from Starting through Downloading Models to Ready, and a terminal adds Proton to Claude Code. Claude Code then asks Proton about a hidden-instructions check, and Proton answers ${decision.label} in ${decision.ms} milliseconds.`}
    >
      <DeviceLaptop>
        <VsCodeScreen s={FRAMES[step]} decision={decision} />
      </DeviceLaptop>
    </div>
  )
}
