export interface PlanPresentationPoint {
  readonly x: number;
  readonly y: number;
}

export interface PlanLabelPresentationInput {
  readonly center: PlanPresentationPoint;
  readonly frontMid: PlanPresentationPoint;
  readonly label: string;
  readonly labelWidth: number;
  readonly fontSize: number;
}

export type PlanLabelPresentationCommand =
  | {
      readonly kind: "orientation";
      readonly start: PlanPresentationPoint;
      readonly end: PlanPresentationPoint;
    }
  | {
      readonly kind: "label-knockout";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: "label";
      readonly text: string;
      readonly x: number;
      readonly y: number;
      readonly size: number;
    };

const LABEL_PADDING = 2;

export const createPlanLabelPresentation = (
  input: PlanLabelPresentationInput
): readonly PlanLabelPresentationCommand[] => {
  const textX = input.center.x - input.labelWidth / 2;
  const textY = input.center.y - input.fontSize * 0.35;
  return [
    {
      kind: "orientation",
      start: input.center,
      end: input.frontMid
    },
    {
      kind: "label-knockout",
      x: textX - LABEL_PADDING,
      y: textY - LABEL_PADDING,
      width: input.labelWidth + LABEL_PADDING * 2,
      height: input.fontSize + LABEL_PADDING * 2
    },
    {
      kind: "label",
      text: input.label,
      x: textX,
      y: textY,
      size: input.fontSize
    }
  ];
};
