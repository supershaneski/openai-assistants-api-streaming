import Sandbox from './sandbox'


export const metadata = {
  title: 'Demo - OpenAI Assistants API Streaming',
  description: 'A sample app to demonstrate OpenAI Assistants API Streaming',
  icons: {
      icon: '/next.svg',
      shortcut: '/vercel.svg',
  }
}

export const viewport = {
  viewport: 'maximum-scale=1.0, minimum-scale=1.0, initial-scale=1.0, width=device-width, user-scalable=0',
}

export default function Page() {
  return <Sandbox />
}