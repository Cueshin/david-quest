import { Noto_Sans_KR, Rubik, Russo_One } from 'next/font/google'

export const notoKr = Noto_Sans_KR({
  weight: ['400', '700'],
  preload: false,
  variable: '--font-kr',
})

export const russo = Russo_One({
  subsets: ['latin', 'cyrillic'],
  weight: '400',
  variable: '--font-russo',
})

export const rubik = Rubik({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-rubik',
})
