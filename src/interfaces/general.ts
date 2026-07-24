export interface INavbarMenu {
  name: string,
  slug: string | null,
  type?: 'largeDropdown' | 'smallDropdown' | 'link'
  menu?: INavbarMenu[]
}

export interface ISocialAccount {
  id: string
  platform: string
  label: string
  profileImg: string
  url: string
  order: number
}

export interface IGallery {
  id: string
  title: string
  description: string | null
  images: string[]
  order: number
}

export interface IArticle {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  coverImage: string | null
  status: 'draft' | 'published'
  publishedAt: Date | null
  updatedAt: Date
}