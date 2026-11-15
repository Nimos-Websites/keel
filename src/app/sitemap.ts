import type { MetadataRoute } from "next";
import { promises as fs } from "fs";
import path from "path";

const BASE_URL = "https://keel-kappa-six.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    const blogDir = path.join(process.cwd(), "blog");
    const files = await fs.readdir(blogDir);
    for (const file of files.filter((f) => f.endsWith(".md"))) {
      entries.push({
        url: `${BASE_URL}/blog/${file.replace(/\.md$/, "")}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch {
    // blog dir unavailable at build time; skip post URLs
  }

  entries.push({
    url: `${BASE_URL}/thanks`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.3,
  });

  return entries;
}
