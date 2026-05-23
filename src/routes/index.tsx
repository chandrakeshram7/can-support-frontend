import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"

export const Route = createFileRoute("/")({
  component: Index,
})

function Index() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    setToken(localStorage.getItem("token"))
  }, [])

  return (
    <div>
      {token ? "Dashboard" : "Login"}
    </div>
  )
}

export default Index