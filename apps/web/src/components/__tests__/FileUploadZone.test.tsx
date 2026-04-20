import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FileUploadZone from "../FileUploadZone";

describe("FileUploadZone", () => {
  it("renders the upload instrument button with upload fire animation", () => {
    render(<FileUploadZone onTextExtracted={vi.fn()} />);

    const button = screen.getByRole("button", {
      name: /browse for lesson artifact file/i,
    });

    expect(button).toHaveClass("nothing-btn");
    expect(button).toHaveAttribute("data-anim", "upload");
  });

  it("extracts text from a txt file", async () => {
    const onTextExtracted = vi.fn();
    const { container } = render(
      <FileUploadZone onTextExtracted={onTextExtracted} />,
    );

    const input = container.querySelector(".file-upload-input") as HTMLInputElement;
    const file = new File(["Lesson text"], "lesson.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onTextExtracted).toHaveBeenCalledWith("Lesson text", "lesson.txt");
    });
  });
});