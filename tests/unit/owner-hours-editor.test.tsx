import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { HoursEditor, toIntervals, toRows, type HoursRow } from "@/app/owner/_components/cafe-fields";
import type { OpeningInterval } from "@/lib/owner/cafe-input";

afterEach(cleanup);
let latest: OpeningInterval[] = [];
function Harness({ initial }: { initial: OpeningInterval[] }) {
  const [rows, setRows] = useState<HoursRow[]>(() => toRows(initial));
  return <HoursEditor rows={rows} onChange={next => { latest = toIntervals(next); setRows(next); }} error={null} />;
}
const at = (weekday: number, opensAt: string, closesAt: string, closesNextDay = false) => ({ weekday, opensAt, closesAt, closesNextDay });

test("quick fill replaces the selected days with one interval each, in week order", () => {
  render(<Harness initial={[at(6, "10:00", "14:00"), at(1, "07:00", "08:00"), at(1, "12:00", "13:00")]} />);
  fireEvent.click(screen.getByRole("button", { name: "Weekdays" }));
  fireEvent.change(screen.getByLabelText("Quick fill Closes at"), { target: { value: "17:30" } });
  fireEvent.click(screen.getByRole("button", { name: "Set hours for 5 days" }));
  expect(latest).toEqual([1, 2, 3, 4, 5].map(d => at(d, "09:00", "17:30")).concat(at(6, "10:00", "14:00")));
});

test("quick fill marks hours past midnight as closing next day", () => {
  render(<Harness initial={[]} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Quick fill Friday" }));
  fireEvent.change(screen.getByLabelText("Quick fill Opens at"), { target: { value: "20:00" } });
  fireEvent.change(screen.getByLabelText("Quick fill Closes at"), { target: { value: "02:00" } });
  expect(screen.getByText(/run past midnight/)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Set hours for 1 day" }));
  expect(latest).toEqual([at(5, "20:00", "02:00", true)]);
});

test("quick fill stays disabled until days are chosen or when it would exceed fourteen intervals", () => {
  render(<Harness initial={[1, 2, 3, 4, 5, 6, 7].flatMap(d => [at(d, "06:00", "07:00"), at(d, "08:00", "09:00")])} />);
  expect((screen.getByRole("button", { name: "Choose days to fill" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Every day" }));
  expect((screen.getByRole("button", { name: "Set hours for 7 days" }) as HTMLButtonElement).disabled).toBe(false);
});

test("editing interval times keeps the next-day box consistent", () => {
  render(<Harness initial={[at(3, "09:00", "18:00")]} />);
  fireEvent.change(screen.getByLabelText("Interval 1 Closes at"), { target: { value: "01:00" } });
  expect(latest).toEqual([at(3, "09:00", "01:00", true)]);
  fireEvent.change(screen.getByLabelText("Interval 1 Closes at"), { target: { value: "23:00" } });
  expect(latest).toEqual([at(3, "09:00", "23:00")]);
});

test("adding an interval continues from the last interval's day and hours", () => {
  render(<Harness initial={[at(7, "08:00", "16:00")]} />);
  fireEvent.click(screen.getByRole("button", { name: "Add opening interval" }));
  expect(latest).toEqual([at(7, "08:00", "16:00"), at(1, "08:00", "16:00")]);
  expect(screen.getByRole("button", { name: "Remove interval 2" })).toBeDefined();
});

test("week at a glance lists each day's hours and closed days", () => {
  render(<Harness initial={[at(2, "09:00", "18:00"), at(5, "22:00", "02:00", true)]} />);
  const week = within(screen.getByRole("list", { name: "Week at a glance" })).getAllByRole("listitem").map(li => li.textContent);
  expect(week).toEqual(["MonClosed", "Tue9:00 AM – 6:00 PM", "WedClosed", "ThuClosed", "Fri10:00 PM – 2:00 AM (next day)", "SatClosed", "SunClosed"]);
});
