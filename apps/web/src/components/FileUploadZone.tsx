import { useCallback, useRef, useState } from "react";
import { NothingInstrumentButton } from "./shared";
import "./FileUploadZone.css";

interface Props {
  onTextExtracted: (text: string, filename: string) => void;
  accept?: string;
}

export default function FileUploadZone({ onTextExtracted, accept = ".txt,.pdf" }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setProcessing(true);

    try {
      if (file.name.endsWith(".txt")) {
        const text = await file.text();
        onTextExtracted(text, file.name);
      } else if (file.name.endsWith(".pdf")) {
        // For PDF, read as text (basic extraction — works for text-based PDFs)
        // A production system would use pdf-parse on the backend
        const text = await file.text();
        // If the text looks like binary/garbled, show a helpful message
        if (text.includes("%PDF") && text.length < 200) {
          setError("This PDF appears to be image-based. Please paste the text content instead.");
          setProcessing(false);
          return;
        }
        onTextExtracted(text, file.name);
      } else {
        setError(`Unsupported file type: ${file.name}. Use .txt or .pdf files.`);
        setProcessing(false);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    }

    setProcessing(false);
  }, [onTextExtracted]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // Reset so same file can be re-selected
  }

  function handleBrowseClick() {
    if (processing) return;
    inputRef.current?.click();
  }

  return (
    <div
      className={`file-upload-zone${dragOver ? " file-upload-zone--dragover" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="file-upload-input"
        id="file-upload"
        aria-label="Choose a lesson artifact file"
      />
      <div className="file-upload-zone__content">
        <NothingInstrumentButton
          aria-label={processing ? "Reading lesson artifact file" : "Browse for lesson artifact file"}
          fireAnim="upload"
          tone="accent"
          size="lg"
          showTicks
          loading={processing}
          onClick={handleBrowseClick}
          className="file-upload-zone__primary-action"
          data-testid="file-upload-zone-action"
        >
          <svg className="file-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
          </svg>
        </NothingInstrumentButton>

        <div className="file-upload-zone__copy">
          <p className="file-upload-zone__text">
            {processing ? (
              <span>Reading file...</span>
            ) : (
              <>
                <span>Drop a file here or </span>
                <button
                  type="button"
                  className="file-upload-zone__browse"
                  onClick={handleBrowseClick}
                >
                  browse
                </button>
              </>
            )}
          </p>
          <span className="file-upload-hint">.txt or .pdf</span>
        </div>
      </div>
      {error && <p className="file-upload-error">{error}</p>}
    </div>
  );
}
