import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LanguageToolsStudentPicker from "../LanguageToolsStudentPicker";

const STUDENTS = [
  { alias: "Amira", eal_flag: true, family_language: "Arabic" },
  { alias: "Elena", eal_flag: true, family_language: "Spanish" },
  { alias: "Diego", eal_flag: false, family_language: "English" },
];

describe("LanguageToolsStudentPicker", () => {
  it("lists only EAL-flagged students", () => {
    render(
      <LanguageToolsStudentPicker students={STUDENTS} value={null} onChange={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /for student/i }));
    expect(screen.getByRole("option", { name: /amira/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /elena/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /diego/i })).not.toBeInTheDocument();
  });

  it("emits the selected student when changed", () => {
    const onChange = vi.fn();
    render(
      <LanguageToolsStudentPicker students={STUDENTS} value={null} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /for student/i }));
    fireEvent.click(screen.getByRole("option", { name: /amira/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ alias: "Amira", family_language: "Arabic" }),
    );
  });
});
