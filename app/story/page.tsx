import Header from '@/components/header'
import Footer from '@/components/footer'
import StorySection from './story-section'

export const metadata = {
  title: 'Our Story — ZYRØCORE',
  description: 'Built from Tamil Nadu. Built in Public. Discover the ZYRØCORE story and our mission to build a timeless brand.',
}

export default function StoryPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <StorySection />
      </main>
      <Footer />
    </div>
  )
}
