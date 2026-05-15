// Apply the saved theme before first paint.
try {
  var prairieTheme = localStorage.getItem("prairie-theme");
  if (prairieTheme === "light" || prairieTheme === "dark") {
    document.documentElement.setAttribute("data-theme", prairieTheme);
  }
} catch {
  // Storage can be unavailable in private contexts; default theme is fine.
}
