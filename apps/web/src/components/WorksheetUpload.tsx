import { useState, useRef, useCallback } from "react";
import { useAsyncAction } from "../useAsyncAction";
import { extractWorksheet } from "../api";
import type { ExtractWorksheetResponse } from "../types";
import "./WorksheetUpload.css";

interface Props {
  classroomId: string;
  onTextExtracted: (text: string) => void;
}

export default function WorksheetUpload({ classroomId, onTextExtracted }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { loading, error, execute } = useAsyncAction<ExtractWorksheetResponse>();

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const buffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const resp = await execute((signal) =>
      extractWorksheet(classroomId, base64, file.type, signal)
    );
    if (resp) {
      onTextExtracted(resp.extracted_text);
    }
  }, [classroomId, execute, onTextExtracted]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="worksheet-upload">
      <div
        className={`worksheet-upload__dropzone${dragOver ? " worksheet-upload__dropzone--dragover" : ""}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload worksheet photo"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
      >
        {loading ? (
          <span className="worksheet-upload__status">Extracting text from image...</span>
        ) : (
          <span>Drop a worksheet photo here, or click to upload</span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleFileChange}
          style={{ display: "none" }}
          aria-hidden="true"
        />
      </div>
      {preview && (
        <img
          src={preview}
          alt="Worksheet preview"
          className="worksheet-upload__preview"
        />
      )}
      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
