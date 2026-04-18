import { ApiError } from "./api";

export function getClassroomLoadErrorMessage(err: unknown) {
  return err instanceof ApiError && err.status === 429
    ? "Too many quick classroom refreshes. Wait a minute, then reload the page."
    : "Failed to load classrooms. Is the API server running?";
}
