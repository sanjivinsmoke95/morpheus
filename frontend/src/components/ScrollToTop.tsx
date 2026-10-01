import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets window scroll position upon route change so the new page
 * starts cleanly at the top without visual jump or offset.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
