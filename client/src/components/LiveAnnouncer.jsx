import { useState, useEffect } from "react";

// Global announcer — call announce() from anywhere
let announceCallback = null;

export const announce = (message, priority = "polite") => {
  announceCallback?.(message, priority);
};

const LiveAnnouncer = () => {
  const [polite,    setPolite]    = useState("");
  const [assertive, setAssertive] = useState("");

  useEffect(() => {
    announceCallback = (message, priority) => {
      if (priority === "assertive") {
        setAssertive("");
        setTimeout(() => setAssertive(message), 50);
      } else {
        setPolite("");
        setTimeout(() => setPolite(message), 50);
      }
    };
    return () => { announceCallback = null; };
  }, []);

  return (
    <>
      {/* Polite — waits for user to finish current action */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {polite}
      </div>

      {/* Assertive — interrupts immediately */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertive}
      </div>
    </>
  );
};

export default LiveAnnouncer;