"use client";

import { useEffect, useState } from "react";
import { ImageSquare, UploadSimple } from "@phosphor-icons/react";
import styles from "./catalog.module.css";

export default function CatalogPhotoField({
  photo,
  name,
  hasImage,
  file,
  fileKey,
  disabled,
  canUpload,
  onChange,
}: {
  photo: string | null;
  name: string;
  hasImage: boolean;
  file: File | null;
  fileKey: number;
  disabled: boolean;
  canUpload: boolean;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview(null);

      return;
    }

    const url = URL.createObjectURL(file);

    setPreview(url);

    return () => {
      return URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className={styles.photoField}>
      <div className={styles.photoCanvas}>
        {preview || photo ? (
          <img
            src={preview ?? photo!}
            crossOrigin={!preview && hasImage ? "use-credentials" : undefined}
            alt={`${name} ${preview ? "selected" : "current"} product photo`}
          />
        ) : (
          <ImageSquare size={48} weight="light" aria-hidden="true" />
        )}
        <span className={styles.photoCaption}>
          {file ? "Selected photo · not uploaded" : "Current photo"}
        </span>
      </div>
      {canUpload ? (
        <>
          <label className={styles.photoChooser}>
            <input
              key={fileKey}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose product photo"
              aria-describedby="catalog-photo-help"
              disabled={disabled}
              onChange={(event) => {
                const selected = event.target.files?.[0];

                if (!selected) {
                  return;
                }

                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(
                    selected.type,
                  ) ||
                  selected.size > 5 * 1024 * 1024
                ) {
                  setError("Choose a JPG, PNG or WebP image up to 5 MB.");

                  event.target.value = "";

                  return;
                }

                setError("");

                onChange(selected);
              }}
            />
            <UploadSimple size={20} aria-hidden="true" />
            <span>
              <strong>{file ? "Choose another photo" : "Choose photo"}</strong>
              <small id="catalog-photo-help">
                JPG, PNG or WebP · Up to 5 MB
              </small>
            </span>
          </label>
          {file && (
            <p className={styles.selectedFile} role="status">
              {file.name}
              <span>
                {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to upload
              </span>
            </p>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </>
      ) : (
        <p>Save the listing first to upload a photo.</p>
      )}
    </div>
  );
}
