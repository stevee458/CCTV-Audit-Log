export function driveStatusClass(status: string): string {
  if (status === "In DVR") {
    return "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100";
  }
  if (status === "In Maintenance possession") {
    return "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100";
  }
  if (status === "With Inspector") {
    return "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100";
  }
  return "";
}
