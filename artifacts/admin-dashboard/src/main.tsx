import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";

const clerkPubKey = import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <ClerkProvider publishableKey={clerkPubKey ?? ""}>
      <App />
    </ClerkProvider>
  </ThemeProvider>,
);
