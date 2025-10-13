export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t bg-white/50 backdrop-blur">
      <div className="container py-4 flex flex-col items-center gap-1 text-center text-xs text-gray-500">
        <span>© {year} KeyBase • Built by Team KeyBase</span>
      </div>
    </footer>
  )
}
