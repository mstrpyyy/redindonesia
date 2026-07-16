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