/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// external imports
import { fileTypeFromBuffer } from "file-type";
// plane imports
import type { TFileMetaDataLite, TFileSignedURLResponse } from "@plane/types";
import { DANGEROUS_EXTENSIONS } from "@plane/constants";

/**
 * @description Extension to MIME type mapping for backend allowed types
 * Used as fallback when file signature detection returns unexpected results
 */
const EXTENSION_TO_MIME_MAP: Record<string, string> = {
  // Images
  "jpg": "image/jpeg",
  "jpeg": "image/jpeg",
  "png": "image/png",
  "gif": "image/gif",
  "svg": "image/svg+xml",
  "webp": "image/webp",
  "tiff": "image/tiff",
  "tif": "image/tiff",
  "bmp": "image/bmp",
  "pgm": "image/x-portable-graymap",
  "pbm": "image/x-portable-bitmap",
  "ppm": "image/x-portable-pixmap",
  // Documents
  "pdf": "application/pdf",
  "doc": "application/msword",
  "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "xls": "application/vnd.ms-excel",
  "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "ppt": "application/vnd.ms-powerpoint",
  "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "txt": "text/plain",
  "md": "text/markdown",
  "markdown": "text/markdown",
  "rtf": "application/rtf",
  "ods": "application/vnd.oasis.opendocument.spreadsheet",
  "odt": "application/vnd.oasis.opendocument.text",
  "odp": "application/vnd.oasis.opendocument.presentation",
  "odg": "application/vnd.oasis.opendocument.graphics",
  "odb": "application/vnd.oasis.opendocument.database",
  "vsd": "application/vnd.visio",
  "vsdx": "application/vnd.visio",
  // Audio
  "mp3": "audio/mpeg",
  "wav": "audio/wav",
  "ogg": "audio/ogg",
  "midi": "audio/midi",
  "mid": "audio/x-midi",
  "aac": "audio/aac",
  "flac": "audio/flac",
  "m4a": "audio/x-m4a",
  // Video
  "mp4": "video/mp4",
  "mpeg": "video/mpeg",
  "mpg": "video/mpeg",
  "webm": "video/webm",
  "mov": "video/quicktime",
  "avi": "video/x-msvideo",
  "wmv": "video/x-ms-wmv",
  // Archives
  "zip": "application/zip",
  "rar": "application/x-rar-compressed",
  "tar": "application/x-tar",
  "gz": "application/gzip",
  "gzip": "application/gzip",
  "7z": "application/x-7z-compressed",
  "tgz": "application/x-compressed-tar",
  "tbz2": "application/x-compressed-tar-bz2",
  // 3D Models
  "glb": "model/gltf-binary",
  "gltf": "model/gltf+json",
  "obj": "application/octet-stream",
  // Fonts
  "ttf": "font/ttf",
  "otf": "font/otf",
  "woff": "font/woff",
  "woff2": "font/woff2",
  // Other
  "css": "text/css",
  "js": "text/javascript",
  "mjs": "text/javascript",
  "json": "application/json",
  "xml": "application/xml",
  "csv": "text/csv",
  "sql": "application/x-sql",
};

/**
 * @description Filename validation - checks for double extensions and dangerous patterns
 * @param {string} filename
 * @returns {string | null} Error message if invalid, null if valid
 */
const validateFilename = (filename: string): string | null => {
  if (!filename || filename.trim().length === 0) {
    return "Filename cannot be empty";
  }

  // Check for dot files (e.g., .htaccess, .env)
  if (filename.startsWith(".")) {
    return "Hidden files (starting with dot) are not allowed";
  }

  // Check for path separators
  if (filename.includes("/") || filename.includes("\\")) {
    return "Filename cannot contain path separators";
  }

  const parts = filename.split(".");

  // Check for double extensions with dangerous patterns
  if (parts.length >= 3) {
    const secondLastExt = parts[parts.length - 2]?.toLowerCase() || "";
    if (DANGEROUS_EXTENSIONS.includes(secondLastExt)) {
      return "File has suspicious double extension";
    }
  }

  // Check if the actual extension is dangerous
  const extension = parts[parts.length - 1]?.toLowerCase() || "";
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return `File extension '${extension}' is not allowed`;
  }

  return null;
};

