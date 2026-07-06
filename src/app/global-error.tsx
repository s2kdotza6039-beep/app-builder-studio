"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
          <h1>Application Error</h1>
          <p>{error.message || "A critical error occurred."}</p>
          <button onClick={() => reset()}>Try again</button>
        </main>
      </body>
    </html>
  );
}