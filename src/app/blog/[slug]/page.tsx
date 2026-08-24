import { promises as fs } from 'fs'
import path from 'path'
import { marked } from 'marked'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function BlogPost({ params }: PageProps) {
  const { slug } = await params
  const filePath = path.join(process.cwd(), 'blog', `${slug}.md`)
  let markdown = ''
  try {
    markdown = await fs.readFile(filePath, 'utf-8')
  } catch {
    markdown = '# Not Found\n\nBlog post not found.'
  }
  const html = await marked(markdown)

  return (
    <div className="max-w-2xl mx-auto p-6 py-12">
      <div className="prose prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
