import { promises as fs } from 'fs'
import path from 'path'
import Link from 'next/link'

const BlogPage = async () => {
  const blogDir = path.join(process.cwd(), 'blog')
  const files = await fs.readdir(blogDir)
  const posts = files.filter(file => file.endsWith('.md'))

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Keel Blog</h1>
      <ul className="space-y-4">
        {posts.map(post => {
          const slug = post.replace('.md', '')
          return (
            <li key={slug}>
              <Link href={`/blog/${slug}`} className="text-blue-600 hover:underline">
                {slug.replace(/-/g, ' ')}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default BlogPage