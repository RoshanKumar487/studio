
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Default to a consistent value (e.g., false for desktop-first SSR)
  // for SSR and the initial client render pass.
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true); // Signal that the component has mounted on the client

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const updateMobileState = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Set the initial state on the client based on the window size
    updateMobileState();

    mql.addEventListener("change", updateMobileState);

    return () => {
      mql.removeEventListener("change", updateMobileState);
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // Return the default value (false) if not yet mounted on the client,
  // otherwise return the actual client-side calculated value.
  // This ensures server and client initial renders match.
  return hasMounted ? isMobile : false;
}