/**
 * @description from the provided signed URL response, generate a payload to be used to upload the file
 * @param {TFileSignedURLResponse} signedURLResponse
 * @param {File} file
 * @returns {FormData} file upload request payload
 */
export const generateFileUploadPayload = (signedURLResponse: TFileSignedURLResponse, file: File): FormData => {
  const formData = new FormData();
  Object.entries(signedURLResponse.upload_data.fields).forEach(([key, value]) => formData.append(key, value));
  formData.append("file", file);
  return formData;
};

/**
 * @description Detect MIME type from file signature using file-type library
 * @param {File} file
 * @returns {Promise<string>} detected MIME type or empty string if unknown
 */
const detectMimeTypeFromSignature = async (file: File): Promise<string> => {
  try {
    // Read first 4KB which is usually sufficient for most file type detection
    const chunk = file.slice(0, 4096);
    const buffer = await chunk.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    const fileType = await fileTypeFromBuffer(uint8Array);
    return fileType?.mime || "";
  } catch (_error) {
    return "";
  }
};

/**
 * @description Get file extension from filename
 * @param {string} filename
 * @returns {string} file extension (lowercase, without dot)
 */
const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts[parts.length - 1]?.toLowerCase() || "") : "";
};

/**
 * @description Map detected MIME type to backend-allowed MIME type
 * Some files (like old Office formats) are detected as x-cfb but should use specific MIME types
 * @param {string} detectedMime - MIME type detected from file signature
 * @param {string} filename - Original filename for extension fallback
 * @returns {string} mapped MIME type
 */
const mapMimeTypeToAllowed = (detectedMime: string, filename: string): string => {
  const extension = getFileExtension(filename);

  // For x-cfb (Compound File Binary), map based on extension
  // Old Office files (.doc, .xls, .ppt) are often detected as x-cfb
  if (detectedMime === "application/x-cfb") {
    const cfbMapping: Record<string, string> = {
      "doc": "application/msword",
      "xls": "application/vnd.ms-excel",
      "ppt": "application/vnd.ms-powerpoint",
      "mdb": "application/x-msaccess",
    };
    return cfbMapping[extension] || EXTENSION_TO_MIME_MAP[extension] || detectedMime;
  }

  // For octet-stream, try extension mapping
  if (detectedMime === "application/octet-stream") {
    return EXTENSION_TO_MIME_MAP[extension] || detectedMime;
  }

  // If detected MIME is not in allowed list, try extension fallback
  // This handles cases where file-type library returns unexpected MIME types
  if (!Object.values(EXTENSION_TO_MIME_MAP).includes(detectedMime)) {
    return EXTENSION_TO_MIME_MAP[extension] || detectedMime;
  }

  return detectedMime;
};

/**
 * @description Validate and detect the MIME type of a file using signature detection
 * Also performs basic security checks on filename
 * @param {File} file
 * @returns {Promise<string>} validated and detected MIME type
 */
const validateAndDetectFileType = async (file: File): Promise<string> => {
  // Basic filename validation
  const filenameError = validateFilename(file.name);
  if (filenameError) {
    console.warn(`File validation warning: ${filenameError}`);
  }

  try {
    const signatureType = await detectMimeTypeFromSignature(file);
    if (signatureType) {
      // Map detected MIME type to backend-allowed type
      return mapMimeTypeToAllowed(signatureType, file.name);
    }
  } catch (_error) {
    console.warn("Error detecting file type from signature:", _error);
  }

  // Fallback: use extension mapping
  const extension = getFileExtension(file.name);
  if (extension && EXTENSION_TO_MIME_MAP[extension]) {
    return EXTENSION_TO_MIME_MAP[extension];
  }

  // Final fallback for unknown files
  return "";
};

/**
 * @description returns the necessary file meta data to upload a file
 * @param {File} file
 * @returns {Promise<TFileMetaDataLite>} payload with file info
 */
export const getFileMetaDataForUpload = async (file: File): Promise<TFileMetaDataLite> => {
  const fileType = await validateAndDetectFileType(file);
  return {
    name: file.name,
    size: file.size,
    type: fileType,
  };
};

/**
 * @description this function returns the assetId from the asset source
 * @param {string} src
 * @returns {string} assetId
 */
export const getAssetIdFromUrl = (src: string): string => {
  const sourcePaths = src.split("/");
  const assetUrl = sourcePaths[sourcePaths.length - 1];
  return assetUrl ?? "";
};
