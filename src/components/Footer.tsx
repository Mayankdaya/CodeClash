import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-8 border-t border-white/10 mt-auto">
      <div className="container max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground flex justify-between items-center">
        <p>&copy; 2024 CodeClash. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="#" className="hover:text-foreground">Privacy</Link>
          <Link href="#" className="hover:text-foreground">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
