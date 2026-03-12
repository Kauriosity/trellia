// A basic wrapper to handle Next.js params in Next 13+
import BoardClient from "./BoardClient";
import api from "@/lib/api";

export const metadata = {
  title: "Board | Trellia",
};

export default async function BoardPage({ params }) {
  // Wait for the params promise in Next.js 13+ app router
  const { id } = await params;

  return <BoardClient boardId={id} />;
}
