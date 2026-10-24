"use client"

import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperTitle,
  StepperTrigger,
} from "@workspace/ui/components/reui/stepper"
import { cloneElement, isValidElement, useState } from "react"

export type StepState = {
  currentStep: number
  setCurrentStep: (step: number) => void
}

type StepDefinition = {
  title: string
  component: React.ReactNode
}

export function StepperUi({ steps }: { steps: StepDefinition[] }) {
  const [currentStep, setCurrentStep] = useState(1)

  return (
    <Stepper value={currentStep} onValueChange={setCurrentStep} className="w-full h-full">
      <div className="mb-10 w-full max-w-[600px] mx-auto">
        <StepperNav className="gap-5">
          {steps.map((step, index) => (
            <StepperItem
              key={index}
              step={index + 1}
              className="relative flex-1 items-start"
            >
              <StepperTrigger className="flex grow flex-col items-center justify-center gap-3.5">
                <StepperIndicator className="bg-border data-[state=active]:bg-primary data-[state=completed]:bg-primary h-1 w-full rounded-full">
                  <span className="sr-only">{index + 1}</span>
                </StepperIndicator>
                <StepperTitle className="group-data-[state=inactive]/step:text-muted-foreground text-center font-semibold">
                  {step.title}
                </StepperTitle>
              </StepperTrigger>
            </StepperItem>
          ))}
        </StepperNav>
      </div>

      <StepperPanel className="text-sm">
        {steps.map((step, index) => (
          <StepperContent
            key={index}
            value={index + 1}
            className="flex items-center justify-center"
          >
            {isValidElement(step.component)
              ? cloneElement(step.component as React.ReactElement<StepState>, {
                  currentStep,
                  setCurrentStep,
                })
              : step.component}
          </StepperContent>
        ))}
      </StepperPanel>
    </Stepper>
  )
}
