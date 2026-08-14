import type { LayoutPlanScheduleRow } from "./layoutPlan";

const A3_LANDSCAPE_HEIGHT = 841.89;
const PAGE_MARGIN = 42;
const SCHEDULE_HEADER_OFFSET = 82;
const SCHEDULE_MINIMUM_ROW_Y = PAGE_MARGIN + 28;
const SCHEDULE_ROW_HEIGHT = 19;

export const EQUIPMENT_SCHEDULE_ROWS_PER_PAGE = Math.floor(
  (A3_LANDSCAPE_HEIGHT - PAGE_MARGIN - SCHEDULE_HEADER_OFFSET - SCHEDULE_MINIMUM_ROW_Y)
  / SCHEDULE_ROW_HEIGHT
) + 1;

export type EquipmentSchedulePage = Readonly<{
  pageIndex: number;
  pageCount: number;
  rowStartIndex: number;
  rows: readonly LayoutPlanScheduleRow[];
}>;

export const paginateEquipmentSchedule = (
  rows: readonly LayoutPlanScheduleRow[]
): readonly EquipmentSchedulePage[] => {
  const pageCount = Math.max(1, Math.ceil(rows.length / EQUIPMENT_SCHEDULE_ROWS_PER_PAGE));
  return Array.from({ length: pageCount }, (_, pageIndex) => {
    const rowStartIndex = pageIndex * EQUIPMENT_SCHEDULE_ROWS_PER_PAGE;
    return Object.freeze({
      pageIndex,
      pageCount,
      rowStartIndex,
      rows: Object.freeze(rows.slice(rowStartIndex, rowStartIndex + EQUIPMENT_SCHEDULE_ROWS_PER_PAGE))
    });
  });
};
