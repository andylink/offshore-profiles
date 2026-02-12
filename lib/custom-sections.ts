export type CustomSection = {
  id: string
  title: string
  content: string
}

const MAX_SECTION_COUNT = 12
const MAX_TITLE_LENGTH = 120
const MAX_CONTENT_LENGTH = 12000

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const normalizeMarkdown = (value: string) =>
  value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim()

export const normalizeCustomSections = (value: unknown): CustomSection[] => {
  if (!Array.isArray(value)) return []

  return value
    .slice(0, MAX_SECTION_COUNT)
    .map((entry) => {
      const input = isRecord(entry) ? entry : {}
      const id = typeof input.id === "string" && input.id.trim() ? input.id : crypto.randomUUID()
      const title = typeof input.title === "string" ? input.title.trim().slice(0, MAX_TITLE_LENGTH) : ""
      const content = typeof input.content === "string" ? normalizeMarkdown(input.content).slice(0, MAX_CONTENT_LENGTH) : ""

      return { id, title, content }
    })
    .filter((item) => item.title.length > 0 && item.content.length > 0)
}
