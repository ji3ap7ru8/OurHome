import { initViewport } from "./core/viewport.js";
import { bootstrap } from "./core/app.js";

initViewport();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
