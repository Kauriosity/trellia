import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata = {
  title: "Trellia - Project Management Tool",
  description: "A Kanban-style project management web application.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-1 flex flex-col min-h-0 bg-transparent">
          {children}
        </main>
      </body>
    </html>
  );
}
